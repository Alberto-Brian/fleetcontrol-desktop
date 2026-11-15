// ========================================
// FILE: src/pages/provider/FinesPageContent.tsx
// ========================================
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { readPersistedFilter, writePersistedFilter, readPersistedViewMode, writePersistedViewMode } from '@/lib/filter-persistence';
import { usePageViewSettings } from '@/hooks/usePageViewSettings';
import { usePowerSyncDataChanged } from '@/hooks/usePowerSyncDataChanged';
import {
  AlertCircle, Search, DollarSign, FileText, Calendar, Eye, Edit,
  Trash2, CheckCircle2, Scale, LayoutGrid, List, Rows, MapPin, Filter, MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useFines } from '@/contexts/FinesContext';
import { getAllFines, deleteFine as deleteFineHelper, isOverdue, getDaysOverdue, getDaysUntilDue } from '@/helpers/fine-helpers';

import NewFineDialog from '@/components/fine/NewFineDialog';
import ViewFineDialog from '@/components/fine/ViewFineDialog';
import EditFineDialog from '@/components/fine/EditFineDialog';
import MarkAsPaidDialog from '@/components/fine/MarkAsPaidDialog';
import ContestFineDialog from '@/components/fine/ContestFineDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { PermissionGate } from '@/components/PermissionGate';

type ViewMode = 'compact' | 'normal' | 'cards';

