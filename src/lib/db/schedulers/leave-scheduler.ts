// ========================================
// FILE: src/lib/schedulers/leave-scheduler.ts
// ========================================
// Corre no processo MAIN do Electron.
// Inicializar chamando startLeaveScheduler() no main.ts após o DB estar pronto.
// ========================================

import axios from 'axios';
import { processScheduledLeaves, processCompletedLeaves } from '@/lib/db/queries/driver_leaves.queries.powersync';
import { getApiUrl } from '@/helpers/server-config';
import { getStoredApiToken } from '@/helpers/ipc/services/auth/token-store';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

// 2026-11-15 — as férias passaram a sincronizar. Este ciclo corre em TODOS os
// postos; num posto cujo utilizador não pode gerir férias, as gravações
// automáticas (activar/terminar) seriam recusadas pelo servidor, os dados
// voltavam atrás, e 5 minutos depois o ciclo tentava outra vez — um aviso
// de "operação recusada" em loop. Por isso só grava quem tem
// driver_leave:update. A resposta é guardada: sem ligação usa a última
// conhecida; sem nenhuma, não grava (o posto de quem tem a permissão trata).
let canManageLeaves: { token: string; allowed: boolean } | null = null;

async function sessionCanManageLeaves(): Promise<boolean> {
  const token = getStoredApiToken();
  if (!token) return false;
  try {
    const { data } = await axios.get(`${getApiUrl()}/api/auth/me/access`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });
    const permissions: string[] = data?.data?.permissions ?? [];
    canManageLeaves = { token, allowed: permissions.includes('driver_leave:update') };
  } catch {
    // sem ligação — mantém a última resposta desta mesma sessão, se houver
    if (canManageLeaves?.token !== token) return false;
  }
  return canManageLeaves?.allowed ?? false;
}

/**
 * Executa um ciclo completo do scheduler.
 * Pode ser chamado isoladamente para testes ou forçar processamento.
 */
export async function runLeaveSchedulerCycle(): Promise<void> {
  try {
    if (!(await sessionCanManageLeaves())) return;

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