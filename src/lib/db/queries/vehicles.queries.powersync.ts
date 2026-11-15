// ========================================
// FILE: src/lib/db/queries/vehicles.queries.powersync.ts
// ========================================
//
// Fase 6 (migração Standalone -> Connected-first), Prompt 6.3 — segundo
// domínio cortado para PowerSync-first. Espelha 1:1 as assinaturas de
// `vehicles.queries.ts` usadas por `vehicles-listeners.ts` (mesmos nomes,
// parâmetros, forma de retorno). `vehicles.queries.ts` (Drizzle/app.db)
// fica intocado, só como referência/backup.
//
// Duas diferenças deliberadas face ao Drizzle original, ambas consequência
// directa do modelo PowerSync (não bugs, não esquecimentos — documentadas
// aqui para quem ler a seguir):
//
// 1. `api_vehicle_id`/`api_synced_at`/`sync_status` (filtro) ficaram
//    OBSOLETOS e foram removidos da lógica — confirmado por grep que a UI
//    nunca os lia (só existiam dentro do próprio módulo IPC de vehicles).
//    Faziam sentido no modelo antigo (local optimistic write -> REST
//    síncrono -> guardar o id devolvido); com PowerSync o id local JÁ é o
//    id final, não há um segundo id a reconciliar. `IVehicle.api_vehicle_id`/
//    `api_synced_at` continuam no tipo (não tocado, para não obrigar a
//    mexer noutros ficheiros) mas voltam sempre `null` — nunca lidos por
//    ninguém.
// 2. Ligação de GPS (traccar_unique_id/traccar_device_id) NUNCA é escrita
//    directamente numa linha de `vehicles` por aqui — só via o endpoint
//    dedicado `/api/vehicles/:id/register-gps` (RegisterGpsUseCase, API),
//    que valida o IMEI contra `traccar_devices` e liga o `traccar_device_id`
//    correctamente. Um INSERT/UPDATE PowerSync directo nunca passa por essa
//    validação (o upload vai direito ao repositório, sem o UseCase) —
//    gravar aqui um `traccar_unique_id` sem o `traccar_device_id`
//    correspondente deixaria a linha inconsistente no servidor. Ver
//    `registerGpsOnVehicleEvent`/`waitForVehicleOnBackend` em
//    vehicles-listeners.ts para o fluxo real.
//
// Seam do Prompt 6.3 (nome/cor da categoria vinham de app.db, combinados em
// memória) fechado neste corte: categories já vive em powersync.db desde o
// Prompt 6.4 (Categories), por isso passa a ser um LEFT JOIN SQL normal —
// mesmo padrão já usado para routes/workshops em trips/maintenance (6.9).
import { getPowerSyncDb } from '@/lib/powersync/client';
import { getSessionOrganizationId } from '@/helpers/ipc/services/auth/token-store';
import { generateUuid } from '@/lib/utils/cripto';
import { ICreateVehicle, IUpdateVehicle, IVehicle, IUpdateStatus } from '@/lib/types/vehicle';
import { IPaginatedResult, IPaginationParams } from '@/lib/types/pagination';
import { vehicleStatus } from '@/lib/db/schemas/vehicles';
import { vehicleHasActiveTrip, vehicleHasActiveMaintenance } from './vehicle-state.powersync';

interface VehicleRow {
  id: string; category_id: string; license_plate: string; brand: string; model: string;
  year: number; color: string | null; chassis_number: string | null; engine_number: string | null;
  fuel_tank_capacity: number | null; tire_size: string | null; current_mileage: number;
  acquisition_date: string | null; acquisition_value: number | null; status: string;
  photo: string | null; notes: string | null; is_active: number; tracking_enabled: number;
  traccar_unique_id: string | null; created_at: string; updated_at: string; deleted_at: string | null;
  category_name: string | null; category_color: string | null;
}

// Colunas prefixadas por alias — `categories` partilha nomes de coluna com
// `vehicles` (deleted_at, is_active, created_at, updated_at, color, etc.),
// por isso todas as referências no WHERE/ORDER BY também têm de ser
// qualificadas com `v.` sempre que este JOIN estiver presente na query.
const VEHICLE_SELECT = `v.id, v.category_id, v.license_plate, v.brand, v.model, v.year, v.color, v.chassis_number,
  v.engine_number, v.fuel_tank_capacity, v.tire_size, v.current_mileage, v.acquisition_date, v.acquisition_value,
  v.status, v.photo, v.notes, v.is_active, v.tracking_enabled, v.traccar_unique_id, v.created_at, v.updated_at, v.deleted_at,
  c.name as category_name, c.color as category_color`;
