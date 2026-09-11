from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import (
    ForensicsException,
    forensics_exception_handler,
    http_exception_handler,
    general_exception_handler,
)
from app.db.database import init_db
from app.ml.anomaly_detector import anomaly_detector
from app.api.routes import (
    health, datasets, investigations, alerts, entities,
    transactions, graph, ml, dashboard,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger = logging.getLogger(__name__)
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    
    init_db()
    logger.info("Database initialized")
    
    # Load ML model if exists
    if anomaly_detector.load():
        logger.info(f"ML model loaded: trained at {anomaly_detector.trained_at}")
    else:
        logger.info("No trained ML model found, will train on first dataset")
    
    # Auto-ingest generated CSV data if available
    try:
        from app.services.csv_ingestion import auto_ingest_sample_data
        dataset_id = auto_ingest_sample_data()
        if dataset_id:
            logger.info(f"Auto-ingested sample data as dataset: {dataset_id}")
        else:
            logger.info("No generated CSVs to auto-ingest (run: python scripts/generate_forensic_csvs.py)")
    except Exception as e:
        logger.warning(f"Auto-ingestion skipped: {e}")
    
    yield
    
    logger.info("Shutting down")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Offline Bitcoin Forensic Intelligence System",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(ForensicsException, forensics_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(investigations.router, prefix="/api/investigations", tags=["Investigations"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(entities.router, prefix="/api/entities", tags=["Entities"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(ml.router, prefix="/api/ml", tags=["ML"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
    }
