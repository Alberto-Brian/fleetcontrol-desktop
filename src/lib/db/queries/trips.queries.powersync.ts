// ========================================
// FILE: src/lib/db/queries/trips.queries.powersync.ts
// ========================================
//
// Fase 6 (migração Standalone -> Connected-first), Prompt 6.5 — Trips
// cortado para PowerSync. `trips.queries.ts` (Drizzle/app.db) não tocado,
// fica como backup/referência.
//
// Vehicles (6.3), Drivers (6.2) e agora Routes (6.9) vivem TODOS em
// powersync.db — nenhum JOIN precisa de seam nenhum, é a mesma base
// SQLite. `enrichWithRouteName`/o seam via app.db foi removido no Prompt
// 6.9 quando Routes cortou (rota resolvida directamente por JOIN abaixo).
//
// createTrip/completeTrip/cancelTrip/deleteTrip usam `db.writeTransaction`
// (atomicidade real — trips+vehicles+drivers na MESMA base agora),
// substituindo o `db.transaction()` do Drizzle original.
import { getPowerSyncDb } from '@/lib/powersync/client';
import { getSessionOrganizationId } from '@/helpers/ipc/services/auth/token-store';
import { generateUuid } from '@/lib/utils/cripto';
import { ICreateTrip, ICompleteTrip, ITrip } from '@/lib/types/trip';
import { IPaginationParams, IPaginatedResult } from '@/lib/types/pagination';
import { tripStatus } from '@/lib/db/schemas/trips';
import { vehicleStatus } from '@/lib/db/schemas/vehicles';
import { driverAvailability } from '@/lib/db/schemas/drivers';
import { vehicleHasActiveTrip, driverHasActiveTrip, vehicleHasActiveMaintenance, settleAfterTrip } from './vehicle-state.powersync';

// Forma real devolvida (mais rica que ITrip, mesma situação já existia no
// original — o Drizzle devolvia route_name/vehicle_license/etc. via `as
// ITrip`, sem estarem declarados na interface). Mantido aqui pelo mesmo
// motivo: o renderer já lê estes campos extra.
interface TripRow {
  id: string; trip_code: string; vehicle_id: string; driver_id: string; route_id: string | null;
  start_date: string; end_date: string | null; start_mileage: number; end_mileage: number | null;
  origin: string | null; destination: string | null; purpose: string | null; status: string;
  notes: string | null; created_at: string; updated_at: string;
  vehicle_license: string | null; vehicle_brand: string | null; vehicle_model: string | null;
  driver_name: string | null; driver_license_number: string | null; driver_email: string | null;
  route_name: string | null;
}

const TRIP_SELECT = `
  t.id, t.trip_code, t.vehicle_id, t.driver_id, t.route_id, t.start_date, t.end_date,
  t.start_mileage, t.end_mileage, t.origin, t.destination, t.purpose, t.status, t.notes,
  t.created_at, t.updated_at,
  v.license_plate as vehicle_license, v.brand as vehicle_brand, v.model as vehicle_model,
  d.name as driver_name, d.license_number as driver_license_number, d.email as driver_email,
  r.name as route_name
`;
const TRIP_FROM_JOIN = `
  FROM trips t
  LEFT JOIN vehicles v ON v.id = t.vehicle_id
  LEFT JOIN drivers d ON d.id = t.driver_id
  LEFT JOIN routes r ON r.id = t.route_id
`;

export async function getTripById(tripId: string): Promise<ITrip | null> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<TripRow>(
    `SELECT ${TRIP_SELECT} ${TRIP_FROM_JOIN} WHERE t.id = ? AND t.deleted_at IS NULL LIMIT 1`,
    [tripId],
  );
  return row ? (row as unknown as ITrip) : null;
}

export async function isVehicleAvailable(vehicleId: string): Promise<boolean> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<{ status: string }>(`SELECT status FROM vehicles WHERE id = ? LIMIT 1`, [vehicleId]);
  return row?.status === vehicleStatus.AVAILABLE;
}

export async function isDriverAvailable(driverId: string): Promise<boolean> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<{ availability: string }>(`SELECT availability FROM drivers WHERE id = ? LIMIT 1`, [driverId]);
  return row?.availability === driverAvailability.AVAILABLE;
}

