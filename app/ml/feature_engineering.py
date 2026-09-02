import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from app.services.feature_service import feature_engineering_service
from app.graph.builder import graph_builder
from app.graph.analytics import graph_analytics
from app.models.schemas import NormalizedTransaction, WalletFeatures

logger = logging.getLogger(__name__)


class MLFeatureEngineer:
    def __init__(self):
        self.feature_service = feature_engineering_service
        self.graph_builder = graph_builder
        self.graph_analytics = graph_analytics
    
    def build_complete_features(
        self,
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]] = None,
    ) -> Dict[str, WalletFeatures]:
        wallet_features = self.feature_service.compute_wallet_features(
            transactions, network_observations
        )
        
        self.graph_builder.build_graph(transactions, wallet_features)
        
        graph_features = self.graph_analytics.compute_wallet_graph_features()
        
        for wallet_id, gf in graph_features.items():
            address = wallet_id.replace("wallet_", "")
            if address in wallet_features:
                wf = wallet_features[address]
                wf.pagerank = gf.get("pagerank", 0.0)
                wf.betweenness_centrality = gf.get("betweenness_centrality", 0.0)
                wf.closeness_centrality = gf.get("closeness_centrality", 0.0)
                wf.clustering_coefficient = gf.get("clustering_coefficient", 0.0)
                wf.degree = gf.get("degree", 0)
                wf.weighted_degree = gf.get("weighted_degree", 0.0)
                wf.in_degree = gf.get("in_degree", 0)
                wf.out_degree = gf.get("out_degree", 0)
        
        return wallet_features
    
    def extract_feature_matrix(
        self, wallet_features: Dict[str, WalletFeatures]
    ) -> tuple[np.ndarray, List[str], List[str]]:
        return self.feature_service.build_feature_matrix(wallet_features)
    
    def normalize_matrix(self, matrix: np.ndarray) -> np.ndarray:
        return self.feature_service.normalize_features(matrix)
    
    def get_feature_importance_mapping(self) -> Dict[str, str]:
        return {
            "transaction_count": "Transaction Features",
            "total_input_amount": "Transaction Features",
            "total_output_amount": "Transaction Features",
            "average_amount": "Transaction Features",
            "median_amount": "Transaction Features",
            "amount_std": "Transaction Features",
            "total_fees": "Transaction Features",
            "transaction_velocity": "Behavioral Features",
            "active_duration": "Behavioral Features",
            "transactions_per_hour": "Behavioral Features",
            "transactions_per_day": "Behavioral Features",
            "burst_score": "Behavioral Features",
            "dormant_to_active_score": "Behavioral Features",
            "fan_in": "Flow Features",
            "fan_out": "Flow Features",
            "unique_counterparties": "Flow Features",
            "consolidation_score": "Flow Features",
            "dispersion_score": "Flow Features",
            "degree": "Graph Features",
            "weighted_degree": "Graph Features",
            "in_degree": "Graph Features",
            "out_degree": "Graph Features",
            "betweenness_centrality": "Graph Features",
            "closeness_centrality": "Graph Features",
            "pagerank": "Graph Features",
            "clustering_coefficient": "Graph Features",
            "unique_ips": "Network Features",
            "unique_asns": "Network Features",
            "unique_countries": "Network Features",
            "ip_change_rate": "Network Features",
            "network_observation_count": "Network Features",
        }


ml_feature_engineer = MLFeatureEngineer()