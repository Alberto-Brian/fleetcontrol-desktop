// ========================================
// FILE: src/components/refueling/FuelPageContent.tsx
// ========================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { readPersistedViewMode, writePersistedViewMode } from '@/lib/filter-persistence';
import {
  Fuel, Search, TrendingUp, MapPin, Eye, Edit, Trash2,
  LayoutGrid, List, Rows, Building2, Phone, Mail, TrendingDown,
  Calendar, Gauge, MoreHorizontal, RotateCcw,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useRefuelings } from '@/contexts/RefuelingsContext';
import { usePageViewSettings } from '@/hooks/usePageViewSettings';
import { usePagePagination } from '@/hooks/usePagePagination';
import { usePowerSyncDataChanged } from '@/hooks/usePowerSyncDataChanged';
import { FuelAnalyticsPanel } from '@/components/analytics/FuelAnalyticsPanel';
import { getAllRefuelings, deleteRefueling as deleteRefuelingHelper } from '@/helpers/refueling-helpers';
import { getAllFuelStations, deleteFuelStation as deleteFuelStationHelper } from '@/helpers/fuel-station-helpers';

import NewRefuelingDialog    from '@/components/refueling/NewRefuelingDialog';
import ViewRefuelingDialog   from '@/components/refueling/ViewRefuelingDialog';
import EditRefuelingDialog   from '@/components/refueling/EditRefuelingDialog';
import NewFuelStationDialog  from '@/components/refueling/NewFuelStationDialog';
import EditFuelStationDialog from '@/components/refueling/EditFuelStationDialog';
import ConfirmDeleteDialog   from '@/components/ConfirmDeleteDialog';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { getAllVehicles } from '@/helpers/vehicle-helpers';
import { readPersistedFilter, writePersistedFilter } from '@/lib/filter-persistence';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermission } from '@/hooks/usePermission';

function fmt(n: number, suffix = '') {
  const abs = Math.abs(n);
  const sfx = suffix ? ' ' + suffix : '';
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M${sfx}`;
  if (abs >= 1_000)     return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K${sfx}`;
  return `${n.toLocaleString('pt-PT')}${sfx}`;
}

type ViewMode = 'compact' | 'normal' | 'cards';

