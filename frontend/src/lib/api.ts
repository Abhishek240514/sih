import {
  MOCK_ALERTS,
  MOCK_CASES,
  MOCK_ENTITIES,
  MOCK_DATASETS,
  MOCK_CYTOSCAPE_ELEMENTS,
  MOCK_VOLUME_TREND,
} from './forensicData';
import type { RiskLevel } from './types';

export const getDashboardSummary = async (_datasetId?: string) => ({
  transactions: 14280,
  wallets: 342,
  ips: 18,
  countries: 6,
  alerts: 18,
  critical_alerts: 4,
  high_alerts: 8,
});

export const getRiskDistribution = async (_datasetId?: string) => ({
  distribution: {
    CRITICAL: 18,
    HIGH: 42,
    MEDIUM: 96,
    LOW: 284,
  },
});

export const getTransactionVolume = async (_datasetId?: string, _buckets = 24) => ({
  volume: MOCK_VOLUME_TREND.map(v => ({
    timestamp: v.date,
    count: v.alerts,
    volume: v.flagged_btc,
  })),
});

export const getTopAlerts = async (_datasetId?: string, limit = 5) => ({
  alerts: MOCK_ALERTS.slice(0, limit),
});

export const getTopWallets = async (_datasetId?: string, _limit = 5) => ({
  wallets: MOCK_ENTITIES.slice(0, _limit),
});

export const getAlerts = async (
  _datasetId?: string,
  skip: number = 0,
  limit: number = 20,
  riskLevel?: RiskLevel
) => {
  let list = MOCK_ALERTS;
  if (riskLevel) {
    list = list.filter(a => a.risk_level === riskLevel);
  }
  return list.slice(skip, skip + limit);
};

export const getAlertStats = async (_datasetId?: string) => ({
  total: MOCK_ALERTS.length,
  critical: MOCK_ALERTS.filter(a => a.risk_level === 'CRITICAL').length,
  high: MOCK_ALERTS.filter(a => a.risk_level === 'HIGH').length,
  medium: MOCK_ALERTS.filter(a => a.risk_level === 'MEDIUM').length,
  low: MOCK_ALERTS.filter(a => a.risk_level === 'LOW').length,
});

export const getCases = async () => MOCK_CASES;

export const getEntities = async (_datasetId?: string, skip: number = 0, limit: number = 20) => {
  return MOCK_ENTITIES.slice(skip, skip + limit);
};

export const getEntity = async (entityId: string, _datasetId?: string) => {
  return MOCK_ENTITIES.find(e => e.id === entityId || (e as any).address === entityId) || MOCK_ENTITIES[0];
};

export const getDatasets = async () => MOCK_DATASETS;

export const uploadDataset = async (file: File, name?: string) => ({
  id: `ds-${Date.now()}`,
  name: name || file.name,
  filename: file.name,
  file_size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
  status: 'READY' as const,
  records_count: 5000,
  valid_tx_count: 4980,
  anomaly_count: 34,
  uploaded_at: new Date().toISOString(),
  tags: ['forensic', 'upload'],
});

export const processDataset = async (datasetId: string) => ({
  success: true,
  dataset_id: datasetId,
  status: 'READY' as const,
});

export const deleteDataset = async (datasetId: string) => ({
  success: true,
  dataset_id: datasetId,
});

export const getGraphData = async () => MOCK_CYTOSCAPE_ELEMENTS;

export const getEntityGraph = async (
  _entityId: string,
  _datasetId?: string,
  _depth = 2,
  _maxNodes = 100,
  _maxEdges = 200
) => {
  return MOCK_CYTOSCAPE_ELEMENTS;
};

export const getShortestPath = async (source: string, target: string, _datasetId?: string) => ({
  source,
  target,
  path: [source, target],
  distance: 1,
});

export const getConnectedComponents = async (_datasetId?: string) => ({
  components: [[MOCK_ENTITIES[0]?.id || 'node-1', MOCK_ENTITIES[1]?.id || 'node-2']],
});

