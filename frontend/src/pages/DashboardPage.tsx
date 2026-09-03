import { useGetDashboardSummaryQuery, useGetTopAlertsQuery, useGetDashboardTopWalletsQuery, useGetRiskDistributionQuery, useGetTransactionVolumeQuery } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { RiskDistributionChart } from '@/components/charts/RiskDistributionChart';
import { TransactionVolumeChart } from '@/components/charts/TransactionVolumeChart';
import { DataTable } from '@/components/ui/DataTable';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { formatNumber, formatCurrency, formatRelativeTime, truncateAddress } from '@/lib/utils';
import { Alert, Wallet } from '@/types';
import { useDataset } from '@/context/DatasetContext';

export function DashboardPage() {
  const { datasetId } = useDataset();

  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummaryQuery(
    { dataset_id: datasetId! },
    { enabled: !!datasetId }
  );
  const { data: topAlerts } = useGetTopAlertsQuery(
    { dataset_id: datasetId!, limit: 5 },
    { enabled: !!datasetId }
  );
  const { data: topWallets } = useGetDashboardTopWalletsQuery(
    { dataset_id: datasetId!, limit: 5 },
    { enabled: !!datasetId }
  );
  const { data: riskDist } = useGetRiskDistributionQuery(
    { dataset_id: datasetId! },
    { enabled: !!datasetId }
  );
  const { data: volume } = useGetTransactionVolumeQuery(
    { dataset_id: datasetId!, buckets: 24 },
    { enabled: !!datasetId }
  );

  if (!datasetId) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-xl font-medium">Select a dataset to view dashboard</p>
      </div>
    );
  }

  const alertColumns = [
    { key: 'entity_id', header: 'Entity', render: (_, v: string) => <span className="font-mono text-sm">{truncateAddress(v)}</span> },
    { key: 'risk_score', header: 'Risk', render: (_, v: number) => <span className="font-mono font-medium">{(v * 100).toFixed(1)}%</span> },
    { key: 'risk_level', header: 'Level', render: (_, v: string) => <RiskBadge level={v as any} size="sm" /> },
    { key: 'timestamp', header: 'Time', render: (_, v: string) => <span className="text-gray-600">{formatRelativeTime(v)}</span> },
  ];

  const walletColumns = [
    { key: 'address', header: 'Address', render: (_, v: string) => <span className="font-mono text-sm">{truncateAddress(v)}</span> },
    { key: 'transaction_count', header: 'TXs', render: (_, v: number) => <span className="font-mono">{formatNumber(v)}</span> },
    { key: 'total_in', header: 'Total In', render: (_, v: number) => <span className="font-mono">{formatCurrency(v)}</span> },
    { key: 'total_out', header: 'Total Out', render: (_, v: number) => <span className="font-mono">{formatCurrency(v)}</span> },
    { key: 'risk_score', header: 'Risk', render: (_, v: number) => <span className="font-mono font-medium">{(v * 100).toFixed(1)}%</span> },
    { key: 'risk_level', header: 'Level', render: (_, v: string) => <RiskBadge level={v as any} size="sm" /> },
  ];

  if (summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton-card" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton-card" style={{height: '256px'}} />
          <div className="skeleton-card" style={{height: '256px'}} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-sm text-gray-500">Dataset: {datasetId?.slice(0, 8)}...</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Transactions" value={summary.transactions} icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>} />
        <StatCard title="Wallets" value={summary.wallets} icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
        <StatCard title="Alerts" value={summary.alerts} change={`${summary.critical_alerts} critical`} changeType="negative" icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        <StatCard title="Countries" value={summary.countries} icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <RiskDistributionChart data={riskDist?.distribution || {}} />
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Volume (24h)</h3>
          <TransactionVolumeChart data={volume?.volume || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Top Alerts</h3>
            <a href="/alerts" className="text-sm text-primary hover:underline">View all</a>
          </div>
          <DataTable
            data={topAlerts?.alerts || []}
            columns={alertColumns}
            keyExtractor={a => a.alert_id}
            emptyMessage="No alerts found"
            showPagination={false}
          />
        </div>
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Top Risky Wallets</h3>
            <a href="/entities" className="text-sm text-primary hover:underline">View all</a>
          </div>
          <DataTable
            data={topWallets?.wallets || []}
            columns={walletColumns}
            keyExtractor={w => w.address}
            emptyMessage="No wallets found"
            showPagination={false}
          />
        </div>
      </div>
    </div>
  );
}
