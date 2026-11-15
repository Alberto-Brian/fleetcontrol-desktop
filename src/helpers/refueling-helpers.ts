// ========================================
// FILE: src/helpers/refueling-helpers.ts
// ========================================
import {
  IRefueling,
  ICreateRefueling,
  IUpdateRefueling,
  IRefuelingsPaginationParams,
  IRefuelingStats,
} from '@/lib/types/refueling';
import { IPaginatedResult } from '@/lib/types/pagination';
import { assertPermission } from './permission-guard';
// ── READ ──────────────────────────────────────────────────────────────────────

export async function getAllRefuelings(
  params?: IRefuelingsPaginationParams
): Promise<IPaginatedResult<IRefueling>> {
  return window._refuelings.getAll(params);
}

export async function getRefuelingById(id: string): Promise<IRefueling | null> {
  return window._refuelings.getById(id);
}

export async function getRefuelingsByVehicle(vehicleId: string): Promise<IRefueling[]> {
  return window._refuelings.getByVehicle(vehicleId);
}

export async function getRefuelingsByDriver(driverId: string): Promise<IRefueling[]> {
  return window._refuelings.getByDriver(driverId);
}

export async function getRefuelingsByTrip(tripId: string): Promise<IRefueling[]> {
  return window._refuelings.getByTrip(tripId);
}

export async function getRefuelingsByStation(stationId: string): Promise<IRefueling[]> {
  return window._refuelings.getByStation(stationId);
}

export async function getRefuelingStats(params?: {
  from_date?: string;
  to_date?: string;
  vehicle_id?: string;
}): Promise<IRefuelingStats> {
  return window._refuelings.getStats(params);
}

// ── WRITE ─────────────────────────────────────────────────────────────────────

export async function createRefueling(data: ICreateRefueling): Promise<IRefueling> {
  assertPermission('fuel:create');
  const result = await window._refuelings.create(data);
  return result;
}

export async function updateRefueling(
  id: string,
  data: IUpdateRefueling
): Promise<IRefueling | null> {
  assertPermission('fuel:update');
  const result = await window._refuelings.update(id, data);
  return result;
}

export async function deleteRefueling(id: string): Promise<boolean> {
  assertPermission('fuel:delete');
  const result = await window._refuelings.remove(id);
  return result;
}
