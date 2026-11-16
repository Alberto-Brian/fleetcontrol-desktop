// ========================================
// FILE: src/lib/db/schedulers/session-permissions.ts
// ========================================
//
// 2026-11-16 — os agendadores (férias, viagens agendadas) correm no processo
// principal de TODOS os postos e gravam sozinhos. Num posto cujo utilizador
// não tem a permissão, essas gravações seriam recusadas pelo servidor, os
// dados voltavam atrás e, 5 minutos depois, o agendador tentava outra vez —
// um aviso de "operação recusada" em loop. Por isso só gravam quando a sessão
// tem as permissões necessárias.
//
// O processo principal não tem a lista de permissões (vive no ecrã), por isso
// pergunta à API (/api/auth/me/access) com o token da sessão. A resposta é
// guardada por token: sem ligação usa a última conhecida dessa sessão; sem
// nenhuma, responde "não" (outro posto com a permissão trata do assunto).
// Isto só decide se vale a pena tentar — o servidor continua a decidir.

import axios from 'axios';
import { getApiUrl } from '@/helpers/server-config';
import { getStoredApiToken } from '@/helpers/ipc/services/auth/token-store';

let cached: { token: string; permissions: string[] } | null = null;

export async function sessionHasPermissions(codes: string[]): Promise<boolean> {
  const token = getStoredApiToken();
  if (!token) return false;
  try {
    const { data } = await axios.get(`${getApiUrl()}/api/auth/me/access`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });
    cached = { token, permissions: data?.data?.permissions ?? [] };
  } catch {
    // sem ligação — só serve a última resposta desta MESMA sessão
    if (cached?.token !== token) return false;
  }
  return codes.every(code => cached!.permissions.includes(code));
}
