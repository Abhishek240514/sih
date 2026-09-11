import { fetchBaseQuery } from '@tanstack/react-query';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; version: string; timestamp: string }>('/health'),

  // Dashboard
  getDashboardSummary: (dataset_id: string) =>
    request<import('../types').DashboardSummary>(`/dashboard/summary?dataset_id=${dataset_id}`),
  getTopAlerts: (dataset_id: string, limit = 10) =>
    request<import('../types').TopAlertsResponse>(`/dashboard/top-alerts?dataset_id=${dataset_id}&limit=${limit}`),
  getDashboardTopWallets: (dataset_id: string, limit = 10) =>
    request<import('../types').TopWalletsResponse>(`/dashboard/top-wallets?dataset_id=${dataset_id}&limit=${limit}`),
  getRiskDistribution: (dataset_id: string) =>
    request<import('../types').RiskDistribution>(`/dashboard/risk-distribution?dataset_id=${dataset_id}`),
  getTransactionVolume: (dataset_id: string, buckets = 24) =>
    request<import('../types').TransactionVolume>(`/dashboard/transaction-volume?dataset_id=${dataset_id}&buckets=${buckets}`),

  // Datasets
  getDatasets: (skip = 0, limit = 100) =>
    request<import('../types').Dataset[]>(`/datasets?skip=${skip}&limit=${limit}`),
  getDataset: (dataset_id: string) =>
    request<import('../types').Dataset>(`/datasets/${dataset_id}`),
  uploadDataset: (file: File, name: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    return request<import('../types').Dataset>('/datasets/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  processDataset: (dataset_id: string) =>
    request<{ message: string; dataset_id: string }>(`/datasets/${dataset_id}/process`, { method: 'POST' }),
  deleteDataset: (dataset_id: string) =>
    request<{ message: string; dataset_id: string }>(`/datasets/${dataset_id}`, { method: 'DELETE' }),

  // Entities (Wallets)
  getWallets: (dataset_id: string, skip = 0, limit = 100) =>
    request<import('../types').TopWalletsResponse>(`/entities/dataset/${dataset_id}?skip=${skip}&limit=${limit}`),
  getTopWallets: (dataset_id: string, limit = 20) =>
    request<import('../types').TopWalletsResponse>(`/entities/dataset/${dataset_id}/top?limit=${limit}`),
  getWallet: (entity_id: string, dataset_id: string) =>
    request<import('../types').Wallet>(`/entities/${entity_id}?dataset_id=${dataset_id}`),

  // Alerts
  getAlerts: (dataset_id: string, skip = 0, limit = 100, risk_level?: string) =>
    request<import('../types').TopAlertsResponse>(`/alerts/dataset/${dataset_id}?skip=${skip}&limit=${limit}${risk_level ? `&risk_level=${risk_level}` : ''}`),
  getAlertStats: (dataset_id: string) =>
    request<{ total: number; by_level: Record<string, number> }>(`/alerts/dataset/${dataset_id}/stats`),
  getTopAlertsPaginated: (dataset_id: string, limit = 20) =>
    request<import('../types').TopAlertsResponse>(`/alerts/top?dataset_id=${dataset_id}&limit=${limit}`),

  // Investigations
  getInvestigation: (entity_id: string, dataset_id: string) =>
    request<import('../types').InvestigationResponse>(`/investigations/${entity_id}?dataset_id=${dataset_id}`),

  // Graph
  getEntityGraph: (entity_id: string, dataset_id: string, depth = 2, max_nodes = 100, max_edges = 200) =>
    request<import('../types').GraphData>(`/graph/entity/${entity_id}?dataset_id=${dataset_id}&depth=${depth}&max_nodes=${max_nodes}&max_edges=${max_edges}`),
  getShortestPath: (source: string, target: string, dataset_id: string) =>
    request<{ path: string[]; found: boolean }>(`/graph/path?source=${source}&target=${target}&dataset_id=${dataset_id}`),
  getConnectedComponents: (dataset_id: string) =>
    request<{ components: Array<{ id: number; nodes: string[]; size: number }>; count: number }>(`/graph/components?dataset_id=${dataset_id}`),

  // ML
  getMLStatus: () => request<import('../types').MLStatus>('/ml/status'),
  trainModel: (dataset_id: string, model_type: string, parameters?: Record<string, unknown>) =>
    request<{ model_id: string; model_type: string; version: string; trained_at: string; feature_count: number; metrics: Record<string, unknown> }>('/ml/train', {
      method: 'POST',
      body: JSON.stringify({ dataset_id, model_type, parameters }),
    }),
  predictAnomalies: (dataset_id: string) =>
    request<import('../types').MLPredictResponse>('/ml/predict', {
      method: 'POST',
      body: JSON.stringify({ dataset_id }),
    }),
  listModels: () =>
    request<Array<{ id: string; model_type: string; version: string; trained_at: string; dataset_id: string | null; feature_count: number; metrics: Record<string, unknown>; is_active: boolean }>>('/ml/models'),

  // Transactions
  getTransactions: (dataset_id: string, skip = 0, limit = 100) =>
    request<{ transactions: Array<Record<string, unknown>>; total: number }>(`/transactions/dataset/${dataset_id}?skip=${skip}&limit=${limit}`),
};

// React Query hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useGetHealthQuery() {
  return useQuery({ queryKey: ['health'], queryFn: api.getHealth });
}

