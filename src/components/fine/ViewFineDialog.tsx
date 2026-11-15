// ========================================
// FILE: src/components/fine/ViewFineDialog.tsx
// ========================================
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Car,
  User,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Building2,
  Edit,
  CheckCircle2,
  Scale,
  Wallet
} from 'lucide-react';
import { useFines } from '@/contexts/FinesContext';
import { isOverdue, getDaysOverdue, getDaysUntilDue } from '@/helpers/fine-helpers';
import { PermissionGate } from '@/components/PermissionGate';

interface ViewFineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onMarkAsPaid?: () => void;
  onContest?: () => void;
}

export default function ViewFineDialog({ open, onOpenChange, onEdit, onMarkAsPaid, onContest }: ViewFineDialogProps) {
  const { t } = useTranslation();
  const { state: { selectedFine } } = useFines();

  if (!selectedFine) return null;

  function getStatusBadge(status: string) {
    const map = {
      pending: { label: t('fines:status.pending.label'), icon: AlertCircle, className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400' },
      paid: { label: t('fines:status.paid.label'), icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' },
      contested: { label: t('fines:status.contested.label'), icon: Scale, className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400' },
      cancelled: { label: t('fines:status.cancelled.label'), icon: AlertCircle, className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400' },
    };
    const s = map[status as keyof typeof map] || map.pending;
    const Icon = s.icon;
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1.5 font-bold rounded-full text-xs px-3 py-1", s.className)}>
        <Icon className="w-4 h-4" />
        {s.label}
      </Badge>
    );
  }

  const overdueStatus = isOverdue(selectedFine);
  const daysOverdue = overdueStatus && selectedFine.due_date ? getDaysOverdue(selectedFine.due_date) : 0;
  const daysUntilDue = !overdueStatus && selectedFine.due_date ? getDaysUntilDue(selectedFine.due_date) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-2 mb-2">
                <AlertCircle className="w-6 h-6 text-red-600" />
                {t('fines:dialogs.view.title')}
              </DialogTitle>
              <DialogDescription>
                {selectedFine.fine_number}
              </DialogDescription>
            </div>
            {getStatusBadge(selectedFine.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alerta de Vencimento */}
          {overdueStatus && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive text-sm">
                    {t('fines:alerts.overdue', { days: daysOverdue })}
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    Vencimento: {new Date(selectedFine.due_date!).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedFine.due_date && !overdueStatus && selectedFine.status === 'pending' && daysUntilDue <= 7 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
                    {t('fines:alerts.dueSoon', { days: daysUntilDue })}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Vencimento: {new Date(selectedFine.due_date).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Veículo, Motorista e Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Car className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold text-sm">{t('fines:fields.vehicle')}</p>
              </div>
              <p className="text-lg font-bold font-mono">{selectedFine.vehicle_license}</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold text-sm">{t('fines:fields.driver')}</p>
              </div>
              <p className="text-lg font-bold">
                {selectedFine.driver_name || t('fines:info.unknownDriver')}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold text-sm">{t('fines:fields.responsibleParty')}</p>
              </div>
              <p className="text-lg font-bold">
                {selectedFine.responsible_party
                  ? t(`fines:fields.responsiblePartyOptions.${selectedFine.responsible_party}`)
                  : '—'}
              </p>
            </div>
          </div>

          {/* Dados da Multa */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Detalhes da Infração
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('fines:fields.infractionType')}</p>
                <p className="font-medium">{t(`fines:infractionTypes.${selectedFine.infraction_type}`)}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('fines:fields.fineDate')}</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">
                    {new Date(selectedFine.fine_date).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {selectedFine.location && (
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">{t('fines:fields.location')}</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{selectedFine.location}</p>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">{t('fines:fields.description')}</p>
                <p className="text-sm">{selectedFine.description}</p>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valores e Prazos
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-700 dark:text-red-400 mb-1 font-semibold uppercase tracking-wider">
                  {t('fines:fields.fineAmount')}
                </p>
                <p className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
                  {selectedFine.fine_amount.toLocaleString('pt-PT')}
                  <span className="text-sm ml-1">Kz</span>
                </p>
              </div>

              {selectedFine.points && selectedFine.points > 0 && (
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <p className="text-xs text-orange-700 dark:text-orange-400 mb-1 font-semibold uppercase tracking-wider">
                    {t('fines:fields.points')}
                  </p>
                  <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
                    {selectedFine.points}
                  </p>
                </div>
              )}

              {selectedFine.due_date && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400 mb-1 font-semibold uppercase tracking-wider">
                    {t('fines:fields.dueDate')}
                  </p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {new Date(selectedFine.due_date).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              )}

              {selectedFine.payment_date && (
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-semibold uppercase tracking-wider">
                    {t('fines:fields.paymentDate')}
                  </p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {new Date(selectedFine.payment_date).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Informações Adicionais */}
          {(selectedFine.authority || selectedFine.notes) && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Informações Adicionais
              </h3>

              {selectedFine.authority && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('fines:fields.authority')}</p>
                  <p className="text-sm font-medium">{selectedFine.authority}</p>
                </div>
              )}

              {selectedFine.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('fines:fields.notes')}</p>
                  <p className="text-sm">{selectedFine.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {selectedFine.status === 'pending' && (
              <>
                {onEdit && (
                  <PermissionGate permission="fine:update"><Button variant="outline" onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t('fines:actions.edit')}
                  </Button></PermissionGate>
                )}
                {onMarkAsPaid && (
                  <PermissionGate permission="fine:update"><Button className="bg-green-600 hover:bg-green-700" onClick={onMarkAsPaid}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t('fines:actions.markAsPaid')}
                  </Button></PermissionGate>
                )}
                {onContest && (
                  <PermissionGate permission="fine:update"><Button variant="outline" onClick={onContest}>
                    <Scale className="w-4 h-4 mr-2" />
                    {t('fines:actions.contest')}
                  </Button></PermissionGate>
                )}
              </>
            )}
            {selectedFine.status !== 'pending' && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common:actions.close')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}