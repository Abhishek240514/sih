import type { RiskLevel } from './types';

// ---------------------------------------------------------------------------
// Base fetch helper
// ---------------------------------------------------------------------------

const API_BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

// ---------------------------------------------------------------------------
// Dashboard  (prefix: /api/dashboard)
// ---------------------------------------------------------------------------

export const getDashboardSummary = async (datasetId?: string) =>
  apiFetch<{
    transactions: number;
    wallets: number;
    ips: number;
    countries: number;
    alerts: number;
    critical_alerts: number;
    high_alerts: number;
  }>(`/dashboard/summary${qs({ dataset_id: datasetId })}`);

export const getRiskDistribution = async (datasetId?: string) =>
  apiFetch<{ distribution: Record<string, number> }>(
    `/dashboard/risk-distribution${qs({ dataset_id: datasetId })}`,
  );

export const getTransactionVolume = async (datasetId?: string, buckets = 24) =>
  apiFetch<{ volume: { timestamp: string; count: number; volume: number }[] }>(
    `/dashboard/transaction-volume${qs({ dataset_id: datasetId, buckets })}`,
  );

export const getTopAlerts = async (datasetId?: string, limit = 5) =>
  apiFetch<{ alerts: any[] }>(
    `/dashboard/top-alerts${qs({ dataset_id: datasetId, limit })}`,
  );

export const getTopWallets = async (datasetId?: string, limit = 5) =>
  apiFetch<{ wallets: any[] }>(
    `/dashboard/top-wallets${qs({ dataset_id: datasetId, limit })}`,
  );

// ---------------------------------------------------------------------------
// Alerts  (prefix: /api/alerts)
// ---------------------------------------------------------------------------

export const getAlerts = async (
  datasetId?: string,
  skip = 0,
  limit = 20,
  riskLevel?: RiskLevel,
) => {
  const resp = await apiFetch<{ alerts: any[] }>(
    `/alerts/dataset/${datasetId}${qs({ skip, limit, risk_level: riskLevel })}`,
  );
  return resp.alerts;
};

export const getAlertStats = async (datasetId?: string) =>
  apiFetch<any>(`/alerts/dataset/${datasetId}/stats`);

// ---------------------------------------------------------------------------
// Entities / Wallets  (prefix: /api/entities)
// ---------------------------------------------------------------------------

export const getEntities = async (
  datasetId?: string,
  skip = 0,
  limit = 20,
) => {
  const resp = await apiFetch<{ wallets: any[] }>(
    `/entities/dataset/${datasetId}${qs({ skip, limit })}`,
  );
  return resp.wallets;
};

export const getEntity = async (entityId: string, datasetId?: string) =>
  apiFetch<any>(`/entities/${entityId}${qs({ dataset_id: datasetId })}`);

// ---------------------------------------------------------------------------
// Datasets  (prefix: /api/datasets)
// ---------------------------------------------------------------------------

export const getDatasets = async () =>
  apiFetch<any[]>('/datasets');

export const uploadDataset = async (file: File, name?: string) => {
  const form = new FormData();
  form.append('file', file);
  if (name) form.append('name', name);

  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    body: form,
    // No Content-Type header — browser sets multipart boundary automatically
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
};

export const processDataset = async (datasetId: string) =>
  apiFetch<any>(`/datasets/${datasetId}/process`, { method: 'POST' });

export const deleteDataset = async (datasetId: string) =>
  apiFetch<any>(`/datasets/${datasetId}`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Graph  (prefix: /api/graph)
// ---------------------------------------------------------------------------

export const getGraphData = async (datasetId?: string) =>
  apiFetch<any>(`/graph/components${qs({ dataset_id: datasetId })}`);

export const getEntityGraph = async (
  entityId: string,
  datasetId?: string,
  depth = 2,
  maxNodes = 100,
  maxEdges = 200,
) =>
  apiFetch<any>(
    `/graph/entity/${entityId}${qs({
      dataset_id: datasetId,
      depth,
      max_nodes: maxNodes,
      max_edges: maxEdges,
    })}`,
  );

export const getShortestPath = async (
  source: string,
  target: string,
  datasetId?: string,
) =>
  apiFetch<any>(
    `/graph/path${qs({ source, target, dataset_id: datasetId })}`,
  );

export const getConnectedComponents = async (datasetId?: string) =>
  apiFetch<any>(`/graph/components${qs({ dataset_id: datasetId })}`);

// ---------------------------------------------------------------------------
// Investigations  (prefix: /api/investigations)
// ---------------------------------------------------------------------------

export const getInvestigation = async (
  entityId: string,
  datasetId?: string,
) =>
  apiFetch<any>(
    `/investigations/${entityId}${qs({ dataset_id: datasetId })}`,
  );

export const getInvestigationSummary = async (
  entityId: string,
  datasetId?: string,
) =>
  apiFetch<any>(
    `/investigations/${entityId}/summary${qs({ dataset_id: datasetId })}`,
  );

export const getCases = async () =>
  apiFetch<any[]>('/investigations/');

// ---------------------------------------------------------------------------
// ML Models  (prefix: /api/ml)
// ---------------------------------------------------------------------------

export const getMLStatus = async () =>
  apiFetch<any>('/ml/status');

export const getModelFeatures = async (): Promise<Record<string, number>> =>
  apiFetch<Record<string, number>>('/ml/features');

export const listModels = async () =>
  apiFetch<any[]>('/ml/models');

export const trainModel = async (params: any) =>
  apiFetch<any>('/ml/train', {
    method: 'POST',
    body: JSON.stringify(params),
  });

export const predictAnomalies = async (params: any) =>
  apiFetch<any>(`/ml/predict${qs({ dataset_id: params?.dataset_id })}`, {
    method: 'POST',
  });

export const loadModel = async (modelId: string) =>
  apiFetch<any>(`/ml/load${qs({ model_id: modelId })}`, { method: 'POST' });
