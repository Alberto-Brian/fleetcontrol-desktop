// ========================================
// FILE: src/components/driver/ViewDriverDialog.tsx (ATUALIZADO COMPLETO)
// ========================================
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, CheckCircle2, Clock, UserX, Truck, Ban, MapPin, Phone, Mail, Calendar, 
  FileText, CreditCard, RotateCcw, Info, Lock, Navigation, User, Briefcase, StickyNote
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDrivers } from '@/contexts/DriversContext';
import { cn } from '@/lib/utils';
import { driverStatus, driverAvailability } from '@/lib/db/schemas/drivers';

// Sub-diálogos parciais
import UpdateDriverStatusDialog from './UpdateDriverStatusDialog';
import UpdateDriverAvailabilityDialog from './UpdateDriverAvailabilityDialog';
import UpdateDriverLicenseDialog from './UpdateDriverLicenseDialog';
import UpdateDriverContactDialog from './UpdateDriverContactDialog';
import { PermissionGate } from '@/components/PermissionGate';

interface ViewDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewDriverDialog({ open, onOpenChange }: ViewDriverDialogProps) {
  const { t } = useTranslation();
  const { state: { selectedDriver } } = useDrivers();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  if (!selectedDriver || !open) return null;

  function getStatusBadge(status: string) {
    const statusMap = {
      active: { label: t('drivers:status.active.label'), icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      on_leave: { label: t('drivers:status.on_leave.label'), icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
      terminated: { label: t('drivers:status.terminated.label'), icon: UserX, className: 'bg-slate-50 text-slate-600 border-slate-200' },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.active;
    const Icon = statusInfo.icon;
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1.5 font-bold px-3 py-1 rounded-full text-xs", statusInfo.className)}>
        <Icon className="w-3.5 h-3.5" />
        {statusInfo.label}
      </Badge>
    );
  }

  function getAvailabilityBadge(availability: string) {
    const availabilityMap = {
      available: { label: t('drivers:availability.available.label'), icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      on_trip: { label: t('drivers:availability.on_trip.label'), icon: Truck, className: 'bg-blue-50 text-blue-700 border-blue-200' },
      offline: { label: t('drivers:availability.offline.label'), icon: Ban, className: 'bg-slate-50 text-slate-600 border-slate-200' },
    };
    const availabilityInfo = availabilityMap[availability as keyof typeof availabilityMap] || availabilityMap.offline;
    const Icon = availabilityInfo.icon;
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1.5 font-bold px-3 py-1 rounded-full text-xs", availabilityInfo.className)}>
        <Icon className="w-3.5 h-3.5" />
        {availabilityInfo.label}
      </Badge>
    );
  }

  function isLicenseExpiring(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }

  function isLicenseExpired(expiryDate: string): boolean {
    return new Date(expiryDate) < new Date();
  }

  const isOnTrip = selectedDriver.availability === driverAvailability.ON_TRIP;
  const isOnLeave = selectedDriver.status === driverStatus.ON_LEAVE;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold">{selectedDriver.name}</DialogTitle>
                <DialogDescription className="mt-1">
                  {selectedDriver.license_number} - {t('drivers:categories.' + selectedDriver.license_category)}
                </DialogDescription>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {getAvailabilityBadge(selectedDriver.availability)}
                {getStatusBadge(selectedDriver.status)}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* AÇÕES RÁPIDAS */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                <RotateCcw className="w-3 h-3" /> {t('drivers:dialogs.view.quickActions')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Disponibilidade - Desabilitado quando em viagem */}
                <PermissionGate permission="driver:update"><button
                  onClick={() => !isOnTrip && setAvailabilityDialogOpen(true)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left group relative overflow-hidden",
                    isOnTrip 
                      ? "border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-60"
                      : "border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-50/50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isOnTrip 
                      ? "bg-slate-200 text-slate-500"
                      : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
                  )}>
                    {isOnTrip ? <Lock className="w-5 h-5" /> : <Navigation className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('drivers:fields.availability')}</p>
                    <p className="font-bold text-sm mt-0.5 truncate">
                      {isOnTrip ? t('drivers:dialogs.view.onTripLocked') : t('drivers:dialogs.view.changeAvailability')}
                    </p>
                  </div>
                  {isOnTrip && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        {t('drivers:dialogs.availability.auto')}
                      </span>
                    </div>
                  )}
                </button></PermissionGate>

