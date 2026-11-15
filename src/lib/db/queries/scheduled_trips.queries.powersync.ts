// ========================================
// FILE: src/lib/db/queries/scheduled_trips.queries.powersync.ts
// ========================================
//
// Fase 6 (migração Standalone -> Connected-first) — Scheduled Trips.
// Achado tardio, corrigido de propósito: ao contrário do que a
// investigação do Prompt 6.5 assumiu (código morto, sem IPC), este
// domínio está TOTALMENTE ligado — separador "Viagens Agendadas" no
// perfil do motorista (só a pasta IPC usa hífen `scheduled-trips`, não
// underscore, e o ficheiro de listeners tem um erro de escrita no nome,
// por isso escapou à busca inicial por `*scheduled_trips*`).
//
// Mais grave: `trip-scheduler.ts` corre a cada 5 minutos desde o arranque
// da app (main.ts) e, até este corte, lia/escrevia `scheduled_trips`/
// `drivers`/`vehicles`/`trips` via app.db — como estes 3 últimos já só
// escrevem em powersync.db desde os Prompts 6.2/6.3/6.5, o scheduler
// estava a ler estado de motoristas/veículos DESACTUALIZADO havia dias, e
// a criar viagens reais numa tabela `trips` de app.db que já não é lida
// por mais ninguém — viagens agendadas paravam de "lançar" de forma
// visível, silenciosamente, desde o Prompt 6.5. Corrigido aqui, não é uma
// simples migração de conveniência.
//
// `scheduled_trips.queries.ts` (Drizzle/app.db) não tocado, fica como
// backup. driver/vehicle/route/trip já vivem todos em powersync.db —
// JOINs normais em tudo, sem seam nenhum.
import { getPowerSyncDb } from '@/lib/powersync/client';
import { getSessionOrganizationId } from '@/helpers/ipc/services/auth/token-store';
import { generateUuid } from '@/lib/utils/cripto';
import {
  IScheduledTrip, ICreateScheduledTrip, IUpdateScheduledTrip, ICancelScheduledTrip,
  IScheduledTripsPaginationParams,
} from '@/lib/types/scheduled-trip';
import { IPaginatedResult } from '@/lib/types/pagination';
import { scheduledTripStatus } from '@/lib/db/schemas/scheduled_trips';
import { tripStatus } from '@/lib/db/schemas/trips';
import { vehicleStatus } from '@/lib/db/schemas/vehicles';
import { driverStatus, driverAvailability } from '@/lib/db/schemas/drivers';
import { vehicleHasActiveTrip, vehicleHasActiveMaintenance, driverHasActiveTrip } from './vehicle-state.powersync';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function generateTripCode(): string {
  const now = new Date();
  const yy  = String(now.getFullYear()).slice(2);
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const dd  = String(now.getDate()).padStart(2, '0');
  const rnd = Math.floor(Math.random() * 9000) + 1000;
  return `VG-${yy}${mm}${dd}-${rnd}`;
}

interface ScheduledTripRow {
  id: string; driver_id: string; driver_name: string | null; vehicle_id: string;
  vehicle_plate: string | null; vehicle_brand: string | null; vehicle_model: string | null;
  route_id: string | null; route_name: string | null; scheduled_date: string;
  origin: string | null; destination: string | null; purpose: string | null; notes: string | null;
  status: string; trip_id: string | null; launched_at: string | null; cancelled_at: string | null;
  cancelled_reason: string | null; created_at: string; updated_at: string;
}

const ST_SELECT = `
  st.id, st.driver_id, d.name as driver_name, st.vehicle_id,
  v.license_plate as vehicle_plate, v.brand as vehicle_brand, v.model as vehicle_model,
  st.route_id, r.name as route_name, st.scheduled_date, st.origin, st.destination, st.purpose, st.notes,
  st.status, st.trip_id, st.launched_at, st.cancelled_at, st.cancelled_reason, st.created_at, st.updated_at
`;
// route_name nunca foi populado no original (scheduledTripSelect não
// fazia JOIN a routes, apesar de IScheduledTrip já o declarar) — corrigido
// aqui de propósito, agora que Routes também vive em powersync.db.
const ST_FROM_JOIN = `
  FROM scheduled_trips st
  LEFT JOIN drivers d ON d.id = st.driver_id
  LEFT JOIN vehicles v ON v.id = st.vehicle_id
  LEFT JOIN routes r ON r.id = st.route_id
`;

