// ========================================
// FILE: src/components/workshop/NewWorkshopDialog.tsx (COMPLETO)
// ========================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Plus, Building2 } from 'lucide-react';
import { createWorkshop } from '@/helpers/workshop-helpers';
import { ICreateWorkshop } from '@/lib/types/workshop';
import { useMaintenances } from '@/contexts/MaintenancesContext';
import { RESTORE_WORKSHOP } from '@/helpers/ipc/db/workshops/workshops-channels';
import { PermissionGate } from '@/components/PermissionGate';

interface NewWorkshopDialogProps { onSuccess?: () => void; }
export default function NewWorkshopDialog({ onSuccess }: NewWorkshopDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { addWorkshop, updateWorkshop } = useMaintenances();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ICreateWorkshop>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    specialties: '',
    notes: '',
  });

  // ✨ Escuta workshops restaurados
  useEffect(() => {
    const handleWorkshopRestored = (event: any) => {
      const { handler, result } = event.detail;
      
      if (handler === RESTORE_WORKSHOP && result) {
        updateWorkshop(result);
        setOpen(false);
        resetForm();
      }
    };

    window.addEventListener('action-completed', handleWorkshopRestored);
    
    return () => {
      window.removeEventListener('action-completed', handleWorkshopRestored);
    };
  }, [updateWorkshop]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newWorkshop = await createWorkshop(formData);
      
      addWorkshop(newWorkshop);
      showSuccess('maintenances:workshops.toast.createSuccess');
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      // ✨ SIMPLES - useErrorHandler trata tudo (incluindo toast de restaurar)
      handleError(error, 'maintenances:workshops.toast.createError');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      specialties: '',
      notes: '',
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="workshop:create"><DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('maintenances:workshops.newWorkshop')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t('maintenances:workshops.dialogs.new.title')}
          </DialogTitle>
          <DialogDescription>
            {t('maintenances:workshops.dialogs.new.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label>{t('maintenances:workshops.fields.name')} *</Label>
            <Input
              placeholder={t('maintenances:workshops.placeholders.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Telefone e Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('maintenances:workshops.fields.phone')}</Label>
              <Input
                type="tel"
                placeholder={t('maintenances:workshops.placeholders.phone')}
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('maintenances:workshops.fields.email')}</Label>
              <Input
                type="email"
                placeholder={t('maintenances:workshops.placeholders.email')}
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Cidade e Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('maintenances:workshops.fields.city')}</Label>
              <Input
                placeholder={t('maintenances:workshops.placeholders.city')}
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('maintenances:workshops.fields.state')}</Label>
              <Input
                placeholder={t('maintenances:workshops.placeholders.state')}
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label>{t('maintenances:workshops.fields.address')}</Label>
            <Input
              placeholder={t('maintenances:workshops.placeholders.address')}
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Especialidades */}
          <div className="space-y-2">
            <Label>{t('maintenances:workshops.fields.specialties')}</Label>
            <Input
              placeholder={t('maintenances:workshops.placeholders.specialties')}
              value={formData.specialties || ''}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>{t('maintenances:workshops.fields.notes')}</Label>
            <Textarea
              placeholder={t('maintenances:workshops.placeholders.notes')}
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
              {isLoading ? t('maintenances:actions.creating') : t('maintenances:actions.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}