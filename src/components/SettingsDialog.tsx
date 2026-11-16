// ========================================
// FILE: src/components/SettingsDialog.tsx
// ========================================
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import ToggleTheme from '@/components/ToggleTheme';
import { useFontFamily, useFontSize } from '@/hooks/useFontFamily';
import { useGlassSettings }           from '@/hooks/useGlassSettings';
import { useLayoutSettings }          from '@/hooks/useLayoutSettings';
import { useLayoutPadding }           from '@/hooks/useLayoutPadding';
import { useMapSettings }             from '@/hooks/useMapSettings';
import { toast } from 'sonner';
import {
  Settings, Globe, Palette, Info, AlertCircle,
  Mail, Phone, MapPin, Building2, HardDrive, Download, Upload,
  Clock, Loader2, CheckCircle, XCircle, Camera, Trash2, Save,
  Building, Hash, AtSign, ImageIcon, FileText, Bell, Car,
  Fuel, Sliders, RotateCcw, Eye, EyeOff, Droplets, Filter,
  Key, ShieldCheck, RefreshCw, PanelLeft, Maximize2, Server, WifiOff, Wifi, User,
  Database, Search, BarChart, Moon, Sun, LayoutList, Bookmark,
  Lock, LockOpen, ShieldAlert, RotateCw,
} from 'lucide-react';
import { usePageViewSettings } from '@/hooks/usePageViewSettings';
import { Button }   from '@/components/ui/button';
import { Switch }   from '@/components/ui/switch';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn }       from '@/lib/utils';

import { exportBackup, restoreBackup, restoreFromAutoBackup, getBackupConfig, updateBackupConfig, listBackups,
         onBackupProgress, removeBackupProgressListener,
         onRestoreProgress, removeRestoreProgressListener } from '@/helpers/backup-helpers';
import { getSystemVersion, listDatabases, getDatabaseStats, deleteDatabase, listBackupDatabases } from '@/helpers/system-helpers';
import { getCompanySettings, updateCompanySettings, uploadCompanyLogo, removeCompanyLogo } from '@/helpers/company-helpers';
import { getSystemSettings, updateSystemSettings, resetSystemSettings }                    from '@/helpers/system-settings-helpers';
import { removeLicense, getLicenseSeats, revokeSession, COMPANY_PROFILE_SYNCED_EVENT, type ILicenseSeats } from '@/helpers/license-helpers';
import { usePermission } from '@/hooks/usePermission';
import { listLocalUnlockRecords, removeLocalUnlockRecord, type ILocalUnlockRecord } from '@/helpers/local-users-helpers';
import { requestNotificationPermission, isAlertSoundEnabled, setAlertSoundEnabled, playAlertSound } from '@/helpers/notifications';
import {
  isSyncSoundEnabled, setSyncSoundEnabled, playSyncSound,
  isSyncToastEnabled, setSyncToastEnabled,
  getSyncToastPosition, setSyncToastPositionSetting, type SyncToastPosition,
} from '@/helpers/sync-notifications';
import PowerSyncStatusPage                        from '@/pages/PowerSyncStatusPage';
import { useLicense }                             from '@/hooks/useLicense';
import { LicenseActivationDialog }                from '@/components/LicenseActivationDialog';
import ConfirmDeleteDialog                        from '@/components/ConfirmDeleteDialog';
import { useHistoricalDb }                        from '@/contexts/HistoricalDbContext';

