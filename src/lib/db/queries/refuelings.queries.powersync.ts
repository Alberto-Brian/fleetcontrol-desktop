// ========================================
// FILE: src/lib/db/queries/refuelings.queries.powersync.ts
// ========================================
//
// Fase 6 (migração Standalone -> Connected-first), Prompt 6.6 — Fuel
// (refuelings) cortado para PowerSync. `refuelings.queries.ts` (Drizzle/
// app.db) não tocado, fica como backup/referência.
//
// vehicle/driver/trip já vivem em powersync.db (6.2/6.3/6.5); fuel_stations
// e routes cortaram no Prompt 6.9 — todos os JOINs são normais agora,
// nenhum seam resta neste ficheiro (enrichStationAndRoute, que fazia o
// merge cruzado com app.db, foi removido).
import { getPowerSyncDb } from '@/lib/powersync/client';
import { getSessionOrganizationId } from '@/helpers/ipc/services/auth/token-store';
import { generateUuid } from '@/lib/utils/cripto';
import { IPaginatedResult } from '@/lib/types/pagination';
import {
  IRefueling, ICreateRefueling, IUpdateRefueling, IRefuelingsPaginationParams, IRefuelingStats,
} from '@/lib/types/refueling';

interface RefuelingRow {
  id: string; vehicle_id: string; driver_id: string | null; trip_id: string | null; station_id: string | null;
  refueling_date: string; fuel_type: string; liters: number; price_per_liter: number; total_cost: number;
  current_mileage: number; is_full_tank: number; invoice_number: string | null; notes: string | null;
  created_at: string; updated_at: string; deleted_at: string | null;
  vehicle_license: string | null; vehicle_brand: string | null; vehicle_model: string | null;
  driver_name: string | null;
  trip_code: string | null; trip_destination: string | null; trip_origin: string | null;
  trip_start_date: string | null; trip_status: string | null; trip_driver_id: string | null;
  station_name: string | null; station_brand: string | null; station_city: string | null;
  route_name: string | null; route_origin: string | null; route_destination: string | null;
}

const REFUELING_SELECT = `
  r.id, r.vehicle_id, r.driver_id, r.trip_id, r.station_id, r.refueling_date, r.fuel_type,
  r.liters, r.price_per_liter, r.total_cost, r.mileage as current_mileage, r.is_full_tank, r.invoice_number,
  r.notes, r.created_at, r.updated_at, r.deleted_at,
  v.license_plate as vehicle_license, v.brand as vehicle_brand, v.model as vehicle_model,
  d.name as driver_name,
  t.trip_code as trip_code, t.destination as trip_destination, t.origin as trip_origin,
  t.start_date as trip_start_date, t.status as trip_status, t.driver_id as trip_driver_id,
  s.name as station_name, s.brand as station_brand, s.city as station_city,
  rt.name as route_name, rt.origin as route_origin, rt.destination as route_destination
`;
const REFUELING_FROM_JOIN = `
  FROM fuel r
  LEFT JOIN vehicles v ON v.id = r.vehicle_id
  LEFT JOIN drivers d ON d.id = r.driver_id
  LEFT JOIN trips t ON t.id = r.trip_id
  LEFT JOIN fuel_stations s ON s.id = r.station_id
  LEFT JOIN routes rt ON rt.id = t.route_id
`;

function mapRow(r: RefuelingRow): IRefueling {
  return {
    id: r.id, vehicle_id: r.vehicle_id, driver_id: r.driver_id, trip_id: r.trip_id, station_id: r.station_id,
    refueling_date: r.refueling_date, fuel_type: r.fuel_type, liters: r.liters, price_per_liter: r.price_per_liter,
    total_cost: r.total_cost, current_mileage: r.current_mileage, is_full_tank: !!r.is_full_tank,
    invoice_number: r.invoice_number, notes: r.notes, created_at: r.created_at, updated_at: r.updated_at,
    deleted_at: r.deleted_at,
    vehicle_license: r.vehicle_license ?? undefined, vehicle_brand: r.vehicle_brand ?? undefined,
    vehicle_model: r.vehicle_model ?? undefined, driver_name: r.driver_name ?? undefined,
    station_name: r.station_name ?? undefined, station_brand: r.station_brand ?? undefined, station_city: r.station_city ?? undefined,
    trip_code: r.trip_code ?? undefined, trip_destination: r.trip_destination ?? undefined,
    trip_origin: r.trip_origin ?? undefined, trip_start_date: r.trip_start_date ?? undefined,
    trip_status: r.trip_status ?? undefined, trip_driver_id: r.trip_driver_id ?? undefined,
    route_name: r.route_name ?? undefined, route_origin: r.route_origin ?? undefined, route_destination: r.route_destination ?? undefined,
  };
}

