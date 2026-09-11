from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from datetime import datetime
import logging

from app.models.schemas import (
    DashboardSummary, TopAlertResponse, TopWalletResponse,
    RiskDistributionResponse, TransactionVolumeResponse, Alert, Wallet
)
from app.db.repository import DatasetRepository, WalletRepository, AlertRepository, TransactionRepository, NetworkObservationRepository
from app.db.database import get_db_session
from app.core.exceptions import DatasetNotFoundError
from app.models.schemas import RiskLevel

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    dataset_id: str = Query(...),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        wallet_repo = WalletRepository(db)
        wallets = wallet_repo.get_by_dataset(dataset_id)
        
        tx_repo = TransactionRepository(db)
        tx_count = tx_repo.count_by_dataset(dataset_id)
        
        netobs_repo = NetworkObservationRepository(db)
        netobs = netobs_repo.get_by_dataset(dataset_id)
        
        unique_ips = set()
        unique_countries = set()
        for obs in netobs:
            unique_ips.add(obs.src_ip)
            unique_ips.add(obs.dst_ip)
            if obs.geo_country:
                unique_countries.add(obs.geo_country)
        
        alert_repo = AlertRepository(db)
        alert_counts = alert_repo.count_by_risk_level(dataset_id)
        total_alerts = alert_repo.count_by_dataset(dataset_id)
        
        return DashboardSummary(
            transactions=tx_count,
            wallets=len(wallets),
            ips=len(unique_ips),
            countries=len(unique_countries),
            alerts=total_alerts,
            critical_alerts=alert_counts.get("CRITICAL", 0),
            high_alerts=alert_counts.get("HIGH", 0),
        )


@router.get("/top-alerts", response_model=TopAlertResponse)
async def get_dashboard_top_alerts(
    dataset_id: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        alert_repo = AlertRepository(db)
        alerts = alert_repo.get_by_dataset(dataset_id, 0, limit)
        
        alert_objects = []
        for a in alerts:
            alert_objects.append(Alert(
                alert_id=a.id,
                entity_id=a.entity_id,
                entity_type=a.entity_type,
                risk_score=a.risk_score,
                risk_level=RiskLevel(a.risk_level),
                timestamp=a.created_at,
                reasons=[],
                related_transactions=a.related_transactions or [],
                related_wallets=a.related_wallets or [],
                related_ips=a.related_ips or [],
                related_asns=a.related_asns or [],
                related_countries=a.related_countries or [],
                graph_statistics=a.graph_statistics or {},
                correlation_evidence=a.correlation_evidence or [],
            ))
        
        return TopAlertResponse(alerts=alert_objects)


@router.get("/top-wallets", response_model=TopWalletResponse)
async def get_dashboard_top_wallets(
    dataset_id: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        wallet_repo = WalletRepository(db)
        wallets = wallet_repo.get_top_by_risk(dataset_id, limit)
        
        wallet_objects = []
        for w in wallets:
            wallet_objects.append(Wallet(
                address=w.address,
                transaction_count=w.transaction_count,
                total_in=w.total_in,
                total_out=w.total_out,
                average_transaction_value=w.average_transaction_value,
                unique_counterparties=w.unique_counterparties,
                fan_in=w.fan_in,
                fan_out=w.fan_out,
                first_seen=w.first_seen,
                last_seen=w.last_seen,
                risk_score=w.risk_score,
                risk_level=RiskLevel(w.risk_level),
                community_id=w.community_id,
                features=w.features or {},
            ))
        
        return TopWalletResponse(wallets=wallet_objects)


@router.get("/risk-distribution", response_model=RiskDistributionResponse)
async def get_risk_distribution(
    dataset_id: str = Query(...),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        wallet_repo = WalletRepository(db)
        wallets = wallet_repo.get_by_dataset(dataset_id)
        
        distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        for w in wallets:
            distribution[w.risk_level] = distribution.get(w.risk_level, 0) + 1
        
        return RiskDistributionResponse(distribution=distribution)


@router.get("/transaction-volume", response_model=TransactionVolumeResponse)
async def get_transaction_volume(
    dataset_id: str = Query(...),
    buckets: int = Query(24, ge=1, le=168),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        tx_repo = TransactionRepository(db)
        transactions = tx_repo.get_by_dataset(dataset_id, limit=10000)
        
        if not transactions:
            return TransactionVolumeResponse(volume=[])
        
        timestamps = [tx.timestamp for tx in transactions if tx.timestamp]
        if not timestamps:
            return TransactionVolumeResponse(volume=[])
        
        min_ts = min(timestamps)
        max_ts = max(timestamps)
        
        if min_ts == max_ts:
            return TransactionVolumeResponse(volume=[{
                "timestamp": min_ts.isoformat(),
                "count": len(timestamps),
                "volume": sum(tx.input_amount + tx.output_amount for tx in transactions),
            }])
        
        bucket_size = (max_ts - min_ts).total_seconds() / buckets
        
        volume_data = []
        for i in range(buckets):
            bucket_start = min_ts.timestamp() + i * bucket_size
            bucket_end = bucket_start + bucket_size
            
            bucket_txs = [
                tx for tx in transactions
                if tx.timestamp and bucket_start <= tx.timestamp.timestamp() < bucket_end
            ]
            
            volume_data.append({
                "timestamp": datetime.fromtimestamp(bucket_start).isoformat(),
                "count": len(bucket_txs),
                "volume": sum(tx.input_amount + tx.output_amount for tx in bucket_txs),
            })
        
        return TransactionVolumeResponse(volume=volume_data)