function mapRow(r: ScheduledTripRow): IScheduledTrip {
  return {
    id: r.id, driver_id: r.driver_id, driver_name: r.driver_name ?? undefined, vehicle_id: r.vehicle_id,
    vehicle_plate: r.vehicle_plate ?? undefined, vehicle_brand: r.vehicle_brand ?? undefined,
    vehicle_model: r.vehicle_model ?? undefined, route_id: r.route_id, route_name: r.route_name,
    scheduled_date: r.scheduled_date, origin: r.origin, destination: r.destination, purpose: r.purpose,
    notes: r.notes, status: r.status as IScheduledTrip['status'], trip_id: r.trip_id,
    launched_at: r.launched_at, cancelled_at: r.cancelled_at, cancelled_reason: r.cancelled_reason,
    created_at: r.created_at, updated_at: r.updated_at,
  };
}

export async function createScheduledTrip(data: ICreateScheduledTrip): Promise<IScheduledTrip> {
  const db = await getPowerSyncDb();
  const id = generateUuid();
  const organizationId = getSessionOrganizationId();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO scheduled_trips (
      id, organization_id, driver_id, vehicle_id, route_id, scheduled_date, origin, destination,
      purpose, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, organizationId, data.driver_id, data.vehicle_id, data.route_id ?? null, data.scheduled_date,
      data.origin ?? null, data.destination ?? null, data.purpose ?? null, data.notes ?? null,
      scheduledTripStatus.SCHEDULED, now, now,
    ],
  );

  return (await getScheduledTripById(id)) as IScheduledTrip;
}

