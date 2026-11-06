import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100];

type PageItem = number | "start-ellipsis" | "end-ellipsis";

function buildPageItems(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PageItem[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) items.push("start-ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("end-ellipsis");
  items.push(totalPages);

  return items;
}

export interface DataTablePaginationProps {
  /** Current 1-based page. */
  page: number;
  pageSize: number;
  /** Total number of rows across all pages. */
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  /** Noun used in the "Showing x-y of n ..." summary. */
  itemLabel?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Shared pagination footer for tables: page numbers, first/last and
 * previous/next controls, a rows-per-page selector and a range summary.
 */
export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  itemLabel = "rows",
  className,
  disabled = false,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);
  const options = Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b);
  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t px-2 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="whitespace-nowrap">Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[80px]" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="tabular-nums">
          Showing {start}–{end} of {totalCount} {itemLabel}
        </span>
      </div>

      <nav
        aria-label="Pagination"
        className="flex flex-wrap items-center gap-1"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="First page"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Previous page"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageItems.map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              type="button"
              variant={item === currentPage ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-8 px-2 tabular-nums"
              aria-label={`Page ${item}`}
              aria-current={item === currentPage ? "page" : undefined}
              disabled={disabled}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ) : (
            <span
              key={item}
              aria-hidden="true"
              className="px-1 text-sm text-muted-foreground"
            >
              …
            </span>
          ),
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Next page"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Last page"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}

export default DataTablePagination;
