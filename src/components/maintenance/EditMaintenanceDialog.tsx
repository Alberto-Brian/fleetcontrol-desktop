// ========================================
// FILE: src/components/maintenance/EditMaintenanceDialog.tsx
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Wrench, Pencil, Car, Building2, Tag, Calendar,
  DollarSign, FileText, StickyNote, AlertCircle, CheckCircle2,
  Clock, Play, Flag, Gauge
} from 'lucide-react';
import { updateMaintenance } from '@/helpers/maintenance-helpers';
import { getAllVehicles } from '@/helpers/vehicle-helpers';
import { getAllWorkshops } from '@/helpers/workshop-helpers';
import { getAllMaintenanceCategories } from '@/helpers/maintenance-category-helpers';
import { IUpdateMaintenance, IMaintenance } from '@/lib/types/maintenance';
import { useMaintenances } from '@/contexts/MaintenancesContext';
import { maintenanceStatus, maintenancePriority } from '@/lib/db/schemas/maintenances';

interface EditMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const priorityOptions = [
  { value: maintenancePriority.LOW, label: 'maintenances:priority.low.label', color: 'text-green-600', bg: 'bg-green-50' },
  { value: maintenancePriority.NORMAL, label: 'maintenances:priority.normal.label', color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: maintenancePriority.HIGH, label: 'maintenances:priority.high.label', color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: maintenancePriority.URGENT, label: 'maintenances:priority.urgent.label', color: 'text-red-600', bg: 'bg-red-50' },
];

const statusOptions = [
  { value: maintenanceStatus.SCHEDULED, label: 'maintenances:status.scheduled.label', icon: Clock },
  { value: maintenanceStatus.IN_PROGRESS, label: 'maintenances:status.in_progress.label', icon: Play },
  { value: maintenanceStatus.COMPLETED, label: 'maintenances:status.completed.label', icon: CheckCircle2 },
  { value: maintenanceStatus.CANCELLED, label: 'maintenances:status.cancelled.label', icon: Flag },
];

