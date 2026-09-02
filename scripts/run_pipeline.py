#!/usr/bin/env python3
"""
Complete Pipeline Runner

Runs the entire forensic intelligence pipeline:
1. Generate/load synthetic dataset
2. Process dataset (ingestion, feature engineering, graph building)
3. Train ML model
4. Generate risk scores and alerts
5. Start API server
"""

import argparse
import asyncio
import json
import logging
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.database import init_db, get_db_session
from app.db.repository import (
    DatasetRepository, WalletRepository, TransactionRepository,
    NetworkObservationRepository, AlertRepository
)
from app.services.ingestion_service import ingestion_service
from app.services.feature_service import feature_engineering_service
from app.services.risk_service import risk_scoring_service
from app.services.explanation_service import explanation_service
from app.services.correlation_service import correlation_service
from app.graph.builder import graph_builder
from app.ml.anomaly_detector import anomaly_detector
from app.ml.model_registry import model_registry
from app.models.schemas import NormalizedTransaction, Wallet, RiskLevel
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_ingestion(dataset_id: str, dataset_path: str):
    logger.info(f"Loading dataset from {dataset_path}")
    
    with open(dataset_path, "r") as f:
        content = f.read().encode()
    
    filename = Path(dataset_path).name
    
    transactions, report = await ingestion_service.ingest(content, filename, dataset_id)
    
    with get_db_session() as db:
        repo = DatasetRepository(db)
        repo.update_status(
            dataset_id,
            "processed",
            total_records=report.total_records,
            valid_records=report.valid_records,
            invalid_records=report.invalid_records,
            duplicates=report.duplicates,
            warnings=report.warnings,
        )
        
        tx_repo = TransactionRepository(db)
        tx_data = []
        for tx in transactions:
            tx_data.append({
                "dataset_id": dataset_id,
                "txid": tx.txid,
                "timestamp": tx.timestamp,
                "input_addresses": tx.inputs,
                "output_addresses": tx.outputs,
                "input_amounts": tx.input_amounts,
                "output_amounts": tx.output_amounts,
                "fee": tx.fee,
                "script_type": tx.script_type,
                "source_ips": tx.source_ips,
                "destination_ips": tx.destination_ips,
                "source_ports": tx.source_ports,
                "destination_ports": tx.destination_ports,
                "geo_country": tx.geo_country,
                "asn": tx.asn,
                "input_amount": tx.input_amount,
                "output_amount": tx.output_amount,
            })
        tx_repo.bulk_insert(tx_data)
    
    logger.info(f"Ingestion complete: {report.valid_records} valid transactions")
    return transactions


def build_wallets(transactions: list, dataset_id: str):
    logger.info("Building wallet aggregates...")
    
    wallet_data = {}
    
    for tx in transactions:
        all_addrs = set(tx.inputs + tx.outputs)
        for addr in all_addrs:
            if addr not in wallet_data:
                wallet_data[addr] = {
                    "address": addr,
                    "transactions": [],
                    "counterparties": set(),
                    "input_amounts": [],
                    "output_amounts": [],
                    "fees": [],
                    "ips": set(),
                    "asns": set(),
                    "countries": set(),
                    "timestamps": [],
                }
            
            wallet_data[addr]["transactions"].append(tx.txid)
            wallet_data[addr]["counterparties"].update(set(tx.inputs + tx.outputs) - {addr})
            wallet_data[addr]["input_amounts"].append(tx.input_amount)
            wallet_data[addr]["output_amounts"].append(tx.output_amount)
            wallet_data[addr]["fees"].append(tx.fee)
            wallet_data[addr]["ips"].update(tx.source_ips + tx.destination_ips)
            if tx.asn:
                wallet_data[addr]["asns"].add(tx.asn)
            if tx.geo_country:
                wallet_data[addr]["countries"].add(tx.geo_country)
            wallet_data[addr]["timestamps"].append(tx.timestamp)
    
    wallet_models = []
    for addr, data in wallet_data.items():
        timestamps = sorted(data["timestamps"])
        first_seen = timestamps[0] if timestamps else None
        last_seen = timestamps[-1] if timestamps else None
        
        wallet_models.append({
            "dataset_id": dataset_id,
            "address": addr,
            "transaction_count": len(data["transactions"]),
            "total_in": sum(data["input_amounts"]),
            "total_out": sum(data["output_amounts"]),
            "average_transaction_value": (sum(data["input_amounts"]) + sum(data["output_amounts"])) / max(len(data["transactions"]), 1),
            "unique_counterparties": len(data["counterparties"]),
            "fan_in": sum(len(tx.inputs) for tx in transactions if addr in tx.inputs),
            "fan_out": sum(len(tx.outputs) for tx in transactions if addr in tx.outputs),
            "first_seen": first_seen,
            "last_seen": last_seen,
        })
    
    with get_db_session() as db:
        repo = WalletRepository(db)
        repo.bulk_insert(wallet_models)
    
    logger.info(f"Created {len(wallet_models)} wallet aggregates")
    return wallet_models


