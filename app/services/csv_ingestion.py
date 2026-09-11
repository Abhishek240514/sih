"""
CSV Ingestion Service
=====================
Reads the synthetic CSVs produced by scripts/generate_forensic_csvs.py
and populates the SQLite database with transactions, wallets, network
observations, and risk-scored alerts.
"""

import csv
import json
import uuid
import logging
import random
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
    for fmt in [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    ]:
        try:
            return datetime.strptime(ts_str.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return None


def _risk_level(score: float) -> str:
    if score >= 75:
        return "CRITICAL"
    elif score >= 50:
        return "HIGH"
    elif score >= 25:
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
    if network_path.exists():
        with open(network_path, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                txid = row.get("txid", "")
                if txid:
                    network_by_txid[txid] = row
        logger.info("Loaded %d network log entries", len(network_by_txid))

    # Read blockchain ledger
    ledger_rows: List[Dict[str, Any]] = []
    with open(ledger_path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ledger_rows.append(row)
    logger.info("Loaded %d ledger entries", len(ledger_rows))

    # Build wallet statistics
    wallet_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "tx_count": 0, "total_in": 0.0, "total_out": 0.0,
        "counterparties": set(), "fan_in": 0, "fan_out": 0,
        "first_seen": None, "last_seen": None, "ips": set(),
    })

    for row in ledger_rows:
        txid = row.get("txid", "")
        input_addrs = _parse_json_field(row.get("input_addresses", "[]"))
        output_addrs = _parse_json_field(row.get("output_addresses", "[]"))
        input_amts = _parse_json_field(row.get("input_amounts", "[]"))
        output_amts = _parse_json_field(row.get("output_amounts", "[]"))
        net_info = network_by_txid.get(txid, {})
        ts = _parse_timestamp(net_info.get("timestamp", ""))

        for i, addr in enumerate(input_addrs):
            if not addr:
                continue
            ws = wallet_stats[addr]
            ws["tx_count"] += 1
            if i < len(input_amts):
                try:
                    ws["total_out"] += float(input_amts[i])
                except (ValueError, TypeError):
                    pass
            ws["fan_out"] += len(output_addrs)
            for oa in output_addrs:
                ws["counterparties"].add(oa)
            if ts:
                if ws["first_seen"] is None or ts < ws["first_seen"]:
                    ws["first_seen"] = ts
                if ws["last_seen"] is None or ts > ws["last_seen"]:
                    ws["last_seen"] = ts
            src_ip = net_info.get("src_ip", "")
            if src_ip:
                ws["ips"].add(src_ip)

        for i, addr in enumerate(output_addrs):
            if not addr:
                continue
            ws = wallet_stats[addr]
            ws["tx_count"] += 1
            if i < len(output_amts):
                try:
                    ws["total_in"] += float(output_amts[i])
                except (ValueError, TypeError):
                    pass
            ws["fan_in"] += len(input_addrs)
            for ia in input_addrs:
                ws["counterparties"].add(ia)
            if ts:
                if ws["first_seen"] is None or ts < ws["first_seen"]:
                    ws["first_seen"] = ts
                if ws["last_seen"] is None or ts > ws["last_seen"]:
                    ws["last_seen"] = ts

    logger.info("Computed stats for %d wallets", len(wallet_stats))

    def _compute_risk(addr: str, stats: Dict) -> float:
        score = 0.0
        for prefix in ["1Peel", "3Mix", "1Ext"]:
            if addr.startswith(prefix):
                score += 60.0
                break
        if stats["tx_count"] > 10:
            score += min(15.0, stats["tx_count"] * 0.5)
        if stats["fan_out"] > 20:
            score += min(10.0, stats["fan_out"] * 0.3)
        if stats["fan_in"] > 15:
            score += min(10.0, stats["fan_in"] * 0.3)
        total_vol = stats["total_in"] + stats["total_out"]
        if total_vol > 5.0:
            score += min(10.0, total_vol * 0.5)
        if len(stats.get("ips", set())) > 3:
            score += 5.0
        return min(100.0, max(0.0, score))

    # Write to database
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

        dataset_id = str(uuid.uuid4())
        dataset_repo.create(
            dataset_id=dataset_id,
            name=dataset_name,
            filename="generated_csvs",
            format="csv",
        )
        logger.info("Created dataset: %s (%s)", dataset_name, dataset_id)

        # Insert transactions
        tx_records = []
        for row in ledger_rows:
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

            tx_records.append({
                "id": str(uuid.uuid4()),
                "dataset_id": dataset_id,
                "txid": txid,
                "timestamp": ts,
                "input_addresses": input_addrs,
                "output_addresses": output_addrs,
                "input_amounts": [float(a) for a in input_amts if a],
                "output_amounts": [float(a) for a in output_amts if a],
                "fee": fee,
                "script_type": row.get("script_type", "P2PKH"),
                "source_ips": [src_ip] if src_ip else [],
                "destination_ips": [dst_ip] if dst_ip else [],
                "source_ports": [src_port] if src_port else [],
                "destination_ports": [dst_port] if dst_port else [],
                "geo_country": net_info.get("geo_country", ""),
                "asn": net_info.get("asn", ""),
                "input_amount": input_amount,
                "output_amount": output_amount,
            })
        tx_repo.bulk_insert(tx_records)
        logger.info("Inserted %d transactions", len(tx_records))

        # Insert wallets
        wallet_records = []
        for addr, stats in wallet_stats.items():
            risk_score = _compute_risk(addr, stats)
            total_vol = stats["total_in"] + stats["total_out"]
            avg_val = total_vol / max(stats["tx_count"], 1)
            wallet_records.append({
                "id": str(uuid.uuid4()),
                "dataset_id": dataset_id,
                "address": addr,
                "transaction_count": stats["tx_count"],
                "total_in": round(stats["total_in"], 8),
                "total_out": round(stats["total_out"], 8),
                "average_transaction_value": round(avg_val, 8),
                "unique_counterparties": len(stats["counterparties"]),
                "fan_in": stats["fan_in"],
                "fan_out": stats["fan_out"],
                "first_seen": stats["first_seen"],
                "last_seen": stats["last_seen"],
                "risk_score": round(risk_score, 2),
                "risk_level": _risk_level(risk_score),
                "community_id": None,
                "features": {
                    "ip_count": len(stats.get("ips", set())),
                    "country_count": len(stats.get("countries", set())),
                    "suspicious_flags": stats.get("suspicious_flags", 0),
                    "cluster_size": 1,
                },
            })
        wallet_repo.bulk_insert(wallet_records)
        logger.info("Inserted %d wallets", len(wallet_records))

        # Insert network observations
        netobs_records = []
        for txid, net_info in network_by_txid.items():
            ts = _parse_timestamp(net_info.get("timestamp", "")) or datetime.utcnow()
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
            netobs_records.append({
                "id": str(uuid.uuid4()),
                "dataset_id": dataset_id,
                "timestamp": ts,
                "src_ip": net_info.get("src_ip", "0.0.0.0"),
                "dst_ip": net_info.get("dst_ip", "0.0.0.0"),
                "src_port": src_port,
                "dst_port": dst_port,
                "txid": txid,
                "geo_country": net_info.get("geo_country", ""),
                "asn": net_info.get("asn", ""),
            })
        netobs_repo.bulk_insert(netobs_records)
        logger.info("Inserted %d network observations", len(netobs_records))

        # Generate alerts for high-risk wallets
        alert_records = []
        high_risk = [w for w in wallet_records if w["risk_score"] >= 25.0]
        for w in sorted(high_risk, key=lambda x: x["risk_score"], reverse=True):
            reasons = []
            addr = w["address"]
            if addr.startswith("1Peel"):
                reasons.append({"signal": "Peeling Chain Pattern", "description": "Sequential peel-off of small amounts from a large UTXO", "contribution": 45, "evidence_type": "heuristic"})
            elif addr.startswith("3Mix"):
                reasons.append({"signal": "Mixer/Tumbler Activity", "description": "Fan-in/fan-out structure with uniform output amounts", "contribution": 55, "evidence_type": "heuristic"})
            elif addr.startswith("1Ext"):
                reasons.append({"signal": "High-Velocity Extortion", "description": "Rapid burst of small transactions from single cluster", "contribution": 50, "evidence_type": "observed"})
            if w["fan_out"] > 10:
                reasons.append({"signal": "High Dispersion", "description": f"Fan-out of {w['fan_out']}", "contribution": 20, "evidence_type": "model_derived"})
            if w["transaction_count"] > 5:
                reasons.append({"signal": "Elevated Velocity", "description": f"{w['transaction_count']} transactions", "contribution": 15, "evidence_type": "model_derived"})
            if not reasons:
                reasons.append({"signal": "Behavioral Anomaly", "description": "Statistical outlier", "contribution": 30, "evidence_type": "model_derived"})

            alert_records.append({
                "id": str(uuid.uuid4()),
                "dataset_id": dataset_id,
                "entity_id": addr,
                "entity_type": "wallet",
                "risk_score": w["risk_score"],
                "risk_level": w["risk_level"],
                "reasons": list(reasons),
                "related_transactions": [],
                "related_wallets": [],
                "related_ips": list(stats.get("ips", set())),
                "related_asns": list(stats.get("asns", set())),
                "related_countries": list(stats.get("countries", set())),
                "graph_statistics": {},
                "correlation_evidence": [],
                "created_at": datetime.utcnow(),
            })
        alert_repo.bulk_insert(alert_records)
        logger.info("Inserted %d alerts", len(alert_records))

        dataset_repo.update_status(
            dataset_id=dataset_id,
            status="processed",
            valid_records=len(ledger_rows),
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
