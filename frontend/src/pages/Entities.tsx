import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntities } from '@/hooks/useEntities';
import { useDataset } from '@/context/DatasetContext';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { truncateAddress, formatRiskScore, formatBTC, cn, toCSV, downloadFile } from '@/lib/utils';
import { Users, Download, Search, X } from 'lucide-react';

const PAGE_SIZE = 20;

export default function Entities() {
  const navigate = useNavigate();
  const { activeDatasetId } = useDataset();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const entitiesQuery = useEntities(page * PAGE_SIZE, PAGE_SIZE);

  const wallets = entitiesQuery.data?.wallets || [];
  const filteredWallets = search
    ? wallets.filter((w) => w.address.toLowerCase().includes(search.toLowerCase()))
    : wallets;

  const handleExport = () => {
    if (!filteredWallets.length) return;
    const data = filteredWallets.map((w) => ({
      address: w.address,
      transaction_count: w.transaction_count,
      total_in: w.total_in,
      total_out: w.total_out,
      risk_score: formatRiskScore(w.risk_score),
      risk_level: w.risk_level,
      community_id: w.community_id,
    }));
    const csv = toCSV(data, ['address', 'transaction_count', 'total_in', 'total_out', 'risk_score', 'risk_level', 'community_id']);
    downloadFile(csv, `entities_export_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={<Users className="w-16 h-16" />}
        title="No Dataset Selected"
        description="Select a processed dataset to browse entities."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Entities</h1>
          <p className="text-sm text-slate-500 mt-1">Browse and search wallet entities</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-color)] hover:border-[var(--border-hover)] bg-slate-900/50 text-sm text-slate-300 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/50 border border-[var(--border-color)] focus:border-blue-500/30 focus:outline-none text-sm text-slate-300 placeholder:text-slate-600 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {entitiesQuery.isLoading ? (
        <div className="glass-card p-4"><TableSkeleton rows={10} cols={6} /></div>
      ) : entitiesQuery.isError ? (
        <ErrorState message="Failed to load entities" onRetry={() => entitiesQuery.refetch()} />
      ) : filteredWallets.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No Entities Found"
          description={search ? 'Try adjusting your search.' : 'No entities available for this dataset.'}
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Address</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">TX Count</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total In</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total Out</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Level</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Community</th>
                </tr>
              </thead>
              <tbody>
                {filteredWallets.map((w) => (
                  <tr
                    key={w.address}
                    onClick={() => navigate(`/investigations/${w.address}`)}
                    className="border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">{truncateAddress(w.address)}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{w.transaction_count}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{formatBTC(w.total_in)}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{formatBTC(w.total_out)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-white">{formatRiskScore(w.risk_score)}</td>
                    <td className="px-5 py-3"><RiskBadge level={w.risk_level} /></td>
                    <td className="px-5 py-3 text-right text-xs text-slate-500">{w.community_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-color)]">
            <span className="text-xs text-slate-500">
              Page {page + 1} • Showing {filteredWallets.length} results
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={wallets.length < PAGE_SIZE}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
