// ========================================
// FILE: src/pages/provider/TripsPageContent.tsx
// ========================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import {
  Search, MapPin, Truck, User, Flag, TrendingUp, Clock, Eye,
  Route as RouteIcon, XCircle, List, LayoutGrid, Rows, MoreHorizontal,
  Navigation, ArrowRight, Gauge, PlayCircle, CheckCircle2, Edit, Trash2,
  Filter
} from 'lucide-react';
import { getAllTrips, cancelTrip as cancelTripHelper } from '@/helpers/trip-helpers';
import { getAllRoutes, deleteRoute as deleteRouteHelper } from '@/helpers/route-helpers';
import { cn } from '@/lib/utils';
import { readPersistedFilter, writePersistedFilter, readPersistedViewMode, writePersistedViewMode } from '@/lib/filter-persistence';
import { useTrips } from '@/contexts/TripsContext';
import { usePageViewSettings } from '@/hooks/usePageViewSettings';
import { usePagePagination } from '@/hooks/usePagePagination';
import { usePowerSyncDataChanged } from '@/hooks/usePowerSyncDataChanged';
import { TripsAnalyticsPanel } from '@/components/analytics/TripsAnalyticsPanel';

// Dialogs — trips
import StartTripDialog from '@/components/trip/StartTripDialog';
import CompleteTripDialog from '@/components/trip/CompleteTripDialog';
import ViewTripDialog from '@/components/trip/ViewTripDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

// Dialogs — routes
import NewRouteDialog from '@/components/trip/NewRouteDialog';
import EditRouteDialog from '@/components/trip/EditRouteDialog';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  closeDropdownsAndOpenDialog
} from '@/components/ui/dropdown-menu';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionGate } from '@/components/PermissionGate';

function fmt(n: number, suffix = '') {
  const abs = Math.abs(n);
  const sfx = suffix ? ' ' + suffix : '';
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M${sfx}`;
  if (abs >= 1_000)     return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K${sfx}`;
  return `${n.toLocaleString('pt-PT')}${sfx}`;
}

type ViewMode = 'compact' | 'list' | 'cards';

