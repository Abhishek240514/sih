import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, X } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { useDataset } from '@/context/DatasetContext';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { truncateAddress, formatRiskScore, formatTimestamp, cn, toCSV, downloadFile } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types';

const RISK_LEVELS: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const PAGE_SIZE = 20;

export default function Alerts() {
  const navigate = useNavigate();
  const { activeDatasetId } = useDataset();
  const [page, setPage] = useState(0);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const alertsQuery = useAlerts(page * PAGE_SIZE, PAGE_SIZE, riskFilter);
  const alerts: any[] = Array.isArray(alertsQuery.data) ? alertsQuery.data : (alertsQuery.data as any)?.alerts || [];
  const filteredAlerts = search
    ? alerts.filter(
        (a: any) =>
          a.alert_id.toLowerCase().includes(search.toLowerCase()) ||
          a.entity_id.toLowerCase().includes(search.toLowerCase())
      )
    : alerts;

  const handleExportCSV = () => {
    if (!filteredAlerts.length) return;
    const data = filteredAlerts.map((a: any) => ({
      alert_id: a.alert_id,
      entity_id: a.entity_id,
      entity_type: a.entity_type,
      risk_score: formatRiskScore(a.risk_score),
      risk_level: a.risk_level,
      timestamp: a.timestamp,
      reasons_count: a.reasons.length,
    }));
    const csv = toCSV(data);
    downloadFile(csv, `alerts_export_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={<Filter className="w-16 h-16" />}
        title="No Dataset Selected"
        description="Select a processed dataset to view alerts."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alert Triage</h1>
          <p className="text-sm text-slate-500 mt-1">Review and prioritize threat alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-color)] hover:border-[var(--border-hover)] bg-slate-900/50 text-sm text-slate-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Alert ID or Address..."
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

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors',
              showFilters || riskFilter
                ? 'border-blue-500/30 bg-blue-500/5 text-blue-400'
                : 'border-[var(--border-color)] text-slate-400 hover:text-slate-300'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {riskFilter && (
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center gap-2 animate-fade-in">
            <span className="text-xs text-slate-500 mr-2">Risk Level:</span>
            <button
              onClick={() => { setRiskFilter(undefined); setPage(0); }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                !riskFilter ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              All
            </button>
            {RISK_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => { setRiskFilter(level); setPage(0); }}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  riskFilter === level ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {alertsQuery.isLoading ? (
        <div className="glass-card p-4"><TableSkeleton rows={10} cols={6} /></div>
      ) : alertsQuery.isError ? (
        <ErrorState message="Failed to load alerts" onRetry={() => alertsQuery.refetch()} />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          icon={<Filter className="w-12 h-12" />}
          title="No Alerts Found"
          description={search || riskFilter ? 'Try adjusting your filters.' : 'No alerts have been generated for this dataset.'}
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Alert ID</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entity</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Level</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reasons</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert: any) => (
                  <tr
                    key={alert.alert_id}
                    onClick={() => navigate(`/investigations/${alert.entity_id}`)}
                    className="border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{truncateAddress(alert.alert_id, 6)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">{truncateAddress(alert.entity_id)}</td>
                    <td className="px-5 py-3 text-xs text-slate-400 capitalize">{alert.entity_type}</td>
                    <td className="px-5 py-3 font-semibold text-white">{formatRiskScore(alert.risk_score)}</td>
                    <td className="px-5 py-3"><RiskBadge level={alert.risk_level} /></td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatTimestamp(alert.timestamp)}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{alert.reasons.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-color)]">
            <span className="text-xs text-slate-500">
              Page {page + 1} • Showing {filteredAlerts.length} results
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
                disabled={alerts.length < PAGE_SIZE}
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