export const getInvestigation = async (entityId: string, _datasetId?: string) => ({
  entity_id: entityId,
  entity_type: 'wallet',
  summary: 'High-risk peel chain tracking active transaction velocity.',
  risk_score: 96,
  risk_level: 'CRITICAL',
  findings: [
    'Automated 1-in-2-out Peel Chain sequence identified',
    'CoinJoin mixer hop identified within 2 transactions',
    'OFAC Sanctioned entity overlap',
  ],
  graph_neighborhood: {
    nodes: [
      { id: entityId, label: entityId, type: 'wallet', risk_score: 96 },
      { id: 'tx-darkside-01', label: 'tx-darkside-01', type: 'transaction', risk_score: 94 },
      { id: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', label: '1A1z...vfNa', type: 'wallet', risk_score: 98 },
      { id: '185.220.101.5', label: '185.220.101.5', type: 'ip', risk_score: 82 },
    ],
    edges: [
      { source: entityId, target: 'tx-darkside-01', type: 'SPEND', amount: 75.0 },
      { source: 'tx-darkside-01', target: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', type: 'OUTPUT', amount: 63.7 },
      { source: entityId, target: '185.220.101.5', type: 'BROADCAST_IP', amount: 0 },
    ],
  },
  related_wallets: [
    { address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', balance: 63.7, risk_score: 98, community_id: 104 },
    { address: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', balance: 14.2, risk_score: 91, community_id: 104 },
  ],
  timeline: [
    { timestamp: '2026-09-10T12:00:00Z', event: 'Initial Ransom Inflow', btc: 75.0, type: 'INFLOW' },
    { timestamp: '2026-09-10T12:14:00Z', event: 'Peel Chain Branch 01', btc: 11.3, type: 'PEEL' },
    { timestamp: '2026-09-10T12:30:00Z', event: 'Mixer Inflow (ChipMixer)', btc: 5.0, type: 'MIXER' },
  ],
  related_transactions: [
    { txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b', btc: 75.0, fee: 0.00045, confirmations: 184, timestamp: '2026-09-10T12:00:00Z' },
    { txid: '9b2d3e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda88c', btc: 63.7, fee: 0.00032, confirmations: 182, timestamp: '2026-09-10T12:14:00Z' },
  ],
  related_ips: [
    { ip: '185.220.101.5', country: 'NL', asn: 'AS208323', confidence: 0.94 },
    { ip: '194.26.29.112', country: 'RU', asn: 'AS44050', confidence: 0.88 },
  ],
  related_asns: [
    { asn: 'AS208323', name: 'Tor Exit Node Relay', country: 'NL' },
    { asn: 'AS44050', name: 'Bulletproof Hosting Network', country: 'RU' },
  ],
  countries: ['Netherlands', 'Russian Federation', 'Seychelles'],
  reasons: [
    'Automated peel chain sequence with fixed change amounts',
    'Cluster overlap with OFAC Sanctioned Entity SDN-14022',
    'P2P broadcast correlated to known bulletproof VPN',
  ],
  correlation_evidence: [
    { title: 'Bitcoin P2P Relay Node Broadcast', detail: 'Correlated through mempool timing delta <420ms', type: 'correlation' },
    { title: 'Multi-Input Common Spend Heuristic', detail: '3 inputs co-spent in transaction block #840192', type: 'heuristic' },
  ],
});

export const getInvestigationSummary = async (entityId: string, _datasetId?: string) => ({
  entity_id: entityId,
  total_tx: 142,
  illicit_volume_btc: 48.2,
  status: 'CONFIRMED',
});

export const getMLStatus = async () => ({
  status: 'READY',
  active_model: 'isolation_forest_v2',
  model_type: 'Isolation Forest (Robust)',
  trained: true,
  feature_count: 23,
  dataset_used: 'DS-2024-DARKSIDE',
  model_version: 'v2.4.1',
  training_timestamp: '2026-09-10T14:30:00Z',
  total_trained: 18450,
  contamination_rate: 0.038,
  parameters: {
    n_estimators: 100,
    contamination: 0.038,
    max_samples: 'auto',
    bootstrap: false,
  },
});

export const getModelFeatures = async (): Promise<Record<string, number>> => ({
  tx_velocity_1h: 0.94,
  fan_out_degree: 0.88,
  peel_chain_depth: 0.82,
  mixer_hop_proximity: 0.79,
  value_skew_score: 0.71,
  temporal_variance: 0.65,
});

export const listModels = async () => [
  { id: 'if-2024-v1', name: 'Isolation Forest Default', trained_at: '2026-09-08T12:00:00Z', accuracy: 0.962 },
  { id: 'if-2024-v2', name: 'Heuristic-Weighted Tree', trained_at: '2026-09-10T14:30:00Z', accuracy: 0.984 },
];

export const trainModel = async (_params: any) => ({
  success: true,
  model_id: `if-${Date.now()}`,
  version: 'v2.4.2',
  message: 'Model trained successfully on dataset',
});

export const predictAnomalies = async (_params: any) => ({
  anomalies_detected: 84,
  outlier_indices: [12, 45, 89, 142, 301],
});

export const loadModel = async (_modelId: string) => ({
  success: true,
  active_model: _modelId,
});
