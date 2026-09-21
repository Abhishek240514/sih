from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import List, Optional
import uuid
import logging
from datetime import datetime
from app.models.schemas import (
    DatasetResponse, DatasetUploadRequest, IngestionReport,
    DatasetStatus, DatasetFormat
)
from app.services.ingestion_service import ingestion_service
from app.services.detection_pipeline import detection_pipeline
from app.db.repository import (
    DatasetRepository, TransactionRepository, WalletRepository,
    AlertRepository, NetworkObservationRepository
)
from app.db.database import get_db_session
from app.core.exceptions import (
    DatasetNotFoundError, DatasetInvalidError, FileTooLargeError,
    UnsupportedFormatError
)
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: Optional[str] = None,
):
    dataset_id = str(uuid.uuid4())
    filename = file.filename or f"dataset_{dataset_id}"
    
    if not any(filename.lower().endswith(ext) for ext in settings.allowed_extensions):
        raise UnsupportedFormatError(filename.split(".")[-1] if "." in filename else "unknown")
    
    content = await file.read()
    ingestion_service.validate_file_size(content)
    
    dataset_name = name or filename
    
    with get_db_session() as db:
        repo = DatasetRepository(db)
        dataset = repo.create(
            name=dataset_name,
            filename=filename,
            format=ingestion_service.detect_format(filename).value,
        )
        dataset.id = dataset_id
        db.flush()
        created_at = dataset.created_at
    
    background_tasks.add_task(process_dataset_background, dataset_id, content, filename)
    
    return DatasetResponse(
        id=dataset_id,
        name=dataset_name,
        filename=filename,
        format=ingestion_service.detect_format(filename),
        status=DatasetStatus.PROCESSING,
        total_records=0,
        valid_records=0,
        invalid_records=0,
        duplicates=0,
        warnings=[],
        created_at=created_at,
    )


async def process_dataset_background(dataset_id: str, content: bytes, filename: str):
    """Background task that uses the SHARED detection pipeline."""
    with get_db_session() as db:
        repo = DatasetRepository(db)
        repo.update_status(dataset_id, DatasetStatus.PROCESSING.value)
    
    try:
        # Step 1: Ingest and parse
        transactions, report = await ingestion_service.ingest(content, filename, dataset_id)
        
        # Step 2: Extract network observations from transactions
        network_observations = []
        for tx in transactions:
            if tx.source_ips or tx.destination_ips:
                for src_ip in (tx.source_ips or ["0.0.0.0"]):
                    for dst_ip in (tx.destination_ips or ["0.0.0.0"]):
                        network_observations.append({
                            "txid": tx.txid,
                            "timestamp": tx.timestamp.isoformat() if tx.timestamp else "",
                            "src_ip": src_ip,
                            "dst_ip": dst_ip,
                            "src_port": tx.source_ports[0] if tx.source_ports else None,
                            "dst_port": tx.destination_ports[0] if tx.destination_ports else None,
                            "geo_country": tx.geo_country or "",
                            "asn": tx.asn or "",
                        })
        
        # Step 3: Run SHARED detection pipeline
        logger.info(f"Running shared detection pipeline for dataset {dataset_id}")
        result = detection_pipeline.run(
            transactions=transactions,
            network_observations=network_observations,
            dataset_id=dataset_id,
            auto_train_ml=True,
        )
        
        # Step 4: Persist results to database
        with get_db_session() as db:
            tx_repo = TransactionRepository(db)
            wallet_repo = WalletRepository(db)
            netobs_repo = NetworkObservationRepository(db)
            alert_repo = AlertRepository(db)
            
            # Insert transactions
            tx_records = []
            for tx in transactions:
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
            if tx_records: tx_repo.bulk_insert(tx_records)
            
            # Insert network observations
            netobs_records = []
            for obs in network_observations:
                ts = datetime.fromisoformat(obs["timestamp"].replace("Z", "+00:00")) if obs.get("timestamp") else datetime.utcnow()
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
            if netobs_records: netobs_repo.bulk_insert(netobs_records)
            
            # Insert wallets from detection pipeline
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
            if wallet_records: wallet_repo.bulk_insert(wallet_records)
            
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
            if alert_records: alert_repo.bulk_insert(alert_records)
            
            # Update Dataset Status
            dataset_repo = DatasetRepository(db)
            dataset_repo.update_status(
                dataset_id,
                DatasetStatus.PROCESSED.value,
                total_records=report.total_records,
                valid_records=report.valid_records,
                invalid_records=report.invalid_records,
                duplicates=report.duplicates,
                warnings=report.warnings,
            )
            
        logger.info(f"Dataset {dataset_id} fully processed via shared pipeline: "
                    f"{len(result.wallets)} wallets, {len(result.alerts)} alerts, "
                    f"ML trained: {result.ml_model_trained}")
    except Exception as e:
        logger.error(f"Dataset {dataset_id} processing failed: {e}")
        with get_db_session() as db:
            repo = DatasetRepository(db)
            repo.update_status(dataset_id, DatasetStatus.FAILED.value)


@router.post("/{dataset_id}/process", response_model=IngestionReport)
async def process_dataset(
    dataset_id: str,
    background_tasks: BackgroundTasks,
):
    with get_db_session() as db:
        repo = DatasetRepository(db)
        dataset = repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        if dataset.status == DatasetStatus.PROCESSED.value:
            return IngestionReport(
                dataset_id=dataset_id,
                total_records=dataset.total_records,
                valid_records=dataset.valid_records,
                invalid_records=dataset.invalid_records,
                duplicates=dataset.duplicates,
                warnings=dataset.warnings or [],
            )
    
    return JSONResponse(
        status_code=202,
        content={"message": "Processing started", "dataset_id": dataset_id},
    )


@router.get("", response_model=List[DatasetResponse])
async def list_datasets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    with get_db_session() as db:
        repo = DatasetRepository(db)
        datasets = repo.list_all(skip, limit)
        
        return [
            DatasetResponse(
                id=d.id,
                name=d.name,
                filename=d.filename,
                format=DatasetFormat(d.format),
                status=DatasetStatus(d.status),
                total_records=d.total_records,
                valid_records=d.valid_records,
                invalid_records=d.invalid_records,
                duplicates=d.duplicates,
                warnings=d.warnings or [],
                created_at=d.created_at,
                processed_at=d.processed_at,
            )
            for d in datasets
        ]


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: str):
    with get_db_session() as db:
        repo = DatasetRepository(db)
        dataset = repo.get(dataset_id)
        if not dataset:
            raise DatasetNotFoundError(dataset_id)
        
        return DatasetResponse(
            id=dataset.id,
            name=dataset.name,
            filename=dataset.filename,
            format=DatasetFormat(dataset.format),
            status=DatasetStatus(dataset.status),
            total_records=dataset.total_records,
            valid_records=dataset.valid_records,
            invalid_records=dataset.invalid_records,
            duplicates=dataset.duplicates,
            warnings=dataset.warnings or [],
            created_at=dataset.created_at,
            processed_at=dataset.processed_at,
        )


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str):
    with get_db_session() as db:
        repo = DatasetRepository(db)
        if not repo.delete(dataset_id):
            raise DatasetNotFoundError(dataset_id)
    
    return {"message": "Dataset deleted", "dataset_id": dataset_id}