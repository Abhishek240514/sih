import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Wallet,
  Globe,
  MapPin,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useDashboardSummary, useRiskDistribution, useTransactionVolume, useTopAlerts, useTopWallets } from '@/hooks/useDashboard';
import { useDataset } from '@/context/DatasetContext';
import { StatCard } from '@/components/shared/StatCard';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { CardSkeleton, TableSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatNumber, formatRiskScore, truncateAddress, formatTimestamp } from '@/lib/utils';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#10b981',
};

const VOLUME_PRESETS = [
  { label: '24h', buckets: 24 },
  { label: '7d', buckets: 168 },
  { label: '30d', buckets: 30 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeDatasetId } = useDataset();
  const [volumeBuckets, setVolumeBuckets] = useState(24);

  const summaryQuery = useDashboardSummary();
  const riskQuery = useRiskDistribution();
  const volumeQuery = useTransactionVolume(volumeBuckets);
  const topAlertsQuery = useTopAlerts(5);
  const topWalletsQuery = useTopWallets(5);

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={<Database className="w-16 h-16" />}
        title="No Dataset Selected"
        description="Upload and process a dataset to start analyzing Bitcoin transactions."
        action={
          <button
            onClick={() => navigate('/datasets')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Go to Datasets
          </button>
        }
      />
    );
  }

  const summary = summaryQuery.data;
  const riskData = riskQuery.data?.distribution
    ? Object.entries(riskQuery.data.distribution).map(([name, value]) => ({ name, value }))
    : [];
  const volumeData = (volumeQuery.data?.volume || []).map((v: any) => {
    const d = new Date(v.timestamp);
    return {
      ...v,
      bucket: `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Bitcoin Forensic Intelligence Overview</p>
      </div>

      {/* Stats Cards */}
      {summaryQuery.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : summaryQuery.isError ? (
        <ErrorState message="Failed to load summary" onRetry={() => summaryQuery.refetch()} />
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={<ArrowRightLeft className="w-5 h-5" />} label="Transactions" value={formatNumber(summary.transactions)} iconColor="text-blue-400" />
          <StatCard icon={<Wallet className="w-5 h-5" />} label="Wallets" value={formatNumber(summary.wallets)} iconColor="text-purple-400" />
          <StatCard icon={<Globe className="w-5 h-5" />} label="IPs" value={formatNumber(summary.ips)} iconColor="text-cyan-400" />
          <StatCard icon={<MapPin className="w-5 h-5" />} label="Countries" value={formatNumber(summary.countries)} iconColor="text-amber-400" />
          <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Total Alerts" value={formatNumber(summary.alerts)} iconColor="text-orange-400" />
          <StatCard icon={<ShieldAlert className="w-5 h-5" />} label="Critical/High" value={`${summary.critical_alerts}/${summary.high_alerts}`} iconColor="text-red-400" />
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Risk Distribution</h3>
          {riskQuery.isLoading ? (
            <div className="h-48 animate-shimmer rounded-lg" />
          ) : riskData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1a1f2e',
                      border: '1px solid #2a3041',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-xs">
                {riskData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[entry.name] }} />
                    <span className="text-slate-400">{entry.name}</span>
                    <span className="text-white font-medium ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No data</p>
          )}
        </div>

        {/* Transaction Volume */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Transaction Volume</h3>
            <div className="flex gap-1">
              {VOLUME_PRESETS.map(({ label, buckets }) => (
                <button
                  key={label}
                  onClick={() => setVolumeBuckets(buckets)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    volumeBuckets === buckets
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {volumeQuery.isLoading ? (
            <div className="h-48 animate-shimmer rounded-lg" />
          ) : volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1a1f2e',
                    border: '1px solid #2a3041',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Area type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} fill="url(#volumeGradient)" name="Volume (BTC)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No volume data</p>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Alerts */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-slate-300">Top Alerts</h3>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View All →
            </button>
          </div>
          {topAlertsQuery.isLoading ? (
            <div className="p-4"><TableSkeleton rows={5} cols={4} /></div>
          ) : topAlertsQuery.data?.alerts?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entity</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Level</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {topAlertsQuery.data.alerts.map((alert) => (
                    <tr
                      key={alert.alert_id}
                      onClick={() => navigate(`/investigations/${alert.entity_id}`)}
                      className="border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">{truncateAddress(alert.entity_id)}</td>
                      <td className="px-5 py-3 font-semibold text-white">{formatRiskScore(alert.risk_score)}</td>
                      <td className="px-5 py-3"><RiskBadge level={alert.risk_level} /></td>
                      <td className="px-5 py-3 text-xs text-slate-500">{formatTimestamp(alert.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No alerts</p>
          )}
        </div>

        {/* Top Wallets */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-slate-300">Top Wallets</h3>
            <button
              onClick={() => navigate('/entities')}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View All →
            </button>
          </div>
          {topWalletsQuery.isLoading ? (
            <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
          ) : topWalletsQuery.data?.wallets?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Address</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">TXs</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Volume</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {topWalletsQuery.data.wallets.map((w: any) => (
                    <tr
                      key={w.address}
                      onClick={() => navigate(`/investigations/${w.address}`)}
                      className="border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">{truncateAddress(w.address)}</td>
                      <td className="px-5 py-3 text-slate-300">{w.transaction_count}</td>
                      <td className="px-5 py-3 text-slate-300">{(w.total_in + w.total_out).toFixed(2)}</td>
                      <td className="px-5 py-3 font-semibold text-white">{formatRiskScore(w.risk_score)}</td>
                      <td className="px-5 py-3"><RiskBadge level={w.risk_level} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No wallets</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Database(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
  );
}
