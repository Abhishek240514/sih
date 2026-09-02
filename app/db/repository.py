from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Index, ForeignKey, JSON
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid
import json

from app.db.database import Base, get_db_session


class DatasetModel(Base):
    __tablename__ = "datasets"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    format = Column(String(20), nullable=False)
    status = Column(String(50), default="uploaded")
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    invalid_records = Column(Integer, default=0)
    duplicates = Column(Integer, default=0)
    warnings = Column(SQLiteJSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    
    __table_args__ = (Index("idx_datasets_status", "status"),)


class TransactionModel(Base):
    __tablename__ = "transactions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    txid = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    input_addresses = Column(SQLiteJSON, default=list)
    output_addresses = Column(SQLiteJSON, default=list)
    input_amounts = Column(SQLiteJSON, default=list)
    output_amounts = Column(SQLiteJSON, default=list)
    fee = Column(Float, default=0.0)
    script_type = Column(String(50), nullable=True)
    source_ips = Column(SQLiteJSON, default=list)
    destination_ips = Column(SQLiteJSON, default=list)
    source_ports = Column(SQLiteJSON, default=list)
    destination_ports = Column(SQLiteJSON, default=list)
    geo_country = Column(String(10), nullable=True)
    asn = Column(String(20), nullable=True)
    input_amount = Column(Float, default=0.0)
    output_amount = Column(Float, default=0.0)
    
    __table_args__ = (
        Index("idx_transactions_dataset_txid", "dataset_id", "txid"),
        Index("idx_transactions_timestamp", "timestamp"),
    )


class WalletModel(Base):
    __tablename__ = "wallets"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    address = Column(String(64), nullable=False, index=True)
    transaction_count = Column(Integer, default=0)
    total_in = Column(Float, default=0.0)
    total_out = Column(Float, default=0.0)
    average_transaction_value = Column(Float, default=0.0)
    unique_counterparties = Column(Integer, default=0)
    fan_in = Column(Integer, default=0)
    fan_out = Column(Integer, default=0)
    first_seen = Column(DateTime, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="LOW")
    community_id = Column(Integer, nullable=True)
    features = Column(SQLiteJSON, default=dict)
    
    __table_args__ = (
        Index("idx_wallets_dataset_address", "dataset_id", "address"),
        Index("idx_wallets_risk", "risk_score"),
    )


class NetworkObservationModel(Base):
    __tablename__ = "network_observations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    src_ip = Column(String(45), nullable=False, index=True)
    dst_ip = Column(String(45), nullable=False, index=True)
    src_port = Column(Integer, nullable=True)
    dst_port = Column(Integer, nullable=True)
    txid = Column(String(64), nullable=True, index=True)
    geo_country = Column(String(10), nullable=True)
    asn = Column(String(20), nullable=True)
    
    __table_args__ = (
        Index("idx_netobs_dataset_ip", "dataset_id", "src_ip"),
        Index("idx_netobs_txid", "txid"),
    )


class AlertModel(Base):
    __tablename__ = "alerts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    entity_id = Column(String(64), nullable=False, index=True)
    entity_type = Column(String(20), nullable=False)
    risk_score = Column(Float, nullable=False, index=True)
    risk_level = Column(String(20), nullable=False)
    reasons = Column(SQLiteJSON, default=list)
    related_transactions = Column(SQLiteJSON, default=list)
    related_wallets = Column(SQLiteJSON, default=list)
    related_ips = Column(SQLiteJSON, default=list)
    related_asns = Column(SQLiteJSON, default=list)
    related_countries = Column(SQLiteJSON, default=list)
    graph_statistics = Column(SQLiteJSON, default=dict)
    correlation_evidence = Column(SQLiteJSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_alerts_dataset_risk", "dataset_id", "risk_score"),
    )


class MLModelMetadata(Base):
    __tablename__ = "ml_models"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_type = Column(String(50), nullable=False)
    version = Column(String(20), nullable=False)
    trained_at = Column(DateTime, default=datetime.utcnow)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=True)
    feature_count = Column(Integer, default=0)
    parameters = Column(SQLiteJSON, default=dict)
    metrics = Column(SQLiteJSON, default=dict)
    is_active = Column(Integer, default=0)


class DatasetRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, name: str, filename: str, format: str, dataset_id: str = None) -> DatasetModel:
        dataset = DatasetModel(
            id=dataset_id or str(uuid.uuid4()),
            name=name,
            filename=filename,
            format=format,
        )
        self.db.add(dataset)
        self.db.flush()
        return dataset
    
    def get(self, dataset_id: str) -> Optional[DatasetModel]:
        return self.db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    
    def list_all(self, skip: int = 0, limit: int = 100) -> List[DatasetModel]:
        return self.db.query(DatasetModel).offset(skip).limit(limit).all()
    
    def update_status(
        self,
        dataset_id: str,
        status: str,
        total_records: int = 0,
        valid_records: int = 0,
        invalid_records: int = 0,
        duplicates: int = 0,
        warnings: List[str] = None,
    ) -> Optional[DatasetModel]:
        dataset = self.get(dataset_id)
        if dataset:
            dataset.status = status
            dataset.total_records = total_records
            dataset.valid_records = valid_records
            dataset.invalid_records = invalid_records
            dataset.duplicates = duplicates
            dataset.warnings = warnings or []
            if status == "processed":
                dataset.processed_at = datetime.utcnow()
            self.db.flush()
        return dataset
    
    def delete(self, dataset_id: str) -> bool:
        dataset = self.get(dataset_id)
        if dataset:
            self.db.delete(dataset)
            return True
        return False


class TransactionRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def bulk_insert(self, transactions: List[Dict[str, Any]]) -> int:
        if not transactions:
            return 0
        self.db.bulk_insert_mappings(TransactionModel, transactions)
        self.db.flush()
        return len(transactions)
    
    def get_by_dataset(
        self, dataset_id: str, skip: int = 0, limit: int = 1000
    ) -> List[TransactionModel]:
        return (
            self.db.query(TransactionModel)
            .filter(TransactionModel.dataset_id == dataset_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_txid(self, dataset_id: str, txid: str) -> Optional[TransactionModel]:
        return (
            self.db.query(TransactionModel)
            .filter(TransactionModel.dataset_id == dataset_id, TransactionModel.txid == txid)
            .first()
        )
    
    def count_by_dataset(self, dataset_id: str) -> int:
        return (
            self.db.query(TransactionModel)
            .filter(TransactionModel.dataset_id == dataset_id)
            .count()
        )


class WalletRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def bulk_insert(self, wallets: List[Dict[str, Any]]) -> int:
        if not wallets:
            return 0
        self.db.bulk_insert_mappings(WalletModel, wallets)
        self.db.flush()
        return len(wallets)
    
    def get_by_dataset(
        self, dataset_id: str, skip: int = 0, limit: int = 1000
    ) -> List[WalletModel]:
        return (
            self.db.query(WalletModel)
            .filter(WalletModel.dataset_id == dataset_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_address(self, dataset_id: str, address: str) -> Optional[WalletModel]:
        return (
            self.db.query(WalletModel)
            .filter(WalletModel.dataset_id == dataset_id, WalletModel.address == address)
            .first()
        )
    
    def get_top_by_risk(
        self, dataset_id: str, limit: int = 100
    ) -> List[WalletModel]:
        return (
            self.db.query(WalletModel)
            .filter(WalletModel.dataset_id == dataset_id)
            .order_by(WalletModel.risk_score.desc())
            .limit(limit)
            .all()
        )
    
    def update_risk(
        self, dataset_id: str, address: str, risk_score: float, risk_level: str
    ) -> bool:
        wallet = self.get_by_address(dataset_id, address)
        if wallet:
            wallet.risk_score = risk_score
            wallet.risk_level = risk_level
            self.db.flush()
            return True
        return False
    
    def update_features(
        self, dataset_id: str, address: str, features: Dict[str, Any]
    ) -> bool:
        wallet = self.get_by_address(dataset_id, address)
        if wallet:
            wallet.features = features
            self.db.flush()
            return True
        return False
    
    def update_community(
        self, dataset_id: str, address: str, community_id: int
    ) -> bool:
        wallet = self.get_by_address(dataset_id, address)
        if wallet:
            wallet.community_id = community_id
            self.db.flush()
            return True
        return False


class NetworkObservationRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def bulk_insert(self, observations: List[Dict[str, Any]]) -> int:
        if not observations:
            return 0
        self.db.bulk_insert_mappings(NetworkObservationModel, observations)
        self.db.flush()
        return len(observations)
    
    def get_by_dataset(
        self, dataset_id: str, skip: int = 0, limit: int = 1000
    ) -> List[NetworkObservationModel]:
        return (
            self.db.query(NetworkObservationModel)
            .filter(NetworkObservationModel.dataset_id == dataset_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_ip(self, dataset_id: str, ip: str) -> List[NetworkObservationModel]:
        return (
            self.db.query(NetworkObservationModel)
            .filter(
                NetworkObservationModel.dataset_id == dataset_id,
                NetworkObservationModel.src_ip == ip,
            )
            .all()
        )
    
    def get_by_txid(self, dataset_id: str, txid: str) -> List[NetworkObservationModel]:
        return (
            self.db.query(NetworkObservationModel)
            .filter(
                NetworkObservationModel.dataset_id == dataset_id,
                NetworkObservationModel.txid == txid,
            )
            .all()
        )


class AlertRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def bulk_insert(self, alerts: List[Dict[str, Any]]) -> int:
        if not alerts:
            return 0
        self.db.bulk_insert_mappings(AlertModel, alerts)
        self.db.flush()
        return len(alerts)
    
    def get_by_dataset(
        self,
        dataset_id: str,
        skip: int = 0,
        limit: int = 100,
        risk_level: Optional[str] = None,
    ) -> List[AlertModel]:
        query = self.db.query(AlertModel).filter(AlertModel.dataset_id == dataset_id)
        if risk_level:
            query = query.filter(AlertModel.risk_level == risk_level)
        return query.order_by(AlertModel.risk_score.desc()).offset(skip).limit(limit).all()
    
    def get_by_entity(
        self, dataset_id: str, entity_id: str, entity_type: str
    ) -> Optional[AlertModel]:
        return (
            self.db.query(AlertModel)
            .filter(
                AlertModel.dataset_id == dataset_id,
                AlertModel.entity_id == entity_id,
                AlertModel.entity_type == entity_type,
            )
            .first()
        )
    
    def count_by_dataset(self, dataset_id: str) -> int:
        return (
            self.db.query(AlertModel)
            .filter(AlertModel.dataset_id == dataset_id)
            .count()
        )
    
    def count_by_risk_level(self, dataset_id: str) -> Dict[str, int]:
        results = (
            self.db.query(AlertModel.risk_level, AlertModel.id)
            .filter(AlertModel.dataset_id == dataset_id)
            .all()
        )
        counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        for risk_level, _ in results:
            counts[risk_level] = counts.get(risk_level, 0) + 1
        return counts


class MLModelRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def create(
        self,
        model_type: str,
        version: str,
        dataset_id: Optional[str],
        feature_count: int,
        parameters: Dict[str, Any],
        metrics: Dict[str, Any],
    ) -> MLModelMetadata:
        model = MLModelMetadata(
            model_type=model_type,
            version=version,
            dataset_id=dataset_id,
            feature_count=feature_count,
            parameters=parameters,
            metrics=metrics,
            is_active=1,
        )
        self.db.query(MLModelMetadata).update({MLModelMetadata.is_active: 0})
        self.db.add(model)
        self.db.flush()
        return model
    
    def get_active(self) -> Optional[MLModelMetadata]:
        return (
            self.db.query(MLModelMetadata)
            .filter(MLModelMetadata.is_active == 1)
            .first()
        )
    
    def list_all(self) -> List[MLModelMetadata]:
        return self.db.query(MLModelMetadata).order_by(MLModelMetadata.trained_at.desc()).all()