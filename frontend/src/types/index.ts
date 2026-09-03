export interface RiskLevel {
  LOW: 'LOW';
  MEDIUM: 'MEDIUM';
  HIGH: 'HIGH';
  CRITICAL: 'CRITICAL';
}

export type RiskLevelValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AlertReason {
  signal: string;
  description: string;
  contribution: number;
  evidence_type: 'observed' | 'model_derived' | 'heuristic' | 'correlation';
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
  risk_level: RiskLevelValue;
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
  risk_level: RiskLevelValue;
  community_id: number | null;
  features: Record<string, unknown>;
}

export interface DashboardSummary {
  transactions: number;
  wallets: number;
  ips: number;
  countries: number;
  alerts: number;
  critical_alerts: number;
  high_alerts: number;
}

export interface RiskDistribution {
  distribution: Record<RiskLevelValue, number>;
}

export interface TransactionVolume {
  volume: Array<{
    timestamp: string;
    count: number;
    volume: number;
  }>;
}

export interface TopAlertsResponse {
  alerts: Alert[];
}

export interface TopWalletsResponse {
  wallets: Wallet[];
}

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  format: 'csv' | 'json' | 'xml';
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  total_records: number;
  valid_records: number;
  invalid_records: number;
  duplicates: number;
  warnings: string[];
  created_at: string;
  processed_at: string | null;
}

export interface MLStatus {
  model_type: string;
  trained: boolean;
  training_timestamp: string | null;
  feature_count: number;
  dataset_used: string | null;
  model_version: string;
  parameters: Record<string, unknown>;
}

export interface MLPredictResponse {
  dataset_id: string;
  predictions: Array<{
    wallet_id: string;
    anomaly_score: number;
    is_anomaly: boolean;
    raw_score: number;
  }>;
  total: number;
  anomalies_detected: number;
}

export interface InvestigationResponse {
  entity_id: string;
  entity_type: string;
  risk_score: number;
  risk_level: RiskLevelValue;
  reasons: AlertReason[];
  related_wallets: string[];
  related_transactions: Array<Record<string, unknown>>;
  related_ips: string[];
  related_asns: string[];
  countries: string[];
  timeline: Array<Record<string, unknown>>;
  graph_neighborhood: GraphData;
  transaction_flow: Array<Record<string, unknown>>;
  correlation_evidence: CorrelationEvidence[];
}

export interface GraphNode {
  id: string;
  type: 'wallet' | 'transaction' | 'ip' | 'asn' | 'country';
  label: string;
  risk_score: number;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  amount?: number;
  timestamp?: string;
  confidence: number;
  relationship_type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  limit: number;
}