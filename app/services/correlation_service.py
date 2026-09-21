from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import logging

from app.models.schemas import NormalizedTransaction, CorrelationEvidence
from app.core.config import settings

logger = logging.getLogger(__name__)


class CorrelationService:
    def __init__(self):
        self.temporal_window = timedelta(seconds=settings.correlation_temporal_window_seconds)
        self.min_observations = settings.correlation_min_observations
        self.score_threshold = settings.correlation_score_threshold
    
    def correlate_ip_transaction(
        self,
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]],
    ) -> List[CorrelationEvidence]:
        ip_tx_map = defaultdict(list)
        tx_ip_map = defaultdict(set)
        
        for tx in transactions:
            all_ips = set(tx.source_ips + tx.destination_ips)
            for ip in all_ips:
                ip_tx_map[ip].append(tx)
                tx_ip_map[tx.txid].add(ip)
        
        for obs in network_observations:
            src_ip = obs.get("src_ip")
            dst_ip = obs.get("dst_ip")
            txid = obs.get("txid")
            obs_time = obs.get("timestamp")
            
            if not txid or not obs_time:
                continue
            
            # Parse obs_time if it's a string
            if isinstance(obs_time, str):
                try:
                    obs_time = datetime.fromisoformat(obs_time.replace("Z", "+00:00"))
                except Exception:
                    continue
            elif not isinstance(obs_time, datetime):
                # Skip if timestamp is neither string nor datetime
                continue
            
            # Ensure obs_time is timezone-aware for comparison with tx.timestamp
            if obs_time.tzinfo is None:
                obs_time = obs_time.replace(tzinfo=timezone.utc)
            
            for ip in [src_ip, dst_ip]:
                if not ip:
                    continue
                
                related_txs = ip_tx_map.get(ip, [])
                for tx in related_txs:
                    # Ensure both timestamps are timezone-aware for comparison
                    tx_time = tx.timestamp
                    if tx_time.tzinfo is None:
                        tx_time = tx_time.replace(tzinfo=timezone.utc)
                    time_diff = abs((tx_time - obs_time).total_seconds())
                    if time_diff <= self.temporal_window.total_seconds():
                        tx_ip_map[tx.txid].add(ip)
        
        evidence_list = []
        
        for ip, txs in ip_tx_map.items():
            if len(txs) < self.min_observations:
                continue
            
            for tx in txs:
                score = self._compute_correlation_score(ip, tx, txs, network_observations)
                
                if score >= self.score_threshold:
                    evidence = self._generate_evidence(ip, tx, score, txs, network_observations)
                    evidence_list.append(evidence)
        
        evidence_list.sort(key=lambda x: x.correlation_score, reverse=True)
        return evidence_list
    
    def _compute_correlation_score(
        self,
        ip: str,
        tx: NormalizedTransaction,
        all_txs: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]],
    ) -> float:
        signals = []
        
        tx_ips = set(tx.source_ips + tx.destination_ips)
        if ip in tx_ips:
            signals.append(0.4)
        
        tx_count = len(all_txs)
        if tx_count >= 5:
            signals.append(0.2)
        elif tx_count >= 3:
            signals.append(0.15)
        elif tx_count >= 2:
            signals.append(0.1)
        
        time_diffs = []
        for other_tx in all_txs:
            if other_tx.txid != tx.txid:
                # Ensure both timestamps are timezone-aware
                t1 = tx.timestamp
                t2 = other_tx.timestamp
                if t1.tzinfo is None:
                    t1 = t1.replace(tzinfo=timezone.utc)
                if t2.tzinfo is None:
                    t2 = t2.replace(tzinfo=timezone.utc)
                diff = abs((t1 - t2).total_seconds())
                time_diffs.append(diff)
        
        if time_diffs:
            avg_diff = sum(time_diffs) / len(time_diffs)
            if avg_diff < 60:
                signals.append(0.2)
            elif avg_diff < 300:
                signals.append(0.15)
            elif avg_diff < 3600:
                signals.append(0.1)
        
        obs_count = sum(
            1 for obs in network_observations
            if obs.get("src_ip") == ip or obs.get("dst_ip") == ip
        )
        if obs_count >= 3:
            signals.append(0.1)
        
        ports = set()
        for t in all_txs:
            ports.update(t.source_ports)
            ports.update(t.destination_ports)
        if len(ports) <= 3 and len(ports) > 0:
            signals.append(0.05)
        
        return min(sum(signals), 1.0)
    
    def _generate_evidence(
        self,
        ip: str,
        tx: NormalizedTransaction,
        score: float,
        all_txs: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]],
    ) -> CorrelationEvidence:
        evidence_items = []
        
        tx_ips = set(tx.source_ips + tx.destination_ips)
        if ip in tx_ips:
            evidence_items.append("Matching transaction identifier")
        
        if len(all_txs) >= self.min_observations:
            evidence_items.append(f"Repeated observation ({len(all_txs)} transactions)")
        
        time_diffs = [
            abs((tx.timestamp - t.timestamp).total_seconds())
            for t in all_txs if t.txid != tx.txid
        ]
        if time_diffs and min(time_diffs) < 300:
            evidence_items.append("Temporal proximity")
        
        obs_for_ip = [
            o for o in network_observations
            if o.get("src_ip") == ip or o.get("dst_ip") == ip
        ]
        if len(obs_for_ip) >= 2:
            evidence_items.append(f"Network observations ({len(obs_for_ip)} records)")
        
        ports = set()
        for t in all_txs:
            ports.update(t.source_ports)
            ports.update(t.destination_ports)
        if len(ports) <= 3 and len(ports) > 0:
            evidence_items.append(f"Consistent ports: {', '.join(map(str, sorted(ports)))}")
        
        return CorrelationEvidence(
            ip=ip,
            txid=tx.txid,
            correlation_score=score,
            evidence=evidence_items,
        )
    
    def get_ip_wallet_correlations(
        self,
        transactions: List[NormalizedTransaction],
    ) -> Dict[str, Dict[str, float]]:
        ip_wallet_scores = defaultdict(lambda: defaultdict(float))
        
        for tx in transactions:
            all_ips = set(tx.source_ips + tx.destination_ips)
            all_wallets = set(tx.inputs + tx.outputs)
            
            for ip in all_ips:
                for wallet in all_wallets:
                    ip_wallet_scores[ip][wallet] += 1.0
        
        result = {}
        for ip, wallets in ip_wallet_scores.items():
            total = sum(wallets.values())
            if total > 0:
                result[ip] = {w: s / total for w, s in wallets.items()}
        
        return result
    
    def find_shared_infrastructure(
        self,
        transactions: List[NormalizedTransaction],
    ) -> List[Dict[str, Any]]:
        ip_wallet = defaultdict(set)
        
        for tx in transactions:
            all_ips = set(tx.source_ips + tx.destination_ips)
            all_wallets = set(tx.inputs + tx.outputs)
            
            for ip in all_ips:
                ip_wallet[ip].update(all_wallets)
        
        shared = []
        for ip, wallets in ip_wallet.items():
            if len(wallets) > 1:
                shared.append({
                    "ip": ip,
                    "wallets": list(wallets),
                    "wallet_count": len(wallets),
                    "risk_indicator": "SHARED_INFRASTRUCTURE",
                })
        
        shared.sort(key=lambda x: x["wallet_count"], reverse=True)
        return shared


correlation_service = CorrelationService()