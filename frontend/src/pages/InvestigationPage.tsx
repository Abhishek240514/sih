import { useState } from 'react';
import { useGetInvestigationQuery, useGetEntityGraphQuery } from '@/lib/api';
import { GraphVisualization } from '@/components/graph/GraphVisualization';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { DataTable } from '@/components/ui/DataTable';
import { formatNumber, formatCurrency, formatRelativeTime, formatTimestamp, truncateAddress } from '@/lib/utils';
import { AlertReason, CorrelationEvidence, Wallet } from '@/types';
import { useParams, useSearchParams } from 'react-router-dom';
import { useDataset } from '@/context/DatasetContext';

export function InvestigationPage() {
  const { entityId } = useParams<{ entityId: string }>();
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset_id');
  const [activeTab, setActiveTab] = useState<'profile' | 'timeline' | 'flow' | 'graph' | 'evidence'>('profile');
  const [graphDepth, setGraphDepth] = useState(2);

  const { data: investigation, isLoading: invLoading } = useGetInvestigationQuery(
    { entity_id: entityId!, dataset_id: datasetId! },
    { enabled: !!entityId && !!datasetId }
  );

  const { data: graphData } = useGetEntityGraphQuery(
    { entity_id: entityId!, dataset_id: datasetId!, depth: graphDepth, max_nodes: 100, max_edges: 200 },
    { enabled: !!entityId && !!datasetId && activeTab === 'graph' }
  );

  if (!datasetId) return <div className="p-8 text-center text-gray-500">Select a dataset</div>;
  if (!entityId) return <div className="p-8 text-center text-gray-500">No entity selected</div>;

  if (invLoading) {
    return <div className="p-8 text-center">Loading investigation...</div>;
  }

  if (!investigation) {
    return <div className="p-8 text-center text-red-600">Investigation not found</div>;
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'flow', label: 'Flow', icon: '🔄' },
    { id: 'graph', label: 'Graph', icon: '🕸️' },
    { id: 'evidence', label: 'Evidence', icon: '🔍' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investigation</h1>
          <p className="text-sm text-gray-500 font-mono">{truncateAddress(entityId, 12)}</p>
        </div>
        <div className="flex items-center gap-4">
          <RiskBadge level={investigation.risk_level} size="lg" />
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 px-4" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4">
        {activeTab === 'profile' && <ProfileTab investigation={investigation} />}
        {activeTab === 'timeline' && <TimelineTab investigation={investigation} />}
        {activeTab === 'flow' && <FlowTab investigation={investigation} />}
        {activeTab === 'graph' && <GraphTab graphData={graphData} depth={graphDepth} setDepth={setGraphDepth} />}
        {activeTab === 'evidence' && <EvidenceTab investigation={investigation} />}
      </div>
    </div>
  );
}

