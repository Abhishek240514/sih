from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from app.models.schemas import (
    Alert, AlertReason, CorrelationEvidence, Wallet, NormalizedTransaction,
    RiskLevel, GraphData, GraphNode, GraphEdge
)
from app.services.risk_service import risk_scoring_service
from app.services.correlation_service import correlation_service
from app.graph.builder import graph_builder
from app.graph.analytics import graph_analytics

logger = logging.getLogger(__name__)


class ExplanationService:
    def __init__(self):
        self.risk_service = risk_scoring_service
        self.correlation_service = correlation_service
        self.graph_builder = graph_builder
        self.graph_analytics = graph_analytics
    
    def generate_alert(
        self,
        entity_id: str,
        entity_type: str,
        wallet: Wallet,
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]],
        correlation_evidence: List[CorrelationEvidence],
    ) -> Alert:
        # Handle features dict conversion
        if hasattr(wallet.features, 'model_dump'):
            features_dict = wallet.features.model_dump()
        elif isinstance(wallet.features, dict):
            features_dict = wallet.features
        else:
            features_dict = {k: v for k, v in wallet.features.__dict__.items() if not k.startswith('_')}
        
        ml_score = self.risk_service.compute_ml_anomaly_score(features_dict)
        graph_score = self.risk_service.compute_graph_anomaly_score(wallet)
        temporal_score = self.risk_service.compute_temporal_anomaly_score(wallet)
        network_score = self.risk_service.compute_network_correlation_score(wallet)
        behavior_score = self.risk_service.compute_behavioral_score(wallet)
        
        risk_score = self.risk_service.compute_risk_score(
            wallet, ml_score, graph_score, temporal_score, network_score, behavior_score
        )
        risk_level = self.risk_service.get_risk_level(risk_score)
        
        reasons = self.risk_service.generate_explanations(
            wallet, ml_score, graph_score, temporal_score, network_score, behavior_score
        )
        
        related_txs = [tx.txid for tx in transactions]
        related_wallets = list(set(
            addr for tx in transactions 
            for addr in tx.inputs + tx.outputs
            if addr != entity_id
        ))
        related_ips = list(set(
            ip for tx in transactions 
            for ip in tx.source_ips + tx.destination_ips
        ))
        related_asns = list(set(tx.asn for tx in transactions if tx.asn))
        related_countries = list(set(tx.geo_country for tx in transactions if tx.geo_country))
        
        graph_stats = self._compute_graph_stats(entity_id)
        
        alert = Alert(
            alert_id=f"alert_{entity_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            entity_id=entity_id,
            entity_type=entity_type,
            risk_score=risk_score,
            risk_level=risk_level,
            timestamp=datetime.utcnow(),
            reasons=reasons,
            related_transactions=related_txs[:50],
            related_wallets=related_wallets[:50],
            related_ips=related_ips[:50],
            related_asns=related_asns,
            related_countries=related_countries,
            graph_statistics=graph_stats,
            correlation_evidence=correlation_evidence,
        )
        
        return alert
    
    def _compute_graph_stats(self, entity_id: str) -> Dict[str, Any]:
        wallet_node = f"wallet_{entity_id}"
        if wallet_node not in self.graph_builder.graph:
            return {}
        
        neighbors = set(self.graph_builder.graph.successors(wallet_node)) | \
                    set(self.graph_builder.graph.predecessors(wallet_node))
        
        wallet_neighbors = [n for n in neighbors if n.startswith("wallet_")]
        tx_neighbors = [n for n in neighbors if n.startswith("tx_")]
        ip_neighbors = [n for n in neighbors if n.startswith("ip_")]
        
        return {
            "total_neighbors": len(neighbors),
            "wallet_neighbors": len(wallet_neighbors),
            "transaction_neighbors": len(tx_neighbors),
            "ip_neighbors": len(ip_neighbors),
            "pagerank": self.graph_builder.graph.nodes[wallet_node].get("risk_score", 0.0),
        }
    
    def generate_investigation(
        self,
        entity_id: str,
        entity_type: str,
        wallet: Wallet,
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        from app.models.schemas import WalletFeatures
        
        if isinstance(wallet.features, dict):
            wallet.features = WalletFeatures(**wallet.features)
        
        features_dict = wallet.features.model_dump()
        
        ml_score = self.risk_service.compute_ml_anomaly_score(features_dict)
        graph_score = self.risk_service.compute_graph_anomaly_score(wallet)
        temporal_score = self.risk_service.compute_temporal_anomaly_score(wallet)
        network_score = self.risk_service.compute_network_correlation_score(wallet)
        behavior_score = self.risk_service.compute_behavioral_score(wallet)
        
        risk_score = self.risk_service.compute_risk_score(
            wallet, ml_score, graph_score, temporal_score, network_score, behavior_score
        )
        risk_level = self.risk_service.get_risk_level(risk_score)
        
        reasons = self.risk_service.generate_explanations(
            wallet, ml_score, graph_score, temporal_score, network_score, behavior_score
        )
        
        related_wallets = []
        for tx in transactions:
            for addr in tx.inputs + tx.outputs:
                if addr != entity_id:
                    related_wallets.append(addr)
        related_wallets = list(set(related_wallets))[:20]
        
        correlation_evidence = self.correlation_service.correlate_ip_transaction(
            transactions, network_observations
        )
        entity_correlations = [
            ce for ce in correlation_evidence
            if any(addr in ce.txid for tx in transactions for addr in tx.inputs + tx.outputs)
        ]
        
        graph_neighborhood = self.graph_builder.get_neighborhood(
            f"wallet_{entity_id}", depth=2, max_nodes=100, max_edges=200
        )
        
        timeline = self._build_timeline(entity_id, transactions, network_observations)
        transaction_flow = self.graph_analytics.get_transaction_flow(entity_id, max_hops=3)
        
        return {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "risk_score": risk_score * 100.0,
            "risk_level": risk_level,
            "reasons": [r.model_dump() for r in reasons],
            "related_wallets": related_wallets,
            "related_transactions": [tx.model_dump() for tx in transactions[:20]],
            "related_ips": list(set(ip for tx in transactions for ip in tx.source_ips + tx.destination_ips)),
            "related_asns": list(set(tx.asn for tx in transactions if tx.asn)),
            "countries": list(set(tx.geo_country for tx in transactions if tx.geo_country)),
            "timeline": timeline,
            "graph_neighborhood": graph_neighborhood.model_dump(),
            "transaction_flow": transaction_flow,
            "correlation_evidence": [ce.model_dump() for ce in entity_correlations[:20]],
        }
    
    def _build_timeline(
        self,
        entity_id: str,
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        events = []
        
        for tx in sorted(transactions, key=lambda t: t.timestamp):
            if entity_id in tx.inputs or entity_id in tx.outputs:
                events.append({
                    "timestamp": tx.timestamp.isoformat(),
                    "event_type": "TRANSACTION",
                    "txid": tx.txid,
                    "amount": tx.output_amount if entity_id in tx.outputs else tx.input_amount,
                    "counterparty": (
                        tx.outputs[0] if entity_id in tx.inputs and tx.outputs
                        else tx.inputs[0] if entity_id in tx.outputs and tx.inputs
                        else "unknown"
                    ),
                    "ip": tx.source_ips[0] if tx.source_ips else (tx.destination_ips[0] if tx.destination_ips else None),
                    "country": tx.geo_country,
                })
        
        for obs in network_observations:
            if obs.get("txid"):
                tx = next((t for t in transactions if t.txid == obs["txid"]), None)
                if tx and (entity_id in tx.inputs or entity_id in tx.outputs):
                    ts = obs.get("timestamp")
                    ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts) if ts else ""
                    events.append({
                        "timestamp": ts_str,
                        "event_type": "NETWORK_OBSERVATION",
                        "txid": obs["txid"],
                        "ip": obs.get("src_ip") or obs.get("dst_ip"),
                        "country": obs.get("geo_country"),
                    })
        
        events.sort(key=lambda e: str(e["timestamp"] or ""))
        return events
    
    def generate_all_alerts(
        self,
        wallets: Dict[str, Wallet],
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]],
        top_k: int = 100,
    ) -> List[Alert]:
        ranked = self.risk_service.rank_entities(wallets)
        
        alerts = []
        for addr, risk_score, risk_level in ranked[:top_k]:
            if risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL, RiskLevel.MEDIUM):
                wallet_txs = [tx for tx in transactions 
                             if addr in tx.inputs or addr in tx.outputs]
                
                correlation_evidence = self.correlation_service.correlate_ip_transaction(
                    wallet_txs, network_observations
                )
                
                alert = self.generate_alert(
                    entity_id=addr,
                    entity_type="wallet",
                    wallet=wallets[addr],
                    transactions=wallet_txs,
                    network_observations=network_observations,
                    correlation_evidence=correlation_evidence,
                )
                alerts.append(alert)
        
        return alerts


explanation_service = ExplanationService()