from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from app.models.schemas import Alert, TopAlertResponse
from app.db.repository import AlertRepository, DatasetRepository
from app.db.database import get_db_session
from app.core.exceptions import DatasetNotFoundError
from app.models.schemas import RiskLevel

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dataset/{dataset_id}", response_model=TopAlertResponse)
async def get_alerts(
    dataset_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    risk_level: Optional[RiskLevel] = Query(None),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        alert_repo = AlertRepository(db)
        alerts = alert_repo.get_by_dataset(dataset_id, skip, limit, risk_level.value if risk_level else None)
        
        alert_objects = []
        for a in alerts:
            alert_objects.append(Alert(
                alert_id=a.id,
                entity_id=a.entity_id,
                entity_type=a.entity_type,
                risk_score=a.risk_score,
                risk_level=RiskLevel(a.risk_level),
                timestamp=a.created_at,
                reasons=[],  # Would need to store separately
                related_transactions=a.related_transactions or [],
                related_wallets=a.related_wallets or [],
                related_ips=a.related_ips or [],
                related_asns=a.related_asns or [],
                related_countries=a.related_countries or [],
                graph_statistics=a.graph_statistics or {},
                correlation_evidence=a.correlation_evidence or [],
            ))
        
        return TopAlertResponse(alerts=alert_objects)


@router.get("/dataset/{dataset_id}/stats")
async def get_alert_stats(dataset_id: str):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        alert_repo = AlertRepository(db)
        counts = alert_repo.count_by_risk_level(dataset_id)
        total = alert_repo.count_by_dataset(dataset_id)
        
        return {
            "total": total,
            "by_level": counts,
        }


@router.get("/top", response_model=TopAlertResponse)
async def get_top_alerts(
    dataset_id: str = Query(...),
    limit: int = Query(20, ge=1, le=100),
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