// ========================================
// FILE: src/components/maintenance/MaintenancePageContent.tsx (ATUALIZADO)
// ========================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { maintenanceStatus } from '@/lib/db/schemas/maintenances';
import { usePageViewSettings } from '@/hooks/usePageViewSettings';
import { usePagePagination } from '@/hooks/usePagePagination';
import { usePowerSyncDataChanged } from '@/hooks/usePowerSyncDataChanged';
import { MaintenanceAnalyticsPanel } from '@/components/analytics/MaintenanceAnalyticsPanel';
import { cn } from '@/lib/utils';
import { readPersistedFilter, writePersistedFilter, readPersistedViewMode, writePersistedViewMode } from '@/lib/filter-persistence';
import {
  Wrench, Search, Tag, Edit, Trash2, LayoutGrid, List, Rows,
  Building2, AlertCircle, Clock, Flag, Settings, Phone, Mail, MapPin, Eye, Play, CheckCircle2, Filter, MoreHorizontal, Gauge, X, RotateCcw
} from 'lucide-react';

import { useMaintenances } from '@/contexts/MaintenancesContext';
import { getAllMaintenances as getAllMaintenancesHelper, deleteMaintenance as deleteMaintenanceHelper } from '@/helpers/maintenance-helpers';
import { getSystemSettings } from '@/helpers/system-settings-helpers';
import { getAllMaintenanceCategories as getAllCategoriesHelper, deleteMaintenanceCategory as deleteCategoryHelper } from '@/helpers/maintenance-category-helpers';
import { getAllWorkshops, deleteWorkshop as deleteWorkshopHelper } from '@/helpers/workshop-helpers';

import NewMaintenanceDialog from '@/components/maintenance/NewMaintenanceDialog';
import StartMaintenanceDialog from '@/components/maintenance/StartMaintenanceDialog';
import CompleteMaintenanceDialog from '@/components/maintenance/CompleteMaintenanceDialog';
import ViewMaintenanceDialog from '@/components/maintenance/ViewMaintenanceDialog';
import EditMaintenanceDialog from '@/components/maintenance/EditMaintenanceDialog'; // NOVO IMPORT
import NewMaintenanceCategoryDialog from '@/components/maintenance/NewMaintenanceCategoryDialog';
import EditMaintenanceCategoryDialog from '@/components/maintenance/EditMaintenanceCategoryDialog';
import NewWorkshopDialog from '@/components/maintenance/NewWorkshopDialog';
import EditWorkshopDialog from '@/components/maintenance/EditWorkshopDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { RESTORE_MAINTENANCE_CATEGORY } from '@/helpers/ipc/db/maintenance_categories/maintenance-categories-channels';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

type ViewMode = 'compact' | 'normal' | 'cards';

