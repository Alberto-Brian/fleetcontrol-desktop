// ========================================
// FILE: src/lib/db/queries/vehicle-state.powersync.ts
// ========================================
//
// 2026-11-15 — regras únicas de quando o estado de um veículo/motorista pode
// mudar, partilhadas por viagens, manutenções e mudança manual de estado.
//
// Antes, cada acção escrevia o estado à cega: terminar uma manutenção punha o
// veículo "disponível" mesmo com uma viagem em curso, cancelar uma de duas
// viagens libertava o veículo da outra, apagar uma manutenção em curso deixava
// o veículo preso em "manutenção". A regra agora é derivar o estado do que
// ainda está activo:
//   - veículo com viagem em curso          → "em uso"
//   - senão, com manutenção em curso        → "manutenção"
//   - senão                                 → "disponível"
// "inactivo" é uma decisão manual e nunca é sobrescrita por estas funções.
//
// Todas recebem a transacção (`tx`) da escrita que as chama, para a mudança de
// estado sair no MESMO lote de upload que a viagem/manutenção (o servidor
// recusa o lote inteiro se houver conflito — ver sync-conflict-detection na API).

import { tripStatus } from '@/lib/db/schemas/trips';
import { vehicleStatus } from '@/lib/db/schemas/vehicles';
import { driverAvailability } from '@/lib/db/schemas/drivers';
import { maintenanceStatus } from '@/lib/db/schemas/maintenances';

export interface StateTx {
  getOptional<T>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export async function vehicleHasActiveTrip(tx: StateTx, vehicleId: string, excludeTripId?: string): Promise<boolean> {
  const row = await tx.getOptional<{ id: string }>(
    `SELECT id FROM trips WHERE vehicle_id = ? AND status = ? AND deleted_at IS NULL AND id <> ? LIMIT 1`,
    [vehicleId, tripStatus.IN_PROGRESS, excludeTripId ?? ''],
  );
  return row != null;
}

export async function driverHasActiveTrip(tx: StateTx, driverId: string, excludeTripId?: string): Promise<boolean> {
  const row = await tx.getOptional<{ id: string }>(
    `SELECT id FROM trips WHERE driver_id = ? AND status = ? AND deleted_at IS NULL AND id <> ? LIMIT 1`,
    [driverId, tripStatus.IN_PROGRESS, excludeTripId ?? ''],
  );
  return row != null;
}

export async function vehicleHasActiveMaintenance(tx: StateTx, vehicleId: string, excludeMaintenanceId?: string): Promise<boolean> {
  const row = await tx.getOptional<{ id: string }>(
    `SELECT id FROM maintenance WHERE vehicle_id = ? AND status = ? AND deleted_at IS NULL AND id <> ? LIMIT 1`,
    [vehicleId, maintenanceStatus.IN_PROGRESS, excludeMaintenanceId ?? ''],
  );
  return row != null;
}

async function currentVehicleStatus(tx: StateTx, vehicleId: string): Promise<string | null> {
  const row = await tx.getOptional<{ status: string }>(`SELECT status FROM vehicles WHERE id = ? LIMIT 1`, [vehicleId]);
  return row?.status ?? null;
}

/**
 * Depois de uma viagem deixar de estar em curso (terminada, cancelada ou
 * apagada): liberta o veículo e o motorista só se não tiverem outra viagem em
 * curso. Um veículo que entretanto entrou em manutenção fica em "manutenção".
 */
export async function settleAfterTrip(
  tx: StateTx,
  args: { tripId: string; vehicleId: string; driverId: string; now: string; endMileage?: number },
): Promise<void> {
  const { tripId, vehicleId, driverId, now, endMileage } = args;

  if (endMileage !== undefined) {
    await tx.execute(`UPDATE vehicles SET current_mileage = ?, updated_at = ? WHERE id = ?`, [endMileage, now, vehicleId]);
  }

  const status = await currentVehicleStatus(tx, vehicleId);
  if (status === vehicleStatus.IN_USE && !(await vehicleHasActiveTrip(tx, vehicleId, tripId))) {
    const next = (await vehicleHasActiveMaintenance(tx, vehicleId)) ? vehicleStatus.MAINTENANCE : vehicleStatus.AVAILABLE;
    await tx.execute(`UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?`, [next, now, vehicleId]);
  }

  const driver = await tx.getOptional<{ availability: string }>(`SELECT availability FROM drivers WHERE id = ? LIMIT 1`, [driverId]);
  if (driver?.availability === driverAvailability.ON_TRIP && !(await driverHasActiveTrip(tx, driverId, tripId))) {
    await tx.execute(`UPDATE drivers SET availability = ?, updated_at = ? WHERE id = ?`, [driverAvailability.AVAILABLE, now, driverId]);
  }
}

/**
 * Depois de uma manutenção deixar de estar em curso (concluída, cancelada,
 * apagada ou mudada para agendada): o veículo só sai de "manutenção" se não
 * houver outra manutenção em curso, e volta a "em uso" se tiver uma viagem.
 */
export async function settleAfterMaintenance(
  tx: StateTx,
  args: { maintenanceId: string; vehicleId: string; now: string },
): Promise<void> {
  const { maintenanceId, vehicleId, now } = args;
  const status = await currentVehicleStatus(tx, vehicleId);
  if (status !== vehicleStatus.MAINTENANCE) return;
  if (await vehicleHasActiveMaintenance(tx, vehicleId, maintenanceId)) return;
  const next = (await vehicleHasActiveTrip(tx, vehicleId)) ? vehicleStatus.IN_USE : vehicleStatus.AVAILABLE;
  await tx.execute(`UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?`, [next, now, vehicleId]);
}

/**
 * Pôr uma manutenção em curso: o veículo não pode estar numa viagem.
 */
export async function startMaintenanceOnVehicle(tx: StateTx, vehicleId: string, now: string): Promise<void> {
  if (await vehicleHasActiveTrip(tx, vehicleId)) throw new Error('maintenances:errors.vehicleOnTrip');
  const status = await currentVehicleStatus(tx, vehicleId);
  if (status === vehicleStatus.INACTIVE) return;
  await tx.execute(`UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?`, [vehicleStatus.MAINTENANCE, now, vehicleId]);
}
