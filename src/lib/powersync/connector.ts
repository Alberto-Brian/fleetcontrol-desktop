// ========================================
// PROJECT: fleetcontrol-desktop
// FILE: src/lib/powersync/connector.ts
// ========================================
//
// Fase 12, Prompt 22.8 — PowerSyncBackendConnector, processo principal
// (Electron main), consistente com o resto da arquitectura do Desktop (todos
// os outros serviços — AuthService, DatabaseManager, etc. — já correm aqui,
// nunca no renderer).
//
// fetchCredentials() reaproveita o access_token de sessão já mantido em
// sincronia com o utilizador autenticado (token-store.ts, actualizado a cada
// login/refresh/logout desde a Fase 11B.8/11B.9) — nunca lê/guarda token
// nenhum próprio, apenas o usa para pedir ao backend um token RS256 de curta
// duração dedicado ao PowerSync (GET /api/auth/powersync-token, Prompt 22.3).
// A resposta já vem no formato exacto exigido por PowerSyncCredentials
// ({endpoint, token, expiresAt}) — nada a montar aqui.
//
// uploadData() é uma implementação PRÓPRIA, deliberadamente SEM reutilizar
// api-sync-queue.ts (helpers/ipc/db/vehicles/api-sync-queue.ts) — analisado
// nesta sessão e confirmado ser uma fila genérica de reenvio de chamadas REST
// arbitrárias (ex. desregistar um GPS), com a sua PRÓPRIA política de retry
// 4xx-descarta/5xx-repete, pensada para pedidos avulsos, não para o fluxo
// CRUD de sincronização do PowerSync. O SDK do PowerSync já mantém a sua
// própria fila persistente (a própria base SQLite local, sobrevive a
// reinícios) e o seu próprio backoff — introduzir aqui uma segunda fila por
// cima seria redundante e, pior, incompatível: a política 4xx-descarta de
// api-sync-queue.ts está errada para o contrato do Prompt 22.4, que NUNCA
// devolve 4xx por uma negação de autorização/validação (sempre 2xx com
// {success:false} por operação) — só POST /api/powersync/sync/upload, ponto.
// api-sync-queue.ts fica intocado, continua a servir o seu próprio propósito.
import axios from 'axios';
import { BrowserWindow } from 'electron';
import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/node';
import { getApiUrl } from '@/helpers/server-config';
import { getStoredApiToken } from '@/helpers/ipc/services/auth/token-store';
import { POWERSYNC_OPERATION_REJECTED_PUSH } from '@/helpers/ipc/services/powersync/powersync-service-channels';

// Mesmo helper de powersync-service-listeners.ts, duplicado aqui de
// propósito (2026-09-13) — este ficheiro corre no processo principal mas
// nunca dependeu do módulo dos listeners; um import cruzado só para 5
// linhas não compensava o acoplamento.
function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

interface IPowerSyncTokenResponse {
  endpoint:  string;
  token:     string;
  expiresAt: string;
  userId:    string;
}

interface IUploadPowerSyncOperationResult {
  id:      string;
  table:   string;
  op:      'PUT' | 'PATCH' | 'DELETE';
  success: boolean;
  error?:  string;
}

interface IUploadPowerSyncChangesResult {
  success: boolean;
  results: IUploadPowerSyncOperationResult[];
}

function authHeaders() {
  const token = getStoredApiToken();
  if (!token) {
    // Sem sessão API — não deveria acontecer em prática (só chamamos
    // connect() depois de um login/restauro de sessão bem-sucedido, e
    // disconnectAndClear() no logout), mas lançar aqui é o comportamento
    // correcto per o SDK: PowerSync trata qualquer excepção em
    // fetchCredentials()/uploadData() como falha transitória e tenta de novo
    // com backoff — nunca desliga a sincronização sozinho por causa disto.
    throw new Error('[PowerSync] Sem sessão API activa — a aguardar login.');
  }
  return { Authorization: `Bearer ${token}` };
}

export class PowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const { data } = await axios.get<IPowerSyncTokenResponse>(
      `${getApiUrl()}/api/auth/powersync-token`,
      { headers: authHeaders(), timeout: 10_000 },
    );

    return {
      endpoint:  data.endpoint,
      token:     data.token,
      expiresAt: new Date(data.expiresAt),
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      const operations = transaction.crud.map((op) => ({
        id:    op.id,
        table: op.table,
        op:    op.op as 'PUT' | 'PATCH' | 'DELETE',
        data:  op.opData,
        // Valor dos campos alterados ANTES desta escrita (trackPrevious em
        // schema.ts) — a versão de base que o servidor compara com a linha
        // real para detectar conflitos. Ausente em INSERTs.
        previous: op.previousValues,
      }));

      const { data } = await axios.post<IUploadPowerSyncChangesResult>(
        `${getApiUrl()}/api/powersync/sync/upload`,
        { operations },
        { headers: authHeaders(), timeout: 30_000 },
      );

      // Fase 12, Prompt 22.4 — o backend já nunca devolve 4xx/5xx por uma
      // negação de autorização/validação de uma operação individual, sempre
      // 2xx com {success:false, error} nesse item. Isso NUNCA deve bloquear
      // a fila: complete() avança sempre que o pedido HTTP em si teve
      // sucesso, independentemente do resultado por-operação — mesma regra
      // "Return 2xx even for validation errors — never let them block the
      // queue" da doc oficial.
      //
      // 2026-09-13 — "o aviso tem que ser melhor que o console.warn, tem
      // que ser informativo para o utilizador": até aqui, uma operação
      // rejeitada (ex. tentar eliminar uma categoria sem category:delete)
      // ficava "aplicada" localmente (PowerSync é optimista/local-first —
      // a escrita local já tinha acontecido antes deste upload sequer
      // correr) sem AVISO nenhum visível — o utilizador achava que tinha
      // resultado, sem saber que o servidor recusou e nada mudou lá.
      // Empurra para o renderer em vez de só logar — SyncNotifier.tsx
      // mostra um toast de aviso. Não resolve a reconciliação (a escrita
      // local optimista continua "aplicada" até um próximo download
      // corrigir — fica sinalizado, não é o âmbito deste pedido), mas
      // pelo menos o utilizador fica a saber que aquilo não teve efeito
      // nenhum no servidor.
      const failed = data.results.filter((r) => !r.success);
      if (failed.length > 0) {
        broadcast(POWERSYNC_OPERATION_REJECTED_PUSH, failed);
      }

      await transaction.complete();
    } catch (err) {
      // Falha genuína (rede, 5xx, sem sessão) — NUNCA chamar complete() aqui;
      // relançar para o PowerSync tratar como transitório e repetir com
      // backoff automático, exactamente como a doc do SDK exige.
      throw err;
    }
  }
}
