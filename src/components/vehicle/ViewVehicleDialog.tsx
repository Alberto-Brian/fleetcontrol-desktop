// ========================================
// FILE: src/components/vehicle/ViewVehicleDialog.tsx (REDESENHADO - SEM TEXTO ESTÁTICO)
// ========================================
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Edit, Gauge, RefreshCw, CheckCircle2, Clock, Settings2, Ban,
  Truck, Tag, Calendar, DollarSign, FileText, RotateCcw, Hash, Wifi, WifiOff, MapPin,
  Route, Fuel, Wrench, ChevronRight, Loader2, Activity, Navigation, Zap, ZapOff,
  LogIn, LogOut, AlertTriangle, Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVehicles } from '@/contexts/VehiclesContext';
import { useTracking } from '@/contexts/TrackingContext';
import { useTranslation } from 'react-i18next';
import { updateVehicle, unregisterVehicleGps, toggleVehicleTracking } from '@/helpers/vehicle-helpers';
import { usePermission } from '@/hooks/usePermission';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getRefuelingsByVehicle } from '@/helpers/refueling-helpers';
import { IRefueling } from '@/lib/types/refueling';
import { ITrip } from '@/lib/types/trip';
import { IMaintenance } from '@/lib/types/maintenance';

// Importar os dialogs
import UpdateMileageDialog from './UpdateMileageDialog';
import ChangeStatusDialog from './ChangeStatusDialog';
import EditVehicleDialog from './EditVehicleDialog';
import { PermissionGate } from '@/components/PermissionGate';

interface ViewVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegisterGps?: (vehicleId: string) => void;
}

// ─── tipos locais para o histórico ───────────────────────────────────────────
interface TripRow {
  id: string; trip_code: string; start_date: string; end_date: string | null;
  origin: string | null; destination: string | null; status: string;
  start_mileage: number; end_mileage: number | null; driver_name?: string;
}
interface MaintenanceRow {
  id: string; entry_date: string; exit_date: string | null; description: string;
  status: string; total_cost: number; category_name?: string; workshop_name?: string;
  vehicle_mileage: number;
}

