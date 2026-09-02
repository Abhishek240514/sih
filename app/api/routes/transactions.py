from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from app.models.schemas import NormalizedTransaction
from app.db.repository import TransactionRepository, DatasetRepository
from app.db.database import get_db_session
from app.core.exceptions import DatasetNotFoundError

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dataset/{dataset_id}")
async def get_transactions(
    dataset_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        tx_repo = TransactionRepository(db)
        transactions = tx_repo.get_by_dataset(dataset_id, skip, limit)
        
        return {
            "transactions": [
                {
                    "txid": tx.txid,
                    "timestamp": tx.timestamp.isoformat() if tx.timestamp else None,
                    "input_addresses": tx.input_addresses or [],
                    "output_addresses": tx.output_addresses or [],
                    "input_amounts": tx.input_amounts or [],
                    "output_amounts": tx.output_amounts or [],
                    "fee": tx.fee,
                    "script_type": tx.script_type,
                    "source_ips": tx.source_ips or [],
                    "destination_ips": tx.destination_ips or [],
                    "source_ports": tx.source_ports or [],
                    "destination_ports": tx.destination_ports or [],
                    "geo_country": tx.geo_country,
                    "asn": tx.asn,
                    "input_amount": tx.input_amount,
                    "output_amount": tx.output_amount,
                }
                for tx in transactions
            ],
            "total": tx_repo.count_by_dataset(dataset_id),
        }


@router.get("/dataset/{dataset_id}/{txid}")
async def get_transaction(
    dataset_id: str,
    txid: str,
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        tx_repo = TransactionRepository(db)
        tx = tx_repo.get_by_txid(dataset_id, txid)
        
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return {
            "txid": tx.txid,
            "timestamp": tx.timestamp.isoformat() if tx.timestamp else None,
            "input_addresses": tx.input_addresses or [],
            "output_addresses": tx.output_addresses or [],
            "input_amounts": tx.input_amounts or [],
            "output_amounts": tx.output_amounts or [],
            "fee": tx.fee,
            "script_type": tx.script_type,
            "source_ips": tx.source_ips or [],
            "destination_ips": tx.destination_ips or [],
            "source_ports": tx.source_ports or [],
            "destination_ports": tx.destination_ports or [],
            "geo_country": tx.geo_country,
            "asn": tx.asn,
            "input_amount": tx.input_amount,
            "output_amount": tx.output_amount,
        }