export default function TripsPageContent() {
  const { t } = useTranslation();
  const { handleError, showSuccess } = useErrorHandler();

  const {
    state: { trips, selectedTrip, isLoading },
    setTrips,
    selectTrip,
    updateTrip,
    setLoading,
  } = useTrips();

  const [activeTab, setActiveTab]       = useState('trips');
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => readPersistedFilter('trips', 'status', 'all'));
  const [viewMode, setViewMode]         = useState<ViewMode>(() => readPersistedViewMode<ViewMode>('trips', 'cards'));
  useEffect(() => { writePersistedViewMode('trips', viewMode); }, [viewMode]);
  useEffect(() => { writePersistedFilter('trips', 'status',   statusFilter);   }, [statusFilter]);
  const [routeSearch, setRouteSearch]   = useState('');

  // Paginação
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, clampToTotalPages } = usePagePagination('trips');
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false,
  });

  // Counts reais vindos do back
  const [statusCounts, setStatusCounts] = useState({
    in_progress:   0,
    completed:     0,
    cancelled:     0,
    totalDistance: 0,
  });

  const { settings: viewSettings } = usePageViewSettings();

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [routes, setRoutes]                   = useState<any[]>([]);
  const [isRoutesLoading, setIsRoutesLoading] = useState(false);
  const [selectedRoute, setSelectedRoute]     = useState<any | null>(null);

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen]         = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen]     = useState(false);
  const [isCancelling, setIsCancelling]             = useState(false);

  const [editRouteDialogOpen, setEditRouteDialogOpen]     = useState(false);
  const [deleteRouteDialogOpen, setDeleteRouteDialogOpen] = useState(false);
  const [isDeletingRoute, setIsDeletingRoute]             = useState(false);

  const isInitialSearchRef = useRef(true);
  useEffect(() => {
    if (isInitialSearchRef.current) {
      isInitialSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadTrips();
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadRoutes();
  }, []);

  // silent — ver o mesmo comentário em VehiclesPageContent.tsx: uma
  // actualização em segundo plano nunca deve mostrar o spinner de "a carregar".
  const loadTrips = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await getAllTrips({
        page:   currentPage,
        limit:  itemsPerPage,
        search: debouncedSearch,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });

      setTrips(result.data);
      setPaginationInfo(result.pagination);
      clampToTotalPages(result.pagination.totalPages);

      if (result.statusCounts) {
        setStatusCounts(result.statusCounts as typeof statusCounts);
      }
    } catch (error) {
      handleError(error, 'trips:errors.errorLoading');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter]);

  // Achado 2026-09-0X: ver o mesmo comentário em VehiclesPageContent.tsx —
  // uma sync do PowerSync em segundo plano nunca chegava a esta página sozinha.
  usePowerSyncDataChanged(['trips'], () => loadTrips(true));
  usePowerSyncDataChanged(['routes'], () => loadRoutes(true));

  async function loadRoutes(silent = false) {
    if (!silent) setIsRoutesLoading(true);
    try {
      const data = await getAllRoutes();
      setRoutes(data);
    } catch (error) {
      handleError(error, 'routes:errors.errorLoading');
    } finally {
      if (!silent) setIsRoutesLoading(false);
    }
  }

  function handlePageChange(page: number)  { setCurrentPage(page); }
  function handleLimitChange(limit: number) { setItemsPerPage(limit); setCurrentPage(1); }

  async function handleCancelTrip() {
    if (!selectedTrip) return;
    setIsCancelling(true);
    try {
      await cancelTripHelper(selectedTrip.id);
      updateTrip({ ...selectedTrip, status: 'cancelled' as const });
      showSuccess('trips:toast.cancelSuccess');
      setCancelDialogOpen(false);
      selectTrip(null);
      loadTrips();
    } catch (error) {
      handleError(error, 'trips:toast.cancelError');
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleDeleteRoute() {
    if (!selectedRoute) return;
    setIsDeletingRoute(true);
    try {
      await deleteRouteHelper(selectedRoute.id);
      setRoutes((prev) => prev.filter((r) => r.id !== selectedRoute.id));
      showSuccess('routes:toast.deleteSuccess');
      setDeleteRouteDialogOpen(false);
      setSelectedRoute(null);
    } catch (error) {
      handleError(error, 'routes:toast.deleteError');
    } finally {
      setIsDeletingRoute(false);
    }
  }

  function handleRouteCreated(route: any)   { setRoutes((prev) => [route, ...prev]); }
  function handleRouteUpdated(updated: any) { setRoutes((prev) => prev.map((r) => (r.id === updated.id ? updated : r))); }

  function getStatusBadge(status: string) {
    const statusMap = {
      in_progress: { label: t('trips:status.in_progress.label'), icon: Clock,   className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' },
      completed:   { label: t('trips:status.completed.label'),   icon: Flag,    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' },
      cancelled:   { label: t('trips:status.cancelled.label'),   icon: XCircle, className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800' },
    };
    const s    = statusMap[status as keyof typeof statusMap] || statusMap.in_progress;
    const Icon = s.icon;
    return (
      <Badge variant="outline" className={cn('flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider', s.className)}>
        <Icon className="w-3.5 h-3.5" />{s.label}
      </Badge>
    );
  }

  // Rotas — filtro local (sem paginação)
  const filteredRoutes = routes.filter((r) =>
    r.name?.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.origin?.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.destination?.toLowerCase().includes(routeSearch.toLowerCase())
  );

  // Stats — vindos do back
  const activeRoutes = routes.filter((r) => r.status === 'active' || !r.status).length;

  const tripStats = [
    { label: t('trips:stats.total'),         value: String(paginationInfo.total),                          rawValue: paginationInfo.total,                          icon: RouteIcon,  color: 'text-slate-600',   bg: 'bg-slate-100/60'  },
    { label: t('trips:stats.inProgress'),    value: String(statusCounts.in_progress),                      rawValue: statusCounts.in_progress,                      icon: Clock,      color: 'text-blue-600',    bg: 'bg-blue-50/60'    },
    { label: t('trips:stats.completed'),     value: String(statusCounts.completed),                        rawValue: statusCounts.completed,                        icon: Flag,       color: 'text-emerald-600', bg: 'bg-emerald-50/60' },
    { label: t('trips:stats.cancelled'),     value: String(statusCounts.cancelled),                        rawValue: statusCounts.cancelled,                        icon: XCircle,    color: 'text-slate-500',   bg: 'bg-slate-50/60'   },
    { label: t('trips:stats.totalDistance'), value: fmt(Number(statusCounts.totalDistance), 'km'),         rawValue: Number(statusCounts.totalDistance), suffix: 'km', icon: TrendingUp, color: 'text-purple-600',  bg: 'bg-purple-50/60'  },
  ];

  const viewModes = [
    { mode: 'compact', icon: Rows,       label: t('common:viewModes.compact') },
    { mode: 'list',    icon: List,       label: t('common:viewModes.normal')  },
    { mode: 'cards',   icon: LayoutGrid, label: t('common:viewModes.cards')   },
  ] as const;

  // ---------------------------------------------------------------
  // Views — usam "trips" directamente (já filtrados pelo back)
  // ---------------------------------------------------------------

  function renderCompactView() {
    return (
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-muted/50 px-6 py-4 grid grid-cols-12 gap-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-b">
          <div className="col-span-2">{t('trips:table.code')}</div>
          <div className="col-span-3">{t('trips:table.route')}</div>
          <div className="col-span-2">{t('trips:table.vehicle')}</div>
          <div className="col-span-2">{t('trips:table.driver')}</div>
          <div className="col-span-2">{t('trips:table.status')}</div>
          <div className="col-span-1 text-right">{t('trips:table.actions')}</div>
        </div>
        <div className="divide-y">
          {trips.map((trip) => {
            const distance = trip.end_mileage ? trip.end_mileage - trip.start_mileage : null;
            return (
              <div key={trip.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-muted/40 transition-colors duration-150">
                <div className="col-span-2">
                  <span className="font-mono font-bold text-sm bg-muted/50 px-2.5 py-1 rounded border border-muted-foreground/10">{trip.trip_code}</span>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(trip.start_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-green-600 dark:text-green-400 truncate max-w-[80px]">{trip.origin}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold text-red-600 dark:text-red-400 truncate max-w-[80px]">{trip.destination}</span>
                  </div>
                  {distance !== null && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />{distance.toLocaleString('pt-PT')} km
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-bold">{trip.vehicle_license}</span>
                  <span className="text-xs text-muted-foreground block truncate">{trip.vehicle_brand} {trip.vehicle_model}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-medium truncate block">{trip.driver_name}</span>
                  <span className="text-xs text-muted-foreground truncate">{trip.driver_license_number}</span>
                </div>
                <div className="col-span-2">{getStatusBadge(trip.status)}</div>
                <div className="col-span-1 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => closeDropdownsAndOpenDialog(() => { selectTrip(trip); setViewDialogOpen(true); })}>
                        <Eye className="w-4 h-4 mr-2" /> {t('trips:actions.view')}
                      </DropdownMenuItem>
                      {trip.status === 'in_progress' && (
                        <>
                          <PermissionGate permission="trip:update" fullWidth><DropdownMenuItem onClick={() => closeDropdownsAndOpenDialog(() => { selectTrip(trip); setCompleteDialogOpen(true); })}>
                            <Flag className="w-4 h-4 mr-2" /> {t('trips:actions.complete')}
                          </DropdownMenuItem></PermissionGate>
                          <PermissionGate permission="trip:update" fullWidth><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => closeDropdownsAndOpenDialog(() => { selectTrip(trip); setCancelDialogOpen(true); })}>
                            <XCircle className="w-4 h-4 mr-2" /> {t('trips:actions.cancel')}
                          </DropdownMenuItem></PermissionGate>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderListView() {
    return (
      <div className="grid gap-4">
        {trips.map((trip) => {
          const distance     = trip.end_mileage ? trip.end_mileage - trip.start_mileage : null;
          const isInProgress = trip.status === 'in_progress';
          return (
            <Card key={trip.id} className="overflow-hidden group hover:shadow-md transition-all duration-200 bg-card">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 p-5">
                  <div className={cn('hidden sm:flex h-12 w-12 items-center justify-center rounded-xl shrink-0 transition-colors', isInProgress ? 'bg-blue-100 text-blue-600' : 'bg-muted/50 text-muted-foreground')}>
                    <Navigation className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-bold text-base">{trip.trip_code}</span>
                          {getStatusBadge(trip.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-green-600 dark:text-green-400 truncate">{trip.origin}</span>
                          <ArrowRight className="w-3 h-3 shrink-0" />
                          <span className="font-semibold text-red-600 dark:text-red-400 truncate">{trip.destination}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {new Date(trip.start_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{trip.vehicle_license}</span>
                          <span className="text-xs text-muted-foreground truncate block">{trip.vehicle_brand} {trip.vehicle_model}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{trip.driver_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Gauge className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">
                          {distance !== null ? `${distance.toLocaleString('pt-PT')} km` : `${trip.start_mileage.toLocaleString('pt-PT')} km`}
                        </span>
                      </div>
                      {trip.end_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Flag className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{new Date(trip.end_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => closeDropdownsAndOpenDialog(() => { selectTrip(trip); setViewDialogOpen(true); })}>
                        <Eye className="w-4 h-4 mr-2" />{t('trips:actions.view')}
                      </Button>
                      {isInProgress && (
                        <>
                          <PermissionGate permission="trip:update"><Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => closeDropdownsAndOpenDialog(() => { selectTrip(trip); setCompleteDialogOpen(true); })}>
                            <Flag className="w-4 h-4 mr-2" />{t('trips:actions.complete')}
                          </Button></PermissionGate>
                          <PermissionGate permission="trip:update"><Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => closeDropdownsAndOpenDialog(() => { selectTrip(trip); setCancelDialogOpen(true); })}>
                            <XCircle className="w-4 h-4 mr-2" />{t('trips:actions.cancel')}
                          </Button></PermissionGate>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  function renderCardsView() {
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {trips.map((trip) => {
          const distance     = trip.end_mileage ? trip.end_mileage - trip.start_mileage : null;
          const isInProgress = trip.status === 'in_progress';
          return (
            <Card key={trip.id} className={cn('flex flex-col h-full group hover:shadow-xl transition-all duration-300 bg-card relative overflow-hidden', isInProgress && 'ring-1 ring-blue-600 dark:ring-blue-400')}>
              <CardContent className="p-0 flex flex-col h-full">
                <div className="p-5 pb-3 border-b border-muted/50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('p-2 rounded-lg transition-colors', isInProgress ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary')}>
                        <Navigation className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-mono font-bold text-lg leading-tight">{trip.trip_code}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(trip.start_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(trip.status)}
                  </div>
                </div>

                <div className="p-5 pt-4 flex-1 space-y-4">
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('trips:fields.origin')}</p>
                        <p className="font-bold text-foreground truncate">{trip.origin}</p>
                      </div>
                    </div>
                    <div className="absolute left-5 top-10 w-0.5 h-8 bg-gradient-to-b from-green-200 to-red-200 dark:from-green-800 dark:to-red-800" />
                    <div className="flex items-center gap-3 mt-6">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('trips:fields.destination')}</p>
                        <p className="font-bold text-foreground truncate">{trip.destination}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-muted/40 border border-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('trips:fields.vehicle')}</span>
                      </div>
                      <p className="font-bold text-sm truncate">{trip.vehicle_license}</p>
                      <p className="text-xs text-muted-foreground truncate">{trip.vehicle_brand} {trip.vehicle_model}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('trips:fields.driver')}</span>
                      </div>
                      <p className="font-bold text-sm truncate">{trip.driver_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{trip.driver_license_number}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-muted/30 to-muted/50 border border-muted">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {distance !== null ? t('trips:fields.distance') : t('trips:info.kmInitial')}
                      </span>
                    </div>
                    <span className="font-bold text-lg">
                      {distance !== null ? `${distance.toLocaleString('pt-PT')} km` : `${trip.start_mileage.toLocaleString('pt-PT')} km`}
                    </span>
                  </div>

                  {trip.purpose && (
                    <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                      <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider mb-1">{t('trips:fields.purpose')}</p>
                      <p className="text-sm text-foreground/80 line-clamp-2">{trip.purpose}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 pt-0 mt-auto">
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-10 text-sm font-bold" onClick={() => { selectTrip(trip); setViewDialogOpen(true); }}>
                      <Eye className="w-4 h-4 mr-2" />{t('trips:actions.view')}
                    </Button>
                    {isInProgress ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="flex-1 h-10 text-sm font-bold shadow-sm">
                            <PlayCircle className="w-4 h-4 mr-2" />{t('trips:actions.actions')}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <PermissionGate permission="trip:update" fullWidth><DropdownMenuItem onClick={() => closeDropdownsAndOpenDialog(() => { selectTrip(trip); setCompleteDialogOpen(true); })}>
                            <Flag className="w-4 h-4 mr-2 text-emerald-600" />{t('trips:actions.complete')}
                          </DropdownMenuItem></PermissionGate>
                          <PermissionGate permission="trip:update" fullWidth><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => closeDropdownsAndOpenDialog(() => { selectTrip(trip); setCancelDialogOpen(true); })}>
                            <XCircle className="w-4 h-4 mr-2" />{t('trips:actions.cancel')}
                          </DropdownMenuItem></PermissionGate>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" disabled>
                        <CheckCircle2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  function renderRoutesCards() {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-300">
        {filteredRoutes.map((route) => {
          const isActive = route.status === 'active' || !route.status;
          return (
            <Card key={route.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-muted/60">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex justify-between items-start mb-3">
                  <div className={cn('p-2.5 rounded-xl transition-colors', isActive ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white' : 'bg-muted text-muted-foreground')}>
                    <RouteIcon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {route.route_type && (
                      <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {t(`routes:types.${route.route_type}`, route.route_type) as string}
                      </Badge>
                    )}
                    <Badge
                      variant={isActive ? 'outline' : 'secondary'}
                      className={cn('rounded-full text-[10px] font-bold px-2.5 py-0.5', isActive ? 'border-green-200 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800' : 'border-slate-200 text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400')}
                    >
                      {isActive ? t('common:status.active') : t('common:status.inactive')}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-base font-bold leading-tight truncate" title={route.name}>{route.name}</CardTitle>
                <CardDescription className="text-sm font-medium">
                  <span className="text-green-600 dark:text-green-400">{route.origin}</span>
                  <ArrowRight className="inline w-3 h-3 mx-1 text-muted-foreground" />
                  <span className="text-red-600 dark:text-red-400">{route.destination}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 p-5 pt-0">
                <div className="space-y-2 min-h-[48px]">
                  {(route.distance_km || route.estimated_distance) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <span>{(route.distance_km || route.estimated_distance).toLocaleString('pt-PT')} km</span>
                    </div>
                  )}
                  {(route.estimated_duration_hours || route.estimated_duration) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>~{route.estimated_duration_hours || route.estimated_duration}h</span>
                    </div>
                  )}
                  {route.waypoints && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="truncate">{route.waypoints}</span>
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-4 border-t border-muted/50 flex gap-2">
                  <PermissionGate permission="route:update"><Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold bg-background hover:bg-muted"
                    onClick={() => { setSelectedRoute(route); setEditRouteDialogOpen(true); }}>
                    <Edit className="w-3.5 h-3.5 mr-1.5" />{t('common:actions.edit')}
                  </Button></PermissionGate>
                  <PermissionGate permission="route:delete"><Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive bg-background"
                    onClick={() => { setSelectedRoute(route); setDeleteRouteDialogOpen(true); }}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />{t('common:actions.delete')}
                  </Button></PermissionGate>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <div className="min-h-screen bg-transparent -m-6 p-6">
      <div className="max-w-[1500px] mx-auto space-y-8 pb-10">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="space-y-0.5">
              <h1 className="text-2xl font-extrabold tracking-tight">{t('trips:title')}</h1>
              <p className="text-muted-foreground text-sm">
                {activeTab === 'trips' ? t('trips:description') : t('routes:description', { count: routes.length })}
              </p>
            </div>
            <TabsList className="flex h-9 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 mx-auto">
              <TabsTrigger value="trips" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                <Navigation className="w-4 h-4" />{t('trips:tabs.trips')}
              </TabsTrigger>
              <TabsTrigger value="routes" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                <RouteIcon className="w-4 h-4" />{t('trips:tabs.routes')}
              </TabsTrigger>
            </TabsList>
            <StartTripDialog />
          </div>

          {/* ---- TAB: VIAGENS ---- */}
          <TabsContent value="trips" className="space-y-6 mt-0 outline-none">

            {/* Stats — 5 cards vindos do back */}
            <TooltipProvider delayDuration={300}>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {tripStats.map((stat, i) => {
                const showTooltip = stat.rawValue !== undefined && stat.rawValue >= 1_000;
                const fullValue   = showTooltip ? `${stat.rawValue!.toLocaleString('pt-PT')}${stat.suffix ? ' ' + stat.suffix : ''}` : undefined;
                return (
                  <UITooltip key={i}>
                    <TooltipTrigger asChild>
                      <Card className="border-none shadow-sm bg-card overflow-hidden cursor-default">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={cn('p-2.5 rounded-xl shrink-0', stat.bg, stat.color)}>
                            <stat.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground truncate leading-tight">
                              {stat.label}
                            </p>
                            <p className="text-2xl font-black tracking-tight leading-tight">{stat.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    {showTooltip && (
                      <TooltipContent side="top" className="px-3 py-2.5 min-w-[120px]">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 leading-tight">{stat.label}</p>
                        <p className="text-sm font-black tabular-nums leading-tight">{fullValue}</p>
                      </TooltipContent>
                    )}
                  </UITooltip>
                );
              })}
            </div>
            </TooltipProvider>

            {/* Análises horizontal (acima da lista) */}
            {viewSettings.analyticsLayout !== 'vertical' && viewSettings.tripsAnalytics && (
              <TripsAnalyticsPanel
                layout="horizontal"
                statusCounts={statusCounts}
                totalCount={paginationInfo.total}
              />
            )}

            {/* Área principal: layout vertical = flex row (sidebar direita) */}
            <div className={viewSettings.analyticsLayout === 'vertical' ? 'flex gap-4 items-start' : undefined}>
            <div className={cn('space-y-6', viewSettings.analyticsLayout === 'vertical' ? 'flex-1 min-w-0' : undefined)}>
            {/* Toolbar */}
            <div className="bg-card rounded-2xl border border-muted/50 shadow-sm overflow-hidden">
              {/* Linha 1: filtros + view modes */}
              <div className="flex flex-wrap gap-3 items-center p-3">
                <div className="flex flex-wrap gap-3 flex-1 min-w-0">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder={t('trips:searchPlaceholder')} value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1" />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="flex-1 min-w-[140px] max-w-full overflow-hidden h-10 text-sm bg-muted/20 border-none">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder={t('trips:filters.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t('trips:filters.all')}</span>
                          {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.in_progress + statusCounts.completed + statusCounts.cancelled})</span>}
                        </span>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t('trips:filters.in_progress')}</span>
                          {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.in_progress})</span>}
                        </span>
                      </SelectItem>
                      <SelectItem value="completed">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t('trips:filters.completed')}</span>
                          {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.completed})</span>}
                        </span>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t('trips:filters.cancelled')}</span>
                          {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.cancelled})</span>}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex bg-muted/30 p-1 rounded-xl border border-muted/50 self-center sm:self-auto shrink-0">
                  {viewModes.map((item) => (
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

              {/* Linha 2: paginação */}
              {paginationInfo.total > 0 && (
                <div className="border-t border-muted/40 px-3 py-2 flex justify-end">
                  <Pagination
                    pagination={paginationInfo}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                  />
                </div>
              )}
            </div>

            {/* Lista */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p>
              </div>
            ) : trips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50">
                <RouteIcon className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold">{t('trips:noTrips')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{searchTerm ? t('common:noResults') : t('common:noData')}</p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                {viewMode === 'compact' ? renderCompactView() : viewMode === 'list' ? renderListView() : renderCardsView()}
              </div>
            )}
            </div>
            {viewSettings.analyticsLayout === 'vertical' && viewSettings.tripsAnalytics && (
              <div className="w-[300px] shrink-0 sticky top-4">
                <TripsAnalyticsPanel
                  layout="vertical"
                  statusCounts={statusCounts}
                  totalCount={paginationInfo.total}
                />
              </div>
            )}
            </div>
          </TabsContent>

          {/* ---- TAB: ROTAS ---- */}
          <TabsContent value="routes" className="space-y-6 mt-0 outline-none">

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {[
                { label: t('routes:stats.total'),    value: routes.length,                icon: RouteIcon,    color: 'text-blue-600',    bg: 'bg-blue-50/60'    },
                { label: t('routes:stats.active'),   value: activeRoutes,                 icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/60' },
                { label: t('routes:stats.inactive'), value: routes.length - activeRoutes, icon: XCircle,      color: 'text-slate-500',   bg: 'bg-slate-50/60'   },
              ].map((stat, i) => (
                <Card key={i} className="border-none shadow-sm bg-card overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-xl shrink-0', stat.bg, stat.color)}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground truncate leading-tight">{stat.label}</p>
                      <p className="text-2xl font-black tracking-tight leading-tight">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-card rounded-2xl border border-muted/50 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t('routes:searchPlaceholder')} value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1" />
                </div>
                <div className="sm:ml-auto">
                  <NewRouteDialog onRouteCreated={handleRouteCreated} />
                </div>
              </div>
            </div>

            {isRoutesLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50">
                <RouteIcon className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold">{t('routes:noRoutes')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{routeSearch ? t('common:noResults') : t('common:noData')}</p>
              </div>
            ) : (
              renderRoutesCards()
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CompleteTripDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen} onSuccess={loadTrips} />
        <ViewTripDialog     open={viewDialogOpen}     onOpenChange={setViewDialogOpen}     />
        <ConfirmDeleteDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onConfirm={handleCancelTrip}
          title={t('trips:dialogs.cancel.title')}
          description={t('trips:dialogs.cancel.warning')}
          itemName={selectedTrip?.trip_code}
          isLoading={isCancelling}
        />
        <EditRouteDialog
          open={editRouteDialogOpen}
          onOpenChange={setEditRouteDialogOpen}
          route={selectedRoute}
          onRouteUpdated={handleRouteUpdated}
        />
        <ConfirmDeleteDialog
          open={deleteRouteDialogOpen}
          onOpenChange={setDeleteRouteDialogOpen}
          onConfirm={handleDeleteRoute}
          title={t('routes:dialogs.delete.title')}
          description={t('routes:dialogs.delete.description')}
          warning={t('routes:dialogs.delete.warning')}
          itemName={selectedRoute?.name}
          isLoading={isDeletingRoute}
        />
      </div>
    </div>
  );
}