export function useGetDashboardSummaryQuery(params: { dataset_id: string }) {
  return useQuery({ queryKey: ['dashboard', 'summary', params.dataset_id], queryFn: () => api.getDashboardSummary(params.dataset_id), enabled: !!params.dataset_id });
}

export function useGetTopAlertsQuery(params: { dataset_id: string; limit?: number }) {
  return useQuery({ queryKey: ['dashboard', 'top-alerts', params.dataset_id, params.limit], queryFn: () => api.getTopAlerts(params.dataset_id, params.limit), enabled: !!params.dataset_id });
}

export function useGetDashboardTopWalletsQuery(params: { dataset_id: string; limit?: number }) {
  return useQuery({ queryKey: ['dashboard', 'top-wallets', params.dataset_id, params.limit], queryFn: () => api.getDashboardTopWallets(params.dataset_id, params.limit), enabled: !!params.dataset_id });
}

export function useGetRiskDistributionQuery(params: { dataset_id: string }) {
  return useQuery({ queryKey: ['dashboard', 'risk-distribution', params.dataset_id], queryFn: () => api.getRiskDistribution(params.dataset_id), enabled: !!params.dataset_id });
}

export function useGetTransactionVolumeQuery(params: { dataset_id: string; buckets?: number }) {
  return useQuery({ queryKey: ['dashboard', 'transaction-volume', params.dataset_id, params.buckets], queryFn: () => api.getTransactionVolume(params.dataset_id, params.buckets), enabled: !!params.dataset_id });
}

export function useGetDatasetsQuery(params: { skip?: number; limit?: number }) {
  return useQuery({ queryKey: ['datasets', params.skip, params.limit], queryFn: () => api.getDatasets(params.skip, params.limit) });
}

export function useGetDatasetQuery(params: { dataset_id: string }) {
  return useQuery({ queryKey: ['datasets', params.dataset_id], queryFn: () => api.getDataset(params.dataset_id), enabled: !!params.dataset_id });
}

export function useUploadDatasetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name }: { file: File; name: string }) => api.uploadDataset(file, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
  });
}

export function useProcessDatasetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dataset_id: string) => api.processDataset(dataset_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
  });
}

export function useDeleteDatasetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dataset_id: string) => api.deleteDataset(dataset_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
  });
}

export function useGetWalletsQuery(params: { dataset_id: string; skip?: number; limit?: number }) {
  return useQuery({ queryKey: ['entities', params.dataset_id, params.skip, params.limit], queryFn: () => api.getWallets(params.dataset_id, params.skip, params.limit), enabled: !!params.dataset_id });
}

