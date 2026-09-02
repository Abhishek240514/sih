#!/usr/bin/env python3
"""
Model Training Script

Trains the Isolation Forest anomaly detection model on processed dataset.
"""

import argparse
import json
import logging
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.database import init_db, get_db_session
from app.db.repository import DatasetRepository, WalletRepository
from app.services.feature_service import feature_engineering_service
from app.ml.anomaly_detector import AnomalyDetector
from app.ml.model_registry import model_registry
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def train_model(dataset_id: str, contamination: float = None, n_estimators: int = None):
    init_db()
    
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        if dataset.status != "processed":
            raise ValueError(f"Dataset {dataset_id} is not processed")
        
        wallet_repo = WalletRepository(db)
        wallets = wallet_repo.get_by_dataset(dataset_id)
    
    if not wallets:
        raise ValueError(f"No wallets found in dataset {dataset_id}")
    
    logger.info(f"Found {len(wallets)} wallets in dataset {dataset_id}")
    
    wallet_features = {}
    for w in wallets:
        wallet_features[w.address] = w.features or {}
    
    if not any(wallet_features.values()):
        raise ValueError("No features found in wallets. Run feature engineering first.")
    
    matrix, wallet_ids, feature_names = feature_engineering_service.build_feature_matrix(
        {k: type('WalletFeatures', (), v)() for k, v in wallet_features.items()}
    )
    
    if matrix.size == 0:
        raise ValueError("Empty feature matrix")
    
    logger.info(f"Feature matrix shape: {matrix.shape}")
    
    matrix = feature_engineering_service.normalize_features(matrix)
    
    detector = AnomalyDetector(
        contamination=contamination or settings.ml_contamination,
        n_estimators=n_estimators or settings.ml_n_estimators,
        random_state=settings.ml_random_seed,
    )
    
    logger.info("Training Isolation Forest...")
    metrics = detector.train(matrix, feature_names, dataset_id)
    
    model_path = detector.save()
    logger.info(f"Model saved to {model_path}")
    
    model_info = model_registry.register_model(detector, dataset_id, metrics)
    logger.info(f"Model registered: {model_info['model_id']}")
    
    return model_info


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train anomaly detection model")
    parser.add_argument("--dataset-id", required=True, help="Dataset ID to train on")
    parser.add_argument("--contamination", type=float, default=None, help="Contamination parameter")
    parser.add_argument("--n-estimators", type=int, default=None, help="Number of estimators")
    
    args = parser.parse_args()
    
    try:
        result = train_model(args.dataset_id, args.contamination, args.n_estimators)
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        logger.error(f"Training failed: {e}")
        sys.exit(1)