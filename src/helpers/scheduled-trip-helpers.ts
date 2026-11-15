// ========================================
// FILE: src/helpers/scheduled-trip-helpers.ts
// ========================================
import {
  IScheduledTrip,
  ICreateScheduledTrip,
  IUpdateScheduledTrip,
  ICancelScheduledTrip,
  IScheduledTripsPaginationParams,
} from '@/lib/types/scheduled-trip';
import { IPaginatedResult } from '@/lib/types/pagination';
import { assertPermission } from './permission-guard';

export async function getAllScheduledTrips(
  params?: IScheduledTripsPaginationParams
): Promise<IPaginatedResult<IScheduledTrip>> {
  return window._scheduled_trips.getAll(params);
}

export async function getScheduledTripById(id: string): Promise<IScheduledTrip | null> {
  return window._scheduled_trips.getById(id);
}

export async function getScheduledTripsByDriver(driverId: string): Promise<IScheduledTrip[]> {
  return window._scheduled_trips.getByDriver(driverId);
}

export async function createScheduledTrip(data: ICreateScheduledTrip): Promise<IScheduledTrip> {
  assertPermission('scheduled_trip:create');
  const result = await window._scheduled_trips.create(data);
  return result;
}

export async function updateScheduledTrip(
  id:   string,
  data: IUpdateScheduledTrip
): Promise<IScheduledTrip | null> {
  assertPermission('scheduled_trip:update');
  const result = await window._scheduled_trips.update(id, data);
  return result;
}

export async function cancelScheduledTrip(
  id:   string,
  data?: ICancelScheduledTrip
): Promise<IScheduledTrip | null> {
  assertPermission('scheduled_trip:update');
  const result = await window._scheduled_trips.cancel(id, data);
  return result;
}

export async function forceScheduledTripCycle(): Promise<void> {
  return window._scheduled_trips.runScheduler();
}
