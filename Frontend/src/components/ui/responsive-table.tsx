import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './table';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  className?: string;
  showOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T & string;
  className?: string;
  emptyState?: React.ReactNode;
}

export function ResponsiveTable<T extends Record<string, unknown>>({ 
  data,
  columns,
  keyField,
  className,
  emptyState
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  
  // Filter columns based on device size
  const visibleColumns = isMobile 
    ? columns.filter(col => col.showOnMobile !== false)
    : columns;

  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn("w-full overflow-x-auto rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={String(item[keyField])}>
              {visibleColumns.map((column) => (
                <TableCell key={`${item[keyField]}-${column.key}`} className={column.className}>
                  {column.cell(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function MobileTableCard({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "p-4 border rounded-lg mb-4 bg-card text-card-foreground shadow-sm", 
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ResponsiveListView<T extends Record<string, unknown>>({ 
  data,
  renderItem,
  keyField,
  emptyState
}: {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  keyField: keyof T & string;
  emptyState?: React.ReactNode;
}) {
  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-4">
      {data.map(item => (
        <MobileTableCard key={String(item[keyField])}>
          {renderItem(item)}
        </MobileTableCard>
      ))}
    </div>
  );
}

export function useResponsiveTable() {
  const isMobile = useIsMobile();
  return { isMobile };
}
