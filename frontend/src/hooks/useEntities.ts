import { useQuery } from '@tanstack/react-query';
import { useDataset } from '@/context/DatasetContext';
import * as api from '@/lib/api';

export function useEntities(skip: number = 0, limit: number = 20) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['entities', activeDatasetId, skip, limit],
    queryFn: () => api.getEntities(activeDatasetId!, skip, limit),
    enabled: !!activeDatasetId,
  });
}

export function useEntity(entityId: string) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['entity', entityId, activeDatasetId],
    queryFn: () => api.getEntity(entityId, activeDatasetId!),
    enabled: !!activeDatasetId && !!entityId,
  });
}
