import numpy as np
import joblib
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime
import logging

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from app.core.config import settings

logger = logging.getLogger(__name__)


class AnomalyDetector:
    def __init__(
        self,
        contamination: float = None,
        n_estimators: int = None,
        random_state: int = None,
    ):
        self.contamination = contamination or settings.ml_contamination
        self.n_estimators = n_estimators or settings.ml_n_estimators
        self.random_state = random_state or settings.ml_random_seed
        
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.pipeline: Optional[Pipeline] = None
        self.feature_names: List[str] = []
        self.is_trained = False
        self.trained_at: Optional[datetime] = None
        self.training_dataset_id: Optional[str] = None
        self.version = "1.0.0"
    
    def train(
        self,
        X: np.ndarray,
        feature_names: List[str],
        dataset_id: str = None,
    ) -> Dict[str, Any]:
        if X.size == 0:
            raise ValueError("Training data is empty")
        
        logger.info(f"Training Isolation Forest on {X.shape[0]} samples with {X.shape[1]} features")
        
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1,
            max_samples="auto",
        )
        
        self.model.fit(X_scaled)
        
        self.pipeline = Pipeline([
            ("scaler", self.scaler),
            ("model", self.model),
        ])
        
        self.feature_names = feature_names
        self.is_trained = True
        self.trained_at = datetime.utcnow()
        self.training_dataset_id = dataset_id
        
        anomaly_scores = self.model.decision_function(X_scaled)
        predictions = self.model.predict(X_scaled)
        
        n_anomalies = np.sum(predictions == -1)
        anomaly_ratio = n_anomalies / len(predictions)
        
        metrics = {
            "n_samples": int(X.shape[0]),
            "n_features": int(X.shape[1]),
            "n_anomalies": int(n_anomalies),
            "anomaly_ratio": float(anomaly_ratio),
            "mean_anomaly_score": float(np.mean(anomaly_scores)),
            "std_anomaly_score": float(np.std(anomaly_scores)),
            "contamination": self.contamination,
            "n_estimators": self.n_estimators,
        }
        
        logger.info(f"Training complete: {n_anomalies} anomalies detected ({anomaly_ratio:.2%})")
        
        return metrics
    
    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        if not self.is_trained or self.model is None:
            raise RuntimeError("Model not trained")
        
        if self.scaler is None:
            raise RuntimeError("Scaler not fitted")
        
        X_scaled = self.scaler.transform(X)
        anomaly_scores = self.model.decision_function(X_scaled)
        predictions = self.model.predict(X_scaled)
        
        return predictions, anomaly_scores
    
    def predict_single(self, x: np.ndarray) -> Tuple[int, float]:
        if not self.is_trained:
            raise RuntimeError("Model not trained")
        
        x_reshaped = x.reshape(1, -1)
        x_scaled = self.scaler.transform(x_reshaped)
        
        anomaly_score = self.model.decision_function(x_scaled)[0]
        prediction = self.model.predict(x_scaled)[0]
        
        return int(prediction), float(anomaly_score)
    
    def get_anomaly_score(self, X: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("Model not trained")
        
        X_scaled = self.scaler.transform(X)
        return self.model.decision_function(X_scaled)
    
    def normalize_anomaly_score(self, raw_score: float) -> float:
        return 1.0 / (1.0 + np.exp(raw_score))
    
    def save(self, path: Path = None) -> Path:
        if not self.is_trained:
            raise RuntimeError("Cannot save untrained model")
        
        path = path or settings.ml_model_path
        path.parent.mkdir(parents=True, exist_ok=True)
        
        model_data = {
            "model": self.model,
            "scaler": self.scaler,
            "feature_names": self.feature_names,
            "contamination": self.contamination,
            "n_estimators": self.n_estimators,
            "random_state": self.random_state,
            "is_trained": self.is_trained,
            "trained_at": self.trained_at,
            "training_dataset_id": self.training_dataset_id,
            "version": self.version,
        }
        
        joblib.dump(model_data, path)
        logger.info(f"Model saved to {path}")
        
        return path
    
    def load(self, path: Path = None) -> bool:
        path = path or settings.ml_model_path
        
        if not path.exists():
            logger.warning(f"Model file not found at {path}")
            return False
        
        try:
            model_data = joblib.load(path)
            
            self.model = model_data["model"]
            self.scaler = model_data["scaler"]
            self.feature_names = model_data["feature_names"]
            self.contamination = model_data["contamination"]
            self.n_estimators = model_data["n_estimators"]
            self.random_state = model_data["random_state"]
            self.is_trained = model_data["is_trained"]
            self.trained_at = model_data.get("trained_at")
            self.training_dataset_id = model_data.get("training_dataset_id")
            self.version = model_data.get("version", "1.0.0")
            
            self.pipeline = Pipeline([
                ("scaler", self.scaler),
                ("model", self.model),
            ])
            
            logger.info(f"Model loaded from {path} (trained: {self.trained_at})")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_type": "IsolationForest",
            "trained": self.is_trained,
            "training_timestamp": self.trained_at.isoformat() if self.trained_at else None,
            "feature_count": len(self.feature_names),
            "feature_names": self.feature_names,
            "dataset_used": self.training_dataset_id,
            "model_version": self.version,
            "parameters": {
                "contamination": self.contamination,
                "n_estimators": self.n_estimators,
                "random_state": self.random_state,
            },
        }


anomaly_detector = AnomalyDetector()