export async function createTrip(tripData: ICreateTrip): Promise<ITrip> {
  const db = await getPowerSyncDb();
  const organizationId = getSessionOrganizationId();
  const id = generateUuid();
  const now = new Date().toISOString();
  const tripCode = `VIA-${now.split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  let origin = tripData.origin;
  let destination = tripData.destination;

  if (tripData.route_id) {
    const route = await db.getOptional<{ origin: string; destination: string }>(
      `SELECT origin, destination FROM routes WHERE id = ? LIMIT 1`, [tripData.route_id],
    );
    if (!route) throw new Error('trips:errors.routeNotFound');
    origin = route.origin;
    destination = route.destination;
  }

  if (!origin || !destination) throw new Error('trips:errors.originDestinationRequired');

  await db.writeTransaction(async (tx) => {
    // Verificação dentro da mesma transacção (não só o estado gravado, que
    // pode estar desencontrado): um veículo/motorista só tem uma viagem em
    // curso, e um veículo em manutenção não sai em viagem.
    if (await vehicleHasActiveTrip(tx, tripData.vehicle_id)) throw new Error('trips:errors.vehicleNotAvailable');
    if (await vehicleHasActiveMaintenance(tx, tripData.vehicle_id)) throw new Error('trips:errors.vehicleInMaintenance');
    if (await driverHasActiveTrip(tx, tripData.driver_id)) throw new Error('trips:errors.driverNotAvailable');

    await tx.execute(
      `INSERT INTO trips (
        id, organization_id, trip_code, start_date, status, vehicle_id, driver_id, route_id,
        start_mileage, origin, destination, purpose, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, organizationId, tripCode, now, tripStatus.IN_PROGRESS, tripData.vehicle_id, tripData.driver_id,
        tripData.route_id || null, tripData.start_mileage, origin, destination,
        tripData.purpose || null, tripData.notes || null, now, now],
    );
    await tx.execute(`UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?`,
      [vehicleStatus.IN_USE, now, tripData.vehicle_id]);
    await tx.execute(`UPDATE drivers SET availability = ?, updated_at = ? WHERE id = ?`,
      [driverAvailability.ON_TRIP, now, tripData.driver_id]);
  });

  return (await getTripById(id)) as ITrip;
}

export async function getAllTrips(params: IPaginationParams = {}): Promise<IPaginatedResult<ITrip>> {
  const db = await getPowerSyncDb();

  const page   = params.page  || 1;
  const limit  = params.limit || 20;
  const offset = (page - 1) * limit;

  const filters: string[] = ['t.deleted_at IS NULL'];
  const filterParams: unknown[] = [];

  if (params.search?.trim()) {
    const s = `%${params.search.toLowerCase()}%`;
    filters.push(`(LOWER(t.trip_code) LIKE ? OR LOWER(v.license_plate) LIKE ? OR LOWER(d.name) LIKE ? OR LOWER(t.origin) LIKE ? OR LOWER(t.destination) LIKE ?)`);
    filterParams.push(s, s, s, s, s);
  }
  if (params.status && params.status !== 'all') { filters.push('t.status = ?'); filterParams.push(params.status); }
  if (params.vehicle_id) { filters.push('t.vehicle_id = ?'); filterParams.push(params.vehicle_id); }
  if (params.driver_id) { filters.push('t.driver_id = ?'); filterParams.push(params.driver_id); }

  const where = filters.join(' AND ');

  const totalRow = await db.get<{ total: number }>(`SELECT COUNT(*) as total ${TRIP_FROM_JOIN} WHERE ${where}`, filterParams);
  const total = totalRow.total;

  const rows = await db.getAll<TripRow>(
    `SELECT ${TRIP_SELECT} ${TRIP_FROM_JOIN} WHERE ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
    [...filterParams, limit, offset],
  );
  const data = rows;

  const baseFilters: string[] = ['t.deleted_at IS NULL'];
  const baseParams: unknown[] = [];
  if (params.search?.trim()) {
    const s = `%${params.search.toLowerCase()}%`;
    baseFilters.push(`(LOWER(t.trip_code) LIKE ? OR LOWER(v.license_plate) LIKE ? OR LOWER(d.name) LIKE ? OR LOWER(t.origin) LIKE ? OR LOWER(t.destination) LIKE ?)`);
    baseParams.push(s, s, s, s, s);
  }
  const baseWhere = baseFilters.join(' AND ');

  const countsRaw = await db.getAll<{ status: string; count: number }>(
    `SELECT t.status as status, COUNT(*) as count ${TRIP_FROM_JOIN} WHERE ${baseWhere} GROUP BY t.status`, baseParams,
  );
  const statusCounts: Record<string, number> = { in_progress: 0, completed: 0, cancelled: 0 };
  for (const row of countsRaw) statusCounts[row.status] = row.count;

  const distRow = await db.get<{ total: number }>(
    `SELECT COALESCE(SUM(end_mileage - start_mileage), 0) as total FROM trips WHERE deleted_at IS NULL AND status = 'completed'`,
  );

  return {
    data: data as unknown as ITrip[],
    pagination: {
      total, page, limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
    statusCounts: { ...statusCounts, totalDistance: distRow.total },
  };
}

export async function getActiveTrips(): Promise<ITrip[]> {
  const db = await getPowerSyncDb();
  const rows = await db.getAll<TripRow>(
    `SELECT ${TRIP_SELECT} ${TRIP_FROM_JOIN} WHERE t.status = ? AND t.deleted_at IS NULL ORDER BY t.start_date DESC`,
    [tripStatus.IN_PROGRESS],
  );
  return rows as unknown as ITrip[];
}

export async function completeTrip(tripId: string, completeData: ICompleteTrip): Promise<ITrip | null> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<{ vehicle_id: string; driver_id: string; start_mileage: number; notes: string | null; status: string }>(
    `SELECT vehicle_id, driver_id, start_mileage, notes, status FROM trips WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [tripId],
  );
  if (!row) throw new Error('trips:errors.tripNotFound');
  if (row.status !== tripStatus.IN_PROGRESS) throw new Error('trips:validation.tripNotInProgress');
  if (completeData.end_mileage <= row.start_mileage) throw new Error('trips:errors.endMileageLowerThanStart');

  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE trips SET end_mileage = ?, end_date = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [completeData.end_mileage, now, tripStatus.COMPLETED, completeData.notes || row.notes, now, tripId],
    );
    await settleAfterTrip(tx, { tripId, vehicleId: row.vehicle_id, driverId: row.driver_id, now, endMileage: completeData.end_mileage });
  });

  return getTripById(tripId);
}

