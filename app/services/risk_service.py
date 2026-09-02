from typing import Dict, List, Any, Optional
import numpy as np
import logging

from app.models.schemas import Wallet, RiskLevel, AlertReason
from app.core.config import settings
from app.ml.anomaly_detector import anomaly_detector

logger = logging.getLogger(__name__)


class RiskScoringService:
    def __init__(self):
        self.weights = {
            "ml_anomaly": settings.risk_ml_anomaly_weight,
            "graph": settings.risk_graph_weight,
            "temporal": settings.risk_temporal_weight,
            "network": settings.risk_network_weight,
            "behavior": settings.risk_behavior_weight,
        }
        
        self.thresholds = {
            "low": settings.risk_low_threshold,
            "medium": settings.risk_medium_threshold,
            "high": settings.risk_high_threshold,
        }
    
    def compute_risk_score(
        self,
        wallet: Wallet,
        ml_anomaly_score: float = 0.0,
        graph_anomaly_score: float = 0.0,
        temporal_anomaly_score: float = 0.0,
        network_correlation_score: float = 0.0,
        behavioral_score: float = 0.0,
    ) -> float:
        components = {
            "ml_anomaly": self._normalize_score(ml_anomaly_score),
            "graph": self._normalize_score(graph_anomaly_score),
            "temporal": self._normalize_score(temporal_anomaly_score),
            "network": self._normalize_score(network_correlation_score),
            "behavior": self._normalize_score(behavioral_score),
        }
        
        risk_score = sum(
            components[key] * self.weights[key]
            for key in self.weights
        )
        
        return min(max(risk_score, 0.0), 1.0)
    
    def _normalize_score(self, score: float) -> float:
        return min(max(score, 0.0), 1.0)
    
    def get_risk_level(self, risk_score: float) -> RiskLevel:
        if risk_score >= self.thresholds["high"]:
            return RiskLevel.CRITICAL
        elif risk_score >= self.thresholds["medium"]:
            return RiskLevel.HIGH
        elif risk_score >= self.thresholds["low"]:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def compute_ml_anomaly_score(self, wallet_features: Dict[str, Any]) -> float:
        if not anomaly_detector.is_trained:
            return 0.0
        
        try:
            feature_names = anomaly_detector.feature_names
            if not feature_names:
                return 0.0
            
            x = np.array([[wallet_features.get(fn, 0.0) for fn in feature_names]])
            x = np.nan_to_num(x, nan=0.0, posinf=0.0, neginf=0.0)
            
            _, raw_score = anomaly_detector.predict_single(x[0])
            normalized = anomaly_detector.normalize_anomaly_score(raw_score)
            
            return normalized
        except Exception as e:
            logger.warning(f"ML anomaly scoring failed: {e}")
            return 0.0
    
    def compute_graph_anomaly_score(self, wallet: Wallet) -> float:
        graph_features = [
            wallet.features.pagerank,
            wallet.features.betweenness_centrality,
            wallet.features.closeness_centrality,
            wallet.features.clustering_coefficient,
            wallet.features.degree / 100.0,
        ]
        
        valid_features = [f for f in graph_features if f > 0]
        if not valid_features:
            return 0.0
        
        return min(np.mean(valid_features) * 2, 1.0)
    
    def compute_temporal_anomaly_score(self, wallet: Wallet) -> float:
        signals = []
        
        if wallet.features.burst_score > 0.5:
            signals.append(wallet.features.burst_score)
        
        if wallet.features.transaction_velocity > 10:
            signals.append(min(wallet.features.transaction_velocity / 50, 1.0))
        
        if wallet.features.dormant_to_active_score > 0.5:
            signals.append(wallet.features.dormant_to_active_score)
        
        return np.mean(signals) if signals else 0.0
    
    def compute_network_correlation_score(self, wallet: Wallet) -> float:
        signals = []
        
        if wallet.features.unique_ips > 5:
            signals.append(min(wallet.features.unique_ips / 20, 1.0))
        
        if wallet.features.ip_change_rate > 0.5:
            signals.append(wallet.features.ip_change_rate)
        
        if wallet.features.unique_asns > 3:
            signals.append(min(wallet.features.unique_asns / 10, 1.0))
        
        if wallet.features.unique_countries > 2:
            signals.append(min(wallet.features.unique_countries / 10, 1.0))
        
        if wallet.features.network_observation_count > 10:
            signals.append(min(wallet.features.network_observation_count / 50, 1.0))
        
        return np.mean(signals) if signals else 0.0
    
    def compute_behavioral_score(self, wallet: Wallet) -> float:
        signals = []
        
        if wallet.features.fan_out > 10:
            signals.append(min(wallet.features.fan_out / 50, 1.0))
        
        if wallet.features.fan_in > 10:
            signals.append(min(wallet.features.fan_in / 50, 1.0))
        
        if wallet.features.unique_counterparties > 20:
            signals.append(min(wallet.features.unique_counterparties / 100, 1.0))
        
        if wallet.features.dispersion_score > 0.5:
            signals.append(wallet.features.dispersion_score)
        
        if wallet.features.consolidation_score > 0.8:
            signals.append(wallet.features.consolidation_score)
        
        return np.mean(signals) if signals else 0.0
    
    def generate_explanations(
        self,
        wallet: Wallet,
        ml_anomaly_score: float,
        graph_anomaly_score: float,
        temporal_anomaly_score: float,
        network_correlation_score: float,
        behavioral_score: float,
    ) -> List[AlertReason]:
        reasons = []
        
        components = {
            "ml_anomaly": (ml_anomaly_score, "model_derived"),
            "graph": (graph_anomaly_score, "model_derived"),
            "temporal": (temporal_anomaly_score, "heuristic"),
            "network": (network_correlation_score, "correlation"),
            "behavior": (behavioral_score, "observed"),
        }
        
        for name, (score, evidence_type) in components.items():
            normalized = self._normalize_score(score)
            contribution = normalized * self.weights.get(name, 0)
            
            if contribution > 0.02:
                reason = self._create_reason(name, wallet, normalized, contribution, evidence_type)
                if reason:
                    reasons.append(reason)
        
        reasons.sort(key=lambda r: r.contribution, reverse=True)
        return reasons
    
    def _create_reason(
        self,
        name: str,
        wallet: Wallet,
        score: float,
        contribution: float,
        evidence_type: str,
    ) -> Optional[AlertReason]:
        descriptions = {
            "ml_anomaly": f"ML model detected anomalous behavior pattern (score: {score:.2f})",
            "graph": f"Unusual graph connectivity: PageRank={wallet.features.pagerank:.3f}, "
                     f"Betweenness={wallet.features.betweenness_centrality:.3f}",
            "temporal": self._temporal_description(wallet),
            "network": self._network_description(wallet),
            "behavior": self._behavior_description(wallet),
        }
        
        desc = descriptions.get(name, f"{name} anomaly detected")
        
        return AlertReason(
            signal=name,
            description=desc,
            contribution=contribution,
            evidence_type=evidence_type,
        )
    
    def _temporal_description(self, wallet: Wallet) -> str:
        parts = []
        if wallet.features.burst_score > 0.3:
            parts.append(f"Burst score: {wallet.features.burst_score:.2f}")
        if wallet.features.transaction_velocity > 5:
            parts.append(f"High velocity: {wallet.features.transaction_velocity:.1f} tx/hr")
        if wallet.features.dormant_to_active_score > 0.3:
            parts.append(f"Dormant-to-active pattern: {wallet.features.dormant_to_active_score:.2f}")
        return "; ".join(parts) if parts else "Normal temporal pattern"
    
    def _network_description(self, wallet: Wallet) -> str:
        parts = []
        if wallet.features.unique_ips > 3:
            parts.append(f"Multiple IPs: {wallet.features.unique_ips}")
        if wallet.features.ip_change_rate > 0.3:
            parts.append(f"High IP change rate: {wallet.features.ip_change_rate:.2f}")
        if wallet.features.unique_asns > 2:
            parts.append(f"Multiple ASNs: {wallet.features.unique_asns}")
        if wallet.features.unique_countries > 1:
            parts.append(f"Multiple countries: {wallet.features.unique_countries}")
        return "; ".join(parts) if parts else "Normal network pattern"
    
    def _behavior_description(self, wallet: Wallet) -> str:
        parts = []
        if wallet.features.fan_out > 5:
            parts.append(f"High fan-out: {wallet.features.fan_out} outputs")
        if wallet.features.fan_in > 5:
            parts.append(f"High fan-in: {wallet.features.fan_in} inputs")
        if wallet.features.unique_counterparties > 10:
            parts.append(f"Many counterparties: {wallet.features.unique_counterparties}")
        if wallet.features.dispersion_score > 0.5:
            parts.append(f"Dispersion: {wallet.features.dispersion_score:.2f}")
        if wallet.features.consolidation_score > 0.7:
            parts.append(f"Consolidation: {wallet.features.consolidation_score:.2f}")
        return "; ".join(parts) if parts else "Normal behavioral pattern"
    
    def rank_entities(
        self,
        wallets: Dict[str, Wallet],
    ) -> List[Tuple[str, float, RiskLevel]]:
        ranked = []
        
        for addr, wallet in wallets.items():
            # Handle both Pydantic models and plain objects/dicts
            if hasattr(wallet.features, 'model_dump'):
                features_dict = wallet.features.model_dump()
            elif isinstance(wallet.features, dict):
                features_dict = wallet.features
            else:
                # Convert object to dict
                features_dict = {k: v for k, v in wallet.features.__dict__.items() if not k.startswith('_')}
            
            ml_score = self.compute_ml_anomaly_score(features_dict)
            graph_score = self.compute_graph_anomaly_score(wallet)
            temporal_score = self.compute_temporal_anomaly_score(wallet)
            network_score = self.compute_network_correlation_score(wallet)
            behavior_score = self.compute_behavioral_score(wallet)
            
            risk_score = self.compute_risk_score(
                wallet, ml_score, graph_score, temporal_score, network_score, behavior_score
            )
            risk_level = self.get_risk_level(risk_score)
            
            ranked.append((addr, risk_score, risk_level))
        
        ranked.sort(key=lambda x: x[1], reverse=True)
        return ranked


risk_scoring_service = RiskScoringService()