export function useGetTopWalletsQuery(params: { dataset_id: string; limit?: number }) {
  return useQuery({ queryKey: ['entities', 'top', params.dataset_id, params.limit], queryFn: () => api.getTopWallets(params.dataset_id, params.limit), enabled: !!params.dataset_id });
}

export function useGetWalletQuery(params: { entity_id: string; dataset_id: string }) {
  return useQuery({ queryKey: ['entities', params.entity_id, params.dataset_id], queryFn: () => api.getWallet(params.entity_id, params.dataset_id), enabled: !!params.entity_id && !!params.dataset_id });
}

export function useGetAlertsQuery(params: { dataset_id: string; skip?: number; limit?: number; risk_level?: string }) {
  return useQuery({ queryKey: ['alerts', params.dataset_id, params.skip, params.limit, params.risk_level], queryFn: () => api.getAlerts(params.dataset_id, params.skip, params.limit, params.risk_level), enabled: !!params.dataset_id });
}

export function useGetAlertStatsQuery(params: { dataset_id: string }) {
  return useQuery({ queryKey: ['alerts', 'stats', params.dataset_id], queryFn: () => api.getAlertStats(params.dataset_id), enabled: !!params.dataset_id });
}

export function useGetTopAlertsPaginatedQuery(params: { dataset_id: string; limit?: number }) {
  return useQuery({ queryKey: ['alerts', 'top', params.dataset_id, params.limit], queryFn: () => api.getTopAlertsPaginated(params.dataset_id, params.limit), enabled: !!params.dataset_id });
}

export function useGetInvestigationQuery(params: { entity_id: string; dataset_id: string }) {
  return useQuery({ queryKey: ['investigations', params.entity_id, params.dataset_id], queryFn: () => api.getInvestigation(params.entity_id, params.dataset_id), enabled: !!params.entity_id && !!params.dataset_id });
}

export function useGetEntityGraphQuery(params: { entity_id: string; dataset_id: string; depth?: number; max_nodes?: number; max_edges?: number }) {
  return useQuery({ queryKey: ['graph', params.entity_id, params.dataset_id, params.depth], queryFn: () => api.getEntityGraph(params.entity_id, params.dataset_id, params.depth, params.max_nodes, params.max_edges), enabled: !!params.entity_id && !!params.dataset_id });
}

export function useGetShortestPathQuery(params: { source: string; target: string; dataset_id: string }) {
  return useQuery({ queryKey: ['graph', 'path', params.source, params.target, params.dataset_id], queryFn: () => api.getShortestPath(params.source, params.target, params.dataset_id), enabled: !!params.source && !!params.target && !!params.dataset_id });
}

export function useGetConnectedComponentsQuery(params: { dataset_id: string }) {
  return useQuery({ queryKey: ['graph', 'components', params.dataset_id], queryFn: () => api.getConnectedComponents(params.dataset_id), enabled: !!params.dataset_id });
}

export function useGetMLStatusQuery() {
  return useQuery({ queryKey: ['ml', 'status'], queryFn: api.getMLStatus });
}

export function useTrainModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dataset_id, model_type, parameters }: { dataset_id: string; model_type: string; parameters?: Record<string, unknown> }) => api.trainModel(dataset_id, model_type, parameters),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ml', 'status'] }),
  });
}

export function usePredictAnomaliesMutation() {
  return useMutation({ mutationFn: (dataset_id: string) => api.predictAnomalies(dataset_id) });
}

export function useListModelsQuery() {
  return useQuery({ queryKey: ['ml', 'models'], queryFn: api.listModels });
}

export function useGetTransactionsQuery(params: { dataset_id: string; skip?: number; limit?: number }) {
  return useQuery({ queryKey: ['transactions', params.dataset_id, params.skip, params.limit], queryFn: () => api.getTransactions(params.dataset_id, params.skip, params.limit), enabled: !!params.dataset_id });
}
