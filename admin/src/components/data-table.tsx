import { CaretDown, CaretLeft, CaretRight, CaretUp, CaretUpDown, MagnifyingGlass } from '@phosphor-icons/react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { useState, type ReactNode } from 'react';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    className?: string;
  }
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Right-hand toolbar slot (filter selects etc.). */
  toolbar?: ReactNode;
  /** Controlled TanStack column filters (wire Selects to these). */
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  pageSize?: number;
  emptyState?: ReactNode;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

/**
 * The standard list table (RosterBay visual pattern, TanStack Table engine):
 * toolbar with debounced search + filter slot, sortable headers, pagination.
 *
 * The table body scrolls inside a bounded container while the search bar,
 * column headers, and pagination footer stay fixed.
 */
export function DataTable<T>({
  columns,
  data,
  loading,
  searchable,
  searchPlaceholder = 'Search…',
  toolbar,
  columnFilters,
  onColumnFiltersChange,
  pageSize = 10,
  emptyState,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const globalFilter = useDebounce(query, 300);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      ...(columnFilters !== undefined && { columnFilters }),
    },
    onSortingChange: setSorting,
    ...(onColumnFiltersChange && {
      onColumnFiltersChange: (updater) => {
        onColumnFiltersChange(
          typeof updater === 'function' ? updater(columnFilters ?? []) : updater,
        );
      },
    }),
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    getRowId: rowKey,
  });

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {(searchable || toolbar) && (
        <div className="flex flex-col items-start gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center">
          {searchable && (
            <div className="relative w-full min-w-0 flex-1 sm:max-w-xs">
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Label htmlFor="table-search" className="sr-only">
                Search
              </Label>
              <Input
                id="table-search"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 bg-background pl-9"
              />
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{toolbar}</div>}
        </div>
      )}

      {/* Scrollable table area — header sticks, body scrolls */}
      <div className="max-h-[calc(100vh-20rem)] overflow-auto scrollbar-thin">
        <table className="relative w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <CaretUp size={12} aria-hidden />
                          ) : sorted === 'desc' ? (
                            <CaretDown size={12} aria-hidden />
                          ) : (
                            <CaretUpDown size={12} className="text-muted-foreground/60" aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-16 text-center">
                  {emptyState ?? <p className="text-sm text-muted-foreground">No records found.</p>}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn('hover:bg-muted/50', onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row.original)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onRowClick?.(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>

      {!loading && (filteredCount > 0 || pageCount > 1) && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-sm text-muted-foreground">
          <span>
            {filteredCount} result{filteredCount === 1 ? '' : 's'}
          </span>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous page"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <CaretLeft aria-hidden />
              </Button>
              <span className="px-2 tabular-nums">
                {table.getState().pagination.pageIndex + 1} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next page"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <CaretRight aria-hidden />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
