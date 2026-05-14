import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  searchPlaceholder = "Search...",
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground min-w-[100px]">
          {loading ? (
            <span className="inline-block h-4 w-24 rounded bg-muted animate-pulse" />
          ) : (
            <>
              <span className="font-semibold text-slate-800">{data.length.toLocaleString()}</span>{" "}
              {label}{data.length !== 1 ? "s" : ""}
            </>
          )}
        </p>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {onSearchChange !== undefined && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 w-56 sm:w-72"
              />
            </div>
          )}
          {headerRight}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full rounded-xl border border-border">
        <Table style={{ minWidth }}>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`whitespace-nowrap font-semibold text-slate-700 ${col.headerClassName ?? ""}`}
                >
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
                        className={`h-4 rounded-md bg-muted animate-pulse ${
                          ci === 0 ? "w-4/5" : ci % 3 === 0 ? "w-2/3" : "w-1/2"
                        }`}
                        style={{ animationDelay: `${ri * 60}ms` }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {emptyIcon && <div className="opacity-40">{emptyIcon}</div>}
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, ri) => (
                <TableRow key={(row as any).id ?? ri}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`whitespace-nowrap ${col.className ?? ""}`}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {data.length > pageSize
              ? `Showing ${start}–${end} of ${data.length.toLocaleString()}`
              : `${data.length.toLocaleString()} ${label}${data.length !== 1 ? "s" : ""}`}
          </span>
          {data.length > pageSize && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-xs"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >
                «
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {pageNumbers.map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-xs"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
              >
                »
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
