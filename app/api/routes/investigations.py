from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from app.models.schemas import InvestigationResponse, NormalizedTransaction, Wallet, WalletFeatures
from app.api.routes.graph import _ensure_graph_loaded
from app.services.explanation_service import explanation_service
from app.db.repository import WalletRepository, TransactionRepository, NetworkObservationRepository, DatasetRepository
from app.db.database import get_db_session
from app.core.exceptions import EntityNotFoundError, DatasetNotFoundError

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{entity_id}", response_model=InvestigationResponse)
async def get_investigation(
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
        
        tx_repo = TransactionRepository(db)
        transactions = tx_repo.get_by_dataset(dataset_id)
        
        netobs_repo = NetworkObservationRepository(db)
        network_obs = netobs_repo.get_by_dataset(dataset_id)
        
        wallet = wallet_model.__dict__
        wallet_obj = type('Wallet', (), wallet)()
        wallet_obj.address = wallet_model.address
        wallet_obj.features = wallet_model.features or {}
        
        tx_objects = []
        for tx in transactions:
            if entity_id in (tx.input_addresses or []) or entity_id in (tx.output_addresses or []):
                tx_obj = NormalizedTransaction(
                    txid=tx.txid,
                    timestamp=tx.timestamp,
                    inputs=tx.input_addresses or [],
                    outputs=tx.output_addresses or [],
                    input_amounts=tx.input_amounts or [],
                    output_amounts=tx.output_amounts or [],
                    fee=tx.fee,
                    script_type=tx.script_type,
                    source_ips=tx.source_ips or [],
                    destination_ips=tx.destination_ips or [],
                    source_ports=tx.source_ports or [],
                    destination_ports=tx.destination_ports or [],
                    geo_country=tx.geo_country,
                    asn=tx.asn,
                    input_amount=tx.input_amount,
                    output_amount=tx.output_amount,
                )
                tx_objects.append(tx_obj)
        
        netobs_dicts = [
            {
                'timestamp': obs.timestamp,
                'src_ip': obs.src_ip,
                'dst_ip': obs.dst_ip,
                'src_port': obs.src_port,
                'dst_port': obs.dst_port,
                'txid': obs.txid,
                'geo_country': obs.geo_country,
                'asn': obs.asn,
            }
            for obs in network_obs
        ]
        _ensure_graph_loaded(dataset_id, db)
        
        investigation = explanation_service.generate_investigation(
            entity_id=entity_id,
            entity_type="wallet",
            wallet=wallet_obj,
            transactions=tx_objects,
            network_observations=netobs_dicts,
        )
        
        wallet_objs = []
        wallet_addresses = set(investigation.get("related_wallets", []))
        wallet_addresses.add(entity_id)
        
        for addr in wallet_addresses:
            w = wallet_repo.get_by_address(dataset_id, addr)
            if w:
                wallet_objs.append(Wallet(
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
                    risk_level=w.risk_level,
                    community_id=w.community_id,
                    features=WalletFeatures(**w.features) if w.features else WalletFeatures(),
                ))
        investigation["related_wallets"] = wallet_objs
        
        return investigation


@router.get("/{entity_id}/summary")
async def get_investigation_summary(
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
        
        return {
            "entity_id": entity_id,
            "entity_type": "wallet",
            "address": wallet_model.address,
            "risk_score": wallet_model.risk_score,
            "risk_level": wallet_model.risk_level,
            "transaction_count": wallet_model.transaction_count,
            "total_volume": wallet_model.total_in + wallet_model.total_out,
            "community_id": wallet_model.community_id,
            "first_seen": wallet_model.first_seen.isoformat() if wallet_model.first_seen else None,
            "last_seen": wallet_model.last_seen.isoformat() if wallet_model.last_seen else None,
        }