def run_feature_engineering(dataset_id: str, transactions: list):
    logger.info("Running feature engineering...")
    
    with get_db_session() as db:
        wallet_repo = WalletRepository(db)
        wallets = wallet_repo.get_by_dataset(dataset_id)
    
    wallet_features = feature_engineering_service.compute_wallet_features(transactions)
    
    with get_db_session() as db:
        wallet_repo = WalletRepository(db)
        for addr, features in wallet_features.items():
            wallet_repo.update_features(dataset_id, addr, features.model_dump())
    
    logger.info(f"Computed features for {len(wallet_features)} wallets")
    return wallet_features


def build_graph(transactions: list, wallet_features: dict):
    logger.info("Building graph...")
    graph_builder.build_graph(transactions, wallet_features)
    logger.info(f"Graph built: {graph_builder.graph.number_of_nodes()} nodes, {graph_builder.graph.number_of_edges()} edges")


def run_community_detection(dataset_id: str):
    logger.info("Running community detection...")
    
    from app.graph.community_detection import community_detector
    
    wallet_nodes = [n for n, d in graph_builder.graph.nodes(data=True) if d.get("type") == "wallet"]
    wallet_subgraph = graph_builder.graph.to_undirected().subgraph(wallet_nodes)
    
    communities = community_detector.detect_communities_greedy(wallet_subgraph)
    communities = community_detector.filter_small_communities(communities)
    
    with get_db_session() as db:
        wallet_repo = WalletRepository(db)
        for node_id, comm_id in communities.items():
            if comm_id >= 0:
                addr = node_id.replace("wallet_", "")
                wallet_repo.update_community(dataset_id, addr, comm_id)
    
    logger.info(f"Detected {len(set(communities.values())) - (1 if -1 in communities.values() else 0)} communities")


def train_ml_model(dataset_id: str):
    logger.info("Training ML model...")
    
    with get_db_session() as db:
        wallet_repo = WalletRepository(db)
        wallets = wallet_repo.get_by_dataset(dataset_id)
        
        wallet_features = {}
        for w in wallets:
            wallet_features[w.address] = w.features or {}
    
    if not any(wallet_features.values()):
        logger.warning("No features available, skipping ML training")
        return
    
    matrix, wallet_ids, feature_names = feature_engineering_service.build_feature_matrix(
        {k: type('WalletFeatures', (), v)() for k, v in wallet_features.items()}
    )
    
    if matrix.size == 0:
        logger.warning("Empty feature matrix, skipping ML training")
        return
    
    matrix = feature_engineering_service.normalize_features(matrix)
    
    metrics = anomaly_detector.train(matrix, feature_names, dataset_id)
    anomaly_detector.save()
    
    model_registry.register_model(anomaly_detector, dataset_id, metrics)
    
    logger.info(f"ML model trained: {metrics}")


