// ========================================
// FILE: src/lib/db/queries/driver_leaves.queries.powersync.ts
// ========================================
//
// 2026-11-15 — férias de motoristas no powersync.db. Espelha 1:1 as funções
// de driver_leaves.queries.ts (Drizzle/app.db), que rebentava desde que os
// motoristas passaram para o PowerSync: driver_leaves.driver_id tinha FK para
// a tabela drivers do app.db, já vazia, e a activação das férias escrevia o
// estado do motorista nessa tabela morta. Agora tudo vive na mesma base e
// sincroniza com o servidor.
//
// Mesmas assinaturas, mesmos estados e a mesma lógica do scheduler. Única
// diferença deliberada: "motorista em viagem" passa a olhar também para as
// viagens em curso (driverHasActiveTrip), não só para o campo availability,
// que pode estar desencontrado.

import { getPowerSyncDb } from '@/lib/powersync/client';
import { getSessionOrganizationId } from '@/helpers/ipc/services/auth/token-store';
import { generateUuid } from '@/lib/utils/cripto';
import { leaveStatus } from '@/lib/db/schemas/driver_leaves';
import { driverStatus, driverAvailability } from '@/lib/db/schemas/drivers';
import {
  IDriverLeave,
  ICreateDriverLeave,
  IUpdateDriverLeave,
  ICancelDriverLeave,
  IDriverLeavesPaginationParams,
} from '@/lib/types/driver-leave';
import { IPaginatedResult } from '@/lib/types/pagination';
import { driverHasActiveTrip, type StateTx } from './vehicle-state.powersync';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

const LEAVE_SELECT = `
  l.id, l.driver_id, d.name AS driver_name, l.start_date, l.end_date, l.reason, l.notes,
  l.status, l.cancelled_at, l.cancelled_reason, l.created_at, l.updated_at, l.deleted_at
`;
const LEAVE_FROM = `FROM driver_leaves l LEFT JOIN drivers d ON d.id = l.driver_id`;

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

export async function createDriverLeave(data: ICreateDriverLeave): Promise<IDriverLeave> {
  const db = await getPowerSyncDb();
  const id = generateUuid();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO driver_leaves (
      id, organization_id, driver_id, start_date, end_date, reason, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, getSessionOrganizationId(), data.driver_id, data.start_date, data.end_date,
      data.reason ?? null, data.notes ?? null, leaveStatus.SCHEDULED, now, now],
  );

  return (await getDriverLeaveById(id)) as IDriverLeave;
}

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

export async function getAllDriverLeaves(
  params: IDriverLeavesPaginationParams = {},
): Promise<IPaginatedResult<IDriverLeave>> {
  const db = await getPowerSyncDb();

  const page   = params.page  || 1;
  const limit  = params.limit || 20;
  const offset = (page - 1) * limit;

  const filters: string[] = ['l.deleted_at IS NULL'];
  const args: unknown[] = [];

  if (params.driver_id && params.driver_id !== 'all') { filters.push('l.driver_id = ?'); args.push(params.driver_id); }
  if (params.status && params.status !== 'all')       { filters.push('l.status = ?');    args.push(params.status); }
  if (params.from_date) { filters.push('l.end_date >= ?');   args.push(params.from_date); }
  if (params.to_date)   { filters.push('l.start_date <= ?'); args.push(params.to_date); }
  if (params.search?.trim()) { filters.push('LOWER(d.name) LIKE ?'); args.push(`%${params.search.toLowerCase()}%`); }

  const where = filters.join(' AND ');

  const totalRow = await db.get<{ total: number }>(`SELECT COUNT(*) AS total ${LEAVE_FROM} WHERE ${where}`, args);
  const total = totalRow.total;

  const data = await db.getAll<IDriverLeave>(
    `SELECT ${LEAVE_SELECT} ${LEAVE_FROM} WHERE ${where} ORDER BY l.start_date DESC LIMIT ? OFFSET ?`,
    [...args, limit, offset],
  );

  const countsRaw = await db.getAll<{ status: string; count: number }>(
    `SELECT status, COUNT(*) AS count FROM driver_leaves WHERE deleted_at IS NULL GROUP BY status`,
  );
  const statusCounts: Record<string, number> = { scheduled: 0, pending_trip: 0, active: 0, completed: 0, cancelled: 0 };
  for (const row of countsRaw) statusCounts[row.status] = row.count;

  return {
    data,
    pagination: {
      total, page, limit,
      totalPages:  Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
    statusCounts,
  };
}

export async function getLeavesByDriver(driverId: string): Promise<IDriverLeave[]> {
  const db = await getPowerSyncDb();
  return db.getAll<IDriverLeave>(
    `SELECT ${LEAVE_SELECT} ${LEAVE_FROM} WHERE l.driver_id = ? AND l.deleted_at IS NULL ORDER BY l.start_date DESC`,
    [driverId],
  );
}

export async function getDriverLeaveById(leaveId: string): Promise<IDriverLeave | null> {
  const db = await getPowerSyncDb();
  return db.getOptional<IDriverLeave>(`SELECT ${LEAVE_SELECT} ${LEAVE_FROM} WHERE l.id = ? LIMIT 1`, [leaveId]);
}

export async function hasOverlappingLeave(
  driverId:  string,
  startDate: string,
  endDate:   string,
  excludeId?: string,
): Promise<boolean> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<{ id: string }>(
    `SELECT id FROM driver_leaves
     WHERE driver_id = ? AND deleted_at IS NULL AND status <> ?
       AND start_date <= ? AND end_date >= ? AND id <> ?
     LIMIT 1`,
    [driverId, leaveStatus.CANCELLED, endDate, startDate, excludeId ?? ''],
  );
  return row != null;
}

