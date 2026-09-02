from typing import Dict, Any, Optional
from pathlib import Path
import joblib
import logging
from datetime import datetime

from app.ml.anomaly_detector import AnomalyDetector, anomaly_detector
from app.core.config import settings
from app.db.repository import MLModelRepository
from app.db.database import get_db_session

logger = logging.getLogger(__name__)


class ModelRegistry:
    def __init__(self):
        self.active_detector = anomaly_detector
    
    def save_model(self, detector: AnomalyDetector, path: Path = None) -> Path:
        return detector.save(path)
    
    def load_model(self, detector: AnomalyDetector = None, path: Path = None) -> AnomalyDetector:
        detector = detector or AnomalyDetector()
        if detector.load(path):
            self.active_detector = detector
        return detector
    
    def register_model(
        self,
        detector: AnomalyDetector,
        dataset_id: str,
        metrics: Dict[str, Any],
    ) -> Dict[str, Any]:
        with get_db_session() as db:
            repo = MLModelRepository(db)
            model_info = detector.get_model_info()
            
            model = repo.create(
                model_type=model_info["model_type"],
                version=model_info["model_version"],
                dataset_id=dataset_id,
                feature_count=model_info["feature_count"],
                parameters=model_info["parameters"],
                metrics=metrics,
            )
            
            return {
                "model_id": model.id,
                "model_type": model.model_type,
                "version": model.version,
                "trained_at": model.trained_at.isoformat(),
                "feature_count": model.feature_count,
                "metrics": model.metrics,
            }
    
    def get_active_model_info(self) -> Dict[str, Any]:
        return self.active_detector.get_model_info()
    
    def list_models(self) -> list:
        with get_db_session() as db:
            repo = MLModelRepository(db)
            models = repo.list_all()
            return [
                {
                    "id": m.id,
                    "model_type": m.model_type,
                    "version": m.version,
                    "trained_at": m.trained_at.isoformat(),
                    "dataset_id": m.dataset_id,
                    "feature_count": m.feature_count,
                    "metrics": m.metrics,
                    "is_active": bool(m.is_active),
                }
                for m in models
            ]


model_registry = ModelRegistry()