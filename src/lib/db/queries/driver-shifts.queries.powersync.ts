// ========================================
// FILE: src/lib/db/queries/driver-shifts.queries.powersync.ts
// ========================================
//
// 2026-11-15 — turnos de motoristas no powersync.db. Espelha 1:1 as funções
// de driver-shifts.queries.ts (Drizzle/app.db), que rebentava desde que os
// motoristas passaram para o PowerSync (FK de driver_shift_members para uma
// tabela drivers local já vazia). Mesmas assinaturas e regras: um só líder
// por turno, membros removidos com DELETE real (o servidor guarda-o como
// soft-delete e deixa de o enviar).
//
// Os membros guardam organization_id porque o upload só aceita linhas da
// organização da sessão (o servidor reescreve-o sempre a partir do token).

import { getPowerSyncDb } from '@/lib/powersync/client';
import { getSessionOrganizationId } from '@/helpers/ipc/services/auth/token-store';
import { generateUuid } from '@/lib/utils/cripto';
import { shiftStatus, ShiftStatus } from '@/lib/db/schemas/driver_shifts';
import {
  IDriverShift,
  IDriverShiftSummary,
  IShiftMember,
  ICreateDriverShift,
  IUpdateDriverShift,
  IAddShiftMember,
  IUpdateShiftMember,
  IDriverShiftsPaginationParams,
  IDriverShiftBadge,
} from '@/lib/types/driver-shift';
import { IPaginatedResult } from '@/lib/types/pagination';
import type { StateTx } from './vehicle-state.powersync';

type Db = Awaited<ReturnType<typeof getPowerSyncDb>>;
type Reader = Pick<Db, 'getAll' | 'getOptional'>;

const SHIFT_COLUMNS = `id, name, description, start_date, end_date, start_time, end_time, status, notes, created_at, updated_at, deleted_at`;

async function loadShiftMembers(db: Reader, shiftId: string): Promise<IShiftMember[]> {
  const rows = await db.getAll<Omit<IShiftMember, 'is_leader'> & { is_leader: number }>(
    `SELECT m.id, m.shift_id, m.driver_id, d.name AS driver_name, m.is_leader, m.notes, m.created_at, m.updated_at
     FROM driver_shift_members m LEFT JOIN drivers d ON d.id = m.driver_id
     WHERE m.shift_id = ? AND m.deleted_at IS NULL
     ORDER BY m.is_leader DESC, d.name`,
    [shiftId],
  );
  return rows.map(r => ({ ...r, is_leader: !!r.is_leader, driver_name: r.driver_name ?? '—' }));
}

