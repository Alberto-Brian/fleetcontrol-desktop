// ========================================
// FILE: src/lib/schedulers/trip-scheduler.ts
// ========================================
// Corre no processo MAIN do Electron — mesmo processo que o leave-scheduler.
// Inicializar chamando startTripScheduler() no main.ts após o DB estar pronto.
// Pode correr em conjunto com o leave-scheduler sem conflitos.
// ========================================

// Fase 6 — corrigido para powersync.db (era app.db/Drizzle). Este
// scheduler corre a cada 5 minutos desde o arranque da app; antes deste
// corte estava a ler/escrever drivers/vehicles/trips já desactualizados
// (esses 3 só escrevem em powersync.db desde os Prompts 6.2/6.3/6.5) —
// ver nota grande em scheduled_trips.queries.powersync.ts.
import { processScheduledTrips } from '@/lib/db/queries/scheduled_trips.queries.powersync';
import { sessionHasPermissions } from './session-permissions';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutos — igual ao leave-scheduler

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Executa um ciclo completo do trip scheduler.
 * Pode ser chamado isoladamente para forçar processamento.
 */
export async function runTripSchedulerCycle(): Promise<void> {
  try {
    // 2026-11-16 — só lança quem pode criar viagens e actualizar agendadas
    // (ver session-permissions.ts). Duplicados entre postos já são travados
    // pelo servidor: o 2.º posto envia o veículo "disponível → em uso" com o
    // veículo já em uso, e o lote inteiro dele é recusado.
    if (!(await sessionHasPermissions(['trip:create', 'scheduled_trip:update']))) return;

    const result = await processScheduledTrips();

    if (
      result.launched.length      > 0 ||
      result.pendingLeave.length  > 0 ||
      result.autoCancelled.length > 0
    ) {
      console.log('[TripScheduler] processScheduledTrips:', result);
    }
  } catch (error) {
    console.error('[TripScheduler] Error during cycle:', error);
  }
}

/**
 * Inicia o scheduler.
 * Corre imediatamente no arranque e depois a cada 5 minutos.
 */
export function startTripScheduler(): void {
  if (schedulerTimer) {
    console.warn('[TripScheduler] Already running — skipping start');
    return;
  }

  console.log('[TripScheduler] Starting — interval:', INTERVAL_MS / 1000, 's');

  // Corre imediatamente para processar quaisquer viagens pendentes
  runTripSchedulerCycle();

  schedulerTimer = setInterval(runTripSchedulerCycle, INTERVAL_MS);
}

/**
 * Para o scheduler (útil em testes ou shutdown gracioso).
 */
export function stopTripScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[TripScheduler] Stopped');
  }
}