function ProfileTab({ investigation }: { investigation: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Entity Profile</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-sm text-gray-500">Address</dt><dd className="font-mono text-sm mt-1 truncate">{investigation.entity_id}</dd></div>
            <div><dt className="text-sm text-gray-500">Risk Score</dt><dd className="font-mono font-semibold text-lg mt-1">{(investigation.risk_score * 100).toFixed(1)}%</dd></div>
            <div><dt className="text-sm text-gray-500">Risk Level</dt><dd className="mt-1"><RiskBadge level={investigation.risk_level} size="md" /></dd></div>
            <div><dt className="text-sm text-gray-500">Type</dt><dd className="mt-1 capitalize">{investigation.entity_type}</dd></div>
            <div><dt className="text-sm text-gray-500">Transaction Count</dt><dd className="mt-1 font-mono">{formatNumber(investigation.related_transactions?.length || 0)}</dd></div>
            <div><dt className="text-sm text-gray-500">Unique Counterparties</dt><dd className="mt-1 font-mono">{formatNumber(investigation.related_wallets?.length || 0)}</dd></div>
            <div><dt className="text-sm text-gray-500">Unique IPs</dt><dd className="mt-1 font-mono">{formatNumber(investigation.related_ips?.length || 0)}</dd></div>
            <div><dt className="text-sm text-gray-500">Unique ASNs</dt><dd className="mt-1 font-mono">{formatNumber(investigation.related_asns?.length || 0)}</dd></div>
            <div><dt className="text-sm text-gray-500">Countries</dt><dd className="mt-1">{investigation.countries?.join(', ') || 'None'}</dd></div>
          </dl>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Explanations</h3>
          {investigation.reasons?.length ? (
            <div className="space-y-3">
              {investigation.reasons.map((reason: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg border-l-4 border-primary">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getEvidenceTypeIcon(reason.evidence_type)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{reason.signal}</div>
                      <div className="text-sm text-gray-600 mt-1">{reason.description}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">{reason.evidence_type}</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">Contribution: {(reason.contribution * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No explanation data available</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Wallets</h3>
          <DataTable
            data={investigation.related_wallets?.slice(0, 10) || []}
            columns={[
              { key: 'address', header: 'Address', render: (_, v: string) => <span className="font-mono text-sm">{truncateAddress(v)}</span> },
            ]}
            keyExtractor={v => v}
            emptyMessage="No related wallets"
            showPagination={false}
          />
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Related IPs</h3>
          <DataTable
            data={investigation.related_ips?.slice(0, 10) || []}
            columns={[
              { key: 'ip', header: 'IP Address', render: (_, v: string) => <span className="font-mono">{v}</span> },
            ]}
            keyExtractor={v => v}
            emptyMessage="No related IPs"
            showPagination={false}
          />
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Transactions</h3>
          <DataTable
            data={investigation.related_transactions?.slice(0, 10) || []}
            columns={[
              { key: 'txid', header: 'TXID', render: (_, v: string) => <span className="font-mono text-sm">{truncateAddress(v)}</span> },
            ]}
            keyExtractor={v => v}
            emptyMessage="No related transactions"
            showPagination={false}
          />
        </div>
      </div>
    </div>
  );
}

function TimelineTab({ investigation }: { investigation: any }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
      {investigation.timeline?.length ? (
        <div className="space-y-4">
          {investigation.timeline.map((event: any, i: number) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">{event.event_type === 'TRANSACTION' ? '⚡' : '📡'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{event.event_type}</span>
                  <span className="text-sm text-gray-500">{formatTimestamp(event.timestamp)}</span>
                  {event.txid && <span className="font-mono text-xs text-gray-500">{truncateAddress(event.txid)}</span>}
                </div>
                <div className="mt-1 text-sm text-gray-600 space-x-4">
                  {event.amount && <span>Amount: <span className="font-mono">{formatCurrency(event.amount)}</span></span>}
                  {event.counterparty && <span>Counterparty: <span className="font-mono text-sm">{truncateAddress(event.counterparty)}</span></span>}
                  {event.ip && <span>IP: <span className="font-mono">{event.ip}</span></span>}
                  {event.country && <span>Country: {event.country}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No timeline data available</p>
      )}
    </div>
  );
}

function FlowTab({ investigation }: { investigation: any }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Flow</h3>
      {investigation.transaction_flow?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="pb-2 px-4">Hop</th>
                <th className="pb-2 px-4">Direction</th>
                <th className="pb-2 px-4">TXID</th>
                <th className="pb-2 px-4">Amount (BTC)</th>
                <th className="pb-2 px-4">From</th>
                <th className="pb-2 px-4">To</th>
                <th className="pb-2 px-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {investigation.transaction_flow.map((flow: any, i: number) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm font-mono">{flow.hop}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      flow.direction === 'out' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {flow.direction === 'out' ? '⬆ Out' : '⬇ In'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-mono truncate max-w-[150px]">{flow.txid}</td>
                  <td className="py-3 px-4 text-sm font-mono">{flow.amount?.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm font-mono truncate max-w-[150px]">{flow.from}</td>
                  <td className="py-3 px-4 text-sm font-mono truncate max-w-[150px]">{flow.to}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{flow.timestamp ? formatTimestamp(flow.timestamp) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No flow data available</p>
      )}
    </div>
  );
}

function GraphTab({ graphData, depth, setDepth }: { graphData: any; depth: number; setDepth: (d: number) => void }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Network Graph</h3>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600">Depth:</label>
          <select
            value={depth}
            onChange={e => setDepth(Number(e.target.value))}
            className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
      </div>
      <div style={{ height: '500px' }}>
        {graphData?.nodes?.length ? (
          <GraphVisualization data={graphData} height="500px" layout="cose" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No graph data available. Click "Graph" tab to load.
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceTab({ investigation }: { investigation: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Correlation Evidence</h3>
        {investigation.correlation_evidence?.length ? (
          <div className="space-y-3">
            {investigation.correlation_evidence.map((evidence: CorrelationEvidence, i: number) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔗</span>
                    <div>
                      <div className="font-medium">{evidence.ip}</div>
                      <div className="text-sm text-gray-500 font-mono">{truncateAddress(evidence.txid)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskBadge level={evidence.correlation_score > 0.75 ? 'CRITICAL' : evidence.correlation_score > 0.5 ? 'HIGH' : evidence.correlation_score > 0.25 ? 'MEDIUM' : 'LOW'} size="sm" />
                    <span className="text-sm text-gray-500">{(evidence.correlation_score * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {evidence.evidence.map((e: string, j: number) => (
                    <span key={j} className="px-2 py-0.5 text-xs bg-white rounded border text-gray-700">{e}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No correlation evidence available</p>
        )}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Graph Statistics</h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(investigation.graph_statistics || {}).map(([key, value]) => (
            <div key={key}>
              <dt className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
              <dd className="font-mono text-lg mt-1">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}


function formatNumber(num: number): string {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BTC', minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(num);
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatTimestamp(timestamp);
}

function truncateAddress(address: string, chars = 8): string {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
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

function getEvidenceTypeIcon(type: string): string {
  switch (type) {
    case 'observed': return '🔍';
    case 'model_derived': return '🤖';
    case 'heuristic': return '📐';
    case 'correlation': return '🔗';
    default: return '📋';
  }
}
