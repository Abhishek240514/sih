import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowRightLeft,
  Wallet,
  Globe,
  MapPin,
  AlertTriangle,
  ShieldAlert,
  Database,
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

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ff3d55',
  HIGH: '#ff8c00',
  MEDIUM: '#fbbf24',
  LOW: '#10d98a',
};

const VOLUME_PRESETS = [
  { label: '24h', buckets: 24 },
  { label: '7d', buckets: 168 },
  { label: '30d', buckets: 30 },
];

const CHART_STYLE = {
  background: '#060e1e',
  border: '1px solid rgba(99, 155, 255, 0.1)',
  borderRadius: '10px',
  fontSize: '12px',
  color: '#f0f6ff',
  padding: '8px 12px',
};

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
      <div className="glass-card animate-fade-in" style={{ minHeight: 400 }}>
        <EmptyState
          icon={<Database style={{ width: 32, height: 32 }} />}
          title="No Dataset Selected"
          description="Upload and process a Bitcoin transaction dataset to start your forensic analysis."
          action={
            <button className="btn-primary" onClick={() => navigate('/datasets')}>
              <Database style={{ width: 15, height: 15 }} />
              Go to Datasets
            </button>
          }
        />
      </div>
    );
  }

  const summary = summaryQuery.data;
  const riskData = riskQuery.data?.distribution
    ? Object.entries(riskQuery.data.distribution)
        .filter(([, v]) => (v as number) > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const volumeData = (volumeQuery.data?.volume || []).map((v: any) => {
    const d = new Date(v.timestamp);
    return {
      ...v,
      bucket: `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}h`,
    };
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Intelligence Dashboard</h1>
          <p className="page-subtitle">Real-time Bitcoin forensic analysis overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(59, 124, 249, 0.1)',
              color: 'var(--accent-blue)',
              border: '1px solid rgba(59, 124, 249, 0.2)',
              letterSpacing: '0.04em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            DATASET: {activeDatasetId.slice(0, 16)}...
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      {summaryQuery.isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : summaryQuery.isError ? (
        <ErrorState message="Failed to load summary statistics" onRetry={() => summaryQuery.refetch()} />
      ) : summary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}
          className="md:grid-cols-3 lg:grid-cols-6"
        >
          <StatCard
            icon={<ArrowRightLeft style={{ width: 18, height: 18 }} />}
            label="Transactions"
            value={formatNumber(summary.transactions)}
            accentColor="#3b7cf9"
            iconBg="rgba(59, 124, 249, 0.12)"
          />
          <StatCard
            icon={<Wallet style={{ width: 18, height: 18 }} />}
            label="Wallets"
            value={formatNumber(summary.wallets)}
            accentColor="#9b5cf6"
            iconBg="rgba(155, 92, 246, 0.12)"
          />
          <StatCard
            icon={<Globe style={{ width: 18, height: 18 }} />}
            label="IP Addresses"
            value={formatNumber(summary.ips)}
            accentColor="#06d6f0"
            iconBg="rgba(6, 214, 240, 0.10)"
          />
          <StatCard
            icon={<MapPin style={{ width: 18, height: 18 }} />}
            label="Countries"
            value={formatNumber(summary.countries)}
            accentColor="#f59e0b"
            iconBg="rgba(245, 158, 11, 0.12)"
          />
          <StatCard
            icon={<AlertTriangle style={{ width: 18, height: 18 }} />}
            label="Total Alerts"
            value={formatNumber(summary.alerts)}
            accentColor="#ff8c00"
            iconBg="rgba(255, 140, 0, 0.12)"
          />
          <StatCard
            icon={<ShieldAlert style={{ width: 18, height: 18 }} />}
            label="Critical / High"
            value={`${summary.critical_alerts} / ${summary.high_alerts}`}
            accentColor="#ff3d55"
            iconBg="rgba(255, 61, 85, 0.10)"
          />
        </div>
      ) : null}

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Risk Distribution Donut */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Risk Distribution</h3>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>Wallet risk level breakdown</p>
          </div>
          {riskQuery.isLoading ? (
            <div className="animate-shimmer rounded-xl" style={{ height: 200 }} />
          ) : riskData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {riskData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={RISK_COLORS[entry.name] || '#4a6280'}
                        style={{ filter: `drop-shadow(0 0 6px ${RISK_COLORS[entry.name] || '#4a6280'}60)` }}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                {riskData.map((entry) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[entry.name] || '#4a6280', boxShadow: `0 0 6px ${RISK_COLORS[entry.name]}60` }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{entry.value as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>No data available</p>
          )}
        </div>

        {/* Transaction Volume Chart */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Transaction Volume</h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>BTC flow over time</p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {VOLUME_PRESETS.map(({ label, buckets }) => (
                <button
                  key={label}
                  onClick={() => setVolumeBuckets(buckets)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s ease',
                    background: volumeBuckets === buckets
                      ? 'rgba(59, 124, 249, 0.2)'
                      : 'transparent',
                    color: volumeBuckets === buckets
                      ? 'var(--accent-blue)'
                      : 'var(--text-muted)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {volumeQuery.isLoading ? (
            <div className="animate-shimmer rounded-xl" style={{ height: 200 }} />
          ) : volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={volumeData} margin={{ left: -20, right: 4 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b7cf9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b7cf9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 155, 255, 0.05)" />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 10, fill: '#4a6280' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#4a6280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={CHART_STYLE} />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#3b7cf9"
                  strokeWidth={2}
                  fill="url(#volGrad)"
                  name="Volume (BTC)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b7cf9', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
              No volume data available
            </p>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top Alerts */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3d55', boxShadow: '0 0 8px rgba(255,61,85,0.6)' }} />
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Top Alerts</h3>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              View All →
            </button>
          </div>
          {topAlertsQuery.isLoading ? (
            <div style={{ padding: 16 }}><TableSkeleton rows={5} cols={4} /></div>
          ) : topAlertsQuery.data?.alerts?.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Score</th>
                  <th>Level</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {topAlertsQuery.data.alerts.map((alert: any) => (
                  <tr
                    key={alert.alert_id}
                    className="clickable"
                    onClick={() => navigate(`/investigations/${alert.entity_id}`)}
                  >
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        {truncateAddress(alert.entity_id)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                        {formatRiskScore(alert.risk_score)}
                      </span>
                    </td>
                    <td><RiskBadge level={alert.risk_level} /></td>
                    <td>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
              No alerts generated
            </p>
          )}
        </div>

        {/* Top Wallets */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9b5cf6', boxShadow: '0 0 8px rgba(155,92,246,0.6)' }} />
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>High-Risk Wallets</h3>
            </div>
            <button
              onClick={() => navigate('/entities')}
              style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              View All →
            </button>
          </div>
          {topWalletsQuery.isLoading ? (
            <div style={{ padding: 16 }}><TableSkeleton rows={5} cols={5} /></div>
          ) : topWalletsQuery.data?.wallets?.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th style={{ textAlign: 'right' }}>TXs</th>
                  <th style={{ textAlign: 'right' }}>Volume</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {topWalletsQuery.data.wallets.map((w: any) => (
                  <tr
                    key={w.address}
                    className="clickable"
                    onClick={() => navigate(`/investigations/${w.address}`)}
                  >
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        {truncateAddress(w.address)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 12.5 }}>
                      {w.transaction_count}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 12.5 }}>
                      {(w.total_in + w.total_out).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                        {formatRiskScore(w.risk_score)}
                      </span>
                    </td>
                    <td><RiskBadge level={w.risk_level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
              No wallet data
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
