// ========================================
// FILE: src/components/vehicle/NewVehicleDialog.tsx (CORRIGIDO)
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createVehicle } from '@/helpers/vehicle-helpers';
import { getAllVehicleCategories } from '@/helpers/vehicle-category-helpers';
import { ICreateVehicle } from '@/lib/types/vehicle';
import { useVehicles } from '@/contexts/VehiclesContext';
import { usePermission } from '@/hooks/usePermission';
import { ImeiSelector } from './ImeiSelector';
import { PermissionGate } from '@/components/PermissionGate';

interface NewVehicleDialogProps { onSuccess?: () => void; }
export default function NewVehicleDialog({ onSuccess }: NewVehicleDialogProps) {
  const { showSuccess, handleError } = useErrorHandler();
  const { t } = useTranslation();
  const canLinkGps = usePermission('vehicle:link-device');

  const { addVehicle } = useVehicles();
  
  const [open, setOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState<ICreateVehicle>({
    category_id: '',
    license_plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    current_mileage: 0,
    traccar_unique_id: '',
  });

  {/* Estado para pesquisa — adiciona junto aos outros estados */}
const [categorySearch, setCategorySearch] = useState('');

// Categorias filtradas pela pesquisa
const filteredCategories = categories.filter(cat =>
  cat.name.toLowerCase().includes(categorySearch.toLowerCase())
);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  async function loadCategories() {
    setIsLoading(true);
    try {
      const cats = await getAllVehicleCategories();
      setCategories(cats);
    } catch (error: any) {
      handleError(error, t('vehicles:errors.errorLoadingCategories'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newVehicle = await createVehicle(formData);
      
      if (newVehicle) {
        // Buscar dados completos da categoria selecionada
        const selectedCategory = categories.find(cat => cat.id === formData.category_id);
        
        // Enriquecer o veículo com dados da categoria
        const enrichedVehicle = {
          ...newVehicle,
          category_name: selectedCategory?.name || null,
          category_color: selectedCategory?.color || null,
        };
        
        addVehicle(enrichedVehicle);
        showSuccess(t('vehicles:toast.createSuccess'));
        setOpen(false);
        resetForm();
        onSuccess?.();
      }
    } catch (error: any) {
      handleError(error, t('vehicles:toast.createError'));
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      category_id: '',
      license_plate: '',
      brand: '',
      model: '',
      tire_size: '',
      year: new Date().getFullYear(),
      color: '',
      current_mileage: 0,
      traccar_unique_id: '',
    });
  }

  // Encontrar categoria selecionada
  const selectedCategory = categories.find((cat) => cat.id === formData.category_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="vehicle:create"><DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('vehicles:actions.create')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('vehicles:dialogs.new.title')}</DialogTitle>
          <DialogDescription>
            {t('vehicles:dialogs.new.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('vehicles:fields.category')} *</Label>
              <Popover open={categoryPopoverOpen} onOpenChange={(o) => {
                setCategoryPopoverOpen(o);
                if (!o) setCategorySearch('');
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryPopoverOpen}
                    className="w-full justify-between font-normal"
                    disabled={isLoading}
                    type="button"
                  >
                    {selectedCategory ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: selectedCategory.color || '#ccc' }}
                        />
                        <span>{selectedCategory.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {t('vehicles:placeholders.selectCategory')}
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0 shadow-xl border border-border rounded-lg overflow-hidden"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {/* Campo de pesquisa */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                    <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                      autoFocus
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder={t('vehicles:placeholders.searchCategory')}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    {categorySearch && (
                      <button
                        type="button"
                        onClick={() => setCategorySearch('')}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Lista com scroll nativo */}
                  <div className="overflow-y-auto max-h-[240px] p-1">
                    {filteredCategories.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {t('vehicles:errors.noCategoriesFound')}
                      </div>
                    ) : (
                      filteredCategories.map((cat) => {
                        const isSelected = formData.category_id === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, category_id: cat.id });
                              setCategoryPopoverOpen(false);
                              setCategorySearch('');
                            }}
                            className={cn(
                              "flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm text-left transition-colors",
                              "hover:bg-accent hover:text-accent-foreground",
                              isSelected && "bg-accent/50 font-medium"
                            )}
                          >
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color || '#ccc' }}
                            />
                            <span className="flex-1">{cat.name}</span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_plate">{t('vehicles:fields.licensePlate')} *</Label>
              <Input
                id="license_plate"
                placeholder={t('vehicles:placeholders.licensePlate')}
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">{t('vehicles:fields.brand')} *</Label>
              <Input
                id="brand"
                placeholder={t('vehicles:placeholders.brand')}
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">{t('vehicles:fields.model')} *</Label>
              <Input
                id="model"
                placeholder={t('vehicles:placeholders.model')}
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">{t('vehicles:fields.year')} *</Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">{t('vehicles:fields.color')}</Label>
              <Input
                id="color"
                placeholder={t('vehicles:placeholders.color')}
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mileage">{t('vehicles:fields.mileage')}</Label>
              <Input
                id="mileage"
                type="number"
                min="0"
                value={formData.current_mileage}
                onChange={(e) => setFormData({ ...formData, current_mileage: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
            <Label htmlFor="tire_size">{t('vehicles:fields.tireSize')}</Label>
            <Input
              id="tire_size"
              placeholder={t('vehicles:placeholders.tireSize')}
              value={formData.tire_size}
              onChange={(e) => setFormData({ ...formData, tire_size: e.target.value.toUpperCase() })}
            />
          </div>

            {canLinkGps && (
              <div className="col-span-2 space-y-2">
                <Label>
                  {t('vehicles:fields.gpsImei')}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{t('vehicles:fields.gpsImeiOptional')}</span>
                </Label>
                <ImeiSelector
                  value={formData.traccar_unique_id || null}
                  onChange={(v) => setFormData({ ...formData, traccar_unique_id: v ?? '' })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('vehicles:fields.gpsImeiCreationHint')}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('vehicles:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('vehicles:actions.creating') : t('vehicles:actions.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
