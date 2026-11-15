// ========================================
// FILE: src/components/maintenance/NewMaintenanceDialog.tsx
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Wrench, Plus, Truck, AlertCircle, Link2 } from 'lucide-react';
import { createMaintenance } from '@/helpers/maintenance-helpers';
import { getAllVehicles } from '@/helpers/vehicle-helpers';
import { getAllWorkshops } from '@/helpers/workshop-helpers';
import { ICreateMaintenance } from '@/lib/types/maintenance';
import { useMaintenances } from '@/contexts/MaintenancesContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';

const MAINTENANCE_TYPES = [
  { value: 'preventive', label: 'maintenances:type.preventive.label' },
  { value: 'corrective', label: 'maintenances:type.corrective.label' },
];

const PRIORITIES = [
  { value: 'low', label: 'maintenances:priority.low.label' },
  { value: 'normal', label: 'maintenances:priority.normal.label' },
  { value: 'high', label: 'maintenances:priority.high.label' },
  { value: 'urgent', label: 'maintenances:priority.urgent.label' },
];

interface NewMaintenanceDialogProps { onSuccess?: () => void; }
export default function NewMaintenanceDialog({ onSuccess }: NewMaintenanceDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { state: { categories }, addMaintenance } = useMaintenances();

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [startNow, setStartNow] = useState(false);
  const [formData, setFormData] = useState<ICreateMaintenance & {
    parts_cost?: number;
    labor_cost?: number;
    work_order_number?: string;
  }>({
    vehicle_id: '',
    category_id: '',
    workshop_id: undefined,
    type: 'corrective',
    vehicle_mileage: 0,
    next_maintenance_km: undefined,
    description: '',
    priority: 'normal',
    notes: '',
    parts_cost: 0,
    labor_cost: 0,
    work_order_number: '',
  });

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  async function loadData() {
    try {
      const [vehiclesData, workshopsData] = await Promise.all([
        // Sem limite explícito a consulta devolve só 60 — numa frota maior os
        // restantes veículos nunca apareciam no seletor.
        getAllVehicles({ limit: 10000 }),
        getAllWorkshops(),
      ]);
      setVehicles(vehiclesData.data.filter((v: any) => v.status !== 'inactive'));
      setWorkshops(workshopsData.filter((w: any) => w.is_active === true));
    } catch (error) {
      handleError(error, 'common:errors.loadingData');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const maintenanceData: any = {
        vehicle_id: formData.vehicle_id,
        category_id: formData.category_id,
        workshop_id: formData.workshop_id || undefined,
        type: formData.type,
        vehicle_mileage: formData.vehicle_mileage,
        next_maintenance_km: formData.next_maintenance_km || undefined,
        description: formData.description.trim(),
        priority: formData.priority,
        notes: formData.notes?.trim() || undefined,
        parts_cost: formData.parts_cost || undefined,
        labor_cost: formData.labor_cost || undefined,
        work_order_number: formData.work_order_number?.trim() || undefined,
        status: startNow ? 'in_progress' : 'scheduled',
      };
      const newMaintenance = await createMaintenance(maintenanceData);
      if (newMaintenance) {
        addMaintenance(newMaintenance);
        showSuccess(startNow ? 'maintenances:toast.startSuccess' : 'maintenances:toast.createSuccess');
        setOpen(false);
        resetForm();
        onSuccess?.();
      }
    } catch (error: any) {
      handleError(error, 'maintenances:toast.createError');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({ vehicle_id: '', category_id: '', workshop_id: undefined, type: 'corrective', vehicle_mileage: 0, next_maintenance_km: undefined, description: '', priority: 'normal', notes: '', parts_cost: 0, labor_cost: 0, work_order_number: '' });
    setStartNow(false);
  }

  const totalCost = (formData.parts_cost || 0) + (formData.labor_cost || 0);
  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicle_id);

  // Opções para veículos — pesquisa por matrícula, marca, modelo
  // Iniciar já: um veículo em viagem não pode entrar em manutenção (o
  // processo principal também recusa). Só agendar: continua a aparecer,
  // marcado como "Em uso".
  const vehicleOptions: SearchableSelectOption[] = vehicles
    .filter((v) => !(startNow && v.status === 'in_use'))
    .map((v) => ({
    value: v.id,
    searchText: `${v.license_plate} ${v.brand} ${v.model}`,
    label: (
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold">{v.license_plate}</span>
        <span className="text-muted-foreground">—</span>
        <span>{v.brand} {v.model}</span>
        {v.status === 'in_use' && (
          <span className="text-xs text-amber-600">({t('vehicles:status.in_use.label')})</span>
        )}
      </div>
    ),
    selectedLabel: <span className="font-mono font-semibold">{v.license_plate} — {v.brand} {v.model}</span>,
  }));

  // Opções para oficinas — pesquisa por nome e cidade
  const workshopOptions: SearchableSelectOption[] = workshops.map((w) => ({
    value: w.id,
    searchText: `${w.name} ${w.city ?? ''}`,
    label: (
      <div className="flex items-center justify-between w-full gap-2">
        <span>{w.name}</span>
        {w.city && <span className="text-xs text-muted-foreground">{w.city}</span>}
      </div>
    ),
    selectedLabel: <span>{w.name}{w.city ? ` — ${w.city}` : ''}</span>,
  }));
  // Opções para categorias — pesquisa por nome e tipo
  const categoryOptions: SearchableSelectOption[] = categories.map((c) => ({
    value: c.id,
    searchText: `${c.name} ${c.type}`,
    label: (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
        <span>{c.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">({c.type})</span>
      </div>
    ),
    selectedLabel: (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
        <span>{c.name}</span>
      </div>
    ),
  }));


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="maintenance:create"><DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('maintenances:newMaintenance')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {t('maintenances:dialogs.new.title')}
          </DialogTitle>
          <DialogDescription>{t('maintenances:dialogs.new.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Veículo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {t('maintenances:fields.vehicle')} *
            </Label>
            <SearchableSelect
              options={vehicleOptions}
              value={formData.vehicle_id}
              onValueChange={(value) => {
                const vehicle = vehicles.find((v) => v.id === value);
                setFormData({ ...formData, vehicle_id: value, vehicle_mileage: vehicle?.current_mileage || 0 });
              }}
              placeholder={t('maintenances:placeholders.vehicle')}
              searchPlaceholder="Pesquisar por matrícula, marca..."
              emptyMessage={t('maintenances:alerts.noVehicles')}
            />
            {selectedVehicle && (
              <p className="text-xs text-muted-foreground">
                KM: {selectedVehicle.current_mileage?.toLocaleString('pt-PT')}
              </p>
            )}
          </div>

          {/*Categoria — categorias vêm do contexto, podem crescer */}
          <div className="space-y-2">
              <Label className="flex items-center gap-2">{t('maintenances:fields.category')} *</Label>
              <SearchableSelect
                options={categoryOptions}
                value={formData.category_id}
                onValueChange={(value) => {
                  const selectedCategory = categories.find((c) => c.id === value);
                  setFormData({ ...formData, category_id: value, type: selectedCategory?.type || 'corrective' });
                }}
                placeholder={t('maintenances:placeholders.category')}
                searchPlaceholder="Pesquisar por nome ou tipo..."
                emptyMessage={t('maintenances:alerts.noCategories')}
              />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quilometragem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('maintenances:fields.mileage')} *</Label>
              {selectedVehicle && formData.vehicle_mileage === selectedVehicle.current_mileage && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  <Link2 className="w-3 h-3 mr-1" />
                  {t('maintenances:info.auto')}
                </Badge>
              )}
            </div>
            <Input
              type="number" min="0"
              placeholder={t('maintenances:placeholders.mileage')}
              value={formData.vehicle_mileage || ''}
              onChange={(e) => setFormData({ ...formData, vehicle_mileage: parseInt(e.target.value) || 0 })}
              className={cn(selectedVehicle && formData.vehicle_mileage === selectedVehicle.current_mileage && 'border-primary/50 bg-primary/5')}
              required
            />
            {selectedVehicle && formData.vehicle_mileage === selectedVehicle.current_mileage && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                {t('maintenances:info.mileageAutoFilled', { mileage: selectedVehicle.current_mileage?.toLocaleString('pt-PT') })}
              </p>
            )}
          </div>

          {/* Próxima manutenção prevista (km) */}
          <div className="space-y-2">
            <Label>{t('maintenances:fields.nextMaintenanceKm')}</Label>
            <Input
              type="number" min="0"
              placeholder={t('maintenances:placeholders.nextMaintenanceKm')}
              value={formData.next_maintenance_km || ''}
              onChange={(e) => setFormData({ ...formData, next_maintenance_km: parseInt(e.target.value) || undefined })}
            />
            <p className="text-xs text-muted-foreground">{t('maintenances:info.nextMaintenanceKmHint')}</p>
          </div>
        </div>

        {/* Oficina — linha própria */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">{t('maintenances:fields.workshop')}</Label>
          <SearchableSelect
            options={workshopOptions}
            value={formData.workshop_id || 'none'}
            onValueChange={(value) => setFormData({ ...formData, workshop_id: value === 'none' ? undefined : value })}
            placeholder={t('maintenances:placeholders.workshop')}
            searchPlaceholder="Pesquisar por nome ou cidade..."
            emptyMessage="Nenhuma oficina encontrada."
            noneOption={{ value: 'none', label: t('common:none') }}
          />
        </div>


        <div className="flex items-center gap-4">
          {/* Prioridade — lista estática de 4 itens, Select normal */}
          <div className="space-y-2">
            <Label>{t('maintenances:fields.priority')}</Label>
            <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{t(p.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('maintenances:fields.type')} *</Label>
                {formData.category_id && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    <Link2 className="w-3 h-3 mr-1" />
                    {t('maintenances:info.auto')}
                  </Badge>
                )}
              </div>
              {/* Tipo — lista estática de 2 itens, Select normal */}
              <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })} required>
                <SelectTrigger className={cn(formData.category_id && 'border-primary/50 bg-primary/5 opacity-75')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{t(type.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.category_id && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  {t('maintenances:info.typeAutoFilled')}
                </p>
              )}
            </div>
        </div>

          {/* Custos */}
          <div className="space-y-3">
            <Label>{t('maintenances:info.estimatedCost')}</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t('maintenances:fields.partsCost')} (Kz)</Label>
                <Input type="number" min="0" step="0.01" placeholder={t('maintenances:placeholders.partsCost')} value={formData.parts_cost || ''} onChange={(e) => setFormData({ ...formData, parts_cost: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t('maintenances:fields.laborCost')} (Kz)</Label>
                <Input type="number" min="0" step="0.01" placeholder={t('maintenances:placeholders.laborCost')} value={formData.labor_cost || ''} onChange={(e) => setFormData({ ...formData, labor_cost: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t('maintenances:fields.totalCost')}</Label>
                <Input value={totalCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} disabled className="bg-muted font-bold" />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>{t('maintenances:fields.description')} *</Label>
            <Textarea placeholder={t('maintenances:placeholders.description')} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} required />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>{t('maintenances:fields.notes')}</Label>
            <Textarea placeholder={t('maintenances:placeholders.notes')} value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
          </div>

          {/* Iniciar agora */}
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
            <Checkbox id="start_now" checked={startNow} onCheckedChange={(checked) => {
              const next = checked as boolean;
              setStartNow(next);
              if (next && selectedVehicle?.status === 'in_use') setFormData((f) => ({ ...f, vehicle_id: '' }));
            }} />
            <label htmlFor="start_now" className="text-sm font-medium leading-none cursor-pointer">
              {t('maintenances:actions.startNowDescription')}
            </label>
          </div>

          {/* Resumo */}
          {totalCost > 0 && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium">
                {t('maintenances:info.estimatedCost')}:
                <span className="text-lg ml-2 font-bold text-primary">{totalCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('maintenances:fields.status')}: {startNow ? t('maintenances:status.in_progress.label') : t('maintenances:status.scheduled.label')}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>{t('common:actions.cancel')}</Button>
            <Button type="submit" disabled={isLoading || vehicles.length === 0 || categories.length === 0}>
              {isLoading ? t('maintenances:actions.creating') : startNow ? t('maintenances:actions.startNow') : t('maintenances:actions.schedule')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}