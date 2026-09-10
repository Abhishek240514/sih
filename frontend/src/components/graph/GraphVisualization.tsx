import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore
import cose from 'cytoscape-cose-bilkent';
import { cn } from '@/lib/utils';
import { getRiskLevelColor } from '@/lib/utils';
import type { GraphData, GraphNode } from '@/types';

cytoscape.use(cose);

interface GraphVisualizationProps {
  data: GraphData;
  className?: string;
  layout?: 'cose' | 'fcose' | 'dagre' | 'grid' | 'circle';
  onNodeClick?: (node: GraphNode) => void;
  height?: string;
}

const NODE_COLORS = {
  wallet: '#3b82f6',
  transaction: '#10b981',
  ip: '#f59e0b',
  asn: '#8b5cf6',
  country: '#ec4899',
};

const NODE_SHAPES = {
  wallet: 'ellipse',
  transaction: 'rectangle',
  ip: 'diamond',
  asn: 'hexagon',
  country: 'round-rectangle',
};

export function GraphVisualization({
  data,
  className,
  layout = 'cose',
  onNodeClick,
  height = '500px',
}: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data.nodes.length) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: data.nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            risk_score: node.risk_score,
            ...node.metadata,
          },
          classes: node.type,
        })),
        edges: data.edges.map(edge => ({
          data: {
            id: `${edge.source}-${edge.target}-${edge.type}`,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            amount: edge.amount,
            timestamp: edge.timestamp,
            confidence: edge.confidence,
            relationship_type: edge.relationship_type,
          },
        })),
      },
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'font-size': '10px',
            'font-weight': 500 as any,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'background-color': ((ele: cytoscape.NodeSingular) => {
              const risk = ele.data('risk_score') || 0;
              if (risk > 0.75) return '#dc2626';
              if (risk > 0.5) return '#ea580c';
              if (risk > 0.25) return '#ca8a04';
              return NODE_COLORS[ele.data('type') as keyof typeof NODE_COLORS] || '#6b7280';
            }) as any,
            'shape': ((ele: cytoscape.NodeSingular) => NODE_SHAPES[ele.data('type') as keyof typeof NODE_SHAPES] || 'ellipse') as any,
            'width': ((ele: cytoscape.NodeSingular) => {
              const type = ele.data('type');
              if (type === 'wallet') return 40 + ele.data('risk_score') * 30;
              if (type === 'transaction') return 25;
              return 20;
            }) as any,
            'height': ((ele: cytoscape.NodeSingular) => {
              const type = ele.data('type');
              if (type === 'wallet') return 40 + ele.data('risk_score') * 30;
              if (type === 'transaction') return 20;
              return 20;
            }) as any,
            'border-width': 2,
            'border-color': '#fff',
            'border-opacity': 0.8,
            'overlay-padding': '6px',
            'z-index': 10,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#9ca3af',
            'target-arrow-color': '#9ca3af',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6,
            'label': ((ele: cytoscape.EdgeSingular) => {
              if (ele.data('amount')) return (ele.data('amount') as number).toFixed(4);
              return '';
            }) as any,
            'font-size': '8px',
            'text-rotation': 'autorotate' as any,
          } as any,
        },
        {
          selector: '.selected',
          style: {
            'border-width': 3,
            'border-color': '#3b82f6',
            'border-opacity': 1,
            'z-index': 100,
          },
        },
        {
          selector: ':parent',
          style: {
            'background-opacity': 0,
          },
        },
      ],
      layout: {
        name: layout,
        animate: true,
        animationDuration: 500,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 100,
        nodeRepulsion: 4000,
        nodeOverlap: 20,
        fit: true,
        padding: 50,
        randomize: false,
        componentSpacing: 100,
      } as any,
      minZoom: 0.1,
      maxZoom: 2,
      zoomingEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: true,
      selectionType: 'single',
    } as any);

    cyRef.current = cy;

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = data.nodes.find(n => n.id === node.id());
      if (nodeData && onNodeClick) {
        onNodeClick(nodeData);
      }
      cy.nodes().removeClass('selected');
      node.addClass('selected');
      setSelectedNode(nodeData || null);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.nodes().removeClass('selected');
        setSelectedNode(null);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [data, layout, onNodeClick]);

  return (
    <div className={cn('relative rounded-xl border bg-white', className)} style={{ height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {selectedNode && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg border shadow-lg p-3 max-w-xs z-10">
          <div className="font-semibold text-gray-900">{selectedNode.label}</div>
          <div className="text-xs text-gray-500 mt-1">{selectedNode.id}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn('px-2 py-0.5 text-xs rounded-full', getRiskLevelColor(selectedNode.type))}>
              {selectedNode.type}
            </span>
            {selectedNode.risk_score > 0 && (
              <RiskBadge level={selectedNode.risk_score > 0.75 ? 'CRITICAL' : selectedNode.risk_score > 0.5 ? 'HIGH' : selectedNode.risk_score > 0.25 ? 'MEDIUM' : 'LOW'} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) {
  const colors = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[level]}`}>{level}</span>;
}