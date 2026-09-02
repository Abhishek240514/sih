#!/usr/bin/env python3
"""
Model Evaluation Script

Evaluates trained model against ground truth labels (if available).
"""

import argparse
import json
import logging
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    precision_recall_curve, auc, confusion_matrix
)

from app.db.database import init_db, get_db_session
from app.db.repository import DatasetRepository, WalletRepository
from app.services.feature_service import feature_engineering_service
from app.ml.anomaly_detector import AnomalyDetector
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def evaluate_model(dataset_id: str, labels_path: str):
    init_db()
    
    with open(labels_path, "r") as f:
        labels = json.load(f)
    
    with get_db_session() as db:
        dataset_repo = DatasetRepository(db)
        dataset = dataset_repo.get(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        wallet_repo = WalletRepository(db)
        wallets = wallet_repo.get_by_dataset(dataset_id)
    
    if not wallets:
        raise ValueError("No wallets found")
    
    wallet_features = {}
    for w in wallets:
        wallet_features[w.address] = w.features or {}
    
    matrix, wallet_ids, feature_names = feature_engineering_service.build_feature_matrix(
        {k: type('WalletFeatures', (), v)() for k, v in wallet_features.items()}
    )
    
    matrix = feature_engineering_service.normalize_features(matrix)
    
    detector = AnomalyDetector(
        contamination=settings.ml_contamination,
        n_estimators=settings.ml_n_estimators,
        random_state=settings.ml_random_seed,
    )
    
    if not detector.load():
        raise ValueError("No trained model found. Train first.")
    
    predictions, anomaly_scores = detector.predict(matrix)
    normalized_scores = [detector.normalize_anomaly_score(s) for s in anomaly_scores]
    
    y_true = []
    y_pred = []
    y_scores = []
    
    for i, wallet_id in enumerate(wallet_ids):
        label = labels.get(wallet_id, "normal")
        is_suspicious = 1 if label != "normal" else 0
        
        y_true.append(is_suspicious)
        y_pred.append(1 if predictions[i] == -1 else 0)
        y_scores.append(normalized_scores[i])
    
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    y_scores = np.array(y_scores)
    
    print(f"\n=== Evaluation Results for Dataset {dataset_id} ===")
    print(f"Total wallets: {len(y_true)}")
    print(f"Suspicious (ground truth): {np.sum(y_true)}")
    print(f"Predicted anomalies: {np.sum(y_pred)}")
    
    if np.sum(y_true) > 0:
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        
        print(f"\nBinary Classification (Isolation Forest predictions):")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1 Score: {f1:.4f}")
        
        cm = confusion_matrix(y_true, y_pred)
        print(f"\nConfusion Matrix:")
        print(f"  TN: {cm[0,0]}  FP: {cm[0,1]}")
        print(f"  FN: {cm[1,0]}  TP: {cm[1,1]}")
        
        precision_curve, recall_curve, _ = precision_recall_curve(y_true, y_scores)
        pr_auc = auc(recall_curve, precision_curve)
        print(f"\nPR-AUC (using anomaly scores): {pr_auc:.4f}")
    
    print(f"\n=== Top-K Precision (Investigative Prioritization) ===")
    sorted_indices = np.argsort(y_scores)[::-1]
    
    for k in [10, 20, 50, 100]:
        if k <= len(y_true):
            top_k_indices = sorted_indices[:k]
            top_k_true = y_true[top_k_indices]
            top_k_precision = np.mean(top_k_true)
            print(f"  Top-{k} Precision: {top_k_precision:.4f} ({np.sum(top_k_true)}/{k})")
    
    label_types = {}
    for wallet_id, label in labels.items():
        if wallet_id in wallet_ids:
            idx = wallet_ids.index(wallet_id)
            if label not in label_types:
                label_types[label] = {"scores": [], "count": 0}
            label_types[label]["scores"].append(normalized_scores[idx])
            label_types[label]["count"] += 1
    
    print(f"\n=== Score Distribution by Label ===")
    for label, data in label_types.items():
        scores = data["scores"]
        print(f"  {label} (n={data['count']}): mean={np.mean(scores):.4f}, "
              f"median={np.median(scores):.4f}, max={np.max(scores):.4f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate trained model")
    parser.add_argument("--dataset-id", required=True, help="Dataset ID")
    parser.add_argument("--labels", required=True, help="Path to labels JSON file")
    
    args = parser.parse_args()
    
    try:
        evaluate_model(args.dataset_id, args.labels)
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        sys.exit(1)