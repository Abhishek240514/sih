"""
CSV Ingestion Service
=====================
Reads the synthetic CSVs and uses the shared detection pipeline
for all risk scoring, detection, and alert generation.
"""

import csv
import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict

from app.db.database import get_db_session
from app.db.repository import (
    DatasetRepository,
    TransactionRepository,
    WalletRepository,
    NetworkObservationRepository,
    AlertRepository,
)
from app.models.schemas import NormalizedTransaction, RiskLevel
from app.services.detection_pipeline import detection_pipeline, DetectionResult

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
GENERATED_DIR = BASE_DIR / "data" / "generated"
SAMPLE_DIR = BASE_DIR / "data" / "sample"


def _parse_json_field(value: str) -> list:
    if not value or value.strip() == "":
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else [parsed]
    except (json.JSONDecodeError, TypeError):
        return [value]


def _parse_timestamp(ts_str: str) -> Optional[datetime]:
    from datetime import timezone
    for fmt in [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    ]:
        try:
            dt = datetime.strptime(ts_str.strip(), fmt)
            # Make timezone-aware (UTC)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except (ValueError, AttributeError):
            continue
    return None


def _risk_level(score: float) -> str:
    """Convert 0-1 risk score to risk level string."""
    if score >= 0.75:
        return "CRITICAL"
    elif score >= 0.50:
        return "HIGH"
    elif score >= 0.25:
        return "MEDIUM"
    return "LOW"