export async function cancelTrip(tripId: string): Promise<string> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<{ vehicle_id: string; driver_id: string; status: string }>(
    `SELECT vehicle_id, driver_id, status FROM trips WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [tripId],
  );
  if (!row) throw new Error('trips:errors.tripNotFound');
  if (row.status !== tripStatus.IN_PROGRESS) throw new Error('trips:validation.tripNotInProgress');

  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    await tx.execute(`UPDATE trips SET status = ?, updated_at = ? WHERE id = ?`, [tripStatus.CANCELLED, now, tripId]);
    await settleAfterTrip(tx, { tripId, vehicleId: row.vehicle_id, driverId: row.driver_id, now });
  });

  return tripId;
}

/**
 * Soft-delete de uma viagem. Se estiver IN_PROGRESS, liberta o veículo e o
 * motorista (só se não tiverem outra viagem em curso — settleAfterTrip).
 */
export async function deleteTrip(tripId: string): Promise<string> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<{ vehicle_id: string; driver_id: string; status: string }>(
    `SELECT vehicle_id, driver_id, status FROM trips WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [tripId],
  );
  if (!row) throw new Error('trips:errors.tripNotFound');

  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    await tx.execute(`UPDATE trips SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, tripId]);
    if (row.status === tripStatus.IN_PROGRESS) {
      await settleAfterTrip(tx, { tripId, vehicleId: row.vehicle_id, driverId: row.driver_id, now });
    }
  });

  return tripId;
}

/**
 * Ferramenta de manutenção: corrige veículos/motoristas presos em
 * IN_USE/ON_TRIP sem viagem activa correspondente.
 */
export async function reconcileOrphanedStates(): Promise<{ vehiclesFixed: string[]; driversFixed: string[] }> {
  const db = await getPowerSyncDb();
  const now = new Date().toISOString();

  const activeVehicleIds = new Set(
    (await db.getAll<{ vehicle_id: string }>(
      `SELECT vehicle_id FROM trips WHERE status = ? AND deleted_at IS NULL`, [tripStatus.IN_PROGRESS],
    )).map(r => r.vehicle_id),
  );
  const activeDriverIds = new Set(
    (await db.getAll<{ driver_id: string }>(
      `SELECT driver_id FROM trips WHERE status = ? AND deleted_at IS NULL`, [tripStatus.IN_PROGRESS],
    )).map(r => r.driver_id),
  );

  const orphanedVehicles = await db.getAll<{ id: string; license_plate: string }>(
    `SELECT id, license_plate FROM vehicles WHERE status = ? AND deleted_at IS NULL`, [vehicleStatus.IN_USE],
  );
  const vehiclesFixed: string[] = [];
  for (const v of orphanedVehicles) {
    if (!activeVehicleIds.has(v.id)) {
      await db.execute(`UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?`, [vehicleStatus.AVAILABLE, now, v.id]);
      vehiclesFixed.push(v.license_plate ?? v.id);
    }
  }

  const orphanedDrivers = await db.getAll<{ id: string; name: string }>(
    `SELECT id, name FROM drivers WHERE availability = ? AND deleted_at IS NULL`, [driverAvailability.ON_TRIP],
  );
  const driversFixed: string[] = [];
  for (const d of orphanedDrivers) {
    if (!activeDriverIds.has(d.id)) {
      await db.execute(`UPDATE drivers SET availability = ?, updated_at = ? WHERE id = ?`, [driverAvailability.AVAILABLE, now, d.id]);
      driversFixed.push(d.name ?? d.id);
    }
  }

  if (vehiclesFixed.length || driversFixed.length) {
    console.warn('[reconcileOrphanedStates] Estado corrigido:', { vehiclesFixed, driversFixed });
  }

  return { vehiclesFixed, driversFixed };
}
