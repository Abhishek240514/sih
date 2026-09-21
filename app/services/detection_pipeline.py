"""
Shared Detection Pipeline
=========================
Single unified pipeline for all ingestion paths:
- API upload
- Background processing
- Auto-ingestion
- Generated CSV path
- Startup/default dataset
- CLI/import path

Flow:
Raw Records
    ↓
Normalization
    ↓
Feature Engineering
    ↓
Structural Detection (heuristics)
    ↓
ML Anomaly Detection (Isolation Forest)
    ↓
Cross-Layer Correlation
    ↓
Graph Analytics
    ↓
Risk Scoring
    ↓
Risk Propagation
    ↓
Alert Generation (with evidence)
"""

from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime
import logging
import uuid
import numpy as np

from app.models.schemas import (
    NormalizedTransaction, WalletFeatures, Wallet, Alert, AlertReason,
    CorrelationEvidence, RiskLevel, NetworkObservation
)
from app.services.feature_service import feature_engineering_service
from app.services.risk_service import risk_scoring_service
from app.services.structural_detection import structural_detector, StructuralSignal
from app.services.correlation_service import correlation_service
from app.services.geoip_service import geoip_service, classify_ip_type
from app.ml.anomaly_detector import anomaly_detector
from app.ml.clustering import cluster_wallets_by_behavior, compute_cluster_risk_scores
from app.graph.builder import graph_builder
from app.graph.analytics import graph_analytics
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class DetectionResult:
    """Result of running the detection pipeline on a dataset."""
    dataset_id: str
    wallets: Dict[str, Wallet] = field(default_factory=dict)
    alerts: List[Alert] = field(default_factory=list)
    correlations: List[CorrelationEvidence] = field(default_factory=list)
    structural_signals: List[StructuralSignal] = field(default_factory=list)
    cluster_labels: Dict[str, int] = field(default_factory=dict)
    cluster_risks: Dict[int, float] = field(default_factory=dict)
    risk_propagation: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    ml_model_trained: bool = False
    ml_training_metrics: Dict[str, Any] = field(default_factory=dict)
    processing_stats: Dict[str, Any] = field(default_factory=dict)