def ingest_generated_csvs(
    data_dir: Optional[Path] = None,
    dataset_name: str = "Generated Forensic Dataset",
) -> str:
    if data_dir is None:
        data_dir = GENERATED_DIR

    ledger_path = data_dir / "blockchain_ledger.csv"
    network_path = data_dir / "network_logs.csv"
    truth_path = data_dir / "ground_truth.csv"

    if not ledger_path.exists():
        raise FileNotFoundError(f"Blockchain ledger not found: {ledger_path}")

    logger.info("Starting CSV ingestion from %s", data_dir)

    # Read ground truth
    ground_truth: Dict[str, Dict[str, Any]] = {}
    if truth_path.exists():
        with open(truth_path, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                ground_truth[row["entity_id"]] = {
                    "type": row.get("type", "unknown"),
                    "label": int(row.get("label", 0)),
                }
        logger.info("Loaded %d ground truth labels", len(ground_truth))

    # Read network logs indexed by txid
    network_by_txid: Dict[str, Dict[str, Any]] = {}
    network_observations: List[Dict[str, Any]] = []
    if network_path.exists():
        with open(network_path, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                txid = row.get("txid", "")
                if txid:
                    network_by_txid[txid] = row
                    # Build network observation list
                    obs = {
                        "txid": txid,
                        "timestamp": row.get("timestamp", ""),
                        "src_ip": row.get("src_ip", ""),
                        "dst_ip": row.get("dst_ip", ""),
                        "src_port": row.get("src_port"),
                        "dst_port": row.get("dst_port"),
                        "geo_country": row.get("geo_country", ""),
                        "asn": row.get("asn", ""),
                    }
                    network_observations.append(obs)
        logger.info("Loaded %d network log entries", len(network_by_txid))

    # Read blockchain ledger and build NormalizedTransaction objects
    transactions: List[NormalizedTransaction] = []
    with open(ledger_path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            txid = row.get("txid", "")
            net_info = network_by_txid.get(txid, {})
            ts = _parse_timestamp(net_info.get("timestamp", "")) or datetime.utcnow()
            input_addrs = _parse_json_field(row.get("input_addresses", "[]"))
            output_addrs = _parse_json_field(row.get("output_addresses", "[]"))
            input_amts = _parse_json_field(row.get("input_amounts", "[]"))
            output_amts = _parse_json_field(row.get("output_amounts", "[]"))
            
            try:
                fee = float(row.get("fee", 0.0))
            except (ValueError, TypeError):
                fee = 0.0
            
            input_amount = sum(float(a) for a in input_amts if a)
            output_amount = sum(float(a) for a in output_amts if a)
            
            src_ip = net_info.get("src_ip", "")
            dst_ip = net_info.get("dst_ip", "")
            src_port = net_info.get("src_port")
            dst_port = net_info.get("dst_port")
            
            try:
                src_port = int(src_port) if src_port else None
            except (ValueError, TypeError):
                src_port = None
            try:
                dst_port = int(dst_port) if dst_port else None
            except (ValueError, TypeError):
                dst_port = None

            tx = NormalizedTransaction(
                txid=txid,
                timestamp=ts,
                inputs=input_addrs,
                outputs=output_addrs,
                input_amounts=[float(a) for a in input_amts if a],
                output_amounts=[float(a) for a in output_amts if a],
                fee=fee,
                script_type=row.get("script_type", "P2PKH"),
                source_ips=[src_ip] if src_ip else [],
                destination_ips=[dst_ip] if dst_ip else [],
                source_ports=[src_port] if src_port else [],
                destination_ports=[dst_port] if dst_port else [],
                geo_country=net_info.get("geo_country", ""),
                asn=net_info.get("asn", ""),
                input_amount=input_amount,
                output_amount=output_amount,
            )
            transactions.append(tx)

    logger.info("Parsed %d transactions", len(transactions))

    # RUN SHARED DETECTION PIPELINE
    logger.info("Running shared detection pipeline...")
    dataset_id = str(uuid.uuid4())
    result = detection_pipeline.run(
        transactions=transactions,
        network_observations=network_observations,
        dataset_id=dataset_id,
        auto_train_ml=True,
    )

    # Write results to database
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        tx_repo = TransactionRepository(db)
        wallet_repo = WalletRepository(db)
        netobs_repo = NetworkObservationRepository(db)
        alert_repo = AlertRepository(db)

        # Skip if already ingested
        existing = dataset_repo.list_all()
        for ds in existing:
            if ds.name == dataset_name:
                logger.info("Dataset '%s' already exists (id=%s), skipping", dataset_name, ds.id)
                return ds.id

        dataset_repo.create(
            dataset_id=dataset_id,
            name=dataset_name,
            filename="generated_csvs",
            format="csv",
        )
        logger.info("Created dataset: %s (%s)", dataset_name, dataset_id)

        # Insert transactions
        tx_records = []
        for tx in transactions:
            net_info = network_by_txid.get(tx.txid, {})
            src_ip = net_info.get("src_ip", "")
            dst_ip = net_info.get("dst_ip", "")
            src_port = net_info.get("src_port")
            dst_port = net_info.get("dst_port")
            
            try:
                src_port = int(src_port) if src_port else None
            except (ValueError, TypeError):
                src_port = None
            try:
                dst_port = int(dst_port) if dst_port else None
            except (ValueError, TypeError):
                dst_port = None

            tx_records.append({
                "id": str(uuid.uuid4()),
                "dataset_id": dataset_id,
                "txid": tx.txid,
                "timestamp": tx.timestamp,
                "input_addresses": tx.inputs,
                "output_addresses": tx.outputs,
                "input_amounts": tx.input_amounts,
                "output_amounts": tx.output_amounts,
                "fee": tx.fee,
                "script_type": tx.script_type or "P2PKH",
                "source_ips": tx.source_ips,
                "destination_ips": tx.destination_ips,
                "source_ports": tx.source_ports,
                "destination_ports": tx.destination_ports,
                "geo_country": tx.geo_country or "",
                "asn": tx.asn or "",
                "input_amount": tx.input_amount,
                "output_amount": tx.output_amount,
            })
        tx_repo.bulk_insert(tx_records)
        logger.info("Inserted %d transactions", len(tx_records))

        # Insert wallets from detection pipeline results
        wallet_records = []
        for addr, wallet in result.wallets.items():
            wallet_records.append({
                "id": str(uuid.uuid4()),
                "dataset_id": dataset_id,
                "address": wallet.address,
                "transaction_count": wallet.transaction_count,
                "total_in": wallet.total_in,
                "total_out": wallet.total_out,
                "average_transaction_value": wallet.average_transaction_value,
                "unique_counterparties": wallet.unique_counterparties,
                "fan_in": wallet.fan_in,
                "fan_out": wallet.fan_out,
                "first_seen": wallet.first_seen,
                "last_seen": wallet.last_seen,
                "risk_score": wallet.risk_score,
                "risk_level": wallet.risk_level.value,
                "community_id": wallet.community_id,
                "features": wallet.features.model_dump() if hasattr(wallet.features, 'model_dump') else wallet.features,
            })
        wallet_repo.bulk_insert(wallet_records)
        logger.info("Inserted %d wallets", len(wallet_records))

        # Insert network observations
        netobs_records = []
        for obs in network_observations:
            ts = _parse_timestamp(obs.get("timestamp", "")) or datetime.utcnow()
            src_port = obs.get("src_port")
            dst_port = obs.get("dst_port")
            try:
                src_port = int(src_port) if src_port else None
            except (ValueError, TypeError):
                src_port = None
            try:
                dst_port = int(dst_port) if dst_port else None
            except (ValueError, TypeError):
                dst_port = None
            netobs_records.append({
                "id": str(uuid.uuid4()),
                "dataset_id": dataset_id,
                "timestamp": ts,
                "src_ip": obs.get("src_ip", "0.0.0.0"),
                "dst_ip": obs.get("dst_ip", "0.0.0.0"),
                "src_port": src_port,
                "dst_port": dst_port,
                "txid": obs.get("txid", ""),
                "geo_country": obs.get("geo_country", ""),
                "asn": obs.get("asn", ""),
            })
        netobs_repo.bulk_insert(netobs_records)
        logger.info("Inserted %d network observations", len(netobs_records))

        # Insert alerts from detection pipeline
        alert_records = []
        for alert in result.alerts:
            alert_records.append({
                "id": str(uuid.uuid4()),
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
                "correlation_evidence": [c.model_dump() for c in alert.correlation_evidence],
                "created_at": alert.timestamp,
            })
        alert_repo.bulk_insert(alert_records)
        logger.info("Inserted %d alerts", len(alert_records))

        dataset_repo.update_status(
            dataset_id=dataset_id,
            status="processed",
            valid_records=len(transactions),
            invalid_records=0,
            duplicates=0,
        )
        logger.info("Ingestion complete: %d txns, %d wallets, %d netobs, %d alerts",
                     len(tx_records), len(wallet_records), len(netobs_records), len(alert_records))
        return dataset_id


def auto_ingest_sample_data() -> Optional[str]:
    for data_dir in [GENERATED_DIR, SAMPLE_DIR]:
        ledger_path = data_dir / "blockchain_ledger.csv"
        if ledger_path.exists():
            logger.info("Found generated CSVs in %s, auto-ingesting...", data_dir)
            try:
                return ingest_generated_csvs(
                    data_dir=data_dir,
                    dataset_name="Auto-Ingested Forensic Dataset",
                )
            except Exception as e:
                logger.error("Auto-ingestion failed: %s", e)
                return None
    logger.info("No generated CSVs found for auto-ingestion")
    return None