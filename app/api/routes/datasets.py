from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import List, Optional
import uuid
import logging

from app.models.schemas import (
    DatasetResponse, DatasetUploadRequest, IngestionReport,
    DatasetStatus, DatasetFormat
)
from app.services.ingestion_service import ingestion_service
from app.db.repository import DatasetRepository
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
        created_at=dataset.created_at,
    )


async def process_dataset_background(dataset_id: str, content: bytes, filename: str):
    with get_db_session() as db:
        repo = DatasetRepository(db)
        repo.update_status(dataset_id, DatasetStatus.PROCESSING.value)
    
    try:
        transactions, report = await ingestion_service.ingest(content, filename, dataset_id)
        
        with get_db_session() as db:
            repo = DatasetRepository(db)
            repo.update_status(
                dataset_id,
                DatasetStatus.PROCESSED.value,
                total_records=report.total_records,
                valid_records=report.valid_records,
                invalid_records=report.invalid_records,
                duplicates=report.duplicates,
                warnings=report.warnings,
            )
        
        logger.info(f"Dataset {dataset_id} processed successfully")
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