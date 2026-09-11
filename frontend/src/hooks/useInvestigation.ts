import { useQuery } from '@tanstack/react-query';
import { useDataset } from '@/context/DatasetContext';
import * as api from '@/lib/api';

export function useInvestigation(entityId: string) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['investigation', entityId, activeDatasetId],
    queryFn: () => api.getInvestigation(entityId, activeDatasetId!),
    enabled: !!activeDatasetId && !!entityId,
  });
}

export function useInvestigationSummary(entityId: string) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['investigation', 'summary', entityId, activeDatasetId],
    queryFn: () => api.getInvestigationSummary(entityId, activeDatasetId!),
    enabled: !!activeDatasetId && !!entityId,
  });
}
