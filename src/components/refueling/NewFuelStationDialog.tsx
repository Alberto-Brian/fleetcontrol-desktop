// ========================================
// FILE: src/components/fuel-station/NewFuelStationDialog.tsx (COMPLETO)
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Plus, MapPin } from 'lucide-react';
import { createFuelStation } from '@/helpers/fuel-station-helpers';
import { ICreateFuelStation } from '@/lib/types/fuel-station';
import { useRefuelings } from '@/contexts/RefuelingsContext';
import { RESTORE_FUEL_STATION } from '@/helpers/ipc/db/fuel_stations/fuel-stations-channels';
import { PermissionGate } from '@/components/PermissionGate';

interface NewFuelStationDialogProps { onSuccess?: () => void; }
export default function NewFuelStationDialog({ onSuccess }: NewFuelStationDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { addFuelStation, updateFuelStation } = useRefuelings();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ICreateFuelStation>({
    name: '',
    brand: '',
    phone: '',
    address: '',
    city: '',
    fuel_types: 'diesel',
    has_convenience_store: 'false',
    has_car_wash: 'false',
    notes: '',
  });

  // ✨ Escuta postos restaurados
  useEffect(() => {
    const handleStationRestored = (event: any) => {
      const { handler, result } = event.detail;
      
      if (handler === RESTORE_FUEL_STATION && result) {
        updateFuelStation(result);
        setOpen(false);
        resetForm();
      }
    };

    window.addEventListener('action-completed', handleStationRestored);
    
    return () => {
      window.removeEventListener('action-completed', handleStationRestored);
    };
  }, [updateFuelStation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newStation = await createFuelStation(formData);
      
      addFuelStation(newStation);
      showSuccess('refuelings:toast.stationCreateSuccess');
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      // ✨ SIMPLES - useErrorHandler trata tudo (incluindo toast de restaurar)
      handleError(error, 'refuelings:toast.stationCreateError');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      brand: '',
      phone: '',
      address: '',
      city: '',
      fuel_types: 'diesel',
      has_convenience_store: 'false',
      has_car_wash: 'false',
      notes: '',
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="fuel_station:create"><DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('refuelings:actions.newStation')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t('refuelings:dialogs.newStation.title')}
          </DialogTitle>
          <DialogDescription>
            {t('refuelings:dialogs.newStation.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome e Marca */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('refuelings:fields.stationName')} *</Label>
              <Input
                placeholder={t('refuelings:placeholders.stationName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>{t('refuelings:fields.brand')}</Label>
              <Input
                placeholder={t('refuelings:placeholders.brand')}
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label>{t('refuelings:fields.phone')}</Label>
            <Input
              type="tel"
              placeholder={t('refuelings:placeholders.phone')}
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          {/* Endereço e Cidade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('refuelings:fields.address')}</Label>
              <Input
                placeholder={t('refuelings:placeholders.address')}
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('refuelings:fields.city')}</Label>
              <Input
                placeholder={t('refuelings:placeholders.city')}
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          </div>

          {/* Tipos de Combustível */}
          <div className="space-y-2">
            <Label>{t('refuelings:fields.fuelTypesAvailable')}</Label>
            <Input
              placeholder={t('refuelings:placeholders.fuelTypes')}
              value={formData.fuel_types || ''}
              onChange={(e) => setFormData({ ...formData, fuel_types: e.target.value as any })}
            />
          </div>

          {/* Serviços Adicionais */}
          <div className="space-y-3">
            <Label>{t('refuelings:info.services')}</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="convenience_store"
                  checked={formData.has_convenience_store === 'true'}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, has_convenience_store: checked ? 'true' : 'false' })
                  }
                />
                <label htmlFor="convenience_store" className="text-sm font-medium cursor-pointer">
                  {t('refuelings:fields.convenienceStore')}
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="car_wash"
                  checked={formData.has_car_wash === 'true'}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, has_car_wash: checked ? 'true' : 'false' })
                  }
                />
                <label htmlFor="car_wash" className="text-sm font-medium cursor-pointer">
                  {t('refuelings:fields.carWash')}
                </label>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>{t('refuelings:fields.notes')}</Label>
            <Textarea
              placeholder={t('refuelings:placeholders.stationNotes')}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('refuelings:actions.creating') : t('refuelings:actions.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}