// ─────────────────────────────────────────────
// UPDATE / CANCEL
// ─────────────────────────────────────────────

/** Edita datas/motivo de férias ainda agendadas (status = scheduled). */
export async function updateDriverLeave(leaveId: string, data: IUpdateDriverLeave): Promise<IDriverLeave | null> {
  const db = await getPowerSyncDb();
  const fields = (['start_date', 'end_date', 'reason', 'notes'] as const).filter(f => data[f] !== undefined);
  if (fields.length > 0) {
    await db.execute(
      `UPDATE driver_leaves SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = ?
       WHERE id = ? AND status = ?`,
      [...fields.map(f => data[f]), new Date().toISOString(), leaveId, leaveStatus.SCHEDULED],
    );
  }
  return getDriverLeaveById(leaveId);
}

/** Cancela férias (scheduled, pending_trip ou active). Se activa, devolve o motorista. */
export async function cancelDriverLeave(leaveId: string, data: ICancelDriverLeave = {}): Promise<IDriverLeave | null> {
  const db = await getPowerSyncDb();
  const leave = await getDriverLeaveById(leaveId);
  if (!leave) return null;

  if (leave.status === leaveStatus.COMPLETED || leave.status === leaveStatus.CANCELLED) {
    throw new Error('Leave cannot be cancelled in its current state');
  }

  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE driver_leaves SET status = ?, cancelled_at = ?, cancelled_reason = ?, updated_at = ? WHERE id = ?`,
      [leaveStatus.CANCELLED, now, data.cancelled_reason ?? null, now, leaveId],
    );
    if (leave.status === leaveStatus.ACTIVE) {
      await restoreDriverAfterLeave(tx, leave.driver_id, now);
    }
  });

  return getDriverLeaveById(leaveId);
}

// ─────────────────────────────────────────────
// SCHEDULER (leave-scheduler, a cada 5 minutos)
// ─────────────────────────────────────────────

interface DueLeaveRow {
  id: string; driver_id: string; driver_status: string | null; driver_availability: string | null;
}

/**
 *  - scheduled + start_date <= hoje
 *      → motorista em viagem      → pending_trip (aguarda a viagem terminar)
 *      → motorista terminated     → cancelada automaticamente
 *      → senão                    → active + on_leave
 *  - pending_trip + motorista já não está em viagem → active + on_leave
 */
export async function processScheduledLeaves(): Promise<{
  activated: string[]; pendingTrip: string[]; autoCancelled: string[];
}> {
  const db = await getPowerSyncDb();
  const today = todayStr();
  const activated: string[] = [];
  const pendingTrip: string[] = [];
  const autoCancelled: string[] = [];

  const due = await db.getAll<DueLeaveRow & { status: string }>(
    `SELECT l.id, l.driver_id, l.status, d.status AS driver_status, d.availability AS driver_availability
     FROM driver_leaves l LEFT JOIN drivers d ON d.id = l.driver_id
     WHERE l.deleted_at IS NULL
       AND ((l.status = ? AND l.start_date <= ?) OR l.status = ?)`,
    [leaveStatus.SCHEDULED, today, leaveStatus.PENDING_TRIP],
  );

  for (const leave of due) {
    if (!leave.driver_status) continue; // motorista fora deste posto

    if (leave.driver_status === driverStatus.TERMINATED) {
      const now = new Date().toISOString();
      await db.execute(
        `UPDATE driver_leaves SET status = ?, cancelled_at = ?, cancelled_reason = ?, updated_at = ? WHERE id = ?`,
        [leaveStatus.CANCELLED, now, 'Driver terminated', now, leave.id],
      );
      autoCancelled.push(leave.id);
      continue;
    }

    const outcome = await db.writeTransaction(async (tx) => {
      const onTrip = leave.driver_availability === driverAvailability.ON_TRIP
        || await driverHasActiveTrip(tx, leave.driver_id);
      const now = new Date().toISOString();
      if (onTrip) {
        if (leave.status === leaveStatus.SCHEDULED) {
          await tx.execute(`UPDATE driver_leaves SET status = ?, updated_at = ? WHERE id = ?`, [leaveStatus.PENDING_TRIP, now, leave.id]);
          return 'pending' as const;
        }
        return 'waiting' as const;
      }
      await tx.execute(`UPDATE driver_leaves SET status = ?, updated_at = ? WHERE id = ?`, [leaveStatus.ACTIVE, now, leave.id]);
      await tx.execute(
        `UPDATE drivers SET status = ?, availability = ?, updated_at = ? WHERE id = ?`,
        [driverStatus.ON_LEAVE, driverAvailability.OFFLINE, now, leave.driver_id],
      );
      return 'activated' as const;
    });

    if (outcome === 'activated') activated.push(leave.id);
    else if (outcome === 'pending') pendingTrip.push(leave.id);
  }

  return { activated, pendingTrip, autoCancelled };
}

/** Férias activas cujo end_date já passou (inclusivo) → completed + motorista devolvido. */
export async function processCompletedLeaves(): Promise<string[]> {
  const db = await getPowerSyncDb();
  const today = todayStr();
  const completed: string[] = [];

  const expired = await db.getAll<{ id: string; driver_id: string }>(
    `SELECT id, driver_id FROM driver_leaves WHERE status = ? AND end_date < ? AND deleted_at IS NULL`,
    [leaveStatus.ACTIVE, today],
  );

  for (const leave of expired) {
    const now = new Date().toISOString();
    await db.writeTransaction(async (tx) => {
      await tx.execute(`UPDATE driver_leaves SET status = ?, updated_at = ? WHERE id = ?`, [leaveStatus.COMPLETED, now, leave.id]);
      await restoreDriverAfterLeave(tx, leave.driver_id, now);
    });
    completed.push(leave.id);
  }

  return completed;
}

/**
 * Devolve o motorista ao serviço depois das férias. Não mexe num motorista
 * terminado nem num que já esteja em viagem (a viagem trata disso).
 */
async function restoreDriverAfterLeave(tx: StateTx, driverId: string, now: string): Promise<void> {
  const driver = await tx.getOptional<{ status: string; availability: string }>(
    `SELECT status, availability FROM drivers WHERE id = ? LIMIT 1`, [driverId],
  );
  if (!driver || driver.status === driverStatus.TERMINATED) return;
  if (driver.availability === driverAvailability.ON_TRIP || await driverHasActiveTrip(tx, driverId)) return;
  await tx.execute(
    `UPDATE drivers SET status = ?, availability = ?, updated_at = ? WHERE id = ?`,
    [driverStatus.ACTIVE, driverAvailability.AVAILABLE, now, driverId],
  );
}
