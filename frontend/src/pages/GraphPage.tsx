import { useState } from 'react';
import { useGetConnectedComponentsQuery, useGetEntityGraphQuery, useGetShortestPathQuery, useGetWalletsQuery } from '@/lib/api';
import { GraphVisualization } from '@/components/graph/GraphVisualization';
import { DataTable } from '@/components/ui/DataTable';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { formatNumber, truncateAddress } from '@/lib/utils';
import { useDataset } from '@/context/DatasetContext';

export function GraphPage() {
  const { datasetId } = useDataset();
  const [view, setView] = useState<'overview' | 'explore' | 'path' | 'components'>('overview');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [sourceEntity, setSourceEntity] = useState('');
  const [targetEntity, setTargetEntity] = useState('');
  const [pathResult, setPathResult] = useState<{ path: string[]; found: boolean } | null>(null);
  const [graphDepth, setGraphDepth] = useState(2);

  const { data: wallets } = useGetWalletsQuery(
    { dataset_id: datasetId!, limit: 500 },
    { enabled: !!datasetId }
  );
  const { data: components } = useGetConnectedComponentsQuery(
    { dataset_id: datasetId! },
    { enabled: !!datasetId && view === 'components' }
  );

  if (!datasetId) return <div className="p-8 text-center text-gray-500">Select a dataset</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Graph Explorer</h1>
        <div className="flex gap-2">
          {(['overview', 'explore', 'path', 'components'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                view === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'overview' && <OverviewView datasetId={datasetId} />}
      {view === 'explore' && <ExploreView
        datasetId={datasetId}
        wallets={wallets?.wallets || []}
        selectedEntity={selectedEntity}
        setSelectedEntity={setSelectedEntity}
        graphDepth={graphDepth}
        setGraphDepth={setGraphDepth}
      />}
      {view === 'path' && <PathView
        datasetId={datasetId}
        wallets={wallets?.wallets || []}
        sourceEntity={sourceEntity}
        setSourceEntity={setSourceEntity}
        targetEntity={targetEntity}
        setTargetEntity={setTargetEntity}
        pathResult={pathResult}
        setPathResult={setPathResult}
      />}
      {view === 'components' && <ComponentsView components={components?.components || []} />}
    </div>
  );
}

function OverviewView({ datasetId }: { datasetId: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Graph Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Nodes</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Edges</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Components</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
          </div>
        </div>
        <p className="text-gray-500 mt-4">Select a dataset and run the pipeline to populate graph statistics.</p>
      </div>
    </div>
  );
}

function ExploreView({
  datasetId,
  wallets,
  selectedEntity,
  setSelectedEntity,
  graphDepth,
  setGraphDepth,
}: { datasetId: string; wallets: any[]; selectedEntity: string; setSelectedEntity: (e: string) => void; graphDepth: number; setGraphDepth: (d: number) => void }) {
  const { data: graphData } = useGetEntityGraphQuery(
    { entity_id: selectedEntity, dataset_id: datasetId, depth: graphDepth, max_nodes: 100, max_edges: 200 },
    { enabled: !!selectedEntity && !!datasetId }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Explore Entity</h3>
        <div className="flex items-center gap-4">
          <select
            value={selectedEntity}
            onChange={e => setSelectedEntity(e.target.value)}
            className="w-80 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
          >
            <option value="">Select an entity...</option>
            {wallets.slice(0, 100).map(w => (
              <option key={w.address} value={w.address}>
                {truncateAddress(w.address)} (Risk: {(w.risk_score * 100).toFixed(1)}%)
              </option>
            ))}
          </select>
          <label className="text-sm text-gray-600">Depth:</label>
          <select
            value={graphDepth}
            onChange={e => setGraphDepth(Number(e.target.value))}
            className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
      </div>
      <div className="bg-white rounded-xl border" style={{ height: '500px' }}>
        {selectedEntity && graphData?.nodes?.length ? (
          <GraphVisualization data={graphData} height="500px" layout="cose" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select an entity to visualize its network neighborhood
          </div>
        )}
      </div>
    </div>
  );
}

function PathView({
  datasetId,
  wallets,
  sourceEntity,
  setSourceEntity,
  targetEntity,
  setTargetEntity,
  pathResult,
  setPathResult,
}: { datasetId: string; wallets: any[]; sourceEntity: string; setSourceEntity: (e: string) => void; targetEntity: string; setTargetEntity: (e: string) => void; pathResult: any; setPathResult: (p: any) => void }) {
  const handleFindPath = async () => {
    if (!sourceEntity || !targetEntity) return;
    try {
      const response = await fetch(`/api/graph/path?source=${sourceEntity}&target=${targetEntity}&dataset_id=${datasetId}`);
      const data = await response.json();
      setPathResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shortest Path Finder</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Entity</label>
            <select
              value={sourceEntity}
              onChange={e => setSourceEntity(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="">Select source...</option>
              {wallets.slice(0, 100).map(w => (
                <option key={w.address} value={w.address}>{truncateAddress(w.address)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Entity</label>
            <select
              value={targetEntity}
              onChange={e => setTargetEntity(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="">Select target...</option>
              {wallets.slice(0, 100).map(w => (
                <option key={w.address} value={w.address}>{truncateAddress(w.address)}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleFindPath}
          disabled={!sourceEntity || !targetEntity}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
        >
          Find Shortest Path
        </button>
      </div>

      {pathResult && (
        <div className="bg-white rounded-xl border p-6">
          <h4 className="font-semibold text-gray-900 mb-3">{pathResult.found ? 'Path Found' : 'No Path Found'}</h4>
          {pathResult.found && pathResult.path.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {pathResult.path.map((node: string, i: number) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="font-mono text-sm">{truncateAddress(node)}</span>
                  {i < pathResult.path.length - 1 && <span className="text-gray-400">→</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ComponentsView({ components }: { components: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Connected Components ({components.length})</h3>
      <DataTable
        data={components.slice(0, 50)}
        columns={[
          { key: 'id', header: 'Component ID', render: (_, v: number) => <span className="font-mono">{v}</span> },
          { key: 'size', header: 'Size', render: (_, v: number) => <span className="font-mono">{formatNumber(v)}</span>, sortable: true },
          { key: 'nodes', header: 'Nodes', render: (row: any) => (
            <div className="flex flex-wrap gap-1">
              {row.nodes.slice(0, 5).map((n: string, i: number) => (
                <span key={i} className="px-1.5 py-0.5 text-xs bg-gray-100 rounded font-mono">{truncateAddress(n, 6)}</span>
              ))}
              {row.nodes.length > 5 && <span className="text-xs text-gray-500">+{row.nodes.length - 5} more</span>}
            </div>
          )},
        ]}
        keyExtractor={c => String(c.id)}
        emptyMessage="No components found"
        showPagination={false}
      />
    </div>
  );
}