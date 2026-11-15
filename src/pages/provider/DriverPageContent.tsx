// ========================================
// FILE: src/pages/provider/DriversPageContent.tsx
// ========================================
// ALTERAÇÕES em relação ao documento 16:
//  1. Import DriverShiftsProvider + DriverShiftsTab
//  2. Import getShiftsForAllDrivers helper
//  3. Estado driverShiftsMap para badges
//  4. Tab "shifts" adicionada (3 tabs total)
//  5. Badge de turno nos cards e na list view
// ========================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge }    from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { useErrorHandler }  from '@/hooks/useErrorHandler';
import { useTranslation }   from 'react-i18next';
import {
  Search, Users, Edit, Trash2, Eye, Phone, Mail, Calendar, AlertTriangle, Truck,
  LayoutGrid, List, Rows, Filter, MoreHorizontal, CheckCircle2, Clock, UserX, Ban,
  CalendarDays, Plus, AlarmClock, Crown, RotateCcw,
} from 'lucide-react';
import { usePageViewSettings } from '@/hooks/usePageViewSettings';
import { usePagePagination } from '@/hooks/usePagePagination';
import { usePowerSyncDataChanged } from '@/hooks/usePowerSyncDataChanged';
import { DriverAnalyticsPanel } from '@/components/analytics/DriverAnalyticsPanel';
import { getAllDrivers, deleteDriver as deleteDriverHelper } from '@/helpers/driver-helpers';
import { getAllVehicles }  from '@/helpers/vehicle-helpers';
import { getAllRoutes }    from '@/helpers/route-helpers';
import { getShiftsForAllDrivers } from '@/helpers/driver-shift-helpers';
import { cn }             from '@/lib/utils';
import { readPersistedFilter, writePersistedFilter, readPersistedViewMode, writePersistedViewMode } from '@/lib/filter-persistence';
import { useDrivers }     from '@/contexts/DriversContext';
import { DriverLeavesProvider }   from '@/contexts/DriverLeavesContext';
import { ScheduledTripsProvider } from '@/contexts/ScheduledTripsContext';
import { DriverShiftsProvider }   from '@/contexts/DriverShiftsContext';
import { IDriverShiftBadge }      from '@/lib/types/driver-shift';

// Dialogs & Tabs
import NewDriverDialog         from '@/components/driver/NewDriverDialog';
import EditDriverDialog        from '@/components/driver/EditDriverDialog';
import ViewDriverDialog        from '@/components/driver/ViewDriverDialog';
import DriversLeavesTab        from '@/components/driver/DriverLeavesTab';
import DriverScheduledTripsTab from '@/components/driver/DriverScheduledTripsTab';
import DriverShiftsTab         from '@/components/driver/DriverShiftsTab';
import ConfirmDeleteDialog     from '@/components/ConfirmDeleteDialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, closeDropdownsAndOpenDialog,
} from '@/components/ui/dropdown-menu';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionGate } from '@/components/PermissionGate';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

type ViewMode = 'list' | 'cards' | 'compact';

