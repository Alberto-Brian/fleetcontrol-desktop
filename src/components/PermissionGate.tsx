// ========================================
// FILE: src/components/PermissionGate.tsx
// ========================================
//
// 2026-11-15 — envolve UM botão/item de menu de uma acção. Sem a permissão,
// o elemento fica desactivado e, ao passar o rato, explica "Sem permissão"
// (decisão: desactivar com indicação, nunca esconder — o utilizador percebe
// que a acção existe mas não lhe está atribuída).
//
// É só sinalização de UI. A recusa real continua no assertPermission dos
// helpers e, sobretudo, no servidor. Enquanto a lista de permissões ainda
// não chegou, usePermission devolve true (nunca desactiva por lentidão).
//
// Também serve para um <DialogTrigger asChild>: o `disabled` chega ao botão
// por dentro do Slot, e um botão desactivado não abre o diálogo.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/hooks/usePermission';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PermissionGateProps {
  permission: string;
  // Itens de menu ocupam a largura toda — o span à volta tem de os acompanhar.
  fullWidth?: boolean;
  children: React.ReactElement<{ disabled?: boolean; onClick?: unknown; onSelect?: unknown }>;
}

export function PermissionGate({ permission, fullWidth, children }: PermissionGateProps) {
  const allowed = usePermission(permission);
  const { t } = useTranslation();

  if (allowed) return children;

  const disabledChild = React.cloneElement(children, {
    disabled: true,
    onClick: undefined,
    onSelect: undefined,
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* O elemento desactivado não recebe eventos de rato — é o span que mostra o aviso. */}
          <span className={`${fullWidth ? 'flex w-full' : 'inline-flex'} cursor-not-allowed`} tabIndex={0}>
            {disabledChild}
          </span>
        </TooltipTrigger>
        <TooltipContent className="px-3 py-1.5 text-xs">
          {t('common:errors.noPermissionShort')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
