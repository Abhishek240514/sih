import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber, formatCurrency, formatTimestamp, truncateAddress } from '@/lib/utils';
import { RiskBadge } from './RiskBadge';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, value: unknown) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  pageSize?: number;
  showPagination?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  className,
  pageSize = 10,
  showPagination = true,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      if (aVal === null || aVal === undefined) return direction;
      if (bVal === null || bVal === undefined) return -direction;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * direction;
      }
      return String(aVal).localeCompare(String(bVal)) * direction;
    });
  }, [data, sortConfig]);

  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    const column = columns.find(c => c.key === key);
    if (!column?.sortable) return;
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderCell = (row: T, column: Column<T>) => {
    const value = row[column.key];
    if (column.render) return column.render(row, value);

    if (value === null || value === undefined) return '-';

    if (column.key.includes('risk_score')) {
      return <span className="font-mono font-medium">{(Number(value) * 100).toFixed(1)}%</span>;
    }

    if (column.key.includes('risk_level')) {
      return <RiskBadge level={value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} size="sm" />;
    }

    if (typeof value === 'number') {
      if (column.key.includes('amount') || column.key.includes('volume') || column.key.includes('value')) {
        return <span className="font-mono">{formatCurrency(value)}</span>;
      }
      if (column.key.includes('score')) {
        return <span className="font-mono">{(value * 100).toFixed(1)}%</span>;
      }
      return <span className="font-mono">{formatNumber(value)}</span>;
    }

    if (typeof value === 'string') {
      if (value.includes('T') && value.includes(':')) {
        return <span title={value}>{formatTimestamp(value)}</span>;
      }
      if (value.length > 40 && (value.startsWith('1') || value.startsWith('3') || value.startsWith('bc1'))) {
        return <span className="font-mono" title={value}>{truncateAddress(value)}</span>;
      }
    }

    return String(value);
  };

  const handleSortClick = (key: string) => handleSort(key);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="animate-pulse">
          <div className="px-6 py-4 border-b h-12">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border">
        <div className="p-12 text-center text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl border overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              {columns.map(column => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100 select-none',
                    column.className
                  )}
                  onClick={() => column.sortable && handleSortClick(column.key)}
                  style={{ width: column.className?.includes('w-') ? undefined : 'auto' }}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {sortConfig?.key === column.key && (
                      <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map(row => (
              <tr
                key={keyExtractor(row)}
                className={cn('hover:bg-gray-50 transition-colors', onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(column => (
                  <td key={column.key} className={cn('px-6 py-4 whitespace-nowrap text-sm text-gray-900', column.className)}>
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} ({data.length} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}