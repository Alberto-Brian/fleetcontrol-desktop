// ========================================
// FILE: src/lib/schedulers/leave-scheduler.ts
// ========================================
// Corre no processo MAIN do Electron.
// Inicializar chamando startLeaveScheduler() no main.ts após o DB estar pronto.
// ========================================

import { processScheduledLeaves, processCompletedLeaves } from '@/lib/db/queries/driver_leaves.queries.powersync';
import { sessionHasPermissions } from './session-permissions';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

// 2026-11-15 — só grava quem pode gerir férias (ver session-permissions.ts).

/**
 * Executa um ciclo completo do scheduler.
 * Pode ser chamado isoladamente para testes ou forçar processamento.
 */
export async function runLeaveSchedulerCycle(): Promise<void> {
  try {
    if (!(await sessionHasPermissions(['driver_leave:update']))) return;

    // 1. Processar férias que devem começar (scheduled → active/pending_trip)
    const startResult = await processScheduledLeaves();

    if (
      startResult.activated.length > 0 ||
      startResult.pendingTrip.length > 0 ||
      startResult.autoCancelled.length > 0
    ) {
      console.log('[LeaveScheduler] processScheduledLeaves:', startResult);
    }

    // 2. Processar férias que terminaram (active → completed + driver → available)
    const completed = await processCompletedLeaves();

    if (completed.length > 0) {
      console.log('[LeaveScheduler] processCompletedLeaves — completed:', completed);
    }
  } catch (error) {
    console.error('[LeaveScheduler] Error during cycle:', error);
  }
}

/**
 * Inicia o scheduler.
 * Chama um ciclo imediatamente no arranque e depois a cada 5 minutos.
 */
export function startLeaveScheduler(): void {
  if (schedulerTimer) {
    console.warn('[LeaveScheduler] Already running — skipping start');
    return;
  }

  console.log('[LeaveScheduler] Starting — interval:', INTERVAL_MS / 1000, 's');

  // Corre imediatamente no arranque para não esperar 5 min
  runLeaveSchedulerCycle();

  schedulerTimer = setInterval(runLeaveSchedulerCycle, INTERVAL_MS);
}

/**
 * Para o scheduler (útil em testes ou shutdown gracioso).
 */
export function stopLeaveScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[LeaveScheduler] Stopped');
  }
}