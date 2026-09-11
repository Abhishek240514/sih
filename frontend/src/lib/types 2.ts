// ─── Enums ──────────────────────────────────────────────────────────
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DatasetStatus = 'uploaded' | 'processing' | 'processed' | 'failed';
export type DatasetFormat = 'csv' | 'json' | 'xml';
export type EvidenceType = 'observed' | 'model_derived' | 'heuristic' | 'correlation';
export type GraphNodeType = 'wallet' | 'transaction' | 'ip' | 'asn' | 'country';

// ─── Alert ──────────────────────────────────────────────────────────
export interface AlertReason {
  signal: string;
  description: string;
  contribution: number;
  evidence_type: EvidenceType;
}

export interface CorrelationEvidence {
  ip: string;
  txid: string;
  correlation_score: number;
  evidence: string[];
}

export interface Alert {
  alert_id: string;
  entity_id: string;
  entity_type: string;
  risk_score: number;
  risk_level: RiskLevel;
  timestamp: string;
  reasons: AlertReason[];
  related_transactions: string[];
  related_wallets: string[];
  related_ips: string[];
  related_asns: string[];
  related_countries: string[];
  graph_statistics: Record<string, unknown>;
  correlation_evidence: CorrelationEvidence[];
}

export interface TopAlertResponse {
  alerts: Alert[];
}

// ─── Wallet ─────────────────────────────────────────────────────────
export interface WalletFeatures {
  transaction_count: number;
  total_input_amount: number;
  total_output_amount: number;
  average_amount: number;
  median_amount: number;
  amount_std: number;
  total_fees: number;
  transaction_velocity: number;
  active_duration: number;
  transactions_per_hour: number;
  transactions_per_day: number;
  burst_score: number;
  dormant_to_active_score: number;
  degree: number;
  weighted_degree: number;
  in_degree: number;
  out_degree: number;
  betweenness_centrality: number;
  closeness_centrality: number;
  pagerank: number;
  clustering_coefficient: number;
  community_id?: number | null;
  community_size: number;
  fan_in: number;
  fan_out: number;
  unique_counterparties: number;
  consolidation_score: number;
  dispersion_score: number;
  unique_ips: number;
  unique_asns: number;
  unique_countries: number;
  ip_change_rate: number;
  network_observation_count: number;
}

export interface Wallet {
  address: string;
  transaction_count: number;
  total_in: number;
  total_out: number;
  average_transaction_value: number;
  unique_counterparties: number;
  fan_in: number;
  fan_out: number;
  first_seen: string | null;
  last_seen: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  community_id: number | null;
  features: WalletFeatures;
}

export interface TopWalletResponse {
  wallets: Wallet[];
}

// ─── Dashboard ──────────────────────────────────────────────────────
export interface DashboardSummary {
  transactions: number;
  wallets: number;
  ips: number;
  countries: number;
  alerts: number;
  critical_alerts: number;
  high_alerts: number;
}

export interface RiskDistributionResponse {
  distribution: Record<string, number>;
}

export interface TransactionVolumeResponse {
  volume: Record<string, unknown>[];
}

// ─── Dataset ────────────────────────────────────────────────────────
export interface DatasetResponse {
  id: string;
  name: string;
  filename: string;
  format: DatasetFormat;
  status: DatasetStatus;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  duplicates: number;
  warnings: string[];
  created_at: string;
  processed_at: string | null;
}

export interface IngestionReport {
  dataset_id: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  duplicates: number;
  warnings: string[];
}

// ─── Graph ──────────────────────────────────────────────────────────
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  risk_score: number;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  amount: number | null;
  timestamp: string | null;
  confidence: number;
  relationship_type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Investigation ──────────────────────────────────────────────────
export interface NormalizedTransaction {
  txid: string;
  timestamp: string;
  inputs: string[];
  outputs: string[];
  input_amounts: number[];
  output_amounts: number[];
  fee: number;
  script_type: string | null;
  source_ips: string[];
  destination_ips: string[];
  source_ports: number[];
  destination_ports: number[];
  geo_country: string | null;
  asn: string | null;
  input_amount: number;
  output_amount: number;
}

export interface InvestigationResponse {
  entity_id: string;
  entity_type: string;
  risk_score: number;
  risk_level: RiskLevel;
  reasons: AlertReason[];
  related_wallets: Wallet[];
  related_transactions: NormalizedTransaction[];
  related_ips: string[];
  related_asns: string[];
  countries: string[];
  timeline: Record<string, unknown>[];
  graph_neighborhood: GraphData;
  transaction_flow: Record<string, unknown>[];
  correlation_evidence: CorrelationEvidence[];
}

// ─── ML ─────────────────────────────────────────────────────────────
export interface MLStatusResponse {
  model_type: string;
  trained: boolean;
  training_timestamp: string | null;
  feature_count: number;
  dataset_used: string | null;
  model_version: string | null;
  parameters: Record<string, unknown>;
}

export interface MLTrainRequest {
  dataset_id: string;
  model_type?: string;
  parameters?: Record<string, unknown> | null;
}

export interface MLTrainResponse {
  model_id: string;
  model_type: string;
  version: string;
  trained_at: string;
  feature_count: number;
  metrics: Record<string, number>;
}

// ─── Health ─────────────────────────────────────────────────────────
export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}
