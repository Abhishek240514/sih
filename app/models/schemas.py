from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum
import uuid


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DatasetStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class DatasetFormat(str, Enum):
    CSV = "csv"
    JSON = "json"
    XML = "xml"


class IngestionReport(BaseModel):
    dataset_id: str
    total_records: int
    valid_records: int
    invalid_records: int
    duplicates: int
    warnings: List[str] = []


class RawTransactionRecord(BaseModel):
    timestamp: str
    txid: str
    input_addresses: List[str] = []
    output_addresses: List[str] = []
    input_amounts: List[float] = []
    output_amounts: List[float] = []
    fee: float = 0.0
    script_type: Optional[str] = None
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    geo_country: Optional[str] = None
    asn: Optional[str] = None
    
    @field_validator("txid")
    @classmethod
    def validate_txid(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("txid cannot be empty")
        return v.strip()
    
    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("timestamp cannot be empty")
        return v.strip()


class NormalizedTransaction(BaseModel):
    txid: str
    timestamp: datetime
    inputs: List[str]
    outputs: List[str]
    input_amounts: List[float]
    output_amounts: List[float]
    fee: float
    script_type: Optional[str] = None
    source_ips: List[str] = []
    destination_ips: List[str] = []
    source_ports: List[int] = []
    destination_ports: List[int] = []
    geo_country: Optional[str] = None
    asn: Optional[str] = None
    input_amount: float = 0.0
    output_amount: float = 0.0


class WalletFeatures(BaseModel):
    transaction_count: int = 0
    total_input_amount: float = 0.0
    total_output_amount: float = 0.0
    average_amount: float = 0.0
    median_amount: float = 0.0
    amount_std: float = 0.0
    total_fees: float = 0.0
    transaction_velocity: float = 0.0
    active_duration: float = 0.0
    transactions_per_hour: float = 0.0
    transactions_per_day: float = 0.0
    burst_score: float = 0.0
    dormant_to_active_score: float = 0.0
    degree: int = 0
    weighted_degree: float = 0.0
    in_degree: int = 0
    out_degree: int = 0
    betweenness_centrality: float = 0.0
    closeness_centrality: float = 0.0
    pagerank: float = 0.0
    clustering_coefficient: float = 0.0
    community_id: Optional[int] = None
    community_size: int = 0
    fan_in: int = 0
    fan_out: int = 0
    unique_counterparties: int = 0
    consolidation_score: float = 0.0
    dispersion_score: float = 0.0
    unique_ips: int = 0
    unique_asns: int = 0
    unique_countries: int = 0
    ip_change_rate: float = 0.0
    network_observation_count: int = 0
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None


class Wallet(BaseModel):
    address: str
    transaction_count: int = 0
    total_in: float = 0.0
    total_out: float = 0.0
    average_transaction_value: float = 0.0
    unique_counterparties: int = 0
    fan_in: int = 0
    fan_out: int = 0
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    risk_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.LOW
    community_id: Optional[int] = None
    features: WalletFeatures = WalletFeatures()


class NetworkObservation(BaseModel):
    timestamp: datetime
    src_ip: str
    dst_ip: str
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    txid: Optional[str] = None
    geo_country: Optional[str] = None
    asn: Optional[str] = None


class CorrelationEvidence(BaseModel):
    ip: str
    txid: str
    correlation_score: float
    evidence: List[str]


class GraphNode(BaseModel):
    id: str
    type: Literal["wallet", "transaction", "ip", "asn", "country"]
    label: str
    risk_score: float = 0.0
    metadata: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str
    amount: Optional[float] = None
    timestamp: Optional[datetime] = None
    confidence: float = 1.0
    relationship_type: str = ""


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class AlertReason(BaseModel):
    signal: str
    description: str
    contribution: float
    evidence_type: Literal["observed", "model_derived", "heuristic", "correlation", "graph_propagation"] = "observed"


class Alert(BaseModel):
    alert_id: str
    entity_id: str
    entity_type: str
    risk_score: float
    risk_level: RiskLevel
    timestamp: datetime
    reasons: List[AlertReason]
    related_transactions: List[str] = []
    related_wallets: List[str] = []
    related_ips: List[str] = []
    related_asns: List[str] = []
    related_countries: List[str] = []
    graph_statistics: Dict[str, Any] = {}
    correlation_evidence: List[CorrelationEvidence] = []


class InvestigationResponse(BaseModel):
    entity_id: str
    entity_type: str
    risk_score: float
    risk_level: RiskLevel
    reasons: List[AlertReason]
    related_wallets: List[Wallet]
    related_transactions: List[NormalizedTransaction]
    related_ips: List[str]
    related_asns: List[str]
    countries: List[str]
    timeline: List[Dict[str, Any]]
    graph_neighborhood: GraphData
    transaction_flow: List[Dict[str, Any]]
    correlation_evidence: List[CorrelationEvidence]


class DatasetResponse(BaseModel):
    id: str
    name: str
    filename: str
    format: DatasetFormat
    status: DatasetStatus
    total_records: int
    valid_records: int
    invalid_records: int
    duplicates: int
    warnings: List[str] = []
    created_at: datetime
    processed_at: Optional[datetime] = None


class DatasetUploadRequest(BaseModel):
    name: str


class MLTrainRequest(BaseModel):
    dataset_id: str
    model_type: Literal["isolation_forest"] = "isolation_forest"
    parameters: Optional[Dict[str, Any]] = None


class MLTrainResponse(BaseModel):
    model_id: str
    model_type: str
    version: str
    trained_at: datetime
    feature_count: int
    metrics: Dict[str, float]


class MLStatusResponse(BaseModel):
    model_type: str
    trained: bool
    training_timestamp: Optional[datetime] = None
    feature_count: int = 0
    dataset_used: Optional[str] = None
    model_version: Optional[str] = None
    parameters: Dict[str, Any] = {}


class DashboardSummary(BaseModel):
    transactions: int
    wallets: int
    ips: int
    countries: int
    alerts: int
    critical_alerts: int
    high_alerts: int


class TopAlertResponse(BaseModel):
    alerts: List[Alert]


class TopWalletResponse(BaseModel):
    wallets: List[Wallet]


class RiskDistributionResponse(BaseModel):
    distribution: Dict[str, int]


class TransactionVolumeResponse(BaseModel):
    volume: List[Dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime