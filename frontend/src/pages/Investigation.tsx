import { useParams, useNavigate } from 'react-router-dom';
import { useInvestigation } from '@/hooks/useInvestigation';
import { useDataset } from '@/context/DatasetContext';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { RiskScoreGauge } from '@/components/shared/RiskScoreGauge';
import { EvidenceTypeBadge } from '@/components/shared/EvidenceTypeBadge';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/shared/Skeleton';
import { truncateAddress, formatTimestamp, formatBTC, cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Users, GitFork,
  Clock, Network, FileText, Activity, Globe, Server, MapPin, ChevronRight
} from 'lucide-react';
import type { EvidenceType } from '@/lib/types';
import cytoscape from 'cytoscape';

const TABS = ['Timeline', 'Transactions', 'Graph', 'Related Entities'] as const;
type Tab = typeof TABS[number];

export default function Investigation() {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const { activeDatasetId } = useDataset();
  const [activeTab, setActiveTab] = useState<Tab>('Timeline');
  const graphRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const query = useInvestigation(entityId || '');
  const data: any = query.data;

  // Cytoscape graph
  useEffect(() => {
    if (activeTab !== 'Graph' || !data?.graph_neighborhood || !graphRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [];

    data.graph_neighborhood.nodes.forEach((node: any) => {
      elements.push({
        data: {
          id: node.id,
          label: node.label.length > 12 ? node.label.slice(0, 6) + '...' + node.label.slice(-4) : node.label,
          type: node.type,
          risk_score: node.risk_score,
          fullLabel: node.label,
        },
      });
    });

    data.graph_neighborhood.edges.forEach((edge: any, idx: number) => {
      elements.push({
        data: {
          id: `e-${idx}`,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          amount: edge.amount,
        },
      });
    });

    if (elements.length === 0) return;

    const cy = cytoscape({
      container: graphRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'font-size': '9px',
            color: '#94a3b8',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': '#3b82f6',
            width: 'mapData(risk_score, 0, 1, 20, 50)',
            height: 'mapData(risk_score, 0, 1, 20, 50)',
            'border-width': 2,
            'border-color': '#1e3a5f',
          },
        },
        {
          selector: 'node[type="wallet"]',
          style: { 'background-color': '#8b5cf6', shape: 'ellipse' },
        },
        {
          selector: 'node[type="transaction"]',
          style: { 'background-color': '#3b82f6', shape: 'diamond' },
        },
        {
          selector: 'node[type="ip"]',
          style: { 'background-color': '#10b981', shape: 'triangle' },
        },
        {
          selector: 'node[type="asn"]',
          style: { 'background-color': '#f59e0b', shape: 'hexagon' },
        },
        {
          selector: 'node[type="country"]',
          style: { 'background-color': '#ef4444', shape: 'rectangle' },
        },
        {
          selector: `node[id="${entityId}"]`,
          style: {
            'border-color': '#f59e0b',
            'border-width': 3,
            'background-color': '#f97316',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#2a3041',
            'target-arrow-color': '#2a3041',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 100,
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
    });

    cyRef.current = cy;

    cy.on('tap', 'node', (e) => {
      const node = e.target;
      const nodeType = node.data('type');
      const nodeId = node.data('fullLabel') || node.data('id');
      if (nodeType === 'wallet' && nodeId !== entityId) {
        navigate(`/investigations/${nodeId}`);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [activeTab, data?.graph_neighborhood, entityId, navigate]);

  if (!entityId) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in p-8 mt-20">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-slate-700">
          <span className="text-3xl">🔍</span>
        </div>
        <h2 className="text-2xl font-semibold text-white">Start an Investigation</h2>
        <p className="text-slate-400 text-center max-w-md">
          Enter a Bitcoin wallet address to begin a deep-dive forensic investigation.
        </p>
        <div className="w-full max-w-md mt-6 relative">
          <input
            type="text"
            placeholder="Enter wallet address..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                navigate(`/investigations/${e.currentTarget.value}`);
              }
            }}
            autoFocus
          />
          <div className="absolute right-3 top-3 text-slate-500 text-xs font-mono bg-slate-800 px-2 py-1 rounded">
            ENTER ↵
          </div>
        </div>
      </div>
    );
  }

  if (!activeDatasetId) {
    return <ErrorState message="Missing active dataset" />;
  }

  if (query.isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (query.isError || !data) {
    return <ErrorState message="Failed to load investigation" onRetry={() => query.refetch()} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate('/alerts')} className="hover:text-slate-300 transition-colors">Alerts</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-300 font-mono">{truncateAddress(entityId)}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left Panel: Entity Profile */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="glass-card p-6">
            <div className="flex items-start gap-6">
              <RiskScoreGauge score={data.risk_score} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-bold text-white font-mono truncate">{entityId}</h2>
                  <RiskBadge level={data.risk_level as any} />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="capitalize">{data.entity_type}</span>
                  {data.related_wallets?.[0]?.community_id !== null && data.related_wallets?.[0]?.community_id !== undefined && (
                    <span>Community #{data.related_wallets[0].community_id}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            {data.related_wallets?.[0] && (() => {
              const w = data.related_wallets.find((rw: any) => rw.address === entityId) || data.related_wallets[0];
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <MetricItem icon={<ArrowRightLeft className="w-4 h-4" />} label="TX Count" value={String(w.transaction_count)} />
                  <MetricItem icon={<ArrowDownLeft className="w-4 h-4" />} label="Total In" value={formatBTC(w.total_in)} />
                  <MetricItem icon={<ArrowUpRight className="w-4 h-4" />} label="Total Out" value={formatBTC(w.total_out)} />
                  <MetricItem icon={<Activity className="w-4 h-4" />} label="Avg Value" value={formatBTC(w.average_transaction_value)} />
                  <MetricItem icon={<Users className="w-4 h-4" />} label="Counterparties" value={String(w.unique_counterparties)} />
                  <MetricItem icon={<GitFork className="w-4 h-4" />} label="Fan-in / Fan-out" value={`${w.fan_in} / ${w.fan_out}`} />
                  <MetricItem icon={<Clock className="w-4 h-4" />} label="First Seen" value={formatTimestamp(w.first_seen)} />
                  <MetricItem icon={<Clock className="w-4 h-4" />} label="Last Seen" value={formatTimestamp(w.last_seen)} />
                </div>
              );
            })()}
          </div>

          {/* Tabs */}
          <div className="glass-card overflow-hidden">
            <div className="flex border-b border-[var(--border-color)]">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-5 py-3 text-sm font-medium transition-colors relative',
                    activeTab === tab
                      ? 'text-blue-400'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'Timeline' && (
                <div className="space-y-3">
                  {data.timeline.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No timeline events</p>
                  ) : (
                    data.timeline.map((event: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/30 hover:bg-slate-800/30 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300">{String(event.description || event.type || 'Event')}</p>
                          <p className="text-xs text-slate-500 mt-1">{formatTimestamp(String(event.timestamp || ''))}</p>
                          {event.amount != null && (
                            <p className="text-xs text-slate-400 mt-0.5">Amount: {formatBTC(Number(event.amount))}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'Transactions' && (
                <div className="overflow-x-auto">
                  {data.related_transactions.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No transactions</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-color)]">
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">TXID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Input</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Output</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Fee</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.related_transactions.map((tx: any) => (
                          <tr key={tx.txid} className="border-b border-[var(--border-color)] hover:bg-slate-800/30">
                            <td className="px-3 py-2 font-mono text-xs text-slate-300">{truncateAddress(tx.txid, 8)}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">{formatTimestamp(tx.timestamp)}</td>
                            <td className="px-3 py-2 text-right text-xs text-slate-300">{formatBTC(tx.input_amount)}</td>
                            <td className="px-3 py-2 text-right text-xs text-slate-300">{formatBTC(tx.output_amount)}</td>
                            <td className="px-3 py-2 text-right text-xs text-slate-400">{tx.fee.toFixed(6)}</td>
                            <td className="px-3 py-2 text-xs text-slate-400">{tx.geo_country || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'Graph' && (
                <div>
                  <div
                    ref={graphRef}
                    className="cytoscape-container"
                    style={{ height: '500px' }}
                  />
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500" /> Wallet</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rotate-45" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} /> Transaction</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} /> IP</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500" /> ASN</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500" /> Country</span>
                    <span className="ml-auto">Click wallet nodes to navigate</span>
                  </div>
                </div>
              )}

              {activeTab === 'Related Entities' && (
                <div className="space-y-6">
                  {/* Related Wallets */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" /> Related Wallets ({data.related_wallets.length})
                    </h4>
                    {data.related_wallets.length > 0 ? (
                      <div className="space-y-1">
                        {data.related_wallets.slice(0, 10).map((w: any) => (
                          <button
                            key={w.address}
                            onClick={() => navigate(`/investigations/${w.address}`)}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-900/30 hover:bg-slate-800/30 transition-colors text-left"
                          >
                            <span className="font-mono text-xs text-slate-300">{truncateAddress(w.address)}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500">{w.transaction_count} TXs</span>
                              <RiskBadge level={w.risk_level} />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">None</p>
                    )}
                  </div>

                  {/* Related IPs */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" /> Related IPs ({data.related_ips.length})
                    </h4>
                    {data.related_ips.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {data.related_ips.map((ip: any) => (
                          <span key={ip} className="px-3 py-1.5 rounded-lg bg-slate-900/50 border border-[var(--border-color)] text-xs font-mono text-slate-300">
                            {ip}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">None</p>
                    )}
                  </div>

                  {/* Related ASNs */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-400" /> Related ASNs ({data.related_asns.length})
                    </h4>
                    {data.related_asns.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {data.related_asns.map((asn: any) => (
                          <span key={asn} className="px-3 py-1.5 rounded-lg bg-slate-900/50 border border-[var(--border-color)] text-xs font-mono text-slate-300">
                            {asn}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">None</p>
                    )}
                  </div>

                  {/* Countries */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-400" /> Countries ({data.countries.length})
                    </h4>
                    {data.countries.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {data.countries.map((c: any) => (
                          <span key={c} className="px-3 py-1.5 rounded-lg bg-slate-900/50 border border-[var(--border-color)] text-xs text-slate-300">
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">None</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Evidence */}
        <div className="space-y-6">
          {/* Reasons */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Risk Signals ({data.reasons.length})
            </h3>
            <div className="space-y-3">
              {data.reasons.map((reason: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-900/30 border border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200">{reason.signal}</span>
                    <EvidenceTypeBadge type={reason.evidence_type as EvidenceType} />
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{reason.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${Math.min(Number(reason.contribution) || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right">{Number(reason.contribution || 0).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Correlation Evidence */}
          {data.correlation_evidence.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Network className="w-4 h-4 text-amber-400" />
                Correlation Evidence ({data.correlation_evidence.length})
              </h3>
              <div className="space-y-3">
                {data.correlation_evidence.map((ce: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/30 border border-[var(--border-color)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-slate-300">{truncateAddress(ce.ip)}</span>
                      <span className={cn(
                        'text-xs font-semibold',
                        ce.correlation_score > 0.7 ? 'text-red-400' : ce.correlation_score > 0.4 ? 'text-amber-400' : 'text-emerald-400'
                      )}>
                        {(ce.correlation_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">TX: {truncateAddress(ce.txid)}</p>
                    {ce.evidence.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {ce.evidence.slice(0, 3).map((e: any, eidx: number) => (
                          <p key={eidx} className="text-[11px] text-slate-500">• {e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-slate-900/30">
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white truncate">{value}</p>
    </div>
  );
}
