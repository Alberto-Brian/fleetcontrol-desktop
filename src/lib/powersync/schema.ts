// ========================================
// PROJECT: fleetcontrol-desktop
// FILE: src/lib/powersync/schema.ts
// ========================================
//
// Fase 12, Prompt 22.8 — schema local (SQLite, PowerSync-managed) espelhando
// os 7 streams definidos em fleetcontrol-infrastructure/docker/powersync/
// sync-config.yaml (Prompt 22.6), por sua vez espelhando as colunas reais dos
// 7 schemas Drizzle em fleetcontrol-api/src/db/schemas/ (vehicles, drivers,
// trips, fuel, maintenances, expenses, categories) — lidos directamente nesta
// sessão para garantir paridade coluna-a-coluna, não assumidos de memória.
//
// Regras do SDK (ver .claude/skills/powersync/references/sdks/powersync-js.md):
// - Nunca declarar 'id' — o PowerSync cria-o automaticamente como TEXT PRIMARY KEY.
// - Só column.text/column.integer/column.real — sem boolean/date nativos:
//   booleans (is_active, tracking_enabled) ficam 0/1 (column.integer);
//   timestamps (created_at, updated_at, deleted_at, *_date) ficam ISO string
//   (column.text), tal como já é o caso das colunas `text('...')` de data no
//   próprio schema Drizzle do lado do servidor (ex. start_date, entry_date).
//
// Achado durante o primeiro arranque real da app após o Prompt 22.8 (ver
// nota em client.ts) — @powersync/node é um pacote ESM-only ("type":
// "module", exports só com condições import/module-sync, sem require), mas
// o processo principal deste Electron continua a compilar para CJS
// (vite.main.config.ts, formats:['cjs']) e externaliza todas as
// `dependencies` (vite.base.config.ts). Um `import` estático aqui vira um
// `require('@powersync/node')` no bundle final, que rebenta com
// ERR_PACKAGE_PATH_NOT_EXPORTED. `column`/`Schema`/`Table` só podem ser
// obtidos via `import()` dinâmico (suportado nativamente pelo Node/Electron
// mesmo a partir de um módulo CJS) — por isso este ficheiro deixou de
// exportar uma `AppSchema` construída no carregamento do módulo, passa a
// expor `loadAppSchema()`, chamada uma única vez por client.ts.
export async function loadAppSchema() {
  const { column, Schema, Table } = await import('@powersync/node');

  // 2026-11-15 — cada UPDATE local passa a levar o valor ANTERIOR dos campos
  // que mudou (CrudEntry.previousValues). O servidor usa-o como versão de
  // base para detectar conflitos de verdade (ex. dois Desktops a pôr o mesmo
  // veículo em viagens diferentes). Antes, a única "base" disponível era o
  // updated_at do próprio opData — que é a hora da escrita local, nunca a
  // versão que o cliente tinha — e o servidor rejeitava por engano quase
  // todas as mudanças de estado (veículo "disponível" com viagem em curso).
  const table = (
    columns: ConstructorParameters<typeof Table>[0],
    options: Record<string, unknown> = {},
  ) => new Table(columns, { ...options, trackPrevious: { onlyWhenChanged: true } });

  const vehicles = table({
    organization_id:    column.text,
    category_id:         column.text,
    traccar_device_id:   column.text,
    traccar_unique_id:   column.text,
    license_plate:       column.text,
    brand:               column.text,
    model:               column.text,
    year:                column.integer,
    color:               column.text,
    chassis_number:      column.text,
    engine_number:       column.text,
    fuel_tank_capacity:  column.integer,
    tire_size:           column.text,
    current_mileage:     column.integer,
    acquisition_date:    column.text,
    acquisition_value:   column.integer,
    status:              column.text,
    notes:               column.text,
    photo:               column.text,
    is_active:           column.integer,
    tracking_enabled:    column.integer,
    created_at:          column.text,
    created_by:          column.text,
    updated_at:          column.text,
    updated_by:          column.text,
    deleted_at:          column.text,
    deleted_by:          column.text,
  });

  const drivers = table({
    organization_id:     column.text,
    name:                column.text,
    tax_id:              column.text,
    id_number:           column.text,
    birth_date:          column.text,
    phone:               column.text,
    email:               column.text,
    address:             column.text,
    city:                column.text,
    state:               column.text,
    postal_code:         column.text,
    license_number:      column.text,
    license_category:    column.text,
    license_expiry_date: column.text,
    hire_date:           column.text,
    status:              column.text,
    availability:        column.text,
    photo:               column.text,
    notes:               column.text,
    is_active:           column.integer,
    created_at:          column.text,
    created_by:          column.text,
    updated_at:          column.text,
    updated_by:          column.text,
    deleted_at:          column.text,
    deleted_by:          column.text,
  });

  const trips = table(
    {
      organization_id: column.text,
      vehicle_id:      column.text,
      driver_id:       column.text,
      // Fase 4 (migração Standalone -> Connected-first)
      route_id:        column.text,
      trip_code:       column.text,
      origin:          column.text,
      destination:     column.text,
      start_date:      column.text,
      end_date:        column.text,
      start_mileage:   column.integer,
      end_mileage:     column.integer,
      purpose:         column.text,
      status:          column.text,
      notes:           column.text,
      created_at:      column.text,
      created_by:      column.text,
      updated_at:      column.text,
      updated_by:      column.text,
      deleted_at:      column.text,
      deleted_by:      column.text,
    },
    { indexes: { vehicle: ['vehicle_id'] } },
  );

  const fuel = table(
    {
      organization_id: column.text,
      vehicle_id:      column.text,
      // Fase 4 (migração Standalone -> Connected-first)
      driver_id:       column.text,
      trip_id:         column.text,
      station_id:      column.text,
      fuel_type:       column.text,
      is_full_tank:    column.integer,
      invoice_number:  column.text,
      refueling_date:  column.text,
      liters:          column.real,
      price_per_liter: column.real,
      total_cost:      column.real,
      mileage:         column.integer,
      station:         column.text,
      receipt_photo:   column.text,
      notes:           column.text,
      created_at:      column.text,
      created_by:      column.text,
      updated_at:      column.text,
      updated_by:      column.text,
      deleted_at:      column.text,
      deleted_by:      column.text,
    },
    { indexes: { vehicle: ['vehicle_id'] } },
  );

  const maintenance = table(
    {
      organization_id: column.text,
      vehicle_id:      column.text,
      // Fase 4 (migração Standalone -> Connected-first)
      category_id:         column.text,
      workshop_id:          column.text,
      diagnosis:            column.text,
      solution:             column.text,
      priority:             column.text,
      next_maintenance_km:  column.integer,
      work_order_number:    column.text,
      entry_date:      column.text,
      exit_date:       column.text,
      type:            column.text,
      description:     column.text,
      workshop:        column.text,
      labor_cost:      column.real,
      parts_cost:      column.real,
      total_cost:      column.real,
      mileage:         column.integer,
      status:          column.text,
      notes:           column.text,
      created_at:      column.text,
      created_by:      column.text,
      updated_at:      column.text,
      updated_by:      column.text,
      deleted_at:      column.text,
      deleted_by:      column.text,
    },
    { indexes: { vehicle: ['vehicle_id'] } },
  );

  const expenses = table(
    {
      organization_id: column.text,
      vehicle_id:      column.text,
      category_id:     column.text,
      // Fase 4 (migração Standalone -> Connected-first)
      driver_id:        column.text,
      trip_id:          column.text,
      payment_method:   column.text,
      due_date:         column.text,
      payment_date:     column.text,
      document_number:  column.text,
      supplier:         column.text,
      expense_date:    column.text,
      description:     column.text,
      amount:          column.real,
      receipt:         column.text,
      status:          column.text,
      notes:           column.text,
      created_at:      column.text,
      created_by:      column.text,
      updated_at:      column.text,
      updated_by:      column.text,
      deleted_at:      column.text,
      deleted_by:      column.text,
    },
    { indexes: { vehicle: ['vehicle_id'] } },
  );

  // ── Fase 4 (migração Standalone -> Connected-first) — 8 domínios geridos
  //    inteiramente pelo Desktop, subindo via PowerSync. route/workshop/
  //    fuel_station/maintenance_category são org-only (mesmo grupo de
  //    categories); fine/vehicle_document/scheduled_trip/maintenance_item
  //    têm vehicle_id (directo ou, no caso de maintenance_item, via
  //    maintenance_id — indexado localmente na mesma). ───────────────────
  const routes = table({
    organization_id:          column.text,
    name:                     column.text,
    origin:                   column.text,
    destination:              column.text,
    distance_km:              column.integer,
    estimated_duration_hours: column.integer,
    route_type:               column.text,
    description:              column.text,
    waypoints:                column.text,
    is_active:                column.integer,
    created_at:               column.text,
    created_by:               column.text,
    updated_at:               column.text,
    updated_by:               column.text,
    deleted_at:               column.text,
    deleted_by:               column.text,
  });

  const workshops = table({
    organization_id: column.text,
    name:            column.text,
    phone:           column.text,
    email:           column.text,
    address:         column.text,
    city:            column.text,
    state:           column.text,
    specialties:     column.text,
    notes:           column.text,
    is_active:       column.integer,
    created_at:      column.text,
    created_by:      column.text,
    updated_at:      column.text,
    updated_by:      column.text,
    deleted_at:      column.text,
    deleted_by:      column.text,
  });

  const fuel_stations = table({
    organization_id:        column.text,
    name:                   column.text,
    brand:                  column.text,
    phone:                  column.text,
    address:                column.text,
    city:                   column.text,
    fuel_types:             column.text,
    has_convenience_store:  column.integer,
    has_car_wash:           column.integer,
    notes:                  column.text,
    is_active:              column.integer,
    created_at:             column.text,
    created_by:             column.text,
    updated_at:             column.text,
    updated_by:             column.text,
    deleted_at:             column.text,
    deleted_by:             column.text,
  });

  const maintenance_categories = table({
    organization_id: column.text,
    name:            column.text,
    type:            column.text,
    description:     column.text,
    color:           column.text,
    is_active:       column.integer,
    created_at:      column.text,
    created_by:      column.text,
    updated_at:      column.text,
    updated_by:      column.text,
    deleted_at:      column.text,
    deleted_by:      column.text,
  });

  const fines = table(
    {
      organization_id:    column.text,
      vehicle_id:         column.text,
      driver_id:          column.text,
      fine_number:        column.text,
      fine_date:          column.text,
      infraction_type:    column.text,
      description:        column.text,
      location:           column.text,
      fine_amount:        column.real,
      due_date:           column.text,
      payment_date:       column.text,
      status:             column.text,
      points:             column.integer,
      authority:          column.text,
      notes:              column.text,
      responsible_party:  column.text,
      created_at:         column.text,
      created_by:         column.text,
      updated_at:         column.text,
      updated_by:         column.text,
      deleted_at:         column.text,
      deleted_by:         column.text,
    },
    { indexes: { vehicle: ['vehicle_id'] } },
  );

  const vehicle_documents = table(
    {
      organization_id: column.text,
      vehicle_id:      column.text,
      document_type:   column.text,
      document_number: column.text,
      issue_date:      column.text,
      expiry_date:     column.text,
      value:           column.real,
      file_path:       column.text,
      notes:           column.text,
      created_at:      column.text,
      created_by:      column.text,
      updated_at:      column.text,
      updated_by:      column.text,
      deleted_at:      column.text,
      deleted_by:      column.text,
    },
    { indexes: { vehicle: ['vehicle_id'] } },
  );

  const maintenance_items = table(
    {
      organization_id: column.text,
      maintenance_id:  column.text,
      type:            column.text,
      description:     column.text,
      quantity:        column.integer,
      unit_price:      column.real,
      total_price:     column.real,
      created_at:      column.text,
      created_by:      column.text,
      updated_at:      column.text,
      updated_by:      column.text,
      deleted_at:      column.text,
      deleted_by:      column.text,
    },
    { indexes: { maintenance: ['maintenance_id'] } },
  );

  const scheduled_trips = table(
    {
      organization_id:  column.text,
      driver_id:        column.text,
      vehicle_id:       column.text,
      route_id:         column.text,
      scheduled_date:   column.text,
      origin:           column.text,
      destination:      column.text,
      purpose:          column.text,
      notes:            column.text,
      status:           column.text,
      trip_id:          column.text,
      launched_at:      column.text,
      cancelled_at:     column.text,
      cancelled_reason: column.text,
      created_at:       column.text,
      created_by:       column.text,
      updated_at:       column.text,
      updated_by:       column.text,
      deleted_at:       column.text,
      deleted_by:       column.text,
    },
    { indexes: { vehicle: ['vehicle_id'] } },
  );

  const categories = table({
    organization_id: column.text,
    name:            column.text,
    description:     column.text,
    type:            column.text,
    color:           column.text,
    icon:            column.text,
    is_active:       column.integer,
    created_at:      column.text,
    created_by:      column.text,
    updated_at:      column.text,
    updated_by:      column.text,
    deleted_at:      column.text,
    deleted_by:      column.text,
  });

  // 2026-11-15 — turnos e férias de motoristas, antes só no app.db local
  // (nunca sincronizavam e rebentavam desde que os motoristas passaram para
  // aqui — FK para uma tabela drivers local vazia). Espelham
  // fleetcontrol-api/src/db/schemas/driver_{shifts,shift_members,leaves}.schema.ts.
  const driver_shifts = table({
    organization_id: column.text,
    name:            column.text,
    description:     column.text,
    start_date:      column.text,
    end_date:        column.text,
    start_time:      column.text,
    end_time:        column.text,
    status:          column.text,
    notes:           column.text,
    created_at:      column.text,
    created_by:      column.text,
    updated_at:      column.text,
    updated_by:      column.text,
    deleted_at:      column.text,
    deleted_by:      column.text,
  });

  const driver_shift_members = table(
    {
      organization_id: column.text,
      shift_id:        column.text,
      driver_id:       column.text,
      is_leader:       column.integer,
      notes:           column.text,
      created_at:      column.text,
      created_by:      column.text,
      updated_at:      column.text,
      updated_by:      column.text,
      deleted_at:      column.text,
      deleted_by:      column.text,
    },
    { indexes: { shift: ['shift_id'], driver: ['driver_id'] } },
  );

  const driver_leaves = table(
    {
      organization_id:  column.text,
      driver_id:        column.text,
      start_date:       column.text,
      end_date:         column.text,
      reason:           column.text,
      notes:            column.text,
      status:           column.text,
      cancelled_at:     column.text,
      cancelled_reason: column.text,
      created_at:       column.text,
      created_by:       column.text,
      updated_at:       column.text,
      updated_by:       column.text,
      deleted_at:       column.text,
      deleted_by:       column.text,
    },
    { indexes: { driver: ['driver_id'] } },
  );

  return new Schema({
    vehicles,
    drivers,
    trips,
    fuel,
    maintenance,
    expenses,
    categories,
    // Fase 4 (migração Standalone -> Connected-first) — estas 8 tabelas
    // estavam declaradas acima mas nunca chegaram a entrar no Schema
    // devolvido, por isso o PowerSync nunca as criava na base local
    // ("no such table: fines" e equivalentes nas outras 7). Corrigido.
    routes,
    workshops,
    fuel_stations,
    maintenance_categories,
    fines,
    vehicle_documents,
    maintenance_items,
    scheduled_trips,
    driver_shifts,
    driver_shift_members,
    driver_leaves,
  });
}

export type Database = Awaited<ReturnType<typeof loadAppSchema>>['types'];
