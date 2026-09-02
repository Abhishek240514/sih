import pytest
import numpy as np
import tempfile
from pathlib import Path
from app.ml.anomaly_detector import AnomalyDetector
from app.ml.clustering import EntityClusterer, cluster_wallets_by_behavior
from app.ml.feature_engineering import MLFeatureEngineer
from app.models.schemas import NormalizedTransaction
from datetime import datetime


class TestAnomalyDetector:
    def setup_method(self):
        np.random.seed(42)
        self.X = np.random.randn(100, 10)
        self.feature_names = [f"feature_{i}" for i in range(10)]
    
    def test_train(self):
        detector = AnomalyDetector(contamination=0.1, n_estimators=10, random_state=42)
        metrics = detector.train(self.X, self.feature_names, "test_dataset")
        
        assert detector.is_trained is True
        assert metrics["n_samples"] == 100
        assert metrics["n_features"] == 10
        assert "anomaly_ratio" in metrics
    
    def test_predict(self):
        detector = AnomalyDetector(contamination=0.1, n_estimators=10, random_state=42)
        detector.train(self.X, self.feature_names)
        
        predictions, scores = detector.predict(self.X)
        
        assert len(predictions) == 100
        assert len(scores) == 100
        assert set(predictions).issubset({-1, 1})
    
    def test_predict_single(self):
        detector = AnomalyDetector(contamination=0.1, n_estimators=10, random_state=42)
        detector.train(self.X, self.feature_names)
        
        pred, score = detector.predict_single(self.X[0])
        
        assert pred in {-1, 1}
        assert isinstance(score, float)
    
    def test_normalize_anomaly_score(self):
        detector = AnomalyDetector()
        
        assert 0 <= detector.normalize_anomaly_score(0) <= 1
        assert 0 <= detector.normalize_anomaly_score(10) <= 1
        assert 0 <= detector.normalize_anomaly_score(-10) <= 1
        
        assert detector.normalize_anomaly_score(-10) > detector.normalize_anomaly_score(10)
    
    def test_save_load(self):
        detector = AnomalyDetector(contamination=0.1, n_estimators=10, random_state=42)
        detector.train(self.X, self.feature_names)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "model.joblib"
            detector.save(path)
            
            new_detector = AnomalyDetector()
            loaded = new_detector.load(path)
            
            assert loaded is True
            assert new_detector.is_trained is True
            assert new_detector.feature_names == detector.feature_names
            assert new_detector.contamination == detector.contamination
    
    def test_get_model_info(self):
        detector = AnomalyDetector(contamination=0.1, n_estimators=10, random_state=42)
        detector.train(self.X, self.feature_names, "test_dataset")
        
        info = detector.get_model_info()
        
        assert info["model_type"] == "IsolationForest"
        assert info["trained"] is True
        assert info["feature_count"] == 10
        assert info["dataset_used"] == "test_dataset"
        assert info["parameters"]["contamination"] == 0.1
    
    def test_untrained_predict_raises(self):
        detector = AnomalyDetector()
        
        with pytest.raises(RuntimeError):
            detector.predict(self.X)


class TestClustering:
    def setup_method(self):
        np.random.seed(42)
        self.X = np.random.randn(50, 5)
    
    def test_dbscan(self):
        clusterer = EntityClusterer(random_state=42)
        result = clusterer.fit_dbscan(self.X, eps=1.0, min_samples=3)
        
        assert "n_clusters" in result
        assert "labels" in result
        assert len(result["labels"]) == 50
    
    def test_kmeans(self):
        clusterer = EntityClusterer(random_state=42)
        result = clusterer.fit_kmeans(self.X, n_clusters=5)
        
        assert result["n_clusters"] == 5
        assert len(result["labels"]) == 50
        assert result["inertia"] >= 0
    
    def test_predict(self):
        clusterer = EntityClusterer(random_state=42)
        clusterer.fit_kmeans(self.X, n_clusters=3)
        
        preds = clusterer.predict(self.X[:10])
        
        assert len(preds) == 10
        assert all(0 <= p < 3 for p in preds)
    
    def test_cluster_wallets_by_behavior(self):
        features = {
            f"wallet_{i}": {f"feature_{j}": np.random.rand() for j in range(5)}
            for i in range(20)
        }
        
        labels = cluster_wallets_by_behavior(features, method="kmeans", n_clusters=3)
        
        assert len(labels) == 20
        assert all(v in {0, 1, 2} for v in labels.values())


class TestMLFeatureEngineer:
    def setup_method(self):
        self.transactions = [
            NormalizedTransaction(
                txid="tx1",
                timestamp=datetime(2024, 1, 15, 10, 0, 0),
                inputs=["wallet_a"],
                outputs=["wallet_b"],
                input_amounts=[1.0],
                output_amounts=[0.99],
                fee=0.01,
                source_ips=["192.168.1.1"],
                destination_ips=["10.0.0.1"],
                source_ports=[54321],
                destination_ports=[8333],
                geo_country="US",
                asn="AS15169",
                input_amount=1.0,
                output_amount=0.99,
            ),
        ]
    
    def test_get_feature_importance_mapping(self):
        engineer = MLFeatureEngineer()
        mapping = engineer.get_feature_importance_mapping()
        
        assert "transaction_count" in mapping
        assert "pagerank" in mapping
        assert mapping["pagerank"] == "Graph Features"
        assert mapping["fan_out"] == "Flow Features"