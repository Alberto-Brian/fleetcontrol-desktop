// ========================================
// FILE: src/components/refueling/ViewRefuelingDialog.tsx
// ========================================
import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { cn } from '@/lib/utils';
import {
  Fuel, Car, User, MapPin, Gauge, Calendar, FileText,
  Route, CheckCircle2, Pencil, Trash2, Loader2, Hash,
  TrendingUp, Droplets, StickyNote,
} from 'lucide-react';
import { deleteRefueling } from '@/helpers/refueling-helpers';
import { useRefuelings } from '@/contexts/RefuelingsContext';
import EditRefuelingDialog from '@/components/refueling/EditRefuelingDialog';
import { PermissionGate } from '@/components/PermissionGate';

interface ViewRefuelingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FUEL_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  gasoline: { label: 'Gasolina',  icon: '⛽', color: 'bg-amber-50  text-amber-700  border-amber-200'  },
  diesel:   { label: 'Gasóleo',   icon: '🛢️', color: 'bg-blue-50   text-blue-700   border-blue-200'   },
  ethanol:  { label: 'Etanol',    icon: '🌱', color: 'bg-green-50  text-green-700  border-green-200'  },
  cng:      { label: 'GNV',       icon: '🔥', color: 'bg-orange-50 text-orange-700 border-orange-200' },
};

