// ========================================
// FILE: src/components/refueling/EditRefuelingDialog.tsx
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Car, User, MapPin, Gauge, Droplets,
  FileText, Route, Calculator, CheckCircle2, Link2, Pencil, Trash2, Loader2,
} from 'lucide-react';
import { updateRefueling, deleteRefueling } from '@/helpers/refueling-helpers';
import { getAllVehicles } from '@/helpers/vehicle-helpers';
import { getAllDrivers } from '@/helpers/driver-helpers';
import { getActiveTrips } from '@/helpers/trip-helpers';
import { IUpdateRefueling } from '@/lib/types/refueling';
import { useRefuelings } from '@/contexts/RefuelingsContext';

const FUEL_TYPES = [
  { value: 'gasoline', label: 'refuelings:fuelTypes.gasoline', icon: '⛽' },
  { value: 'diesel',   label: 'refuelings:fuelTypes.diesel',   icon: '🛢️' },
  { value: 'ethanol',  label: 'refuelings:fuelTypes.ethanol',  icon: '🌱' },
  { value: 'cng',      label: 'refuelings:fuelTypes.cng',      icon: '🔥' },
];

interface EditRefuelingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback opcional após eliminar — ex: fechar ViewRefuelingDialog pai */
  onDeleted?: () => void;
  onSuccess?: () => void;
}