export default function EditMaintenanceDialog({ open, onOpenChange, onSuccess }: EditMaintenanceDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { 
    state: { selectedMaintenance }, 
    updateMaintenance: updateMaintenanceInContext 
  } = useMaintenances();

  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [formData, setFormData] = useState<IUpdateMaintenance>({
    vehicle_id: '',
    category_id: '',
    workshop_id: undefined,
    priority: maintenancePriority.NORMAL,
    status: maintenanceStatus.SCHEDULED,
    entry_date: '',
    exit_date: undefined,
    total_cost: 0,
    description: '',
    notes: '',
    next_maintenance_km: undefined,
  });

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Populate form when selected maintenance changes
  useEffect(() => {
    if (selectedMaintenance && open) {
      setFormData({
        vehicle_id: selectedMaintenance.vehicle_id,
        category_id: selectedMaintenance.category_id,
        workshop_id: selectedMaintenance.workshop_id || undefined,
        priority: selectedMaintenance.priority,
        status: selectedMaintenance.status,
        entry_date: selectedMaintenance.entry_date ? new Date(selectedMaintenance.entry_date).toISOString().split('T')[0] : '',
        exit_date: selectedMaintenance.exit_date ? new Date(selectedMaintenance.exit_date).toISOString().split('T')[0] : undefined,
        total_cost: selectedMaintenance.total_cost,
        description: selectedMaintenance.description || '',
        notes: selectedMaintenance.notes || '',
        next_maintenance_km: selectedMaintenance.next_maintenance_km ?? undefined,
      });
    }
  }, [selectedMaintenance, open]);

  async function loadData() {
    try {
      const [vehiclesData, workshopsData, categoriesData] = await Promise.all([
        getAllVehicles({ limit: 10000 }),
        getAllWorkshops(),
        getAllMaintenanceCategories(),
      ]);
      setVehicles(vehiclesData.data.filter((v: any) => v.status !== 'inactive'));
      setWorkshops(workshopsData.filter((w: any) => w.is_active));
      setCategories(categoriesData);
    } catch (error) {
      handleError(error, 'common:errors.loadingData');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMaintenance) return;

    setIsLoading(true);
    try {
      const updatedMaintenance = await updateMaintenance(selectedMaintenance.id, formData);
      if (updatedMaintenance) {
        updateMaintenanceInContext(updatedMaintenance);
        showSuccess('maintenances:toast.updateSuccess');
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error: any) {
      handleError(error, 'maintenances:toast.updateError');
    } finally {
      setIsLoading(false);
    }
  }

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicle_id);
  const selectedCategory = categories.find((c) => c.id === formData.category_id);
  const selectedWorkshop = workshops.find((w) => w.id === formData.workshop_id);

  // Options for searchable selects
  const vehicleOptions: SearchableSelectOption[] = vehicles.map((v) => ({
    value: v.id,
    searchText: `${v.license_plate} ${v.brand} ${v.model}`,
    label: (
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold">{v.license_plate}</span>
        <span className="text-muted-foreground text-sm">— {v.brand} {v.model}</span>
      </div>
    ),
    selectedLabel: <span className="font-mono font-semibold">{v.license_plate} — {v.brand} {v.model}</span>,
  }));

  const categoryOptions: SearchableSelectOption[] = categories.map((c) => ({
    value: c.id,
    searchText: `${c.name} ${c.type}`,
    label: (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
        <span className="font-medium">{c.name}</span>
        <Badge variant={c.type === 'preventive' ? 'default' : 'secondary'} className="text-[10px]">
          {t(`maintenances:type.${c.type}.short`)}
        </Badge>
      </div>
    ),
    selectedLabel: (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
        <span>{c.name}</span>
      </div>
    ),
  }));

  const workshopOptions: SearchableSelectOption[] = workshops.map((w) => ({
    value: w.id,
    searchText: `${w.name} ${w.city || ''} ${w.specialties || ''}`,
    label: (
      <div className="flex flex-col">
        <span className="font-medium">{w.name}</span>
        {w.city && <span className="text-xs text-muted-foreground">{w.city}</span>}
      </div>
    ),
    selectedLabel: <span>{w.name}{w.city ? ` — ${w.city}` : ''}</span>,
  }));

  if (!selectedMaintenance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Pencil className="w-5 h-5 text-primary" />
            {t('maintenances:dialogs.edit.title')}
          </DialogTitle>
          <DialogDescription>{t('maintenances:dialogs.edit.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Section 1: Identification */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <Car className="w-4 h-4" />
              {t('maintenances:sections.identification')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehicle */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('maintenances:fields.vehicle')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <SearchableSelect
                  options={vehicleOptions}
                  value={formData.vehicle_id}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                  placeholder={t('maintenances:placeholders.selectVehicle')}
                  searchPlaceholder={t('maintenances:placeholders.searchVehicle')}
                  emptyMessage={t('maintenances:alerts.noVehicles')}
                  popoverMinWidth={320}
                />
                {selectedVehicle && (
                  <p className="text-xs text-muted-foreground">
                    {selectedVehicle.brand} {selectedVehicle.model} • {selectedVehicle.year}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('maintenances:fields.category')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <SearchableSelect
                  options={categoryOptions}
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  placeholder={t('maintenances:placeholders.selectCategory')}
                  searchPlaceholder={t('maintenances:placeholders.searchCategory')}
                  emptyMessage={t('maintenances:alerts.noCategories')}
                  popoverMinWidth={320}
                />
                {selectedCategory && (
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedCategory.type === 'preventive' ? 'default' : 'secondary'} className="text-[10px]">
                      {t(`maintenances:type.${selectedCategory.type}.label`)}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Workshop and Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              {t('maintenances:sections.workshop')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Workshop */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('maintenances:fields.workshop')}</Label>
                <SearchableSelect
                  options={workshopOptions}
                  value={formData.workshop_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, workshop_id: value === 'none' ? undefined : value })}
                  placeholder={t('maintenances:placeholders.selectWorkshop')}
                  searchPlaceholder={t('maintenances:placeholders.searchWorkshop')}
                  emptyMessage={t('maintenances:alerts.noWorkshops')}
                  noneOption={{ value: 'none', label: t('common:none') }}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('maintenances:fields.status')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('maintenances:placeholders.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => {
                      const Icon = status.icon;
                      return (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{t(status.label)}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Priority and Dates */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              {t('maintenances:sections.schedule')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('maintenances:fields.priority')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('maintenances:placeholders.selectPriority')} />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', priority.bg, priority.color)} />
                          <span>{t(priority.label)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Entry Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('maintenances:fields.entryDate')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <div className="relative">
                  <Input 
                    type="date" 
                    value={formData.entry_date} 
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} 
                    required 
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Exit Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('maintenances:fields.exitDate')}</Label>
                <div className="relative">
                  <Input 
                    type="date" 
                    value={formData.exit_date || ''} 
                    onChange={(e) => setFormData({ ...formData, exit_date: e.target.value || undefined })} 
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 4: Costs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <DollarSign className="w-4 h-4" />
              {t('maintenances:sections.costs')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('maintenances:fields.totalCost')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={formData.total_cost || ''} 
                    onChange={(e) => setFormData({ ...formData, total_cost: parseFloat(e.target.value) || 0 })} 
                    className="pl-10 font-mono" 
                    required 
                  />
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">Kz</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 5: Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              {t('maintenances:sections.details')}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('maintenances:fields.description')}</Label>
                <Textarea 
                  placeholder={t('maintenances:placeholders.description')} 
                  value={formData.description || ''} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  rows={3} 
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5" />
                  {t('maintenances:fields.nextMaintenanceKm')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder={t('maintenances:placeholders.nextMaintenanceKm')}
                  value={formData.next_maintenance_km || ''}
                  onChange={(e) => setFormData({ ...formData, next_maintenance_km: parseInt(e.target.value) || undefined })}
                />
                <p className="text-xs text-muted-foreground">{t('maintenances:info.nextMaintenanceKmHint')}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <StickyNote className="w-3.5 h-3.5" />
                  {t('maintenances:fields.notes')}
                </Label>
                <Textarea
                  placeholder={t('maintenances:placeholders.addNotes')}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('maintenances:fields.status')}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  'rounded-full',
                  formData.status === maintenanceStatus.SCHEDULED && 'bg-slate-100 text-slate-700',
                  formData.status === maintenanceStatus.IN_PROGRESS && 'bg-blue-100 text-blue-700',
                  formData.status === maintenanceStatus.COMPLETED && 'bg-green-100 text-green-700',
                  formData.status === maintenanceStatus.CANCELLED && 'bg-slate-100 text-slate-600',
                )}
              >
                {t(`maintenances:status.${formData.status}.label`)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('maintenances:fields.priority')}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  'rounded-full',
                  formData.priority === maintenancePriority.LOW && 'bg-green-50 text-green-700 border-green-200',
                  formData.priority === maintenancePriority.NORMAL && 'bg-blue-50 text-blue-700 border-blue-200',
                  formData.priority === maintenancePriority.HIGH && 'bg-orange-50 text-orange-700 border-orange-200',
                  formData.priority === maintenancePriority.URGENT && 'bg-red-50 text-red-700 border-red-200',
                )}
              >
                {t(`maintenances:priority.${formData.priority}.label`)}
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-bold text-muted-foreground">{t('maintenances:fields.totalCost')}</span>
              <span className="text-xl font-black text-primary font-mono">
                {(formData.total_cost ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isLoading}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('maintenances:actions.updating') : t('maintenances:actions.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}