const VEHICLE_FROM_JOIN = `FROM vehicles v LEFT JOIN categories c ON c.id = v.category_id`;

function mapRow(row: VehicleRow): IVehicle {
  return {
    id: row.id, category_id: row.category_id,
    category_name: row.category_name ?? undefined, category_color: row.category_color ?? undefined,
    license_plate: row.license_plate, brand: row.brand, model: row.model, year: row.year,
    color: row.color, chassis_number: row.chassis_number, engine_number: row.engine_number,
    fuel_tank_capacity: row.fuel_tank_capacity, tire_size: row.tire_size,
    current_mileage: row.current_mileage, acquisition_date: row.acquisition_date,
    acquisition_value: row.acquisition_value, status: row.status as IVehicle['status'],
    photo: row.photo, notes: row.notes, is_active: !!row.is_active,
    tracking_enabled: !!row.tracking_enabled, traccar_unique_id: row.traccar_unique_id,
    // Obsoletos no modelo PowerSync — ver comentário no topo do ficheiro.
    api_vehicle_id: null, api_synced_at: null,
    created_at: row.created_at, updated_at: row.updated_at, deleted_at: row.deleted_at,
  };
}

/**
 * Criar novo veículo
 */
export async function createVehicle(vehicleData: ICreateVehicle): Promise<IVehicle> {
  const db = await getPowerSyncDb();
  const id = generateUuid();
  const organizationId = getSessionOrganizationId();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO vehicles (
      id, organization_id, category_id, license_plate, brand, model, year, color, chassis_number,
      engine_number, fuel_tank_capacity, tire_size, current_mileage, acquisition_date,
      acquisition_value, status, photo, notes, traccar_unique_id, is_active, tracking_enabled,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, organizationId, vehicleData.category_id, vehicleData.license_plate, vehicleData.brand,
      vehicleData.model, vehicleData.year, vehicleData.color ?? null, vehicleData.chassis_number ?? null,
      vehicleData.engine_number ?? null, vehicleData.fuel_tank_capacity ?? null, vehicleData.tire_size ?? null,
      vehicleData.current_mileage || 0, vehicleData.acquisition_date ?? null, vehicleData.acquisition_value ?? null,
      vehicleStatus.AVAILABLE, vehicleData.photo ?? null, vehicleData.notes ?? null,
      // GPS nunca é gravado aqui — ver nota (2) no topo do ficheiro.
      null, 1, 1, now, now,
    ],
  );

  return (await findVehicleById(id)) as IVehicle;
}

export async function findVehicleByLicensePlate(license_plate: string) {
  const db = await getPowerSyncDb();
  return db.getOptional<{
    id: string; category_id: string; license_plate: string; brand: string; model: string;
    year: number; color: string | null; current_mileage: number; status: string; photo: string | null;
  }>(
    `SELECT id, category_id, license_plate, brand, model, year, color, current_mileage, status, photo
     FROM vehicles WHERE license_plate = ? LIMIT 1`,
    [license_plate],
  );
}

/**
 * Buscar todos os veículos com paginação e filtros
 */