export default function DriversPageContent() {
  const { t }                        = useTranslation();
  const { handleError, showSuccess } = useErrorHandler();

  const {
    state: { drivers, selectedDriver, isLoading },
    setDrivers, selectDriver, deleteDriver: removeDriverFromContext, setLoading,
  } = useDrivers();

  const [activeTab, setActiveTab]                   = useState('drivers');
  const [searchTerm, setSearchTerm]                 = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>(() => readPersistedFilter('drivers', 'availability', 'all'));
  const [viewMode, setViewMode]                     = useState<ViewMode>(() => readPersistedViewMode<ViewMode>('drivers', 'cards'));
  useEffect(() => { writePersistedViewMode('drivers', viewMode); }, [viewMode]);
  useEffect(() => { writePersistedFilter('drivers', 'availability',   availabilityFilter); }, [availabilityFilter]);

  // Mapa driverId → turnos activos em que está inserido
  const [driverShiftsMap, setDriverShiftsMap] = useState<Record<string, IDriverShiftBadge[]>>({});

  // Paginação
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, clampToTotalPages } = usePagePagination('drivers');
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false,
  });
  const [statusCounts, setStatusCounts] = useState({
    available: 0, on_trip: 0, offline: 0, on_leave: 0, terminated: 0,
  });
  const [analyticsDrivers, setAnalyticsDrivers] = useState<any[]>([]);

  const hasActiveFilters = searchTerm !== '' || availabilityFilter !== 'all';
  function resetFilters() {
    setSearchTerm('');
    setAvailabilityFilter('all');
    setCurrentPage(1);
  }

  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [routesList,   setRoutesList]   = useState<any[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [editDialogOpen,   setEditDialogOpen]   = useState(false);
  const [viewDialogOpen,   setViewDialogOpen]   = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting,       setIsDeleting]       = useState(false);

  const isInitialSearchRef = useRef(true);
  useEffect(() => {
    if (isInitialSearchRef.current) {
      isInitialSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => { loadDrivers(); }, [currentPage, itemsPerPage, debouncedSearch, availabilityFilter]);

  // Carregar mapa de turnos ao montar e ao mudar de tab para drivers
  useEffect(() => {
    loadShiftsMap();
  }, []);

  useEffect(() => {
    if (activeTab === 'drivers') loadShiftsMap();
    if (activeTab === 'scheduled_trips' && vehiclesList.length === 0) loadVehiclesAndRoutes();
  }, [activeTab]);

  async function loadShiftsMap() {
    try {
      const map = await getShiftsForAllDrivers();
      setDriverShiftsMap(map);
    } catch {
      // silencioso — badges são informação suplementar
    }
  }

  // silent — ver o mesmo comentário em VehiclesPageContent.tsx: uma
  // actualização em segundo plano nunca deve mostrar o spinner de "a carregar".
  const loadDrivers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const filterParams = {
      search: debouncedSearch,
      status: availabilityFilter === 'all' ? undefined : availabilityFilter,
    };
    try {
      const [result, analytics] = await Promise.all([
        getAllDrivers({ ...filterParams, page: currentPage, limit: itemsPerPage }),
        getAllDrivers({ ...filterParams, limit: 9999 }),
      ]);
      setDrivers(result.data);
      setAnalyticsDrivers(analytics.data);
      setPaginationInfo(result.pagination);
      clampToTotalPages(result.pagination.totalPages);
      if (result.statusCounts) setStatusCounts(result.statusCounts as typeof statusCounts);
    } catch (error) {
      handleError(error, 'drivers:errors.errorLoading');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, availabilityFilter]);

  // Achado 2026-09-0X: ver o mesmo comentário em VehiclesPageContent.tsx —
  // uma sync do PowerSync em segundo plano nunca chegava a esta página sozinha.
  usePowerSyncDataChanged(['drivers'], () => loadDrivers(true));
  usePowerSyncDataChanged(['vehicles', 'routes'], () => loadVehiclesAndRoutes());

  async function loadVehiclesAndRoutes() {
    try {
      const [vehiclesResult, routesResult] = await Promise.all([
        getAllVehicles({ limit: 500 }),
        getAllRoutes().catch(() => []),
      ]);
      setVehiclesList((vehiclesResult.data || []).map((v: any) => ({ id: v.id, plate: v.license_plate, brand: v.brand, model: v.model, status: v.status })));
      setRoutesList((routesResult || []).map((r: any) => ({ id: r.id, name: r.name, origin: r.origin, destination: r.destination })));
    } catch { /* silencioso */ }
  }

  function openDeleteDialog(driver: any) {
    closeDropdownsAndOpenDialog(() => { selectDriver(driver); setDeleteDialogOpen(true); });
  }

  async function handleDeleteDriver() {
    if (!selectedDriver) return;
    setIsDeleting(true);
    try {
      await deleteDriverHelper(selectedDriver.id);
      removeDriverFromContext(selectedDriver.id);
      showSuccess('drivers:toast.deleteSuccess');
      setDeleteDialogOpen(false);
      selectDriver(null);
      loadDrivers();
    } catch (error) {
      handleError(error, 'drivers:toast.deleteError');
    } finally {
      setIsDeleting(false);
    }
  }

  function getStatusBadge(status: string) {
    const map = {
      active:     { label: t('drivers:status.active.label'),     icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' },
      on_leave:   { label: t('drivers:status.on_leave.label'),   icon: Clock,        className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' },
      terminated: { label: t('drivers:status.terminated.label'), icon: UserX,        className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800' },
    };
    const info = map[status as keyof typeof map] ?? map.active;
    const Icon = info.icon;
    return (
      <Badge variant="outline" className={cn('flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider', info.className)}>
        <Icon className="w-3.5 h-3.5" />{info.label}
      </Badge>
    );
  }

  /** Badge de turno — mostra o turno activo do motorista */
  function getShiftBadge(driverId: string) {
    const shifts = driverShiftsMap[driverId];
    if (!shifts || shifts.length === 0) return null;
    const first = shifts[0];
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
        title={`${first.shift_name} · ${first.start_time}–${first.end_time}`}
      >
        {first.is_leader && <Crown className="w-3 h-3 text-amber-500" />}
        <AlarmClock className="w-3 h-3" />
        <span className="truncate max-w-[80px]">{first.shift_name}</span>
      </Badge>
    );
  }

  function isLicenseExpiring(d: string)  { return getDaysUntilExpiry(d) <= 30 && getDaysUntilExpiry(d) > 0; }
  function isLicenseExpired(d: string)   { return new Date(d) < new Date(); }
  function getDaysUntilExpiry(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }

  const stats = [
    { label: t('drivers:stats.total'),                value: paginationInfo.total,   icon: Users,        color: 'text-slate-600',   bg: 'bg-slate-100/60'  },
    { label: t('drivers:stats.available'),            value: statusCounts.available, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/60' },
    { label: t('drivers:stats.onTrip'),               value: statusCounts.on_trip,   icon: Truck,        color: 'text-blue-600',    bg: 'bg-blue-50/60'    },
    { label: t('drivers:status.on_leave.label'),      value: statusCounts.on_leave,  icon: CalendarDays, color: 'text-purple-600',  bg: 'bg-purple-50/60'  },
    { label: t('drivers:availability.offline.label'), value: statusCounts.offline,   icon: Ban,          color: 'text-slate-500',   bg: 'bg-slate-50/60'   },
  ];

  const viewModes = [
    { mode: 'compact', icon: Rows,       label: t('common:viewModes.compact', 'Compacto') },
    { mode: 'list',    icon: List,       label: t('common:viewModes.normal') },
    { mode: 'cards',   icon: LayoutGrid, label: t('common:viewModes.cards')  },
  ] as const;

  const { settings: viewSettings } = usePageViewSettings();

  // ── Views ────────────────────────────────────────────────────────────────

  function renderListView() {
    return (
      <div className="grid gap-4">
        {drivers.map((driver) => (
          <Card key={driver.id} className="overflow-hidden group hover:shadow-md transition-all duration-200 bg-card">
            <CardContent className="p-0">
              <div className="flex items-start gap-4 p-5">
                <Avatar className="w-16 h-16 ring-2 ring-muted">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {driver.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg tracking-tight truncate">{driver.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('drivers:fields.licenseNumber')}: {driver.license_number} - {t('drivers:categories.' + driver.license_category)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end">
                      {getStatusBadge(driver.status)}
                      {getShiftBadge(driver.id)}
                      {driver.status === 'on_leave' && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          <CalendarDays className="w-3.5 h-3.5" />{t('drivers:leaves.status.active')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {driver.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{driver.phone}</span>
                      </div>
                    )}
                    {driver.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{driver.email}</span>
                      </div>
                    )}
                    {driver.hire_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{t('drivers:info.admittedOn')}: {new Date(driver.hire_date).toLocaleDateString('pt-PT')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{t('drivers:info.validUntil')}: {new Date(driver.license_expiry_date).toLocaleDateString('pt-PT')}</span>
                    </div>
                  </div>
                  {(isLicenseExpiring(driver.license_expiry_date) || isLicenseExpired(driver.license_expiry_date)) && (
                    <div className={cn('flex items-center gap-2 p-2.5 rounded-lg text-sm mb-3 font-semibold', isLicenseExpired(driver.license_expiry_date) ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800')}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {isLicenseExpired(driver.license_expiry_date)
                          ? t('drivers:alerts.licenseExpired')
                          : t('drivers:alerts.licenseExpiringSoon', { days: getDaysUntilExpiry(driver.license_expiry_date) })}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { selectDriver(driver); setViewDialogOpen(true); }}>
                      <Eye className="w-4 h-4 mr-2" />{t('drivers:actions.view')}
                    </Button>
                    <PermissionGate permission="driver:update"><Button size="sm" variant="outline" onClick={() => { selectDriver(driver); setEditDialogOpen(true); }}>
                      <Edit className="w-4 h-4 mr-2" />{t('drivers:actions.edit')}
                    </Button></PermissionGate>
                    <PermissionGate permission="driver:delete"><Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(driver)}>
                      <Trash2 className="w-4 h-4" />
                    </Button></PermissionGate>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  function renderCompactView() {
    return (
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-muted/50 px-5 py-3 grid grid-cols-12 gap-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-b">
          <div className="col-span-4">{t('drivers:fields.name', 'Motorista')}</div>
          <div className="col-span-2">{t('drivers:fields.category', 'Categoria')}</div>
          <div className="col-span-3">{t('drivers:fields.status', 'Estado')}</div>
          <div className="col-span-2">{t('drivers:fields.licenseExpiry', 'Validade')}</div>
          <div className="col-span-1" />
        </div>
        <div className="divide-y">
          {drivers.map(driver => (
            <div key={driver.id} className="px-5 py-3 grid grid-cols-12 gap-4 items-center hover:bg-muted/40 transition-colors duration-150">
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">
                    {driver.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{driver.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{driver.license_number}</p>
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-bold bg-muted/60 px-2 py-0.5 rounded border border-muted-foreground/10">
                  {driver.license_category}
                </span>
              </div>
              <div className="col-span-3">{getStatusBadge(driver.status)}</div>
              <div className="col-span-2">
                <span className={cn('text-sm font-medium', isLicenseExpired(driver.license_expiry_date) ? 'text-destructive' : isLicenseExpiring(driver.license_expiry_date) ? 'text-amber-600 dark:text-amber-400' : '')}>
                  {new Date(driver.license_expiry_date).toLocaleDateString('pt-PT')}
                </span>
              </div>
              <div className="col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => closeDropdownsAndOpenDialog(() => { selectDriver(driver); setViewDialogOpen(true); })}>
                      <Eye className="w-4 h-4 mr-2" />{t('drivers:actions.view')}
                    </DropdownMenuItem>
                    <PermissionGate permission="driver:update" fullWidth><DropdownMenuItem onClick={() => closeDropdownsAndOpenDialog(() => { selectDriver(driver); setEditDialogOpen(true); })}>
                      <Edit className="w-4 h-4 mr-2" />{t('drivers:actions.edit')}
                    </DropdownMenuItem></PermissionGate>
                    <PermissionGate permission="driver:delete" fullWidth><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(driver)}>
                      <Trash2 className="w-4 h-4 mr-2" />{t('drivers:actions.delete')}
                    </DropdownMenuItem></PermissionGate>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderCardsView() {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {drivers.map((driver) => (
          <Card key={driver.id} className="flex flex-col h-full group hover:shadow-lg transition-all duration-300 bg-card relative overflow-hidden">
            <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full ring-2 ring-background shadow-sm"
              style={{ backgroundColor: driver.status === 'active' ? '#10b981' : driver.status === 'on_leave' ? '#a855f7' : driver.availability === 'on_trip' ? '#3b82f6' : '#64748b' }}
            />
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between">
                <Avatar className="w-16 h-16 ring-2 ring-muted group-hover:ring-primary transition-all">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                    {driver.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Badge variant="outline" className={cn('flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider',
                  driver.availability === 'available' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
                  driver.availability === 'on_trip'   && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
                  driver.availability === 'offline'   && 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400'
                )}>
                  {driver.availability === 'available' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {driver.availability === 'on_trip'   && <Truck className="w-3.5 h-3.5" />}
                  {driver.availability === 'offline'   && <Ban className="w-3.5 h-3.5" />}
                  <span>
                    {driver.availability === 'available' && t('drivers:availability.available.label')}
                    {driver.availability === 'on_trip'   && t('drivers:availability.on_trip.label')}
                    {driver.availability === 'offline'   && t('drivers:availability.offline.label')}
                  </span>
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-lg tracking-tight mb-1">{driver.name}</h3>
                <p className="text-xs text-muted-foreground">{driver.license_number} - {t('drivers:categories.' + driver.license_category)}</p>
              </div>

              {/* Badge de turno activo */}
              {getShiftBadge(driver.id) && (
                <div>{getShiftBadge(driver.id)}</div>
              )}

              {driver.status === 'on_leave' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-400 font-semibold">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />{t('drivers:leaves.status.active')}
                </div>
              )}

              {(isLicenseExpiring(driver.license_expiry_date) || isLicenseExpired(driver.license_expiry_date)) && (
                <div className={cn('flex items-center gap-2 p-2 rounded-lg text-xs font-semibold', isLicenseExpired(driver.license_expiry_date) ? 'bg-destructive/10 text-destructive' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400')}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {isLicenseExpired(driver.license_expiry_date) ? t('drivers:alerts.licenseExpired') : t('drivers:alerts.licenseExpiring')}
                  </span>
                </div>
              )}

              <div className="space-y-2 text-sm">
                {driver.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" /><span className="truncate">{driver.phone}</span></div>}
                {driver.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" /><span className="truncate">{driver.email}</span></div>}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate">{t('drivers:info.validUntil')}: {new Date(driver.license_expiry_date).toLocaleDateString('pt-PT')}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 flex gap-2 border-t">
                <Button className="flex-1 h-9 text-sm font-bold shadow-sm" onClick={() => { selectDriver(driver); setViewDialogOpen(true); }}>
                  {t('drivers:actions.view')}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 border-muted-foreground/20">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => closeDropdownsAndOpenDialog(() => { selectDriver(driver); setViewDialogOpen(true); })}>
                      <Eye className="w-4 h-4 mr-2" /> {t('drivers:actions.view')}
                    </DropdownMenuItem>
                    <PermissionGate permission="driver:update" fullWidth><DropdownMenuItem onClick={() => closeDropdownsAndOpenDialog(() => { selectDriver(driver); setEditDialogOpen(true); })}>
                      <Edit className="w-4 h-4 mr-2" /> {t('drivers:actions.edit')}
                    </DropdownMenuItem></PermissionGate>
                    <PermissionGate permission="driver:delete" fullWidth><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(driver)}>
                      <Trash2 className="w-4 h-4 mr-2" /> {t('drivers:actions.delete')}
                    </DropdownMenuItem></PermissionGate>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DriverLeavesProvider>
      <ScheduledTripsProvider>
        <DriverShiftsProvider>
          <div className="min-h-screen bg-transparent -m-6 p-6">
            <div className="max-w-[1500px] mx-auto space-y-8 pb-10">

              {/* ── TABS ─────────────────────────────────────────────────── */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="space-y-0.5">
                    <h1 className="text-2xl font-extrabold tracking-tight">{t('drivers:title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('drivers:description')}</p>
                  </div>
                  <TabsList className="flex h-9 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 mx-auto">
                    <TabsTrigger value="drivers" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {t('drivers:tabs.drivers', 'Motoristas')}
                    </TabsTrigger>
                    <TabsTrigger value="leaves" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" />
                      {t('drivers:tabs.leaves', 'Férias')}
                    </TabsTrigger>
                    <TabsTrigger value="shifts" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                      <AlarmClock className="w-4 h-4" />
                      {t('drivers:tabs.shifts', 'Turnos')}
                    </TabsTrigger>
                  </TabsList>
                  <NewDriverDialog onSuccess={loadDrivers} />
                </div>

                {/* ── TAB: MOTORISTAS ────────────────────────────────────── */}
                <TabsContent value="drivers" className="space-y-6 mt-0 outline-none">
                  {/* Stats */}
                  <TooltipProvider delayDuration={300}>
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {stats.map((stat, i) => (
                      <UITooltip key={i}>
                        <TooltipTrigger asChild>
                          <Card className="border-none shadow-sm bg-card overflow-hidden cursor-default">
                            <CardContent className="p-4 flex items-center gap-3">
                              <div className={cn("p-2.5 rounded-xl shrink-0", stat.bg, stat.color)}>
                                <stat.icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground truncate leading-tight">{stat.label}</p>
                                <p className={cn("font-black tracking-tight leading-tight", stat.value >= 10_000 ? "text-lg" : "text-2xl")}>
                                  {fmt(stat.value)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        {stat.value >= 1_000 && (
                          <TooltipContent side="top" className="px-3 py-2.5 min-w-[120px]">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 leading-tight">{stat.label}</p>
                            <p className="text-sm font-black tabular-nums leading-tight">{stat.value.toLocaleString('pt-PT')}</p>
                          </TooltipContent>
                        )}
                      </UITooltip>
                    ))}
                  </div>
                  </TooltipProvider>

                  {/* Análises horizontal (acima da lista) */}
                  {viewSettings.analyticsLayout !== 'vertical' && viewSettings.driversAnalytics && (
                    <DriverAnalyticsPanel
                      layout="horizontal"
                      drivers={analyticsDrivers}
                      statusCounts={statusCounts}
                      totalCount={paginationInfo.total}
                    />
                  )}

                  {/* Área principal: layout vertical = flex row (sidebar direita) */}
                  <div className={viewSettings.analyticsLayout === 'vertical' ? 'flex gap-4 items-start' : undefined}>
                  <div className={cn('space-y-6', viewSettings.analyticsLayout === 'vertical' ? 'flex-1 min-w-0' : undefined)}>
                  {/* Toolbar */}
                  <div className="bg-card rounded-2xl border border-muted/50 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap gap-3 items-center p-3">
                      <div className="flex flex-wrap gap-3 flex-1 min-w-0">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder={t('drivers:searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1" />
                        </div>
                        <Select value={availabilityFilter} onValueChange={v => { setAvailabilityFilter(v); setCurrentPage(1); }}>
                          <SelectTrigger className="flex-1 min-w-[140px] max-w-full overflow-hidden h-10 text-sm bg-muted/20 border-none">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <SelectValue placeholder={t('drivers:filters.all')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{t('drivers:filters.all')}</span>
                                {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.available + statusCounts.on_trip + statusCounts.offline})</span>}
                              </span>
                            </SelectItem>
                            <SelectItem value="available">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{t('drivers:availability.available.label')}</span>
                                {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.available})</span>}
                              </span>
                            </SelectItem>
                            <SelectItem value="on_trip">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{t('drivers:availability.on_trip.label')}</span>
                                {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.on_trip})</span>}
                              </span>
                            </SelectItem>
                            <SelectItem value="offline">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{t('drivers:availability.offline.label')}</span>
                                {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.offline})</span>}
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex bg-muted/30 p-1 rounded-xl border border-muted/50 self-center sm:self-auto shrink-0">
                        {viewModes.map(item => (
                          <Button key={item.mode} variant={viewMode === item.mode ? 'secondary' : 'ghost'} size="sm"
                            onClick={() => setViewMode(item.mode as ViewMode)}
                            className={cn('h-8 px-3 rounded-lg transition-all flex items-center gap-2', viewMode === item.mode ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground')}
                            title={item.label}>
                            <item.icon className="w-4 h-4" />
                            <span className="hidden sm:inline text-xs">{item.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    {(paginationInfo.total > 0 || hasActiveFilters) && (
                      <div className="border-t border-muted/40 px-3 py-2 flex items-center gap-2">
                        {hasActiveFilters && (
                          <Button variant="ghost" size="sm" onClick={resetFilters}
                            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground gap-1.5 shrink-0">
                            <RotateCcw className="w-3.5 h-3.5" />
                            {t('common:actions.clearFilters')}
                          </Button>
                        )}
                        <div className="flex-1" />
                        {paginationInfo.total > 0 && (
                          <Pagination pagination={paginationInfo} onPageChange={p => setCurrentPage(p)} onLimitChange={l => { setItemsPerPage(l); setCurrentPage(1); }} />
                        )}
                      </div>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                      <div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
                      <p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p>
                    </div>
                  ) : drivers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50">
                      <Users className="w-12 h-12 text-muted-foreground/20 mb-4" />
                      <h3 className="text-lg font-bold">{t('drivers:noDrivers')}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{searchTerm ? t('common:noResults') : t('common:noData')}</p>
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-300">
                      {viewMode === 'compact' && renderCompactView()}
                      {viewMode === 'list'    && renderListView()}
                      {viewMode === 'cards'   && renderCardsView()}
                    </div>
                  )}
                  </div>
                  {viewSettings.analyticsLayout === 'vertical' && viewSettings.driversAnalytics && (
                    <div className="w-[300px] shrink-0 sticky top-4">
                      <DriverAnalyticsPanel
                        layout="vertical"
                        drivers={analyticsDrivers}
                        statusCounts={statusCounts}
                        totalCount={paginationInfo.total}
                      />
                    </div>
                  )}
                  </div>
                </TabsContent>

                {/* ── TAB: FÉRIAS ──────────────────────────────────────── */}
                <TabsContent value="leaves" className="mt-0 outline-none">
                  <DriversLeavesTab drivers={drivers.map(d => ({ id: d.id, name: d.name }))} />
                </TabsContent>

                {/* ── TAB: TURNOS ──────────────────────────────────────── */}
                <TabsContent value="shifts" className="mt-0 outline-none">
                  <DriverShiftsTab
                    drivers={drivers.map(d => ({ id: d.id, name: d.name }))}
                  />
                </TabsContent>

                {/* Tab de viagens agendadas (oculta mas funcional) */}
                <TabsContent value="scheduled_trips" className="mt-0 outline-none">
                  <DriverScheduledTripsTab
                    drivers={drivers.map(d => ({ id: d.id, name: d.name }))}
                    vehicles={vehiclesList}
                    routes={routesList}
                  />
                </TabsContent>
              </Tabs>

              {/* Dialogs */}
              <EditDriverDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={loadDrivers} />
              <ViewDriverDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} />
              <ConfirmDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteDriver}
                title={t('drivers:dialogs.delete.title')}
                itemName={selectedDriver?.name}
                isLoading={isDeleting}
              />
            </div>
          </div>
        </DriverShiftsProvider>
      </ScheduledTripsProvider>
    </DriverLeavesProvider>
  );
}