export default function FinesPageContent() {
  const { t } = useTranslation();
  const { handleError, showSuccess } = useErrorHandler();

  const {
    state: { fines, selectedFine, isLoading },
    setFines, selectFine, deleteFine: removeFineFromContext, setLoading,
  } = useFines();

  const { settings: viewSettings } = usePageViewSettings();
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => readPersistedFilter('fines', 'status', 'all'));
  const [viewMode, setViewMode]         = useState<ViewMode>(() => readPersistedViewMode<ViewMode>('fines', 'cards'));
  useEffect(() => { writePersistedViewMode('fines', viewMode); }, [viewMode]);
  useEffect(() => { writePersistedFilter('fines', 'status',   statusFilter); }, [statusFilter]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Paginação
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false,
  });

  // Stats vindas do back
  const [stats, setStats] = useState({
    pending: 0, paid: 0, contested: 0, cancelled: 0,
    totalAmount: 0, pendingAmount: 0,
  });

  // Dialogs
  const [viewDialogOpen, setViewDialogOpen]         = useState(false);
  const [editDialogOpen, setEditDialogOpen]         = useState(false);
  const [markAsPaidDialogOpen, setMarkAsPaidDialogOpen] = useState(false);
  const [contestDialogOpen, setContestDialogOpen]   = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen]     = useState(false);
  const [isDeleting, setIsDeleting]                 = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadFines();
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter]);

  // silent — ver o mesmo comentário em VehiclesPageContent.tsx: uma
  // actualização em segundo plano nunca deve mostrar o spinner de "a carregar".
  const loadFines = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await getAllFines({
        page:   currentPage,
        limit:  itemsPerPage,
        search: debouncedSearch,
        status: statusFilter === 'all' || statusFilter === 'overdue' ? undefined : statusFilter,
      });
      // Filtro overdue é local pois é baseado em due_date
      const data = statusFilter === 'overdue'
        ? result.data.filter((f: any) => isOverdue(f))
        : result.data;

      setFines(data);
      setPaginationInfo(result.pagination);
      if (result.statusCounts) setStats(result.statusCounts as typeof stats);
    } catch (error) {
      handleError(error, 'fines:errors.loading');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter]);

  // Achado 2026-09-0X: ver o mesmo comentário em VehiclesPageContent.tsx —
  // uma sync do PowerSync em segundo plano nunca chegava a esta página sozinha.
  usePowerSyncDataChanged(['fines'], () => loadFines(true));

  async function handleDelete() {
    if (!selectedFine) return;
    setIsDeleting(true);
    try {
      await deleteFineHelper(selectedFine.id);
      removeFineFromContext(selectedFine.id);
      showSuccess('fines:toast.deleteSuccess');
      setDeleteDialogOpen(false);
      selectFine(null);
      loadFines();
    } catch (error) {
      handleError(error, 'fines:toast.deleteError');
    } finally {
      setIsDeleting(false);
    }
  }

  function getStatusBadge(status: string) {
    const map = {
      pending:   { label: t('fines:status.pending.label'),   className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400'           },
      paid:      { label: t('fines:status.paid.label'),      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' },
      contested: { label: t('fines:status.contested.label'), className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'     },
      cancelled: { label: t('fines:status.cancelled.label'), className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400'       },
    };
    const s = map[status as keyof typeof map] || map.pending;
    return <Badge variant="outline" className={cn('rounded-full text-[10px] font-bold px-2.5 py-0.5', s.className)}>{s.label}</Badge>;
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
          <div className="col-span-2">{t('fines:fields.fineNumber')}</div>
          <div className="col-span-2">{t('fines:fields.vehicle')}</div>
          <div className="col-span-3">{t('fines:fields.infractionType')}</div>
          <div className="col-span-2">{t('fines:fields.status')}</div>
          <div className="col-span-2">{t('fines:fields.fineAmount')}</div>
          <div className="col-span-1 text-right">{t('common:actions.actions')}</div>
        </div>
        <div className="divide-y">
          {fines.map((fine) => (
            <div key={fine.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-muted/40 transition-colors">
              <div className="col-span-2"><span className="font-mono font-bold text-sm">{fine.fine_number}</span></div>
              <div className="col-span-2"><span className="font-mono text-sm">{fine.vehicle_license}</span></div>
              <div className="col-span-3"><span className="text-sm truncate block">{fine.infraction_type}</span></div>
              <div className="col-span-2">{getStatusBadge(fine.status)}</div>
              <div className="col-span-2"><span className="text-sm font-bold">{fine.fine_amount.toLocaleString('pt-PT')} Kz</span></div>
              <div className="col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => { selectFine(fine); setViewDialogOpen(true); }}>
                      <Eye className="w-4 h-4 mr-2" />{t('fines:actions.view')}
                    </DropdownMenuItem>
                    {fine.status === 'pending' && (
                      <>
                        <PermissionGate permission="fine:update" fullWidth><DropdownMenuItem className="text-emerald-600 focus:text-emerald-600" onClick={() => { selectFine(fine); setMarkAsPaidDialogOpen(true); }}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />{t('fines:actions.markAsPaid')}
                        </DropdownMenuItem></PermissionGate>
                        <PermissionGate permission="fine:update" fullWidth><DropdownMenuItem onClick={() => { selectFine(fine); setEditDialogOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" />{t('fines:actions.edit')}
                        </DropdownMenuItem></PermissionGate>
                      </>
                    )}
                    <PermissionGate permission="fine:delete" fullWidth><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { selectFine(fine); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-4 h-4 mr-2" />{t('fines:actions.delete')}
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

  function renderNormalView() {
    return (
      <div className="grid gap-4">
        {fines.map((fine) => (
          <Card key={fine.id} className="overflow-hidden border-l-4 group hover:shadow-md transition-all cursor-pointer"
            style={{ borderLeftColor: fine.status === 'pending' ? '#ef4444' : '#94a3b8' }}
            onClick={() => { selectFine(fine); setViewDialogOpen(true); }}>
            <CardContent className="p-0">
              <div className="flex items-center p-5 gap-5">
                <div className={cn('hidden sm:flex h-12 w-12 items-center justify-center rounded-xl', fine.status === 'pending' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600')}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg">{fine.infraction_type}</h3>
                    {getStatusBadge(fine.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-mono font-bold text-foreground/80">{fine.fine_number}</span>
                    <span className="font-mono">{fine.vehicle_license}</span>
                    {fine.driver_name && <span>{fine.driver_name}</span>}
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{new Date(fine.fine_date).toLocaleDateString('pt-PT')}</span>
                    {fine.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{fine.location}</span>}
                  </div>
                  {isOverdue(fine) && (
                    <div className="mt-2">
                      <Badge variant="destructive" className="text-[10px]">{t('fines:alerts.overdue', { days: getDaysOverdue(fine.due_date!) })}</Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="text-xs text-muted-foreground">{t('fines:fields.fineAmount')}</p>
                    <p className="text-xl font-bold text-red-600">{fine.fine_amount.toLocaleString('pt-PT')} Kz</p>
                  </div>
                  {fine.status === 'pending' && (
                    <>
                      <PermissionGate permission="fine:update"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); selectFine(fine); setMarkAsPaidDialogOpen(true); }}><CheckCircle2 className="w-5 h-5 text-green-600" /></Button></PermissionGate>
                      <PermissionGate permission="fine:update"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); selectFine(fine); setEditDialogOpen(true); }}><Edit className="w-5 h-5" /></Button></PermissionGate>
                    </>
                  )}
                  <PermissionGate permission="fine:delete"><Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); selectFine(fine); setDeleteDialogOpen(true); }}><Trash2 className="w-5 h-5" /></Button></PermissionGate>
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
        {fines.map((fine) => (
          <Card key={fine.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-muted/60">
            <div className="p-5 pb-3">
              <div className="flex justify-between items-start mb-3">
                <div className={cn('p-2.5 rounded-xl transition-colors', fine.status === 'pending' ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-slate-100 text-slate-600')}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                {getStatusBadge(fine.status)}
              </div>
              <h3 className="text-lg font-bold leading-tight line-clamp-2 mb-2">{fine.infraction_type}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <span className="font-mono font-bold">{fine.fine_number}</span>
                <span>•</span>
                <span className="font-mono">{fine.vehicle_license}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/50 border mb-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Data</p>
                  <p className="text-sm font-bold">{new Date(fine.fine_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</p>
                </div>
                {fine.points && fine.points > 0 && (
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pontos</p>
                    <p className="text-sm font-bold">{fine.points}</p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Valor</p>
                  <p className="text-sm font-bold">{(fine.fine_amount / 1000).toFixed(0)}K</p>
                </div>
              </div>
              {isOverdue(fine) && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-2 text-xs font-semibold flex items-center gap-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('fines:alerts.overdue', { days: getDaysOverdue(fine.due_date!) })}
                </div>
              )}
              {fine.due_date && !isOverdue(fine) && fine.status === 'pending' && getDaysUntilDue(fine.due_date) <= 7 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-lg p-2 text-xs font-semibold flex items-center gap-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('fines:alerts.dueSoon', { days: getDaysUntilDue(fine.due_date) })}
                </div>
              )}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">{t('fines:fields.fineAmount')}</span>
                  <span className="text-xl font-black text-red-600">{fine.fine_amount.toLocaleString('pt-PT')} <span className="text-sm">Kz</span></span>
                </div>
                <div className="flex gap-2">
                  {fine.status === 'pending' && (
                    <>
                      <PermissionGate permission="fine:update"><Button size="sm" className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-xs font-bold" onClick={() => { selectFine(fine); setMarkAsPaidDialogOpen(true); }}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{t('fines:actions.pay')}
                      </Button></PermissionGate>
                      <PermissionGate permission="fine:update"><Button size="sm" variant="outline" className="flex-1 h-9 text-xs font-bold" onClick={() => { selectFine(fine); setContestDialogOpen(true); }}>
                        <Scale className="w-3.5 h-3.5 mr-1" />{t('fines:actions.contest')}
                      </Button></PermissionGate>
                    </>
                  )}
                  {fine.status !== 'pending' && (
                    <Button size="sm" className="flex-1 h-9 text-xs font-bold" onClick={() => { selectFine(fine); setViewDialogOpen(true); }}>
                      <Eye className="w-3.5 h-3.5 mr-1" />{t('fines:actions.view')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-transparent -m-6 p-6">
      <div className="max-w-[1500px] mx-auto space-y-8 pb-10">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{t('fines:title')}</h1>
            <p className="text-muted-foreground text-base">
              {stats.pending} {t('fines:stats.pending').toLowerCase()} • {paginationInfo.total} {t('fines:stats.total').toLowerCase()}
            </p>
          </div>
          <NewFineDialog onSuccess={loadFines} />
        </div>

        {/* Stats — vindas do back */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t('fines:stats.total'),   value: `${Number(stats.totalAmount).toLocaleString('pt-PT')} Kz`, icon: DollarSign,  color: 'text-red-600',     bg: 'bg-red-50/60'     },
            { label: t('fines:stats.pending'), value: stats.pending,                                              icon: AlertCircle,  color: 'text-orange-600',  bg: 'bg-orange-50/60'  },
            { label: t('fines:stats.paid'),    value: stats.paid,                                                 icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/60' },
            { label: t('fines:stats.overdue'), value: fines.filter(f => isOverdue(f)).length,                     icon: FileText,     color: 'text-red-600',     bg: 'bg-red-50/60'     },
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

        {/* Toolbar */}
        <div className="bg-card rounded-2xl border border-muted/50 shadow-sm overflow-hidden">
          <div className="flex flex-wrap gap-3 items-center p-3">
            <div className="flex flex-wrap gap-3 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t('fines:searchPlaceholder')} value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="flex-1 min-w-[140px] max-w-full overflow-hidden h-10 text-sm bg-muted/20 border-none">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder={t('fines:filters.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{t('fines:filters.all')}</span>
                      {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({stats.pending + stats.paid + stats.contested + stats.cancelled})</span>}
                    </span>
                  </SelectItem>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{t('fines:filters.pending')}</span>
                      {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({stats.pending})</span>}
                    </span>
                  </SelectItem>
                  <SelectItem value="paid">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{t('fines:filters.paid')}</span>
                      {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({stats.paid})</span>}
                    </span>
                  </SelectItem>
                  <SelectItem value="contested">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{t('fines:filters.contested')}</span>
                      {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({stats.contested})</span>}
                    </span>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{t('fines:filters.overdue')}</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex bg-muted/30 p-1 rounded-xl border border-muted/50 self-center sm:self-auto shrink-0">
              {viewModes.map((item) => (
                <Button key={item.mode} variant={viewMode === item.mode ? 'secondary' : 'ghost'} size="sm"
                  onClick={() => setViewMode(item.mode as ViewMode)}
                  className={cn('h-8 px-3 rounded-lg transition-all flex items-center gap-2', viewMode === item.mode ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground')}>
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>
          {paginationInfo.total > 0 && (
            <div className="border-t border-muted/40 px-3 py-2 flex justify-end">
              <Pagination pagination={paginationInfo}
                onPageChange={(p) => setCurrentPage(p)}
                onLimitChange={(l) => { setItemsPerPage(l); setCurrentPage(1); }} />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p>
          </div>
        ) : fines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50">
            <AlertCircle className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-bold">{t('fines:noFines')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{searchTerm ? t('common:noResults') : t('common:noData')}</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {viewMode === 'compact' && renderCompactView()}
            {viewMode === 'normal'  && renderNormalView()}
            {viewMode === 'cards'   && renderCardsView()}
          </div>
        )}

        <ViewFineDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}
          onEdit={() => { setViewDialogOpen(false); setEditDialogOpen(true); }}
          onMarkAsPaid={() => { setViewDialogOpen(false); setMarkAsPaidDialogOpen(true); }}
          onContest={() => { setViewDialogOpen(false); setContestDialogOpen(true); }} />
        <EditFineDialog    open={editDialogOpen}       onOpenChange={setEditDialogOpen}       onSuccess={loadFines} />
        <MarkAsPaidDialog  open={markAsPaidDialogOpen} onOpenChange={setMarkAsPaidDialogOpen} onSuccess={loadFines} />
        <ContestFineDialog open={contestDialogOpen}    onOpenChange={setContestDialogOpen}    onSuccess={loadFines} />
        <ConfirmDeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          title={t('fines:dialogs.delete.title')}
          description={t('fines:dialogs.delete.warning')}
          itemName={selectedFine ? `${selectedFine.fine_number} - ${selectedFine.vehicle_license}` : ''}
          isLoading={isDeleting} />
      </div>
    </div>
  );
}