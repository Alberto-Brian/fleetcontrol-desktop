// ========================================
// FILE: src/components/vehicle/NewVehicleCategoryDialog.tsx (ATUALIZADO)
// ========================================
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Plus, Tag } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createVehicleCategory } from '@/helpers/vehicle-category-helpers';
import { ICreateVehicleCategory } from '@/lib/types/vehicle-category';
import { useVehicles } from '@/contexts/VehiclesContext';
import { PermissionGate } from '@/components/PermissionGate';

interface NewVehicleCategoryDialogProps { onSuccess?: () => void; }
export default function NewVehicleCategoryDialog({ onSuccess }: NewVehicleCategoryDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { addCategory } = useVehicles();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ICreateVehicleCategory>({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  const colorOptions = [
    { value: '#3b82f6', label: t('common:colors.blue') },
    { value: '#10b981', label: t('common:colors.green') },
    { value: '#f59e0b', label: t('common:colors.amber') },
    { value: '#ef4444', label: t('common:colors.red') },
    { value: '#8b5cf6', label: t('common:colors.purple') },
    { value: '#ec4899', label: t('common:colors.pink') },
    { value: '#06b6d4', label: t('common:colors.cyan') },
    { value: '#f97316', label: t('common:colors.orange') },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newCategory = await createVehicleCategory(formData);
      
      if (newCategory) {
        addCategory(newCategory);
        showSuccess(t('vehicles:toast.categoryCreateSuccess'));
        setOpen(false);
        resetForm();
        onSuccess?.();
      }
    } catch (error: any) {
      handleError(error, t('vehicles:toast.categoryCreateError'));
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="category:create"><DialogTrigger asChild>
        <Button id="new-category-trigger">
          <Plus className="w-4 h-4 mr-2" />
          {t('vehicles:categories.new')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {t('vehicles:categories.new')}
          </DialogTitle>
          <DialogDescription>
            {t('vehicles:categories.newDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  {t('vehicles:categories.name')} *
                </Label>
                <Input
                  id="name"
                  placeholder={t('vehicles:placeholders.categoryName')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  {t('vehicles:fields.description')}
                </Label>
                <Textarea
                  id="description"
                  placeholder={t('vehicles:placeholders.categoryDescription')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color" className="text-sm font-semibold">
                  {t('vehicles:fields.color')} ({t('common:optional')})
                </Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-border" 
                            style={{ backgroundColor: option.value }}
                          />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('vehicles:categories.colorHint')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t('common:preview')}</Label>
                <div className="p-6 bg-muted/50 rounded-xl border-2 border-dashed border-muted">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div 
                      className="w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center transition-all"
                      style={{ backgroundColor: `${formData.color}15` }}
                    >
                      <Tag className="w-10 h-10" style={{ color: formData.color }} />
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {formData.name || t('vehicles:categories.namePlaceholder')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.description || t('vehicles:categories.descriptionPlaceholder')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: formData.color }}
                      />
                      <span className="text-xs font-mono font-semibold">{formData.color}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>{t('common:tip')}:</strong> {t('vehicles:categories.colorTip')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('vehicles:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('vehicles:actions.creating') : t('vehicles:categories.new')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}