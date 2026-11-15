// ========================================
// FILE: src/components/expense/NewExpenseCategoryDialog.tsx (REDESENHADO)
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
import { createExpenseCategory } from '@/helpers/expense-category-helpers';
import { ICreateExpenseCategory } from '@/lib/types/expense-category';
import { useExpenses } from '@/contexts/ExpensesContext';
import { RESTORE_EXPENSE_CATEGORY } from '@/helpers/ipc/db/expense_categories/expense-categories-channels';
import { PermissionGate } from '@/components/PermissionGate';

const CATEGORY_TYPES = [
  { value: 'operational', label: 'expenses:categoryTypes.operational' },
  { value: 'administrative', label: 'expenses:categoryTypes.administrative' },
  { value: 'extraordinary', label: 'expenses:categoryTypes.extraordinary' },
];

// ✅ Paleta reduzida e discreta (8 cores)
const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Ciano' },
  { value: '#f97316', label: 'Laranja' },
];

interface NewExpenseCategoryDialogProps { onSuccess?: () => void; }
export default function NewExpenseCategoryDialog({ onSuccess }: NewExpenseCategoryDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { addCategory, updateCategory } = useExpenses();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ICreateExpenseCategory>({
    name: '',
    description: '',
    type: 'operational',
    color: '#3b82f6',
  });

  // ✨ Escuta categorias restauradas
  useEffect(() => {
    const handleCategoryRestored = (event: any) => {
      const { handler, result } = event.detail;
      
      if (handler === RESTORE_EXPENSE_CATEGORY && result) {
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
      const newCategory = await createExpenseCategory(formData);
      
      addCategory(newCategory);
      showSuccess('expenses:toast.categoryCreateSuccess');
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      handleError(error, 'expenses:toast.categoryCreateError');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      type: 'operational',
      color: '#3b82f6',
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="category:create"><DialogTrigger asChild>
        <Button id="new-category-trigger">
          <Plus className="w-4 h-4 mr-2" />
          {t('expenses:actions.newCategory')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {t('expenses:dialogs.newCategory.title')}
          </DialogTitle>
          <DialogDescription>
            {t('expenses:dialogs.newCategory.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ✅ LAYOUT DE 2 COLUNAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUNA ESQUERDA - Inputs */}
            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  {t('expenses:fields.categoryName')} *
                </Label>
                <Input
                  id="name"
                  placeholder={t('expenses:placeholders.categoryName')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-semibold">
                  {t('expenses:fields.categoryType')} *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                >
                  <SelectTrigger id="type">
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

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  {t('expenses:fields.categoryDescription')}
                </Label>
                <Textarea
                  id="description"
                  placeholder={t('expenses:placeholders.categoryDescription')}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* ✅ Cor como SELECT discreto */}
              <div className="space-y-2">
                <Label htmlFor="color" className="text-sm font-semibold">
                  {t('expenses:fields.categoryColor')}
                </Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger id="color" className="w-full">
                    <div className="flex items-center gap-2">
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((option) => (
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
                  A cor ajuda a identificar visualmente a categoria
                </p>
              </div>
            </div>

            {/* COLUNA DIREITA - Preview */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Preview</Label>
                <div className="p-6 bg-muted/50 rounded-xl border-2 border-dashed border-muted">
                  <div className="flex flex-col items-center justify-center gap-4">
                    {/* Ícone grande */}
                    <div 
                      className="w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center transition-all"
                      style={{ backgroundColor: `${formData.color}15` }}
                    >
                      <Tag className="w-10 h-10" style={{ color: formData.color }} />
                    </div>
                    
                    {/* Nome */}
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {formData.name || t('expenses:placeholders.categoryName')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t(`expenses:categoryTypes.${formData.type}`)}
                      </p>
                      {formData.description && (
                        <p className="text-xs text-muted-foreground mt-2 max-w-[250px]">
                          {formData.description}
                        </p>
                      )}
                    </div>

                    {/* Badge de cor */}
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

              {/* Info adicional */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>💡 Dica:</strong> Escolha cores diferentes para cada categoria para facilitar a identificação visual das despesas.
                </p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('expenses:actions.creating') : t('expenses:actions.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}