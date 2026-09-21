import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, X, AlertTriangle } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { useDataset } from '@/context/DatasetContext';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { truncateAddress, formatRiskScore, formatTimestamp, toCSV, downloadFile } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types';

const RISK_LEVELS: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const PAGE_SIZE = 20;

const RISK_FILTER_COLORS: Record<string, { active: string; bg: string; border: string }> = {
  CRITICAL: { active: '#ff3d55', bg: 'rgba(255,61,85,0.12)', border: 'rgba(255,61,85,0.25)' },
  HIGH: { active: '#ff8c00', bg: 'rgba(255,140,0,0.12)', border: 'rgba(255,140,0,0.25)' },
  MEDIUM: { active: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' },
  LOW: { active: '#10d98a', bg: 'rgba(16,217,138,0.10)', border: 'rgba(16,217,138,0.22)' },
};

export default function Alerts() {
  const navigate = useNavigate();
  const { activeDatasetId } = useDataset();
  const [page, setPage] = useState(0);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const alertsQuery = useAlerts(page * PAGE_SIZE, PAGE_SIZE, riskFilter);
  const alerts: any[] = Array.isArray(alertsQuery.data)
    ? alertsQuery.data
    : (alertsQuery.data as any)?.alerts || [];
  const filteredAlerts = search
    ? alerts.filter(
        (a: any) =>
          a.alert_id.toLowerCase().includes(search.toLowerCase()) ||
          a.entity_id.toLowerCase().includes(search.toLowerCase()),
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
    downloadFile(toCSV(data), `alerts_export_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!activeDatasetId) {
    return (
      <div className="glass-card animate-fade-in" style={{ minHeight: 400 }}>
        <EmptyState
          icon={<AlertTriangle style={{ width: 28, height: 28 }} />}
          title="No Dataset Selected"
          description="Select a processed dataset to view alerts."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Alert Triage</h1>
          <p className="page-subtitle">Review, filter, and investigate threat alerts</p>
        </div>
        <button className="btn-secondary" onClick={handleExportCSV}>
          <Download style={{ width: 14, height: 14 }} />
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
            <Search
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                width: 15, height: 15, color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by Alert ID or Entity Address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 38, paddingRight: search ? 36 : 14 }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: showFilters || riskFilter
                ? '1px solid rgba(59, 124, 249, 0.3)'
                : '1px solid var(--border-color)',
              background: showFilters || riskFilter
                ? 'rgba(59, 124, 249, 0.08)'
                : 'rgba(99, 155, 255, 0.04)',
              color: showFilters || riskFilter ? 'var(--accent-blue)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            <Filter style={{ width: 14, height: 14 }} />
            Filters
            {riskFilter && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)' }} />
            )}
          </button>

          {/* Count badge */}
          {filteredAlerts.length > 0 && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 600,
                background: 'rgba(99, 155, 255, 0.08)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                letterSpacing: '0.03em',
              }}
            >
              {filteredAlerts.length} results
            </span>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div
            className="animate-slide-in-down"
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Risk Level:
            </span>
            <button
              onClick={() => { setRiskFilter(undefined); setPage(0); }}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                border: !riskFilter ? '1px solid rgba(59, 124, 249, 0.3)' : '1px solid var(--border-color)',
                background: !riskFilter ? 'rgba(59, 124, 249, 0.12)' : 'transparent',
                color: !riskFilter ? 'var(--accent-blue)' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              All
            </button>
            {RISK_LEVELS.map((level) => {
              const c = RISK_FILTER_COLORS[level];
              const isActive = riskFilter === level;
              return (
                <button
                  key={level}
                  onClick={() => { setRiskFilter(level); setPage(0); }}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: isActive ? `1px solid ${c.border}` : '1px solid var(--border-color)',
                    background: isActive ? c.bg : 'transparent',
                    color: isActive ? c.active : 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {level}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Table */}
      {alertsQuery.isLoading ? (
        <div className="glass-card" style={{ padding: 20 }}>
          <TableSkeleton rows={10} cols={7} />
        </div>
      ) : alertsQuery.isError ? (
        <ErrorState message="Failed to load alerts" onRetry={() => alertsQuery.refetch()} />
      ) : filteredAlerts.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={<Filter style={{ width: 28, height: 28 }} />}
            title="No Alerts Found"
            description={
              search || riskFilter
                ? 'Try adjusting your search or filters.'
                : 'No alerts have been generated for this dataset.'
            }
          />
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Entity Address</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                  <th>Level</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Reasons</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert: any) => (
                  <tr
                    key={alert.alert_id}
                    className="clickable"
                    onClick={() => navigate(`/investigations/${alert.entity_id}`)}
                  >
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-muted)' }}>
                        {truncateAddress(alert.alert_id, 6)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        {truncateAddress(alert.entity_id)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {alert.entity_type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13.5 }}>
                        {formatRiskScore(alert.risk_score)}
                      </span>
                    </td>
                    <td><RiskBadge level={alert.risk_level} /></td>
                    <td>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 22,
                          height: 22,
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'rgba(99, 155, 255, 0.1)',
                          color: 'var(--accent-blue)',
                        }}
                      >
                        {alert.reasons.length}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Page {page + 1} &middot; {filteredAlerts.length} records
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="pagination-btn"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                ← Previous
              </button>
              <button
                className="pagination-btn"
                onClick={() => setPage(page + 1)}
                disabled={alerts.length < PAGE_SIZE}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
