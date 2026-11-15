// ========================================
// FILE: src/components/expense/EditExpenseDialog.tsx (ATUALIZADO COM SEARCHABLESELECT)
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { DollarSign, AlertCircle, Tag } from 'lucide-react';
import { updateExpense } from '@/helpers/expense-helpers';
import { getAllVehicles } from '@/helpers/vehicle-helpers';
import { getAllDrivers } from '@/helpers/driver-helpers';
import { IUpdateExpense } from '@/lib/types/expense';
import { useExpenses } from '@/contexts/ExpensesContext';

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EditExpenseDialog({ open, onOpenChange, onSuccess }: EditExpenseDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { state: { categories, selectedExpense }, updateExpense: updateInContext } = useExpenses();
  
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [formData, setFormData] = useState<IUpdateExpense>({
    category_id: '',
    description: '',
    amount: 0,
    expense_date: '',
  });

  // useEffect para carregar dados
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // useEffect para preencher formulário
  useEffect(() => {
    if (open && selectedExpense) {
      setFormData({
        category_id: selectedExpense.category_id,
        description: selectedExpense.description,
        amount: selectedExpense.amount,
        expense_date: selectedExpense.expense_date,
        vehicle_id: selectedExpense.vehicle_id || undefined,
        driver_id: selectedExpense.driver_id || undefined,
        due_date: selectedExpense.due_date || undefined,
        supplier: selectedExpense.supplier || '',
        document_number: selectedExpense.document_number || '',
        notes: selectedExpense.notes || '',
      });
    }
  }, [open, selectedExpense]);

  // Early return DEPOIS dos useEffects
  if (!selectedExpense) return null;

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
      const updated = await updateExpense(selectedExpense!.id, formData);
      
      if (updated) {
        updateInContext(updated);
        showSuccess('expenses:toast.updateSuccess');
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error: any) {
      handleError(error, 'expenses:toast.updateError');
    } finally {
      setIsLoading(false);
    }
  }

  const activeCategories = categories.filter(c => c.is_active);
  const selectedCategory = categories.find(c => c.id === formData.category_id);

  // Opções para categorias — pesquisa por nome e tipo
  const categoryOptions: SearchableSelectOption[] = activeCategories.map((c) => ({
    value: c.id,
    searchText: `${c.name} ${c.type}`,
    label: (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
        <span className="font-medium">{c.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">{t(`expenses:categoryTypes.${c.type}`)}</span>
      </div>
    ),
    selectedLabel: (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
        <span>{c.name}</span>
      </div>
    ),
  }));

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t('expenses:dialogs.edit.title')}
          </DialogTitle>
          <DialogDescription>
            {t('expenses:dialogs.edit.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('expenses:fields.category')} *</Label>
            <SearchableSelect
              options={categoryOptions}
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              placeholder={t('expenses:placeholders.category')}
              searchPlaceholder="Pesquisar por nome ou tipo..."
              emptyMessage={t('expenses:alerts.noCategories')}
            />
            {selectedCategory?.description && (
              <p className="text-xs text-muted-foreground">{selectedCategory.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('expenses:fields.description')} *</Label>
            <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('expenses:fields.amount')} (Kz) *</Label>
              <Input type="number" min="0" step="0.01" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('expenses:fields.expenseDate')} *</Label>
              <Input type="date" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} required />
            </div>
          </div>

          {/* Veículo e Motorista com SearchableSelect */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('expenses:fields.vehicle')}</Label>
              <SearchableSelect
                options={vehicleOptions}
                value={formData.vehicle_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, vehicle_id: value === 'none' ? undefined : value })}
                placeholder={t('expenses:placeholders.vehicle')}
                searchPlaceholder="Pesquisar por matrícula, marca..."
                emptyMessage="Nenhum veículo encontrado."
                noneOption={{ value: 'none', label: t('common:none') }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('expenses:fields.driver')}</Label>
              <SearchableSelect
                options={driverOptions}
                value={formData.driver_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, driver_id: value === 'none' ? undefined : value })}
                placeholder={t('expenses:placeholders.driver')}
                searchPlaceholder="Pesquisar por nome ou carta..."
                emptyMessage="Nenhum motorista encontrado."
                noneOption={{ value: 'none', label: t('common:none') }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('expenses:fields.supplier')}</Label>
              <Input value={formData.supplier || ''} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('expenses:fields.documentNumber')}</Label>
              <Input value={formData.document_number || ''} onChange={(e) => setFormData({ ...formData, document_number: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('expenses:fields.dueDate')}</Label>
            <Input type="date" value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>{t('expenses:fields.notes')}</Label>
            <Textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('expenses:actions.updating') : t('expenses:actions.update')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}