export default function FuelPageContent() {
  const { t } = useTranslation();
  const { handleError, showSuccess } = useErrorHandler();
  const canEditFuelStation = usePermission('fuel_station:update');

  const {
    state: {
      refuelings, fuelStations, selectedRefueling, selectedFuelStation,
      isLoading, isFuelStationsLoading,
    },
    setRefuelings, setFuelStations,
    selectRefueling, selectFuelStation,
    deleteRefueling:   removeRefuelingFromContext,
    deleteFuelStation: removeStationFromContext,
    setLoading, setFuelStationsLoading,
    updateFuelStation,
  } = useRefuelings();

  const [activeTab,      setActiveTab]      = useState('refuelings');
  const [searchTerm,     setSearchTerm]     = useState('');
  const [vehicleFilter,  setVehicleFilter]  = useState<string>(() => readPersistedFilter('fuel', 'vehicleFilter',  'all'));
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>(() => readPersistedFilter('fuel', 'fuelTypeFilter', 'all'));
  const [stationFilter,  setStationFilter]  = useState<string>(() => readPersistedFilter('fuel', 'stationFilter',  'all'));
  const [availableVehicles, setAvailableVehicles] = useState<{ id: string; license_plate: string }[]>([]);
  const [viewMode,       setViewMode]       = useState<ViewMode>(() => readPersistedViewMode<ViewMode>('fuel', 'cards'));
  useEffect(() => { writePersistedViewMode('fuel', viewMode); }, [viewMode]);
  useEffect(() => { writePersistedFilter('fuel', 'vehicleFilter',  vehicleFilter);  }, [vehicleFilter]);
  useEffect(() => { writePersistedFilter('fuel', 'fuelTypeFilter', fuelTypeFilter); }, [fuelTypeFilter]);
  useEffect(() => { writePersistedFilter('fuel', 'stationFilter',  stationFilter);  }, [stationFilter]);
  const [stationSearch, setStationSearch] = useState('');

  // Paginação
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, clampToTotalPages } = usePagePagination('fuel');
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false,
  });
  const [stats, setStats] = useState({ totalCost: 0, totalLiters: 0, avgPrice: 0, totalCount: 0 });
  const [analyticsRefuelings, setAnalyticsRefuelings] = useState<any[]>([]);
  const { settings: viewSettings } = usePageViewSettings();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Dialogs de abastecimentos
  const [viewDialogOpen,   setViewDialogOpen]   = useState(false);
  const [editDialogOpen,   setEditDialogOpen]   = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingRefueling, setIsDeletingRefueling] = useState(false);

  // Dialogs de postos
  const [editStationDialogOpen,   setEditStationDialogOpen]   = useState(false);
  const [stationDeleteDialogOpen, setStationDeleteDialogOpen] = useState(false);
  const [isDeletingStation,       setIsDeletingStation]       = useState(false);

  // Debounce da pesquisa
  const isInitialSearchRef = useRef(true);
  useEffect(() => {
    if (isInitialSearchRef.current) {
      isInitialSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => { loadRefuelings(); }, [currentPage, itemsPerPage, debouncedSearch, vehicleFilter, fuelTypeFilter, stationFilter]);
  useEffect(() => { loadStations(); },  []);
  useEffect(() => {
    getAllVehicles({ limit: 9999 })
      .then(r => setAvailableVehicles(r.data))
      .catch(() => {});
  }, []);

  const hasActiveFilters = searchTerm !== '' || vehicleFilter !== 'all' || fuelTypeFilter !== 'all' || stationFilter !== 'all';
  function resetFilters() {
    setSearchTerm('');
    setVehicleFilter('all');
    setFuelTypeFilter('all');
    setStationFilter('all');
    setCurrentPage(1);
  }

  // silent — ver o mesmo comentário em VehiclesPageContent.tsx: uma
  // actualização em segundo plano nunca deve mostrar o spinner de "a carregar".
  const loadRefuelings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const filterParams = {
        search:     debouncedSearch || undefined,
        vehicle_id: vehicleFilter  !== 'all' ? vehicleFilter  : undefined,
        fuel_type:  fuelTypeFilter !== 'all' ? fuelTypeFilter as any : undefined,
        station_id: stationFilter  !== 'all' ? stationFilter  : undefined,
      };
      const [result, analytics] = await Promise.all([
        getAllRefuelings({ ...filterParams, page: currentPage, limit: itemsPerPage }),
        getAllRefuelings({ ...filterParams, limit: 9999 }),
      ]);
      setRefuelings(result.data);
      setAnalyticsRefuelings(analytics.data);
      setPaginationInfo(result.pagination);
      clampToTotalPages(result.pagination.totalPages);
      if (result.statusCounts) setStats(result.statusCounts as typeof stats);
    } catch (error) {
      handleError(error, 'refuelings:errors.errorLoading');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, vehicleFilter, fuelTypeFilter, stationFilter]);

  // Achado 2026-09-0X: ver o mesmo comentário em VehiclesPageContent.tsx —
  // uma sync do PowerSync em segundo plano nunca chegava a esta página sozinha.
  usePowerSyncDataChanged(['fuel'], () => loadRefuelings(true));
  usePowerSyncDataChanged(['fuel_stations'], () => loadStations(true));

  async function loadStations(silent = false) {
    if (!silent) setFuelStationsLoading(true);
    try {
      setFuelStations(await getAllFuelStations());
    } catch (error) {
      handleError(error, 'refuelings:errors.errorLoadingStations');
    } finally {
      if (!silent) setFuelStationsLoading(false);
    }
  }

  // ── Acções sobre abastecimentos ────────────────────────────────────────────
  function openView(refueling: any) {
    selectRefueling(refueling);
    setViewDialogOpen(true);
  }

  function openEdit(refueling: any) {
    selectRefueling(refueling);
    setEditDialogOpen(true);
  }

  function openDelete(refueling: any) {
    selectRefueling(refueling);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteRefueling() {
    if (!selectedRefueling) return;

    setIsDeletingRefueling(true);
    try {
      await deleteRefuelingHelper(selectedRefueling.id);
      removeRefuelingFromContext(selectedRefueling.id);
      showSuccess('refuelings:toast.deleteSuccess');
      setDeleteDialogOpen(false);
      selectRefueling(null);
    } catch (error) {
      handleError(error, 'refuelings:toast.deleteError');
    } finally {
      setIsDeletingRefueling(false);
    }
  }

  // ── Acções sobre postos ────────────────────────────────────────────────────
  async function handleDeleteStation() {
    if (!selectedFuelStation) return;

    setIsDeletingStation(true);
    try {
      await deleteFuelStationHelper(selectedFuelStation.id);
      removeStationFromContext(selectedFuelStation.id);
      showSuccess('refuelings:toast.stationDeleteSuccess');
      setStationDeleteDialogOpen(false);
      selectFuelStation(null);
    } catch (error) {
      handleError(error, 'refuelings:toast.stationDeleteError');
    } finally {
      setIsDeletingStation(false);
    }
  }

  const filteredStations = fuelStations.filter(s =>
    s.name?.toLowerCase().includes(stationSearch.toLowerCase()) ||
    s.city?.toLowerCase().includes(stationSearch.toLowerCase())
  );
  const activeStations = fuelStations.filter(s => s.is_active).length;

  const viewModes = [
    { mode: 'compact', icon: Rows,       label: t('common:viewModes.compact') },
    { mode: 'normal',  icon: List,       label: t('common:viewModes.normal')  },
    { mode: 'cards',   icon: LayoutGrid, label: t('common:viewModes.cards')   },
  ] as const;

  // ── COMPACT VIEW ──────────────────────────────────────────────────────────
  function renderCompactView() {
    return (
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-muted/50 px-6 py-4 grid grid-cols-12 gap-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-b">
          <div className="col-span-2">{t('refuelings:table.date')}</div>
          <div className="col-span-2">{t('refuelings:table.vehicle')}</div>
          <div className="col-span-2">{t('refuelings:table.station')}</div>
          <div className="col-span-1">{t('refuelings:table.liters')}</div>
          <div className="col-span-2">{t('refuelings:table.price')}</div>
          <div className="col-span-2">{t('refuelings:table.total')}</div>
          <div className="col-span-1 text-right">{t('refuelings:table.actions')}</div>
        </div>
        <div className="divide-y">
          {refuelings.map((r) => (
            <div key={r.id} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-muted/40 transition-colors">
              <div className="col-span-2 text-sm font-medium">
                {new Date(r.refueling_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' })}
              </div>
              <div className="col-span-2">
                <span className="font-mono font-bold text-sm">{r.vehicle_license}</span>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground truncate block">{r.station_name || '—'}</span>
              </div>
              <div className="col-span-1">
                <span className="text-sm font-semibold">{r.liters}L</span>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">{r.price_per_liter.toFixed(2)} Kz</span>
              </div>
              <div className="col-span-2">
                <span className="text-sm font-bold text-primary">{r.total_cost.toLocaleString('pt-PT')} Kz</span>
              </div>
              {/* Dropdown com as 3 acções */}
              <div className="col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openView(r)}>
                      <Eye className="w-4 h-4 mr-2" />{t('common:actions.view')}
                    </DropdownMenuItem>
                    <PermissionGate permission="fuel:update" fullWidth><DropdownMenuItem onClick={() => openEdit(r)}>
                      <Edit className="w-4 h-4 mr-2" />{t('common:actions.edit')}
                    </DropdownMenuItem></PermissionGate>
                    <DropdownMenuSeparator />
                    <PermissionGate permission="fuel:delete" fullWidth><DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => openDelete(r)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />{t('common:actions.delete')}
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

  // ── NORMAL VIEW ───────────────────────────────────────────────────────────
  function renderNormalView() {
    return (
      <div className="grid gap-4">
        {refuelings.map((r) => (
          <Card key={r.id} className="overflow-hidden border-l-4 group hover:shadow-md transition-all duration-200 bg-card border-l-primary">
            <CardContent className="p-0">
              <div className="flex items-center p-5 gap-5">
                <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0">
                  <Fuel className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg tracking-tight font-mono">{r.vehicle_license}</h3>
                    {r.is_full_tank && (
                      <Badge variant="outline" className="text-[10px]">{t('refuelings:info.fullTank')}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{new Date(r.refueling_date).toLocaleDateString('pt-PT')}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{r.station_name || t('refuelings:info.noStation')}</span>
                    <span className="flex items-center gap-1.5"><Gauge className="w-4 h-4" />{r.current_mileage?.toLocaleString('pt-PT')} km</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('refuelings:fields.totalCost')}</p>
                    <p className="text-xl font-bold text-primary">{r.total_cost.toLocaleString('pt-PT')} Kz</p>
                  </div>
                  {/* Acções na view normal */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openView(r)} title={t('common:actions.view')}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <PermissionGate permission="fuel:update"><Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(r)} title={t('common:actions.edit')}>
                      <Edit className="w-4 h-4" />
                    </Button></PermissionGate>
                    <PermissionGate permission="fuel:delete"><Button
                      variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openDelete(r)} title={t('common:actions.delete')}
                    >
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

  // ── CARDS VIEW ────────────────────────────────────────────────────────────
  function renderCardsView() {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {refuelings.map((r) => (
          <Card
            key={r.id}
            className={cn(
              'overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-muted/60 cursor-pointer',
              r.is_full_tank && 'border-t-4 border-t-green-500'
            )}
            onClick={() => openView(r)}
          >
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex justify-between items-start mb-3">
                <div className={cn(
                  'p-2.5 rounded-xl transition-all duration-300',
                  r.is_full_tank
                    ? 'bg-green-100 text-green-600 group-hover:bg-green-500 group-hover:text-white'
                    : 'bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white'
                )}>
                  <Fuel className="w-5 h-5" />
                </div>
                {/* Dropdown de acções (stopPropagation para não abrir o View) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); openView(r); }}>
                      <Eye className="w-4 h-4 mr-2" />{t('common:actions.view')}
                    </DropdownMenuItem>
                    <PermissionGate permission="fuel:update" fullWidth><DropdownMenuItem onClick={e => { e.stopPropagation(); openEdit(r); }}>
                      <Edit className="w-4 h-4 mr-2" />{t('common:actions.edit')}
                    </DropdownMenuItem></PermissionGate>
                    <DropdownMenuSeparator />
                    <PermissionGate permission="fuel:delete" fullWidth><DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={e => { e.stopPropagation(); openDelete(r); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />{t('common:actions.delete')}
                    </DropdownMenuItem></PermissionGate>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="text-xl font-mono font-bold">{r.vehicle_license}</CardTitle>
              <CardDescription className="text-sm font-bold text-foreground/70 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(r.refueling_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 p-5 pt-0">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 border border-muted/50 group-hover:bg-muted/70 transition-colors">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('refuelings:fields.liters')}</p>
                  <p className="text-lg font-bold tracking-tight">{r.liters}<span className="ml-1 text-xs font-normal text-muted-foreground">L</span></p>
                </div>
                <div className="h-8 w-px bg-muted-foreground/10" />
                <div className="text-right space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('refuelings:fields.pricePerLiter')}</p>
                  <p className="text-lg font-bold tracking-tight">{r.price_per_liter.toFixed(0)}<span className="ml-1 text-xs font-normal text-muted-foreground">Kz</span></p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{r.station_name || t('refuelings:info.noStation')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gauge className="w-4 h-4 shrink-0" />
                  <span>{r.current_mileage?.toLocaleString('pt-PT')} km</span>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">{t('refuelings:fields.totalCost')}</span>
                  <span className="text-xl font-black text-primary">{r.total_cost.toLocaleString('pt-PT')} <span className="text-sm font-bold">Kz</span></span>
                </div>
                {/* Botões de acção no card */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 h-9 text-sm font-bold shadow-sm"
                    onClick={e => { e.stopPropagation(); openView(r); }}
                  >
                    <Eye className="w-4 h-4 mr-2" />{t('refuelings:actions.view')}
                  </Button>
                  <PermissionGate permission="fuel:update"><Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={e => { e.stopPropagation(); openEdit(r); }}
                    title={t('common:actions.edit')}
                  >
                    <Edit className="w-4 h-4" />
                  </Button></PermissionGate>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-transparent -m-6 p-6">
      <div className="max-w-[1500px] mx-auto space-y-6 pb-10">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          {/* Cabeçalho — título | tabs | botão */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight">{t('refuelings:title')}</h1>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'refuelings'
                  ? t('refuelings:info.totalRefuelings', { count: paginationInfo.total, plural: paginationInfo.total === 1 ? '' : 's' })
                  : t('refuelings:info.activeCount', { count: activeStations, plural: activeStations === 1 ? '' : 's' })}
              </p>
            </div>

            <TabsList className="flex h-9 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 mx-auto">
              <TabsTrigger value="refuelings"
                className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all flex items-center gap-1.5
                           data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Fuel className="w-3.5 h-3.5" />{t('refuelings:tabs.refuelings')}
              </TabsTrigger>
              <TabsTrigger value="stations"
                className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all flex items-center gap-1.5
                           data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <MapPin className="w-3.5 h-3.5" />{t('refuelings:tabs.stations')}
              </TabsTrigger>
            </TabsList>

            <div className="ml-auto"><NewRefuelingDialog onSuccess={loadRefuelings} /></div>
          </div>

          {/* ── TAB: ABASTECIMENTOS ─────────────────────────────────────── */}
          <TabsContent value="refuelings" className="space-y-6 mt-0 outline-none">

            {/* Stats */}
            <TooltipProvider delayDuration={300}>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {[
                { label: t('refuelings:stats.totalSpent'),   value: fmt(Number(stats.totalCost), 'Kz'),       rawValue: Number(stats.totalCost),   suffix: 'Kz', icon: TrendingUp,  color: 'text-blue-600',   bg: 'bg-blue-50/60'   },
                { label: t('refuelings:stats.totalLiters'),  value: `${Number(stats.totalLiters).toFixed(1)}L`, rawValue: Number(stats.totalLiters), suffix: 'L',  icon: Fuel,         color: 'text-green-600',  bg: 'bg-green-50/60'  },
                { label: t('refuelings:stats.averagePrice'), value: `${Number(stats.avgPrice).toFixed(2)} Kz`,                                                     icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50/60' },
                { label: t('refuelings:stats.refuelings'),   value: String(paginationInfo.total),               rawValue: paginationInfo.total,                    icon: MapPin,       color: 'text-purple-600', bg: 'bg-purple-50/60' },
              ].map((stat, i) => {
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
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground truncate leading-tight">{stat.label}</p>
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
            {viewSettings.analyticsLayout !== 'vertical' && viewSettings.fuelAnalytics && (
              <FuelAnalyticsPanel
                layout="horizontal"
                stats={stats}
                refuelings={analyticsRefuelings}
                totalCount={paginationInfo.total}
              />
            )}

            {/* Área principal: layout vertical = flex row (sidebar direita) */}
            <div className={viewSettings.analyticsLayout === 'vertical' ? 'flex gap-4 items-start' : undefined}>
            <div className={cn('space-y-6', viewSettings.analyticsLayout === 'vertical' ? 'flex-1 min-w-0' : undefined)}>
            {/* Toolbar */}
            <div className="bg-card rounded-2xl border border-muted/50 shadow-sm overflow-hidden">
              {/* Linha de filtros */}
              <div className="flex flex-wrap gap-2 items-center py-3 px-6">
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('refuelings:searchPlaceholder')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 w-[220px] text-sm bg-muted/20 border-none focus-visible:ring-1"
                  />
                </div>

                {/* Vehicle filter — SearchableSelect */}
                <div className="w-[160px] shrink-0">
                  <SearchableSelect
                    value={vehicleFilter}
                    onValueChange={v => { setVehicleFilter(v); setCurrentPage(1); }}
                    placeholder={t('refuelings:filters.allVehicles')}
                    searchPlaceholder={t('common:search')}
                    emptyMessage={t('common:noData')}
                    className="h-9 text-sm bg-muted/20 border-none w-full"
                    noneOption={{ value: 'all', label: t('refuelings:filters.allVehicles') }}
                    options={availableVehicles.map((v): SearchableSelectOption => ({
                      value: v.id,
                      label: v.license_plate,
                      searchText: v.license_plate,
                    }))}
                  />
                </div>

                {/* Fuel type filter */}
                <Select value={fuelTypeFilter} onValueChange={v => { setFuelTypeFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 w-[150px] text-sm bg-muted/20 border-none focus:ring-1 shrink-0">
                    <SelectValue placeholder={t('refuelings:filters.allFuelTypes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><span className="truncate">{t('refuelings:filters.allFuelTypes')}</span></SelectItem>
                    <SelectItem value="gasoline"><span className="truncate">{t('refuelings:fuelTypes.gasoline')}</span></SelectItem>
                    <SelectItem value="diesel"><span className="truncate">{t('refuelings:fuelTypes.diesel')}</span></SelectItem>
                    <SelectItem value="ethanol"><span className="truncate">{t('refuelings:fuelTypes.ethanol')}</span></SelectItem>
                    <SelectItem value="cng"><span className="truncate">{t('refuelings:fuelTypes.cng')}</span></SelectItem>
                  </SelectContent>
                </Select>

                {/* Station filter */}
                <Select value={stationFilter} onValueChange={v => { setStationFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 w-[155px] text-sm bg-muted/20 border-none focus:ring-1 shrink-0">
                    <SelectValue placeholder={t('refuelings:filters.allStations')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><span className="truncate">{t('refuelings:filters.allStations')}</span></SelectItem>
                    {fuelStations.map(s => (
                      <SelectItem key={s.id} value={s.id}><span className="truncate">{s.name}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Linha de view modes + paginação — sempre visível */}
              <div className="border-t border-muted/40 px-3 py-2 flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground gap-1.5 shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('common:actions.clearFilters')}
                  </Button>
                )}
                <div className="flex bg-muted/40 p-1 rounded-lg border border-border shrink-0">
                  {viewModes.map(item => (
                    <Button
                      key={item.mode} variant="ghost" size="sm"
                      onClick={() => setViewMode(item.mode as ViewMode)}
                      className={cn('h-8 px-3 rounded-lg transition-all', viewMode === item.mode ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground')}
                      title={item.label}
                    >
                      <item.icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
                <div className="flex-1" />
                {paginationInfo.total > 0 && (
                  <Pagination
                    pagination={paginationInfo}
                    onPageChange={p => setCurrentPage(p)}
                    onLimitChange={l => { setItemsPerPage(l); setCurrentPage(1); }}
                  />
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p>
              </div>
            ) : refuelings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50">
                <Fuel className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold">{t('refuelings:noRefuelings')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{searchTerm ? t('common:noResults') : t('common:noData')}</p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                {viewMode === 'compact' && renderCompactView()}
                {viewMode === 'normal'  && renderNormalView()}
                {viewMode === 'cards'   && renderCardsView()}
              </div>
            )}
            </div>
            {viewSettings.analyticsLayout === 'vertical' && viewSettings.fuelAnalytics && (
              <div className="w-[300px] shrink-0 sticky top-4">
                <FuelAnalyticsPanel
                  layout="vertical"
                  stats={stats}
                  refuelings={analyticsRefuelings}
                  totalCount={paginationInfo.total}
                />
              </div>
            )}
            </div>
          </TabsContent>

          {/* ── TAB: POSTOS ─────────────────────────────────────────────── */}
          <TabsContent value="stations" className="space-y-6 mt-0 outline-none">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {[
                { label: t('refuelings:stations.stats.total'),    value: fuelStations.length,                  icon: Building2, color: 'text-blue-600',    bg: 'bg-blue-50/60'    },
                { label: t('refuelings:stations.stats.active'),   value: activeStations,                       icon: MapPin,    color: 'text-emerald-600', bg: 'bg-emerald-50/60' },
                { label: t('refuelings:stations.stats.inactive'), value: fuelStations.length - activeStations, icon: MapPin,    color: 'text-slate-500',   bg: 'bg-slate-50/60'   },
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
                  <Input
                    placeholder={t('common:search')} value={stationSearch}
                    onChange={e => setStationSearch(e.target.value)}
                    className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1"
                  />
                </div>
                <div className="sm:ml-auto"><NewFuelStationDialog onSuccess={loadStations} /></div>
              </div>
            </div>

            {isFuelStationsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p>
              </div>
            ) : filteredStations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50">
                <Building2 className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold">{t('refuelings:stations.noStations')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('common:noResults')}</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-300">
                {filteredStations.map((station) => (
                  <Card
                    key={station.id}
                    className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-muted/60 cursor-pointer"
                    onClick={canEditFuelStation ? () => { selectFuelStation(station); setEditStationDialogOpen(true); } : undefined}
                  >
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className={cn('p-2.5 rounded-xl transition-colors', station.is_active ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white' : 'bg-muted text-muted-foreground')}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <Badge
                          variant={station.is_active ? 'outline' : 'secondary'}
                          className={cn('rounded-full text-[10px] font-bold px-2.5 py-0.5', station.is_active ? 'border-green-200 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800' : 'border-slate-200 text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400')}
                        >
                          {station.is_active ? t('common:status.active') : t('common:status.inactive')}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold leading-tight truncate" title={station.name}>{station.name}</CardTitle>
                      {station.brand && <CardDescription className="text-sm font-medium text-muted-foreground">{station.brand}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3 p-5 pt-0">
                      <div className="space-y-2 min-h-[60px]">
                        {station.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /><span className="truncate">{station.phone}</span></div>}
                        {station.city  && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4 shrink-0" /><span className="truncate">{station.city}</span></div>}
                        {(station as any).email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-4 h-4 shrink-0" /><span className="truncate">{(station as any).email}</span></div>}
                      </div>
                      <div className="mt-auto pt-4 border-t border-muted/50 flex gap-2">
                        <PermissionGate permission="fuel_station:update"><Button
                          variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold bg-background hover:bg-muted"
                          onClick={e => { e.stopPropagation(); selectFuelStation(station); setEditStationDialogOpen(true); }}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1.5" />{t('common:actions.edit')}
                        </Button></PermissionGate>
                        <PermissionGate permission="fuel_station:delete"><Button
                          variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive bg-background"
                          onClick={e => { e.stopPropagation(); selectFuelStation(station); setStationDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />{t('common:actions.delete')}
                        </Button></PermissionGate>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Dialogs de abastecimentos ─────────────────────────────────── */}
        <ViewRefuelingDialog   open={viewDialogOpen}   onOpenChange={setViewDialogOpen} />
        <EditRefuelingDialog   open={editDialogOpen}   onOpenChange={setEditDialogOpen} onSuccess={loadRefuelings} />
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteRefueling}
          title={t('refuelings:dialogs.delete.title', 'Eliminar abastecimento')}
          description={t('refuelings:dialogs.delete.description', 'Esta acção não pode ser desfeita.')}
          itemName={selectedRefueling?.vehicle_license}
          isLoading={isDeletingRefueling}
        />

        {/* ── Dialogs de postos ────────────────────────────────────────── */}
        <EditFuelStationDialog open={editStationDialogOpen} onOpenChange={setEditStationDialogOpen} />
        <ConfirmDeleteDialog
          open={stationDeleteDialogOpen}
          onOpenChange={setStationDeleteDialogOpen}
          onConfirm={handleDeleteStation}
          title={t('refuelings:dialogs.deleteStation.title')}
          description={t('refuelings:dialogs.deleteStation.description')}
          warning={t('refuelings:dialogs.deleteStation.warning')}
          itemName={selectedFuelStation?.name}
          isLoading={isDeletingStation}
        />
      </div>
    </div>
  );
}