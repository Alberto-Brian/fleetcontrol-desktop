// ========================================
// FILE: src/lib/db/queries/maintenances.queries.powersync.ts
// ========================================
//
// Fase 6 (migração Standalone -> Connected-first), Prompt 6.7 — Maintenance
// cortado para PowerSync. `maintenances.queries.ts` (Drizzle/app.db) não
// tocado, fica como backup/referência. Tabela PowerSync chama-se
// `maintenance` (singular, nome do schema da API), não `maintenances`
// como a tabela local — confirmado contra schema.ts antes de escrever
// (mesmo erro já cometido e corrigido no Prompt 6.6, desta vez evitado).
//
// vehicle (6.3), maintenance_categories (6.4) e agora workshops (6.9)
// vivem TODOS em powersync.db — JOINs normais, nenhum seam resta neste
// ficheiro (enrichWithWorkshop, que fazia o merge cruzado com app.db, foi
// removido).
import { getPowerSyncDb } from '@/lib/powersync/client';
import { getSessionOrganizationId } from '@/helpers/ipc/services/auth/token-store';
import { generateUuid } from '@/lib/utils/cripto';
import { ICreateMaintenance, IUpdateMaintenance, IMaintenance } from '@/lib/types/maintenance';
import { IPaginatedResult, IPaginationParams } from '@/lib/types/pagination';
import { maintenanceStatus } from '@/lib/db/schemas/maintenances';
import { startMaintenanceOnVehicle, settleAfterMaintenance } from './vehicle-state.powersync';

interface MaintenanceRow {
  id: string; vehicle_id: string; category_id: string; workshop_id: string | null; type: string;
  entry_date: string; exit_date: string | null; mileage: number; next_maintenance_km: number | null;
  description: string; diagnosis: string | null; solution: string | null;
  parts_cost: number; labor_cost: number; total_cost: number; status: string; priority: string;
  work_order_number: string | null; notes: string | null; created_at: string; updated_at: string;
  vehicle_license: string | null; vehicle_brand: string | null; vehicle_model: string | null; vehicle_current_mileage: number | null;
  category_name: string | null; category_type: string | null; category_color: string | null;
  workshop_name: string | null;
}

const MAINT_SELECT = `
  m.id, m.vehicle_id, m.category_id, m.workshop_id, m.type, m.entry_date, m.exit_date,
  m.mileage, m.next_maintenance_km, m.description, m.diagnosis, m.solution,
  m.parts_cost, m.labor_cost, m.total_cost, m.status, m.priority, m.work_order_number, m.notes,
  m.created_at, m.updated_at,
  v.license_plate as vehicle_license, v.brand as vehicle_brand, v.model as vehicle_model, v.current_mileage as vehicle_current_mileage,
  c.name as category_name, c.type as category_type, c.color as category_color,
  w.name as workshop_name
`;
const MAINT_FROM_JOIN = `
  FROM maintenance m
  LEFT JOIN vehicles v ON v.id = m.vehicle_id
  LEFT JOIN maintenance_categories c ON c.id = m.category_id
  LEFT JOIN workshops w ON w.id = m.workshop_id
`;

function mapRow(r: MaintenanceRow): IMaintenance {
  return {
    id: r.id, vehicle_id: r.vehicle_id, category_id: r.category_id, workshop_id: r.workshop_id,
    type: r.type as IMaintenance['type'], entry_date: r.entry_date, exit_date: r.exit_date,
    vehicle_mileage: r.mileage, next_maintenance_km: r.next_maintenance_km, description: r.description,
    diagnosis: r.diagnosis, solution: r.solution, parts_cost: r.parts_cost, labor_cost: r.labor_cost,
    total_cost: r.total_cost, status: r.status as IMaintenance['status'], priority: r.priority as IMaintenance['priority'],
    work_order_number: r.work_order_number, notes: r.notes, created_at: r.created_at, updated_at: r.updated_at,
    vehicle_current_mileage: r.vehicle_current_mileage,
    // Campos extra, mais ricos que IMaintenance declara — mesma situação já
    // documentada em trips/refuelings (renderer já os lê via `as any`).
    ...({
      vehicle_license: r.vehicle_license ?? undefined, vehicle_brand: r.vehicle_brand ?? undefined,
      vehicle_model: r.vehicle_model ?? undefined,
      category_name: r.category_name ?? undefined, category_type: r.category_type ?? undefined,
      category_color: r.category_color ?? undefined,
      workshop_name: r.workshop_name ?? undefined,
    } as Record<string, unknown>),
  } as IMaintenance;
}

export async function getMaintenanceById(maintenanceId: string): Promise<IMaintenance | null> {
  const db = await getPowerSyncDb();
  const row = await db.getOptional<MaintenanceRow>(
    `SELECT ${MAINT_SELECT} ${MAINT_FROM_JOIN} WHERE m.id = ? AND m.deleted_at IS NULL LIMIT 1`,
    [maintenanceId],
  );
  return row ? mapRow(row) : null;
}

