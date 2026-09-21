import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntities } from '@/hooks/useEntities';
import { useDataset } from '@/context/DatasetContext';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { truncateAddress, formatRiskScore, formatBTC, toCSV, downloadFile } from '@/lib/utils';
import { Users, Download, Search, X } from 'lucide-react';

const PAGE_SIZE = 20;

export default function Entities() {
  const navigate = useNavigate();
  const { activeDatasetId } = useDataset();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const entitiesQuery = useEntities(page * PAGE_SIZE, PAGE_SIZE);

  const wallets: any[] = Array.isArray(entitiesQuery.data)
    ? entitiesQuery.data
    : (entitiesQuery.data as any)?.wallets || [];
  const filteredWallets = search
    ? wallets.filter((w: any) => w.address.toLowerCase().includes(search.toLowerCase()))
    : wallets;

  const handleExport = () => {
    if (!filteredWallets.length) return;
    const data = filteredWallets.map((w: any) => ({
      address: w.address,
      transaction_count: w.transaction_count,
      total_in: w.total_in,
      total_out: w.total_out,
      risk_score: formatRiskScore(w.risk_score),
      risk_level: w.risk_level,
      community_id: w.community_id,
    }));
    downloadFile(toCSV(data), `entities_export_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!activeDatasetId) {
    return (
      <div className="glass-card animate-fade-in" style={{ minHeight: 400 }}>
        <EmptyState
          icon={<Users style={{ width: 28, height: 28 }} />}
          title="No Dataset Selected"
          description="Select a processed dataset to browse wallet entities."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Entities</h1>
          <p className="page-subtitle">Browse and search Bitcoin wallet entities</p>
        </div>
        <button className="btn-secondary" onClick={handleExport}>
          <Download style={{ width: 14, height: 14 }} />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="glass-card" style={{ padding: 14 }}>
        <div style={{ position: 'relative', maxWidth: 440 }}>
          <Search
            style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              width: 15, height: 15, color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search by wallet address..."
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
      </div>

      {/* Table */}
      {entitiesQuery.isLoading ? (
        <div className="glass-card" style={{ padding: 20 }}>
          <TableSkeleton rows={10} cols={7} />
        </div>
      ) : entitiesQuery.isError ? (
        <ErrorState message="Failed to load entities" onRetry={() => entitiesQuery.refetch()} />
      ) : filteredWallets.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={<Users style={{ width: 28, height: 28 }} />}
            title="No Entities Found"
            description={search ? 'Try adjusting your search.' : 'No entities available for this dataset.'}
          />
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Wallet Address</th>
                  <th style={{ textAlign: 'right' }}>TX Count</th>
                  <th style={{ textAlign: 'right' }}>Total In</th>
                  <th style={{ textAlign: 'right' }}>Total Out</th>
                  <th style={{ textAlign: 'right' }}>Risk Score</th>
                  <th>Risk Level</th>
                  <th style={{ textAlign: 'right' }}>Community</th>
                </tr>
              </thead>
              <tbody>
                {filteredWallets.map((w: any) => (
                  <tr
                    key={w.address}
                    className="clickable"
                    onClick={() => navigate(`/investigations/${w.address}`)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,124,249,0.08)', border: '1px solid rgba(59,124,249,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                          </svg>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--text-secondary)' }}>
                          {truncateAddress(w.address)}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13 }}>
                      {w.transaction_count?.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: '#10d98a', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                      {formatBTC(w.total_in)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#ff8c00', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                      {formatBTC(w.total_out)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13.5 }}>
                        {formatRiskScore(w.risk_score)}
                      </span>
                    </td>
                    <td><RiskBadge level={w.risk_level} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {w.community_id ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Page {page + 1} &middot; {filteredWallets.length} records
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
                disabled={wallets.length < PAGE_SIZE}
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
