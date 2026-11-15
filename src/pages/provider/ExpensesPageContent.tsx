// ========================================
// FILE: src/components/expense/ExpensesPageContent.tsx (ATUALIZADO COMPLETO)
// ========================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useExpenses } from '@/contexts/ExpensesContext';
import { getAllExpenses, deleteExpense as deleteExpenseHelper } from '@/helpers/expense-helpers';
import { getAllExpenseCategories, deleteExpenseCategory } from '@/helpers/expense-category-helpers';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import {
  DollarSign, TrendingUp, AlertCircle, Calendar, Tag, Eye, Edit,
  Trash2, CheckCircle2, Search, LayoutGrid, List, Rows, Filter,
  MoreHorizontal, X, RotateCcw
} from 'lucide-react';
import { RESTORE_EXPENSE_CATEGORY } from '@/helpers/ipc/db/expense_categories/expense-categories-channels';
import { cn } from '@/lib/utils';
import { readPersistedFilter, writePersistedFilter, readPersistedViewMode, writePersistedViewMode } from '@/lib/filter-persistence';
import { usePageViewSettings } from '@/hooks/usePageViewSettings';
import { usePagePagination } from '@/hooks/usePagePagination';
import { usePowerSyncDataChanged } from '@/hooks/usePowerSyncDataChanged';
import { ExpensesAnalyticsPanel } from '@/components/analytics/ExpensesAnalyticsPanel';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, closeDropdownsAndOpenDialog,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import NewExpenseDialog from '@/components/expense/NewExpenseDialog';
import EditExpenseDialog from '@/components/expense/EditExpenseDialog';
import ViewExpenseDialog from '@/components/expense/ViewExpenseDialog';
import MarkAsPaidDialog from '@/components/expense/MarkAsPaidDialog';
import NewExpenseCategoryDialog from '@/components/expense/NewExpenseCategoryDialog';
import EditExpenseCategoryDialog from '@/components/expense/EditExpenseCategoryDialog';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

export default function ExpensesPageContent() {
  const { t } = useTranslation();
  const { handleError, showSuccess } = useErrorHandler();
  const canEditExpenseCategory = usePermission('category:update');

  const {
    state: { expenses, categories, isLoading, isCategoriesLoading, selectedExpense, selectedCategory },
    setExpenses, setCategories, selectExpense, selectCategory,
    deleteExpense: removeExpenseFromContext,
    deleteCategory: removeCategoryFromContext,
    setLoading, setCategoriesLoading, updateCategory,
  } = useExpenses();

  const [activeTab, setActiveTab] = useState('expenses');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter,   setStatusFilter]   = useState<string>(() => readPersistedFilter('expenses', 'status',   'all'));
  const [categoryFilter, setCategoryFilter] = useState<string>(() => readPersistedFilter('expenses', 'category', 'all'));
  const [viewMode, setViewMode] = useState<ViewMode>(() => readPersistedViewMode<ViewMode>('expenses', 'cards'));
  useEffect(() => { writePersistedViewMode('expenses', viewMode); }, [viewMode]);
  useEffect(() => { writePersistedFilter('expenses', 'status',    statusFilter);   }, [statusFilter]);
  useEffect(() => { writePersistedFilter('expenses', 'category',  categoryFilter); }, [categoryFilter]);

  const { settings: viewSettings } = usePageViewSettings();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Paginação
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, clampToTotalPages } = usePagePagination('expenses');
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false,
  });

  // Stats vindas do back
  const [stats, setStats] = useState({
    totalAmount: 0, paidAmount: 0, pendingAmount: 0,
    pending: 0, paid: 0, cancelled: 0,
  });
  const [analyticsExpenses, setAnalyticsExpenses] = useState<any[]>([]);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || categoryFilter !== 'all';
  function resetFilters() {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
  }

  // Dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [markAsPaidDialogOpen, setMarkAsPaidDialogOpen] = useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  
  // NOVO: Dialogs de confirmação de exclusão
  const [deleteExpenseDialogOpen, setDeleteExpenseDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

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
    loadExpenses();
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => {
    loadCategories();
    window.addEventListener('action-completed', handleCategoryRestored);
    return () => window.removeEventListener('action-completed', handleCategoryRestored);
  }, []);

  const handleCategoryRestored = useCallback((event: any) => {
    const { handler, result } = event.detail;
    if (handler === RESTORE_EXPENSE_CATEGORY && result) updateCategory(result);
  }, [updateCategory]);

  // silent — ver o mesmo comentário em VehiclesPageContent.tsx: uma
  // actualização em segundo plano nunca deve mostrar o spinner de "a carregar".
  const loadExpenses = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const filterParams = {
      search:      debouncedSearch,
      status:      statusFilter   === 'all' ? undefined : statusFilter,
      category_id: categoryFilter === 'all' ? undefined : categoryFilter,
    };
    try {
      const [result, analytics] = await Promise.all([
        getAllExpenses({ ...filterParams, page: currentPage, limit: itemsPerPage }),
        getAllExpenses({ ...filterParams, limit: 9999 }),
      ]);
      setExpenses(result.data);
      setAnalyticsExpenses(analytics.data);
      setPaginationInfo(result.pagination);
      clampToTotalPages(result.pagination.totalPages);
      if (result.statusCounts) setStats(result.statusCounts as typeof stats);
    } catch (error) {
      handleError(error, 'expenses:errors.errorLoading');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, categoryFilter]);

  // Achado 2026-09-0X: ver o mesmo comentário em VehiclesPageContent.tsx —
  // uma sync do PowerSync em segundo plano nunca chegava a esta página sozinha.
  usePowerSyncDataChanged(['expenses'], () => loadExpenses(true));
  usePowerSyncDataChanged(['categories'], () => loadCategories(true));

  async function loadCategories(silent = false) {
    if (!silent) setCategoriesLoading(true);
    try {
      const data = await getAllExpenseCategories();
      setCategories(data);
    } catch (error) {
      handleError(error, 'expenses:errors.errorLoadingCategories');
    } finally {
      if (!silent) setCategoriesLoading(false);
    }
  }

  // Overdue helpers
  function isOverdue(expense: any): boolean {
    if (expense.status === 'paid' || expense.status === 'cancelled') return false;
    if (!expense.due_date) return false;
    return new Date(expense.due_date) < new Date();
  }

  function getStatusBadge(expense: any) {
    if (isOverdue(expense)) {
      return (
        <Badge variant="outline" className="rounded-full text-[10px] font-bold px-2.5 py-0.5 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />{t('expenses:status.overdue.label')}
        </Badge>
      );
    }
    const map = {
      pending: { label: t('expenses:status.pending.label'), className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400' },
      paid: { label: t('expenses:status.paid.label'), className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400' },
      cancelled: { label: t('expenses:status.cancelled.label'), className: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400' },
    };
    const s = map[expense.status as keyof typeof map] || map.pending;
    return <Badge variant="outline" className={cn('rounded-full text-[10px] font-bold px-2.5 py-0.5', s.className)}>{s.label}</Badge>;
  }

  // NOVO: Handlers de exclusão com diálogo de confirmação (igual DriversPageContent)
  function openDeleteExpenseDialog(expense: any) {
    closeDropdownsAndOpenDialog(() => { selectExpense(expense); setDeleteExpenseDialogOpen(true); });
  }

  function openDeleteCategoryDialog(category: any) {
    closeDropdownsAndOpenDialog(() => { selectCategory(category); setDeleteCategoryDialogOpen(true); });
  }

  async function handleDeleteExpense() {
    if (!selectedExpense) return;
    setIsDeletingExpense(true);
    try {
      await deleteExpenseHelper(selectedExpense.id);
      removeExpenseFromContext(selectedExpense.id);
      showSuccess('expenses:toast.deleteSuccess');
      setDeleteExpenseDialogOpen(false);
      selectExpense(null);
      loadExpenses();
    } catch (error) {
      handleError(error, 'expenses:toast.deleteError');
    } finally {
      setIsDeletingExpense(false);
    }
  }

  async function handleDeleteCategory() {
    if (!selectedCategory) return;
    setIsDeletingCategory(true);
    try {
      await deleteExpenseCategory(selectedCategory.id);
      removeCategoryFromContext(selectedCategory.id);
      showSuccess('expenses:toast.categoryDeleteSuccess');
      setDeleteCategoryDialogOpen(false);
      selectCategory(null);
      loadCategories();
    } catch (error) {
      handleError(error, 'expenses:toast.categoryDeleteError');
    } finally {
      setIsDeletingCategory(false);
    }
  }

  const filteredCategories = categories.filter(c =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCategories = categories.filter(c => c.is_active).length;
  const operationalCategories = categories.filter(c => c.type === 'operational').length;
  const administrativeCategories = categories.filter(c => c.type === 'administrative').length;
  const extraordinaryCategories = categories.filter(c => c.type === 'extraordinary').length;

  const viewModes = [
    { mode: 'compact', icon: Rows, label: t('common:viewModes.compact') },
    { mode: 'normal', icon: List, label: t('common:viewModes.normal') },
    { mode: 'cards', icon: LayoutGrid, label: t('common:viewModes.cards') },
  ] as const;

  // ---------------------------------------------------------------
  // Views atualizadas com ações de edição/exclusão
  // ---------------------------------------------------------------

  function renderCompactView() {
  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <div className="bg-muted/50 px-6 py-4 grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-b">
        <div className="col-span-2">{t('expenses:fields.description')}</div>
        <div className="col-span-2">{t('expenses:fields.category')}</div>
        <div className="col-span-2">{t('expenses:compact.colDateExpVenc')}</div>
        <div className="col-span-2">{t('expenses:compact.colDatePgtoCriacao')}</div>
        <div className="col-span-1">{t('expenses:fields.status')}</div>
        <div className="col-span-2 text-center">{t('expenses:fields.amount')}</div>
        <div className="col-span-1 text-right">{t('expenses:table.actions')}</div>
      </div>
      <div className="divide-y">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="px-6 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/40 transition-colors duration-150"
          >
            <div className="col-span-2">
              <span className="text-sm font-medium truncate block">{expense.description}</span>
              {expense.vehicle_license && <span className="text-xs text-muted-foreground font-mono">{expense.vehicle_license}</span>}
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                {expense.category_color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: expense.category_color }} />}
                <span className="text-sm text-muted-foreground truncate">{expense.category_name}</span>
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs leading-tight">
                <span className="text-muted-foreground">{t('expenses:compact.prefixDesp')}</span>
                <span>{expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : '—'}</span>
              </div>
              <div className="text-xs leading-tight mt-0.5">
                <span className="text-muted-foreground">{t('expenses:compact.prefixVenc')}</span>
                <span>{expense.due_date ? new Date(expense.due_date).toLocaleDateString() : '—'}</span>
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs leading-tight">
                <span className="text-muted-foreground">{t('expenses:compact.prefixPgto')}</span>
                <span>{expense.payment_date ? new Date(expense.payment_date).toLocaleDateString() : '—'}</span>
              </div>
              <div className="text-xs leading-tight mt-0.5">
                <span className="text-muted-foreground">{t('expenses:compact.prefixCreated')}</span>
                <span>{expense.created_at ? new Date(expense.created_at.replace(' ', 'T')).toLocaleDateString() : '—'}</span>
              </div>
            </div>
            <div className="col-span-1">{getStatusBadge(expense)}</div>
            <div className="col-span-2 text-center ">
              <span className="text-sm font-bold">{expense.amount.toLocaleString('pt-PT')} Kz</span>
            </div>
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => { selectExpense(expense); setViewDialogOpen(true); }}>
                    <Eye className="w-4 h-4 mr-2" />{t('expenses:actions.view')}
                  </DropdownMenuItem>
                  <PermissionGate permission="expense:update" fullWidth><DropdownMenuItem onClick={() => { selectExpense(expense); setEditDialogOpen(true); }}>
                    <Edit className="w-4 h-4 mr-2" />{t('expenses:actions.edit')}
                  </DropdownMenuItem></PermissionGate>
                  {expense.status === 'pending' && (
                    <PermissionGate permission="expense:update" fullWidth><DropdownMenuItem className="text-emerald-600 focus:text-emerald-600" onClick={() => { selectExpense(expense); setMarkAsPaidDialogOpen(true); }}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />{t('expenses:actions.markAsPaid')}
                    </DropdownMenuItem></PermissionGate>
                  )}
                  <PermissionGate permission="expense:delete" fullWidth><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteExpenseDialog(expense)}>
                    <Trash2 className="w-4 h-4 mr-2" />{t('expenses:actions.delete')}
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
      {expenses.map((expense) => (
        <Card 
          key={expense.id} 
          className="overflow-hidden border-l-4 hover:shadow-md transition-all duration-200 bg-card"
          style={{ borderLeftColor: expense.category_color }}
        >
          <CardContent className="p-0">
            <div className="flex items-center p-5 gap-5">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${expense.category_color}20` }}>
                <DollarSign className="w-6 h-6" style={{ color: expense.category_color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-lg tracking-tight truncate">{expense.description}</h3>
                  {getStatusBadge(expense)}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" />{expense.category_name}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{new Date(expense.expense_date).toLocaleDateString('pt-PT')}</span>
                  {expense.vehicle_license && <span className="font-mono">{expense.vehicle_license}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('expenses:fields.amount')}</p>
                  <p className="text-xl font-bold text-primary">{expense.amount.toLocaleString('pt-PT')} Kz</p>
                </div>
                {/* BOTÕES DIRETAMENTE VISÍVEIS */}
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10"
                    onClick={() => { selectExpense(expense); setViewDialogOpen(true); }}
                    title={t('expenses:actions.view')}
                  >
                    <Eye className="w-5 h-5" />
                  </Button>
                  <PermissionGate permission="expense:update"><Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10"
                    onClick={() => { selectExpense(expense); setEditDialogOpen(true); }}
                    title={t('expenses:actions.edit')}
                  >
                    <Edit className="w-5 h-5" />
                  </Button></PermissionGate>
                  {expense.status === 'pending' && (
                    <PermissionGate permission="expense:update"><Button 
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                      onClick={() => { selectExpense(expense); setMarkAsPaidDialogOpen(true); }}
                      title={t('expenses:actions.markAsPaid')}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </Button></PermissionGate>
                  )}
                  <PermissionGate permission="expense:delete"><Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteExpenseDialog(expense)}
                    title={t('expenses:actions.delete')}
                  >
                    <Trash2 className="w-5 h-5" />
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

function renderCardsView() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {expenses.map((expense) => {
        // CORREÇÃO: Simplificado - só verifica se está pendente
        const isPending = expense.status === 'pending';
        const isPaid = expense.status === 'paid';
        
        return (
          <Card 
            key={expense.id} 
            className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-muted/60 cursor-pointer flex flex-col h-full"
            onClick={() => { selectExpense(expense); setViewDialogOpen(true); }}
          >
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2.5 rounded-xl transition-colors" style={{ backgroundColor: `${expense.category_color}20` }}>
                  <DollarSign className="w-5 h-5" style={{ color: expense.category_color }} />
                </div>
                {getStatusBadge(expense)}
              </div>
              <CardTitle className="text-lg font-bold leading-tight line-clamp-2" title={expense.description}>
                {expense.description}
              </CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" />{expense.category_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 p-5 pt-0">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 border border-muted/50">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {t('expenses:fields.expenseDate')}
                  </p>
                  <p className="text-sm font-bold">
                    {new Date(expense.expense_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div className="h-8 w-px bg-muted-foreground/10" />
                <div className="text-right space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {t('expenses:fields.dueDate')}
                  </p>
                  <p className="text-sm font-bold">
                    {expense.due_date ? new Date(expense.due_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '-'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {expense.vehicle_license && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{expense.vehicle_license}</span>
                  </div>
                )}
                {expense.supplier && <div className="text-sm text-muted-foreground truncate">{expense.supplier}</div>}
              </div>
              <div className="mt-auto pt-4 border-t border-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                    {t('expenses:fields.amount')}
                  </span>
                  <span className="text-xl font-black text-primary">
                    {expense.amount.toLocaleString('pt-PT')} <span className="text-sm font-bold">Kz</span>
                  </span>
                </div>
                
                {/* BOTÕES: Lógica condicional simplificada */}
                <div className="flex gap-2">
                  {isPending ? (
                    // PENDENTE (inclui atrasadas): Marcar como Pago (prioridade) + Ver
                    <>
                      <PermissionGate permission="expense:update"><Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 h-9 text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          selectExpense(expense); 
                          setMarkAsPaidDialogOpen(true); 
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        {t('expenses:actions.markAsPaid')}
                      </Button></PermissionGate>
                      <Button 
                        className="flex-[2] h-9 text-xs font-bold shadow-sm"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          selectExpense(expense); 
                          setViewDialogOpen(true); 
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        {t('expenses:actions.view')}
                      </Button>
                    </>
                  ) : isPaid ? (
                    // PAGO: Editar + Ver
                    <>
                      <PermissionGate permission="expense:update"><Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 h-9 text-xs font-bold bg-background hover:bg-muted"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          selectExpense(expense); 
                          setEditDialogOpen(true); 
                        }}
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        {t('expenses:actions.edit')}
                      </Button></PermissionGate>
                      <Button 
                        className="flex-[2] h-9 text-xs font-bold shadow-sm"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          selectExpense(expense); 
                          setViewDialogOpen(true); 
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        {t('expenses:actions.view')}
                      </Button>
                    </>
                  ) : (
                    // OUTROS (cancelado): Só Ver
                    <Button 
                      className="flex-1 h-9 text-xs font-bold shadow-sm"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        selectExpense(expense); 
                        setViewDialogOpen(true); 
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      {t('expenses:actions.view')}
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

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <div className="min-h-screen bg-transparent -m-6 p-6">
      <div className="max-w-[1500px] mx-auto space-y-8 pb-10">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="space-y-0.5">
              <h1 className="text-2xl font-extrabold tracking-tight">{t('expenses:title')}</h1>
              <p className="text-muted-foreground text-sm">
                {activeTab === 'expenses'
                  ? t('expenses:info.totalExpenses', { count: paginationInfo.total, plural: paginationInfo.total > 1 ? 's' : '' })
                  : t('expenses:info.totalCategories', { count: categories.length, plural: categories.length > 1 ? 's' : '' })}
              </p>
            </div>
            <TabsList className="flex h-9 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 mx-auto">
              <TabsTrigger value="expenses" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />{t('expenses:tabs.expenses')}
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                <Tag className="w-4 h-4" />{t('expenses:tabs.categories')}
              </TabsTrigger>
            </TabsList>
            <NewExpenseDialog onSuccess={loadExpenses} />
          </div>

          {/* ---- TAB: DESPESAS ---- */}
          <TabsContent value="expenses" className="space-y-6 mt-0 outline-none">

            {/* Stats */}
            <TooltipProvider delayDuration={300}>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: t('expenses:stats.total'),   value: fmt(Number(stats.totalAmount),   'Kz'), rawValue: Number(stats.totalAmount),   suffix: 'Kz', icon: DollarSign,  color: 'text-blue-600',   bg: 'bg-blue-50/60'   },
                { label: t('expenses:stats.paid'),    value: fmt(Number(stats.paidAmount),    'Kz'), rawValue: Number(stats.paidAmount),    suffix: 'Kz', icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50/60'  },
                { label: t('expenses:stats.pending'), value: fmt(Number(stats.pendingAmount), 'Kz'), rawValue: Number(stats.pendingAmount), suffix: 'Kz', icon: Calendar,    color: 'text-yellow-600', bg: 'bg-yellow-50/60' },
                { label: t('expenses:stats.count'),   value: String(paginationInfo.total),            rawValue: paginationInfo.total,                      icon: TrendingUp,  color: 'text-purple-600', bg: 'bg-purple-50/60' },
              ].map((stat, i) => {
                const showTooltip = stat.rawValue >= 1_000;
                const fullValue   = showTooltip ? `${stat.rawValue.toLocaleString('pt-PT')}${'suffix' in stat && stat.suffix ? ' ' + stat.suffix : ''}` : undefined;
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

            {/* Análises horizontal */}
            {viewSettings.analyticsLayout !== 'vertical' && viewSettings.expensesAnalytics && (
              <ExpensesAnalyticsPanel
                layout="horizontal"
                stats={stats}
                expenses={analyticsExpenses}
                totalCount={paginationInfo.total}
              />
            )}

            {/* Layout wrapper: vertical = flex row com sidebar */}
            <div className={viewSettings.analyticsLayout === 'vertical' ? 'flex gap-4 items-start' : undefined}>
            <div className={cn('space-y-6', viewSettings.analyticsLayout === 'vertical' ? 'flex-1 min-w-0' : undefined)}>
            {/* Toolbar */}
            <div className="bg-card rounded-2xl border border-muted/50 shadow-sm overflow-hidden">
              <div className="flex flex-wrap gap-3 items-center p-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t('expenses:searchPlaceholder')} value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1" />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="flex-1 min-w-[140px] max-w-full overflow-hidden h-10 text-sm bg-muted/20 border-none">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder={t('expenses:filters.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{t('expenses:filters.all')}</span>
                        {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({stats.pending + stats.paid + stats.cancelled})</span>}
                      </span>
                    </SelectItem>
                    <SelectItem value="pending">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{t('expenses:filters.pending')}</span>
                        {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({stats.pending})</span>}
                      </span>
                    </SelectItem>
                    <SelectItem value="paid">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{t('expenses:filters.paid')}</span>
                        {viewSettings.showFilterCounts && <span className="text-xs text-muted-foreground shrink-0">({stats.paid})</span>}
                      </span>
                    </SelectItem>
                    <SelectItem value="overdue">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{t('expenses:filters.overdue')}</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="flex-1 min-w-[140px] max-w-full overflow-hidden h-10 text-sm bg-muted/20 border-none">
                    <SelectValue placeholder={t('expenses:filters.allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><span className="truncate">{t('expenses:filters.allCategories')}</span></SelectItem>
                    {categories.filter(c => c.is_active).map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="truncate">{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex bg-muted/30 p-1 rounded-xl border border-muted/50 self-center shrink-0">
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
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50">
                <DollarSign className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold">{t('expenses:noExpenses')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{searchTerm ? t('common:noResults') : t('common:noData')}</p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                {viewMode === 'compact' && renderCompactView()}
                {viewMode === 'normal' && renderNormalView()}
                {viewMode === 'cards' && renderCardsView()}
              </div>
            )}
            </div>
            {viewSettings.analyticsLayout === 'vertical' && viewSettings.expensesAnalytics && (
              <div className="w-[300px] shrink-0 sticky top-4">
                <ExpensesAnalyticsPanel
                  layout="vertical"
                  stats={stats}
                  expenses={analyticsExpenses}
                  totalCount={paginationInfo.total}
                />
              </div>
            )}
            </div>
          </TabsContent>

          {/* ---- TAB: CATEGORIAS ---- */}
          <TabsContent value="categories" className="space-y-6 mt-0 outline-none">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: t('expenses:categories.stats.total'), value: categories.length, icon: Tag, color: 'text-blue-600', bg: 'bg-blue-50/60' },
                { label: t('expenses:categories.stats.operational'), value: operationalCategories, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50/60' },
                { label: t('expenses:categories.stats.administrative'), value: administrativeCategories, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50/60' },
                { label: t('expenses:categories.stats.extraordinary'), value: extraordinaryCategories, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50/60' },
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
                  <Input placeholder={t('common:search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10 text-sm bg-muted/20 border-none focus-visible:ring-1" />
                </div>
                <div className="sm:ml-auto"><NewExpenseCategoryDialog onSuccess={loadCategories} /></div>
              </div>
            </div>
            {isCategoriesLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4"><div className="h-12 w-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" /><p className="text-sm text-muted-foreground font-bold animate-pulse">{t('common:loading')}...</p></div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border-2 border-dashed border-muted/50"><Tag className="w-12 h-12 text-muted-foreground/20 mb-4" /><h3 className="text-lg font-bold">{t('expenses:alerts.noCategories')}</h3></div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-300">
                {filteredCategories.map((category) => (
                  <Card key={category.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-muted/60 cursor-pointer"
                    onClick={canEditExpenseCategory ? () => { selectCategory(category); setEditCategoryDialogOpen(true); } : undefined}>
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 rounded-xl transition-colors" style={{ backgroundColor: `${category.color}20` }}>
                          <Tag className="w-5 h-5" style={{ color: category.color }} />
                        </div>
                        <Badge variant={category.is_active ? 'outline' : 'secondary'}
                          className={cn('rounded-full text-[10px] font-bold px-2.5 py-0.5', category.is_active ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' : 'border-slate-200 text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400')}>
                          {category.is_active ? t('expenses:categories.active') : t('expenses:categories.inactive')}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold leading-tight">{category.name}</CardTitle>
                      <CardDescription className="text-sm font-medium text-muted-foreground">{t(`expenses:categoryTypes.${category.type}`)}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3 p-5 pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">{category.description || t('expenses:categories.noDescription')}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: category.color }} />
                        <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{category.color}</span>
                      </div>
                      <div className="mt-auto pt-4 border-t border-muted/50 flex gap-2">
                        <PermissionGate permission="category:update"><Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold bg-background hover:bg-muted"
                          onClick={(e) => { e.stopPropagation(); selectCategory(category); setEditCategoryDialogOpen(true); }}>
                          <Edit className="w-3.5 h-3.5 mr-1.5" />{t('common:actions.edit')}
                        </Button></PermissionGate>
                        <PermissionGate permission="category:delete"><Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive bg-background"
                          onClick={(e) => { e.stopPropagation(); openDeleteCategoryDialog(category); }}>
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

        {/* Dialogs de Visualização e Edição */}
        <ViewExpenseDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} />
        <EditExpenseDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={loadExpenses} />
        <MarkAsPaidDialog open={markAsPaidDialogOpen} onOpenChange={setMarkAsPaidDialogOpen} onSuccess={loadExpenses} />
        <EditExpenseCategoryDialog open={editCategoryDialogOpen} onOpenChange={setEditCategoryDialogOpen} />

        {/* NOVO: Dialogs de Confirmação de Exclusão (igual DriversPageContent) */}
        <AlertDialog open={deleteExpenseDialogOpen} onOpenChange={setDeleteExpenseDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('expenses:dialogs.delete.title', 'Eliminar despesa?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('expenses:dialogs.delete.description', 'Esta acção não pode ser revertida.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingExpense}>{t('common:cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteExpense}
                disabled={isDeletingExpense}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeletingExpense ? t('common:processing') : t('common:actions.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('expenses:dialogs.deleteCategory.title', 'Eliminar categoria?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('expenses:dialogs.deleteCategory.description', 'Todas as despesas desta categoria ficarão sem categoria. Esta acção não pode ser revertida.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingCategory}>{t('common:cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCategory}
                disabled={isDeletingCategory}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeletingCategory ? t('common:processing') : t('common:actions.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}