export async function getAllVehicles(params: IPaginationParams = {}): Promise<IPaginatedResult<IVehicle>> {
  const db = await getPowerSyncDb();

  const page   = params.page  || 1;
  const limit  = params.limit || 60;
  const offset = (page - 1) * limit;

  const filters: string[] = ['v.deleted_at IS NULL'];
  const filterParams: unknown[] = [];

  if (params.search?.trim()) {
    const s = `%${params.search.toLowerCase()}%`;
    filters.push('(LOWER(v.license_plate) LIKE ? OR LOWER(v.brand) LIKE ? OR LOWER(v.model) LIKE ? OR LOWER(v.traccar_unique_id) LIKE ?)');
    filterParams.push(s, s, s, s);
  }
  if (params.status && params.status !== 'all') {
    filters.push('v.status = ?');
    filterParams.push(params.status);
  }
  if (params.category_id && params.category_id !== 'all') {
    filters.push('v.category_id = ?');
    filterParams.push(params.category_id);
  }
  if (params.imei_status === 'with_imei') {
    filters.push(`(v.traccar_unique_id IS NOT NULL AND v.traccar_unique_id != '')`);
  } else if (params.imei_status === 'without_imei') {
    filters.push(`(v.traccar_unique_id IS NULL OR v.traccar_unique_id = '')`);
  }
  // sync_status: sem equivalente no modelo PowerSync (ver nota 1 no topo) — ignorado deliberadamente.

  const where = filters.join(' AND ');

  const totalRow = await db.get<{ total: number }>(`SELECT COUNT(*) as total FROM vehicles v WHERE ${where}`, filterParams);
  const total = totalRow.total;

  const rows = await db.getAll<VehicleRow>(
    `SELECT ${VEHICLE_SELECT} ${VEHICLE_FROM_JOIN} WHERE ${where} ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
    [...filterParams, limit, offset],
  );

  const data = rows.map(mapRow);

  // Counts por status — sem filtros de status/categoria (totais reais), só o de pesquisa.
  const baseFilters: string[] = ['v.deleted_at IS NULL'];
  const baseParams: unknown[] = [];
  if (params.search?.trim()) {
    const s = `%${params.search.toLowerCase()}%`;
    baseFilters.push('(LOWER(v.license_plate) LIKE ? OR LOWER(v.brand) LIKE ? OR LOWER(v.model) LIKE ? OR LOWER(v.traccar_unique_id) LIKE ?)');
    baseParams.push(s, s, s, s);
  }
  const baseWhere = baseFilters.join(' AND ');

  const countsRaw = await db.getAll<{ status: string; count: number }>(
    `SELECT v.status as status, COUNT(*) as count FROM vehicles v WHERE ${baseWhere} GROUP BY v.status`, baseParams,
  );
  const statusCounts: Record<string, number> = { available: 0, in_use: 0, maintenance: 0, inactive: 0 };
  for (const row of countsRaw) statusCounts[row.status] = row.count;

  return {
    data,
    pagination: {
      total, page, limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
    statusCounts,
  };
}

/**
 * Buscar veículo por ID
 */
export async function findVehicleById(vehicleId: string): Promise<IVehicle | null> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<VehicleRow>(
    `SELECT ${VEHICLE_SELECT} ${VEHICLE_FROM_JOIN} WHERE v.id = ? AND v.deleted_at IS NULL AND v.is_active = 1 LIMIT 1`,
    [vehicleId],
  );
  return row ? mapRow(row) : null;
}

/**
 * Actualizar veículo
 */
export async function updateVehicle(vehicleId: string, vehicleData: IUpdateVehicle): Promise<IVehicle | null> {
  const db = await getPowerSyncDb();

  // traccar_unique_id nunca é escrito por aqui — ver nota (2) no topo do
  // ficheiro. Se algum chamador o incluir, é ignorado silenciosamente
  // (mesmo princípio de "não duplicar o caminho de ligação GPS").
  const { traccar_unique_id: _ignored, ...rest } = vehicleData;
  const updateData: Record<string, unknown> = { ...rest };

  const fields = Object.keys(updateData).filter(f => updateData[f] !== undefined);
  if (fields.length > 0) {
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    await db.execute(
      `UPDATE vehicles SET ${setClause}, updated_at = ? WHERE id = ?`,
      [...fields.map(f => updateData[f]), new Date().toISOString(), vehicleId],
    );
  }

  return findVehicleById(vehicleId);
}

/**
 * Deletar veículo (soft delete)
 */
export async function deleteVehicle(vehicleId: string): Promise<string> {
  const db = await getPowerSyncDb();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE vehicles SET deleted_at = ?, updated_at = ?, status = ?, is_active = 0 WHERE id = ?`,
    [now, now, vehicleStatus.INACTIVE, vehicleId],
  );
  return vehicleId;
}

/**
 * Buscar veículos disponíveis
 */
