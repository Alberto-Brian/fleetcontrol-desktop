// ========================================
// FILE: src/components/maintenance/NewMaintenanceCategoryDialog.tsx (ATUALIZADO)
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Plus, Tag } from 'lucide-react';
import { createMaintenanceCategory } from '@/helpers/maintenance-category-helpers';
import { ICreateMaintenanceCategory } from '@/lib/types/maintenance_category';
import { useMaintenances } from '@/contexts/MaintenancesContext';
import { RESTORE_MAINTENANCE_CATEGORY } from '@/helpers/ipc/db/maintenance_categories/maintenance-categories-channels';
import { PermissionGate } from '@/components/PermissionGate';

const CATEGORY_TYPES = [
  { value: 'preventive', label: 'maintenances:type.preventive.label' },
  { value: 'corrective', label: 'maintenances:type.corrective.label' },
];

const COLORS = [
  { value: '#EF4444', label: 'maintenances:categories.colors.red' },
  { value: '#F59E0B', label: 'maintenances:categories.colors.orange' },
  { value: '#10B981', label: 'maintenances:categories.colors.green' },
  { value: '#3B82F6', label: 'maintenances:categories.colors.blue' },
  { value: '#8B5CF6', label: 'maintenances:categories.colors.purple' },
  { value: '#EC4899', label: 'maintenances:categories.colors.pink' },
  { value: '#6B7280', label: 'maintenances:categories.colors.gray' },
];

interface NewMaintenanceCategoryDialogProps { onSuccess?: () => void; }
export default function NewMaintenanceCategoryDialog({ onSuccess }: NewMaintenanceCategoryDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { addCategory, updateCategory } = useMaintenances();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ICreateMaintenanceCategory>({
    name: '',
    type: 'corrective',
    description: '',
    color: '#F59E0B',
  });

  // ✨ Escuta categorias restauradas
  useEffect(() => {
    const handleCategoryRestored = (event: any) => {
      const { handler, result } = event.detail;
      
      if (handler === RESTORE_MAINTENANCE_CATEGORY && result) {
        updateCategory(result);
        setOpen(false);
        resetForm();
      }
    };

    window.addEventListener('action-completed', handleCategoryRestored);
    
    return () => {
      window.removeEventListener('action-completed', handleCategoryRestored);
    };
  }, [updateCategory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newCategory = await createMaintenanceCategory(formData);
      
      addCategory(newCategory);
      showSuccess('maintenances:toast.categoryCreateSuccess');
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      // ✨ SIMPLES - useErrorHandler trata tudo
      handleError(error, 'maintenances:toast.categoryCreateError');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      type: 'corrective',
      description: '',
      color: '#F59E0B',
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="maintenance_category:create"><DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('maintenances:categories.newCategory')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {t('maintenances:dialogs.newCategory.title')}
          </DialogTitle>
          <DialogDescription>
            {t('maintenances:dialogs.newCategory.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('maintenances:fields.categoryName')} *</Label>
            <Input
              placeholder={t('maintenances:placeholders.categoryName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>


        <div className="flex items-center gap-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>{t('maintenances:fields.categoryType')} *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(type.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Cor */}
          <div className="space-y-2">
            <Label>{t('maintenances:fields.categoryColor')}</Label>
            <Select
              value={formData.color}
              onValueChange={(value) => setFormData({ ...formData, color: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border" 
                        style={{ backgroundColor: color.value }}
                      />
                      {t(color.label)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

          <div className="space-y-2">
            <Label>{t('maintenances:fields.categoryDescription')}</Label>
            <Textarea
              placeholder={t('maintenances:placeholders.categoryDescription')}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: formData.color }}
            />
            <span className="text-sm font-medium">
              {formData.name || t('maintenances:fields.categoryName')}
            </span>
            {formData.type && (
              <span className="text-xs text-muted-foreground ml-auto">
                ({t(`maintenances:type.${formData.type}.label`)})
              </span>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('maintenances:actions.creating') : t('maintenances:actions.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}