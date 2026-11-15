// ========================================
// FILE: src/components/fine/EditFineDialog.tsx (ATUALIZADO)
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Edit, AlertCircle, Car, User, FileText, MapPin, DollarSign, Calendar, Wallet } from 'lucide-react';
import { updateFine } from '@/helpers/fine-helpers';
import { getAllVehicles } from '@/helpers/vehicle-helpers';
import { getAllDrivers } from '@/helpers/driver-helpers';
import { IUpdateFine } from '@/lib/types/fine';
import { useFines } from '@/contexts/FinesContext';

const INFRACTION_TYPES = [
  { value: 'speeding', label: 'fines:infractionTypes.speeding' },
  { value: 'parking', label: 'fines:infractionTypes.parking' },
  { value: 'phone', label: 'fines:infractionTypes.phone' },
  { value: 'overtaking', label: 'fines:infractionTypes.overtaking' },
  { value: 'redLight', label: 'fines:infractionTypes.redLight' },
  { value: 'documents', label: 'fines:infractionTypes.documents' },
  { value: 'other', label: 'fines:infractionTypes.other' },
];

interface EditFineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EditFineDialog({ open, onOpenChange, onSuccess }: EditFineDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { state: { selectedFine }, updateFine: updateFineContext } = useFines();
  
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [formData, setFormData] = useState<IUpdateFine>({
    vehicle_id: '',
    driver_id: undefined,
    fine_number: '',
    fine_date: '',
    infraction_type: '',
    description: '',
    location: '',
    fine_amount: 0,
    due_date: '',
    points: 0,
    authority: '',
    notes: '',
    responsible_party: undefined,
  });

  // useEffect para carregar dados
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // useEffect para preencher formulário
  useEffect(() => {
    if (open && selectedFine) {
      setFormData({
        vehicle_id: selectedFine.vehicle_id,
        driver_id: selectedFine.driver_id || undefined,
        fine_number: selectedFine.fine_number,
        fine_date: selectedFine.fine_date,
        infraction_type: selectedFine.infraction_type,
        description: selectedFine.description,
        location: selectedFine.location || '',
        fine_amount: selectedFine.fine_amount,
        due_date: selectedFine.due_date || '',
        points: selectedFine.points || 0,
        authority: selectedFine.authority || '',
        notes: selectedFine.notes || '',
        responsible_party: selectedFine.responsible_party ?? undefined,
      });
    }
  }, [open, selectedFine]);

  // Early return DEPOIS dos useEffects
  if (!selectedFine) return null;

  async function loadData() {
    try {
      const [vehiclesData, driversData] = await Promise.all([
        getAllVehicles({ limit: 10000 }),
        getAllDrivers({ limit: 10000 }),
      ]);
      setVehicles(vehiclesData.data.filter((v: any) => v.status !== 'inactive'));
      setDrivers(driversData.data.filter((d: any) => d.is_active === true));
    } catch (error) {
      handleError(error, 'common:errors.loadingData');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updated = await updateFine(selectedFine!.id, formData);
      
      if (updated) {
        updateFineContext(updated);
        showSuccess('fines:toast.updateSuccess');
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error: any) {
      handleError(error, 'fines:toast.updateError');
    } finally {
      setIsLoading(false);
    }
  }

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
    selectedLabel: <span className="font-mono font-semibold">{v.license_plate} — {v.brand} {v.model}</span>,
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
          {d.license_number && <span className="text-xs text-muted-foreground font-mono">{d.license_number}</span>}
        </div>
      </div>
    ),
    selectedLabel: <span>{d.name}</span>,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="w-6 h-6 text-primary" />
            {t('fines:dialogs.edit.title')}
          </DialogTitle>
          <DialogDescription>
            {t('fines:dialogs.edit.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção 1: Veículo e Motorista */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <Car className="w-4 h-4" />
              Identificação
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  <Car className="w-4 h-4 inline mr-1" />
                  {t('fines:fields.vehicle')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <SearchableSelect
                  options={vehicleOptions}
                  value={formData.vehicle_id}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                  placeholder={t('fines:placeholders.selectVehicle')}
                  searchPlaceholder="Pesquisar por matrícula, marca..."
                  emptyMessage="Nenhum veículo disponível."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  <User className="w-4 h-4 inline mr-1" />
                  {t('fines:fields.driver')}
                </Label>
                <SearchableSelect
                  options={driverOptions}
                  value={formData.driver_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, driver_id: value === 'none' ? undefined : value })}
                  placeholder={t('fines:placeholders.selectDriver')}
                  searchPlaceholder="Pesquisar por nome ou carta..."
                  emptyMessage="Nenhum motorista encontrado."
                  noneOption={{ value: 'none', label: t('fines:info.unknownDriver') }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                <Wallet className="w-4 h-4 inline mr-1" />
                {t('fines:fields.responsibleParty')}
              </Label>
              <Select
                value={formData.responsible_party || 'none'}
                onValueChange={(value) => setFormData({ ...formData, responsible_party: value === 'none' ? undefined : value as 'company' | 'driver' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('fines:placeholders.selectResponsibleParty')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common:optional')}</SelectItem>
                  <SelectItem value="company">{t('fines:fields.responsiblePartyOptions.company')}</SelectItem>
                  <SelectItem value="driver">{t('fines:fields.responsiblePartyOptions.driver')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seção 2: Dados da Multa */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              {t('fines:fields.fineNumber')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('fines:fields.fineNumber')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  placeholder={t('fines:placeholders.fineNumber')}
                  value={formData.fine_number}
                  onChange={(e) => setFormData({ ...formData, fine_number: e.target.value })}
                  required
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {t('fines:fields.fineDate')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.fine_date}
                  onChange={(e) => setFormData({ ...formData, fine_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('fines:fields.infractionType')}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Select
                value={formData.infraction_type}
                onValueChange={(value) => setFormData({ ...formData, infraction_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('fines:placeholders.infractionType')} />
                </SelectTrigger>
                <SelectContent>
                  {INFRACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('fines:fields.description')}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Textarea
                placeholder={t('fines:placeholders.description')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                <MapPin className="w-4 h-4 inline mr-1" />
                {t('fines:fields.location')}
              </Label>
              <Input
                placeholder={t('fines:placeholders.location')}
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          {/* Seção 3: Valores */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <DollarSign className="w-4 h-4" />
              Valores e Prazos
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('fines:fields.fineAmount')} (Kz)
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={t('fines:placeholders.fineAmount')}
                  value={formData.fine_amount || ''}
                  onChange={(e) => setFormData({ ...formData, fine_amount: parseInt(e.target.value) || 0 })}
                  required
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('fines:fields.points')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder={t('fines:placeholders.points')}
                  value={formData.points || ''}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('fines:fields.dueDate')}
                </Label>
                <Input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Informações Adicionais */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('fines:fields.authority')}
              </Label>
              <Input
                placeholder={t('fines:placeholders.authority')}
                value={formData.authority || ''}
                onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('fines:fields.notes')}
              </Label>
              <Textarea
                placeholder={t('fines:placeholders.notes')}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Alerta */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-400">
                O status da multa não pode ser alterado aqui. Use as ações específicas (Marcar como Paga, Contestar).
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('fines:actions.edit') + '...' : t('fines:actions.edit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}