// ========================================
// PROJECT: fleetcontrol-desktop
// FILE: src/helpers/permission-guard.ts
// ========================================
//
// 2026-11-15 — o Desktop é offline-first: uma acção é gravada primeiro na
// base local (PowerSync) e só depois enviada ao servidor. Sem esta
// verificação, uma acção sem permissão mostrava o toast verde de sucesso e,
// segundos depois, era desfeita pela recusa do servidor (aviso âmbar) — o
// toast verde ficava a mentir. Agora a acção é recusada ANTES de gravar, com
// o toast vermelho normal (useErrorHandler).
//
// Usa a cache de permissões de GET /api/auth/me/access (license-helpers).
// Enquanto essa cache ainda não chegou (ex. arranque sem ligação),
// hasCachedPermission devolve true: nunca bloqueia por engano só por estar
// offline. A autoridade final continua a ser sempre o servidor.

import { AppError } from '@/lib/errors/AppError';
import { hasCachedPermission } from './license-helpers';

export function assertPermission(code: string): void {
  if (hasCachedPermission(code)) return;
  throw new AppError({
    i18nKey: 'common:errors.noPermission',
    type: 'error',
    data: { i18n: { permission: code } },
  }).toIpcString();
}
