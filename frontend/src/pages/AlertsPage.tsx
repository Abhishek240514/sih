import { useState, useMemo } from 'react';
import { useGetAlertsQuery, useGetAlertStatsQuery } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { formatRelativeTime, truncateAddress, formatNumber } from '@/lib/utils';
import { Alert } from '@/types';
import { useDataset } from '@/context/DatasetContext';

export function AlertsPage() {
  const { datasetId } = useDataset();
  const [riskFilter, setRiskFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: alertsData, isLoading } = useGetAlertsQuery(
    { dataset_id: datasetId!, skip: (currentPage - 1) * pageSize, limit: pageSize, risk_level: riskFilter.join(',') || undefined },
    { enabled: !!datasetId }
  );
  const { data: stats } = useGetAlertStatsQuery(
    { dataset_id: datasetId! },
    { enabled: !!datasetId }
  );

  const filteredAlerts = useMemo(() => {
    if (!alertsData?.alerts) return [];
    return alertsData.alerts.filter(alert => {
      if (search && !alert.entity_id.toLowerCase().includes(search.toLowerCase()) &&
          !alert.alert_id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [alertsData, search]);

  const riskLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

  const columns = [
    { key: 'alert_id', header: 'Alert ID', render: (_, v: string) => <span className="font-mono text-xs">{truncateAddress(v, 6)}</span>, className: 'max-w-[150px]' },
    { key: 'entity_id', header: 'Entity', render: (_, v: string) => <span className="font-mono text-sm">{truncateAddress(v)}</span> },
    { key: 'risk_score', header: 'Risk Score', render: (_, v: number) => <span className="font-mono font-medium">{(v * 100).toFixed(1)}%</span> },
    { key: 'risk_level', header: 'Level', render: (_, v: string) => <RiskBadge level={v as any} size="sm" /> },
    { key: 'timestamp', header: 'Time', render: (_, v: string) => <span className="text-gray-600">{formatRelativeTime(v)}</span> },
  ];

  if (!datasetId) {
    return <div className="p-8 text-center text-gray-500">Select a dataset</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Alert Triage</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
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
      </div>

      <div className="flex gap-6 text-sm text-gray-600">
        {stats && riskLevels.map(level => (
          <span key={level} className={`px-3 py-1 rounded-full ${getRiskLevelColor(level)}`}>
            {level}: {stats.by_level[level] || 0}
          </span>
        ))}
      </div>

      <DataTable
        data={filteredAlerts}
        columns={[
          { key: 'alert_id', header: 'Alert ID', render: (_, v: string) => <span className="font-mono text-xs">{truncateAddress(v, 6)}</span>, className: 'max-w-[150px]' },
          { key: 'entity_id', header: 'Entity', render: (_, v: string) => <span className="font-mono text-sm">{truncateAddress(v)}</span>, onRowClick: true },
          { key: 'entity_type', header: 'Type', render: (_, v: string) => <span className="text-gray-600 capitalize">{v}</span> },
          { key: 'risk_score', header: 'Risk', render: (_, v: number) => <span className="font-mono font-medium">{(v * 100).toFixed(1)}%</span>, sortable: true },
          { key: 'risk_level', header: 'Level', render: (_, v: string) => <RiskBadge level={v as any} size="sm" />, sortable: true },
          { key: 'related_transactions.length', header: 'Related TXs', render: (row: Alert) => <span className="text-gray-600">{row.related_transactions?.length || 0}</span> },
          { key: 'related_wallets.length', header: 'Related Wallets', render: (row: Alert) => <span className="text-gray-600">{row.related_wallets?.length || 0}</span> },
          { key: 'timestamp', header: 'Detected', render: (_, v: string) => <span className="text-gray-600">{formatRelativeTime(v)}</span>, sortable: true },
        ]}
        keyExtractor={a => a.alert_id}
        onRowClick={(alert) => window.location.href = `/investigations/${alert.entity_id}`}
        loading={isLoading}
        emptyMessage="No alerts found"
        pageSize={pageSize}
        showPagination={true}
      />
    </div>
  );
}

function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return 'bg-red-100 text-red-800';
    case 'HIGH': return 'bg-orange-100 text-orange-800';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
    case 'LOW': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}