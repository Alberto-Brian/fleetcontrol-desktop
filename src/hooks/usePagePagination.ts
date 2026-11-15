// ========================================
// FILE: src/hooks/usePagePagination.ts
// ========================================
import { useState, useEffect, useCallback } from 'react';

const DEFAULT_PAGE_SIZE = 20;

function storageKey(pageKey: string, type: 'pagesize' | 'currentpage') {
  return `fc:pagination:${pageKey}:${type}`;
}

function isPersistEnabled(type: 'pagesize' | 'currentpage'): boolean {
  const key = type === 'pagesize' ? 'app_persist_pagesize' : 'app_persist_currentpage';
  return localStorage.getItem(key) === 'true';
}

function readPersistedNumber(pageKey: string, type: 'pagesize' | 'currentpage', fallback: number): number {
  if (!isPersistEnabled(type)) return fallback;
  const raw = localStorage.getItem(storageKey(pageKey, type));
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function usePagePagination(pageKey: string) {
  const [currentPage, setCurrentPageState] = useState<number>(() =>
    readPersistedNumber(pageKey, 'currentpage', 1)
  );
  const [itemsPerPage, setItemsPerPageState] = useState<number>(() =>
    readPersistedNumber(pageKey, 'pagesize', DEFAULT_PAGE_SIZE)
  );

  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(page);
    if (isPersistEnabled('currentpage')) {
      localStorage.setItem(storageKey(pageKey, 'currentpage'), String(page));
    }
  }, [pageKey]);

  const setItemsPerPage = useCallback((size: number) => {
    setItemsPerPageState(size);
    if (isPersistEnabled('pagesize')) {
      localStorage.setItem(storageKey(pageKey, 'pagesize'), String(size));
    }
  }, [pageKey]);

  // When settings toggle from disabled → enabled mid-session, persist current values
  useEffect(() => {
    if (isPersistEnabled('pagesize')) {
      localStorage.setItem(storageKey(pageKey, 'pagesize'), String(itemsPerPage));
    }
  }, [pageKey, itemsPerPage]);

  useEffect(() => {
    if (isPersistEnabled('currentpage')) {
      localStorage.setItem(storageKey(pageKey, 'currentpage'), String(currentPage));
    }
  }, [pageKey, currentPage]);

  // 2026-11-15 — bug real: com "guardar página actual" ligado, uma página
  // guardada (ex. 3) que deixou de existir (menos registos, ou um utilizador
  // com âmbito mais pequeno) fazia a listagem vir vazia enquanto os
  // contadores mostravam os registos. Chamado depois de cada carregamento:
  // volta à última página válida.
  const clampToTotalPages = useCallback((totalPages: number) => {
    const last = Math.max(1, totalPages);
    if (currentPage > last) setCurrentPage(last);
  }, [currentPage, setCurrentPage]);

  return { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, clampToTotalPages };
}