export async function createRefueling(data: ICreateRefueling): Promise<IRefueling> {
  const db = await getPowerSyncDb();
  const id = generateUuid();
  const organizationId = getSessionOrganizationId();
  const now = new Date().toISOString();
  const totalCost = Math.round(data.liters * data.price_per_liter * 100) / 100;

  await db.execute(
    `INSERT INTO fuel (
      id, organization_id, vehicle_id, driver_id, trip_id, station_id, refueling_date, fuel_type,
      liters, price_per_liter, total_cost, mileage, is_full_tank, invoice_number, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, organizationId, data.vehicle_id, data.driver_id || null, data.trip_id || null, data.station_id || null,
      data.refueling_date ?? now, data.fuel_type, data.liters, data.price_per_liter, totalCost,
      data.current_mileage, data.is_full_tank ? 1 : 0, data.invoice_number ?? null, data.notes ?? null, now, now,
    ],
  );

  const created = await getRefuelingById(id);
  if (!created) throw new Error('Refueling created but could not be retrieved');
  return created;
}

export async function getRefuelingById(id: string): Promise<IRefueling | null> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<RefuelingRow>(
    `SELECT ${REFUELING_SELECT} ${REFUELING_FROM_JOIN} WHERE r.id = ? AND r.deleted_at IS NULL LIMIT 1`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function getAllRefuelings(params: IRefuelingsPaginationParams = {}): Promise<IPaginatedResult<IRefueling>> {
  const db = await getPowerSyncDb();

  const page   = params.page  || 1;
  const limit  = params.limit || 20;
  const offset = (page - 1) * limit;

  const filters: string[] = ['r.deleted_at IS NULL'];
  const filterParams: unknown[] = [];

  if (params.search?.trim()) {
    const s = `%${params.search.toLowerCase()}%`;
    filters.push(`(LOWER(v.license_plate) LIKE ? OR LOWER(d.name) LIKE ? OR LOWER(r.invoice_number) LIKE ?)`);
    filterParams.push(s, s, s);
  }
  if (params.fuel_type && params.fuel_type !== 'all') { filters.push('r.fuel_type = ?'); filterParams.push(params.fuel_type); }
  if (params.vehicle_id && params.vehicle_id !== 'all') { filters.push('r.vehicle_id = ?'); filterParams.push(params.vehicle_id); }
  if (params.driver_id && params.driver_id !== 'all') { filters.push('r.driver_id = ?'); filterParams.push(params.driver_id); }
  if (params.station_id && params.station_id !== 'all') { filters.push('r.station_id = ?'); filterParams.push(params.station_id); }
  if (params.full_tank_only) { filters.push('r.is_full_tank = 1'); }
  if (params.from_date) { filters.push('r.refueling_date >= ?'); filterParams.push(params.from_date); }
  if (params.to_date) { filters.push('r.refueling_date <= ?'); filterParams.push(params.to_date + 'T23:59:59'); }

  const where = filters.join(' AND ');

  const totalRow = await db.get<{ total: number }>(`SELECT COUNT(*) as total ${REFUELING_FROM_JOIN} WHERE ${where}`, filterParams);
  const total = totalRow.total;

  const rows = await db.getAll<RefuelingRow>(
    `SELECT ${REFUELING_SELECT} ${REFUELING_FROM_JOIN} WHERE ${where} ORDER BY r.refueling_date DESC LIMIT ? OFFSET ?`,
    [...filterParams, limit, offset],
  );
  const data = rows.map(mapRow);

  const totalsRow = await db.get<{ totalCost: number; totalLiters: number; avgPrice: number; totalCount: number }>(
    `SELECT COALESCE(SUM(r.total_cost),0) as totalCost, COALESCE(SUM(r.liters),0) as totalLiters,
            COALESCE(AVG(r.price_per_liter),0) as avgPrice, COUNT(*) as totalCount
     ${REFUELING_FROM_JOIN} WHERE ${where}`, filterParams,
  );

  return {
    data,
    pagination: {
      total, page, limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
    statusCounts: {
      totalCost: totalsRow.totalCost, totalLiters: totalsRow.totalLiters,
      avgPrice: totalsRow.avgPrice, totalCount: totalsRow.totalCount,
    },
  };
}

async function getRefuelingsByField(field: 'vehicle_id' | 'driver_id' | 'trip_id' | 'station_id', value: string): Promise<IRefueling[]> {
  const db = await getPowerSyncDb();
  const rows = await db.getAll<RefuelingRow>(
    `SELECT ${REFUELING_SELECT} ${REFUELING_FROM_JOIN} WHERE r.${field} = ? AND r.deleted_at IS NULL ORDER BY r.refueling_date DESC`,
    [value],
  );
  return rows.map(mapRow);
}

export const getRefuelingsByVehicle = (vehicleId: string) => getRefuelingsByField('vehicle_id', vehicleId);
export const getRefuelingsByDriver  = (driverId: string)  => getRefuelingsByField('driver_id', driverId);
export const getRefuelingsByTrip    = (tripId: string)    => getRefuelingsByField('trip_id', tripId);
export const getRefuelingsByStation = (stationId: string) => getRefuelingsByField('station_id', stationId);

export async function getRefuelingStats(params: { from_date?: string; to_date?: string; vehicle_id?: string } = {}): Promise<IRefuelingStats> {
  const db = await getPowerSyncDb();

  const filters: string[] = ['r.deleted_at IS NULL'];
  const filterParams: unknown[] = [];
  if (params.vehicle_id) { filters.push('r.vehicle_id = ?'); filterParams.push(params.vehicle_id); }
  if (params.from_date)  { filters.push('r.refueling_date >= ?'); filterParams.push(params.from_date); }
  if (params.to_date)    { filters.push('r.refueling_date <= ?'); filterParams.push(params.to_date + 'T23:59:59'); }
  const where = filters.join(' AND ');

  const totals = await db.get<{ totalCount: number; totalLiters: number; totalCost: number; avgPrice: number }>(
    `SELECT COUNT(*) as totalCount, COALESCE(SUM(r.liters),0) as totalLiters,
            COALESCE(SUM(r.total_cost),0) as totalCost, COALESCE(AVG(r.price_per_liter),0) as avgPrice
     ${REFUELING_FROM_JOIN} WHERE ${where}`, filterParams,
  );

  const topVehiclesRaw = await db.getAll<{ vehicle_id: string; vehicle_license: string | null; totalLiters: number; totalCost: number }>(
    `SELECT r.vehicle_id as vehicle_id, v.license_plate as vehicle_license,
            COALESCE(SUM(r.liters),0) as totalLiters, COALESCE(SUM(r.total_cost),0) as totalCost
     ${REFUELING_FROM_JOIN} WHERE ${where}
     GROUP BY r.vehicle_id, v.license_plate ORDER BY totalLiters DESC LIMIT 10`, filterParams,
  );

  const topStationsFilters = [...filters, 'r.station_id IS NOT NULL'];
  const topStationsWhere = topStationsFilters.join(' AND ');
  const stationTotalsRaw = await db.getAll<{ station_id: string; station_name: string | null; totalLiters: number; totalCost: number }>(
    `SELECT r.station_id as station_id, s.name as station_name,
            COALESCE(SUM(r.liters),0) as totalLiters, COALESCE(SUM(r.total_cost),0) as totalCost
     FROM fuel r
     LEFT JOIN fuel_stations s ON s.id = r.station_id
     WHERE ${topStationsWhere}
     GROUP BY r.station_id, s.name ORDER BY totalLiters DESC LIMIT 10`, filterParams,
  );

  const byFuelTypeRaw = await db.getAll<{ fuel_type: string; totalLiters: number; totalCost: number; count: number }>(
    `SELECT r.fuel_type as fuel_type, COALESCE(SUM(r.liters),0) as totalLiters,
            COALESCE(SUM(r.total_cost),0) as totalCost, COUNT(*) as count
     ${REFUELING_FROM_JOIN} WHERE ${where}
     GROUP BY r.fuel_type ORDER BY totalLiters DESC`, filterParams,
  );

  const byMonthRaw = await db.getAll<{ month: string; totalLiters: number; totalCost: number; count: number }>(
    `SELECT strftime('%Y-%m', r.refueling_date) as month, COALESCE(SUM(r.liters),0) as totalLiters,
            COALESCE(SUM(r.total_cost),0) as totalCost, COUNT(*) as count
     ${REFUELING_FROM_JOIN} WHERE ${where}
     GROUP BY month ORDER BY month LIMIT 12`, filterParams,
  );

  const tc = totals.totalCount;
  const tl = totals.totalLiters;

  return {
    totalCount: tc, totalLiters: tl, totalCost: totals.totalCost, avgPricePerLiter: totals.avgPrice,
    avgLitersPerRefueling: tc > 0 ? tl / tc : 0,
    topVehicles: topVehiclesRaw.map(r => ({
      vehicle_id: r.vehicle_id, vehicle_license: r.vehicle_license ?? '—', totalLiters: r.totalLiters, totalCost: r.totalCost,
    })),
    topStations: stationTotalsRaw.map(r => ({
      station_id: r.station_id, station_name: r.station_name ?? '—', totalLiters: r.totalLiters, totalCost: r.totalCost,
    })),
    byFuelType: byFuelTypeRaw.map(r => ({ fuel_type: r.fuel_type, totalLiters: r.totalLiters, totalCost: r.totalCost, count: r.count })),
    byMonth: byMonthRaw.map(r => ({ month: r.month, totalLiters: r.totalLiters, totalCost: r.totalCost, count: r.count })),
  };
}

export async function updateRefueling(id: string, data: IUpdateRefueling): Promise<IRefueling | null> {
  const db = await getPowerSyncDb();

  const existing = await getRefuelingById(id);
  if (!existing) return null;

  const newLiters = data.liters ?? existing.liters;
  const newPrice  = data.price_per_liter ?? existing.price_per_liter;
  const newTotal  = Math.round(newLiters * newPrice * 100) / 100;

  const updateData: Record<string, unknown> = {};
  if (data.driver_id !== undefined) updateData.driver_id = data.driver_id || null;
  if (data.trip_id !== undefined) updateData.trip_id = data.trip_id || null;
  if (data.station_id !== undefined) updateData.station_id = data.station_id || null;
  if (data.fuel_type !== undefined) updateData.fuel_type = data.fuel_type;
  if (data.liters !== undefined) updateData.liters = data.liters;
  if (data.price_per_liter !== undefined) updateData.price_per_liter = data.price_per_liter;
  if (data.current_mileage !== undefined) updateData.mileage = data.current_mileage;
  if (data.is_full_tank !== undefined) updateData.is_full_tank = data.is_full_tank ? 1 : 0;
  if (data.invoice_number !== undefined) updateData.invoice_number = data.invoice_number ?? null;
  if (data.notes !== undefined) updateData.notes = data.notes ?? null;
  if (data.refueling_date !== undefined) updateData.refueling_date = data.refueling_date;
  updateData.total_cost = newTotal;

  const fields = Object.keys(updateData);
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  await db.execute(
    `UPDATE fuel SET ${setClause}, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    [...fields.map(f => updateData[f]), new Date().toISOString(), id],
  );

  return getRefuelingById(id);
}

export async function softDeleteRefueling(id: string): Promise<boolean> {
  const db = await getPowerSyncDb();
  const existing = await db.getOptional<{ id: string }>(`SELECT id FROM fuel WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
  if (!existing) return false;

  const now = new Date().toISOString();
  await db.execute(`UPDATE fuel SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  return true;
}
