import { useQuery } from '@tanstack/react-query';
import { useDataset } from '@/context/DatasetContext';
import * as api from '@/lib/api';

export function useEntityGraph(entityId: string, depth: number = 2, maxNodes: number = 100, maxEdges: number = 200) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['graph', 'entity', entityId, activeDatasetId, depth, maxNodes, maxEdges],
    queryFn: () => api.getEntityGraph(entityId, activeDatasetId!, depth, maxNodes, maxEdges),
    enabled: !!activeDatasetId && !!entityId,
  });
}

export function useShortestPath(source: string, target: string) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['graph', 'path', source, target, activeDatasetId],
    queryFn: () => api.getShortestPath(source, target, activeDatasetId!),
    enabled: !!activeDatasetId && !!source && !!target,
  });
}

export function useConnectedComponents() {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['graph', 'components', activeDatasetId],
    queryFn: () => api.getConnectedComponents(activeDatasetId!),
    enabled: !!activeDatasetId,
  });
}