export default function EditRefuelingDialog({
  open, onOpenChange, onDeleted, onSuccess,
}: EditRefuelingDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const {
    state: { fuelStations, selectedRefueling },
    updateRefueling: updateInContext,
    deleteRefueling: deleteFromContext,
  } = useRefuelings();

  const [isLoading,        setIsLoading]       = useState(false);
  const [isDeleting,       setIsDeleting]      = useState(false);
  const [confirmDelete,    setConfirmDelete]   = useState(false);
  const [vehicles,         setVehicles]        = useState<any[]>([]);
  const [drivers,          setDrivers]         = useState<any[]>([]);
  const [trips,            setTrips]           = useState<any[]>([]);
  const [autoFilledDriver, setAutoFilledDriver] = useState(false);

  // ── SEPARAÇÃO CRÍTICA ────────────────────────────────────────────────────
  // IUpdateRefueling NÃO tem vehicle_id (veículo é imutável após criação).
  // O campo veículo é exibido como read-only. Nunca entra no formData nem no submit.
  const [formData, setFormData] = useState<IUpdateRefueling>({
    driver_id:       undefined,
    station_id:      undefined,
    trip_id:         undefined,
    fuel_type:       'diesel',
    liters:          0,
    price_per_liter: 0,
    current_mileage: 0,
    is_full_tank:    true,
    invoice_number:  '',
    notes:           '',
  });

  // ── Carregar listas auxiliares ────────────────────────────────────────────
  useEffect(() => {
    if (open) loadData();
  }, [open]);

  // ── Popular form quando selectedRefueling muda ───────────────────────────
  useEffect(() => {
    if (!selectedRefueling || !open) return;

    setFormData({
      driver_id:       selectedRefueling.driver_id       ?? undefined,
      station_id:      selectedRefueling.station_id      ?? undefined,
      trip_id:         selectedRefueling.trip_id         ?? undefined,
      fuel_type:       selectedRefueling.fuel_type as any,
      liters:          selectedRefueling.liters,
      price_per_liter: selectedRefueling.price_per_liter,
      current_mileage: selectedRefueling.current_mileage,
      is_full_tank:    selectedRefueling.is_full_tank,
      invoice_number:  selectedRefueling.invoice_number  ?? '',
      notes:           selectedRefueling.notes           ?? '',
      refueling_date:  selectedRefueling.refueling_date,
    });
    setAutoFilledDriver(false);
  }, [selectedRefueling, open]);

  async function loadData() {
    try {
      const [vData, dData, tData] = await Promise.all([
        getAllVehicles({ limit: 10000 }),
        getAllDrivers({ limit: 10000 }),
        getActiveTrips(),
      ]);
      setVehicles(vData.data.filter((v: any) => v.status !== 'inactive'));
      setDrivers(dData.data.filter((d: any) => d.is_active === true));
      const tripsArr = tData;
      setTrips(tripsArr);

      // Re-derivar autoFilledDriver após trips carregadas
      if (selectedRefueling?.trip_id && selectedRefueling?.driver_id) {
        const trip = tripsArr.find((tr: any) => tr.id === selectedRefueling.trip_id);
        if (trip?.driver_id === selectedRefueling.driver_id) setAutoFilledDriver(true);
      }
    } catch (error) {
      handleError(error, 'common:errors.loadingData');
    }
  }

  // ── Submit (update) ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRefueling) return;

    setIsLoading(true);
    try {
      const updated = await updateRefueling(selectedRefueling.id, formData);
      if (updated) {
        updateInContext(updated);
        showSuccess('refuelings:toast.updateSuccess');
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error) {
      handleError(error, 'refuelings:toast.updateError');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
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
        onDeleted?.();
      }
    } catch (error) {
      handleError(error, 'refuelings:toast.deleteError');
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Handlers viagem / motorista ───────────────────────────────────────────
  function handleTripChange(value: string) {
    const tripId = value === 'none' ? undefined : value;
    const trip   = trips.find((t) => t.id === tripId);
    if (trip?.driver_id) {
      setFormData(p => ({ ...p, trip_id: tripId, driver_id: trip.driver_id }));
      setAutoFilledDriver(true);
    } else {
      setFormData(p => ({ ...p, trip_id: tripId, driver_id: undefined }));
      setAutoFilledDriver(false);
    }
  }

  function handleDriverChange(value: string) {
    setFormData(p => ({ ...p, driver_id: value === 'none' ? undefined : value }));
    setAutoFilledDriver(false);
  }

  // ── Derivados ─────────────────────────────────────────────────────────────
  const totalCost     = (formData.liters ?? 0) * (formData.price_per_liter ?? 0);
  // Veículo deriva SEMPRE de selectedRefueling, nunca de formData
  const selectedVehicle = vehicles.find(v => v.id === selectedRefueling?.vehicle_id);
  const selectedTrip    = trips.find(t => t.id === formData.trip_id);
  const selectedDriver  = drivers.find(d => d.id === formData.driver_id);
  const activeStations  = fuelStations.filter(s => s.is_active);
  // Viagens filtradas pelo veículo do registo (imutável)
  const filteredTrips   = selectedRefueling?.vehicle_id
    ? trips.filter(t => t.vehicle_id === selectedRefueling.vehicle_id)
    : trips;

  // ── Opções SearchableSelect ───────────────────────────────────────────────
  const driverOptions: SearchableSelectOption[] = drivers.map(d => ({
    value: d.id,
    searchText: `${d.name} ${d.license_number ?? ''}`,
    label: (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {d.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="truncate">{d.name}</span>
          {d.license_number && <span className="text-xs text-muted-foreground font-mono">{d.license_number}</span>}
        </div>
      </div>
    ),
    selectedLabel: <span>{d.name}</span>,
  }));

  const stationOptions: SearchableSelectOption[] = activeStations.map(s => ({
    value: s.id,
    searchText: `${s.name} ${s.brand ?? ''}`,
    label: (
      <div className="flex items-center justify-between w-full gap-3">
        <span>{s.name}</span>
        {s.brand && <Badge variant="outline" className="text-[10px]">{s.brand}</Badge>}
      </div>
    ),
    selectedLabel: <span>{s.name}{s.brand ? ` — ${s.brand}` : ''}</span>,
  }));

  if (!selectedRefueling) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {/* Título + botão Eliminar no mesmo header */}
            <div className="flex items-start justify-between pr-8">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Pencil className="w-5 h-5 text-primary" />
                  {t('refuelings:dialogs.edit.title')}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {t('refuelings:dialogs.edit.description')}
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 shrink-0 mt-0.5"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4" />
                {t('common:actions.delete')}
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">

            {/* ── Secção 1: Identificação ──────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Car className="w-4 h-4" />
                {t('refuelings:sections.identification')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Veículo — READ-ONLY: vehicle_id nunca entra em IUpdateRefueling */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('refuelings:fields.vehicle')}</Label>
                  <div className="h-10 flex items-center px-3 rounded-md bg-muted/50 border border-input gap-2 cursor-not-allowed">
                    <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-mono font-bold text-sm truncate">
                      {selectedVehicle
                        ? `${selectedVehicle.license_plate} — ${selectedVehicle.brand} ${selectedVehicle.model}`
                        : selectedRefueling.vehicle_license ?? '—'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {t('refuelings:fields.currentMileage')}:{' '}
                    {selectedVehicle?.current_mileage?.toLocaleString('pt-PT') ?? '—'} km
                  </p>
                </div>

                {/* Viagem — filtrada pelo veículo imutável do registo */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Route className="w-3.5 h-3.5" />
                    {t('refuelings:fields.trip')}
                  </Label>
                  <Select value={formData.trip_id || 'none'} onValueChange={handleTripChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('refuelings:placeholders.selectTrip')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('common:none')}</SelectItem>
                      {filteredTrips.map(trip => (
                        <SelectItem key={trip.id} value={trip.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{trip.route_name || trip.destination}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(trip.start_date).toLocaleDateString('pt-PT')} • {trip.driver_name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTrip && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="truncate">{selectedTrip.route_name || selectedTrip.destination}</span>
                    </div>
                  )}
                </div>

                {/* Motorista */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {t('refuelings:fields.driver')}
                    </Label>
                    {autoFilledDriver && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        <Link2 className="w-3 h-3 mr-1" />
                        {t('refuelings:info.auto')}
                      </Badge>
                    )}
                  </div>
                  <SearchableSelect
                    options={driverOptions}
                    value={formData.driver_id || 'none'}
                    onValueChange={handleDriverChange}
                    placeholder={t('refuelings:placeholders.selectDriver')}
                    searchPlaceholder="Pesquisar por nome ou carta..."
                    emptyMessage={t('common:noResults')}
                    noneOption={{ value: 'none', label: t('common:none') }}
                    popoverMinWidth={280}
                    className={cn(autoFilledDriver && 'border-primary/50 bg-primary/5')}
                  />
                  {autoFilledDriver && selectedDriver && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      {t('refuelings:info.driverLinkedToTrip', { driver: selectedDriver.name })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Secção 2: Local e Tipo ───────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                {t('refuelings:sections.location')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('refuelings:fields.station')}</Label>
                  <SearchableSelect
                    options={stationOptions}
                    value={formData.station_id || 'none'}
                    onValueChange={v => setFormData(p => ({ ...p, station_id: v === 'none' ? undefined : v }))}
                    placeholder={t('refuelings:placeholders.selectStation')}
                    searchPlaceholder="Pesquisar por nome ou marca..."
                    emptyMessage={t('common:noResults')}
                    noneOption={{ value: 'none', label: t('common:none') }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5" />
                    {t('refuelings:fields.fuelType')}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Select
                    value={formData.fuel_type}
                    onValueChange={v => setFormData(p => ({ ...p, fuel_type: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('refuelings:placeholders.selectFuelType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(ft => (
                        <SelectItem key={ft.value} value={ft.value}>
                          <div className="flex items-center gap-2">
                            <span>{ft.icon}</span>
                            <span>{t(ft.label)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Secção 3: Quantidades ────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Calculator className="w-4 h-4" />
                {t('refuelings:sections.quantities')}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('refuelings:fields.mileage')}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number" min="0" placeholder="0"
                      value={formData.current_mileage || ''}
                      onChange={e => setFormData(p => ({ ...p, current_mileage: parseInt(e.target.value) || 0 }))}
                      className="pr-10 font-mono" required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">km</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('refuelings:fields.liters')}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={formData.liters || ''}
                      onChange={e => setFormData(p => ({ ...p, liters: parseFloat(e.target.value) || 0 }))}
                      className="pr-8 font-mono" required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">L</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('refuelings:fields.pricePerLiter')}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={formData.price_per_liter || ''}
                      onChange={e => setFormData(p => ({ ...p, price_per_liter: parseFloat(e.target.value) || 0 }))}
                      className="pl-8 font-mono" required
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">Kz</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-primary">{t('refuelings:fields.totalCost')}</Label>
                  <div className="h-10 flex items-center px-3 rounded-md bg-primary/10 border border-primary/20">
                    <span className="font-bold text-primary font-mono">
                      {totalCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="ml-1 text-xs text-primary/70">Kz</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Secção 4: Detalhes ───────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                {t('refuelings:sections.details')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                  <Checkbox
                    id="edit_is_full_tank"
                    checked={!!formData.is_full_tank}
                    onCheckedChange={v => setFormData(p => ({ ...p, is_full_tank: v as boolean }))}
                  />
                  <label htmlFor="edit_is_full_tank" className="text-sm font-medium cursor-pointer flex-1">
                    {t('refuelings:fields.fullTank')}
                  </label>
                  {formData.is_full_tank && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('refuelings:fields.invoiceNumber')}</Label>
                  <Input
                    placeholder="INV-2024-001"
                    value={formData.invoice_number || ''}
                    onChange={e => setFormData(p => ({ ...p, invoice_number: e.target.value }))}
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('refuelings:fields.notes')}</Label>
                  <Textarea
                    placeholder={t('refuelings:placeholders.addNotes')}
                    value={formData.notes || ''}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    rows={1} className="resize-none min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            {/* ── Resumo ───────────────────────────────────────────────────── */}
            {totalCost > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {formData.liters}L × {(formData.price_per_liter ?? 0).toLocaleString('pt-PT')} Kz
                  </span>
                  <span className="text-xl font-bold text-primary font-mono">
                    {totalCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedVehicle && (
                    <Badge variant="outline" className="gap-1">
                      <Car className="w-3 h-3" />{selectedVehicle.license_plate}
                    </Badge>
                  )}
                  {selectedTrip && (
                    <Badge variant="outline" className="gap-1">
                      <Route className="w-3 h-3" />{selectedTrip.route_name || selectedTrip.destination}
                    </Badge>
                  )}
                  {selectedDriver && (
                    <Badge variant="outline" className={cn('gap-1', autoFilledDriver && 'bg-primary/10')}>
                      <User className="w-3 h-3" />{selectedDriver.name}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('refuelings:actions.updating')}</>
                  : t('refuelings:actions.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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