                {/* Estado Contratual - Desabilitado quando em licença */}
                <PermissionGate permission="driver:update"><button
                  onClick={() => !isOnLeave && setStatusDialogOpen(true)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left group relative overflow-hidden",
                    isOnLeave
                      ? "border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-60"
                      : "border-border bg-card hover:border-amber-500/50 hover:bg-amber-50/50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isOnLeave
                      ? "bg-slate-200 text-slate-500"
                      : "bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white"
                  )}>
                    {isOnLeave ? <Lock className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('drivers:fields.status')}</p>
                    <p className="font-bold text-sm mt-0.5 truncate">
                      {isOnLeave ? t('drivers:dialogs.view.onLeaveLocked') : t('drivers:dialogs.view.changeStatus')}
                    </p>
                  </div>
                  {isOnLeave && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                        {t('drivers:dialogs.status.auto')}
                      </span>
                    </div>
                  )}
                </button></PermissionGate>

                {/* Carta */}
                <PermissionGate permission="driver:update"><button
                  onClick={() => setLicenseDialogOpen(true)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left group",
                    (isLicenseExpiring(selectedDriver.license_expiry_date) || isLicenseExpired(selectedDriver.license_expiry_date))
                      ? "border-destructive/50 bg-destructive/5 hover:border-destructive hover:bg-destructive/10"
                      : "border-border bg-card hover:border-blue-500/50 hover:bg-blue-50/50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    (isLicenseExpiring(selectedDriver.license_expiry_date) || isLicenseExpired(selectedDriver.license_expiry_date))
                      ? "bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white"
                      : "bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white"
                  )}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('drivers:fields.licenseNumber')}</p>
                    <p className="font-bold text-sm mt-0.5">
                      {(isLicenseExpiring(selectedDriver.license_expiry_date) || isLicenseExpired(selectedDriver.license_expiry_date))
                        ? t('drivers:alerts.updateLicense')
                        : t('drivers:dialogs.view.updateLicense')}
                    </p>
                  </div>
                </button></PermissionGate>

                {/* Contacto */}
                <PermissionGate permission="driver:update"><button
                  onClick={() => setContactDialogOpen(true)}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-card hover:border-purple-500/50 hover:bg-purple-50/50 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('drivers:fields.phone')}</p>
                    <p className="font-bold text-sm mt-0.5">{t('drivers:dialogs.view.updateContact')}</p>
                  </div>
                </button></PermissionGate>
              </div>

              {/* Info quando em viagem */}
              {isOnTrip && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold">{t('drivers:dialogs.view.onTripInfoTitle')}</span> {t('drivers:dialogs.view.onTripInfoDescription')}
                  </p>
                </div>
              )}

              {/* Info quando em licença */}
              {isOnLeave && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold">{t('drivers:dialogs.view.onLeaveInfoTitle')}</span> {t('drivers:dialogs.view.onLeaveInfoDescription')}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              {/* Contactos */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> {t('drivers:dialogs.view.contactInfo')}
                </h3>
                <div className="space-y-2">
                  {selectedDriver.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedDriver.phone}</span>
                    </div>
                  )}
                  {selectedDriver.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedDriver.email}</span>
                    </div>
                  )}
                  {(selectedDriver.address || selectedDriver.city) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {[selectedDriver.address, selectedDriver.city].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Carta */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-3 h-3" /> {t('drivers:dialogs.view.licenseInfo')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">{t('drivers:fields.licenseNumber')}</p>
                    <p className="font-mono font-medium">{selectedDriver.license_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('drivers:fields.licenseCategory')}</p>
                    <p className="font-medium">{t('drivers:categories.' + selectedDriver.license_category)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('drivers:info.validUntil')}</p>
                    <p className={cn(
                      "font-medium",
                      isLicenseExpired(selectedDriver.license_expiry_date) && "text-destructive font-bold",
                      isLicenseExpiring(selectedDriver.license_expiry_date) && "text-amber-600 font-bold"
                    )}>
                      {new Date(selectedDriver.license_expiry_date).toLocaleDateString('pt-PT')}
                      {isLicenseExpired(selectedDriver.license_expiry_date) && ` (${t('drivers:alerts.licenseExpired').replace('!', '')})`}
                      {isLicenseExpiring(selectedDriver.license_expiry_date) && ` (${t('drivers:alerts.licenseExpiring')})`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dados Profissionais */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="w-3 h-3" /> {t('drivers:dialogs.view.employmentInfo')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedDriver.hire_date && (
                    <div>
                      <p className="text-muted-foreground text-xs">{t('drivers:info.admittedOn')}</p>
                      <p className="font-medium">{new Date(selectedDriver.hire_date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs">{t('drivers:info.registeredOn')}</p>
                    <p className="font-medium">{new Date(selectedDriver.created_at).toLocaleDateString('pt-PT')}</p>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {selectedDriver.notes && (
                <div className="p-4 bg-muted/30 rounded-xl">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                    <StickyNote className="w-3 h-3" /> {t('drivers:fields.notes')}
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedDriver.notes}</p>
                </div>
              )}
            </div>


            <div className="text-center text-xs text-muted-foreground pt-4">
              <p>{t('drivers:dialogs.view.fullEditHint')}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-diálogos parciais */}
      <UpdateDriverStatusDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen} />
      <UpdateDriverAvailabilityDialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen} />
      <UpdateDriverLicenseDialog open={licenseDialogOpen} onOpenChange={setLicenseDialogOpen} />
      <UpdateDriverContactDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} />
    </>
  );
}