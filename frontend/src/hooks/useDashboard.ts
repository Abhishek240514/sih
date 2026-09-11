import { useQuery } from '@tanstack/react-query';
import { useDataset } from '@/context/DatasetContext';
import * as api from '@/lib/api';

export function useDashboardSummary() {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['dashboard', 'summary', activeDatasetId],
    queryFn: () => api.getDashboardSummary(activeDatasetId!),
    enabled: !!activeDatasetId,
  });
}

export function useRiskDistribution() {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['dashboard', 'risk-distribution', activeDatasetId],
    queryFn: () => api.getRiskDistribution(activeDatasetId!),
    enabled: !!activeDatasetId,
  });
}

export function useTransactionVolume(buckets: number = 24) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['dashboard', 'transaction-volume', activeDatasetId, buckets],
    queryFn: () => api.getTransactionVolume(activeDatasetId!, buckets),
    enabled: !!activeDatasetId,
  });
}

export function useTopAlerts(limit: number = 5) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['dashboard', 'top-alerts', activeDatasetId, limit],
    queryFn: () => api.getTopAlerts(activeDatasetId!, limit),
    enabled: !!activeDatasetId,
  });
}

export function useTopWallets(limit: number = 5) {
  const { activeDatasetId } = useDataset();
  return useQuery({
    queryKey: ['dashboard', 'top-wallets', activeDatasetId, limit],
    queryFn: () => api.getTopWallets(activeDatasetId!, limit),
    enabled: !!activeDatasetId,
  });
}
