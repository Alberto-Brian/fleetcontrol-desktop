// ========================================
// FILE: src/components/driver/NewDriverDialog.tsx (REVERTIDO - CAMPOS ESSENCIAIS APENAS)
// ========================================
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Plus, User, CreditCard, Phone, Mail } from 'lucide-react';
import { createDriver as createDriverHelper } from '@/helpers/driver-helpers';
import { useDrivers } from '@/contexts/DriversContext';
import { PermissionGate } from '@/components/PermissionGate';

interface NewDriverDialogProps {
  onSuccess?: () => void;
}

export default function NewDriverDialog({ onSuccess }: NewDriverDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, handleError } = useErrorHandler();
  const { addDriver } = useDrivers();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    license_category: 'B',
    license_expiry_date: '',
    phone: '',
    email: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newDriver = await createDriverHelper(formData);
      if (newDriver) {
        addDriver(newDriver);
        showSuccess(t('drivers:toast.createSuccess'));
        setOpen(false);
        resetForm();
        onSuccess?.();
      }
    } catch (error: any) {
      handleError(error, t('drivers:toast.createError'));
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      license_number: '',
      license_category: 'B',
      license_expiry_date: '',
      phone: '',
      email: '',
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PermissionGate permission="driver:create"><DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('drivers:newDriver')}
        </Button>
      </DialogTrigger></PermissionGate>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('drivers:dialogs.new.title')}</DialogTitle>
          <DialogDescription>
            {t('drivers:dialogs.new.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('drivers:fields.name')} *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('drivers:placeholders.name')}
              required
            />
          </div>

          {/* Carta de Condução */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="license_number" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {t('drivers:fields.licenseNumber')} *
              </Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value.toUpperCase() })}
                placeholder={t('drivers:placeholders.licenseNumber')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_category">{t('drivers:fields.licenseCategory')} *</Label>
              <Select
                value={formData.license_category}
                onValueChange={(value) => setFormData({ ...formData, license_category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D', 'E'].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat} - {t('drivers:categories.' + cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Validade */}
          <div className="space-y-2">
            <Label htmlFor="license_expiry">{t('drivers:fields.licenseExpiryDate')} *</Label>
            <Input
              id="license_expiry"
              type="date"
              value={formData.license_expiry_date}
              onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
              required
            />
          </div>

          {/* Contactos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {t('drivers:fields.phone')}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('drivers:placeholders.phone')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t('drivers:fields.email')}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('drivers:placeholders.email')}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('drivers:actions.creating') : t('drivers:actions.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}