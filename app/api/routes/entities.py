from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from app.models.schemas import (
    Wallet, TopWalletResponse, GraphData, GraphNode, GraphEdge,
    RiskDistributionResponse, TransactionVolumeResponse
)
from app.db.repository import WalletRepository, DatasetRepository, AlertRepository
from app.db.database import get_db_session
from app.core.exceptions import DatasetNotFoundError, EntityNotFoundError
from app.graph.builder import graph_builder
from app.models.schemas import RiskLevel

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dataset/{dataset_id}", response_model=TopWalletResponse)
async def get_wallets(
    dataset_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        wallet_repo = WalletRepository(db)
        wallets = wallet_repo.get_by_dataset(dataset_id, skip, limit)
        
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


@router.get("/dataset/{dataset_id}/top", response_model=TopWalletResponse)
async def get_top_wallets(
    dataset_id: str,
    limit: int = Query(20, ge=1, le=100),
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


@router.get("/{entity_id}", response_model=Wallet)
async def get_wallet(
    entity_id: str,
    dataset_id: str = Query(...),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        wallet_repo = WalletRepository(db)
        wallet_model = wallet_repo.get_by_address(dataset_id, entity_id)
        
        if not wallet_model:
            raise EntityNotFoundError(entity_id, "wallet")
        
        return Wallet(
            address=wallet_model.address,
            transaction_count=wallet_model.transaction_count,
            total_in=wallet_model.total_in,
            total_out=wallet_model.total_out,
            average_transaction_value=wallet_model.average_transaction_value,
            unique_counterparties=wallet_model.unique_counterparties,
            fan_in=wallet_model.fan_in,
            fan_out=wallet_model.fan_out,
            first_seen=wallet_model.first_seen,
            last_seen=wallet_model.last_seen,
            risk_score=wallet_model.risk_score,
            risk_level=RiskLevel(wallet_model.risk_level),
            community_id=wallet_model.community_id,
            features=wallet_model.features or {},
        )