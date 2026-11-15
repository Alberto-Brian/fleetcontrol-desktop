// ========================================
// FILE: src/components/trip/StartTripDialog.tsx
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Plus, Truck, User, MapPin, Gauge, Route as RouteIcon, ArrowRight, Link2 } from 'lucide-react';
import { createTrip as createTripHelper } from '@/helpers/trip-helpers';
import { getAvailableVehicles } from '@/helpers/vehicle-helpers';
import { getAvailableDrivers } from '@/helpers/driver-helpers';
import { getActiveRoutes } from '@/helpers/route-helpers';
import { ICreateTrip } from '@/lib/types/trip';
import { Separator } from '@/components/ui/separator';
import { useTrips } from '@/contexts/TripsContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PermissionGate } from '@/components/PermissionGate';

export default function StartTripDialog() {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { addTrip } = useTrips();

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [useRoute, setUseRoute] = useState(true);
  const [formData, setFormData] = useState<ICreateTrip>({
    vehicle_id: '',
    driver_id: '',
    route_id: '',
    start_mileage: 0,
    origin: '',
    destination: '',
    purpose: '',
    notes: '',
  });

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  async function loadData() {
    try {
      const [vehiclesData, driversData, routesData] = await Promise.all([
        getAvailableVehicles(),
        getAvailableDrivers(),
        getActiveRoutes(),
      ]);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setRoutes(routesData);
    } catch (error) {
      handleError(error, 'common:errors.loadingData');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (useRoute && !formData.route_id) {
      handleError(new Error('trips:alerts.selectRoute'), 'trips:alerts.selectRoute');
      return;
    }
    if (!useRoute && (!formData.origin || !formData.destination)) {
      handleError(new Error('trips:alerts.selectOriginDestination'), 'trips:alerts.selectOriginDestination');
      return;
    }

    setIsLoading(true);
    try {
      const tripData: ICreateTrip = useRoute
        ? { vehicle_id: formData.vehicle_id, driver_id: formData.driver_id, route_id: formData.route_id, start_mileage: formData.start_mileage, purpose: formData.purpose, notes: formData.notes }
        : { vehicle_id: formData.vehicle_id, driver_id: formData.driver_id, start_mileage: formData.start_mileage, origin: formData.origin, destination: formData.destination, purpose: formData.purpose, notes: formData.notes };

      const newTrip = await createTripHelper(tripData);
      if (newTrip) {
        addTrip(newTrip);
        showSuccess('trips:toast.createSuccess');
        setOpen(false);
        resetForm();
      }
    } catch (error: any) {
      handleError(error, 'trips:toast.createError');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({ vehicle_id: '', driver_id: '', route_id: '', start_mileage: 0, origin: '', destination: '', purpose: '', notes: '' });
    setUseRoute(true);
  }

  function handleRouteChange(routeId: string) {
    const selectedRoute = routes.find((r) => r.id === routeId);
    setFormData({ ...formData, route_id: routeId, origin: selectedRoute?.origin || '', destination: selectedRoute?.destination || '' });
  }

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicle_id);
  const selectedRoute = routes.find((r) => r.id === formData.route_id);

  // Opções para veículos — pesquisa por matrícula, marca, modelo
  const vehicleOptions: SearchableSelectOption[] = vehicles.map((v) => ({
    value: v.id,
    searchText: `${v.license_plate} ${v.brand} ${v.model}`,
    label: (
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold">{v.license_plate}</span>
        <span className="text-muted-foreground">—</span>
        <span>{v.brand} {v.model}</span>
      </div>
    ),
    selectedLabel: (
      <span className="font-mono font-semibold">{v.license_plate} — {v.brand} {v.model}</span>
    ),
  }));

  // Opções para motoristas — pesquisa por nome e carta de condução
  const driverOptions: SearchableSelectOption[] = drivers.map((d) => ({
    value: d.id,
    searchText: `${d.name} ${d.license_number ?? ''}`,
    label: (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {d.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="truncate">{d.name}</span>
          {d.license_number && (
            <span className="text-xs text-muted-foreground font-mono">{d.license_number}</span>
          )}
        </div>
      </div>
    ),
    selectedLabel: <span>{d.name}</span>,
  }));

  // Opções para rotas — pesquisa por nome, origem e destino
  const routeOptions: SearchableSelectOption[] = routes.map((r) => ({
    value: r.id,
    searchText: `${r.name} ${r.origin} ${r.destination}`,
    label: (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium">{r.name}</span>
        <span className="text-green-600 dark:text-green-400 text-sm">{r.origin}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-red-600 dark:text-red-400 text-sm">{r.destination}</span>
      </div>
    ),
    selectedLabel: (
      <span>{r.name} — {r.origin} → {r.destination}</span>
    ),
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="trip:create"><DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('trips:newTrip')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('trips:dialogs.start.title')}</DialogTitle>
          <DialogDescription>{t('trips:dialogs.start.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Veículo e Motorista */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                {t('trips:fields.vehicle')} *
              </Label>
              <SearchableSelect
                options={vehicleOptions}
                value={formData.vehicle_id}
                onValueChange={(value) => {
                  const vehicle = vehicles.find((v) => v.id === value);
                  setFormData({ ...formData, vehicle_id: value, start_mileage: vehicle?.current_mileage || 0 });
                }}
                placeholder={t('common:select')}
                searchPlaceholder={t('trips:placeholders.searchVehicle', 'Pesquisar por matrícula, marca...')}
                emptyMessage={t('trips:dialogs.start.noVehicles')}
              />
              {selectedVehicle && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  KM: {selectedVehicle.current_mileage?.toLocaleString('pt-PT')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('trips:fields.driver')} *
              </Label>
              <SearchableSelect
                options={driverOptions}
                value={formData.driver_id}
                onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                placeholder={t('common:select')}
                searchPlaceholder={t('trips:placeholders.searchDriver', 'Pesquisar por nome ou carta...')}
                emptyMessage={t('trips:dialogs.start.noDrivers')}
              />
            </div>
          </div>

          <Separator />

          {/* Toggle: Rota ou Manual */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <RouteIcon className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{t('trips:dialogs.start.tripType')}</p>
                  <p className="text-xs text-muted-foreground">
                    {useRoute ? t('trips:dialogs.start.useRoute') : t('trips:dialogs.start.useManual')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={useRoute ? 'default' : 'outline'}
                  onClick={() => { setUseRoute(true); setFormData({ ...formData, origin: '', destination: '' }); }}>
                  {t('common:route')}
                </Button>
                <Button type="button" size="sm" variant={!useRoute ? 'default' : 'outline'}
                  onClick={() => { setUseRoute(false); setFormData({ ...formData, route_id: '' }); }}>
                  {t('common:manual')}
                </Button>
              </div>
            </div>

            {useRoute ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <RouteIcon className="w-4 h-4" />
                    {t('trips:fields.route')} *
                  </Label>
                  <SearchableSelect
                    options={routeOptions}
                    value={formData.route_id}
                    onValueChange={handleRouteChange}
                    placeholder={t('trips:dialogs.start.selectRoute')}
                    searchPlaceholder={t('trips:placeholders.searchRoute', 'Pesquisar por nome, origem, destino...')}
                    emptyMessage={t('trips:dialogs.start.noRoutes')}
                  />
                </div>

                {selectedRoute && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <p className="font-semibold text-sm">{t('trips:dialogs.start.routeDetails')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t('trips:fields.origin')}</p>
                        <p className="font-medium text-green-700 dark:text-green-400">{selectedRoute.origin}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t('trips:fields.destination')}</p>
                        <p className="font-medium text-red-700 dark:text-red-400">{selectedRoute.destination}</p>
                      </div>
                      {selectedRoute.estimated_distance && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('trips:dialogs.start.estimatedDistance')}</p>
                          <p className="font-medium">{selectedRoute.estimated_distance.toLocaleString('pt-PT')} km</p>
                        </div>
                      )}
                      {selectedRoute.estimated_duration && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('trips:dialogs.start.estimatedDuration')}</p>
                          <p className="font-medium">{selectedRoute.estimated_duration}h</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    {t('trips:fields.origin')} *
                  </Label>
                  <Input
                    placeholder={t('trips:placeholders.origin')}
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    required={!useRoute}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" />
                    {t('trips:fields.destination')} *
                  </Label>
                  <Input
                    placeholder={t('trips:placeholders.destination')}
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    required={!useRoute}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* KM Inicial */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                {t('trips:fields.startMileage')} *
              </Label>
              {selectedVehicle && formData.start_mileage === selectedVehicle.current_mileage && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  <Link2 className="w-3 h-3 mr-1" />
                  {t('trips:info.auto', { mileage: selectedVehicle.current_mileage?.toLocaleString('pt-PT') })}
                </Badge>
              )}
            </div>
            <Input
              type="number"
              min="0"
              value={formData.start_mileage}
              onChange={(e) => setFormData({ ...formData, start_mileage: parseInt(e.target.value) || 0 })}
              className={cn(selectedVehicle && formData.start_mileage === selectedVehicle.current_mileage && 'border-primary/50 bg-primary/5')}
              required
            />
            {selectedVehicle && formData.start_mileage === selectedVehicle.current_mileage ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                {t('trips:info.mileageAutoFilled', { mileage: selectedVehicle.current_mileage })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('trips:dialogs.start.verifyMileage')}</p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>{t('trips:fields.notes')}</Label>
            <Textarea
              placeholder={t('trips:placeholders.notes')}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || vehicles.length === 0 || drivers.length === 0}>
              {isLoading ? t('trips:actions.starting') : t('trips:actions.start')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}