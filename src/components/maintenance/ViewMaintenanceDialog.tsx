// ========================================
// FILE: src/components/maintenance/ViewMaintenanceDialog.tsx (ATUALIZADO)
// ========================================
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Calendar, DollarSign, FileText, Wrench, Settings, Flag, Clock, AlertCircle, Play, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useMaintenances } from '@/contexts/MaintenancesContext';
import { PermissionGate } from '@/components/PermissionGate';

interface ViewMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart?: () => void;
  onComplete?: () => void;
}

export default function ViewMaintenanceDialog({ open, onOpenChange, onStart, onComplete }: ViewMaintenanceDialogProps) {
  const { t } = useTranslation();
  const { state: { selectedMaintenance } } = useMaintenances();

  // ✅ EARLY RETURN
  if (!selectedMaintenance || !open) return null;

  function getStatusBadge(status: string) {
    const map = {
      scheduled: { label: t('maintenances:status.scheduled.label'), icon: Clock, className: 'bg-slate-50 text-slate-700 border-slate-200' },
      in_progress: { label: t('maintenances:status.in_progress.label'), icon: Settings, className: 'bg-blue-50 text-blue-700 border-blue-200' },
      completed: { label: t('maintenances:status.completed.label'), icon: Flag, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      cancelled: { label: t('maintenances:status.cancelled.label'), icon: AlertCircle, className: 'bg-slate-50 text-slate-600 border-slate-200' },
    };
    const s = map[status as keyof typeof map] || map.scheduled;
    const Icon = s.icon;
    return (
      <Badge className={cn("text-sm px-3 py-1 flex items-center gap-1.5", s.className)}>
        <Icon className="w-3.5 h-3.5" />
        {s.label}
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('maintenances:dialogs.view.title')}</DialogTitle>
          <DialogDescription>
            {t('maintenances:dialogs.view.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between p-4 bg-muted rounded-lg">
            <div> 
              <h3 className="text-xl font-semibold mb-2">{selectedMaintenance.category_name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedMaintenance.vehicle_license} - {selectedMaintenance.vehicle_brand} {selectedMaintenance.vehicle_model}
              </p>
              <div className="flex gap-2 mt-3">
                <Badge variant={selectedMaintenance.type === 'preventive' ? 'default' : 'secondary'}>
                  {t(`maintenances:type.${selectedMaintenance.type}.label`)}
                </Badge>
                {getStatusBadge(selectedMaintenance.status)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t('maintenances:fields.totalCost')}</p>
              <p className="text-2xl font-bold">{selectedMaintenance.total_cost.toLocaleString('pt-PT')} Kz</p>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('maintenances:fields.entryDate')}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedMaintenance.entry_date).toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            {selectedMaintenance.exit_date && (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('maintenances:fields.exitDate')}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedMaintenance.exit_date).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Custos */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t('maintenances:dialogs.view.costs')}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">{t('maintenances:fields.partsCost')}</p>
                <p className="text-lg font-semibold">{selectedMaintenance.parts_cost.toLocaleString('pt-PT')} Kz</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">{t('maintenances:fields.laborCost')}</p>
                <p className="text-lg font-semibold">{selectedMaintenance.labor_cost.toLocaleString('pt-PT')} Kz</p>
              </div>
              <div className="p-3 border rounded-lg bg-primary/5">
                <p className="text-xs text-muted-foreground">{t('maintenances:fields.totalCost')}</p>
                <p className="text-lg font-semibold">{selectedMaintenance.total_cost.toLocaleString('pt-PT')} Kz</p>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="space-y-4">
            {selectedMaintenance.workshop_name && (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Settings className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('maintenances:fields.workshop')}</p>
                  <p className="text-sm text-muted-foreground">{selectedMaintenance.workshop_name}</p>
                </div>
              </div>
            )}

            {selectedMaintenance.work_order_number && (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('maintenances:fields.workOrderNumber')}</p>
                  <p className="text-sm text-muted-foreground">{selectedMaintenance.work_order_number}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Wrench className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('maintenances:fields.mileage')}</p>
                <p className="text-sm text-muted-foreground">{selectedMaintenance.vehicle_mileage.toLocaleString('pt-PT')} km</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Descrições */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{t('maintenances:fields.description')}</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {selectedMaintenance.description || t('maintenances:info.noNotes')}
              </p>
            </div>

            {selectedMaintenance.diagnosis && (
              <div>
                <h4 className="font-semibold mb-2">{t('maintenances:fields.diagnosis')}</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {selectedMaintenance.diagnosis}
                </p>
              </div>
            )}

            {selectedMaintenance.solution && (
              <div>
                <h4 className="font-semibold mb-2">{t('maintenances:fields.solution')}</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {selectedMaintenance.solution}
                </p>
              </div>
            )}

            {selectedMaintenance.notes && (
              <div>
                <h4 className="font-semibold mb-2">{t('maintenances:fields.notes')}</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                  {selectedMaintenance.notes}
                </p>
              </div>
            )}
          </div>

          {(selectedMaintenance.status === 'scheduled' || selectedMaintenance.status === 'in_progress') && (
            <>
              <Separator />
              <div className="flex gap-3">
                {selectedMaintenance.status === 'scheduled' && onStart && (
                  <PermissionGate permission="maintenance:update"><Button variant="outline" className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={onStart}>
                    <Play className="w-4 h-4 mr-2" />
                    {t('maintenances:actions.start')}
                  </Button></PermissionGate>
                )}
                {onComplete && (
                  <PermissionGate permission="maintenance:update"><Button variant="outline" className="flex-1 text-green-600 border-green-200 hover:bg-green-50" onClick={onComplete}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t('maintenances:actions.complete')}
                  </Button></PermissionGate>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}