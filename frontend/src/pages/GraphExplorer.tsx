import { useState, useEffect, useRef } from 'react';
import { useDataset } from '@/context/DatasetContext';
import { useEntityGraph, useShortestPath, useConnectedComponents } from '@/hooks/useGraph';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/shared/Skeleton';
import { cn, formatRiskScore, getRiskColor } from '@/lib/utils';
import { Search, Network, Route, Layers, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import cytoscape from 'cytoscape';
import type { GraphNode } from '@/lib/types';

const NODE_COLORS: Record<string, string> = {
  wallet: '#8b5cf6',
  transaction: '#3b82f6',
  ip: '#10b981',
  asn: '#f59e0b',
  country: '#ef4444',
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

  // Shortest path
  const [pathSource, setPathSource] = useState('');
  const [pathTarget, setPathTarget] = useState('');
  const [showPathPanel, setShowPathPanel] = useState(false);
  const [showComponentsPanel, setShowComponentsPanel] = useState(false);

  const graphQuery = useEntityGraph(entityId, depth, maxNodes, 200);
  const pathQuery = useShortestPath(
    showPathPanel ? pathSource : '',
    showPathPanel ? pathTarget : ''
  );
  const componentsQuery = useConnectedComponents();

  const handleSearch = () => {
    if (searchInput.trim()) {
      setEntityId(searchInput.trim());
      setSelectedNode(null);
    }
  };

  // Render graph
  useEffect(() => {
    if (!graphQuery.data || !graphRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [];
    graphQuery.data.nodes.forEach((node: any) => {
      elements.push({
        data: {
          id: node.id,
          label: node.label.length > 14 ? node.label.slice(0, 6) + '...' + node.label.slice(-4) : node.label,
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
      cyRef.current.destroy();
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
            color: '#94a3b8',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': '#3b82f6',
            width: 'mapData(risk_score, 0, 1, 16, 48)',
            height: 'mapData(risk_score, 0, 1, 16, 48)',
            'border-width': 2,
            'border-color': '#0a0e1a',
          },
        },
        ...Object.entries(NODE_COLORS).map(([type, color]) => ({
          selector: `node[type="${type}"]`,
          style: { 'background-color': color } as any,
        })),
        {
          selector: `node[id="${entityId}"]`,
          style: {
            'border-color': '#f59e0b',
            'border-width': 3,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#3b82f6',
            'border-width': 3,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#1e293b',
            'target-arrow-color': '#1e293b',
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
        ...(layout === 'cose' ? { nodeRepulsion: () => 6000, idealEdgeLength: () => 80 } : {}),
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
      if (e.target === cy) {
        setSelectedNode(null);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
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
      <EmptyState
        icon={<Network className="w-16 h-16" />}
        title="No Dataset Selected"
        description="Select a processed dataset to explore the graph."
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Graph Explorer</h1>
          <p className="text-sm text-slate-500 mt-1">Interactive network analysis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowPathPanel(!showPathPanel); setShowComponentsPanel(false); }}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
              showPathPanel ? 'border-blue-500/30 bg-blue-500/5 text-blue-400' : 'border-[var(--border-color)] text-slate-400'
            )}
          >
            <Route className="w-4 h-4" /> Shortest Path
          </button>
          <button
            onClick={() => { setShowComponentsPanel(!showComponentsPanel); setShowPathPanel(false); }}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
              showComponentsPanel ? 'border-blue-500/30 bg-blue-500/5 text-blue-400' : 'border-[var(--border-color)] text-slate-400'
            )}
          >
            <Layers className="w-4 h-4" /> Components
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-4 flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Enter wallet address, TXID, or IP..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/50 border border-[var(--border-color)] focus:border-blue-500/30 focus:outline-none text-sm text-slate-300 placeholder:text-slate-600"
          />
        </div>

        <button
          onClick={handleSearch}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          Explore
        </button>

        {/* Depth */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Depth:</span>
          <input
            type="range"
            min={1}
            max={4}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-20 accent-blue-500"
          />
          <span className="text-xs text-slate-300 w-4">{depth}</span>
        </div>

        {/* Max Nodes */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Max:</span>
          <input
            type="number"
            min={10}
            max={500}
            value={maxNodes}
            onChange={(e) => setMaxNodes(Number(e.target.value))}
            className="w-16 px-2 py-1.5 rounded bg-slate-900/50 border border-[var(--border-color)] text-xs text-slate-300 text-center"
          />
        </div>

        {/* Layout */}
        <select
          value={layout}
          onChange={(e) => handleRelayout(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/50 border border-[var(--border-color)] text-sm text-slate-300"
        >
          {LAYOUTS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Path Panel */}
      {showPathPanel && (
        <div className="glass-card p-4 flex items-center gap-3 animate-fade-in">
          <Route className="w-4 h-4 text-blue-400 shrink-0" />
          <input
            type="text"
            placeholder="Source address..."
            value={pathSource}
            onChange={(e) => setPathSource(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-[var(--border-color)] text-sm text-slate-300 placeholder:text-slate-600"
          />
          <span className="text-slate-500">→</span>
          <input
            type="text"
            placeholder="Target address..."
            value={pathTarget}
            onChange={(e) => setPathTarget(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-[var(--border-color)] text-sm text-slate-300 placeholder:text-slate-600"
          />
          {pathQuery.isLoading && <Skeleton className="w-20 h-8" />}
          {pathQuery.data && (
            <span className="text-xs text-emerald-400">Path found</span>
          )}
        </div>
      )}

      {/* Components Panel */}
      {showComponentsPanel && (
        <div className="glass-card p-4 animate-fade-in">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Connected Components</h4>
          {componentsQuery.isLoading ? (
            <Skeleton className="h-20" />
          ) : componentsQuery.data ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto text-xs">
              {Array.isArray(componentsQuery.data) ? (
                (componentsQuery.data as any[]).map((comp: any, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-slate-900/30 border border-[var(--border-color)]">
                    <span className="text-slate-400">Component {idx + 1}: </span>
                    <span className="text-white font-medium">{comp.size || comp.length || '?'} nodes</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">Data format varies</p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Graph Canvas + Side Panel */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          {!entityId ? (
            <div className="glass-card flex items-center justify-center" style={{ height: '600px' }}>
              <EmptyState
                icon={<Network className="w-12 h-12" />}
                title="Enter an Address"
                description="Search for a wallet address, transaction ID, or IP to start exploring the graph."
              />
            </div>
          ) : graphQuery.isLoading ? (
            <div className="glass-card flex items-center justify-center" style={{ height: '600px' }}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading graph...</p>
              </div>
            </div>
          ) : graphQuery.isError ? (
            <ErrorState message="Failed to load graph" onRetry={() => graphQuery.refetch()} />
          ) : (
            <>
              <div
                ref={graphRef}
                className="cytoscape-container"
                style={{ height: '600px' }}
              />
              {/* Zoom Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-1">
                <button onClick={handleZoomIn} className="p-2 rounded-lg bg-slate-900/80 border border-[var(--border-color)] text-slate-400 hover:text-white transition-colors">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={handleZoomOut} className="p-2 rounded-lg bg-slate-900/80 border border-[var(--border-color)] text-slate-400 hover:text-white transition-colors">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={handleFit} className="p-2 rounded-lg bg-slate-900/80 border border-[var(--border-color)] text-slate-400 hover:text-white transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              {/* Legend */}
              <div className="absolute top-4 left-4 glass-card p-3 flex flex-col gap-1.5 text-xs">
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-slate-400 capitalize">{type}</span>
                  </div>
                ))}
                <div className="mt-1 pt-1 border-t border-[var(--border-color)] text-slate-500">
                  {graphQuery.data?.nodes.length} nodes, {graphQuery.data?.edges.length} edges
                </div>
              </div>
            </>
          )}
        </div>

        {/* Node Detail Side Panel */}
        {selectedNode && (
          <div className="w-80 glass-card p-5 animate-slide-in-left" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Node Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500 uppercase">Type</span>
                <p className="text-sm text-white capitalize mt-0.5">{selectedNode.type}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase">ID</span>
                <p className="text-sm text-white font-mono mt-0.5 break-all">{selectedNode.label}</p>
              </div>
              {selectedNode.risk_score > 0 && (
                <div>
                  <span className="text-xs text-slate-500 uppercase">Risk Score</span>
                  <p className={cn('text-sm font-bold mt-0.5', getRiskColor(
                    selectedNode.risk_score >= 0.8 ? 'CRITICAL' : selectedNode.risk_score >= 0.6 ? 'HIGH' : selectedNode.risk_score >= 0.4 ? 'MEDIUM' : 'LOW'
                  ))}>
                    {formatRiskScore(selectedNode.risk_score)}
                  </p>
                </div>
              )}
              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 uppercase mb-1 block">Metadata</span>
                  {Object.entries(selectedNode.metadata).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs py-1 border-b border-[var(--border-color)]">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-slate-300">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedNode.type === 'wallet' && (
                <button
                  onClick={() => window.location.href = `/investigations/${selectedNode.label}`}
                  className="w-full mt-3 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
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