export default function ViewRefuelingDialog({ open, onOpenChange }: ViewRefuelingDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const {
    state: { selectedRefueling },
    deleteRefueling: deleteFromContext,
    selectRefueling,
  } = useRefuelings();

  const [editOpen,       setEditOpen]       = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [isDeleting,     setIsDeleting]     = useState(false);

  async function handleDelete() {
    if (!selectedRefueling) return;

    setIsDeleting(true);
    try {
      const ok = await deleteRefueling(selectedRefueling.id);
      if (ok) {
        deleteFromContext(selectedRefueling.id);
        showSuccess('refuelings:toast.deleteSuccess');
        setConfirmDelete(false);
        onOpenChange(false);
        selectRefueling(null);
      }
    } catch (error) {
      handleError(error, 'refuelings:toast.deleteError');
    } finally {
      setIsDeleting(false);
    }
  }

  if (!selectedRefueling) return null;

  const r         = selectedRefueling;
  const fuelMeta  = FUEL_TYPE_META[r.fuel_type] ?? { label: r.fuel_type, icon: '⛽', color: 'bg-muted text-muted-foreground border-muted' };
  const dateStr   = new Date(r.refueling_date).toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const timeStr   = new Date(r.refueling_date).toLocaleTimeString('pt-PT', {
    hour: '2-digit', minute: '2-digit',
  });

  // ── Helper: linha de detalhe ──────────────────────────────────────────────
  function DetailRow({
    icon: Icon, label, value, mono = false, className = '',
  }: {
    icon: React.ElementType;
    label: string;
    value?: string | number | null;
    mono?: boolean;
    className?: string;
  }) {
    if (!value && value !== 0) return null;
    return (
      <div className={cn('flex items-start gap-3 py-2.5', className)}>
        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn('text-sm font-semibold mt-0.5 break-words', mono && 'font-mono')}>{value}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {/* Header: ícone + título + acções */}
            <div className="flex items-start justify-between pr-8">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shrink-0',
                  r.is_full_tank ? 'bg-green-50 border-green-200' : 'bg-primary/10 border-primary/20'
                )}>
                  {fuelMeta.icon}
                </div>
                <div>
                  <DialogTitle className="text-xl font-black font-mono">
                    {r.vehicle_license ?? '—'}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {dateStr} {timeStr !== '00:00' && `· ${timeStr}`}
                  </DialogDescription>
                </div>
              </div>

              {/* Acções rápidas */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => { onOpenChange(false); setTimeout(() => setEditOpen(true), 100); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('common:actions.edit')}
                </Button>
                <PermissionGate permission="fuel:delete"><Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('common:actions.delete')}
                </Button></PermissionGate> */}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 mt-4">

            {/* ── KPIs principais ─────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t('refuelings:fields.liters')}
                </p>
                <p className="text-2xl font-black font-mono text-primary">
                  {r.liters}
                  <span className="text-sm font-bold ml-1">L</span>
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t('refuelings:fields.pricePerLiter')}
                </p>
                <p className="text-2xl font-black font-mono text-orange-600">
                  {r.price_per_liter.toFixed(2)}
                  <span className="text-sm font-bold ml-1">Kz</span>
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-green-50/60 dark:bg-green-950/20 border border-green-100 dark:border-green-900">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t('refuelings:fields.totalCost')}
                </p>
                <p className="text-2xl font-black font-mono text-green-700 dark:text-green-400">
                  {r.total_cost.toLocaleString('pt-PT')}
                  <span className="text-sm font-bold ml-1">Kz</span>
                </p>
              </div>
            </div>

            {/* ── Badges de estado ────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
              <Badge className={cn('gap-1.5 px-3 py-1 border font-semibold', fuelMeta.color)}>
                <Droplets className="w-3.5 h-3.5" />
                {fuelMeta.label}
              </Badge>
              {r.is_full_tank && (
                <Badge className="gap-1.5 px-3 py-1 border font-semibold bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('refuelings:info.fullTank')}
                </Badge>
              )}
              {r.trip_code && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1 font-semibold">
                  <Route className="w-3.5 h-3.5" />
                  {r.trip_code}
                </Badge>
              )}
            </div>

            <Separator />

            {/* ── Detalhes em duas colunas ─────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 divide-y sm:divide-y-0">
              {/* Coluna 1 */}
              <div className="divide-y">
                <DetailRow icon={Car}   label={t('refuelings:fields.vehicle')} value={
                  r.vehicle_brand
                    ? `${r.vehicle_license} — ${r.vehicle_brand} ${r.vehicle_model ?? ''}`
                    : r.vehicle_license
                } mono />
                <DetailRow icon={User}  label={t('refuelings:fields.driver')}  value={r.driver_name} />
                <DetailRow icon={MapPin} label={t('refuelings:fields.station')} value={
                  r.station_name
                    ? `${r.station_name}${r.station_brand ? ` (${r.station_brand})` : ''}${r.station_city ? ` · ${r.station_city}` : ''}`
                    : null
                } />
                <DetailRow icon={Gauge} label={t('refuelings:fields.mileage')} value={
                  r.current_mileage ? `${r.current_mileage.toLocaleString('pt-PT')} km` : null
                } />
              </div>

              {/* Coluna 2 */}
              <div className="divide-y">
                {r.trip_code && (
                  <DetailRow icon={Route} label={t('refuelings:fields.trip')} value={
                    [r.trip_code, r.route_name ?? r.trip_destination]
                      .filter(Boolean).join(' · ')
                  } />
                )}
                {r.route_origin && r.route_destination && (
                  <DetailRow icon={TrendingUp} label={t('refuelings:fields.route')} value={
                    `${r.route_origin} → ${r.route_destination}`
                  } />
                )}
                {r.invoice_number && (
                  <DetailRow icon={Hash} label={t('refuelings:fields.invoiceNumber')} value={r.invoice_number} mono />
                )}
                <DetailRow icon={FileText} label={t('refuelings:fields.registeredAt')} value={
                  new Date(r.created_at).toLocaleDateString('pt-PT', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                } />
              </div>
            </div>

            {/* ── Notas ───────────────────────────────────────────────────── */}
            {r.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <StickyNote className="w-4 h-4" />
                    {t('refuelings:fields.notes')}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border">
                    {r.notes}
                  </p>
                </div>
              </>
            )}

            {/* ── Rodapé: botões de acção ─────────────────────────────────── */}
            <Separator />
            <div className="flex justify-end gap-3 pt-1">
              <PermissionGate permission="fuel:delete"><Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4" />
                {t('common:actions.delete')}
              </Button></PermissionGate>
              <Button
                className="gap-2"
                onClick={() => { onOpenChange(false); setTimeout(() => setEditOpen(true), 100); }}
              >
                <Pencil className="w-4 h-4" />
                {t('common:actions.edit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── EditRefuelingDialog — abre após fechar o View ────────────────── */}
      <EditRefuelingDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onDeleted={() => onOpenChange(false)}
      />

      {/* ── AlertDialog de confirmação de eliminação ──────────────────────── */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              {t('refuelings:dialogs.delete.title', 'Eliminar abastecimento')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('refuelings:dialogs.delete.description',
                'Esta acção não pode ser desfeita. O registo será permanentemente eliminado.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common:deleting', 'A eliminar...')}</>
                : t('common:actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}