export async function getAvailableVehicles() {
  const db = await getPowerSyncDb();
  return db.getAll<{
    id: string; license_plate: string; brand: string; current_mileage: number; model: string;
    year: number; category_id: string; category_name: string | null;
  }>(
    `SELECT v.id, v.license_plate, v.brand, v.current_mileage, v.model, v.year, v.category_id, c.name as category_name
     FROM vehicles v LEFT JOIN categories c ON c.id = v.category_id
     WHERE v.status = ? AND v.deleted_at IS NULL`,
    [vehicleStatus.AVAILABLE],
  );
}

/**
 * Actualizar status do veículo
 */
export async function updateVehicleStatus(vehicleId: string, data: IUpdateStatus) {
  const db = await getPowerSyncDb();
  await db.writeTransaction(async (tx) => {
    // 2026-11-15 — a mudança manual não pode contradizer uma viagem ou uma
    // manutenção em curso (era assim que um veículo ficava "disponível" com
    // a viagem aberta). "Em uso" só nasce de uma viagem; o fim da viagem ou
    // da manutenção é que liberta o veículo.
    if (data.status === vehicleStatus.IN_USE) throw new Error('vehicles:errors.inUseOnlyByTrip');
    if (await vehicleHasActiveTrip(tx, vehicleId)) throw new Error('vehicles:errors.statusLockedByTrip');
    if (data.status !== vehicleStatus.MAINTENANCE && await vehicleHasActiveMaintenance(tx, vehicleId)) {
      throw new Error('vehicles:errors.statusLockedByMaintenance');
    }
    await tx.execute(
      `UPDATE vehicles SET status = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [data.status, data.notes ?? null, new Date().toISOString(), vehicleId],
    );
  });
  return findVehicleById(vehicleId);
}

/**
 * Atualizar quilometragem
 */
export async function updateVehicleMileage(vehicleId: string, newMileage: number) {
  const db = await getPowerSyncDb();
  await db.execute(
    `UPDATE vehicles SET current_mileage = ?, updated_at = ? WHERE id = ?`,
    [newMileage, new Date().toISOString(), vehicleId],
  );
  return findVehicleById(vehicleId);
}

/**
 * Buscar veículos por categoria
 */
export async function getVehiclesByCategory(categoryId: string) {
  const db = await getPowerSyncDb();
  return db.getAll<{ id: string; license_plate: string; brand: string; model: string; year: number; status: string }>(
    `SELECT id, license_plate, brand, model, year, status
     FROM vehicles WHERE category_id = ? AND deleted_at IS NULL AND is_active = 1`,
    [categoryId],
  );
}

/**
 * Contar veículos por status
 */
export async function countVehiclesByStatus() {
  const db = await getPowerSyncDb();
  return db.getAll<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM vehicles WHERE deleted_at IS NULL AND is_active = 1 GROUP BY status`,
  );
}

/**
 * IMEIs de veículos com rastreamento activo (usado pelo módulo de tracking
 * para saber que dispositivos observar).
 */
export async function getActiveImeis(): Promise<string[]> {
  const db = await getPowerSyncDb();
  const rows = await db.getAll<{ traccar_unique_id: string }>(
    `SELECT traccar_unique_id FROM vehicles
     WHERE traccar_unique_id IS NOT NULL AND tracking_enabled = 1 AND deleted_at IS NULL`,
  );
  return rows.map(r => r.traccar_unique_id);
}

/**
 * Grava localmente o resultado de ligar/desligar o GPS Traccar — chamado
 * DEPOIS do endpoint REST dedicado (register-gps/unregister-gps/tracking)
 * já ter validado/persistido no servidor. Nunca a única escrita: ver nota
 * (2) no topo do ficheiro.
 */
export async function setLocalGpsFields(
  vehicleId: string,
  fields: { traccar_unique_id?: string | null; tracking_enabled?: boolean },
): Promise<void> {
  const db = await getPowerSyncDb();
  const updateData: Record<string, unknown> = {};
  if ('traccar_unique_id' in fields) updateData.traccar_unique_id = fields.traccar_unique_id;
  if ('tracking_enabled' in fields) updateData.tracking_enabled = fields.tracking_enabled ? 1 : 0;

  const cols = Object.keys(updateData);
  if (cols.length === 0) return;
  const setClause = cols.map(c => `${c} = ?`).join(', ');
  await db.execute(
    `UPDATE vehicles SET ${setClause}, updated_at = ? WHERE id = ?`,
    [...cols.map(c => updateData[c]), new Date().toISOString(), vehicleId],
  );
}
