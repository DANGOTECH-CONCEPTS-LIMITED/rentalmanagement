import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, InboxIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  pageSize?: number;
  label?: string;
  headerRight?: React.ReactNode;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  minWidth?: string;
}

const SKELETON_ROWS = 6;

export function DataTable<T>({
  data,
  columns,
  loading = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  pageSize = 10,
  label = "record",
  headerRight,
  emptyMessage = "No records found",
  emptyIcon,
  minWidth = "600px",
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [data.length, searchValue]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paginated = data.slice((page - 1) * pageSize, page * pageSize);
  const start = data.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, data.length);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | "...")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Record count badge */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-6 w-28 rounded-full bg-slate-100 animate-pulse" />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              <span className="text-[#1D4ED8] font-bold">{data.length.toLocaleString()}</span>
              {label}{data.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {onSearchChange !== undefined && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                placeholder={searchPlaceholder}
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 w-52 sm:w-64 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 shadow-sm"
              />
            </div>
          )}
          {headerRight}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table style={{ minWidth }}>
            <TableHeader>
              <TableRow className="hover:bg-slate-50">
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.headerClassName ?? ""}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: SKELETON_ROWS }).map((_, ri) => (
                  <TableRow key={ri} className="hover:bg-transparent">
                    {columns.map((col, ci) => (
                      <TableCell key={col.key}>
                        <div
                          className={`h-4 rounded-lg bg-slate-100 animate-pulse ${
                            ci === 0 ? "w-4/5" : ci % 3 === 0 ? "w-2/3" : "w-1/2"
                          }`}
                          style={{ animationDelay: `${ri * 50}ms` }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                        {emptyIcon ?? <InboxIcon className="h-6 w-6 text-slate-300" />}
                      </div>
                      <p className="text-sm font-medium">{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row, ri) => (
                  <TableRow key={(row as any).id ?? ri}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className ?? ""}>
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            {data.length > pageSize
              ? `Showing ${start}–${end} of ${data.length.toLocaleString()} ${label}s`
              : `${data.length.toLocaleString()} ${label}${data.length !== 1 ? "s" : ""} total`}
          </p>

          {data.length > pageSize && (
            <div className="flex items-center gap-1">
              {/* First */}
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>

              {/* Prev */}
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {/* Page numbers */}
              {pageNumbers.map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                      p === page
                        ? "bg-[#1D4ED8] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next */}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              {/* Last */}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
