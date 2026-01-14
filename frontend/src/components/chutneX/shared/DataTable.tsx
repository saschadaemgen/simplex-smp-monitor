/**
 * DataTable - Reusable Data Table Component
 */
import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  className?: string;
  rowClassName?: string | ((item: T) => string);
  onRowClick?: (item: T) => void;
  stickyHeader?: boolean;
  maxHeight?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  sortKey,
  sortDirection = 'asc',
  onSort,
  emptyMessage = 'No data available',
  className = '',
  rowClassName = '',
  onRowClick,
  stickyHeader = false,
  maxHeight,
}: DataTableProps<T>) {
  const getValue = (item: T, key: keyof T | string): unknown => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj: unknown, k) => (obj as Record<string, unknown>)?.[k], item);
    }
    return item[key as keyof T];
  };

  return (
    <div 
      className={`overflow-auto rounded-lg border border-gray-700 ${className}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full text-left">
        <thead className={`bg-gray-800 text-gray-300 text-sm ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`px-4 py-3 font-medium ${col.width || ''} ${col.sortable ? 'cursor-pointer hover:text-white' : ''} ${col.className || ''}`}
                onClick={() => col.sortable && onSort?.(String(col.key))}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={`bg-gray-900 hover:bg-gray-800 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${typeof rowClassName === 'function' ? rowClassName(item) : rowClassName}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.render ? col.render(item) : String(getValue(item, col.key) ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