async function getShiftWithMembers(db: Reader, shiftId: string): Promise<IDriverShift | null> {
  const row = await db.getOptional<Omit<IDriverShift, 'members' | 'member_count' | 'leader_name'>>(
    `SELECT ${SHIFT_COLUMNS} FROM driver_shifts WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [shiftId],
  );
  if (!row) return null;
  const members = await loadShiftMembers(db, shiftId);
  const leader = members.find(m => m.is_leader);
  return { ...row, members, member_count: members.length, leader_name: leader?.driver_name ?? null };
}

async function insertMember(
  tx: StateTx, shiftId: string, member: { driver_id: string; is_leader?: boolean; notes?: string }, now: string,
): Promise<void> {
  await tx.execute(
    `INSERT INTO driver_shift_members (id, organization_id, shift_id, driver_id, is_leader, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [generateUuid(), getSessionOrganizationId(), shiftId, member.driver_id, member.is_leader ? 1 : 0, member.notes ?? null, now, now],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

export async function createDriverShift(data: ICreateDriverShift): Promise<IDriverShift> {
  const db = await getPowerSyncDb();
  const id = generateUuid();
  const now = new Date().toISOString();

  if (data.members && data.members.filter(m => m.is_leader).length > 1) {
    throw new Error('shifts:errors.onlyOneLeader');
  }

  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO driver_shifts (id, organization_id, name, description, start_date, end_date, start_time, end_time, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, getSessionOrganizationId(), data.name, data.description ?? null, data.start_date, data.end_date,
        data.start_time, data.end_time, data.status ?? shiftStatus.DRAFT, data.notes ?? null, now, now],
    );
    for (const member of data.members ?? []) await insertMember(tx, id, member, now);
  });

  return (await getShiftWithMembers(db, id)) as IDriverShift;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllDriverShifts(
  params: IDriverShiftsPaginationParams = {},
): Promise<IPaginatedResult<IDriverShiftSummary>> {
  const db = await getPowerSyncDb();

  const page   = params.page  || 1;
  const limit  = params.limit || 20;
  const offset = (page - 1) * limit;

  const filters: string[] = ['s.deleted_at IS NULL'];
  const args: unknown[] = [];
  if (params.status && params.status !== 'all') { filters.push('s.status = ?'); args.push(params.status); }
  if (params.search?.trim()) {
    const q = `%${params.search.toLowerCase()}%`;
    filters.push('(LOWER(s.name) LIKE ? OR LOWER(s.description) LIKE ?)'); args.push(q, q);
  }
  if (params.from_date) { filters.push('s.end_date >= ?');   args.push(params.from_date); }
  if (params.to_date)   { filters.push('s.start_date <= ?'); args.push(params.to_date); }
  const where = filters.join(' AND ');

  const totalRow = await db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM driver_shifts s WHERE ${where}`, args);
  const total = totalRow.total;

  const data = await db.getAll<IDriverShiftSummary>(
    `SELECT s.id, s.name, s.description, s.start_date, s.end_date, s.start_time, s.end_time, s.status, s.notes,
            s.created_at, s.updated_at,
            (SELECT COUNT(*) FROM driver_shift_members m WHERE m.shift_id = s.id AND m.deleted_at IS NULL) AS member_count,
            (SELECT d.name FROM driver_shift_members m LEFT JOIN drivers d ON d.id = m.driver_id
               WHERE m.shift_id = s.id AND m.is_leader = 1 AND m.deleted_at IS NULL LIMIT 1) AS leader_name
     FROM driver_shifts s WHERE ${where}
     ORDER BY s.start_date DESC LIMIT ? OFFSET ?`,
    [...args, limit, offset],
  );

  const countsRaw = await db.getAll<{ status: string; count: number }>(
    `SELECT status, COUNT(*) AS count FROM driver_shifts WHERE deleted_at IS NULL GROUP BY status`,
  );
  const statusCounts: Record<string, number> = { draft: 0, active: 0, archived: 0 };
  for (const r of countsRaw) statusCounts[r.status] = r.count;

  return {
    data: data.map(r => ({ ...r, member_count: r.member_count ?? 0, leader_name: r.leader_name ?? null })),
    pagination: {
      total, page, limit,
      totalPages:  Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
    statusCounts,
  };
}

export async function getDriverShiftById(id: string): Promise<IDriverShift | null> {
  return getShiftWithMembers(await getPowerSyncDb(), id);
}

interface BadgeRow { driver_id: string; shift_id: string; shift_name: string | null; is_leader: number; start_time: string | null; end_time: string | null }

const BADGE_SQL = `
  SELECT m.driver_id, m.shift_id, s.name AS shift_name, m.is_leader, s.start_time, s.end_time
  FROM driver_shift_members m INNER JOIN driver_shifts s ON s.id = m.shift_id
  WHERE s.status = ? AND s.deleted_at IS NULL AND m.deleted_at IS NULL`;

function toBadge(r: BadgeRow): IDriverShiftBadge {
  return {
    shift_id:   r.shift_id,
    shift_name: r.shift_name ?? '—',
    is_leader:  !!r.is_leader,
    start_time: r.start_time ?? '',
    end_time:   r.end_time ?? '',
  };
}

export async function getShiftsForDriver(driverId: string): Promise<IDriverShiftBadge[]> {
  const db = await getPowerSyncDb();
  const rows = await db.getAll<BadgeRow>(`${BADGE_SQL} AND m.driver_id = ? ORDER BY s.start_time`, [shiftStatus.ACTIVE, driverId]);
  return rows.map(toBadge);
}

export async function getShiftsForAllDrivers(): Promise<Record<string, IDriverShiftBadge[]>> {
  const db = await getPowerSyncDb();
  const rows = await db.getAll<BadgeRow>(BADGE_SQL, [shiftStatus.ACTIVE]);
  const map: Record<string, IDriverShiftBadge[]> = {};
  for (const r of rows) (map[r.driver_id] ??= []).push(toBadge(r));
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE / DELETE — turno
// ─────────────────────────────────────────────────────────────────────────────

const SHIFT_EDITABLE = ['name', 'description', 'start_date', 'end_date', 'start_time', 'end_time', 'status', 'notes'] as const;

export async function updateDriverShift(id: string, data: IUpdateDriverShift): Promise<IDriverShift | null> {
  const db = await getPowerSyncDb();
  const record = data as Record<string, unknown>;
  const fields = SHIFT_EDITABLE.filter(f => record[f] !== undefined);
  if (fields.length > 0) {
    await db.execute(
      `UPDATE driver_shifts SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      [...fields.map(f => record[f]), new Date().toISOString(), id],
    );
  }
  return getShiftWithMembers(db, id);
}

