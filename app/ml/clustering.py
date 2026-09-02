import numpy as np
from typing import Dict, List, Any, Optional
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EntityClusterer:
    def __init__(self, random_state: int = None):
        self.random_state = random_state or settings.ml_random_seed
        self.clusterer = None
        self.scaler = StandardScaler()
        self.is_fitted = False
    
    def fit_dbscan(
        self,
        X: np.ndarray,
        eps: float = 0.5,
        min_samples: int = 5,
    ) -> Dict[str, Any]:
        if X.size == 0:
            raise ValueError("Training data is empty")
        
        X_scaled = self.scaler.fit_transform(X)
        
        self.clusterer = DBSCAN(
            eps=eps,
            min_samples=min_samples,
            metric="euclidean",
            n_jobs=-1,
        )
        
        labels = self.clusterer.fit_predict(X_scaled)
        self.is_fitted = True
        
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = np.sum(labels == -1)
        
        return {
            "n_clusters": n_clusters,
            "n_noise": int(n_noise),
            "labels": labels.tolist(),
            "cluster_sizes": {
                int(k): int(v) for k, v in zip(*np.unique(labels[labels != -1], return_counts=True))
            } if n_clusters > 0 else {},
        }
    
    def fit_kmeans(
        self,
        X: np.ndarray,
        n_clusters: int = 10,
    ) -> Dict[str, Any]:
        if X.size == 0:
            raise ValueError("Training data is empty")
        
        n_clusters = min(n_clusters, len(X))
        
        X_scaled = self.scaler.fit_transform(X)
        
        self.clusterer = KMeans(
            n_clusters=n_clusters,
            random_state=self.random_state,
            n_init=10,
        )
        
        labels = self.clusterer.fit_predict(X_scaled)
        self.is_fitted = True
        
        cluster_sizes = {}
        for k, v in zip(*np.unique(labels, return_counts=True)):
            cluster_sizes[int(k)] = int(v)
        
        return {
            "n_clusters": n_clusters,
            "labels": labels.tolist(),
            "cluster_sizes": cluster_sizes,
            "inertia": float(self.clusterer.inertia_),
        }
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted or self.clusterer is None:
            raise RuntimeError("Clusterer not fitted")
        
        X_scaled = self.scaler.transform(X)
        return self.clusterer.predict(X_scaled)
    
    def get_cluster_centers(self) -> Optional[np.ndarray]:
        if self.clusterer is not None and hasattr(self.clusterer, "cluster_centers_"):
            return self.clusterer.cluster_centers_
        return None


def cluster_wallets_by_behavior(
    features: Dict[str, Dict[str, float]],
    method: str = "dbscan",
    **kwargs,
) -> Dict[str, int]:
    if not features:
        return {}
    
    wallet_ids = list(features.keys())
    feature_names = list(next(iter(features.values())).keys())
    
    X = np.array([[features[w].get(fn, 0.0) for fn in feature_names] for w in wallet_ids])
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
    
    clusterer = EntityClusterer(random_state=settings.ml_random_seed)
    
    if method == "dbscan":
        result = clusterer.fit_dbscan(X, **kwargs)
    elif method == "kmeans":
        result = clusterer.fit_kmeans(X, **kwargs)
    else:
        raise ValueError(f"Unknown clustering method: {method}")
    
    labels = result["labels"]
    return {wallet_ids[i]: int(labels[i]) for i in range(len(wallet_ids))}


def compute_cluster_risk_scores(
    cluster_labels: Dict[str, int],
    wallet_risk_scores: Dict[str, float],
) -> Dict[int, float]:
    cluster_risks = {}
    
    for wallet_id, cluster_id in cluster_labels.items():
        if cluster_id == -1:
            continue
        risk = wallet_risk_scores.get(wallet_id, 0.0)
        if cluster_id not in cluster_risks:
            cluster_risks[cluster_id] = []
        cluster_risks[cluster_id].append(risk)
    
    result = {}
    for cluster_id, risks in cluster_risks.items():
        if risks:
            avg_risk = np.mean(risks)
            max_risk = np.max(risks)
            result[cluster_id] = 0.7 * avg_risk + 0.3 * max_risk
    
    return result