import { ICompanySettings, IUpdateCompanySettings }           from '@/lib/types/company';
import { ISystemSettings, IUpdateSystemSettings }             from '@/lib/types/system-settings';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers reutilizáveis
// ─────────────────────────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}
function SettingRow({ label, description, children }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}
function SettingSection({ title, description, children }: SectionProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2.5 mb-3">
        <div className="mt-0.5 h-3.5 w-0.5 rounded-full bg-primary/50 shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      <div className="px-1">{children}</div>
    </div>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  hint?: string;
  disabled?: boolean;
}
function NumberInput({ value, onChange, min = 0, max, unit, hint, disabled }: NumberInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="h-8 w-24 text-sm text-right"
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modais Auxiliares de Backup (com traduções)
// ─────────────────────────────────────────────────────────────────────────────

interface ProgressModalProps {
  open: boolean; type: 'backup'|'restore'; progress: number;
  phase: string; message: string; status: 'loading'|'success'|'error';
}
function ProgressModal({ open, type, progress, phase, message, status }: ProgressModalProps) {
  const { t } = useTranslation('settings');
  const getIcon = () => {
    if (status === 'error')   return <XCircle className="w-12 h-12 text-destructive" />;
    if (status === 'success') return <CheckCircle className="w-12 h-12 text-green-500" />;
    return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
  };
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            {type === 'backup' ? t('backups.progressBackup') : t('backups.progressRestore')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="flex justify-center">{getIcon()}</div>
          <div className="text-center space-y-1.5">
            <p className="text-base font-semibold">{phase}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          {status === 'loading' && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2.5" />
              <p className="text-sm text-center text-muted-foreground font-medium">{progress.toFixed(0)}%</p>
            </div>
          )}
          {status === 'error'   && <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center text-sm text-destructive">{message}</div>}
          {status === 'success' && <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center text-sm text-green-700 dark:text-green-400">{message}</div>}
        </div>
        {status === 'loading' && (
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />{t('backups.dontClose')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmRestoreModal({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean)=>void; onConfirm: ()=>void }) {
  const { t } = useTranslation('settings');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="w-5 h-5" />{t('backups.confirmRestore')}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm">{t('backups.confirmRestoreText')}</p>
          <div className="text-sm text-muted-foreground space-y-1.5">
            <p>• {t('backups.confirmBullet1')}</p>
            <p>• {t('backups.confirmBullet2')}</p>
            <p>• {t('backups.confirmBullet3')}</p>
            <p className="font-medium text-foreground pt-2">{t('backups.confirmIrreversible')}</p>
          </div>
        </div>
        <DialogFooter className="gap-3 sm:gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('backups.confirmCancel')}</Button>
          <Button variant="destructive" onClick={onConfirm}>{t('backups.confirmYes')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultModal({ open, onOpenChange, type, title, message }: { open: boolean; onOpenChange: (o: boolean)=>void; type: 'success'|'error'; title: string; message: string }) {
  const { t } = useTranslation('settings');
  const Icon  = type === 'success' ? CheckCircle : XCircle;
  const color = type === 'success' ? 'text-green-600' : 'text-destructive';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className={`flex items-center gap-2 ${color}`}><Icon className="w-5 h-5" />{title}</DialogTitle></DialogHeader>
        <div className="py-6"><p className="text-sm leading-relaxed text-center">{message}</p></div>
        <DialogFooter><Button onClick={() => onOpenChange(false)} className="w-full">{t('backups.confirmCancel').replace('Cancelar','Fechar').replace('Cancel','Close')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook genérico para guardar alterações
// ─────────────────────────────────────────────────────────────────────────────
function useSaveStatus(successMsg?: string) {
  const [status, setStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [isDirty, setIsDirty] = useState(false);

  function markDirty() { setIsDirty(true); setStatus('idle'); }

  async function save(fn: () => Promise<void>) {
    setStatus('saving');
    try {
      await fn();
      setIsDirty(false);
      setStatus('saved');
      toast.success(successMsg ?? 'Configurações guardadas com sucesso.');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err: any) {
      setStatus('error');
      toast.error(err?.message ?? 'Erro ao guardar configurações.');
    }
  }

  return { status, isDirty, markDirty, save };
}

// ─────────────────────────────────────────────────────────────────────────────
// Botão Guardar reutilizável
// ─────────────────────────────────────────────────────────────────────────────
function SaveButton({ status, isDirty, onClick }: { status: string; isDirty: boolean; onClick: ()=>void }) {
  const { t } = useTranslation('settings');
  return (
    <Button
      onClick={onClick}
      disabled={!isDirty || status === 'saving'}
      size="sm"
      className={cn(
        'gap-2 min-w-[110px] transition-all',
        status === 'saved' && 'bg-emerald-600 hover:bg-emerald-700',
        status === 'error' && 'bg-destructive hover:bg-destructive/90',
      )}
    >
      {status === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" />{t('saving')}</>
      : status === 'saved' ? <><CheckCircle className="w-4 h-4" />{t('saved')}</>
      : status === 'error' ? <><XCircle className="w-4 h-4" />{t('error')}</>
      : <><Save className="w-4 h-4" />{t('save')}</>}
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Empresa
// ─────────────────────────────────────────────────────────────────────────────
function CompanyTab() {
  const { t } = useTranslation('settings');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings]   = useState<ICompanySettings | null>(null);
  const [form, setForm]           = useState<IUpdateCompanySettings>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo]   = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { status, isDirty, markDirty, save } = useSaveStatus();

  useEffect(() => {
    loadSettings();
    // Os dados chegam do servidor em segundo plano — actualizar se o
    // separador estiver aberto quando isso acontecer.
    window.addEventListener(COMPANY_PROFILE_SYNCED_EVENT, loadSettings);
    return () => window.removeEventListener(COMPANY_PROFILE_SYNCED_EVENT, loadSettings);
  }, []);

  async function loadSettings() {
    const data = await getCompanySettings();
    if (data) {
      setSettings(data);
      setForm({
        company_name: data.company_name, tax_id: data.tax_id ?? '',
        phone: data.phone ?? '', email: data.email ?? '',
        address: data.address ?? '', city: data.city ?? '',
        state: data.state ?? '', postal_code: data.postal_code ?? '',
        currency: data.currency, timezone: data.timezone,
      });
      setLogoPreview(data.logo_base64 ?? null);
    }
  }

  function handleChange(field: keyof IUpdateCompanySettings, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    markDirty();
  }

  async function handleLogoFile(file: File) {
    setIsUploadingLogo(true);
    try {
      const { settings: updated, logo } = await uploadCompanyLogo(file);
      setSettings(updated);
      setLogoPreview(logo.base64);
    } catch (err: any) { alert(err.message ?? t('company.errors.logoFormat')); }
    finally { setIsUploadingLogo(false); }
  }

  async function handleRemoveLogo() {
    setIsRemovingLogo(true);
    try {
      const updated = await removeCompanyLogo();
      if (updated) setSettings(updated);
      setLogoPreview(null);
    } finally { setIsRemovingLogo(false); }
  }

  const companyInitial = form.company_name?.charAt(0)?.toUpperCase() ?? 'E';

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold mb-0.5">{t('company.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('company.description')}</p>
        </div>
      </div>

      {/* 2026-11-16 — dados vindos da organização no servidor (editados no
          organization-admin); só o logótipo se define aqui, em cada posto. */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>{t('company.managedRemotely')}</span>
      </div>

      {/* Logo */}
      <div className="flex items-start gap-6 p-4 rounded-xl border border-border bg-card/50">
        <div
          className={cn('relative group w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-all flex-shrink-0',
            isDragging ? 'border-primary bg-primary/10 scale-105' : 'border-border hover:border-primary/50 hover:bg-muted/50',
            isUploadingLogo && 'pointer-events-none opacity-60')}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) handleLogoFile(f); }}
        >
          {isUploadingLogo ? <Loader2 className="w-7 h-7 text-primary animate-spin" />
          : logoPreview ? (
            <><img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-5 h-5 text-white" /></div></>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-center px-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black text-white" style={{ background: 'hsl(var(--primary))' }}>{companyInitial}</div>
              <span className="text-[9px] text-muted-foreground leading-tight">{t('company.logoClick')}</span>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold">{t('company.logo')}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t('company.logoDescription')}<br />{t('company.logoHint')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={isUploadingLogo || isRemovingLogo}>
              <Upload className="w-3.5 h-3.5" />{logoPreview ? t('company.logoChange') : t('company.logoUpload')}
            </Button>
            {logoPreview && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleRemoveLogo} disabled={isRemovingLogo || isUploadingLogo}>
                {isRemovingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}{t('company.logoRemove')}
              </Button>
            )}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); e.target.value=''; }} />
      </div>

      {/* Identificação */}
      <SettingSection title={t('company.identification')}>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-muted-foreground" />{t('company.name')} *</Label>
            <Input disabled value={form.company_name ?? ''} onChange={e => handleChange('company_name', e.target.value)} placeholder={t('company.namePlaceholder')} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-muted-foreground" />{t('company.taxId')}</Label>
            <Input disabled value={form.tax_id ?? ''} onChange={e => handleChange('tax_id', e.target.value)} placeholder={t('company.taxIdPlaceholder')} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{t('company.phone')}</Label>
            <Input disabled value={form.phone ?? ''} onChange={e => handleChange('phone', e.target.value)} placeholder={t('company.phonePlaceholder')} className="h-9 text-sm" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><AtSign className="w-3.5 h-3.5 text-muted-foreground" />{t('company.email')}</Label>
            <Input disabled value={form.email ?? ''} onChange={e => handleChange('email', e.target.value)} placeholder={t('company.emailPlaceholder')} type="email" className="h-9 text-sm" />
          </div>
        </div>
      </SettingSection>

      {/* Morada */}
      <SettingSection title={t('company.address')}>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />{t('company.street')}</Label>
            <Input disabled value={form.address ?? ''} onChange={e => handleChange('address', e.target.value)} placeholder={t('company.streetPlaceholder')} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('company.city')}</Label>
            <Input disabled value={form.city ?? ''} onChange={e => handleChange('city', e.target.value)} placeholder={t('company.cityPlaceholder')} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('company.state')}</Label>
            <Input disabled value={form.state ?? ''} onChange={e => handleChange('state', e.target.value)} placeholder={t('company.statePlaceholder')} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('company.postalCode')}</Label>
            <Input disabled value={form.postal_code ?? ''} onChange={e => handleChange('postal_code', e.target.value)} placeholder={t('company.postalPlaceholder')} className="h-9 text-sm" />
          </div>
        </div>
      </SettingSection>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Relatórios PDF
// ─────────────────────────────────────────────────────────────────────────────
function PdfTab() {
  const { t } = useTranslation('settings');
  const [form, setForm] = useState<IUpdateSystemSettings>({});
  const { status, isDirty, markDirty, save } = useSaveStatus();

  useEffect(() => {
    getSystemSettings().then(s => setForm({
      pdf_watermark_enabled:  s.pdf_watermark_enabled,
      pdf_watermark_use_logo: s.pdf_watermark_use_logo,
      pdf_watermark_text:     s.pdf_watermark_text,
      pdf_watermark_opacity:  s.pdf_watermark_opacity,
      pdf_primary_color:      s.pdf_primary_color,
      pdf_secondary_color:    s.pdf_secondary_color,
      pdf_show_footer:        s.pdf_show_footer,
      pdf_show_summary:       s.pdf_show_summary,
      pdf_show_charts:        s.pdf_show_charts,
      pdf_paper_size:         s.pdf_paper_size,
      pdf_orientation:        s.pdf_orientation,
      pdf_value_format:       s.pdf_value_format,
      pdf_show_currency:      s.pdf_show_currency,
    }));
  }, []);

  function set<K extends keyof IUpdateSystemSettings>(k: K, v: IUpdateSystemSettings[K]) {
    setForm(p => ({ ...p, [k]: v }));
    markDirty();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold mb-0.5">{t('pdf.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('pdf.description')}</p>
        </div>
        <SaveButton status={status} isDirty={isDirty} onClick={() => save(() => updateSystemSettings(form).then(() => {}))} />
      </div>

      {/* Marca de água */}
      <SettingSection title={t('pdf.watermark')} description={t('pdf.watermarkDesc')}>
        <SettingRow label={t('pdf.watermarkEnabled')}>
          <Switch checked={!!form.pdf_watermark_enabled} onCheckedChange={v => set('pdf_watermark_enabled', v)} />
        </SettingRow>
        {form.pdf_watermark_enabled && (
          <>
            <SettingRow label={t('pdf.watermarkUseLogo')} description={t('pdf.watermarkUseLogoDesc')}>
              <Switch checked={!!form.pdf_watermark_use_logo} onCheckedChange={v => set('pdf_watermark_use_logo', v)} />
            </SettingRow>
            {!form.pdf_watermark_use_logo && (
              <SettingRow label={t('pdf.watermarkText')}>
                <Input value={form.pdf_watermark_text ?? ''} onChange={e => set('pdf_watermark_text', e.target.value)}
                  placeholder={t('pdf.watermarkTextPlaceholder')} className="h-8 w-48 text-sm" />
              </SettingRow>
            )}
            <SettingRow label={t('pdf.watermarkOpacity')} description={t('pdf.watermarkOpacityHint')}>
              <Input value={form.pdf_watermark_opacity ?? '0.10'} onChange={e => set('pdf_watermark_opacity', e.target.value)}
                placeholder="0.10" className="h-8 w-24 text-sm text-right" />
            </SettingRow>
          </>
        )}
      </SettingSection>

      {/* Cores */}
      <SettingSection title={t('pdf.colors')} description={t('pdf.colorsDesc')}>
        <SettingRow label={t('pdf.primaryColor')} description={t('pdf.primaryColorHint')}>
          <div className="flex items-center gap-2">
            <input type="color" value={form.pdf_primary_color ?? '#2563eb'}
              onChange={e => set('pdf_primary_color', e.target.value)}
              className="w-9 h-8 rounded border border-border cursor-pointer p-0.5 bg-transparent" />
            <Input value={form.pdf_primary_color ?? '#2563eb'} onChange={e => set('pdf_primary_color', e.target.value)}
              className="h-8 w-28 text-sm font-mono" maxLength={7} />
          </div>
        </SettingRow>
        <SettingRow label={t('pdf.secondaryColor')} description={t('pdf.secondaryColorHint')}>
          <div className="flex items-center gap-2">
            <input type="color" value={form.pdf_secondary_color ?? '#64748b'}
              onChange={e => set('pdf_secondary_color', e.target.value)}
              className="w-9 h-8 rounded border border-border cursor-pointer p-0.5 bg-transparent" />
            <Input value={form.pdf_secondary_color ?? '#64748b'} onChange={e => set('pdf_secondary_color', e.target.value)}
              className="h-8 w-28 text-sm font-mono" maxLength={7} />
          </div>
        </SettingRow>

        {/* Preview */}
        <div className="mt-3 p-3 rounded-lg border border-border bg-card/50">
          <p className="text-xs text-muted-foreground mb-2">{t('pdf.colorPreview')}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1 rounded text-white text-xs font-bold" style={{ backgroundColor: form.pdf_primary_color ?? '#2563eb' }}>Cabeçalho</div>
            <div className="px-3 py-1 rounded text-white text-xs font-bold" style={{ backgroundColor: form.pdf_secondary_color ?? '#64748b' }}>Auxiliar</div>
            <div className="h-1 flex-1 rounded" style={{ backgroundColor: form.pdf_primary_color ?? '#2563eb' }} />
          </div>
        </div>
      </SettingSection>

      {/* Layout */}
      <SettingSection title={t('pdf.layout')} description={t('pdf.layoutDesc')}>
        <SettingRow label={t('pdf.showCharts')} description={t('pdf.showChartsDesc')}>
          <Switch checked={!!form.pdf_show_charts} onCheckedChange={v => set('pdf_show_charts', v)} />
        </SettingRow>
        <SettingRow label={t('pdf.showFooter')}>
          <Switch checked={!!form.pdf_show_footer} onCheckedChange={v => set('pdf_show_footer', v)} />
        </SettingRow>
        <SettingRow label={t('pdf.showSummary')}>
          <Switch checked={!!form.pdf_show_summary} onCheckedChange={v => set('pdf_show_summary', v)} />
        </SettingRow>

        <SettingRow label={t('pdf.valueFormat')} description={t('pdf.valueFormatDesc')}>
          <select
            value={form.pdf_value_format ?? 'compact'}
            onChange={e => set('pdf_value_format', e.target.value as any)}
            className="h-8 px-2 text-sm rounded border border-input bg-background"
          >
            <option value="compact">{t('pdf.valueFormatCompact')}</option>
            <option value="full">{t('pdf.valueFormatFull')}</option>
          </select>
        </SettingRow>
 
        <SettingRow label={t('pdf.showCurrency')} description={t('pdf.showCurrencyDesc')}>
          <Switch
            checked={!!form.pdf_show_currency}
            onCheckedChange={v => set('pdf_show_currency', v)}
          />
        </SettingRow>

        <SettingRow label={t('pdf.paperSize')}>
          <select value={form.pdf_paper_size ?? 'A4'} onChange={e => set('pdf_paper_size', e.target.value as any)}
            className="h-8 px-2 text-sm rounded border border-input bg-background">
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </SettingRow>
        <SettingRow label={t('pdf.orientation')}>
          <select value={form.pdf_orientation ?? 'portrait'} onChange={e => set('pdf_orientation', e.target.value as any)}
            className="h-8 px-2 text-sm rounded border border-input bg-background">
            <option value="portrait">{t('pdf.portrait')}</option>
            <option value="landscape">{t('pdf.landscape')}</option>
          </select>
        </SettingRow>
      </SettingSection>

      {isDirty && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: t('unsavedChanges') }} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab genérica para Alertas / Viagens / Combustível / Sistema
// Partilham o mesmo padrão de carregar/guardar system_settings
// ─────────────────────────────────────────────────────────────────────────────
function SystemSettingsTab({ children, tabTitle, tabDesc, fields }: {
  children: (form: IUpdateSystemSettings, set: <K extends keyof IUpdateSystemSettings>(k: K, v: IUpdateSystemSettings[K]) => void) => React.ReactNode;
  tabTitle: string; tabDesc: string;
  fields: (keyof ISystemSettings)[];
}) {
  const [form, setForm] = useState<IUpdateSystemSettings>({});
  const { status, isDirty, markDirty, save } = useSaveStatus();

  useEffect(() => {
    getSystemSettings().then(s => {
      const partial: IUpdateSystemSettings = {};
      fields.forEach(k => { (partial as any)[k] = (s as any)[k]; });
      setForm(partial);
    });
  }, []);

  function set<K extends keyof IUpdateSystemSettings>(k: K, v: IUpdateSystemSettings[K]) {
    setForm(p => ({ ...p, [k]: v }));
    markDirty();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold mb-0.5">{tabTitle}</h3>
          <p className="text-sm text-muted-foreground">{tabDesc}</p>
        </div>
        <SaveButton status={status} isDirty={isDirty} onClick={() => save(() => updateSystemSettings(form).then(() => {}))} />
      </div>
      {children(form, set)}
      {isDirty && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Licença
// ─────────────────────────────────────────────────────────────────────────────
function LicenseTab() {
  const { t }                                = useTranslation('settings');
  const { license, loading, refreshLicense } = useLicense();
  const [showActivation, setShowActivation]  = useState(false);
  const [removing, setRemoving]              = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Seats (utilizadores concorrentes) — Fase 11B.3/11B.6. seatsForbidden
  // fica true num 403 (sem permission session:read) — nesse caso a secção
  // inteira não é mostrada, nunca um erro; é assim que "só utilizadores
  // permitidos podem ver isto" é garantido, pelo backend, não aqui.
  const [seats, setSeats]                    = useState<ILicenseSeats | null>(null);
  const [seatsLoading, setSeatsLoading]       = useState(false);
  const [seatsForbidden, setSeatsForbidden]   = useState(false);

  // 2026-09-20 — achado real: esta secção nunca teve nenhuma verificação de
  // permissão no lado do cliente (ao contrário do padrão já usado para as
  // acções de GPS, usePermission) — dependia só do 403 do servidor, e
  // chegava a aparecer (cabeçalho + spinner) por instantes antes disso ser
  // conhecido. session:read decide se a secção sequer tenta carregar;
  // session:revoke (separado) decide se o botão "Revogar" aparece — antes,
  // quem tivesse só session:read via e podia clicar em "Revogar" para
  // qualquer sessão, só falhando no servidor.
  const canReadSessions   = usePermission('session:read');
  const canRevokeSessions = usePermission('session:revoke');

  // Confirmação de revogação de sessão (ConfirmDeleteDialog, RBAC-gated no
  // servidor — session:revoke — já não precisa de reconfirmar a própria
  // password aqui, ao contrário do antigo fluxo por desktop).
  const [revokeSessionTarget, setRevokeSessionTarget] = useState<{ id: string; label: string } | null>(null);
  const [revokingSession, setRevokingSession]         = useState(false);

  // 2026-09-20 — "utilizadores locais desta máquina" (cadeados, Fase
  // 11B.10) — distinto das Sessões activas acima (essas são o servidor a
  // mostrar utilizadores concorrentes em TODA a Organization; isto é só
  // quem já fez login, alguma vez, nesta instalação específica, mesmo
  // offline). Mesmo gating de permissão que as sessões — é informação
  // sobre outras pessoas, não deve ficar visível a qualquer sessão válida.
  const [localRecords, setLocalRecords]               = useState<ILocalUnlockRecord[] | null>(null);
  const [localRecordsLoading, setLocalRecordsLoading]  = useState(false);
  const [removingLocalId, setRemovingLocalId]          = useState<string | null>(null);
  const [removeLocalTarget, setRemoveLocalTarget]      = useState<ILocalUnlockRecord | null>(null);

  async function loadLocalRecords() {
    setLocalRecordsLoading(true);
    try {
      setLocalRecords(await listLocalUnlockRecords());
    } finally {
      setLocalRecordsLoading(false);
    }
  }

  async function handleRemoveLocalRecord() {
    if (!removeLocalTarget) return;
    setRemovingLocalId(removeLocalTarget.id);
    try {
      await removeLocalUnlockRecord(removeLocalTarget.id);
      toast.success('Registo local removido');
      setRemoveLocalTarget(null);
      await loadLocalRecords();
    } catch (err: any) {
      toast.error('Erro ao remover registo', { description: err?.message || 'Tenta novamente.' });
    } finally {
      setRemovingLocalId(null);
    }
  }

  useEffect(() => {
    if (canReadSessions) loadLocalRecords();
  }, [canReadSessions]);

  const modeLabel: Record<string, string> = {
    connected:  t('license.modeConnected'),
  };

  const typeLabel: Record<string, string> = {
    trial:        t('license.typeTrial'),
    basic:        t('license.typeBasic'),
    professional: t('license.typeProfessional'),
    enterprise:   t('license.typeEnterprise'),
  };

  useEffect(() => {
    if (license?.isValid && canReadSessions) {
      loadSeats();
    }
  }, [license?.isValid, canReadSessions]);

  async function loadSeats() {
    setSeatsLoading(true);
    try {
      const data = await getLicenseSeats();
      setSeats(data);
      setSeatsForbidden(false);
    } catch (err: any) {
      if (err?.response?.status === 403) setSeatsForbidden(true);
      // outros erros (offline, etc.) — silencioso, mesma disciplina do fluxo antigo
    } finally {
      setSeatsLoading(false);
    }
  }

  async function handleRevokeSession() {
    if (!revokeSessionTarget) return;
    setRevokingSession(true);
    try {
      await revokeSession(revokeSessionTarget.id);
      toast.success('Sessão revogada', { description: 'O seat foi libertado.' });
      setRevokeSessionTarget(null);
      await loadSeats();
    } catch (err: any) {
      toast.error('Erro ao revogar sessão', { description: err?.response?.data?.message || 'Tenta novamente.' });
    } finally {
      setRevokingSession(false);
    }
  }

  async function handleRemove() {
    setShowRemoveConfirm(false);
    setRemoving(true);
    try {
      await removeLicense();
      window.location.reload();
    } finally {
      setRemoving(false);
    }
  }

  async function handleActivationSuccess() {
    setShowActivation(false);
    await refreshLicense();
    setTimeout(() => window.location.reload(), 800);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold mb-0.5">{t('license.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('license.subtitle')}</p>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowActivation(true)}>
          <RefreshCw className="w-4 h-4" />{t('license.reactivate')}
        </Button>
      </div>

      {license?.isValid ? (
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">{t('license.active')}</p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {license.mode ? modeLabel[license.mode] ?? license.mode : '—'}
                {license.licenseType ? ` · ${typeLabel[license.licenseType] ?? license.licenseType}` : ''}
              </p>
            </div>
          </div>

          {/* Detalhes */}
          <div className="p-4 rounded-xl border border-border bg-card/50 space-y-3 text-sm">
            {[
              { label: t('license.client'),   value: license.clientName },
              { label: t('license.email'),    value: license.clientEmail },
              { label: t('license.nif'),      value: license.clientNIF },
              { label: t('license.users'),    value: license.maxUsers != null ? t('license.usersUpTo', { max: license.maxUsers }) : undefined },
              {
                label: t('license.validity'),
                value: license.expiryDate
                  ? `${new Date(license.expiryDate).toLocaleDateString()}${license.daysRemaining != null ? ` ${t('license.validityDays', { days: license.daysRemaining })}` : ''}`
                  : undefined,
              },
              {
                label: t('license.features'),
                value: license.features?.length ? license.features.join(', ') : undefined,
              },
            ]
              .filter(r => r.value)
              .map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="font-medium text-right">{value}</span>
                </div>
              ))}
          </div>

          {/* Seats (utilizadores concorrentes) — Fase 11B.3/11B.6. Secção
              omitida sem session:read — verificado no cliente (canReadSessions,
              2026-09-20, evita sequer tentar o pedido/flash) E no servidor
              (seatsForbidden, mantido como defesa em profundidade — a
              autoridade real continua a ser sempre o backend). */}
          {canReadSessions && !seatsForbidden && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sessões activas</p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={loadSeats} disabled={seatsLoading}>
                  {seatsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Actualizar
                </Button>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                {seatsLoading && !seats ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> A carregar...
                  </div>
                ) : !seats || seats.users.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Nenhum utilizador com sessão activa</div>
                ) : (
                  <div className="divide-y divide-border">
                    {seats.users.map((u) => (
                      <div key={u.userId} className="px-4 py-3 text-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="pl-10 space-y-1">
                          {u.sessions.map((s) => {
                            const lastSeen = new Date(s.lastSeenAt).toLocaleDateString('pt', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            });
                            return (
                              <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-muted-foreground">{s.clientType} · último acesso {lastSeen}</span>
                                {canRevokeSessions && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setRevokeSessionTarget({ id: s.id, label: `${u.name} (${s.clientType})` })}
                                  >
                                    Revogar
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {seats && (
                <p className="text-xs text-muted-foreground">
                  {seats.used}/{seats.max} utilizador(es) concorrente(s) em uso.
                  Revoga uma sessão para libertar um seat.
                </p>
              )}
            </div>
          )}

          {/* Utilizadores locais desta máquina (cadeados, Fase 11B.10,
              2026-09-20) — distinto das Sessões activas acima: isto é só
              quem já fez login, alguma vez, NESTA instalação (mesmo
              offline), não o servidor a mostrar utilizadores concorrentes
              em toda a Organization. Mesmo gating (session:read/revoke),
              é informação sobre outras pessoas. */}
          {canReadSessions && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Utilizadores locais desta máquina</p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={loadLocalRecords} disabled={localRecordsLoading}>
                  {localRecordsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Actualizar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cada pessoa que já fez login online nesta máquina fica com um registo local ("cadeado"),
                usado para continuar a entrar offline com a última sessão válida. Remove um registo para
                obrigar essa pessoa a fazer login online de novo antes de voltar a usar esta máquina offline.
              </p>

              <div className="rounded-xl border border-border overflow-hidden">
                {localRecordsLoading && !localRecords ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> A carregar...
                  </div>
                ) : !localRecords || localRecords.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Sem registos locais nesta máquina</div>
                ) : (
                  <div className="divide-y divide-border">
                    {localRecords.map((u) => (
                      <div key={u.id} className="px-4 py-3 text-sm flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.email}{u.last_access_at ? ` · último acesso ${new Date(u.last_access_at).toLocaleDateString('pt', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                          </p>
                        </div>
                        {canRevokeSessions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => setRemoveLocalTarget(u)}
                            disabled={removingLocalId === u.id}
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zona de Risco */}
          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('license.dangerZone')}</p>
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">{t('license.removeWarning')}</p>
              </div>
              <Button variant="destructive" size="sm" className="w-full gap-2" onClick={() => setShowRemoveConfirm(true)} disabled={removing}>
                {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('license.remove')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('license.noLicense')}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">{license?.error ?? t('license.noLicenseFound')}</p>
            </div>
          </div>
          <Button className="w-full gap-2" onClick={() => setShowActivation(true)}>
            <Key className="w-4 h-4" />{t('license.activate')}
          </Button>
        </div>
      )}

      <LicenseActivationDialog
        open={showActivation}
        onOpenChange={setShowActivation}
        onSuccess={handleActivationSuccess}
      />

      {/* Achado real (2026-09-12): usava window.confirm() (modal do SO, sem
          estilo), diferente de todos os outros pontos de confirmação
          destrutiva da app — trocado pelo mesmo ConfirmDeleteDialog já
          usado em todo o resto (veículos, motoristas, viagens, etc.). */}
      <ConfirmDeleteDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        onConfirm={handleRemove}
        title={t('license.remove')}
        description={t('license.removeConfirm')}
        warning={t('license.removeWarning')}
        isLoading={removing}
      />

      {/* Revogar uma sessão — RBAC-gated no servidor (session:revoke), por
          isso já não precisa de reconfirmar a própria password aqui (ao
          contrário do antigo fluxo por desktop) — mesmo ConfirmDeleteDialog
          reutilizado em toda a app. */}
      <ConfirmDeleteDialog
        open={!!revokeSessionTarget}
        onOpenChange={(o) => { if (!o) setRevokeSessionTarget(null); }}
        onConfirm={handleRevokeSession}
        title="Revogar sessão"
        description={revokeSessionTarget ? `Esta acção termina a sessão de ${revokeSessionTarget.label} e liberta um seat da licença.` : undefined}
        isLoading={revokingSession}
      />

      {/* Remover um "cadeado" local (Fase 11B.10) — não afecta a sessão
          activa dessa pessoa no servidor (isso é Revogar sessão, acima); só
          obriga um novo login online nesta máquina antes de voltar a
          desbloquear offline. */}
      <ConfirmDeleteDialog
        open={!!removeLocalTarget}
        onOpenChange={(o) => { if (!o) setRemoveLocalTarget(null); }}
        onConfirm={handleRemoveLocalRecord}
        title="Remover utilizador local"
        description={removeLocalTarget ? `${removeLocalTarget.name} (${removeLocalTarget.email}) vai precisar de fazer login online de novo antes de conseguir usar esta máquina offline.` : undefined}
        isLoading={removingLocalId === removeLocalTarget?.id}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Servidor
// ─────────────────────────────────────────────────────────────────────────────
function ServerTab() {
  const { t } = useTranslation('settings');
  const [url, setUrl]           = useState('');
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const { status, isDirty, markDirty, save } = useSaveStatus();
  const savedUrlRef = useRef('');

  useEffect(() => {
    (window as any).system.getServerUrl().then((u: string) => {
      const loaded = u || 'http://localhost:3001';
      setUrl(loaded);
      savedUrlRef.current = loaded;
    });
  }, []);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
      setTestResult(res.ok ? 'ok' : 'fail');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold mb-0.5">{t('server.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('server.subtitle')}</p>
        </div>
        <SaveButton
          status={status}
          isDirty={isDirty}
          onClick={() => save(async () => {
            const trimmedUrl = url.trim();
            await (window as any).system.setServerUrl(trimmedUrl);
            if (trimmedUrl !== savedUrlRef.current) {
              window.dispatchEvent(new CustomEvent('serverUrlChanged', { detail: trimmedUrl }));
              savedUrlRef.current = trimmedUrl;
            }
          })}
        />
      </div>

      <SettingSection title={t('server.apiUrl')}>
        <div className="py-2 space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{t('server.apiUrlDesc')}</p>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={e => { setUrl(e.target.value); markDirty(); setTestResult(null); }}
                placeholder={t('server.apiUrlPlaceholder')}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing} className="shrink-0 gap-2">
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : testResult === 'ok' ? <Wifi className="w-3.5 h-3.5 text-green-500" /> : testResult === 'fail' ? <WifiOff className="w-3.5 h-3.5 text-destructive" /> : <Wifi className="w-3.5 h-3.5" />}
                {testing ? t('server.testing') : t('server.testConnection')}
              </Button>
            </div>
          </div>
          {testResult === 'ok' && (
            <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />{t('server.connectionOk')}
            </p>
          )}
          {testResult === 'fail' && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="w-3.5 h-3.5" />{t('server.connectionFail')}
            </p>
          )}
        </div>
      </SettingSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SyncTab — pedido do utilizador (2026-09-0X): "Estado do PowerSync" deixou
// de ter acesso rápido próprio (não é uma acção do dia-a-dia) e passou a
// viver aqui, junto com o interruptor de notificação sonora — um único
// sítio para tudo o que é sincronização automática.
// ─────────────────────────────────────────────────────────────────────────────
function SyncTab() {
  const { t } = useTranslation('settings');
  const [soundEnabled, setSoundEnabled] = useState(() => isSyncSoundEnabled());
  const [toastEnabled, setToastEnabled] = useState(() => isSyncToastEnabled());
  const [toastPosition, setToastPosition] = useState<SyncToastPosition>(() => getSyncToastPosition());

  function handleToggleSound(checked: boolean) {
    setSyncSoundEnabled(checked);
    setSoundEnabled(checked);
    if (checked) playSyncSound(); // pré-visualização imediata ao activar
  }

  function handleToggleToast(checked: boolean) {
    setSyncToastEnabled(checked);
    setToastEnabled(checked);
  }

  function handleChangeToastPosition(value: SyncToastPosition) {
    setSyncToastPositionSetting(value);
    setToastPosition(value);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-0.5">{t('sync.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('sync.subtitle')}</p>
      </div>

      <SettingSection title={t('sync.notificationsTitle')}>
        <SettingRow label={t('sync.soundLabel')} description={t('sync.soundDescription')}>
          <Switch checked={soundEnabled} onCheckedChange={handleToggleSound} />
        </SettingRow>
        <SettingRow label={t('sync.toastLabel')} description={t('sync.toastDescription')}>
          <Switch checked={toastEnabled} onCheckedChange={handleToggleToast} />
        </SettingRow>
        <SettingRow label={t('sync.toastPositionLabel')} description={t('sync.toastPositionDescription')}>
          <Select
            value={toastPosition}
            onValueChange={(v) => handleChangeToastPosition(v as SyncToastPosition)}
            disabled={!toastEnabled}
          >
            <SelectTrigger className="min-w-[220px] w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="own-corner">{t('sync.toastPositionOwnCorner')}</SelectItem>
              <SelectItem value="same-as-toasts">{t('sync.toastPositionSameAsToasts')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingSection>

      <SettingSection title={t('sync.statusTitle')} description={t('sync.statusDescription')}>
        <PowerSyncStatusPage />
      </SettingSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GeofenceAlertsTab
// ─────────────────────────────────────────────────────────────────────────────
function GeofenceAlertsTab() {
  const { t } = useTranslation('tracking');
  // Os três campos de localStorage são lidos imediatamente para não depender do servidor
  const [localSettings, setLocalSettings] = useState(() => ({
    nativeNotificationsEnabled: localStorage.getItem('nativeNotificationsEnabled') === 'true',
    notifyWhenFocused:          localStorage.getItem('notifyWhenFocused') === 'true',
    osOnlyNotifications:        localStorage.getItem('osOnlyNotifications') === 'true',
    notifyNativeEnter:    true, notifyNativeExit: true, notifyNativeSpeed: true,
    notifyIgnitionOn:     false, notifyIgnitionOff: false,
    notifyDeviceMoving:   false, notifyDeviceStopped: false,
    cooldownSpeedMs:      60000,
  }));
  const { status, isDirty, markDirty, save } = useSaveStatus();
  // Sinal sonoro — mesmo padrão do SyncTab (helpers/sync-notifications.ts):
  // escrita imediata no localStorage, independente do botão Guardar (que só
  // se aplica aos campos do servidor/dos outros locais desta aba).
  const [soundEnabled, setSoundEnabled] = useState(() => isAlertSoundEnabled());

  function handleToggleSound(checked: boolean) {
    setAlertSoundEnabled(checked);
    setSoundEnabled(checked);
    if (checked) playAlertSound(); // pré-visualização imediata ao activar
  }

  // Só actualiza os campos do servidor — os campos de localStorage já estão no estado inicial
  useEffect(() => {
    (window as any)._tracking.getAlertSettings()
      .then((s: any) => {
        if (s) setLocalSettings(prev => ({
          ...prev,
          notifyNativeEnter:   s.notifyNativeEnter   ?? prev.notifyNativeEnter,
          notifyNativeExit:    s.notifyNativeExit    ?? prev.notifyNativeExit,
          notifyNativeSpeed:   s.notifyNativeSpeed   ?? prev.notifyNativeSpeed,
          notifyIgnitionOn:    s.notifyIgnitionOn    ?? prev.notifyIgnitionOn,
          notifyIgnitionOff:   s.notifyIgnitionOff   ?? prev.notifyIgnitionOff,
          notifyDeviceMoving:  s.notifyDeviceMoving   ?? prev.notifyDeviceMoving,
          notifyDeviceStopped: s.notifyDeviceStopped  ?? prev.notifyDeviceStopped,
          cooldownSpeedMs:     s.cooldownSpeedMs     ?? prev.cooldownSpeedMs,
        }));
      })
      .catch(console.error);
  }, []);

  function update<K extends keyof typeof localSettings>(k: K, v: typeof localSettings[K]) {
    setLocalSettings(p => ({ ...p, [k]: v }));
    markDirty();
  }

  async function handleToggleNativeNotifications() {
    const next = !localSettings.nativeNotificationsEnabled;
    if (next) await requestNotificationPermission();
    update('nativeNotificationsEnabled', next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold mb-0.5">{t('settings.alertsTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('settings.alertsDesc')}</p>
        </div>
        <SaveButton
          status={status}
          isDirty={isDirty}
          onClick={() => save(async () => {
            localStorage.setItem('nativeNotificationsEnabled', String(localSettings.nativeNotificationsEnabled));
            localStorage.setItem('notifyWhenFocused', String(localSettings.notifyWhenFocused));
            localStorage.setItem('osOnlyNotifications', String(localSettings.osOnlyNotifications));
            const { nativeNotificationsEnabled, notifyWhenFocused, osOnlyNotifications, ...serverSettings } = localSettings;
            await (window as any)._tracking.updateAlertSettings(serverSettings);
            window.dispatchEvent(new CustomEvent('alertSettingsChanged', { detail: localSettings }));
          })}
        />
      </div>

      {/* Notificações nativas do SO */}
      <SettingSection title={t('settings.nativeOsTitle')}>
        <SettingRow
          label={t('settings.nativeOsNotifications')}
          description={t('settings.nativeOsNotificationsDesc')}
        >
          <Switch
            checked={localSettings.nativeNotificationsEnabled}
            onCheckedChange={handleToggleNativeNotifications}
          />
        </SettingRow>
        <SettingRow
          label={t('settings.soundLabel')}
          description={t('settings.soundDescription')}
        >
          <Switch checked={soundEnabled} onCheckedChange={handleToggleSound} />
        </SettingRow>
      </SettingSection>

      {/* Tipos de alerta */}
      <SettingSection title={t('settings.alertsTitle')}>
        <SettingRow label={t('settings.notifyEnter')}>
          <Switch checked={localSettings.notifyNativeEnter}  onCheckedChange={v => update('notifyNativeEnter', v)} />
        </SettingRow>
        <SettingRow label={t('settings.notifyExit')}>
          <Switch checked={localSettings.notifyNativeExit}   onCheckedChange={v => update('notifyNativeExit', v)} />
        </SettingRow>
        <SettingRow label={t('settings.notifySpeed')}>
          <Switch checked={localSettings.notifyNativeSpeed}  onCheckedChange={v => update('notifyNativeSpeed', v)} />
        </SettingRow>
        <SettingRow label={t('settings.notifyIgnitionOn')}>
          <Switch checked={localSettings.notifyIgnitionOn}   onCheckedChange={v => update('notifyIgnitionOn', v)} />
        </SettingRow>
        <SettingRow label={t('settings.notifyIgnitionOff')}>
          <Switch checked={localSettings.notifyIgnitionOff}  onCheckedChange={v => update('notifyIgnitionOff', v)} />
        </SettingRow>
        <SettingRow label={t('settings.notifyDeviceMoving')}>
          <Switch checked={localSettings.notifyDeviceMoving}  onCheckedChange={v => update('notifyDeviceMoving', v)} />
        </SettingRow>
        <SettingRow label={t('settings.notifyDeviceStopped')}>
          <Switch checked={localSettings.notifyDeviceStopped} onCheckedChange={v => update('notifyDeviceStopped', v)} />
        </SettingRow>
        <SettingRow label={t('settings.cooldownSpeed')}>
          <NumberInput
            value={localSettings.cooldownSpeedMs / 1000}
            onChange={v => update('cooldownSpeedMs', v * 1000)}
            min={0}
            unit="s"
          />
        </SettingRow>
      </SettingSection>

      {isDirty && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Bases de dados
// ─────────────────────────────────────────────────────────────────────────────
// PIN de acesso à zona do programador — alterar antes de distribuir
const DEV_ACCESS_PIN = '4321';

// Tabelas transacionais geridas pelo sistema de retenção
const RETENTION_TABLES: { key: string; timestampColumn: string; defaultDays: number }[] = [
  { key: 'trips',             timestampColumn: 'created_at', defaultDays: 60 },
  { key: 'maintenances',      timestampColumn: 'created_at', defaultDays: 30 },
  { key: 'maintenance_items', timestampColumn: 'created_at', defaultDays: 30 },
  { key: 'expenses',          timestampColumn: 'created_at', defaultDays: 60 },
  { key: 'refuelings',        timestampColumn: 'created_at', defaultDays: 30 },
  { key: 'fines',             timestampColumn: 'created_at', defaultDays: 90 },
];

// Tabelas master — copiadas na totalidade ao rotacionar
const MASTER_TABLE_KEYS = [
  'vehicles', 'drivers', 'users', 'routes',
  'fuel_stations', 'vehicle_categories', 'maintenance_categories',
  'expense_categories', 'categories', 'workshops',
  'company_settings', 'vehicle_documents',
];

function DatabasesTab({ devUnlocked, onDevUnlock, onDevLock }: {
  devUnlocked: boolean;
  onDevUnlock: () => void;
  onDevLock: () => void;
}) {
  const { t } = useTranslation('settings');
  const { historicalDbPath, activate, deactivate } = useHistoricalDb();

  const [dbs, setDbs]           = useState<import('@/types/types').DbFileInfo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [stats, setStats]       = useState<Record<string, number> | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError]     = useState<string | null>(null);
  const [activating, setActivating]     = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget]   = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  // Backup databases state
  const [backupDbs, setBackupDbs]             = useState<import('@/types/types').BackupDbEntry[]>([]);
  const [backupDbsLoading, setBackupDbsLoading] = useState(true);
  const [expandedBackup, setExpandedBackup]   = useState<string | null>(null);

  // Developer zone
  const [pin, setPin]           = useState('');
  const [pinError, setPinError] = useState(false);

  // DB Management config
  const [dbConfig, setDbConfig]         = useState<DbManagementConfig | null>(null);
  const [dbConfigLoading, setDbConfigLoading] = useState(false);
  const [dbConfigSaving, setDbConfigSaving]   = useState(false);

  // Force rotate confirm
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [rotating, setRotating]                   = useState(false);

  // Apply retention confirm
  const [showRetentionConfirm, setShowRetentionConfirm] = useState(false);
  const [applyingRetention, setApplyingRetention]       = useState(false);

  // DB management status — loaded for all users to show rotation alerts
  const [dbMgmtStatus, setDbMgmtStatus] = useState<DbManagementStatus | null>(null);

  useEffect(() => {
    listDatabases()
      .then(setDbs)
      .catch(() => setDbs([]))
      .finally(() => setLoading(false));
    listBackupDatabases()
      .then(setBackupDbs)
      .catch(() => setBackupDbs([]))
      .finally(() => setBackupDbsLoading(false));
    if (window.dbManagement) {
      window.dbManagement.getStatus()
        .then(setDbMgmtStatus)
        .catch(() => {});
    }
  }, []);

  // Load DB management config when developer zone is unlocked
  useEffect(() => {
    if (devUnlocked && !dbConfig) {
      setDbConfigLoading(true);
      window.dbManagement.getConfig()
        .then(setDbConfig)
        .catch(() => {})
        .finally(() => setDbConfigLoading(false));
    }
  }, [devUnlocked]);

  function handleUnlock() {
    if (pin === DEV_ACCESS_PIN) {
      onDevUnlock();
      setPin('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  }

  async function handleSaveConfig() {
    if (!dbConfig) return;
    setDbConfigSaving(true);
    try {
      const res = await window.dbManagement.saveConfig(dbConfig);
      if (res.success) toast.success(t('databases.dbMgmtSaveSuccess'));
      else toast.error(t('databases.dbMgmtSaveError'));
    } catch {
      toast.error(t('databases.dbMgmtSaveError'));
    } finally {
      setDbConfigSaving(false);
    }
  }

  async function handleForceRotate() {
    setShowRotateConfirm(false);
    setRotating(true);
    try {
      const res = await window.dbManagement.forceRotate();
      if (res.success) {
        toast.success(t('databases.rotForceSuccess'));
        listDatabases().then(setDbs).catch(() => {});
      } else {
        toast.error(`${t('databases.rotForceError')}: ${res.error ?? ''}`);
      }
    } catch (err: any) {
      toast.error(`${t('databases.rotForceError')}: ${err.message}`);
    } finally {
      setRotating(false);
    }
  }

  async function handleApplyRetention() {
    if (!dbConfig) return;
    setShowRetentionConfirm(false);
    setApplyingRetention(true);
    const tables = RETENTION_TABLES
      .filter(t => dbConfig.retention.tables[t.key]?.enabled)
      .map(t => ({
        tableName: t.key,
        retentionDays: dbConfig.retention.tables[t.key]?.retentionDays ?? 30,
        timestampColumn: t.timestampColumn,
      }));
    try {
      const res = await window.dbManagement.applyRetention(tables);
      if (res.success) toast.success(t('databases.retentionApplySuccess'));
      else toast.error(`${t('databases.retentionApplyError')}: ${res.error ?? ''}`);
    } catch (err: any) {
      toast.error(`${t('databases.retentionApplyError')}: ${err.message}`);
    } finally {
      setApplyingRetention(false);
    }
  }

  async function handleSelect(filepath: string) {
    if (selected === filepath) {
      setSelected(null);
      setStats(null);
      return;
    }
    setSelected(filepath);
    setStats(null);
    setStatsError(null);
    setStatsLoading(true);
    try {
      const result = await getDatabaseStats(filepath);
      if (result?.error) {
        setStatsError(t('databases.statsError'));
      } else {
        setStats(result as Record<string, number>);
      }
    } catch {
      setStatsError(t('databases.statsError'));
    } finally {
      setStatsLoading(false);
    }
  }

  async function handleActivate(filepath: string) {
    setActivating(filepath);
    try {
      await activate(filepath);
      window.location.reload();
    } finally { setActivating(null); }
  }

  async function handleDeactivate() {
    setActivating('deactivate');
    try {
      await deactivate();
      window.location.reload();
    } finally { setActivating(null); }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !deletePassword) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteDatabase(deleteTarget, deletePassword);
      if (res.success) {
        setDbs(prev => prev.filter(d => d.filepath !== deleteTarget));
        setDeleteTarget(null);
        setDeletePassword('');
        if (selected === deleteTarget) { setSelected(null); setStats(null); }
        toast.success(t('databases.deleteSuccess'));
      } else {
        const errKey =
          res.error === 'invalid-password' ? 'databases.deleteErrorPassword' :
          res.error === 'active-db'        ? 'databases.deleteErrorActive'   :
          res.error === 'not-found'        ? 'databases.deleteErrorNotFound' :
                                             'databases.deleteErrorGeneric';
        setDeleteError(t(errKey));
      }
    } catch {
      setDeleteError(t('databases.deleteErrorGeneric'));
    } finally {
      setDeleting(false);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  const tableLabels: Record<string, string> = {
    vehicles:    t('databases.tables.vehicles'),
    drivers:     t('databases.tables.drivers'),
    trips:       t('databases.tables.trips'),
    refuelings:  t('databases.tables.refuelings'),
    maintenances:t('databases.tables.maintenances'),
    expenses:    t('databases.tables.expenses'),
    fines:       t('databases.tables.fines'),
    users:       t('databases.tables.users'),
    routes:      t('databases.tables.routes'),
  };

  // Active DB size for the alert
  const activeDb = dbs.find(d => d.isActive);
  const activeSizeMB = activeDb ? activeDb.size / (1024 * 1024) : 0;
  const warnSizeMB = 150; // Alert threshold independent of management mode

  return (
    <div className="space-y-8">

      {/* ── DB size alert (visible to all users) ── */}
      {!loading && activeSizeMB > warnSizeMB && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t('databases.dbSizeAlertTitle')}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              {t('databases.dbSizeAlertText').replace('{{size}}', activeSizeMB.toFixed(1))}
            </p>
          </div>
        </div>
      )}

      {/* Rotation needed — DB already exceeded limits */}
      {!loading && dbMgmtStatus?.mode === 'rotation' && dbMgmtStatus.needsRotation && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">{t('databases.rotationNeededTitle')}</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{t('databases.rotationNeededText')}</p>
          </div>
        </div>
      )}

      {/* Rotation approaching — DB at 80%+ of configured limit */}
      {!loading && dbMgmtStatus?.mode === 'rotation' && !dbMgmtStatus.needsRotation
        && dbMgmtStatus.maxSizeInMB < Number.MAX_SAFE_INTEGER
        && dbMgmtStatus.sizeInMB >= dbMgmtStatus.maxSizeInMB * 0.8 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">{t('databases.rotationApproachingTitle')}</p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">
              {t('databases.rotationApproachingText')
                .replace('{{size}}', dbMgmtStatus.sizeInMB.toFixed(1))
                .replace('{{max}}', dbMgmtStatus.maxSizeInMB.toFixed(0))}
            </p>
          </div>
        </div>
      )}

      {/* ── Developer Zone ── */}
      <div className="rounded-xl border border-dashed border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{t('databases.devZoneTitle')}</span>
          </div>
          {devUnlocked && (
            <Button size="sm" variant="ghost" onClick={onDevLock}
              className="h-6 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground">
              <Lock className="w-3 h-3" />
              {t('databases.devZoneLockBtn')}
            </Button>
          )}
        </div>

        <div className="px-4 py-4">
          {!devUnlocked ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t('databases.devZoneLockHint')}</p>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  maxLength={8}
                  placeholder={t('databases.devZonePinPlaceholder')}
                  value={pin}
                  onChange={e => { setPin(e.target.value); setPinError(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleUnlock(); }}
                  className="h-8 text-sm w-36"
                />
                <Button size="sm" onClick={handleUnlock} className="h-8 gap-1 text-xs">
                  <LockOpen className="w-3.5 h-3.5" />
                  {t('databases.devZoneUnlockBtn')}
                </Button>
              </div>
              {pinError && <p className="text-xs text-destructive">{t('databases.devZoneWrongPin')}</p>}
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── DB Management section ── */}
              <div>
                <p className="text-sm font-semibold mb-1">{t('databases.dbMgmtTitle')}</p>
                <p className="text-xs text-muted-foreground mb-4">{t('databases.dbMgmtDesc')}</p>

                {dbConfigLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('databases.loading')}
                  </div>
                ) : dbConfig && (
                  <div className="space-y-5">
                    {/* Mode selector */}
                    <div className="grid grid-cols-3 gap-2">
                      {(['disabled', 'rotation', 'retention'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setDbConfig((c: DbManagementConfig | null) => c ? { ...c, mode } : c)}
                          className={cn(
                            'rounded-lg border p-3 text-left transition-colors',
                            dbConfig.mode === mode
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <p className="text-xs font-semibold mb-1">{t(`databases.mode_${mode}`)}</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">{t(`databases.mode_${mode}_desc`)}</p>
                        </button>
                      ))}
                    </div>

                    {/* Table classification */}
                    <div className="rounded-lg border border-border/50 overflow-hidden">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 px-3 py-2 bg-muted/30 border-b border-border/50">
                        {t('databases.tableClassificationTitle')}
                      </p>
                      <div className="grid grid-cols-2 divide-x divide-border/50">
                        <div className="p-3 space-y-2">
                          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                            {t('databases.masterTablesLabel')}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {MASTER_TABLE_KEYS.map(key => (
                              <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                {t(`databases.table_${key}`)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                            {t('databases.transactionalTablesLabel')}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {RETENTION_TABLES.map(({ key, defaultDays }) => (
                              <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 inline-flex items-center gap-1">
                                {t(`databases.table_${key}`)}
                                <span className="opacity-50">·{defaultDays}d</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rotation settings */}
                    {dbConfig.mode === 'rotation' && (
                      <div className="space-y-3 pt-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">{t('databases.rotationSettings')}</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { key: 'maxSizeInMB', label: t('databases.rotMaxSizeLabel'), desc: t('databases.rotMaxSizeDesc'), unit: 'MB' },
                            { key: 'maxAgeInDays', label: t('databases.rotMaxAgeLabel'), desc: t('databases.rotMaxAgeDesc'), unit: t('databases.retentionDaysLabel') },
                            { key: 'transitionPeriodDays', label: t('databases.rotTransitionDaysLabel'), desc: t('databases.rotTransitionDaysDesc'), unit: t('databases.retentionDaysLabel') },
                          ].map(({ key, label, desc, unit }) => (
                            <div key={key} className="space-y-1.5">
                              <Label className="text-xs font-medium">{label}</Label>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  min={1}
                                  value={(dbConfig.rotation as any)[key] ?? ''}
                                  onChange={e => setDbConfig((c: DbManagementConfig | null) => c ? {
                                    ...c,
                                    rotation: { ...c.rotation, [key]: parseInt(e.target.value) || 1 }
                                  } : c)}
                                  className="h-8 text-sm"
                                />
                                <span className="text-xs text-muted-foreground shrink-0">{unit}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRotateConfirm(true)}
                          disabled={rotating}
                          className="h-8 text-xs gap-1.5 border-orange-500/40 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
                        >
                          {rotating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                          {t('databases.rotForceBtn')}
                        </Button>
                      </div>
                    )}

                    {/* Retention settings */}
                    {dbConfig.mode === 'retention' && (
                      <div className="space-y-3 pt-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">{t('databases.retentionSettings')}</p>
                        <p className="text-xs text-muted-foreground">{t('databases.retentionDesc')}</p>
                        <div className="space-y-2">
                          {RETENTION_TABLES.map(({ key }) => {
                            const tbl = dbConfig.retention.tables[key] ?? { enabled: true, retentionDays: 30 };
                            return (
                              <div key={key} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20">
                                <input
                                  type="checkbox"
                                  checked={tbl.enabled}
                                  onChange={e => setDbConfig((c: DbManagementConfig | null) => c ? {
                                    ...c,
                                    retention: {
                                      tables: {
                                        ...c.retention.tables,
                                        [key]: { ...tbl, enabled: e.target.checked }
                                      }
                                    }
                                  } : c)}
                                  className="w-3.5 h-3.5 accent-primary"
                                />
                                <span className="text-xs font-medium flex-1">{t(`databases.table_${key}`)}</span>
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={tbl.retentionDays}
                                    disabled={!tbl.enabled}
                                    onChange={e => setDbConfig((c: DbManagementConfig | null) => c ? {
                                      ...c,
                                      retention: {
                                        tables: {
                                          ...c.retention.tables,
                                          [key]: { ...tbl, retentionDays: parseInt(e.target.value) || 1 }
                                        }
                                      }
                                    } : c)}
                                    className="h-7 text-xs w-16"
                                  />
                                  <span className="text-[11px] text-muted-foreground">{t('databases.retentionDaysLabel')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRetentionConfirm(true)}
                          disabled={applyingRetention}
                          className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          {applyingRetention ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          {t('databases.retentionApplyBtn')}
                        </Button>
                      </div>
                    )}

                    {/* Save button */}
                    <div className="pt-1">
                      <Button size="sm" onClick={handleSaveConfig} disabled={dbConfigSaving} className="h-8 text-xs gap-1.5">
                        {dbConfigSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {t('databases.dbMgmtSaveBtn')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Force rotate confirm dialog ── */}
      <Dialog open={showRotateConfirm} onOpenChange={setShowRotateConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange-600 dark:text-orange-400">{t('databases.rotForceConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('databases.rotForceConfirmText')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRotateConfirm(false)}>{t('databases.deleteCancelBtn')}</Button>
            <Button onClick={handleForceRotate} className="bg-orange-600 hover:bg-orange-700 text-white">{t('databases.rotForceConfirmBtn')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Apply retention confirm dialog ── */}
      <Dialog open={showRetentionConfirm} onOpenChange={setShowRetentionConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('databases.retentionApplyConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('databases.retentionApplyConfirmText')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetentionConfirm(false)}>{t('databases.deleteCancelBtn')}</Button>
            <Button variant="destructive" onClick={handleApplyRetention}>{t('databases.retentionApplyConfirmBtn')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Local databases ── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold mb-0.5">{t('databases.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('databases.subtitle')}</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('databases.loading')}
          </div>
        ) : dbs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
            <Database className="w-10 h-10 opacity-30" />
            <p className="text-sm">{t('databases.noData')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {dbs.map(db => {
              const isHistorical = historicalDbPath === db.filepath;
              const isExpanded   = selected === db.filepath;
              const canDelete    = !db.isActive && !isHistorical;
              return (
                <div key={db.filepath} className={cn('rounded-lg border transition-colors', isExpanded ? 'border-primary' : 'border-border')}>
                  {/* Header row */}
                  <button
                    onClick={() => handleSelect(db.filepath)}
                    className={cn('w-full text-left p-3 rounded-lg', isExpanded ? 'bg-primary/5' : 'hover:bg-muted/50')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Database className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{db.filename}</span>
                        {db.isActive && !isHistorical && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {t('databases.current')}
                          </span>
                        )}
                        {isHistorical && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            {t('databases.activated')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span>{db.recordCount > 0 ? `${db.recordCount.toLocaleString()} ${t('databases.records')}` : formatSize(db.size)}</span>
                        <span>{new Date(db.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded stats + actions */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50">
                      <div className="pt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">{db.filepath}</span>
                        <div className="shrink-0 flex items-center gap-2">
                          {isHistorical ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDeactivate}
                              disabled={activating === 'deactivate'}
                              className="h-7 text-xs gap-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                            >
                              {activating === 'deactivate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              {t('databases.deactivate')}
                            </Button>
                          ) : !db.isActive && (
                            <Button
                              size="sm"
                              onClick={() => handleActivate(db.filepath)}
                              disabled={activating === db.filepath}
                              className="h-7 text-xs gap-1"
                            >
                              {activating === db.filepath ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                              {t('databases.activate')}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setDeleteTarget(db.filepath); setDeletePassword(''); setDeleteError(null); }}
                              className="h-7 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                              {t('databases.delete')}
                            </Button>
                          )}
                        </div>
                      </div>

                      {statsLoading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {t('databases.readingStats')}
                        </div>
                      )}
                      {statsError && (
                        <p className="text-xs text-destructive">{statsError}</p>
                      )}
                      {stats && !statsLoading && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {Object.entries(stats)
                            .filter(([k]) => k !== 'error' && (stats[k] as number) > 0)
                            .map(([table, count]) => (
                              <div key={table} className="p-2 rounded-md bg-muted/50 border border-border/50">
                                <p className="text-[10px] text-muted-foreground mb-0.5 truncate">
                                  {tableLabels[table] ?? table}
                                </p>
                                <p className="text-base font-bold tabular-nums">
                                  {(count as number).toLocaleString()}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Backup databases section ── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold mb-0.5">{t('databases.backupsSection')}</h3>
          <p className="text-sm text-muted-foreground">{t('databases.backupsSubtitle')}</p>
        </div>

        {backupDbsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('databases.backupsLoading')}
          </div>
        ) : backupDbs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <HardDrive className="w-10 h-10 opacity-30" />
            <p className="text-sm">{t('databases.backupsNoData')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {backupDbs.map((backup, idx) => {
              const isExpanded = expandedBackup === backup.backupName;
              const backupDate = new Date(backup.backupDate);
              return (
                <div key={backup.backupName} className={cn('rounded-lg border transition-colors', isExpanded ? 'border-primary' : 'border-border')}>
                  <button
                    onClick={() => setExpandedBackup(isExpanded ? null : backup.backupName)}
                    className={cn('w-full text-left p-3 rounded-lg', isExpanded ? 'bg-primary/5' : 'hover:bg-muted/50')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <HardDrive className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {t('databases.backupFolderLabel')} {backupDate.toLocaleDateString()}
                        </span>
                        {idx === 0 && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 dark:text-green-400">
                            {t('backups.latestBadge')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span>{backup.databases.length} {t('databases.backupDatabaseCount')}</span>
                        <span>{formatSize(backup.sizeBytes)}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && backup.databases.length > 0 && (
                    <div className="px-3 pb-3 border-t border-border/50 space-y-2 pt-3">
                      {backup.databases.map(dbFile => {
                        const isThisHistorical = historicalDbPath === dbFile.filepath;
                        return (
                          <div key={dbFile.filepath} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 border border-border/40">
                            <div className="flex items-center gap-2 min-w-0">
                              <Database className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              <span className="text-xs truncate">{dbFile.filename}</span>
                              {isThisHistorical && (
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                  {t('databases.activated')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground">{formatSize(dbFile.sizeBytes)}</span>
                              {isThisHistorical ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleDeactivate}
                                  disabled={activating === 'deactivate'}
                                  className="h-6 text-[11px] px-2 gap-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                                >
                                  {activating === 'deactivate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                  {t('databases.deactivate')}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleActivate(dbFile.filepath)}
                                  disabled={activating === dbFile.filepath}
                                  className="h-6 text-[11px] px-2 gap-1"
                                >
                                  {activating === dbFile.filepath ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                                  {t('databases.activateBackupDb')}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) { setDeleteTarget(null); setDeletePassword(''); setDeleteError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('databases.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{t('databases.deleteConfirmText')}</p>
            {deleteTarget && (
              <p className="text-xs font-mono bg-muted px-2 py-1 rounded truncate">{deleteTarget.split(/[\\/]/).pop()}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="delete-password" className="text-sm">{t('databases.deletePasswordLabel')}</Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError(null); }}
                placeholder={t('databases.deletePasswordPlaceholder')}
                onKeyDown={e => { if (e.key === 'Enter' && deletePassword) handleDeleteConfirm(); }}
                autoFocus
              />
            </div>
            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteError(null); }}>
              {t('databases.deleteCancelBtn')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!deletePassword || deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              {t('databases.deleteConfirmBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsDialog() {
  const { t } = useTranslation('settings');
  const [activeTab, setActiveTab] = useState('appearance');
  const { fontId, setFont, options: fontOptions }                    = useFontFamily();
  const { sizeId, setFontSize, sizeOptions }                         = useFontSize();
  const {
    settings: glass, update: updateGlass,
    resetToDark, resetToLight, saveAsDefault: saveGlassAsDefault,
    resetOnThemeChange, setResetOnThemeChange,
    isDark: glassIsDark,
  } = useGlassSettings();

  const [glassTouched, setGlassTouched] = useState(false);
  const [glassSaved,   setGlassSaved]   = useState(false);
  const [glassHiding,  setGlassHiding]  = useState(false);

  function markGlassDirty() {
    if (!glassHiding) { setGlassTouched(true); setGlassSaved(false); }
  }
  function hideGlassButton() {
    setGlassHiding(true);
    setTimeout(() => { setGlassTouched(false); setGlassHiding(false); }, 200);
  }
  function onGlassSaveClick() {
    saveGlassAsDefault(glassIsDark);
    setGlassSaved(true);
    setTimeout(() => hideGlassButton(), 1100);
  }
  const { sidebarCollapsed, setSidebarCollapsed, navAutoCollapse, setNavAutoCollapse } = useLayoutSettings();
  const { hasPadding, setHasPadding }                                = useLayoutPadding();
  const { labelType, animateMarkers, pulseMarkers, setLabelType, setAnimateMarkers, setPulseMarkers } = useMapSettings();
  const [systemVersion, setSystemVersion] = useState('');
  const [search, setSearch]               = useState('');
  const [persistFilters, setPersistFiltersState] = useState(() => localStorage.getItem('app_persist_filters') === 'true');
  const { settings: viewSettings, set: setViewSetting } = usePageViewSettings();

  function togglePersistFilters(value: boolean) {
    localStorage.setItem('app_persist_filters', value ? 'true' : 'false');
    setPersistFiltersState(value);
  }

  const [persistViewMode, setPersistViewModeState] = useState(() => localStorage.getItem('app_persist_viewmode') !== 'false');

  function togglePersistViewMode(value: boolean) {
    localStorage.setItem('app_persist_viewmode', value ? 'true' : 'false');
    setPersistViewModeState(value);
  }

  const [persistPageSize, setPersistPageSizeState] = useState(() => localStorage.getItem('app_persist_pagesize') === 'true');

  function togglePersistPageSize(value: boolean) {
    localStorage.setItem('app_persist_pagesize', value ? 'true' : 'false');
    setPersistPageSizeState(value);
  }

  const [persistCurrentPage, setPersistCurrentPageState] = useState(() => localStorage.getItem('app_persist_currentpage') === 'true');

  function togglePersistCurrentPage(value: boolean) {
    localStorage.setItem('app_persist_currentpage', value ? 'true' : 'false');
    setPersistCurrentPageState(value);
  }

  // Developer mode (sessão) — acesso à zona restrita
  const [devUnlocked, setDevUnlocked] = useState<boolean>(() => {
    try { return sessionStorage.getItem('fc_dev_mode') === '1'; } catch { return false; }
  });
  function handleDevUnlock() {
    setDevUnlocked(true);
    try { sessionStorage.setItem('fc_dev_mode', '1'); } catch {}
  }
  function handleDevLock() {
    setDevUnlocked(false);
    try { sessionStorage.removeItem('fc_dev_mode'); } catch {}
  }

  // Backup states
  const [operation, setOperation]           = useState<'idle'|'exporting'|'restoring'>('idle');
  const [showProgress, setShowProgress]     = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [showResult, setShowResult]         = useState(false);
  const [progressData, setProgressData]     = useState({ type: 'backup' as 'backup'|'restore', progress: 0, phase: '', message: '', status: 'loading' as 'loading'|'success'|'error' });
  const [result, setResult]                 = useState({ type: 'success' as 'success'|'error', title: '', message: '' });
  const isBusy = operation !== 'idle';

  // Backup config + lista
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupConfig, setBackupConfig]           = useState<{ autoBackupFrequency: string; keepLastN: number; lastAutoBackup?: string } | null>(null);
  const [autoBackupList, setAutoBackupList]       = useState<{ name: string; path: string; createdAt: Date; size: number }[]>([]);
  const [loadingBackupData, setLoadingBackupData] = useState(false);
  const [autoRestoreTarget, setAutoRestoreTarget] = useState<{ name: string; path: string; createdAt: Date } | null>(null);

  useEffect(() => {
    if (activeTab !== 'backups') return;
    setLoadingBackupData(true);
    Promise.all([getBackupConfig(), listBackups()])
      .then(([cfg, list]) => {
        if (cfg) {
          setAutoBackupEnabled(cfg.autoBackupEnabled ?? true);
          setBackupConfig(cfg);
        }
        if (Array.isArray(list)) setAutoBackupList(list);
      })
      .catch(() => {})
      .finally(() => setLoadingBackupData(false));
  }, [activeTab]);

  useEffect(() => {
    getSystemVersion().then(setSystemVersion);
  }, []);

  const navSections = [
    { id: 'appearance',      icon: Palette,     label: t('nav.appearance')    },
    { id: 'views',           icon: BarChart,    label: t('nav.views')         },
    { id: 'company',         icon: Building2,   label: t('nav.company')       },
    { id: 'pdf',             icon: FileText,    label: t('nav.pdf')           },
    { id: 'geofence-alerts', icon: Bell,        label: t('nav.geofenceAlerts')},
    { id: 'backups',         icon: HardDrive,   label: t('nav.backups')       },
    { id: 'databases',       icon: Database,    label: t('nav.databases')     },
    { id: 'server',          icon: Server,      label: t('nav.server')        },
    { id: 'sync',            icon: RefreshCw,   label: t('nav.sync')          },
    { id: 'license',         icon: Key,         label: t('nav.license')       },
    { id: 'about',           icon: Info,        label: t('nav.about')         },
  ];

  const searchIndex = useMemo(() => [
    { tabId: 'appearance',      text: [t('nav.appearance'), t('appearance.title'), t('appearance.typography'), t('appearance.fontSize'), t('appearance.sidebarTitle'), t('appearance.layoutTitle'), t('appearance.glassPanel'), 'tema', 'fonte', 'font', 'tamanho', 'sidebar', 'layout', 'transparência', 'blur', 'desfoque', 'theme'].join(' ') },
    { tabId: 'language',        text: [t('nav.language'), 'idioma', 'language', 'língua', 'português', 'english'].join(' ') },
    { tabId: 'company',         text: [t('nav.company'), 'empresa', 'company', 'logo', 'nome', 'nif', 'email', 'telefone', 'morada', 'endereço', 'address'].join(' ') },
    { tabId: 'views',           text: [t('nav.views'), t('views.title'), t('views.analyticsPanels'), 'vistas', 'views', 'painéis', 'panels', 'gráficos', 'charts', 'analytics', 'veículos', 'motoristas', 'viagens', 'combustível', 'manutenção', 'análise', 'métricas'].join(' ') },
    { tabId: 'pdf',             text: [t('nav.pdf'), 'pdf', 'relatório', 'report', 'cabeçalho', 'header', 'rodapé', 'footer', 'margens', 'margins', 'impressão', 'print'].join(' ') },
    { tabId: 'geofence-alerts', text: [t('nav.geofenceAlerts'), 'alerta', 'alert', 'geofence', 'cerca', 'ignição', 'ignition', 'movimento', 'moving', 'stopped', 'parado', 'cooldown', 'notificação', 'notification', 'velocidade', 'speed'].join(' ') },
    { tabId: 'backups',         text: [t('nav.backups'), 'backup', 'cópia', 'restaurar', 'restore', 'exportar', 'import', 'export', 'automático', 'auto', 'agendamento', 'schedule'].join(' ') },
    { tabId: 'databases',       text: [t('nav.databases'), 'base de dados', 'database', 'sqlite', 'histórico', 'historical', 'eliminar', 'delete', 'db'].join(' ') },
    { tabId: 'server',          text: [t('nav.server'), 'servidor', 'server', 'api', 'conexão', 'connection', 'url', 'chave', 'key', 'traccar'].join(' ') },
    { tabId: 'sync',            text: [t('nav.sync'), 'sincronização', 'sync', 'powersync', 'som', 'sound', 'notificação', 'notification', 'offline', 'automático', 'automatic'].join(' ') },
    { tabId: 'license',         text: [t('nav.license'), 'licença', 'license', 'activar', 'activate', 'revogar', 'revoke', 'chave', 'key', 'expiração', 'expiry', 'serial'].join(' ') },
    { tabId: 'about',           text: [t('nav.about'), 'sobre', 'about', 'versão', 'version', 'copyright', 'fleetcontrol'].join(' ') },
  ], [t]);

  const filteredNavSections = search.trim()
    ? navSections.filter(s => {
        const q = search.toLowerCase();
        if (s.label.toLowerCase().includes(q)) return true;
        const entry = searchIndex.find(e => e.tabId === s.id);
        return entry ? entry.text.toLowerCase().includes(q) : false;
      })
    : navSections;

  useEffect(() => {
    if (search.trim() && filteredNavSections.length > 0 && !filteredNavSections.find(s => s.id === activeTab)) {
      setActiveTab(filteredNavSections[0].id);
    }
  }, [filteredNavSections, search]);

  // ── Backup handlers ─────────────────────────────────────────────────────────
  const handleExportBackup = async () => {
    setOperation('exporting');
    let modalShown = false;

    onBackupProgress((progress: any) => {
      if (progress.step === 'cancel') return;
      if (!modalShown) {
        setProgressData({ type: 'backup', progress: 0, phase: progress.step, message: progress.message, status: 'loading' });
        setShowProgress(true);
        modalShown = true;
      }
      setProgressData(p => ({
        ...p,
        phase: progress.step,
        message: progress.message,
        progress: progress.current ?? p.progress,
        status: progress.step === 'error' ? 'error' : 'loading',
      }));
    });

    try {
      const res = await exportBackup();
      removeBackupProgressListener();

      if (!res?.success) {
        setShowProgress(false);
        setOperation('idle');
        return;
      }

      setProgressData(p => ({ ...p, progress: 100, phase: t('backups.progressDone'), message: t('backups.progressSuccess'), status: 'success' }));
      await new Promise(r => setTimeout(r, 1200));
      setShowProgress(false);
      const mb = res.size ? (res.size / 1024 / 1024).toFixed(2) : '?';
      setResult({ type: 'success', title: t('backups.exportSuccess'), message: t('backups.exportSuccessMsg').replace('{{size}}', mb) });
      setShowResult(true);
    } catch (err: any) {
      removeBackupProgressListener();
      setProgressData(p => ({ ...p, status: 'error', message: err.message }));
      await new Promise(r => setTimeout(r, 1500));
      setShowProgress(false);
      setResult({ type: 'error', title: t('backups.exportError'), message: err.message });
      setShowResult(true);
    } finally { setOperation('idle'); }
  };

  const handleDoRestore = async () => {
    setShowConfirmRestore(false);
    setOperation('restoring');
    let modalShown = false;

    onRestoreProgress((progress: any) => {
      if (!modalShown) {
        setProgressData({ type: 'restore', progress: 0, phase: progress.step, message: progress.message, status: 'loading' });
        setShowProgress(true);
        modalShown = true;
      }
      setProgressData(p => ({
        ...p,
        phase: progress.step,
        message: progress.message,
        progress: progress.current ?? p.progress,
        status: progress.step === 'error' ? 'error' : 'loading',
      }));
    });

    try {
      const res = await restoreBackup();
      removeRestoreProgressListener();

      if (!res?.success) {
        setShowProgress(false);
        setOperation('idle');
        return;
      }

      setProgressData(p => ({ ...p, progress: 100, phase: t('backups.progressDone'), message: t('backups.progressRestoreDone'), status: 'success' }));
      await new Promise(r => setTimeout(r, 1400));
      setShowProgress(false);
      setResult({ type: 'success', title: t('backups.restoreSuccess'), message: t('backups.restoreSuccessMsgNoRestart') });
      setShowResult(true);
      setTimeout(() => window.location.reload(), 2200);
    } catch (err: any) {
      removeRestoreProgressListener();
      setProgressData(p => ({ ...p, status: 'error', message: err.message }));
      await new Promise(r => setTimeout(r, 1000));
      setShowProgress(false);
      setResult({ type: 'error', title: t('backups.restoreError'), message: err.message });
      setShowResult(true);
    } finally { setOperation('idle'); }
  };

  const handleDoAutoRestore = async (folderPath: string) => {
    setAutoRestoreTarget(null);
    setOperation('restoring');
    let modalShown = false;

    onRestoreProgress((progress: any) => {
      if (!modalShown) {
        setProgressData({ type: 'restore', progress: 0, phase: progress.step, message: progress.message, status: 'loading' });
        setShowProgress(true);
        modalShown = true;
      }
      setProgressData(p => ({
        ...p,
        phase: progress.step,
        message: progress.message,
        progress: progress.current ?? p.progress,
        status: progress.step === 'error' ? 'error' : 'loading',
      }));
    });

    try {
      const res = await restoreFromAutoBackup(folderPath);
      removeRestoreProgressListener();

      if (!res?.success) {
        setShowProgress(false);
        setOperation('idle');
        return;
      }

      setProgressData(p => ({ ...p, progress: 100, phase: t('backups.progressDone'), message: t('backups.progressRestoreDone'), status: 'success' }));
      await new Promise(r => setTimeout(r, 1400));
      setShowProgress(false);
      setResult({ type: 'success', title: t('backups.restoreSuccess'), message: t('backups.restoreSuccessMsgNoRestart') });
      setShowResult(true);
      setTimeout(() => window.location.reload(), 2200);
    } catch (err: any) {
      removeRestoreProgressListener();
      setProgressData(p => ({ ...p, status: 'error', message: err.message }));
      await new Promise(r => setTimeout(r, 1000));
      setShowProgress(false);
      setResult({ type: 'error', title: t('backups.restoreError'), message: err.message });
      setShowResult(true);
    } finally { setOperation('idle'); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex h-full overflow-hidden">

            {/* Sidebar — mesmo estilo do HelpPage */}
            <div
              className="w-52 flex-shrink-0 flex flex-col overflow-hidden"
              style={{ borderRight: '1px solid var(--ui-b06)' }}
            >
              {/* Título + Pesquisa */}
              <div className="p-2.5" style={{ borderBottom: '1px solid var(--ui-b06)' }}>
                <div className="flex items-center gap-2 px-1 mb-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--ui-b07)' }}
                  >
                    <Settings className="w-3.5 h-3.5" style={{ color: 'var(--ui-t55)' }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--ui-t85)' }}>
                    {t('title')}
                  </span>
                </div>
                <div className="relative">
                  <Search
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                    style={{ color: 'var(--ui-t28)' }}
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none"
                    style={{
                      background: 'var(--ui-b05)',
                      border: '1px solid var(--ui-b07)',
                      color: 'var(--ui-t85)',
                    }}
                  />
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto py-1.5 space-y-0.5 px-1.5">
                {filteredNavSections.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--ui-t25)' }}>
                    Sem resultados
                  </p>
                ) : (
                  filteredNavSections.map(({ id, icon: Icon, label }) => {
                    const isActive = activeTab === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg transition-colors"
                        style={{
                          background: isActive ? 'hsl(var(--accent))' : 'transparent',
                          color:      isActive ? 'hsl(var(--accent-foreground))' : 'var(--ui-t45)',
                          fontWeight: isActive ? 600 : 400,
                        }}
                        onMouseEnter={e => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ui-b04)';
                        }}
                        onMouseLeave={e => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        }}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate leading-snug">{label}</span>
                      </button>
                    );
                  })
                )}
              </nav>

              <div className="px-1.5 py-1.5" style={{ borderTop: '1px solid var(--ui-b06)' }}>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: 'var(--ui-t28)', background: 'transparent' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--ui-t65)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--ui-b04)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--ui-t28)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t('reloadApp')}</span>
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <main className="flex-1 min-h-0 min-w-0 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className="px-8 py-6 space-y-6">

                  {/* ── Aparência ── */}
                  {activeTab === 'appearance' && (
                    <div className="space-y-8">
                      {/* Tema */}
                      <div>
                        <h3 className="text-base font-semibold mb-1">{t('appearance.title')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t('appearance.description')}</p>
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Palette className="w-5 h-5" /></div>
                            <div><p className="text-sm font-medium">{t('appearance.label')}</p><p className="text-xs text-muted-foreground">{t('appearance.subtitle')}</p></div>
                          </div>
                          <ToggleTheme />
                        </div>
                      </div>

                      {/* Tipo de letra */}
                      <div>
                        <h3 className="text-base font-semibold mb-1">{t('appearance.typography')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t('appearance.typographyDesc')}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {fontOptions.map(opt => {
                            const active = fontId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => setFont(opt.id)}
                                className={cn(
                                  'p-4 rounded-lg border text-left transition-all',
                                  active
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                                    : 'border-border bg-card/50 hover:border-primary/40 hover:bg-muted/30',
                                )}
                              >
                                <p className="text-base font-semibold leading-none mb-1" style={{ fontFamily: opt.stack }}>
                                  {t(`appearance.font_${opt.id}_label`, opt.label)}
                                </p>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {t(`appearance.font_${opt.id}_desc`, opt.description)}
                                </p>
                                <p className="text-sm" style={{ fontFamily: opt.stack, opacity: 0.55 }}>
                                  {t('appearance.fontPreview')}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tamanho da letra */}
                      <div>
                        <h3 className="text-base font-semibold mb-1">{t('appearance.fontSize')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t('appearance.fontSizeDesc')}</p>
                        <div className="grid grid-cols-4 gap-2">
                          {sizeOptions.map(opt => {
                            const active = sizeId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => setFontSize(opt.id)}
                                className={cn(
                                  'py-3 px-2 rounded-lg border text-center transition-all',
                                  active
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                    : 'border-border bg-card/50 hover:border-primary/40 hover:bg-muted/30',
                                )}
                              >
                                <p className="font-semibold leading-none mb-1" style={{ fontSize: opt.size }}>
                                  Aa
                                </p>
                                <p className="text-xs font-medium mt-2">
                                  {t(`appearance.fontsize_${opt.id}`, opt.label)}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {t(`appearance.fontsize_${opt.id}_desc`, opt.description)}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Transparência e desfoque do painel de fundo */}
                      <div>
                        <h3 className="text-base font-semibold mb-1">{t('appearance.glassPanel')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t('appearance.glassPanelDesc')}</p>
                        <div className="space-y-5 p-4 rounded-lg border border-border bg-card/50">
                          {/* Opacidade */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium">{t('appearance.glassOpacity')}</label>
                              <span className="text-sm text-muted-foreground tabular-nums">
                                {Math.round(glass.opacity * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={40} max={100} step={1}
                              value={Math.round(glass.opacity * 100)}
                              onChange={e => { updateGlass({ opacity: Number(e.target.value) / 100 }); markGlassDirty(); }}
                              onPointerDown={() => window.dispatchEvent(new CustomEvent('glassPreviewStart'))}
                              onPointerUp={() => window.dispatchEvent(new CustomEvent('glassPreviewEnd'))}
                              onPointerLeave={() => window.dispatchEvent(new CustomEvent('glassPreviewEnd'))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                              <span>{t('appearance.glassTransparent')}</span>
                              <span>{t('appearance.glassSolid')}</span>
                            </div>
                          </div>

                          {/* Desfoque */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium">{t('appearance.glassBlur')}</label>
                              <span className="text-sm text-muted-foreground tabular-nums">
                                {glass.blur}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0} max={40} step={1}
                              value={glass.blur}
                              onChange={e => { updateGlass({ blur: Number(e.target.value) }); markGlassDirty(); }}
                              onPointerDown={() => window.dispatchEvent(new CustomEvent('glassPreviewStart'))}
                              onPointerUp={() => window.dispatchEvent(new CustomEvent('glassPreviewEnd'))}
                              onPointerLeave={() => window.dispatchEvent(new CustomEvent('glassPreviewEnd'))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                              <span>{t('appearance.glassNoBlur')}</span>
                              <span>{t('appearance.glassMaxBlur')}</span>
                            </div>
                          </div>

                          {/* Acções: guardar predefinição + repor + toggle */}
                          <div className="space-y-3 pt-2 border-t border-border/60">
                            {/* Guardar como predefinição — aparece ao mexer, anima ao entrar/sair */}
                            {(glassTouched || glassHiding) && (
                              <div
                                className={cn(
                                  'flex items-center justify-between gap-3',
                                  glassHiding
                                    ? 'animate-out fade-out-0 zoom-out-95 duration-200'
                                    : 'animate-in fade-in-0 zoom-in-95 duration-150'
                                )}
                              >
                                <span className="text-xs text-muted-foreground">{t('appearance.glassSaveAsDefault')}</span>
                                <Button
                                  variant={glassSaved ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={onGlassSaveClick}
                                  disabled={glassSaved}
                                  className={cn(
                                    'h-7 px-2.5 text-xs gap-1.5 shrink-0 transition-all duration-300',
                                    glassSaved && 'bg-green-500 border-green-500 text-white pointer-events-none scale-95'
                                  )}
                                >
                                  {glassSaved ? (
                                    <><CheckCircle className="w-3 h-3 animate-in zoom-in-50 duration-200" /> Guardado</>
                                  ) : (
                                    <><Save className="w-3 h-3" /> {glassIsDark ? t('appearance.glassSaveDark') : t('appearance.glassSaveLight')}</>
                                  )}
                                </Button>
                              </div>
                            )}

                            {/* Repor predefinições do tema activo */}
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-muted-foreground">{t('appearance.glassReset')}</span>
                              {glassIsDark ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { resetToDark(); hideGlassButton(); }}
                                  className="h-7 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
                                >
                                  <Moon className="w-3 h-3" />
                                  {t('appearance.glassResetDark')}
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { resetToLight(); hideGlassButton(); }}
                                  className="h-7 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
                                >
                                  <Sun className="w-3 h-3" />
                                  {t('appearance.glassResetLight')}
                                </Button>
                              )}
                            </div>

                            {/* Toggle: repor ao mudar tema */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-medium">{t('appearance.glassResetOnThemeChange')}</p>
                                <p className="text-[10px] text-muted-foreground leading-snug">{t('appearance.glassResetOnThemeChangeDesc')}</p>
                              </div>
                              <Switch
                                checked={resetOnThemeChange}
                                onCheckedChange={setResetOnThemeChange}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu lateral */}
                      <div>
                        <h3 className="text-base font-semibold mb-1">{t('appearance.sidebarTitle')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t('appearance.sidebarDesc')}</p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <PanelLeft className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t('appearance.sidebarCollapsed')}</p>
                                <p className="text-xs text-muted-foreground">{t('appearance.sidebarCollapsedDesc')}</p>
                              </div>
                            </div>
                            <Switch
                              checked={sidebarCollapsed}
                              onCheckedChange={setSidebarCollapsed}
                            />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <PanelLeft className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t('appearance.sidebarAutoCollapse')}</p>
                                <p className="text-xs text-muted-foreground">{t('appearance.sidebarAutoCollapseDesc')}</p>
                              </div>
                            </div>
                            <Switch
                              checked={navAutoCollapse}
                              onCheckedChange={v => {
                                setNavAutoCollapse(v);
                                if (v) setSidebarCollapsed(true);
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Layout da interface */}
                      <div>
                        <h3 className="text-base font-semibold mb-1">{t('appearance.layoutTitle')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t('appearance.layoutDesc')}</p>
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Maximize2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{t('appearance.layoutPadding')}</p>
                              <p className="text-xs text-muted-foreground">{t('appearance.layoutPaddingDesc')}</p>
                            </div>
                          </div>
                          <Switch checked={hasPadding} onCheckedChange={setHasPadding} />
                        </div>
                      </div>

                      {/* Mapa de rastreamento */}
                      <div>
                        <h3 className="text-base font-semibold mb-1">{t('appearance.mapTitle')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t('appearance.mapDesc')}</p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-2">{t('appearance.mapLabelType')}</p>
                            <div className="grid grid-cols-3 gap-2">
                              {(['plate', 'brand_model', 'both'] as const).map(type => {
                                const keyMap = { plate: 'mapLabelPlate', brand_model: 'mapLabelBrandModel', both: 'mapLabelBoth' } as const;
                                return (
                                  <button
                                    key={type}
                                    onClick={() => setLabelType(type)}
                                    className={cn(
                                      'py-2.5 px-3 rounded-lg border text-center text-xs font-medium transition-all',
                                      labelType === type
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                        : 'border-border bg-card/50 hover:border-primary/40 hover:bg-muted/30',
                                    )}
                                  >
                                    {t(`appearance.${keyMap[type]}`)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t('appearance.mapAnimateMarkers')}</p>
                                <p className="text-xs text-muted-foreground">{t('appearance.mapAnimateMarkersDesc')}</p>
                              </div>
                            </div>
                            <Switch checked={animateMarkers} onCheckedChange={setAnimateMarkers} />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t('appearance.mapPulseMarkers')}</p>
                                <p className="text-xs text-muted-foreground">{t('appearance.mapPulseMarkersDesc')}</p>
                              </div>
                            </div>
                            <Switch checked={pulseMarkers} onCheckedChange={setPulseMarkers} />
                          </div>
                        </div>
                      </div>

                      {/* Filtros */}
                      <div>
                        <h3 className="text-base font-semibold mb-1">{t('appearance.filtersTitle')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t('appearance.filtersDesc')}</p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Filter className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t('appearance.persistFilters')}</p>
                                <p className="text-xs text-muted-foreground">{t('appearance.persistFiltersDesc')}</p>
                              </div>
                            </div>
                            <Switch checked={persistFilters} onCheckedChange={togglePersistFilters} />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Sliders className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t('appearance.persistViewMode')}</p>
                                <p className="text-xs text-muted-foreground">{t('appearance.persistViewModeDesc')}</p>
                              </div>
                            </div>
                            <Switch checked={persistViewMode} onCheckedChange={togglePersistViewMode} />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <LayoutList className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t('appearance.persistPageSize')}</p>
                                <p className="text-xs text-muted-foreground">{t('appearance.persistPageSizeDesc')}</p>
                              </div>
                            </div>
                            <Switch checked={persistPageSize} onCheckedChange={togglePersistPageSize} />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Bookmark className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t('appearance.persistCurrentPage')}</p>
                                <p className="text-xs text-muted-foreground">{t('appearance.persistCurrentPageDesc')}</p>
                              </div>
                            </div>
                            <Switch checked={persistCurrentPage} onCheckedChange={togglePersistCurrentPage} />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Hash className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t('appearance.showFilterCounts')}</p>
                                <p className="text-xs text-muted-foreground">{t('appearance.showFilterCountsDesc')}</p>
                              </div>
                            </div>
                            <Switch
                              checked={viewSettings.showFilterCounts}
                              onCheckedChange={(v) => setViewSetting('showFilterCounts', v)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Empresa ── */}
                  {activeTab === 'company' && <CompanyTab />}

                  {/* ── Vistas ── */}
                  {activeTab === 'views' && (
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-lg font-bold mb-1">{t('views.title')}</h2>
                        <p className="text-sm text-muted-foreground">{t('views.description')}</p>
                      </div>

                      <div className="space-y-1">
                        <SettingSection
                          title={t('views.analyticsPanels')}
                          description={t('views.analyticsPanelsDesc')}
                        >
                          <SettingRow
                            label={t('views.vehicles')}
                            description={t('views.vehiclesDesc')}
                          >
                            <Switch
                              checked={viewSettings.vehiclesAnalytics}
                              onCheckedChange={(v) => setViewSetting('vehiclesAnalytics', v)}
                            />
                          </SettingRow>
                          <SettingRow
                            label={t('views.drivers')}
                            description={t('views.driversDesc')}
                          >
                            <Switch
                              checked={viewSettings.driversAnalytics}
                              onCheckedChange={(v) => setViewSetting('driversAnalytics', v)}
                            />
                          </SettingRow>
                          <SettingRow
                            label={t('views.trips')}
                            description={t('views.tripsDesc')}
                          >
                            <Switch
                              checked={viewSettings.tripsAnalytics}
                              onCheckedChange={(v) => setViewSetting('tripsAnalytics', v)}
                            />
                          </SettingRow>
                          <SettingRow
                            label={t('views.fuel')}
                            description={t('views.fuelDesc')}
                          >
                            <Switch
                              checked={viewSettings.fuelAnalytics}
                              onCheckedChange={(v) => setViewSetting('fuelAnalytics', v)}
                            />
                          </SettingRow>
                          <SettingRow
                            label={t('views.maintenance')}
                            description={t('views.maintenanceDesc')}
                          >
                            <Switch
                              checked={viewSettings.maintenanceAnalytics}
                              onCheckedChange={(v) => setViewSetting('maintenanceAnalytics', v)}
                            />
                          </SettingRow>
                          <SettingRow
                            label={t('views.expenses')}
                            description={t('views.expensesDesc')}
                          >
                            <Switch
                              checked={viewSettings.expensesAnalytics}
                              onCheckedChange={(v) => setViewSetting('expensesAnalytics', v)}
                            />
                          </SettingRow>
                        </SettingSection>
                      </div>

                      {/* ── Definição das Métricas ── */}
                      <div className="space-y-1">
                        <SettingSection
                          title={t('views.metricsTitle')}
                          description={t('views.metricsDesc')}
                        >
                          <div className="space-y-5 pt-1">
                            {/* Veículos */}
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                {t('views.vehicles')}
                              </p>
                              <div className="pl-4 space-y-2.5 border-l border-blue-200 dark:border-blue-900">
                                {[
                                  [t('views.metricsVehiclesM1'), t('views.metricsVehiclesM1Desc')],
                                  [t('views.metricsVehiclesM2'), t('views.metricsVehiclesM2Desc')],
                                  [t('views.metricsVehiclesM3'), t('views.metricsVehiclesM3Desc')],
                                ].map(([label, desc]) => (
                                  <div key={label as string}>
                                    <p className="text-xs font-medium text-foreground/90">{label}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Motoristas */}
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                {t('views.drivers')}
                              </p>
                              <div className="pl-4 space-y-2.5 border-l border-emerald-200 dark:border-emerald-900">
                                {[
                                  [t('views.metricsDriversM1'), t('views.metricsDriversM1Desc')],
                                  [t('views.metricsDriversM2'), t('views.metricsDriversM2Desc')],
                                  [t('views.metricsDriversM3'), t('views.metricsDriversM3Desc')],
                                  [t('views.metricsDriversM4'), t('views.metricsDriversM4Desc')],
                                ].map(([label, desc]) => (
                                  <div key={label as string}>
                                    <p className="text-xs font-medium text-foreground/90">{label}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Viagens */}
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                                {t('views.trips')}
                              </p>
                              <div className="pl-4 space-y-2.5 border-l border-violet-200 dark:border-violet-900">
                                {[
                                  [t('views.metricsTripsM1'), t('views.metricsTripsM1Desc')],
                                  [t('views.metricsTripsM2'), t('views.metricsTripsM2Desc')],
                                ].map(([label, desc]) => (
                                  <div key={label as string}>
                                    <p className="text-xs font-medium text-foreground/90">{label}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Combustível */}
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                {t('views.fuel')}
                              </p>
                              <div className="pl-4 space-y-2.5 border-l border-amber-200 dark:border-amber-900">
                                {[
                                  [t('views.metricsFuelM1'), t('views.metricsFuelM1Desc')],
                                  [t('views.metricsFuelM2'), t('views.metricsFuelM2Desc')],
                                  [t('views.metricsFuelM3'), t('views.metricsFuelM3Desc')],
                                ].map(([label, desc]) => (
                                  <div key={label as string}>
                                    <p className="text-xs font-medium text-foreground/90">{label}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Manutenção */}
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                                {t('views.maintenance')}
                              </p>
                              <div className="pl-4 space-y-2.5 border-l border-orange-200 dark:border-orange-900">
                                {[
                                  [t('views.metricsMainM1'), t('views.metricsMainM1Desc')],
                                  [t('views.metricsMainM2'), t('views.metricsMainM2Desc')],
                                  [t('views.metricsMainM3'), t('views.metricsMainM3Desc')],
                                ].map(([label, desc]) => (
                                  <div key={label as string}>
                                    <p className="text-xs font-medium text-foreground/90">{label}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Despesas */}
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                {t('views.expenses')}
                              </p>
                              <div className="pl-4 space-y-2.5 border-l border-rose-200 dark:border-rose-900">
                                {[
                                  [t('views.metricsExpM1'), t('views.metricsExpM1Desc')],
                                  [t('views.metricsExpM2'), t('views.metricsExpM2Desc')],
                                ].map(([label, desc]) => (
                                  <div key={label as string}>
                                    <p className="text-xs font-medium text-foreground/90">{label}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </SettingSection>
                      </div>

                      <div className="space-y-1">
                        <SettingSection
                          title={t('views.layoutTitle')}
                          description={t('views.layoutDesc')}
                        >
                          <SettingRow
                            label={t('views.layoutPosition')}
                            description={t('views.layoutPositionDesc')}
                          >
                            <div className="flex bg-muted/30 p-1 rounded-xl border border-muted/50 shrink-0">
                              <Button
                                variant={viewSettings.analyticsLayout === 'vertical' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewSetting('analyticsLayout', 'vertical')}
                                className="h-8 px-3 rounded-lg text-xs"
                              >
                                {t('views.layoutVertical')}
                              </Button>
                              <Button
                                variant={viewSettings.analyticsLayout === 'horizontal' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewSetting('analyticsLayout', 'horizontal')}
                                className="h-8 px-3 rounded-lg text-xs"
                              >
                                {t('views.layoutHorizontal')}
                              </Button>
                            </div>
                          </SettingRow>
                        </SettingSection>
                      </div>
                    </div>
                  )}

                  {/* ── PDF ── */}
                  {activeTab === 'pdf' && <PdfTab />}

                  {/* ── Alertas GPS (Geofencing) ── */}
                  {activeTab === 'geofence-alerts' && <GeofenceAlertsTab />}

                  {/* ── Alertas ── */}
                  {activeTab === 'alerts' && (
                    <SystemSettingsTab tabTitle={t('alerts.title')} tabDesc={t('alerts.description')}
                      fields={['alert_mileage_threshold','alert_license_days_before','alert_insurance_days_before','alert_maintenance_enabled','alert_fines_enabled']}>
                      {(form, set) => (
                        <div className="space-y-6">
                          <SettingSection title={t('alerts.mileage')} description={t('alerts.mileageDesc')}>
                            <SettingRow label={t('alerts.mileageThreshold')}>
                              <NumberInput value={form.alert_mileage_threshold ?? 10000} onChange={v => set('alert_mileage_threshold', v)} min={1000} unit={t('alerts.mileageUnit')} />
                            </SettingRow>
                          </SettingSection>
                          <SettingSection title={t('alerts.license')} description={t('alerts.licenseDesc')}>
                            <SettingRow label={t('alerts.licenseDays')}>
                              <NumberInput value={form.alert_license_days_before ?? 30} onChange={v => set('alert_license_days_before', v)} min={1} max={365} unit={t('alerts.daysUnit')} />
                            </SettingRow>
                          </SettingSection>
                          <SettingSection title={t('alerts.insurance')} description={t('alerts.insuranceDesc')}>
                            <SettingRow label={t('alerts.insuranceDays')}>
                              <NumberInput value={form.alert_insurance_days_before ?? 30} onChange={v => set('alert_insurance_days_before', v)} min={1} max={365} unit={t('alerts.daysUnit')} />
                            </SettingRow>
                          </SettingSection>
                          <SettingSection title={t('alerts.maintenance')} description={t('alerts.maintenanceDesc')}>
                            <SettingRow label={t('alerts.maintenanceEnabled')}>
                              <Switch checked={!!form.alert_maintenance_enabled} onCheckedChange={v => set('alert_maintenance_enabled', v)} />
                            </SettingRow>
                          </SettingSection>
                          <SettingSection title={t('alerts.fines')} description={t('alerts.finesDesc')}>
                            <SettingRow label={t('alerts.finesEnabled')}>
                              <Switch checked={!!form.alert_fines_enabled} onCheckedChange={v => set('alert_fines_enabled', v)} />
                            </SettingRow>
                          </SettingSection>
                        </div>
                      )}
                    </SystemSettingsTab>
                  )}

                  {/* ── Viagens ── */}
                  {activeTab === 'trips' && (
                    <SystemSettingsTab tabTitle={t('trips.title')} tabDesc={t('trips.description')}
                      fields={['trips_require_approval','trips_require_signature','trips_max_speed']}>
                      {(form, set) => (
                        <div className="space-y-6">
                          <SettingSection title={t('trips.approval')} description={t('trips.approvalDesc')}>
                            <SettingRow label={t('trips.approvalEnabled')}>
                              <Switch checked={!!form.trips_require_approval} onCheckedChange={v => set('trips_require_approval', v)} />
                            </SettingRow>
                          </SettingSection>
                          <SettingSection title={t('trips.signature')} description={t('trips.signatureDesc')}>
                            <SettingRow label={t('trips.signatureEnabled')}>
                              <Switch checked={!!form.trips_require_signature} onCheckedChange={v => set('trips_require_signature', v)} />
                            </SettingRow>
                          </SettingSection>
                          <SettingSection title={t('trips.speed')} description={t('trips.speedDesc')}>
                            <SettingRow label={t('trips.speedLabel')} description={t('trips.speedHint')}>
                              <NumberInput value={form.trips_max_speed ?? 0} onChange={v => set('trips_max_speed', v)} min={0} max={300} unit={t('trips.speedUnit')} />
                            </SettingRow>
                          </SettingSection>
                        </div>
                      )}
                    </SystemSettingsTab>
                  )}

                  {/* ── Combustível ── */}
                  {activeTab === 'fuel' && (
                    <SystemSettingsTab tabTitle={t('fuel.title')} tabDesc={t('fuel.description')}
                      fields={['fuel_level_control','fuel_min_level_alert']}>
                      {(form, set) => (
                        <div className="space-y-6">
                          <SettingSection title={t('fuel.levelControl')} description={t('fuel.levelControlDesc')}>
                            <SettingRow label={t('fuel.levelEnabled')}>
                              <Switch checked={!!form.fuel_level_control} onCheckedChange={v => set('fuel_level_control', v)} />
                            </SettingRow>
                          </SettingSection>
                          <SettingSection title={t('fuel.minLevel')} description={t('fuel.minLevelDesc')}>
                            <SettingRow label={t('fuel.minLevelLabel')}>
                              <NumberInput value={form.fuel_min_level_alert ?? 20} onChange={v => set('fuel_min_level_alert', v)} min={0} max={100} unit={t('fuel.minLevelUnit')} disabled={!form.fuel_level_control} />
                            </SettingRow>
                          </SettingSection>
                        </div>
                      )}
                    </SystemSettingsTab>
                  )}

                  {/* ── Sistema ── */}
                  {activeTab === 'system' && (
                    <SystemSettingsTab tabTitle={t('system.title')} tabDesc={t('system.description')}
                      fields={['session_timeout_minutes','session_multi_login','notifications_enabled','audit_log_enabled','audit_log_retention_days']}>
                      {(form, set) => (
                        <div className="space-y-6">
                          <SettingSection title={t('system.session')} description={t('system.sessionDesc')}>
                            <SettingRow label={t('system.timeout')} description={t('system.timeoutHint')}>
                              <NumberInput value={form.session_timeout_minutes ?? 0} onChange={v => set('session_timeout_minutes', v)} min={0} unit={t('system.timeoutUnit')} />
                            </SettingRow>
                            <SettingRow label={t('system.multiLogin')} description={t('system.multiLoginDesc')}>
                              <Switch checked={!!form.session_multi_login} onCheckedChange={v => set('session_multi_login', v)} />
                            </SettingRow>
                          </SettingSection>
                          <SettingSection title={t('system.notifications')} description={t('system.notificationsDesc')}>
                            <SettingRow label={t('system.notificationsEnabled')}>
                              <Switch checked={!!form.notifications_enabled} onCheckedChange={v => set('notifications_enabled', v)} />
                            </SettingRow>
                          </SettingSection>
                          <SettingSection title={t('system.audit')} description={t('system.auditDesc')}>
                            <SettingRow label={t('system.auditEnabled')}>
                              <Switch checked={!!form.audit_log_enabled} onCheckedChange={v => set('audit_log_enabled', v)} />
                            </SettingRow>
                            <SettingRow label={t('system.auditRetentionLabel')}>
                              <NumberInput value={form.audit_log_retention_days ?? 90} onChange={v => set('audit_log_retention_days', v)} min={7} max={365} unit={t('system.auditRetentionUnit')} disabled={!form.audit_log_enabled} />
                            </SettingRow>
                          </SettingSection>
                          {/* Reset */}
                          <div className="pt-4 border-t border-border space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-destructive">{t('system.reset')}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{t('system.resetDesc')}</p>
                            </div>
                            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                              <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="w-4 h-4 text-destructive" />
                                <p className="text-xs text-destructive font-medium">{t('system.resetWarning')}</p>
                              </div>
                              <Button variant="destructive" size="sm" className="gap-2 w-full"
                                onClick={() => { if (confirm(t('resetConfirm'))) resetSystemSettings(); }}>
                                <RotateCcw className="w-4 h-4" />{t('system.resetButton')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </SystemSettingsTab>
                  )}

                  {/* ── Backups ── */}
                  {activeTab === 'backups' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-semibold mb-1">{t('backups.title')}</h3>
                        <p className="text-sm text-muted-foreground">{t('backups.description')}</p>
                      </div>

                      {/* Backup automático */}
                      <div className="p-4 rounded-lg border border-border bg-card/50 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-primary" /></div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold mb-1">{t('backups.auto')}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t('backups.autoDesc')}</p>
                          </div>
                          <Switch
                            checked={autoBackupEnabled}
                            onCheckedChange={async (v) => {
                              setAutoBackupEnabled(v);
                              const cfg = backupConfig ?? { autoBackupFrequency: 'daily', keepLastN: 7 };
                              await updateBackupConfig({ ...cfg, autoBackupEnabled: v });
                            }}
                          />
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('backups.frequency')}</span>
                            <span className="font-medium">
                              {backupConfig?.autoBackupFrequency === 'weekly' ? t('backups.frequencyWeekly') : t('backups.frequencyValue')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('backups.kept')}</span>
                            <span className="font-medium">{backupConfig?.keepLastN ?? 7} {t('backups.keptUnit')}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('backups.lastBackup')}</span>
                            <span className="font-medium">
                              {loadingBackupData
                                ? t('common:loading')
                                : backupConfig?.lastAutoBackup
                                  ? new Date(backupConfig.lastAutoBackup).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : t('backups.noBackupYet')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lista de cópias de segurança automáticas */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">{t('backups.listTitle')}</h4>
                          <span className="text-xs text-muted-foreground">{autoBackupList.length} {t('backups.listCount')}</span>
                        </div>
                        {loadingBackupData ? (
                          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />{t('common:loading')}
                          </div>
                        ) : autoBackupList.length === 0 ? (
                          <div className="p-4 rounded-lg border border-dashed border-border text-center">
                            <p className="text-sm text-muted-foreground">{t('backups.noBackupsFound')}</p>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-border overflow-hidden">
                            {autoBackupList.slice(0, 7).map((bk, i) => {
                              const date = new Date(bk.createdAt);
                              const sizeKb = Math.round(bk.size / 1024);
                              const sizeTxt = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
                              return (
                                <div key={bk.name} className={`flex items-center justify-between px-4 py-3 text-sm ${i > 0 ? 'border-t border-border' : ''}`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                                    <div>
                                      <p className="font-medium">
                                        {date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        {i === 0 && <span className="ml-2 text-xs text-emerald-600 font-normal">{t('backups.latestBadge')}</span>}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-muted-foreground">{sizeTxt}</span>
                                    {devUnlocked ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isBusy}
                                        onClick={() => setAutoRestoreTarget({ name: bk.name, path: bk.path, createdAt: date })}
                                        className="h-7 text-xs gap-1"
                                      >
                                        {operation === 'restoring' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                        {t('backups.restoreFromBackup')}
                                      </Button>
                                    ) : (
                                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                                        <Lock className="w-3 h-3" />
                                        {t('backups.restoreDevOnly')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Backup manual */}
                      <div className="pt-4 border-t border-border space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-1">{t('backups.manual')}</h4>
                          <p className="text-xs text-muted-foreground">{t('backups.manualDesc')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button onClick={handleExportBackup} disabled={isBusy} className="h-auto flex flex-col items-start gap-2 p-4" variant="outline">
                            <div className="flex items-center gap-2 w-full">
                              {operation === 'exporting' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                              <span className="font-semibold text-sm">{t('backups.export')}</span>
                            </div>
                            <p className="text-xs text-muted-foreground text-left whitespace-normal">{t('backups.exportDesc')}</p>
                          </Button>
                          {devUnlocked ? (
                            <Button onClick={() => setShowConfirmRestore(true)} disabled={isBusy} className="h-auto flex flex-col items-start gap-2 p-4" variant="outline">
                              <div className="flex items-center gap-2 w-full">
                                {operation === 'restoring' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                <span className="font-semibold text-sm">{t('backups.restore')}</span>
                              </div>
                              <p className="text-xs text-muted-foreground text-left whitespace-normal">{t('backups.restoreDesc')}</p>
                            </Button>
                          ) : (
                            <div className="h-auto flex flex-col items-start gap-2 p-4 rounded-lg border border-dashed border-border/50 bg-muted/20 opacity-60">
                              <div className="flex items-center gap-2 w-full">
                                <Lock className="w-5 h-5 text-muted-foreground" />
                                <span className="font-semibold text-sm text-muted-foreground">{t('backups.restore')}</span>
                              </div>
                              <p className="text-xs text-muted-foreground text-left whitespace-normal">{t('backups.restoreDevOnlyHint')}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('backups.warning') }} />
                      </div>
                    </div>
                  )}

                  {/* ── Bases de Dados ── */}
                  {activeTab === 'databases' && (
                    <DatabasesTab
                      devUnlocked={devUnlocked}
                      onDevUnlock={handleDevUnlock}
                      onDevLock={handleDevLock}
                    />
                  )}

                  {/* ── Servidor ── */}
                  {activeTab === 'server' && <ServerTab />}

                  {/* ── Sincronização ── */}
                  {activeTab === 'sync' && <SyncTab />}

                  {/* ── Licença ── */}
                  {activeTab === 'license' && <LicenseTab />}

                  {/* ── Sobre ── */}
                  {activeTab === 'about' && (
                    <div className="space-y-6">
                      <div className="text-center pb-6 border-b border-border">
                        <img src="./images/fleetlogo.png" alt="" className="w-24 h-24 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold mb-1">{t('about.appName')}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{t('about.appSubtitle')}</p>
                        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                          {systemVersion ? `${t('about.version')} ${systemVersion} · ` : ''}{t('about.build')} {t('about.buildValue')}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-base font-semibold">{t('about.systemInfo')}</h3>
                        <div className="p-4 rounded-lg border bg-card/50 space-y-3 text-sm">
                          {[['version',systemVersion||t('about.loading')],['build',t('about.buildValue')],['lastUpdate',t('about.lastUpdateValue')],['license',t('about.licenseValue')]].map(([k,v])=>(
                            <div key={k} className="flex justify-between"><span className="text-muted-foreground">{t(`about.${k}`)}</span><span className="font-medium">{v}</span></div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-base font-semibold">{t('about.developedBy')}</h3>
                        <div className="p-5 rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 space-y-4">
                          <div>
                            <h4 className="text-lg font-bold flex items-center gap-2 mb-2"><Building2 className="w-5 h-5 text-primary" />{t('about.companyName')}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{t('about.companyDesc')}</p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm pt-2">
                            {[['location','locationValue'],['founded','foundedValue'],['nif','nifValue'],['commercial','commercialValue']].map(([lk,vk])=>(
                              <div key={lk}><p className="text-xs text-muted-foreground uppercase">{t(`about.${lk}`)}</p><p className="font-medium">{t(`about.${vk}`)}</p></div>
                            ))}
                          </div>
                          <div className="pt-3 border-t border-border/50 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">{t('about.contacts')}</p>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span>albertobrian16@gmail.com</span></div>
                              <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /><span>akmsystems.ao</span></div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('about.addressLabel')}</p>
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div><p>{t('about.addressLine1')}</p><p>{t('about.addressLine2')}</p></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center pt-4 text-xs text-muted-foreground border-t border-border">
                        <p>{t('about.copyright')}</p>
                        <p className="mt-1">{t('about.madeIn')}</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </main>
      </div>

      <ProgressModal open={showProgress} type={progressData.type} progress={progressData.progress} phase={progressData.phase} message={progressData.message} status={progressData.status} />
      <ConfirmRestoreModal open={showConfirmRestore} onOpenChange={setShowConfirmRestore} onConfirm={handleDoRestore} />
      <ResultModal open={showResult} onOpenChange={setShowResult} type={result.type} title={result.title} message={result.message} />

      {/* Confirm auto-backup restore */}
      <Dialog open={!!autoRestoreTarget} onOpenChange={open => { if (!open) setAutoRestoreTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('backups.confirmAutoRestore')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{t('backups.confirmAutoRestoreText')}</p>
            {autoRestoreTarget && (
              <p className="text-sm font-semibold">
                {new Date(autoRestoreTarget.createdAt).toLocaleString()}
              </p>
            )}
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t('backups.confirmAutoRestoreBullet1')}</li>
              <li>{t('backups.confirmAutoRestoreBullet2')}</li>
              <li>{t('backups.confirmAutoRestoreBullet3')}</li>
            </ul>
            <p className="text-xs text-destructive font-medium">{t('backups.confirmIrreversible')}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoRestoreTarget(null)}>
              {t('backups.confirmCancel')}
            </Button>
            <Button
              onClick={() => autoRestoreTarget && handleDoAutoRestore(autoRestoreTarget.path)}
            >
              {t('backups.confirmYes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}