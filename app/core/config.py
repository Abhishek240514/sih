import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "Bitcoin Forensic Intelligence System"
    app_version: str = "1.0.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    
    data_dir: Path = BASE_DIR / "data"
    raw_data_dir: Path = BASE_DIR / "data" / "raw"
    processed_data_dir: Path = BASE_DIR / "data" / "processed"
    models_dir: Path = BASE_DIR / "data" / "models"
    sample_data_dir: Path = BASE_DIR / "data" / "sample"
    
    max_upload_size: int = 1024 * 1024 * 1024  # 1GB limit
    allowed_extensions: set = {".csv", ".json", ".xml"}
    
    ml_model_path: Path = BASE_DIR / "data" / "models" / "anomaly_detector.joblib"
    ml_random_seed: int = 42
    ml_contamination: float = 0.1
    ml_n_estimators: int = 100
    
    graph_max_nodes: int = 10000
    graph_max_edges: int = 50000
    graph_community_min_size: int = 3
    
    risk_ml_anomaly_weight: float = 0.30
    risk_graph_weight: float = 0.20
    risk_temporal_weight: float = 0.20
    risk_network_weight: float = 0.15
    risk_behavior_weight: float = 0.15
    
    risk_low_threshold: float = 0.25
    risk_medium_threshold: float = 0.50
    risk_high_threshold: float = 0.75
    
    correlation_temporal_window_seconds: int = 300
    correlation_min_observations: int = 2
    correlation_score_threshold: float = 0.5
    
    database_url: str = f"sqlite:///{BASE_DIR}/data/forensics.db"
    
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()

for path in [
    settings.raw_data_dir,
    settings.processed_data_dir,
    settings.models_dir,
    settings.sample_data_dir,
]:
    path.mkdir(parents=True, exist_ok=True)