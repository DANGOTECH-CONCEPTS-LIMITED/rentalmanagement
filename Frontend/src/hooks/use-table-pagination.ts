import { useCallback, useEffect, useMemo, useState } from "react";

export interface TablePagination<T> {
  /** Current (clamped) page number, starting at 1. */
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  /** Changes the page size and returns to page 1. */
  setPageSize: (pageSize: number) => void;
  totalCount: number;
  totalPages: number;
  /** Rows belonging to the current page. */
  pageRows: T[];
  /** 1-based index of the first row on the page (0 when there are no rows). */
  start: number;
  /** 1-based index of the last row on the page (0 when there are no rows). */
  end: number;
  /** Returns to page 1, e.g. after a filter or search changes. */
  resetPage: () => void;
}

/**
 * Client-side pagination helper for fully loaded tables.
 * Clamps the current page whenever the data or page size shrinks.
 */
export function useTablePagination<T>(
  rows: T[],
  initialPageSize = 10,
): TablePagination<T> {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page_ = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== page_) setPageState(page_);
  }, [page, page_]);

  const pageRows = useMemo(() => {
    const offset = (page_ - 1) * pageSize;
    return rows.slice(offset, offset + pageSize);
  }, [rows, page_, pageSize]);

  const setPage = useCallback(
    (next: number) => {
      setPageState(Math.min(Math.max(1, Math.trunc(next)), totalPages));
    },
    [totalPages],
  );

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(Math.max(1, Math.trunc(next)));
    setPageState(1);
  }, []);

  const resetPage = useCallback(() => setPageState(1), []);

  const start = totalCount === 0 ? 0 : (page_ - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(page_ * pageSize, totalCount);

  return {
    page: page_,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    pageRows,
    start,
    end,
    resetPage,
  };
}
