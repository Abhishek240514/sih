import { useState, useMemo } from 'react';
import { useGetWalletsQuery, useGetTopWalletsQuery } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { formatNumber, formatCurrency, formatRelativeTime, truncateAddress } from '@/lib/utils';
import { useDataset } from '@/context/DatasetContext';

export function EntitiesPage() {
  const { datasetId } = useDataset();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState<'all' | 'top'>('all');
  const pageSize = 20;

  const { data: walletsData, isLoading } = useGetWalletsQuery(
    { dataset_id: datasetId!, skip: (currentPage - 1) * pageSize, limit: pageSize },
    { enabled: !!datasetId && view === 'all' }
  );
  const { data: topWallets } = useGetTopWalletsQuery(
    { dataset_id: datasetId!, limit: 50 },
    { enabled: !!datasetId && view === 'top' }
  );

  const filteredWallets = useMemo(() => {
    const data = view === 'top' ? topWallets?.wallets : walletsData?.wallets;
    if (!data) return [];
    return data.filter(wallet => {
      if (search && !wallet.address.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter.length && !riskFilter.includes(wallet.risk_level)) return false;
      return true;
    });
  }, [walletsData, topWallets, search, riskFilter, view]);

  const riskLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

  const columns = [
    { key: 'address', header: 'Address', render: (_, v: string) => <span className="font-mono text-sm">{truncateAddress(v)}</span> },
    { key: 'transaction_count', header: 'TXs', render: (_, v: number) => <span className="font-mono">{formatNumber(v)}</span>, sortable: true },
    { key: 'total_in', header: 'Total In', render: (_, v: number) => <span className="font-mono">{formatCurrency(v)}</span>, sortable: true },
    { key: 'total_out', header: 'Total Out', render: (_, v: number) => <span className="font-mono">{formatCurrency(v)}</span>, sortable: true },
    { key: 'unique_counterparties', header: 'Counterparties', render: (_, v: number) => <span className="font-mono">{formatNumber(v)}</span>, sortable: true },
    { key: 'fan_in', header: 'Fan-in', render: (_, v: number) => <span className="font-mono">{v}</span>, sortable: true },
    { key: 'fan_out', header: 'Fan-out', render: (_, v: number) => <span className="font-mono">{v}</span>, sortable: true },
    { key: 'risk_score', header: 'Risk Score', render: (_, v: number) => <span className="font-mono font-medium">{(v * 100).toFixed(1)}%</span>, sortable: true },
    { key: 'risk_level', header: 'Risk Level', render: (_, v: string) => <RiskBadge level={v as any} size="sm" />, sortable: true },
    { key: 'community_id', header: 'Community', render: (_, v: number | null) => v !== null ? <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">{v}</span> : '-' },
  ];

  if (!datasetId) return <div className="p-8 text-center text-gray-500">Select a dataset</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Entities (Wallets)</h1>
        <div className="flex gap-2">
          {(['all', 'top'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                view === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {v === 'all' ? 'All Wallets' : 'Top Risky'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 sm:w-64">
          <input
            type="text"
            placeholder="Search address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-2">
          {riskLevels.map(level => (
            <label key={level} className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={riskFilter.includes(level)}
                onChange={e => setRiskFilter(prev => e.target.checked ? [...prev, level] : prev.filter(r => r !== level))}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <RiskBadge level={level} size="sm" />
            </label>
          ))}
        </div>
      </div>

      <DataTable
        data={filteredWallets}
        columns={columns}
        keyExtractor={w => w.address}
        onRowClick={(wallet) => window.location.href = `/investigations/${wallet.address}?dataset_id=${datasetId}`}
        loading={isLoading}
        emptyMessage="No wallets found"
        pageSize={pageSize}
        showPagination={view === 'all'}
      />

      {view === 'all' && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {Math.ceil((walletsData?.wallets?.length || 0) / pageSize)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil((walletsData?.wallets?.length || 0) / pageSize), p + 1))}
              disabled={currentPage >= Math.ceil((walletsData?.wallets?.length || 0) / pageSize)}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}