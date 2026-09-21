import { useState, useEffect, useRef } from 'react';
import { useDataset } from '@/context/DatasetContext';
import { useEntityGraph, useShortestPath, useConnectedComponents } from '@/hooks/useGraph';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatRiskScore, getRiskColor } from '@/lib/utils';
import { Search, Network, Route, Layers, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import cytoscape from 'cytoscape';
import type { GraphNode } from '@/lib/types';

const NODE_COLORS: Record<string, string> = {
  wallet: '#9b5cf6',
  transaction: '#3b7cf9',
  ip: '#10d98a',
  asn: '#f59e0b',
  country: '#ff3d55',
};

const LAYOUTS = [
  { label: 'Force', value: 'cose' },
  { label: 'Circle', value: 'circle' },
  { label: 'Grid', value: 'grid' },
  { label: 'Breadthfirst', value: 'breadthfirst' },
  { label: 'Concentric', value: 'concentric' },
];

export default function GraphExplorer() {
  const { activeDatasetId } = useDataset();
  const graphRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [entityId, setEntityId] = useState('');
  const [depth, setDepth] = useState(2);
  const [maxNodes, setMaxNodes] = useState(100);
  const [layout, setLayout] = useState('cose');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activePanel, setActivePanel] = useState<'none' | 'path' | 'components'>('none');
  const [pathSource, setPathSource] = useState('');
  const [pathTarget, setPathTarget] = useState('');

  const graphQuery = useEntityGraph(entityId, depth, maxNodes, 200);
  const pathQuery = useShortestPath(
    activePanel === 'path' ? pathSource : '',
    activePanel === 'path' ? pathTarget : '',
  );
  const componentsQuery = useConnectedComponents();

  const handleSearch = () => {
    if (searchInput.trim()) {
      setEntityId(searchInput.trim());
      setSelectedNode(null);
    }
  };

  useEffect(() => {
    if (!graphQuery.data || !graphRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [];
    graphQuery.data.nodes.forEach((node: any) => {
      elements.push({
        data: {
          id: node.id,
          label: node.label.length > 14 ? node.label.slice(0, 6) + '…' + node.label.slice(-4) : node.label,
          type: node.type,
          risk_score: node.risk_score,
          fullLabel: node.label,
          metadata: node.metadata,
        },
      });
    });

    graphQuery.data.edges.forEach((edge: any, idx: number) => {
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

    if (cyRef.current) {
      cyRef.current.unmount();
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const cy = cytoscape({
      container: graphRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'font-size': '8px',
            'font-family': 'JetBrains Mono',
            color: '#8ba3c7',
            'text-valign': 'bottom',
            'text-margin-y': 7,
            'background-color': '#3b7cf9',
            width: 'mapData(risk_score, 0, 1, 18, 52)',
            height: 'mapData(risk_score, 0, 1, 18, 52)',
            'border-width': 2,
            'border-color': '#020817',
          },
        },
        ...Object.entries(NODE_COLORS).map(([type, color]) => ({
          selector: `node[type="${type}"]`,
          style: { 'background-color': color } as any,
        })),
        {
          selector: `node[id="${entityId}"]`,
          style: { 'border-color': '#f59e0b', 'border-width': 3 },
        },
        {
          selector: 'node:selected',
          style: { 'border-color': '#3b7cf9', 'border-width': 3, 'border-opacity': 1 },
        },
        {
          selector: 'edge',
          style: {
            width: 1.2,
            'line-color': 'rgba(99, 155, 255, 0.15)',
            'target-arrow-color': 'rgba(99, 155, 255, 0.25)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.7,
          },
        },
      ],
      layout: {
        name: layout,
        animate: true,
        animationDuration: 500,
        ...(layout === 'cose' ? { nodeRepulsion: () => 8000, idealEdgeLength: () => 90 } : {}),
      } as any,
      minZoom: 0.2,
      maxZoom: 5,
    });

    cyRef.current = cy;

    cy.on('tap', 'node', (e) => {
      const n = e.target;
      setSelectedNode({
        id: n.data('id'),
        type: n.data('type'),
        label: n.data('fullLabel') || n.data('label'),
        risk_score: n.data('risk_score'),
        metadata: n.data('metadata') || {},
      });
    });

    cy.on('tap', (e) => {
      if (e.target === cy) setSelectedNode(null);
    });

    return () => { 
      if (cy) {
        cy.stop(true, true);
        cy.unmount();
        cy.destroy(); 
      }
      if (cyRef.current === cy) {
        cyRef.current = null;
      }
    };
  }, [graphQuery.data, layout, entityId]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.3);
  const handleFit = () => cyRef.current?.fit(undefined, 30);

  const handleRelayout = (newLayout: string) => {
    setLayout(newLayout);
    if (cyRef.current) {
      cyRef.current.layout({ name: newLayout, animate: true, animationDuration: 500 } as any).run();
    }
  };

  if (!activeDatasetId) {
    return (
      <div className="glass-card animate-fade-in" style={{ minHeight: 400 }}>
        <EmptyState
          icon={<Network style={{ width: 28, height: 28 }} />}
          title="No Dataset Selected"
          description="Select a processed dataset to explore the transaction graph."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Graph Explorer</h1>
          <p className="page-subtitle">Interactive Bitcoin transaction network analysis</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActivePanel(activePanel === 'path' ? 'none' : 'path')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: activePanel === 'path' ? '1px solid rgba(59,124,249,0.3)' : '1px solid var(--border-color)',
              background: activePanel === 'path' ? 'rgba(59,124,249,0.1)' : 'rgba(99,155,255,0.04)',
              color: activePanel === 'path' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            <Route style={{ width: 14, height: 14 }} />
            Shortest Path
          </button>
          <button
            onClick={() => setActivePanel(activePanel === 'components' ? 'none' : 'components')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: activePanel === 'components' ? '1px solid rgba(155,92,246,0.3)' : '1px solid var(--border-color)',
              background: activePanel === 'components' ? 'rgba(155,92,246,0.08)' : 'rgba(99,155,255,0.04)',
              color: activePanel === 'components' ? 'var(--accent-purple)' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            <Layers style={{ width: 14, height: 14 }} />
            Components
          </button>
        </div>
      </div>

      {/* Search Controls */}
      <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Enter wallet address, TXID, or IP address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="input-field"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button className="btn-primary" onClick={handleSearch} style={{ whiteSpace: 'nowrap' }}>
          Explore Graph
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Depth:</span>
          <input type="range" min={1} max={4} value={depth} onChange={(e) => setDepth(Number(e.target.value))} style={{ width: 80 }} />
          <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, minWidth: 12 }}>{depth}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Max:</span>
          <input
            type="number"
            min={10}
            max={500}
            value={maxNodes}
            onChange={(e) => setMaxNodes(Number(e.target.value))}
            className="input-field"
            style={{ width: 70, padding: '6px 10px', textAlign: 'center', fontSize: 13 }}
          />
        </div>

        <select
          value={layout}
          onChange={(e) => handleRelayout(e.target.value)}
          className="input-field"
          style={{ width: 'auto', padding: '8px 36px 8px 12px', fontSize: 13 }}
        >
          {LAYOUTS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Path Panel */}
      {activePanel === 'path' && (
        <div className="glass-card animate-slide-in-down" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Route style={{ width: 15, height: 15, color: 'var(--accent-blue)', flexShrink: 0 }} />
          <input type="text" placeholder="Source address..." value={pathSource} onChange={(e) => setPathSource(e.target.value)} className="input-field" style={{ flex: 1 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 300 }}>→</span>
          <input type="text" placeholder="Target address..." value={pathTarget} onChange={(e) => setPathTarget(e.target.value)} className="input-field" style={{ flex: 1 }} />
          {pathQuery.isLoading && <Skeleton className="h-9 w-20" />}
          {pathQuery.data && (
            <span style={{ fontSize: 12, color: '#10d98a', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Path found</span>
          )}
        </div>
      )}

      {/* Components Panel */}
      {activePanel === 'components' && (
        <div className="glass-card animate-slide-in-down" style={{ padding: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Connected Components</h4>
          {componentsQuery.isLoading ? (
            <Skeleton className="h-20" />
          ) : componentsQuery.data ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: 120, overflowY: 'auto' }}>
              {Array.isArray(componentsQuery.data) ? (
                (componentsQuery.data as any[]).map((comp: any, idx: number) => (
                  <div key={idx} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(99,155,255,0.06)', border: '1px solid var(--border-color)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Component {idx + 1}: </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{comp.size || comp.length || '?'} nodes</span>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data</p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Graph Canvas + Node Panel */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {!entityId ? (
            <div className="glass-card" style={{ height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState
                icon={<Network style={{ width: 30, height: 30 }} />}
                title="Enter an Address"
                description="Search for a wallet address, transaction ID, or IP address to begin graph exploration."
              />
            </div>
          ) : graphQuery.isLoading ? (
            <div className="glass-card" style={{ height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '2px solid rgba(59,124,249,0.15)', borderTop: '2px solid #3b7cf9', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Building graph...</p>
              </div>
            </div>
          ) : graphQuery.isError ? (
            <ErrorState message="Failed to load graph data" onRetry={() => graphQuery.refetch()} />
          ) : (
            <div style={{ position: 'relative' }}>
              <div
                ref={graphRef}
                className="cytoscape-container"
                style={{ height: 580, background: 'var(--bg-surface)' }}
              />

              {/* Zoom Controls */}
              <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[{ Icon: ZoomIn, fn: handleZoomIn }, { Icon: ZoomOut, fn: handleZoomOut }, { Icon: Maximize2, fn: handleFit }].map(({ Icon, fn }, i) => (
                  <button key={i} onClick={fn} className="btn-icon" style={{ width: 34, height: 34 }}>
                    <Icon style={{ width: 14, height: 14 }} />
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div
                className="glass-card"
                style={{ position: 'absolute', top: 12, left: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}
              >
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}60`, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{type}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 6, fontSize: 10.5, color: 'var(--text-muted)' }}>
                  {graphQuery.data?.nodes.length} nodes · {graphQuery.data?.edges.length} edges
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Node Detail Panel */}
        {selectedNode && (
          <div
            className="glass-card animate-slide-in-left"
            style={{ width: 300, maxHeight: 580, overflowY: 'auto', padding: 20, flexShrink: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Node Details</h3>
              <button className="btn-icon" onClick={() => setSelectedNode(null)}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Type">
                <span style={{ fontSize: 13, color: 'var(--text-primary)', textTransform: 'capitalize', fontWeight: 500 }}>
                  {selectedNode.type}
                </span>
              </Field>
              <Field label="Identifier">
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--accent-cyan)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {selectedNode.label}
                </span>
              </Field>
              {selectedNode.risk_score > 0 && (
                <Field label="Risk Score">
                  <span style={{ fontWeight: 700, fontSize: 15, color: getRiskColor(selectedNode.risk_score >= 0.8 ? 'CRITICAL' : selectedNode.risk_score >= 0.6 ? 'HIGH' : selectedNode.risk_score >= 0.4 ? 'MEDIUM' : 'LOW') }}>
                    {formatRiskScore(selectedNode.risk_score)}
                  </span>
                </Field>
              )}
              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Metadata</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(selectedNode.metadata).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 12, paddingBottom: 5, borderBottom: '1px solid var(--border-color)', gap: 8 }}>
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
                        <span style={{ color: 'var(--text-secondary)', textAlign: 'right', wordBreak: 'break-all' }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedNode.type === 'wallet' && (
                <button
                  onClick={() => window.location.href = `/investigations/${selectedNode.label}`}
                  className="btn-primary"
                  style={{ width: '100%', marginTop: 6, justifyContent: 'center' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Investigate
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
        {label}
      </p>
      {children}
    </div>
  );
}