def generate_risk_scores(dataset_id: str):
    logger.info("Generating risk scores and alerts...")
    
    # Extract all data within the session
    with get_db_session() as db:
        wallet_repo = WalletRepository(db)
        wallets = wallet_repo.get_by_dataset(dataset_id)
        
        tx_repo = TransactionRepository(db)
        transactions = tx_repo.get_by_dataset(dataset_id)
        
        netobs_repo = NetworkObservationRepository(db)
        network_obs = netobs_repo.get_by_dataset(dataset_id)
        
        # Extract wallet data
        wallet_objects = {}
        for w in wallets:
            # Convert features dict to WalletFeatures object
            features_dict = w.features or {}
            features_obj = type('WalletFeatures', (), features_dict)()
            wallet_objects[w.address] = type('Wallet', (), {
                'address': w.address,
                'transaction_count': w.transaction_count,
                'total_in': w.total_in,
                'total_out': w.total_out,
                'average_transaction_value': w.average_transaction_value,
                'unique_counterparties': w.unique_counterparties,
                'fan_in': w.fan_in,
                'fan_out': w.fan_out,
                'first_seen': w.first_seen,
                'last_seen': w.last_seen,
                'risk_score': w.risk_score,
                'risk_level': RiskLevel(w.risk_level),
                'community_id': w.community_id,
                'features': features_obj,
            })()
        
        # Extract transaction data
        tx_objects = []
        for tx in transactions:
            tx_objects.append(NormalizedTransaction(
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
            ))
        
        # Extract network observation data
        netobs_dicts = []
        for obs in network_obs:
            netobs_dicts.append({
                'timestamp': obs.timestamp,
                'src_ip': obs.src_ip,
                'dst_ip': obs.dst_ip,
                'src_port': obs.src_port,
                'dst_port': obs.dst_port,
                'txid': obs.txid,
                'geo_country': obs.geo_country,
                'asn': obs.asn,
            })
    
    alerts = explanation_service.generate_all_alerts(
        wallet_objects, tx_objects, netobs_dicts, top_k=200
    )
    
    with get_db_session() as db:
        alert_repo = AlertRepository(db)
        alert_data = []
        for alert in alerts:
            alert_data.append({
                "id": alert.alert_id,
                "dataset_id": dataset_id,
                "entity_id": alert.entity_id,
                "entity_type": alert.entity_type,
                "risk_score": alert.risk_score,
                "risk_level": alert.risk_level.value,
                "reasons": [r.model_dump() for r in alert.reasons],
                "related_transactions": alert.related_transactions,
                "related_wallets": alert.related_wallets,
                "related_ips": alert.related_ips,
                "related_asns": alert.related_asns,
                "related_countries": alert.related_countries,
                "graph_statistics": alert.graph_statistics,
                "correlation_evidence": [ce.model_dump() for ce in alert.correlation_evidence],
            })
        alert_repo.bulk_insert(alert_data)
    
    for alert in alerts:
        wallet_obj = wallet_objects.get(alert.entity_id)
        if wallet_obj:
            with get_db_session() as db:
                wallet_repo = WalletRepository(db)
                wallet_repo.update_risk(dataset_id, alert.entity_id, alert.risk_score, alert.risk_level.value)
    
    logger.info(f"Generated {len(alerts)} alerts")


async def run_pipeline(
    dataset_path: str = None,
    dataset_id: str = None,
    generate_data: bool = False,
    num_transactions: int = 50000,
):
    init_db()
    
    if not dataset_id:
        dataset_id = str(uuid.uuid4())
    
    if generate_data or not dataset_path:
        logger.info("Generating synthetic dataset...")
        from scripts.generate_dataset import generate_dataset
        result = generate_dataset(
            num_transactions=num_transactions,
            num_wallets=min(num_transactions // 3, 20000),
            num_days=30,
            output_format="json",
            output_path=f"data/raw/dataset_{dataset_id}.json",
        )
        dataset_path = f"data/raw/dataset_{dataset_id}.json"
        logger.info(f"Generated dataset: {result}")
    
    with get_db_session() as db:
        repo = DatasetRepository(db)
        dataset = repo.create(
            name=f"Dataset {dataset_id}",
            filename=Path(dataset_path).name,
            format="json",
            dataset_id=dataset_id,
        )
    
    transactions = await run_ingestion(dataset_id, dataset_path)
    build_wallets(transactions, dataset_id)
    wallet_features = run_feature_engineering(dataset_id, transactions)
    build_graph(transactions, wallet_features)
    run_community_detection(dataset_id)
    train_ml_model(dataset_id)
    generate_risk_scores(dataset_id)
    
    logger.info("Pipeline complete!")
    logger.info(f"Dataset ID: {dataset_id}")
    logger.info("Start the API server with: uvicorn app.main:app --host 0.0.0.0 --port 8000")
    
    return dataset_id


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run complete forensic intelligence pipeline")
    parser.add_argument("--dataset-path", type=str, help="Path to dataset file")
    parser.add_argument("--dataset-id", type=str, help="Dataset ID (generated if not provided)")
    parser.add_argument("--generate", action="store_true", help="Generate synthetic data")
    parser.add_argument("--transactions", type=int, default=50000, help="Number of transactions to generate")
    
    args = parser.parse_args()
    
    asyncio.run(run_pipeline(
        dataset_path=args.dataset_path,
        dataset_id=args.dataset_id,
        generate_data=args.generate,
        num_transactions=args.transactions,
    ))