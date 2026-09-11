from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from app.models.schemas import GraphData, GraphNode, GraphEdge, NormalizedTransaction
from app.db.repository import DatasetRepository, WalletRepository, TransactionRepository
from app.db.database import get_db_session
from app.core.exceptions import DatasetNotFoundError, EntityNotFoundError
from app.graph.builder import graph_builder

router = APIRouter()
logger = logging.getLogger(__name__)

def _ensure_graph_loaded(dataset_id: str, db):
    if graph_builder.current_dataset_id == dataset_id and len(graph_builder.graph.nodes) > 0:
        return
    logger.info(f"Loading graph for dataset {dataset_id}")
    tx_repo = TransactionRepository(db)
    wallet_repo = WalletRepository(db)
    tx_models = tx_repo.get_by_dataset(dataset_id)
    wallet_models = wallet_repo.get_by_dataset(dataset_id)
    
    transactions = []
    for tx in tx_models:
        transactions.append(NormalizedTransaction(
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
            asn=tx.asn
        ))
    
    wallet_features = {w.address: w.features for w in wallet_models}
    graph_builder.build_graph(transactions, wallet_features)
    graph_builder.current_dataset_id = dataset_id

@router.get("/entity/{entity_id}", response_model=GraphData)
async def get_entity_graph(
    entity_id: str,
    dataset_id: str = Query(...),
    depth: int = Query(2, ge=1, le=4),
    max_nodes: int = Query(100, ge=10, le=500),
    max_edges: int = Query(200, ge=10, le=1000),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        _ensure_graph_loaded(dataset_id, db)
        
        wallet_repo = WalletRepository(db)
        wallet = wallet_repo.get_by_address(dataset_id, entity_id)
        if not wallet:
            raise EntityNotFoundError(entity_id, "wallet")
        
        graph_data = graph_builder.get_neighborhood(
            f"wallet_{entity_id}",
            depth=depth,
            max_nodes=max_nodes,
            max_edges=max_edges,
        )
        
        return graph_data


@router.get("/path")
async def get_shortest_path(
    source: str = Query(...),
    target: str = Query(...),
    dataset_id: str = Query(...),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        _ensure_graph_loaded(dataset_id, db)
        
        path = graph_builder.get_shortest_path(f"wallet_{source}", f"wallet_{target}")
        
        if not path:
            return {"path": [], "found": False}
        
        return {"path": path, "found": True}


@router.get("/components")
async def get_connected_components(
    dataset_id: str = Query(...),
):
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        _ensure_graph_loaded(dataset_id, db)
        
        components = graph_builder.get_connected_components()
        
        return {
            "components": [
                {"id": i, "nodes": list(comp), "size": len(comp)}
                for i, comp in enumerate(components)
            ],
            "count": len(components),
        }