export async function updateDriverShiftStatus(id: string, status: ShiftStatus): Promise<IDriverShift | null> {
  const db = await getPowerSyncDb();
  await db.execute(
    `UPDATE driver_shifts SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    [status, new Date().toISOString(), id],
  );
  return getShiftWithMembers(db, id);
}

export async function deleteDriverShift(id: string): Promise<boolean> {
  const db = await getPowerSyncDb();
  const existing = await db.getOptional<{ id: string }>(`SELECT id FROM driver_shifts WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (!existing) return false;
  const now = new Date().toISOString();
  await db.execute(`UPDATE driver_shifts SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────────────────────────────────────────

export async function addShiftMember(shiftId: string, data: IAddShiftMember): Promise<IDriverShift | null> {
  const db = await getPowerSyncDb();
  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    if (data.is_leader) {
      await tx.execute(
        `UPDATE driver_shift_members SET is_leader = 0, updated_at = ? WHERE shift_id = ? AND is_leader = 1 AND deleted_at IS NULL`,
        [now, shiftId],
      );
    }
    await insertMember(tx, shiftId, data, now);
  });
  return getShiftWithMembers(db, shiftId);
}

export async function removeShiftMember(shiftId: string, memberId: string): Promise<IDriverShift | null> {
  const db = await getPowerSyncDb();
  await db.execute(`DELETE FROM driver_shift_members WHERE id = ? AND shift_id = ?`, [memberId, shiftId]);
  return getShiftWithMembers(db, shiftId);
}

export async function setShiftLeader(shiftId: string, memberId: string): Promise<IDriverShift | null> {
  const db = await getPowerSyncDb();
  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE driver_shift_members SET is_leader = 0, updated_at = ? WHERE shift_id = ? AND is_leader = 1 AND deleted_at IS NULL`,
      [now, shiftId],
    );
    if (memberId) {
      await tx.execute(
        `UPDATE driver_shift_members SET is_leader = 1, updated_at = ? WHERE id = ? AND shift_id = ?`,
        [now, memberId, shiftId],
      );
    }
  });
  return getShiftWithMembers(db, shiftId);
}

export async function updateShiftMember(
  shiftId: string, memberId: string, data: IUpdateShiftMember,
): Promise<IDriverShift | null> {
  const db = await getPowerSyncDb();
  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    if (data.is_leader === true) {
      await tx.execute(
        `UPDATE driver_shift_members SET is_leader = 0, updated_at = ? WHERE shift_id = ? AND is_leader = 1 AND id <> ? AND deleted_at IS NULL`,
        [now, shiftId, memberId],
      );
    }
    const sets: string[] = [];
    const args: unknown[] = [];
    if (data.is_leader !== undefined) { sets.push('is_leader = ?'); args.push(data.is_leader ? 1 : 0); }
    if (data.notes !== undefined)     { sets.push('notes = ?');     args.push(data.notes); }
    if (sets.length > 0) {
      await tx.execute(
        `UPDATE driver_shift_members SET ${sets.join(', ')}, updated_at = ? WHERE id = ? AND shift_id = ?`,
        [...args, now, memberId, shiftId],
      );
    }
  });
  return getShiftWithMembers(db, shiftId);
}

export async function replaceShiftMembers(
  shiftId: string,
  members: { driver_id: string; is_leader: boolean; notes?: string }[],
): Promise<IDriverShift | null> {
  const db = await getPowerSyncDb();
  if (members.filter(m => m.is_leader).length > 1) throw new Error('shifts:errors.onlyOneLeader');
  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    await tx.execute(`DELETE FROM driver_shift_members WHERE shift_id = ?`, [shiftId]);
    for (const m of members) await insertMember(tx, shiftId, m, now);
  });
  return getShiftWithMembers(db, shiftId);
}