class DetectionPipeline:
    """
    Unified detection pipeline for all ingestion paths.
    
    This is the SINGLE entry point for detection logic.
    All ingestion paths MUST call this pipeline.
    """
    
    def __init__(self):
        self.feature_service = feature_engineering_service
        self.risk_service = risk_scoring_service
        self.structural_detector = structural_detector
        self.correlation_service = correlation_service
        self.geoip_service = geoip_service
        self.anomaly_detector = anomaly_detector
        self.graph_builder = graph_builder
        self.graph_analytics = graph_analytics
    
    def run(
        self,
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]] = None,
        dataset_id: str = None,
        auto_train_ml: bool = True,
    ) -> DetectionResult:
        """
        Run the complete detection pipeline.
        
        Args:
            transactions: Normalized blockchain transactions
            network_observations: Network layer observations (IP, timestamp, etc.)
            dataset_id: Optional dataset identifier
            auto_train_ml: Whether to train/load ML model automatically
            
        Returns:
            DetectionResult with all detection outputs
        """
        dataset_id = dataset_id or str(uuid.uuid4())
        network_observations = network_observations or []
        
        logger.info(f"Starting detection pipeline for dataset {dataset_id}")
        logger.info(f"Transactions: {len(transactions)}, Network obs: {len(network_observations)}")
        
        result = DetectionResult(dataset_id=dataset_id)
        
        # Step 1: Feature Engineering
        logger.info("Step 1: Feature Engineering")
        wallet_features = self.feature_service.compute_wallet_features(
            transactions, network_observations
        )
        result.processing_stats["wallets_with_features"] = len(wallet_features)
        
        # Step 2: Structural Detection (heuristics)
        logger.info("Step 2: Structural Detection")
        peeling_signals = self.structural_detector.detect_peeling_chain(transactions, wallet_features)
        mixing_signals = self.structural_detector.detect_mixing_like(transactions, wallet_features)
        self.structural_signals = peeling_signals + mixing_signals
        result.structural_signals = self.structural_signals
        logger.info(f"  Peeling chains: {len(peeling_signals)}, Mixing-like: {len(mixing_signals)}")
        
        # Step 3: Build Graph
        logger.info("Step 3: Building Graph")
        self.graph_builder.build_graph(transactions, wallet_features)
        
        # Step 4: Graph Analytics
        logger.info("Step 4: Graph Analytics")
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
        
        # Step 5: Cross-Layer Correlation
        logger.info("Step 5: Cross-Layer Correlation")
        result.correlations = self.correlation_service.correlate_ip_transaction(
            transactions, network_observations
        )
        logger.info(f"  Correlations found: {len(result.correlations)}")
        
        # Step 6: Clustering
        logger.info("Step 6: Clustering")
        features_dict = {addr: wf.model_dump() for addr, wf in wallet_features.items()}
        # Ensure no NaN/inf values in features before clustering
        for addr, feats in features_dict.items():
            for k, v in feats.items():
                if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                    feats[k] = 0.0
        result.cluster_labels = cluster_wallets_by_behavior(features_dict, method="dbscan")
        
        # Step 7: ML Anomaly Detection
        logger.info("Step 7: ML Anomaly Detection")
        if auto_train_ml:
            result.ml_model_trained, result.ml_training_metrics = self._ensure_ml_model(wallet_features)
        
        # Step 8: Build Wallet Objects with Risk Scores
        logger.info("Step 8: Risk Scoring")
        result.wallets = self._build_wallet_objects(
            wallet_features, result.cluster_labels, transactions, network_observations
        )
        
        # Step 9: Risk Propagation
        logger.info("Step 9: Risk Propagation")
        result.risk_propagation = self._propagate_risk(result.wallets, transactions)
        
        # Step 10: Generate Alerts
        logger.info("Step 10: Alert Generation")
        result.alerts = self._generate_alerts(
            result.wallets, transactions, network_observations, result.correlations,
            result.structural_signals, result.risk_propagation
        )
        
        logger.info(f"Pipeline complete: {len(result.wallets)} wallets, {len(result.alerts)} alerts")
        result.processing_stats["total_alerts"] = len(result.alerts)
        result.processing_stats["high_risk_wallets"] = sum(
            1 for w in result.wallets.values() if w.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)
        )
        
        return result
    
    def _ensure_ml_model(self, wallet_features: Dict[str, WalletFeatures]) -> Tuple[bool, Dict[str, Any]]:
        """Ensure ML model is trained and ready for inference."""
        if self.anomaly_detector.is_trained:
            logger.info("ML model already trained, loading...")
            loaded = self.anomaly_detector.load()
            if loaded:
                return True, {"loaded_existing": True}
        
        # Train new model
        logger.info("Training new ML model...")
        matrix, wallet_ids, feature_names = self.feature_service.build_feature_matrix(wallet_features)
        
        if matrix.size == 0:
            logger.warning("Empty feature matrix, skipping ML training")
            return False, {"error": "empty_feature_matrix"}
        
        # Normalize features
        matrix = self.feature_service.normalize_features(matrix)
        
        # Train
        try:
            metrics = self.anomaly_detector.train(matrix, feature_names, "auto_trained")
            self.anomaly_detector.save()
            logger.info("ML model trained and saved successfully")
            return True, metrics
        except Exception as e:
            logger.error(f"ML training failed: {e}")
            return False, {"error": str(e)}
    
    def _build_wallet_objects(
        self,
        wallet_features: Dict[str, WalletFeatures],
        cluster_labels: Dict[str, int],
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]],
    ) -> Dict[str, Wallet]:
        """Build Wallet objects with computed risk scores."""
        wallets = {}
        
        # Compute cluster risk scores
        cluster_risks = compute_cluster_risk_scores(cluster_labels, {})
        
        for addr, features in wallet_features.items():
            # Convert features to dict for risk scoring
            features_dict = features.model_dump()
            
            # Compute all risk components
            ml_score = self.risk_service.compute_ml_anomaly_score(features_dict)
            
            # Create temporary wallet for graph/temporal/network/behavioral scoring
            temp_wallet = Wallet(
                address=addr,
                transaction_count=features.transaction_count,
                total_in=features.total_input_amount,
                total_out=features.total_output_amount,
                average_transaction_value=(features.total_input_amount + features.total_output_amount) / max(features.transaction_count, 1),
                unique_counterparties=features.unique_counterparties,
                fan_in=features.fan_in,
                fan_out=features.fan_out,
                first_seen=None,
                last_seen=None,
                risk_score=0.0,
                risk_level=RiskLevel.LOW,
                community_id=cluster_labels.get(addr),
                features=features,
            )
            
            graph_score = self.risk_service.compute_graph_anomaly_score(temp_wallet)
            temporal_score = self.risk_service.compute_temporal_anomaly_score(temp_wallet)
            network_score = self.risk_service.compute_network_correlation_score(temp_wallet)
            behavioral_score = self.risk_service.compute_behavioral_score(temp_wallet)
            
            # Add structural detection scores
            structural_score = self._compute_structural_score(addr, temp_wallet)
            
            # Compute final risk score
            risk_score = self.risk_service.compute_risk_score(
                temp_wallet, ml_score, graph_score, temporal_score, network_score, behavioral_score
            )
            
            # Boost by structural detection if present
            if structural_score > 0:
                risk_score = min(1.0, risk_score + structural_score * 0.2)
            
            # Add cluster risk boost
            cluster_id = cluster_labels.get(addr)
            if cluster_id is not None and cluster_id != -1:
                cluster_risk = cluster_risks.get(cluster_id, 0)
                if cluster_risk > 0.5:
                    risk_score = min(1.0, risk_score + cluster_risk * 0.15)
            
            risk_level = self.risk_service.get_risk_level(risk_score)
            
            # Build IPs/ASNs/countries from transactions
            wallet_txs = [tx for tx in transactions if addr in tx.inputs or addr in tx.outputs]
            ips = set()
            asns = set()
            countries = set()
            for tx in wallet_txs:
                ips.update(tx.source_ips)
                ips.update(tx.destination_ips)
                if tx.asn:
                    asns.add(tx.asn)
                if tx.geo_country:
                    countries.add(tx.geo_country)
            
            # Also add from network observations
            for obs in network_observations:
                if obs.get("txid") in [tx.txid for tx in wallet_txs]:
                    if obs.get("src_ip"):
                        ips.add(obs["src_ip"])
                    if obs.get("dst_ip"):
                        ips.add(obs["dst_ip"])
                    if obs.get("asn"):
                        asns.add(obs["asn"])
                    if obs.get("geo_country"):
                        countries.add(obs["geo_country"])
            
            wallets[addr] = Wallet(
                address=addr,
                transaction_count=features.transaction_count,
                total_in=round(features.total_input_amount, 8),
                total_out=round(features.total_output_amount, 8),
                average_transaction_value=round((features.total_input_amount + features.total_output_amount) / max(features.transaction_count, 1), 8),
                unique_counterparties=features.unique_counterparties,
                fan_in=features.fan_in,
                fan_out=features.fan_out,
                first_seen=min([tx.timestamp for tx in wallet_txs]) if wallet_txs else None,
                last_seen=max([tx.timestamp for tx in wallet_txs]) if wallet_txs else None,
                risk_score=round(risk_score, 4),
                risk_level=risk_level,
                community_id=cluster_labels.get(addr) if cluster_labels.get(addr) != -1 else None,
                features=features,
            )
        
        return wallets
    
    def _compute_structural_score(self, addr: str, wallet: Wallet) -> float:
        """Compute additional risk score from structural detection signals."""
        # Look up structural signals for this address
        max_score = 0.0
        for signal in self.structural_signals:
            if addr in signal.wallets:
                max_score = max(max_score, signal.score)
        return max_score
    
    def _propagate_risk(
        self,
        wallets: Dict[str, Wallet],
        transactions: List[NormalizedTransaction],
    ) -> Dict[str, Dict[str, Any]]:
        """
        Implement bounded graph risk propagation.
        
        Formula: propagated_risk = source_risk × edge_confidence × decay^depth
        
        Tracks provenance for each propagated risk contribution.
        """
        decay = settings.risk_propagation_decay
        max_depth = settings.risk_propagation_max_depth
        
        # Build adjacency from transactions
        adjacency = {}  # addr -> List[(neighbor_addr, edge_confidence, txid)]
        for tx in transactions:
            for inp in tx.inputs:
                for out in tx.outputs:
                    if inp != out:
                        if inp not in adjacency:
                            adjacency[inp] = []
                        if out not in adjacency:
                            adjacency[out] = []
                        # Edge confidence based on transaction properties
                        conf = 0.8
                        if len(tx.inputs) == 1 and len(tx.outputs) == 2:
                            conf = 0.9  # Likely peel/change
                        adjacency[inp].append((out, conf, tx.txid))
                        adjacency[out].append((inp, conf, tx.txid))
        
        # Get seed risks (only HIGH/CRITICAL wallets)
        seed_risks = {
            addr: wallet.risk_score 
            for addr, wallet in wallets.items() 
            if wallet.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)
        }
        
        if not seed_risks:
            return {}
        
        # BFS propagation from each seed
        propagated = {}
        visited_paths = set()  # For cycle prevention
        
        for seed_addr, seed_risk in seed_risks.items():
            queue = [(seed_addr, 0, seed_risk, [seed_addr])]  # (addr, depth, risk, path)
            visited = {seed_addr: 0}
            
            while queue:
                current_addr, depth, current_risk, path = queue.pop(0)
                
                if depth >= max_depth:
                    continue
                
                if current_addr not in adjacency:
                    continue
                
                for neighbor, edge_conf, txid in adjacency[current_addr]:
                    # Cycle prevention
                    if neighbor in path:
                        continue
                    
                    # Calculate propagated risk
                    propagated_risk = current_risk * edge_conf * (decay ** (depth + 1))
                    
                    # Only propagate if meaningful
                    if propagated_risk < 0.05:
                        continue
                    
                    new_path = path + [neighbor]
                    path_key = tuple(new_path)
                    if path_key in visited_paths:
                        continue
                    visited_paths.add(path_key)
                    
                    # Update neighbor's propagated risk (keep maximum)
                    if neighbor not in propagated or propagated_risk > propagated[neighbor]["total_propagated_risk"]:
                        propagated[neighbor] = {
                            "total_propagated_risk": propagated_risk,
                            "sources": [{
                                "source_wallet": seed_addr,
                                "source_risk": seed_risk,
                                "path": new_path,
                                "depth": depth + 1,
                                "edge_confidence": edge_conf,
                                "decay_factor": decay ** (depth + 1),
                                "contribution": propagated_risk,
                                "via_txid": txid,
                            }]
                        }
                    else:
                        # Add as additional source
                        propagated[neighbor]["sources"].append({
                            "source_wallet": seed_addr,
                            "source_risk": seed_risk,
                            "path": new_path,
                            "depth": depth + 1,
                            "edge_confidence": edge_conf,
                            "decay_factor": decay ** (depth + 1),
                            "contribution": propagated_risk,
                            "via_txid": txid,
                        })
                        propagated[neighbor]["total_propagated_risk"] = max(
                            propagated[neighbor]["total_propagated_risk"],
                            propagated_risk
                        )
                    
                    queue.append((neighbor, depth + 1, propagated_risk, new_path))
        
        return propagated
    
    def _generate_alerts(
        self,
        wallets: Dict[str, Wallet],
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]],
        correlations: List[CorrelationEvidence],
        structural_signals: List[StructuralSignal],
        risk_propagation: Dict[str, Dict[str, Any]],
    ) -> List[Alert]:
        """Generate explainable alerts with real evidence."""
        alerts = []
        
        # Rank wallets by risk
        ranked = self.risk_service.rank_entities(wallets)
        
        # Build lookup maps for structural signals
        peeling_by_wallet = {}
        mixing_by_wallet = {}
        for sig in structural_signals:
            for w in sig.wallets:
                if sig.pattern == "peeling_chain":
                    if w not in peeling_by_wallet:
                        peeling_by_wallet[w] = []
                    peeling_by_wallet[w].append(sig)
                elif sig.pattern == "mixing_like_structure":
                    if w not in mixing_by_wallet:
                        mixing_by_wallet[w] = []
                    mixing_by_wallet[w].append(sig)
        
        # Correlation evidence by wallet
        corr_by_wallet = {}
        for corr in correlations:
            # Find wallets involved in this correlation
            for tx in transactions:
                if tx.txid == corr.txid:
                    for addr in tx.inputs + tx.outputs:
                        if addr not in corr_by_wallet:
                            corr_by_wallet[addr] = []
                        corr_by_wallet[addr].append(corr)
        
        for addr, risk_score, risk_level in ranked:
            if risk_level == RiskLevel.LOW:
                continue  # Only alert on MEDIUM+
            
            wallet = wallets[addr]
            wallet_txs = [tx for tx in transactions if addr in tx.inputs or addr in tx.outputs]
            
            # Get ML explanation
            features_dict = wallet.features.model_dump()
            ml_contributions = {}
            if self.anomaly_detector.is_trained:
                matrix, _, _ = self.feature_service.build_feature_matrix({addr: wallet.features})
                if matrix.size > 0:
                    matrix = self.feature_service.normalize_features(matrix)
                    ml_contributions = self.anomaly_detector.get_feature_contributions(matrix[0])
            
            # Generate reasons using risk service
            ml_score = self.risk_service.compute_ml_anomaly_score(features_dict)
            graph_score = self.risk_service.compute_graph_anomaly_score(wallet)
            temporal_score = self.risk_service.compute_temporal_anomaly_score(wallet)
            network_score = self.risk_service.compute_network_correlation_score(wallet)
            behavioral_score = self.risk_service.compute_behavioral_score(wallet)
            
            reasons = self.risk_service.generate_explanations(
                wallet, ml_score, graph_score, temporal_score, network_score, behavioral_score
            )
            
            # Add structural detection reasons
            if addr in peeling_by_wallet:
                for sig in peeling_by_wallet[addr]:
                    reasons.append(AlertReason(
                        signal="peeling_chain",
                        description=f"Peeling chain detected: {sig.evidence[0] if sig.evidence else 'sequential peel-off pattern'}",
                        contribution=sig.score * 0.3,
                        evidence_type="heuristic",
                    ))
            
            if addr in mixing_by_wallet:
                for sig in mixing_by_wallet[addr]:
                    reasons.append(AlertReason(
                        signal="mixing_like_structure",
                        description=f"Mixing-like structure: {sig.evidence[0] if sig.evidence else 'fan-in/fan-out with uniform outputs'}",
                        contribution=sig.score * 0.3,
                        evidence_type="heuristic",
                    ))
            
            # Add ML feature contributions to reasons
            if ml_contributions:
                sorted_contribs = sorted(ml_contributions.items(), key=lambda x: abs(x[1]), reverse=True)
                for fname, contrib in sorted_contribs[:3]:
                    if abs(contrib) > 0.01:
                        direction = "increases" if contrib > 0 else "decreases"
                        reasons.append(AlertReason(
                            signal=f"ml_feature_{fname}",
                            description=f"Feature '{fname}' {direction} anomaly score (contribution: {contrib:.4f})",
                            contribution=abs(contrib) * 0.1,
                            evidence_type="model_derived",
                        ))
            
            # Add risk propagation evidence
            if addr in risk_propagation:
                prop = risk_propagation[addr]
                for src in prop["sources"][:3]:
                    reasons.append(AlertReason(
                        signal="risk_propagation",
                        description=f"Propagated risk from {src['source_wallet'][:16]}... (depth {src['depth']}, contribution: {src['contribution']:.3f})",
                        contribution=src["contribution"] * 0.5,
                        evidence_type="graph_propagation",
                    ))
            
            # Filter and sort reasons
            reasons = [r for r in reasons if r.contribution > 0.01]
            reasons.sort(key=lambda r: r.contribution, reverse=True)
            
            # Build correlation evidence for this wallet
            wallet_correlations = corr_by_wallet.get(addr, [])
            
            # Build related entities
            related_wallets = set()
            related_ips = set()
            related_asns = set()
            related_countries = set()
            
            for tx in wallet_txs:
                for a in tx.inputs + tx.outputs:
                    if a != addr:
                        related_wallets.add(a)
                related_ips.update(tx.source_ips)
                related_ips.update(tx.destination_ips)
                if tx.asn:
                    related_asns.add(tx.asn)
                if tx.geo_country:
                    related_countries.add(tx.geo_country)
            
            for corr in wallet_correlations:
                related_ips.add(corr.ip)
            
            alert = Alert(
                alert_id=f"alert_{addr}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                entity_id=addr,
                entity_type="wallet",
                risk_score=risk_score,
                risk_level=risk_level,
                timestamp=datetime.utcnow(),
                reasons=reasons,
                related_transactions=[tx.txid for tx in wallet_txs[:50]],
                related_wallets=list(related_wallets)[:50],
                related_ips=list(related_ips)[:50],
                related_asns=list(related_asns),
                related_countries=list(related_countries),
                graph_statistics={
                    "pagerank": wallet.features.pagerank,
                    "degree": wallet.features.degree,
                    "cluster_id": wallet.community_id,
                },
                correlation_evidence=wallet_correlations[:20],
            )
            
            alerts.append(alert)
        
        return alerts


# Global instance
detection_pipeline = DetectionPipeline()