export function MaintenancePageContent() {
  const { t } = useTranslation();
  const { handleError, showSuccess } = useErrorHandler();

  const {
    state: { maintenances, categories, workshops, selectedMaintenance, selectedCategory, selectedWorkshop,
             isLoading, isCategoriesLoading, isWorkshopsLoading },
    setMaintenances, setCategories, setWorkshops, selectMaintenance, selectCategory, selectWorkshop,
    deleteMaintenance: removeMaintenanceFromContext, deleteCategory: removeCategoryFromContext,
    deleteWorkshop: removeWorkshopFromContext, setLoading, setCategoriesLoading, setWorkshopsLoading,
    updateCategory, updateWorkshop,
  } = useMaintenances();

  const [activeTab, setActiveTab]     = useState('maintenances');
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => readPersistedFilter('maintenance', 'status', 'all'));
  const [typeFilter, setTypeFilter]   = useState<string>(() => readPersistedFilter('maintenance', 'type', 'all'));
  const [categoryFilter, setCategoryFilter] = useState<string>(() => readPersistedFilter('maintenance', 'category', 'all'));
  const [viewMode, setViewMode]       = useState<ViewMode>(() => readPersistedViewMode<ViewMode>('maintenance', 'cards'));
  useEffect(() => { writePersistedViewMode('maintenance', viewMode); }, [viewMode]);
  useEffect(() => { writePersistedFilter('maintenance', 'status',   statusFilter);   }, [statusFilter]);
  useEffect(() => { writePersistedFilter('maintenance', 'type',     typeFilter);     }, [typeFilter]);
  useEffect(() => { writePersistedFilter('maintenance', 'category', categoryFilter); }, [categoryFilter]);
  const [categorySearch, setCategorySearch] = useState('');
  const [workshopSearch, setWorkshopSearch] = useState('');

  // Paginação
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, clampToTotalPages } = usePagePagination('maintenances');
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false,
  });
  const [statusCounts, setStatusCounts] = useState({
    scheduled: 0, in_progress: 0, completed: 0, cancelled: 0,
  });
  const [analyticsMaintenances, setAnalyticsMaintenances] = useState<any[]>([]);
  const { settings: viewSettings } = usePageViewSettings();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen]         = useState(false);
  const [isDeleting, setIsDeleting]                     = useState(false);
  const [editDialogOpen, setEditDialogOpen]             = useState(false); // NOVO
  const [categoryDeleteDialogOpen, setCategoryDeleteDialogOpen] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory]     = useState(false);
  const [workshopDeleteDialogOpen, setWorkshopDeleteDialogOpen] = useState(false);
  const [isDeletingWorkshop, setIsDeletingWorkshop]     = useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [editWorkshopDialogOpen, setEditWorkshopDialogOpen] = useState(false);
  const [startDialogOpen, setStartDialogOpen]           = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen]     = useState(false);
  const [alertThreshold, setAlertThreshold]             = useState(10000);
  const [alertEnabled, setAlertEnabled]                 = useState(true);
  const [alertBannerDismissed, setAlertBannerDismissed] = useState(false);

  const isInitialSearchRef = useRef(true);
  useEffect(() => {
    if (isInitialSearchRef.current) {
      isInitialSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadMaintenances();
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, typeFilter, categoryFilter]);

  useEffect(() => {
    loadCategories();
    loadWorkshops();
    loadAlertSettings();
    window.addEventListener('action-completed', handleActionCompleted);
    return () => window.removeEventListener('action-completed', handleActionCompleted);
  }, []);

  async function loadAlertSettings() {
    try {
      const settings = await getSystemSettings();
      setAlertEnabled(settings.alert_maintenance_enabled);
      setAlertThreshold(settings.alert_mileage_threshold);
    } catch {
      // usa defaults
    }
  }

  const handleActionCompleted = useCallback((event: any) => {
    const { handler, result } = event.detail;
    if (handler === RESTORE_MAINTENANCE_CATEGORY && result) updateCategory(result);
  }, [updateCategory]);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || typeFilter !== 'all' || categoryFilter !== 'all';
  function resetFilters() {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
  }

  // silent — ver o mesmo comentário em VehiclesPageContent.tsx: uma
  // actualização em segundo plano nunca deve mostrar o spinner de "a carregar".
  const loadMaintenances = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const filterParams = {
      search:      debouncedSearch,
      status:      statusFilter   === 'all' ? undefined : statusFilter,
      type:        typeFilter     === 'all' ? undefined : typeFilter,
      category_id: categoryFilter === 'all' ? undefined : categoryFilter,
    };
    try {
      const [result, analytics] = await Promise.all([
        getAllMaintenancesHelper({ ...filterParams, page: currentPage, limit: itemsPerPage }),
        getAllMaintenancesHelper({ ...filterParams, limit: 9999 }),
      ]);
      setMaintenances(result.data);
      setAnalyticsMaintenances(analytics.data);
      setPaginationInfo(result.pagination);
      clampToTotalPages(result.pagination.totalPages);
      if (result.statusCounts) setStatusCounts(result.statusCounts as typeof statusCounts);
    } catch (error) {
      handleError(error, 'maintenances:errors.errorLoading');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, typeFilter, categoryFilter]);

  // Achado 2026-09-0X: ver o mesmo comentário em VehiclesPageContent.tsx —
  // uma sync do PowerSync em segundo plano nunca chegava a esta página sozinha.
  usePowerSyncDataChanged(['maintenance'], () => loadMaintenances(true));
  usePowerSyncDataChanged(['maintenance_categories'], () => loadCategories(true));
  usePowerSyncDataChanged(['workshops'], () => loadWorkshops(true));

  async function loadCategories(silent = false) {
    if (!silent) setCategoriesLoading(true);
    try { const data = await getAllCategoriesHelper(); setCategories(data); }
    catch (error) { handleError(error, 'maintenances:errors.errorLoadingCategories'); }
    finally { if (!silent) setCategoriesLoading(false); }
  }

  async function loadWorkshops(silent = false) {
    if (!silent) setWorkshopsLoading(true);
    try { const data = await getAllWorkshops(); setWorkshops(data); }
    catch (error) { handleError(error, 'common:errors.loadingData'); }
    finally { if (!silent) setWorkshopsLoading(false); }
  }

  async function handleDeleteMaintenance() {
    if (!selectedMaintenance) return;
    setIsDeleting(true);
    try {
      await deleteMaintenanceHelper(selectedMaintenance.id);
      removeMaintenanceFromContext(selectedMaintenance.id);
      showSuccess('maintenances:toast.deleteSuccess');
      setDeleteDialogOpen(false);
      selectMaintenance(null);
      loadMaintenances();
    } catch (error) { handleError(error, 'maintenances:toast.deleteError'); }
    finally { setIsDeleting(false); }
  }

  async function handleDeleteCategory() {
    if (!selectedCategory) return;
    setIsDeletingCategory(true);
    try {
      await deleteCategoryHelper(selectedCategory.id);
      removeCategoryFromContext(selectedCategory.id);
      showSuccess('maintenances:toast.categoryDeleteSuccess');
      setCategoryDeleteDialogOpen(false);
      selectCategory(null);
    } catch (error) { handleError(error, 'maintenances:toast.categoryDeleteError'); }
    finally { setIsDeletingCategory(false); }
  }

  async function handleDeleteWorkshop() {
    if (!selectedWorkshop) return;
    setIsDeletingWorkshop(true);
    try {
      await deleteWorkshopHelper(selectedWorkshop.id);
      removeWorkshopFromContext(selectedWorkshop.id);
      showSuccess('maintenances:workshops.toast.deleteSuccess');
      setWorkshopDeleteDialogOpen(false);
      selectWorkshop(null);
    } catch (error) { handleError(error, 'maintenances:workshops.toast.deleteError'); }
    finally { setIsDeletingWorkshop(false); }
  }

  const upcomingAlerts = useMemo(() => {
    if (!alertEnabled) return [];
    return maintenances.filter(m => {
      if (!m.next_maintenance_km) return false;
      const currentKm = (m as any).vehicle_current_mileage ?? 0;
      return currentKm >= m.next_maintenance_km - alertThreshold;
    });
  }, [maintenances, alertEnabled, alertThreshold]);

  const filteredCategories = categories.filter(c => c.name?.toLowerCase().includes(categorySearch.toLowerCase()));
  const filteredWorkshops  = workshops.filter(w =>
    w.name?.toLowerCase().includes(workshopSearch.toLowerCase()) ||
    w.city?.toLowerCase().includes(workshopSearch.toLowerCase())
  );

  const preventiveCount = categories.filter(c => c.type === 'preventive').length;
  const correctiveCount = categories.filter(c => c.type === 'corrective').length;
  const activeWorkshops = workshops.filter(w => w.is_active).length;

  function getPriorityBadge(priority: string) {
    const map = {
      low:    { label: t('maintenances:priority.low.label'),    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400'   },
      normal: { label: t('maintenances:priority.normal.label'), className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'       },
      high:   { label: t('maintenances:priority.high.label'),   className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400' },
      urgent: { label: t('maintenances:priority.urgent.label'), className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400'             },
    };
    const p = map[priority as keyof typeof map] || map.normal;
    return <Badge variant="outline" className={cn('rounded-full text-[10px] font-bold px-2.5 py-0.5', p.className)}>{p.label}</Badge>;
  }

  function getStatusBadge(status: string) {
    const map = {
      scheduled:   { label: t('maintenances:status.scheduled.label'),   icon: Clock,     className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400'           },
      in_progress: { label: t('maintenances:status.in_progress.label'), icon: Settings,  className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'           },
      completed:   { label: t('maintenances:status.completed.label'),   icon: Flag,      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' },
      cancelled:   { label: t('maintenances:status.cancelled.label'),   icon: AlertCircle, className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400'         },
    };
    const s = map[status as keyof typeof map] || map.scheduled;
    const Icon = s.icon;
    return (
      <Badge variant="outline" className={cn('flex items-center gap-1.5 font-bold rounded-full text-[10px] px-2.5 py-0.5', s.className)}>
        <Icon className="w-3.5 h-3.5" />{s.label}
      </Badge>
    );
  }

  const viewModes = [
    { mode: 'compact', icon: Rows,       label: t('common:viewModes.compact') },
    { mode: 'normal',  icon: List,       label: t('common:viewModes.normal')  },
    { mode: 'cards',   icon: LayoutGrid, label: t('common:viewModes.cards')   },
  ] as const;

  // ---------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------

  function renderCompactView() {
    return (
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-muted/50 px-6 py-4 grid grid-cols-12 gap-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-b">
          <div className="col-span-3">{t('maintenances:fields.vehicle')}</div>
          <div className="col-span-3">{t('maintenances:fields.category')}</div>
          <div className="col-span-2">{t('maintenances:fields.status')}</div>
          <div className="col-span-2">{t('maintenances:fields.totalCost')}</div>
          <div className="col-span-2 text-right">{t('common:actions.actions')}</div>
        </div>
        <div className="divide-y">
          {maintenances.map((m) => (
            <div key={m.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-muted/40 transition-colors duration-150">
              <div className="col-span-3">
                <span className="font-mono font-bold text-sm">{m.vehicle_license}</span>
                <p className="text-xs text-muted-foreground">{m.vehicle_brand} {m.vehicle_model}</p>
              </div>
              <div className="col-span-3"><span className="text-sm font-medium truncate block">{m.category_name}</span></div>
              <div className="col-span-2">{getStatusBadge(m.status)}</div>
              <div className="col-span-2"><span className="text-sm font-bold">{m.total_cost.toLocaleString('pt-PT')} Kz</span></div>
              {/* ATUALIZADO: Adicionado botão de editar e dropdown menu */}
              <div className="col-span-2 flex gap-1 justify-end items-center">
                {m.status === maintenanceStatus.SCHEDULED && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); selectMaintenance(m); }} title={t('maintenances:actions.start')}><Play className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); selectMaintenance(m); }} title={t('maintenances:actions.complete')}><CheckCircle2 className="w-4 h-4" /></Button>
                  </>
                )}
                {m.status === maintenanceStatus.IN_PROGRESS && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); selectMaintenance(m); }}><CheckCircle2 className="w-4 h-4" /></Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { selectMaintenance(m); }}>
                      <Eye className="w-4 h-4 mr-2" />
                      {t('common:actions.view')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { selectMaintenance(m); setEditDialogOpen(true); }}>
                      <Edit className="w-4 h-4 mr-2" />
                      {t('common:actions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => { selectMaintenance(m); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('common:actions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderNormalView() {
    return (
      <div className="grid gap-4">
        {maintenances.map((maintenance) => (
          <Card key={maintenance.id} className="overflow-hidden border-l-4 group hover:shadow-md transition-all duration-200 bg-card cursor-pointer"
            style={{ borderLeftColor: maintenance.type === 'preventive' ? '#3b82f6' : '#f97316' }}
            onClick={() => selectMaintenance(maintenance)}>
            <CardContent className="p-0">
              <div className="flex items-center p-5 gap-5">
                <div className={cn('hidden sm:flex h-12 w-12 items-center justify-center rounded-xl transition-colors', maintenance.type === 'preventive' ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-200' : 'bg-orange-100 text-orange-600 group-hover:bg-orange-200')}>
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg tracking-tight">{maintenance.category_name}</h3>
                    {getStatusBadge(maintenance.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-mono font-bold text-foreground/80">{maintenance.vehicle_license}</span>
                    <span>{maintenance.vehicle_brand} {maintenance.vehicle_model}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{new Date(maintenance.entry_date).toLocaleDateString('pt-PT')}</span>
                    {maintenance.workshop_name && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" />{maintenance.workshop_name}</span>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={maintenance.type === 'preventive' ? 'default' : 'secondary'} className="text-[10px]">{t(`maintenances:type.${maintenance.type}.label`)}</Badge>
                    {getPriorityBadge(maintenance.priority)}
                  </div>
                </div>
                {/* ATUALIZADO: Adicionado botão de editar e reorganizados os botões de ação */}
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="text-xs text-muted-foreground">{t('maintenances:fields.totalCost')}</p>
                    <p className="text-xl font-bold text-primary">{maintenance.total_cost.toLocaleString('pt-PT')} Kz</p>
                  </div>
                  {maintenance.status === maintenanceStatus.SCHEDULED && (
                    <>
                      <Button variant="outline" size="sm" className="h-9 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); selectMaintenance(maintenance); }}><Play className="w-4 h-4 mr-1.5" />{t('maintenances:actions.start')}</Button>
                      <Button variant="outline" size="sm" className="h-9 text-green-600 border-green-200 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); selectMaintenance(maintenance); }}><CheckCircle2 className="w-4 h-4 mr-1.5" />{t('maintenances:actions.complete')}</Button>
                    </>
                  )}
                  {maintenance.status === maintenanceStatus.IN_PROGRESS && (
                    <Button variant="outline" size="sm" className="h-9 text-green-600 border-green-200 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); selectMaintenance(maintenance); }}><CheckCircle2 className="w-4 h-4 mr-1.5" />{t('maintenances:actions.complete')}</Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-10 w-10">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => selectMaintenance(maintenance)}>
                        <Eye className="w-4 h-4 mr-2" />
                        {t('common:actions.view')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { selectMaintenance(maintenance); setEditDialogOpen(true); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        {t('common:actions.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => { selectMaintenance(maintenance); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('common:actions.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  function renderCardsView() {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {maintenances.map((maintenance) => (
          <Card key={maintenance.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-muted/60">
            <CardHeader className="pb-3 pt-5 px-5 cursor-pointer" onClick={() => selectMaintenance(maintenance)}>
              <div className="flex justify-between items-start mb-3">
                <div className={cn('p-2.5 rounded-xl transition-colors', maintenance.type === 'preventive' ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white')}>
                  <Wrench className="w-5 h-5" />
                </div>
                {getStatusBadge(maintenance.status)}
              </div>
              <CardTitle className="text-lg font-bold leading-tight line-clamp-2" title={maintenance.category_name}>{maintenance.category_name}</CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="font-mono">{maintenance.vehicle_license}</span><span>•</span><span>{maintenance.vehicle_brand} {maintenance.vehicle_model}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 p-5 pt-0">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 border border-muted/50">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('maintenances:fields.entryDate')}</p>
                  <p className="text-sm font-bold">{new Date(maintenance.entry_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</p>
                </div>
                <div className="h-8 w-px bg-muted-foreground/10" />
                <div className="text-right space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('maintenances:fields.type')}</p>
                  <p className="text-sm font-bold">{t(`maintenances:type.${maintenance.type}.short`)}</p>
                </div>
              </div>
              <div className="space-y-2">
                {maintenance.workshop_name && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="w-4 h-4 shrink-0" /><span className="truncate">{maintenance.workshop_name}</span></div>}
                <div className="flex items-center gap-2">{getPriorityBadge(maintenance.priority)}</div>
              </div>
              {/* ATUALIZADO: Adicionado botão de editar nos cards */}
              <div className="mt-auto pt-4 border-t border-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">{t('maintenances:fields.totalCost')}</span>
                  <span className="text-xl font-black text-primary">{maintenance.total_cost.toLocaleString('pt-PT')} <span className="text-sm font-bold">Kz</span></span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {maintenance.status === maintenanceStatus.SCHEDULED && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); selectMaintenance(maintenance); }}><Play className="w-3.5 h-3.5 mr-1.5" />{t('maintenances:actions.start')}</Button>
                      <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold text-green-600 border-green-200 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); selectMaintenance(maintenance); }}><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />{t('maintenances:actions.complete')}</Button>
                    </>
                  )}
                  {maintenance.status === maintenanceStatus.IN_PROGRESS && (
                    <Button variant="default" size="sm" className="flex-1 h-9 text-xs font-bold bg-green-600 hover:bg-green-700" onClick={(e) => { e.stopPropagation(); selectMaintenance(maintenance); }}><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />{t('maintenances:actions.complete')}</Button>
                  )}
                  <Button variant="outline" size="sm" className="h-9 px-2" onClick={(e) => { e.stopPropagation(); selectMaintenance(maintenance); setEditDialogOpen(true); }} title={t('common:actions.edit')}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-9 px-2 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); selectMaintenance(maintenance); setDeleteDialogOpen(true); }} title={t('common:actions.delete')}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
              <h1 className="text-2xl font-extrabold tracking-tight">{t('maintenances:title')}</h1>
              <p className="text-muted-foreground text-sm">
                {activeTab === 'maintenances'
                  ? t('maintenances:info.inProgressCount', { count: statusCounts.in_progress })
                  : activeTab === 'categories'
                  ? `${categories.length} ${t('maintenances:categories.title').toLowerCase()}`
                  : t('maintenances:workshops.info.activeCount', { count: activeWorkshops, plural: activeWorkshops !== 1 ? 's' : '' })}
              </p>
            </div>
            <TabsList className="flex h-9 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 mx-auto">
              <TabsTrigger value="maintenances" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                <Wrench className="w-4 h-4" />{t('maintenances:tabs.maintenances')}
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                <Tag className="w-4 h-4" />{t('maintenances:tabs.categories')}
              </TabsTrigger>
              <TabsTrigger value="workshops" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />{t('maintenances:tabs.workshops')}
              </TabsTrigger>
            </TabsList>
            <NewMaintenanceDialog onSuccess={loadMaintenances} />
          </div>

          {/* ---- TAB: MANUTENÇÕES ---- */}
          <TabsContent value="maintenances" className="space-y-6 mt-0 outline-none">

            {/* Stats vindas do back */}
            <TooltipProvider delayDuration={300}>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: t('maintenances:stats.total'),      value: paginationInfo.total,     icon: Wrench,   color: 'text-slate-600',   bg: 'bg-slate-100/60'  },
                { label: t('maintenances:stats.scheduled'),  value: statusCounts.scheduled,   icon: Clock,    color: 'text-blue-600',    bg: 'bg-blue-50/60'    },
                { label: t('maintenances:stats.inProgress'), value: statusCounts.in_progress, icon: Settings, color: 'text-orange-600',  bg: 'bg-orange-50/60'  },
                { label: t('maintenances:stats.completed'),  value: statusCounts.completed,   icon: Flag,     color: 'text-emerald-600', bg: 'bg-emerald-50/60' },
              ].map((stat, i) => (
                <UITooltip key={i}>
                  <TooltipTrigger asChild>
                    <Card className="border-none shadow-sm bg-card overflow-hidden cursor-default">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={cn('p-2.5 rounded-xl shrink-0', stat.bg, stat.color)}>
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

            {/* ---- Banner de alertas preventivos ---- */}
            {upcomingAlerts.length > 0 && !alertBannerDismissed && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-800/50 dark:bg-amber-950/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                      <Gauge className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                        {upcomingAlerts.length === 1
                          ? t('maintenances:alerts.upcomingOne')
                          : t('maintenances:alerts.upcomingMany', { count: upcomingAlerts.length })}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {upcomingAlerts.map(m => {
                          const currentKm = (m as any).vehicle_current_mileage ?? 0;
                          const remaining = m.next_maintenance_km! - currentKm;
                          return (
                            <div key={m.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                              <span className="font-mono font-bold">{(m as any).vehicle_license}</span>
                              <span className="text-amber-400">•</span>
                              <span>{(m as any).vehicle_brand} {(m as any).vehicle_model}</span>
                              <span className="text-amber-400">—</span>
                              {remaining <= 0
                                ? <span className="font-bold text-red-600 dark:text-red-400">{t('maintenances:alerts.overdue')}</span>
                                : <span>{t('maintenances:alerts.remainingKm', { km: remaining.toLocaleString('pt-PT') })}</span>
                              }
                              <span className="text-amber-400/70">({t('maintenances:alerts.nextAt')} {m.next_maintenance_km!.toLocaleString('pt-PT')} km)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setAlertBannerDismissed(true)}
                    className="shrink-0 p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-500 transition-colors"
                    aria-label={t('common:actions.dismiss')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Análises horizontal (acima da lista) */}
            {viewSettings.analyticsLayout !== 'vertical' && viewSettings.maintenanceAnalytics && (
              <MaintenanceAnalyticsPanel
                layout="horizontal"
                statusCounts={statusCounts}
                maintenances={analyticsMaintenances}
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
                    <Input placeholder={t('maintenances:searchPlaceholder')} value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1" />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="flex-1 min-w-[140px] max-w-full overflow-hidden h-10 text-sm bg-muted/20 border-none">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder={t('maintenances:filters.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t('maintenances:filters.all')}</span>
                          {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.scheduled + statusCounts.in_progress + statusCounts.completed + statusCounts.cancelled})</span>}
                        </span>
                      </SelectItem>
                      <SelectItem value="scheduled">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t('maintenances:filters.scheduled')}</span>
                          {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.scheduled})</span>}
                        </span>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t('maintenances:filters.in_progress')}</span>
                          {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.in_progress})</span>}
                        </span>
                      </SelectItem>
                      <SelectItem value="completed">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t('maintenances:filters.completed')}</span>
                          {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.completed})</span>}
                        </span>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t('maintenances:filters.cancelled')}</span>
                          {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({statusCounts.cancelled})</span>}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="flex-1 min-w-[140px] max-w-full overflow-hidden h-10 text-sm bg-muted/20 border-none">
                      <SelectValue placeholder={t('maintenances:filters.allTypes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all"><span className="truncate">{t('maintenances:filters.allTypes')}</span></SelectItem>
                      <SelectItem value="preventive"><span className="truncate">{t('maintenances:type.preventive.label')}</span></SelectItem>
                      <SelectItem value="corrective"><span className="truncate">{t('maintenances:type.corrective.label')}</span></SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="flex-1 min-w-[150px] max-w-full overflow-hidden h-10 text-sm bg-muted/20 border-none">
                      <SelectValue placeholder={t('maintenances:filters.allCategories')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all"><span className="truncate">{t('maintenances:filters.allCategories')}</span></SelectItem>
                      {categories.filter(c => c.is_active !== false).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="truncate">{c.name}</span>
                          </span>
                        </SelectItem>
                      ))}
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
                    <Pagination pagination={paginationInfo}
                      onPageChange={(p) => setCurrentPage(p)}
                      onLimitChange={(l) => { setItemsPerPage(l); setCurrentPage(1); }} />
                  )}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p>
              </div>
            ) : maintenances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50">
                <Wrench className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold">{t('maintenances:noMaintenances')}</h3>
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
            {viewSettings.analyticsLayout === 'vertical' && viewSettings.maintenanceAnalytics && (
              <div className="w-[300px] shrink-0 sticky top-4">
                <MaintenanceAnalyticsPanel
                  layout="vertical"
                  statusCounts={statusCounts}
                  maintenances={analyticsMaintenances}
                  totalCount={paginationInfo.total}
                />
              </div>
            )}
            </div>
          </TabsContent>

          {/* ---- TAB: CATEGORIAS ---- */}
          <TabsContent value="categories" className="space-y-6 mt-0 outline-none">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {[
                { label: t('maintenances:stats.total'),           value: categories.length, icon: Tag, color: 'text-blue-600',   bg: 'bg-blue-50/60'   },
                { label: t('maintenances:categories.preventive'), value: preventiveCount,   icon: Tag, color: 'text-green-600',  bg: 'bg-green-50/60'  },
                { label: t('maintenances:categories.corrective'), value: correctiveCount,   icon: Tag, color: 'text-orange-600', bg: 'bg-orange-50/60' },
              ].map((stat, i) => (
                <Card key={i} className="border-none shadow-sm bg-card overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-xl shrink-0', stat.bg, stat.color)}><stat.icon className="w-4 h-4" /></div>
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
                  <Input placeholder={t('common:search')} value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1" />
                </div>
                <div className="sm:ml-auto"><NewMaintenanceCategoryDialog onSuccess={loadCategories} /></div>
              </div>
            </div>
            {isCategoriesLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4"><div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" /><p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p></div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50"><Tag className="w-12 h-12 text-muted-foreground/20 mb-4" /><h3 className="text-lg font-bold">{t('maintenances:categories.noCategories')}</h3></div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-300">
                {filteredCategories.map((category) => (
                  <Card key={category.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-muted/60 cursor-pointer" onClick={() => { selectCategory(category); setEditCategoryDialogOpen(true); }}>
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 rounded-xl transition-colors" style={{ backgroundColor: `${category.color}20` }}><Tag className="w-5 h-5" style={{ color: category.color }} /></div>
                        <Badge variant={category.type === 'preventive' ? 'default' : 'secondary'} className="rounded-full text-[10px] font-bold px-2.5 py-0.5">{t(`maintenances:type.${category.type}.label`)}</Badge>
                      </div>
                      <CardTitle className="text-lg font-bold leading-tight">{category.name}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">{category.description || t('maintenances:categories.noDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3 p-5 pt-0">
                      <div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: category.color }} /><span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{category.color}</span></div>
                      <div className="mt-auto pt-4 border-t border-muted/50 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold bg-background hover:bg-muted" onClick={(e) => { e.stopPropagation(); selectCategory(category); setEditCategoryDialogOpen(true); }}><Edit className="w-3.5 h-3.5 mr-1.5" />{t('common:actions.edit')}</Button>
                        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive bg-background" onClick={(e) => { e.stopPropagation(); selectCategory(category); setCategoryDeleteDialogOpen(true); }}><Trash2 className="w-3.5 h-3.5 mr-1.5" />{t('common:actions.delete')}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---- TAB: OFICINAS ---- */}
          <TabsContent value="workshops" className="space-y-6 mt-0 outline-none">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {[
                { label: t('maintenances:workshops.stats.total'),    value: workshops.length,                icon: Building2, color: 'text-blue-600',    bg: 'bg-blue-50/60'    },
                { label: t('maintenances:workshops.stats.active'),   value: activeWorkshops,                 icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50/60' },
                { label: t('maintenances:workshops.stats.inactive'), value: workshops.length - activeWorkshops, icon: Building2, color: 'text-slate-500',   bg: 'bg-slate-50/60'   },
              ].map((stat, i) => (
                <Card key={i} className="border-none shadow-sm bg-card overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-xl shrink-0', stat.bg, stat.color)}><stat.icon className="w-4 h-4" /></div>
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
                  <Input placeholder={t('common:search')} value={workshopSearch} onChange={(e) => setWorkshopSearch(e.target.value)} className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1" />
                </div>
                <div className="sm:ml-auto"><NewWorkshopDialog onSuccess={loadWorkshops} /></div>
              </div>
            </div>
            {isWorkshopsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4"><div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" /><p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p></div>
            ) : filteredWorkshops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50"><Building2 className="w-12 h-12 text-muted-foreground/20 mb-4" /><h3 className="text-lg font-bold">{t('maintenances:workshops.noWorkshops')}</h3></div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-300">
                {filteredWorkshops.map((workshop) => (
                  <Card key={workshop.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-muted/60 cursor-pointer" onClick={() => { selectWorkshop(workshop); setEditWorkshopDialogOpen(true); }}>
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className={cn('p-2.5 rounded-xl transition-colors', workshop.is_active ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white' : 'bg-muted text-muted-foreground')}><Building2 className="w-5 h-5" /></div>
                        <Badge variant={workshop.is_active ? 'outline' : 'secondary'} className={cn('rounded-full text-[10px] font-bold px-2.5 py-0.5', workshop.is_active ? 'border-green-200 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800' : 'border-slate-200 text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400')}>
                          {workshop.is_active ? t('common:status.active') : t('common:status.inactive')}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold leading-tight truncate" title={workshop.name}>{workshop.name}</CardTitle>
                      {workshop.specialties && <CardDescription className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">{workshop.specialties}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-2 p-5 pt-0">
                      <div className="space-y-2 min-h-[60px]">
                        {workshop.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /><span className="truncate">{workshop.phone}</span></div>}
                        {workshop.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-4 h-4 shrink-0" /><span className="truncate">{workshop.email}</span></div>}
                        {workshop.city  && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4 shrink-0" /><span className="truncate">{workshop.city}</span></div>}
                      </div>
                      <div className="mt-auto pt-4 border-t border-muted/50 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold bg-background hover:bg-muted" onClick={(e) => { e.stopPropagation(); selectWorkshop(workshop); setEditWorkshopDialogOpen(true); }}><Edit className="w-3.5 h-3.5 mr-1.5" />{t('common:actions.edit')}</Button>
                        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive bg-background" onClick={(e) => { e.stopPropagation(); selectWorkshop(workshop); setWorkshopDeleteDialogOpen(true); }}><Trash2 className="w-3.5 h-3.5 mr-1.5" />{t('common:actions.delete')}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <ViewMaintenanceDialog
          open={!!selectedMaintenance}
          onOpenChange={(open) => !open && selectMaintenance(null)}
          onStart={() => setStartDialogOpen(true)}
          onComplete={() => setCompleteDialogOpen(true)}
        />
        <StartMaintenanceDialog open={startDialogOpen} onOpenChange={setStartDialogOpen} onSuccess={loadMaintenances} />
        <CompleteMaintenanceDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen} onSuccess={loadMaintenances} />
        <EditMaintenanceDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={loadMaintenances} />
        <EditWorkshopDialog open={editWorkshopDialogOpen} onOpenChange={setEditWorkshopDialogOpen} />
        <EditMaintenanceCategoryDialog open={editCategoryDialogOpen} onOpenChange={setEditCategoryDialogOpen} category={selectedCategory} />
        <ConfirmDeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDeleteMaintenance} title={t('maintenances:dialogs.delete.title')} description={t('maintenances:dialogs.delete.warning')} itemName={selectedMaintenance ? `${selectedMaintenance.vehicle_license} - ${selectedMaintenance.category_name}` : ''} isLoading={isDeleting} />
        <ConfirmDeleteDialog open={categoryDeleteDialogOpen} onOpenChange={setCategoryDeleteDialogOpen} onConfirm={handleDeleteCategory} title={t('maintenances:dialogs.deleteCategory.title')} description={t('maintenances:dialogs.deleteCategory.warning')} itemName={selectedCategory?.name} isLoading={isDeletingCategory} />
        <ConfirmDeleteDialog open={workshopDeleteDialogOpen} onOpenChange={setWorkshopDeleteDialogOpen} onConfirm={handleDeleteWorkshop} title={t('maintenances:workshops.dialogs.delete.title')} description={t('maintenances:workshops.dialogs.delete.warning')} itemName={selectedWorkshop?.name} isLoading={isDeletingWorkshop} />
      </div>
    </div>
  );
}