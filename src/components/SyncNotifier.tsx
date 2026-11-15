// ========================================
// PROJECT: fleetcontrol-desktop
// FILE: src/components/SyncNotifier.tsx
// ========================================
//
// Montado uma vez (LicenseGuard) — ouve window._service_powersync.
// onDataChanged e reage com som e/ou toast, conforme as preferências em
// Definições > Sincronização (src/helpers/sync-notifications.ts). Não
// renderiza nada de visível por si — é o "ouvido" da app para chegadas de
// dados; o toast em si é despachado via sonner (toast.custom), que já tem
// o seu próprio Toaster montado em App.tsx.
//
// Substituiu SyncSoundNotifier (só som) — agora junta som+toast na mesma
// janela de rajada, para não tocar/mostrar duas vezes por uma sync que
// mexe em várias tabelas de seguida (ex. veículo + a sua categoria).
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import {
  isSyncSoundEnabled, playSyncSound,
  isSyncToastEnabled, getSyncToastPosition, formatSyncToastMessage,
  formatRejectedOperationMessage,
} from '@/helpers/sync-notifications';
import type { IRejectedSyncOperation } from '@/lib/powersync/rejected-operation';
import { refreshCachedPermissions } from '@/helpers/license-helpers';

const BURST_WINDOW_MS = 600;

function SyncToast({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#ffffff', color: '#111827',
        padding: '8px 12px', borderRadius: 8,
        fontSize: 12, fontWeight: 500, lineHeight: 1.3,
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <RefreshCw size={13} style={{ color: '#0ea5e9', flexShrink: 0 }} />
      {message}
    </div>
  );
}

// 2026-09-13 — distinto de propósito do SyncToast azul acima: âmbar/vermelho
// (aviso, não uma actualização de rotina), ícone de alerta, duração maior
// (o utilizador precisa mesmo de ler isto, não é só um "pisca" informativo).
// Nunca gated por isSyncToastEnabled — uma operação rejeitada é accionável
// (o utilizador pensa que resultou e não resultou), não ruído de sync normal.
function RejectedOperationToast({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        background: '#fffbeb', color: '#78350f',
        padding: '10px 14px', borderRadius: 8, maxWidth: 340,
        fontSize: 12, fontWeight: 500, lineHeight: 1.4,
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)', border: '1px solid #fde68a',
      }}
    >
      <AlertTriangle size={15} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
      {message}
    </div>
  );
}

export function SyncNotifier() {
  const { i18n } = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTablesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return window._service_powersync.onDataChanged((changedTables) => {
      changedTables.forEach((t) => burstTablesRef.current.add(t));
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        const tables = Array.from(burstTablesRef.current);
        burstTablesRef.current.clear();
        timerRef.current = null;

        if (isSyncSoundEnabled()) playSyncSound();

        if (isSyncToastEnabled()) {
          const locale = i18n.language.startsWith('en') ? 'en' : 'pt';
          const message = formatSyncToastMessage(tables, locale);
          if (message) {
            toast.custom(() => <SyncToast message={message} />, {
              position: getSyncToastPosition() === 'own-corner' ? 'top-right' : undefined,
              duration: 3500,
              unstyled: true,
            });
          }
        }
      }, BURST_WINDOW_MS);
    });
  }, [i18n.language]);

  useEffect(() => {
    return window._service_powersync.onOperationRejected((ops: IRejectedSyncOperation[]) => {
      // Uma recusa do servidor é o sinal mais claro de que a cópia local das
      // permissões está desactualizada — relê já, sem esperar pelo temporizador.
      refreshCachedPermissions(true);
      const locale = i18n.language.startsWith('en') ? 'en' : 'pt';
      ops.forEach((op) => {
        const message = formatRejectedOperationMessage(op, locale);
        toast.custom(() => <RejectedOperationToast message={message} />, {
          position: getSyncToastPosition() === 'own-corner' ? 'top-right' : undefined,
          duration: 6000,
          unstyled: true,
        });
      });
    });
  }, [i18n.language]);

  return null;
}