export default function ViewVehicleDialog({ open, onOpenChange, onRegisterGps }: ViewVehicleDialogProps) {
  const { state: { selectedVehicle }, dispatch } = useVehicles();
  const { reloadActiveImeis, state: trackingState, isConnected: trackingConnected } = useTracking();
  const { t } = useTranslation();
  const canLinkGps = usePermission('vehicle:link-device');
  const canUnlinkGps = usePermission('vehicle:unlink-device');
  const canToggleTracking = usePermission('vehicle:toggle-tracking');

  // 2026-09-18 — syncDevices() (backend) deliberadamente NUNCA desvincula um
  // device sozinho quando este deixa de aparecer no Traccar real (evita
  // perder o histórico por um blip transitório do servidor) — mas também
  // não avisava ninguém, deixando a decisão de investigar/desligar
  // inteiramente por acaso. `trackingState.devices` já é a lista ao vivo do
  // Traccar (via socket); se o IMEI do veículo não aparece lá, o device
  // pode ter sido apagado/renomeado no servidor Traccar por fora desta app.
  const linkedTraccarDevice = selectedVehicle?.traccar_unique_id
    ? trackingState.devices.find(d => d.uniqueId === selectedVehicle.traccar_unique_id)
    : undefined;
  const gpsDeviceMissingFromTraccar = !!selectedVehicle?.traccar_unique_id && !linkedTraccarDevice;

  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'telemetry'>('details');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [refuelings, setRefuelings] = useState<IRefueling[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);

  const [mileageDialogOpen, setMileageDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmRemoveGps, setConfirmRemoveGps] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset ao fechar ou trocar de veículo
  useEffect(() => {
    if (!open) {
      setActiveTab('details');
      setHistoryLoaded(false);
      setTrips([]); setRefuelings([]); setMaintenances([]);
    }
  }, [open]);

  useEffect(() => {
    if (activeTab === 'history' && !historyLoaded && selectedVehicle) {
      loadHistory();
    }
  }, [activeTab, historyLoaded, selectedVehicle?.id]);

  async function loadHistory() {
    if (!selectedVehicle) return;
    setHistoryLoading(true);
    try {
      const [tripsRes, refuelRes, mntRes] = await Promise.all([
        window._trips.getAll({ vehicle_id: selectedVehicle.id, limit: 100 }),
        getRefuelingsByVehicle(selectedVehicle.id),
        window._maintenances.getAll({ vehicle_id: selectedVehicle.id, limit: 100 }),
      ]);
      setTrips(tripsRes.data as TripRow[]);
      setRefuelings(refuelRes as IRefueling[]);
      setMaintenances(mntRes.data as MaintenanceRow[]);
      setHistoryLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleRemoveGps() {
    if (!selectedVehicle) return;
    setIsLoading(true);
    try {
      await unregisterVehicleGps(selectedVehicle.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = { ...selectedVehicle, traccar_unique_id: null, tracking_enabled: false } as any;
      dispatch({ type: 'UPDATE_VEHICLE', payload: updated });
      dispatch({ type: 'SELECT_VEHICLE', payload: updated });
      reloadActiveImeis(); // update map filter — remove old IMEI from activeImeis/linkedImeis
      toast.success(t('vehicles:toast.gpsRemoved'));
    } catch {
      toast.error(t('vehicles:toast.gpsRemoveError'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleTracking(enabled: boolean) {
    if (!selectedVehicle) return;
    try {
      await toggleVehicleTracking(selectedVehicle.id, enabled);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = { ...selectedVehicle, tracking_enabled: enabled } as any;
      dispatch({ type: 'UPDATE_VEHICLE', payload: updated });
      dispatch({ type: 'SELECT_VEHICLE', payload: updated });
      toast.success(enabled
        ? t('vehicles:toast.trackingEnabled')
        : t('vehicles:toast.trackingDisabled')
      );
      reloadActiveImeis(); // actualiza o filtro do mapa
    } catch {
      toast.error(t('vehicles:toast.trackingError'));
    }
  }

  if (!selectedVehicle || !open) return null;

  const getStatusConfig = (status: string) => {
    const configs = {
      available: { 
        label: t('vehicles:status.available.label'),
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        ring: 'ring-emerald-500',
        desc: t('vehicles:status.available.description')
      },
      in_use: { 
        label: t('vehicles:status.in_use.label'),
        icon: Clock,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        ring: 'ring-blue-500',
        desc: t('vehicles:status.in_use.description')
      },
      maintenance: { 
        label: t('vehicles:status.maintenance.label'), 
        icon: Settings2,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        ring: 'ring-amber-500',
        desc: t('vehicles:status.maintenance.description')
      },
      inactive: { 
        label: t('vehicles:status.inactive.label'), 
        icon: Ban,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        ring: 'ring-slate-500',
        desc: t('vehicles:status.inactive.description')
      },
    };
    return configs[status as keyof typeof configs] || configs.available;
  };

  const statusConfig = getStatusConfig(selectedVehicle.status);
  const StatusIcon = statusConfig.icon;

  // ─── helpers de formatação ────────────────────────────────────────────────────
  function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-AO');
  }
  function fmtCost(n: number) {
    return n.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });
  }
  function tripStatusBadge(s: string) {
    const map: Record<string, { label: string; cls: string }> = {
      in_progress: { label: t('trips:status.in_progress.label'), cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400' },
      completed:   { label: t('trips:status.completed.label'),   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' },
      cancelled:   { label: t('trips:status.cancelled.label'),   cls: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400' },
    };
    const info = map[s] || map.completed;
    return <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-bold', info.cls)}>{info.label}</Badge>;
  }
  function mntStatusBadge(s: string) {
    const map: Record<string, { label: string; cls: string }> = {
      in_progress: { label: t('maintenances:status.in_progress.label'), cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400' },
      completed:   { label: t('maintenances:status.completed.label'),   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' },
      scheduled:   { label: t('maintenances:status.scheduled.label'),   cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400' },
      cancelled:   { label: t('maintenances:status.cancelled.label'),   cls: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400' },
    };
    const info = map[s] || map.in_progress;
    return <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-bold', info.cls)}>{info.label}</Badge>;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold font-mono">
                  {selectedVehicle.license_plate}
                </DialogTitle>
                <p className="text-muted-foreground mt-1">
                  {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-full text-xs uppercase tracking-wider",
                    statusConfig.bg,
                    statusConfig.color,
                    statusConfig.border
                  )}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig.label}
                </Badge>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {!(selectedVehicle as any).tracking_enabled && (selectedVehicle as any).traccar_unique_id && (
                  <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40 text-xs">
                    {t('vehicles:gps.trackingPaused')}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* ── Tabs ── */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'history' | 'telemetry')}>
            <TabsList className={`w-full grid mb-2 bg-muted/40 border-border h-9 p-1 ${selectedVehicle.traccar_unique_id ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="details" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-border/50 dark:data-[state=active]:bg-white/12 dark:data-[state=active]:text-foreground dark:data-[state=active]:border-white/10">
                <Truck className="w-3.5 h-3.5" />
                {t('vehicles:dialogs.view.tabDetails', 'Detalhes')}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-border/50 dark:data-[state=active]:bg-white/12 dark:data-[state=active]:text-foreground dark:data-[state=active]:border-white/10">
                <FileText className="w-3.5 h-3.5" />
                {t('vehicles:dialogs.view.tabHistory', 'Histórico')}
              </TabsTrigger>
              {selectedVehicle.traccar_unique_id && (
                <TabsTrigger value="telemetry" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-border/50 dark:data-[state=active]:bg-white/12 dark:data-[state=active]:text-foreground dark:data-[state=active]:border-white/10">
                  <Radio className="w-3.5 h-3.5" />
                  Telemetria
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── TAB: DETALHES ── */}
            <TabsContent value="details" className="mt-0">
          <div className="space-y-6">
            {/* AÇÕES RÁPIDAS - Cards clicáveis */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                <RotateCcw className="w-3 h-3" /> {t('vehicles:dialogs.view.quickUpdates')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Atualizar Km */}
                <PermissionGate permission="vehicle:update"><button
                  onClick={() => setMileageDialogOpen(true)}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-50/50 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('vehicles:fields.mileage')}</p>
                    <p className="font-bold text-sm mt-0.5">{t('vehicles:actions.updateMileage')}</p>
                  </div>
                </button></PermissionGate>

                {/* Alterar Status */}
                <PermissionGate permission="vehicle:update"><button
                  onClick={() => setStatusDialogOpen(true)}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-card hover:border-blue-500/50 hover:bg-blue-50/50 transition-all text-left group"
                  disabled={selectedVehicle.status === 'in_use'}
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('vehicles:fields.status')}</p>
                    <p className="font-bold text-sm mt-0.5">
                      {selectedVehicle.status === 'in_use' ? t('vehicles:dialogs.status.inUseBlocked') : t('vehicles:actions.changeStatus')}
                    </p>
                  </div>
                </button></PermissionGate>

                {/* Editar Dados */}
                <PermissionGate permission="vehicle:update"><button
                  onClick={() => setEditDialogOpen(true)}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-card hover:border-purple-500/50 hover:bg-purple-50/50 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Edit className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('vehicles:dialogs.view.vehicleData')}</p>
                    <p className="font-bold text-sm mt-0.5">{t('vehicles:actions.editData')}</p>
                  </div>
                </button></PermissionGate>

                {/* Ver Categoria */}
                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-muted/30">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ 
                      backgroundColor: `${selectedVehicle.category_color}20`,
                      color: selectedVehicle.category_color 
                    }}
                  >
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('vehicles:fields.category')}</p>
                    <p className="font-bold text-sm mt-0.5">{selectedVehicle.category_name}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Informações agrupadas em cards */}
            <div className="space-y-4">
              {/* Dados Principais */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <Truck className="w-3 h-3" /> {t('vehicles:dialogs.view.vehicleData')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">{t('vehicles:fields.brand')} / {t('vehicles:fields.model')}</p>
                    <p className="font-medium">{selectedVehicle.brand} {selectedVehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('vehicles:fields.year')}</p>
                    <p className="font-medium">{selectedVehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('vehicles:fields.color')}</p>
                    <div className="flex items-center gap-2">
                      {selectedVehicle.color && (
                        <div 
                          className="w-3 h-3 rounded-full border border-muted"
                          style={{ backgroundColor: selectedVehicle.color.toLowerCase() === 'branco' ? '#f8fafc' : selectedVehicle.color.toLowerCase() }}
                        />
                      )}
                      <p className="font-medium">{selectedVehicle.color || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('vehicles:fields.mileage')}</p>
                    <p className="font-medium font-mono">
                      {selectedVehicle.current_mileage?.toLocaleString('pt-AO') || '0'} km
                    </p>
                  </div>
                </div>
              </div>

              {/* Dados Técnicos */}
              {(selectedVehicle.chassis_number || selectedVehicle.engine_number || selectedVehicle.fuel_tank_capacity || selectedVehicle.tire_size) && (
                <div className="p-4 bg-muted/30 rounded-xl">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                    <Hash className="w-3 h-3" /> {t('vehicles:dialogs.view.technicalData')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedVehicle.chassis_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">{t('vehicles:fields.chassisNumber')}</span>
                        <span className="font-mono font-medium text-xs">{selectedVehicle.chassis_number}</span>
                      </div>
                    )}
                    {selectedVehicle.engine_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">{t('vehicles:fields.engineNumber')}</span>
                        <span className="font-mono font-medium text-xs">{selectedVehicle.engine_number}</span>
                      </div>
                    )}
                    {!!selectedVehicle.fuel_tank_capacity && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">{t('vehicles:fields.fuelTankCapacity')}</span>
                        <span className="font-medium">{selectedVehicle.fuel_tank_capacity} L</span>
                      </div>
                    )}
                     {selectedVehicle.tire_size && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">{t('vehicles:fields.tireSize')}</span>
                        <span className="font-mono font-medium text-xs">{selectedVehicle.tire_size}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aquisição */}
              {(!!selectedVehicle.acquisition_date || !!selectedVehicle.acquisition_value) && (
                <div className="p-4 bg-muted/30 rounded-xl">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> {t('vehicles:dialogs.view.acquisition')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {!!selectedVehicle.acquisition_date && (
                      <div>
                        <p className="text-muted-foreground text-xs">{t('vehicles:fields.acquisitionDate')}</p>
                        <p className="font-medium">
                          {new Date(selectedVehicle.acquisition_date).toLocaleDateString('pt-AO')}
                        </p>
                      </div>
                    )}
                    {!!selectedVehicle.acquisition_value && (
                      <div>
                        <p className="text-muted-foreground text-xs">{t('vehicles:fields.acquisitionValue')}</p>
                        <p className="font-medium">
                          {(selectedVehicle.acquisition_value / 100).toLocaleString('pt-AO', {
                            style: 'currency',
                            currency: 'AOA'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GPS */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <Wifi className="w-3 h-3" /> {t('vehicles:dialogs.view.syncInfo')}
                </h3>
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">{t('vehicles:dialogs.view.gpsDevice')}</p>
                    {selectedVehicle.traccar_unique_id ? (
                      <div className="flex items-start gap-1.5 mt-0.5 flex-wrap">
                        <Wifi className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="font-medium font-mono text-xs flex-1 break-all">{selectedVehicle.traccar_unique_id}</span>
                        {gpsDeviceMissingFromTraccar && (
                          <div className="flex items-center gap-1.5 w-full rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-[11px] leading-tight">{t('vehicles:dialogs.view.gpsDeviceMissing')}</span>
                          </div>
                        )}
                        {canUnlinkGps && (
                          <div className="flex gap-2 w-full mt-1">
                            {/* Para mudar IMEI: remover GPS e registar novo — ver web module (futuro) */}
                            <button
                              onClick={() => setConfirmRemoveGps(true)}
                              disabled={isLoading}
                              className="text-[11px] text-destructive hover:text-destructive/80 underline disabled:opacity-50"
                            >
                              Remover GPS
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <WifiOff className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-muted-foreground flex-1">{t('vehicles:dialogs.view.noGps')}</span>
                        {canLinkGps && (
                          <button
                            onClick={() => { onRegisterGps?.(selectedVehicle.id); }}
                            className="text-[11px] text-blue-500 hover:text-blue-600 underline flex-shrink-0"
                          >
                            Registar GPS
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Tracking toggle — shown only when GPS is registered */}
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const v = selectedVehicle as any;
                  if (!v.traccar_unique_id || !canToggleTracking) return null;
                  return (
                    <div className="mt-3 flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{t('vehicles:gps.trackingLabel')}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.tracking_enabled
                            ? t('vehicles:gps.trackingEnabledDesc')
                            : t('vehicles:gps.trackingDisabledDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={!!v.tracking_enabled}
                        onCheckedChange={handleToggleTracking}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Registos */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> {t('vehicles:dialogs.view.registrationInfo')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">{t('vehicles:fields.createdAt')}</p>
                    <p className="font-medium">
                      {selectedVehicle.created_at
                        ? new Date(selectedVehicle.created_at).toLocaleDateString('pt-AO')
                        : '-'
                      }
                    </p>
                  </div>
                  {selectedVehicle.updated_at && selectedVehicle.updated_at !== selectedVehicle.created_at && (
                    <div>
                      <p className="text-muted-foreground text-xs">{t('vehicles:fields.updatedAt')}</p>
                      <p className="font-medium">
                        {new Date(selectedVehicle.updated_at).toLocaleDateString('pt-AO')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              {selectedVehicle.notes && (
                <div className="p-4 bg-muted/30 rounded-xl">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> {t('vehicles:fields.notes')}
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedVehicle.notes}</p>
                </div>
              )}
            </div>


              <div className="text-center text-xs text-muted-foreground pt-2">
                <p>{t('vehicles:dialogs.view.fullEditHint')}</p>
              </div>
          </div>{/* space-y-6 */}
            </TabsContent>

            {/* ── TAB: HISTÓRICO ── */}
            <TabsContent value="history" className="mt-0 space-y-5">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">{t('common:loading')}...</p>
                </div>
              ) : (
                <>
                  {/* Viagens */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Route className="w-3.5 h-3.5" />
                      {t('navigation:menu.trips')} ({trips.length})
                    </h3>
                    {trips.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">{t('vehicles:history.noTrips', 'Sem viagens registadas')}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {trips.map(trip => (
                          <div key={trip.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-muted/40 text-xs">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono font-bold text-foreground/80">{trip.trip_code}</span>
                                {tripStatusBadge(trip.status)}
                              </div>
                              <span className="text-muted-foreground truncate block">
                                {trip.origin || '—'} <ChevronRight className="w-3 h-3 inline" /> {trip.destination || '—'}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-muted-foreground">{fmtDate(trip.start_date)}</p>
                              {trip.end_mileage && trip.start_mileage && (
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {(trip.end_mileage - trip.start_mileage).toLocaleString()} km
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Abastecimentos */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5" />
                      {t('navigation:menu.fuel')} ({refuelings.length})
                    </h3>
                    {refuelings.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">{t('vehicles:history.noFuel', 'Sem abastecimentos registados')}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {refuelings.map(r => (
                          <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-muted/40 text-xs">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-foreground/80">{r.liters.toLocaleString('pt-AO')} L</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
                                  {r.fuel_type}
                                </Badge>
                              </div>
                              <span className="text-muted-foreground">
                                {r.station_name || t('vehicles:history.noStation', 'Posto desconhecido')}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-muted-foreground">{fmtDate(r.refueling_date)}</p>
                              <p className="font-mono text-[10px] font-bold text-foreground/70">{fmtCost(r.total_cost)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Manutenções */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      {t('navigation:menu.maintenance')} ({maintenances.length})
                    </h3>
                    {maintenances.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">{t('vehicles:history.noMaintenance', 'Sem manutenções registadas')}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {maintenances.map(m => (
                          <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-muted/40 text-xs">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-foreground/80 truncate max-w-[180px]">{m.description}</span>
                                {mntStatusBadge(m.status)}
                              </div>
                              <span className="text-muted-foreground">
                                {m.category_name || '—'}{m.workshop_name ? ` · ${m.workshop_name}` : ''}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-muted-foreground">{fmtDate(m.entry_date)}</p>
                              {m.total_cost > 0 && (
                                <p className="font-mono text-[10px] font-bold text-foreground/70">{fmtCost(m.total_cost)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── TAB: TELEMETRIA ── */}
            {selectedVehicle.traccar_unique_id && (() => {
              const trackedDevice = trackingState.devices.find(
                d => d.uniqueId === selectedVehicle.traccar_unique_id
              );
              const livePosition = trackedDevice
                ? trackingState.positions.find(p => p.deviceId === trackedDevice.traccar_id)
                : null;
              const isOnline = trackedDevice?.status === 'online';
              const recentAlerts = trackingState.alerts
                .filter(a => a.vehicleId === selectedVehicle.id || (trackedDevice && a.deviceId === trackedDevice.traccar_id))
                .slice(0, 8);

              const alertMeta: Record<string, { icon: React.ElementType; color: string; label: string }> = {
                geofenceEnter:  { icon: LogIn,         color: 'text-green-500',   label: t('tracking:alertDetail.events.geofenceEnter') },
                geofenceExit:   { icon: LogOut,        color: 'text-amber-500',   label: t('tracking:alertDetail.events.geofenceExit')  },
                speedLimit:     { icon: AlertTriangle, color: 'text-red-500',     label: t('tracking:alertDetail.events.speedLimit')    },
                ignitionOn:     { icon: Zap,           color: 'text-emerald-500', label: t('tracking:alertDetail.events.ignitionOn')    },
                ignitionOff:    { icon: ZapOff,        color: 'text-slate-500',   label: t('tracking:alertDetail.events.ignitionOff')   },
                deviceMoving:   { icon: Activity,      color: 'text-blue-500',    label: t('tracking:alertDetail.events.deviceMoving')  },
                deviceStopped:  { icon: MapPin,        color: 'text-purple-500',  label: t('tracking:alertDetail.events.deviceStopped') },
              };

              const courseToDir = (course?: number) => {
                if (course == null) return '—';
                const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                return dirs[Math.round(course / 45) % 8];
              };

              return (
                <TabsContent value="telemetry" className="mt-0 space-y-4">
                  {/* Cabeçalho de estado */}
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                      <div>
                        <p className="text-sm font-semibold">
                          {isOnline ? t('vehicles:telemetry.onlineRealtime') : t('vehicles:telemetry.offline')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          IMEI: {selectedVehicle.traccar_unique_id}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isOnline ? 'default' : 'secondary'} className={isOnline ? 'bg-green-500 text-white' : ''}>
                      {isOnline ? t('vehicles:telemetry.online') : t('vehicles:telemetry.offline')}
                    </Badge>
                  </div>

                  {livePosition ? (
                    <>
                      {/* Métricas em tempo real */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 border text-center">
                          <Gauge className="w-5 h-5 text-blue-500 mb-1" />
                          <p className="text-2xl font-black">
                            {Math.round(livePosition.speed ?? 0)}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">km/h</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 border text-center">
                          <Navigation className="w-5 h-5 text-purple-500 mb-1" />
                          <p className="text-2xl font-black">
                            {courseToDir(livePosition.course)}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('vehicles:telemetry.direction')}</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 border text-center">
                          <MapPin className="w-5 h-5 text-green-500 mb-1" />
                          <p className="text-sm font-black leading-tight">
                            {livePosition.latitude.toFixed(4)}<br />
                            {livePosition.longitude.toFixed(4)}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{t('vehicles:telemetry.coordinates')}</p>
                        </div>
                      </div>

                      {/* Última actualização */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                        <Clock className="w-3.5 h-3.5" />
                        {t('vehicles:telemetry.lastPosition')}: {new Date(livePosition.timestamp).toLocaleString('pt-PT')}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
                      <Wifi className="w-8 h-8 opacity-30" />
                      <p className="text-sm">{t('vehicles:telemetry.noPosition')}</p>
                      <p className="text-xs opacity-70">
                        {trackingConnected
                          ? t('vehicles:telemetry.awaitingData')
                          : t('vehicles:telemetry.notConnected')}
                      </p>
                    </div>
                  )}

                  {/* Alertas recentes */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {t('vehicles:telemetry.recentAlerts')}
                    </p>
                    {recentAlerts.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">
                        {t('vehicles:telemetry.noAlerts')}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {recentAlerts.map(alert => {
                          const meta = alertMeta[alert.eventType] ?? { icon: Activity, color: 'text-slate-500', label: alert.eventType };
                          const Icon = meta.icon;
                          return (
                            <div key={alert.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-muted/50">
                              <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold leading-tight truncate">{meta.label}</p>
                                {alert.geofenceName && (
                                  <p className="text-[10px] text-muted-foreground truncate">{alert.geofenceName}</p>
                                )}
                                {alert.speed != null && (
                                  <p className="text-[10px] text-muted-foreground">{Math.round(alert.speed)} km/h</p>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(alert.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })()}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <UpdateMileageDialog open={mileageDialogOpen} onOpenChange={setMileageDialogOpen} />
      <ChangeStatusDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen} />
      <EditVehicleDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} />

      {/* Confirmação de remoção de GPS */}
      <AlertDialog open={confirmRemoveGps} onOpenChange={setConfirmRemoveGps}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-destructive" />
              {t('vehicles:gps.removeDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t('vehicles:gps.removeDialog.description')}
              </span>
              <span className="block text-foreground/80 font-medium">
                {t('vehicles:gps.removeDialog.consequence')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveGps}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('vehicles:gps.removeDialog.removing')}</>
                : t('vehicles:gps.removeDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}