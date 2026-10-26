'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}

function Table<T>({
  columns,
  data,
  keyExtractor,
  className,
  striped = true,
  hoverable = true,
  compact = false,
  emptyMessage = 'Tidak ada data',
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  loading = false,
  pagination,
}: TableProps<T>) {
  const handleSelectAll = () => {
    if (selectedKeys.size === data.length) {
      onSelectionChange?.(new Set());
    } else {
      onSelectionChange?.(new Set(data.map(keyExtractor)));
    }
  };

  const isSelected = (row: T) => selectedKeys.has(keyExtractor(row));
  const allSelected = data.length > 0 && data.every((row) => isSelected(row));
  const someSelected = data.some((row) => isSelected(row)) && !allSelected;

  if (loading) {
    return (
      <div className={cn('rounded-lg bg-surface-container shadow-md overflow-hidden', className)}>
        <div className="p-gutter">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg bg-surface-container shadow-md overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="grid">
          <thead>
            <tr className="bg-surface-container-lowest h-9 font-label-md text-label-md uppercase tracking-wider text-outline select-none">
              {selectable && (
                <th className="w-10 px-space-md text-center">
                  <input
                    type="checkbox"
                    className="rounded bg-surface-container-high text-primary-container focus:ring-0 focus:outline-none cursor-pointer"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label="Pilih semua"
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-space-md font-medium',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.width && `w-[${column.width}]`,
                    column.headerClassName
                  )}
                  style={{ width: column.width }}
                  aria-sort={sortColumn === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center gap-1">
                    {column.sortable && onSort ? (
                      <button
                        onClick={() => onSort(column.key)}
                        className="flex items-center gap-1 hover:text-on-surface transition-colors"
                        aria-label={`Urutkan berdasarkan ${column.header}`}
                      >
                        <span>{column.header}</span>
                        <span className="material-symbols-outlined text-[14px]">
                          {sortColumn === column.key
                            ? sortDirection === 'asc'
                              ? 'arrow_upward'
                              : 'arrow_downward'
                            : 'unfold_more'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-0 font-body-sm text-body-sm text-on-surface">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-gutter py-12 text-center text-on-surface-variant">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    'transition-colors',
                    striped && index % 2 === 0 && 'bg-surface-container-low',
                    striped && index % 2 === 1 && 'bg-surface-container-lowest',
                    hoverable && 'hover:bg-surface-container-high/60',
                    onRowClick && 'cursor-pointer group',
                    isSelected(row) && 'bg-primary-container/10'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-space-md text-center">
                      <input
                        type="checkbox"
                        className="rounded bg-surface-container-high text-primary-container focus:ring-0 focus:outline-none cursor-pointer"
                        checked={isSelected(row)}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newKeys = new Set(selectedKeys);
                          if (e.target.checked) newKeys.add(keyExtractor(row));
                          else newKeys.delete(keyExtractor(row));
                          onSelectionChange?.(newKeys);
                        }}
                        aria-label={`Pilih baris ${index + 1}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        `py-${compact ? '2' : '2.5'} px-space-md`,
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        column.className
                      )}
                    >
                      {column.render ? column.render(row, index) : (row as Record<string, unknown>)[column.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-md border-t border-outline-variant">
          <div className="flex items-center gap-space-md">
            <span className="font-body-sm text-body-sm text-outline">
              Menampilkan <span className="text-on-surface font-semibold">
                {((pagination.page - 1) * pagination.pageSize) + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.total)}
              </span> dari <span className="text-on-surface font-semibold">{pagination.total}</span>
            </span>
            <div className="flex items-center gap-space-xs text-outline font-label-md text-label-md">
              <span>Tampilkan:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
                className="bg-surface-container px-2 py-1 rounded text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container cursor-pointer"
              >
                <option value={10}>10 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
                <option value={100}>100 / hal</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Halaman pertama"
            >
              <span className="material-symbols-outlined text-[18px]">first_page</span>
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Halaman sebelumnya"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.pageSize)) }, (_, i) => {
              let pageNum: number;
              const totalPages = Math.ceil(pagination.total / pagination.pageSize);
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={cn(
                    'w-8 h-8 rounded font-code-sm text-code-sm',
                    pagination.page === pageNum
                      ? 'bg-primary-container text-on-primary-container font-semibold'
                      : 'hover:bg-surface-container text-on-surface-variant'
                  )}
                  aria-current={pagination.page === pageNum ? 'page' : undefined}
                  aria-label={`Halaman ${pageNum}`}
                >
                  {pageNum}
                </button>
              );
            })}
            {Math.ceil(pagination.total / pagination.pageSize) > 5 && (
              <>
                <span className="px-1 text-outline font-code-sm text-code-sm">...</span>
                <button
                  onClick={() => pagination.onPageChange(Math.ceil(pagination.total / pagination.pageSize))}
                  className={cn(
                    'w-8 h-8 rounded font-code-sm text-code-sm hover:bg-surface-container text-on-surface-variant'
                  )}
                  aria-label={`Halaman ${Math.ceil(pagination.total / pagination.pageSize)}`}
                >
                  {Math.ceil(pagination.total / pagination.pageSize)}
                </button>
              </>
            )}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Halaman selanjutnya"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
            <button
              onClick={() => pagination.onPageChange(Math.ceil(pagination.total / pagination.pageSize))}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Halaman terakhir"
            >
              <span className="material-symbols-outlined text-[18px]">last_page</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Table };