export async function createMaintenance(maintenanceData: ICreateMaintenance): Promise<IMaintenance> {
  const db = await getPowerSyncDb();
  const id = generateUuid();
  const organizationId = getSessionOrganizationId();
  const now = new Date().toISOString();

  const partsCost = maintenanceData.parts_cost || 0;
  const laborCost = maintenanceData.labor_cost || 0;
  const totalCost = partsCost + laborCost;
  const status = maintenanceData.status || maintenanceStatus.SCHEDULED;
  const priority = maintenanceData.priority || 'normal';

  await db.writeTransaction(async (tx) => {
    // Antes do INSERT: um veículo em viagem não pode entrar em manutenção
    // (startMaintenanceOnVehicle recusa), e nada fica gravado nesse caso.
    if (status === maintenanceStatus.IN_PROGRESS) {
      await startMaintenanceOnVehicle(tx, maintenanceData.vehicle_id, now);
    }

    await tx.execute(
      `INSERT INTO maintenance (
        id, organization_id, vehicle_id, category_id, workshop_id, type, entry_date, mileage,
        next_maintenance_km, description, parts_cost, labor_cost, total_cost, status, priority,
        work_order_number, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, organizationId, maintenanceData.vehicle_id, maintenanceData.category_id,
        maintenanceData.workshop_id || null, maintenanceData.type, now, maintenanceData.vehicle_mileage,
        maintenanceData.next_maintenance_km || null, maintenanceData.description, partsCost, laborCost,
        totalCost, status, priority, maintenanceData.work_order_number || null, maintenanceData.notes || null,
        now, now,
      ],
    );
  });

  return (await getMaintenanceById(id)) as IMaintenance;
}

export async function getAllMaintenances(params: IPaginationParams = {}): Promise<IPaginatedResult<IMaintenance>> {
  const db = await getPowerSyncDb();

  const page   = params.page  || 1;
  const limit  = params.limit || 20;
  const offset = (page - 1) * limit;

  const filters: string[] = ['m.deleted_at IS NULL'];
  const filterParams: unknown[] = [];

  if (params.search?.trim()) {
    const s = `%${params.search.toLowerCase()}%`;
    filters.push(`(LOWER(v.license_plate) LIKE ? OR LOWER(c.name) LIKE ?)`);
    filterParams.push(s, s);
  }
  if (params.status && params.status !== 'all') { filters.push('m.status = ?'); filterParams.push(params.status); }
  if (params.vehicle_id) { filters.push('m.vehicle_id = ?'); filterParams.push(params.vehicle_id); }
  if (params.type && params.type !== 'all') { filters.push('m.type = ?'); filterParams.push(params.type); }
  if (params.category_id && params.category_id !== 'all') { filters.push('m.category_id = ?'); filterParams.push(params.category_id); }

  const where = filters.join(' AND ');

  const totalRow = await db.get<{ total: number }>(`SELECT COUNT(*) as total ${MAINT_FROM_JOIN} WHERE ${where}`, filterParams);
  const total = totalRow.total;

  const rows = await db.getAll<MaintenanceRow>(
    `SELECT ${MAINT_SELECT} ${MAINT_FROM_JOIN} WHERE ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
    [...filterParams, limit, offset],
  );
  const data = rows.map(mapRow);

  const countsRaw = await db.getAll<{ status: string; count: number }>(
    `SELECT m.status as status, COUNT(*) as count ${MAINT_FROM_JOIN} WHERE ${where} GROUP BY m.status`, filterParams,
  );
  const statusCounts: Record<string, number> = { scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 };
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

export async function updateMaintenance(maintenanceId: string, maintenanceData: IUpdateMaintenance): Promise<IMaintenance | null> {
  const db = await getPowerSyncDb();

  const current = await db.getOptional<{ vehicle_id: string; status: string; parts_cost: number; labor_cost: number }>(
    `SELECT vehicle_id, status, parts_cost, labor_cost FROM maintenance WHERE id = ? LIMIT 1`, [maintenanceId],
  );
  if (!current) throw new Error('maintenances:errors.maintenanceNotFound');

  const updateData: Record<string, unknown> = { ...maintenanceData };
  if (maintenanceData.parts_cost !== undefined || maintenanceData.labor_cost !== undefined) {
    const partsCost = maintenanceData.parts_cost ?? current.parts_cost;
    const laborCost = maintenanceData.labor_cost ?? current.labor_cost;
    updateData.total_cost = partsCost + laborCost;
  }

  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    const fields = Object.keys(updateData).filter(f => updateData[f] !== undefined);
    if (fields.length > 0) {
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      await tx.execute(
        `UPDATE maintenance SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...fields.map(f => updateData[f]), now, maintenanceId],
      );
    }

    const startsNow = maintenanceData.status === maintenanceStatus.IN_PROGRESS && current.status !== maintenanceStatus.IN_PROGRESS;
    const stopsNow  = maintenanceData.status !== undefined
      && maintenanceData.status !== maintenanceStatus.IN_PROGRESS
      && current.status === maintenanceStatus.IN_PROGRESS;
    if (startsNow) await startMaintenanceOnVehicle(tx, current.vehicle_id, now);
    if (stopsNow)  await settleAfterMaintenance(tx, { maintenanceId, vehicleId: current.vehicle_id, now });
  });

  return getMaintenanceById(maintenanceId);
}

export async function completeMaintenance(maintenanceId: string, completeData: IUpdateMaintenance): Promise<IMaintenance | null> {
  const db = await getPowerSyncDb();

  const current = await db.getOptional<{ vehicle_id: string; status: string; parts_cost: number; labor_cost: number }>(
    `SELECT vehicle_id, status, parts_cost, labor_cost FROM maintenance WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [maintenanceId],
  );
  if (!current) throw new Error('maintenances:errors.maintenanceNotFound');
  // Só se conclui o que está agendado ou em curso — concluir duas vezes
  // libertava o veículo de novo, mesmo que já estivesse noutra viagem.
  if (current.status !== maintenanceStatus.IN_PROGRESS && current.status !== maintenanceStatus.SCHEDULED) {
    throw new Error('maintenances:errors.maintenanceNotActive');
  }

  const partsCost = completeData.parts_cost ?? current.parts_cost;
  const laborCost = completeData.labor_cost ?? current.labor_cost;
  const totalCost = partsCost + laborCost;
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = { ...completeData };
  // Aplicados sempre explicitamente abaixo (parts_cost/labor_cost recalculados,
  // exit_date/status fixos ao completar) — nunca deixar entrar na lista de
  // campos dinâmicos, evita SET duplicado da mesma coluna (SQLite rejeita).
  delete updateData.parts_cost;
  delete updateData.labor_cost;
  delete updateData.exit_date;
  delete updateData.status;
  const extraFields = Object.keys(updateData).filter(f => updateData[f] !== undefined);
  const extraSet = extraFields.length ? extraFields.map(f => `${f} = ?`).join(', ') + ', ' : '';

  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE maintenance SET ${extraSet} parts_cost = ?, labor_cost = ?, total_cost = ?, exit_date = ?, status = ?, updated_at = ? WHERE id = ?`,
      [...extraFields.map(f => updateData[f]), partsCost, laborCost, totalCost, now, maintenanceStatus.COMPLETED, now, maintenanceId],
    );
    await settleAfterMaintenance(tx, { maintenanceId, vehicleId: current.vehicle_id, now });
  });

  return getMaintenanceById(maintenanceId);
}

export async function getMaintenancesByWorkshop(workshopId: string) {
  const db = await getPowerSyncDb();
  return db.getAll<{ id: string }>(
    `SELECT id FROM maintenance WHERE workshop_id = ? AND deleted_at IS NULL`, [workshopId],
  );
}

// Fecha o seam deixado em aberto desde o Prompt 6.4 (Maintenance Categories)
// — só corrigível depois de Maintenance também estar em powersync.db (6.7).
export async function getMaintenancesByCategory(categoryId: string) {
  const db = await getPowerSyncDb();
  return db.getAll<{ id: string }>(
    `SELECT id FROM maintenance WHERE category_id = ? AND deleted_at IS NULL`, [categoryId],
  );
}

export async function deleteMaintenance(maintenanceId: string): Promise<string> {
  const db = await getPowerSyncDb();
  const now = new Date().toISOString();
  const current = await db.getOptional<{ vehicle_id: string; status: string }>(
    `SELECT vehicle_id, status FROM maintenance WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [maintenanceId],
  );
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE maintenance SET deleted_at = ?, status = ?, updated_at = ? WHERE id = ?`,
      [now, maintenanceStatus.CANCELLED, now, maintenanceId],
    );
    // Apagar uma manutenção em curso deixava o veículo preso em "manutenção".
    if (current?.status === maintenanceStatus.IN_PROGRESS) {
      await settleAfterMaintenance(tx, { maintenanceId, vehicleId: current.vehicle_id, now });
    }
  });
  return maintenanceId;
}

export async function getActiveMaintenances(): Promise<IMaintenance[]> {
  const db = await getPowerSyncDb();
  const rows = await db.getAll<MaintenanceRow>(
    `SELECT ${MAINT_SELECT} ${MAINT_FROM_JOIN} WHERE m.status = ? AND m.deleted_at IS NULL ORDER BY m.entry_date DESC`,
    [maintenanceStatus.IN_PROGRESS],
  );
  return rows.map(mapRow);
}
