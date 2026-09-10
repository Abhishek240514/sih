export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BENIGN';
export type EvidenceType = 'observed' | 'model_derived' | 'heuristic' | 'correlation';

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

export interface AlertItem {
  id: string;
  alert_id: string;
  entity_id: string;
  entity_name: string;
  entity_type: 'wallet' | 'cluster' | 'transaction' | 'mixer' | 'vasp' | 'darknet';
  risk_score: number; // 0 - 100
  risk_level: RiskLevel;
  timestamp: string;
  rule_trigger: string;
  status: 'NEW' | 'INVESTIGATING' | 'ESCALATED' | 'DISMISSED';
  amount_btc: number;
  amount_usd: number;
  reasons: AlertReason[];
  related_wallets: string[];
  related_transactions: string[];
  notes?: string;
}

export interface UTXO {
  txid: string;
  vout: number;
  address: string;
  value_btc: number;
  value_usd: number;
  block_height: number;
  timestamp: string;
  spent: boolean;
  script_type: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2tr';
  cluster_tag?: string;
  is_peel_chain?: boolean;
}

export interface BitcoinTransaction {
  txid: string;
  block_height: number;
  timestamp: string;
  inputs: Array<{ address: string; value_btc: number; cluster_id?: string }>;
  outputs: Array<{ address: string; value_btc: number; is_change?: boolean; cluster_id?: string }>;
  total_input_btc: number;
  total_output_btc: number;
  fee_btc: number;
  fee_rate_sat_vb: number;
  heuristic_tags: string[]; // e.g., 'Multi-Input Common Spend', 'Peel Chain Branch', 'CoinJoin / Wasabi'
  risk_score: number;
  risk_level: RiskLevel;
}

export interface EntityProfile {
  id: string;
  name: string;
  category: 'VASP / Exchange' | 'Darknet Market' | 'Ransomware Group' | 'Mixer / Tumbler' | 'Sanctioned Entity (OFAC)' | 'High-Risk P2P' | 'Unidentified Cluster';
  risk_score: number;
  risk_level: RiskLevel;
  total_btc_received: number;
  total_btc_sent: number;
  current_balance_btc: number;
  address_count: number;
  cluster_id: string;
  jurisdiction: string;
  sanctioned: boolean;
  ofac_sdn_id?: string;
  first_seen: string;
  last_seen: string;
  tags: string[];
}

export interface InvestigationCase {
  case_id: string;
  case_number: string;
  title: string;
  status: 'OPEN' | 'IN_REVIEW' | 'COURT_READY' | 'SEIZED' | 'CLOSED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  lead_investigator: string;
  badge_number: string;
  agency: string;
  created_at: string;
  updated_at: string;
  target_entity: string;
  target_cluster_id: string;
  suspect_name?: string;
  seized_btc: number;
  target_btc: number;
  seizure_recovery_rate: number;
  chain_of_custody: Array<{
    id: string;
    timestamp: string;
    action: string;
    actor: string;
    cryptographic_proof_sha256: string;
    notes: string;
  }>;
  evidence_items: Array<{
    id: string;
    type: 'TRANSACTION_UTXO' | 'CLUSTER_MAP' | 'IP_CORRELATION' | 'EXCHANGE_KYC_REQUEST' | 'CHAINALYSIS_AFFIDAVIT';
    identifier: string;
    description: string;
    added_at: string;
    hash_sha256: string;
  }>;
  forensic_notes: string;
}

export interface ForensicHeuristicConfig {
  multi_input_common_spend: boolean;
  change_address_detection: boolean;
  change_decimal_matching: boolean;
  peel_chain_tracking: boolean;
  peel_chain_max_depth: number;
  mixer_deanonymization: boolean;
  coinjoin_whirlpool_filter: boolean;
  minimum_btc_threshold: number;
  clustering_confidence_threshold: number; // 0.0 - 1.0
  hop_distance_limit: number;
}

export interface AnalysisRunLog {
  id: string;
  timestamp: string;
  dataset_id: string;
  dataset_name: string;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED';
  duration_seconds: number;
  records_analyzed: number;
  clusters_formed: number;
  peel_chains_identified: number;
  high_risk_flags: number;
  heuristics_applied: string[];
}

export interface DatasetItem {
  id: string;
  name: string;
  filename: string;
  file_size_mb: number;
  format: 'CSV' | 'JSON' | 'BLOCKCHAIN_RPC' | 'UTXO_SNAPSHOT';
  status: 'READY' | 'PARSING' | 'ERROR' | 'UNPROCESSED';
  sha256_checksum: string;
  records_count: number;
  valid_tx_count: number;
  anomaly_count: number;
  uploaded_at: string;
  last_analyzed_at?: string;
  tags: string[];
}

export interface CytoscapeNodeData {
  id: string;
  label: string;
  type: 'wallet' | 'transaction' | 'mixer' | 'vasp' | 'darknet' | 'seized_wallet' | string;
  risk_score: number;
  risk_level?: RiskLevel;
  balance_btc?: number;
  cluster_name?: string;
  is_seed?: boolean;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  amount_btc: number;
  txid: string;
  timestamp: string;
  fee_sats?: number;
  is_peel_branch?: boolean;
}

export interface CytoscapeGraphElements {
  nodes: Array<{ data: CytoscapeNodeData; position?: { x: number; y: number } }>;
  edges: Array<{ data: CytoscapeEdgeData }>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: 'QUERY_GRAPH' | 'SEARCH_ADDRESS' | 'EXPORT_REPORT' | 'UPDATE_CASE' | 'APPLY_HEURISTIC' | 'MODIFY_OFAC_FEED';
  target: string;
  ip_address: string;
  hash_signature: string;
}

export type GraphNode = CytoscapeNodeData;

export interface MLTrainRequest {
  dataset_id: string;
  model_type?: string;
  parameters?: Record<string, any>;
  contamination?: number;
  n_estimators?: number;
  features?: string[];
}