export async function getAllScheduledTrips(params: IScheduledTripsPaginationParams = {}): Promise<IPaginatedResult<IScheduledTrip>> {
  const db = await getPowerSyncDb();

  const page   = params.page  || 1;
  const limit  = params.limit || 20;
  const offset = (page - 1) * limit;

  const filters: string[] = ['st.deleted_at IS NULL'];
  const filterParams: unknown[] = [];

  if (params.driver_id && params.driver_id !== 'all') { filters.push('st.driver_id = ?'); filterParams.push(params.driver_id); }
  if (params.vehicle_id && params.vehicle_id !== 'all') { filters.push('st.vehicle_id = ?'); filterParams.push(params.vehicle_id); }
  if (params.status && params.status !== 'all') { filters.push('st.status = ?'); filterParams.push(params.status); }
  // Mesmo comportamento do original: from_date/to_date usam ambos <=
  // (não é um bug meu — assim já estava no ficheiro Drizzle original).
  if (params.from_date) { filters.push('st.scheduled_date <= ?'); filterParams.push(params.from_date); }
  if (params.to_date) { filters.push('st.scheduled_date <= ?'); filterParams.push(params.to_date); }
  if (params.search?.trim()) {
    const s = `%${params.search.toLowerCase()}%`;
    filters.push('(LOWER(d.name) LIKE ? OR LOWER(v.license_plate) LIKE ?)');
    filterParams.push(s, s);
  }

  const where = filters.join(' AND ');

  const totalRow = await db.get<{ total: number }>(`SELECT COUNT(*) as total ${ST_FROM_JOIN} WHERE ${where}`, filterParams);
  const total = totalRow.total;

  const rows = await db.getAll<ScheduledTripRow>(
    `SELECT ${ST_SELECT} ${ST_FROM_JOIN} WHERE ${where} ORDER BY st.scheduled_date DESC LIMIT ? OFFSET ?`,
    [...filterParams, limit, offset],
  );

  const countsRaw = await db.getAll<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM scheduled_trips WHERE deleted_at IS NULL GROUP BY status`,
  );
  const statusCounts: Record<string, number> = { scheduled: 0, pending_leave: 0, launched: 0, cancelled: 0 };
  for (const row of countsRaw) statusCounts[row.status] = row.count;

  return {
    data: rows.map(mapRow),
    pagination: {
      total, page, limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
    statusCounts,
  };
}

export async function getScheduledTripById(id: string): Promise<IScheduledTrip | null> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<ScheduledTripRow>(
    `SELECT ${ST_SELECT} ${ST_FROM_JOIN} WHERE st.id = ? LIMIT 1`, [id],
  );
  return row ? mapRow(row) : null;
}

export async function getScheduledTripsByDriver(driverId: string): Promise<IScheduledTrip[]> {
  const db = await getPowerSyncDb();
  const rows = await db.getAll<ScheduledTripRow>(
    `SELECT ${ST_SELECT} ${ST_FROM_JOIN} WHERE st.driver_id = ? AND st.deleted_at IS NULL ORDER BY st.scheduled_date DESC`,
    [driverId],
  );
  return rows.map(mapRow);
}

export async function updateScheduledTrip(id: string, data: IUpdateScheduledTrip): Promise<IScheduledTrip | null> {
  const db = await getPowerSyncDb();
  const updateData: Record<string, unknown> = { ...data };
  const fields = Object.keys(updateData).filter(f => updateData[f] !== undefined);
  if (fields.length > 0) {
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    // Mesma condição do original: só actualiza se ainda estiver 'scheduled'.
    await db.execute(
      `UPDATE scheduled_trips SET ${setClause}, updated_at = ? WHERE id = ? AND status = ?`,
      [...fields.map(f => updateData[f]), new Date().toISOString(), id, scheduledTripStatus.SCHEDULED],
    );
  }
  return getScheduledTripById(id);
}

export async function cancelScheduledTrip(id: string, data: ICancelScheduledTrip = {}): Promise<IScheduledTrip | null> {
  const db = await getPowerSyncDb();

  const trip = await getScheduledTripById(id);
  if (!trip) return null;

  if (trip.status === scheduledTripStatus.LAUNCHED || trip.status === scheduledTripStatus.CANCELLED) {
    throw new Error('Viagem não pode ser cancelada no estado actual.');
  }

  const now = new Date().toISOString();
  await db.execute(
    `UPDATE scheduled_trips SET status = ?, cancelled_at = ?, cancelled_reason = ?, updated_at = ? WHERE id = ?`,
    [scheduledTripStatus.CANCELLED, now, data.cancelled_reason ?? null, now, id],
  );

  return getScheduledTripById(id);
}

export async function hasConflictingScheduledTrip(
  driverId?: string, date?: string, vehicleId?: string, excludeId?: string,
): Promise<boolean> {
  const db = await getPowerSyncDb();
  if (!date) return false;

  const filters: string[] = ['deleted_at IS NULL', "status != 'cancelled'", 'scheduled_date = ?'];
  const params: unknown[] = [date];

  if (driverId) { filters.push('driver_id = ?'); params.push(driverId); }
  if (vehicleId) { filters.push('vehicle_id = ?'); params.push(vehicleId); }
  if (excludeId) { filters.push('id != ?'); params.push(excludeId); }

  const row = await db.getOptional<{ id: string }>(
    `SELECT id FROM scheduled_trips WHERE ${filters.join(' AND ')} LIMIT 1`, params,
  );
  return !!row;
}

// ─────────────────────────────────────────────
// SCHEDULER — chamado por trip-scheduler.ts a cada 5 minutos
// ─────────────────────────────────────────────

/**
 * Processa viagens agendadas cuja data chegou. Mesma lógica do original
 * (espelhada do leave-scheduler):
 *  scheduled + scheduled_date <= hoje
 *    → driver on_leave  → pending_leave (aguarda regresso)
 *    → driver available → lança trip real (status = launched)
 *  pending_leave + driver já não está on_leave → lança trip real
 *
 * Diferença deliberada face ao original: cada lançamento usa
 * `writeTransaction` (trips+vehicles+drivers+scheduled_trips atómico) —
 * o Drizzle original fazia os 4 writes sequenciais sem transacção, um
 * risco de estado parcial que o writeTransaction do PowerSync evita de
 * graça, mesmo padrão já aplicado em trips.queries.powersync.ts.
 */
export async function processScheduledTrips(): Promise<{
  launched: string[]; pendingLeave: string[]; autoCancelled: string[];
}> {
  const db = await getPowerSyncDb();
  const today = todayStr();

  const launched: string[] = [];
  const pendingLeave: string[] = [];
  const autoCancelled: string[] = [];

  interface DueRow {
    id: string; driver_id: string; vehicle_id: string; route_id: string | null;
    origin: string | null; destination: string | null; purpose: string | null; notes: string | null;
    driver_status: string; vehicle_is_active: number; vehicle_status: string;
  }

  const dueTodayOrBefore = await db.getAll<DueRow>(
    `SELECT st.id, st.driver_id, st.vehicle_id, st.route_id, st.origin, st.destination, st.purpose, st.notes,
            d.status as driver_status, v.is_active as vehicle_is_active, v.status as vehicle_status
     FROM scheduled_trips st
     LEFT JOIN drivers d ON d.id = st.driver_id
     LEFT JOIN vehicles v ON v.id = st.vehicle_id
     WHERE st.status = ? AND st.scheduled_date <= ? AND st.deleted_at IS NULL`,
    [scheduledTripStatus.SCHEDULED, today],
  );

  for (const st of dueTodayOrBefore) {
    if (!st.driver_status || !st.vehicle_status) continue; // driver/veículo apagado — mesmo skip do original

    if (!st.vehicle_is_active || st.vehicle_status === vehicleStatus.INACTIVE) {
      await db.execute(
        `UPDATE scheduled_trips SET status = ?, cancelled_at = ?, cancelled_reason = ?, updated_at = ? WHERE id = ?`,
        [scheduledTripStatus.CANCELLED, new Date().toISOString(), 'Veículo inactivo', new Date().toISOString(), st.id],
      );
      autoCancelled.push(st.id);
      continue;
    }

    if (st.driver_status === driverStatus.ON_LEAVE) {
      await db.execute(
        `UPDATE scheduled_trips SET status = ?, updated_at = ? WHERE id = ?`,
        [scheduledTripStatus.PENDING_LEAVE, new Date().toISOString(), st.id],
      );
      pendingLeave.push(st.id);
      continue;
    }

    if (st.driver_status === driverStatus.TERMINATED) {
      await db.execute(
        `UPDATE scheduled_trips SET status = ?, cancelled_at = ?, cancelled_reason = ?, updated_at = ? WHERE id = ?`,
        [scheduledTripStatus.CANCELLED, new Date().toISOString(), 'Motorista terminado', new Date().toISOString(), st.id],
      );
      autoCancelled.push(st.id);
      continue;
    }

    if (await launchScheduledTrip(db, st)) launched.push(st.id);
  }

  const pendingLeaveRows = await db.getAll<DueRow>(
    `SELECT st.id, st.driver_id, st.vehicle_id, st.route_id, st.origin, st.destination, st.purpose, st.notes,
            d.status as driver_status, v.is_active as vehicle_is_active, v.status as vehicle_status
     FROM scheduled_trips st
     LEFT JOIN drivers d ON d.id = st.driver_id
     LEFT JOIN vehicles v ON v.id = st.vehicle_id
     WHERE st.status = ? AND st.deleted_at IS NULL`,
    [scheduledTripStatus.PENDING_LEAVE],
  );

  for (const st of pendingLeaveRows) {
    if (!st.driver_status || !st.vehicle_status) continue;
    if (st.driver_status === driverStatus.ON_LEAVE) continue;

    if (st.driver_status === driverStatus.TERMINATED) {
      await db.execute(
        `UPDATE scheduled_trips SET status = ?, cancelled_at = ?, cancelled_reason = ?, updated_at = ? WHERE id = ?`,
        [scheduledTripStatus.CANCELLED, new Date().toISOString(), 'Motorista terminado', new Date().toISOString(), st.id],
      );
      autoCancelled.push(st.id);
      continue;
    }

    if (await launchScheduledTrip(db, st)) launched.push(st.id);
  }

  return { launched, pendingLeave, autoCancelled };
}

async function launchScheduledTrip(
  db: Awaited<ReturnType<typeof getPowerSyncDb>>,
  st: { id: string; driver_id: string; vehicle_id: string; route_id: string | null; origin: string | null; destination: string | null; purpose: string | null; notes: string | null },
): Promise<boolean> {
  const tripId = generateUuid();
  const tripCode = generateTripCode();
  const now = new Date().toISOString();
  const organizationId = getSessionOrganizationId();

  return db.writeTransaction(async (tx) => {
    // 2026-11-15 — sem isto, uma agendada lançava sobre um veículo já em
    // viagem/manutenção ou um motorista já em viagem. Fica agendada e volta
    // a ser tentada na próxima passagem do scheduler.
    if (await vehicleHasActiveTrip(tx, st.vehicle_id)
      || await vehicleHasActiveMaintenance(tx, st.vehicle_id)
      || await driverHasActiveTrip(tx, st.driver_id)) {
      return false;
    }

    await tx.execute(
      `INSERT INTO trips (
        id, organization_id, trip_code, start_date, status, vehicle_id, driver_id, route_id,
        start_mileage, origin, destination, purpose, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tripId, organizationId, tripCode, now, tripStatus.IN_PROGRESS, st.vehicle_id, st.driver_id, st.route_id,
        0, st.origin, st.destination, st.purpose, st.notes, now, now],
    );
    await tx.execute(`UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?`, [vehicleStatus.IN_USE, now, st.vehicle_id]);
    await tx.execute(`UPDATE drivers SET availability = ?, updated_at = ? WHERE id = ?`, [driverAvailability.ON_TRIP, now, st.driver_id]);
    await tx.execute(
      `UPDATE scheduled_trips SET status = ?, trip_id = ?, launched_at = ?, updated_at = ? WHERE id = ?`,
      [scheduledTripStatus.LAUNCHED, tripId, now, now, st.id],
    );
    return true;
  });
}
