import { useQuery } from '@tanstack/react-query';
import { useDataset } from '@/context/DatasetContext';
import * as api from '@/lib/api';
import type { RiskLevel } from '@/lib/types';

export function useAlerts(skip: number = 0, limit: number = 20, riskLevel?: RiskLevel) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['alerts', activeDatasetId, skip, limit, riskLevel],
    queryFn: () => api.getAlerts(activeDatasetId!, skip, limit, riskLevel),
    enabled: !!activeDatasetId,
  });
}

export function useAlertStats() {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['alerts', 'stats', activeDatasetId],
    queryFn: () => api.getAlertStats(activeDatasetId!),
    enabled: !!activeDatasetId,
  });
}
