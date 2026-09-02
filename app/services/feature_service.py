import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Set, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import logging
import math

from app.models.schemas import NormalizedTransaction, WalletFeatures
from app.core.config import settings

logger = logging.getLogger(__name__)


class FeatureEngineeringService:
    def __init__(self):
        self.random_seed = settings.ml_random_seed
        np.random.seed(self.random_seed)
    
    def compute_transaction_features(
        self, transactions: List[NormalizedTransaction]
    ) -> Dict[str, Dict[str, Any]]:
        tx_features = {}
        
        for tx in transactions:
            input_amount = tx.input_amount
            output_amount = tx.output_amount
            fee = tx.fee
            
            tx_features[tx.txid] = {
                "input_amount": input_amount,
                "output_amount": output_amount,
                "fee": fee,
                "input_count": len(tx.inputs),
                "output_count": len(tx.outputs),
                "unique_input_addresses": len(set(tx.inputs)),
                "unique_output_addresses": len(set(tx.outputs)),
                "has_network_data": len(tx.source_ips) > 0 or len(tx.destination_ips) > 0,
                "timestamp": tx.timestamp,
            }
        
        return tx_features
    
    def compute_wallet_features(
        self,
        transactions: List[NormalizedTransaction],
        network_observations: List[Dict[str, Any]] = None,
    ) -> Dict[str, WalletFeatures]:
        wallet_txs = defaultdict(list)
        wallet_counterparties = defaultdict(set)
        wallet_ips = defaultdict(set)
        wallet_asns = defaultdict(set)
        wallet_countries = defaultdict(set)
        wallet_timestamps = defaultdict(list)
        
        for tx in transactions:
            all_addresses = set(tx.inputs + tx.outputs)
            for addr in all_addresses:
                wallet_txs[addr].append(tx)
                wallet_timestamps[addr].append(tx.timestamp)
                
                counterparties = set(tx.inputs + tx.outputs) - {addr}
                wallet_counterparties[addr].update(counterparties)
                
                wallet_ips[addr].update(tx.source_ips)
                wallet_ips[addr].update(tx.destination_ips)
                if tx.asn:
                    wallet_asns[addr].add(tx.asn)
                if tx.geo_country:
                    wallet_countries[addr].add(tx.geo_country)
        
        if network_observations:
            for obs in network_observations:
                txid = obs.get("txid")
                if txid:
                    tx = next((t for t in transactions if t.txid == txid), None)
                    if tx:
                        for addr in set(tx.inputs + tx.outputs):
                            wallet_ips[addr].add(obs.get("src_ip", ""))
                            wallet_ips[addr].add(obs.get("dst_ip", ""))
                            if obs.get("asn"):
                                wallet_asns[addr].add(obs["asn"])
                            if obs.get("geo_country"):
                                wallet_countries[addr].add(obs["geo_country"])
        
        features = {}
        
        for addr, txs in wallet_txs.items():
            if not txs:
                continue
            
            txs_sorted = sorted(txs, key=lambda x: x.timestamp)
            timestamps = [t.timestamp for t in txs_sorted]
            
            input_amounts = []
            output_amounts = []
            fees = []
            
            for tx in txs:
                input_amounts.append(tx.input_amount)
                output_amounts.append(tx.output_amount)
                fees.append(tx.fee)
            
            all_amounts = input_amounts + output_amounts
            
            first_seen = min(timestamps)
            last_seen = max(timestamps)
            active_duration = (last_seen - first_seen).total_seconds() / 3600
            
            tx_count = len(txs)
            tx_per_hour = tx_count / max(active_duration, 1)
            tx_per_day = tx_count / max(active_duration / 24, 1)
            
            burst_score = self._compute_burst_score(timestamps)
            dormant_score = self._compute_dormant_score(timestamps)
            
            fan_in = sum(len(tx.inputs) for tx in txs)
            fan_out = sum(len(tx.outputs) for tx in txs)
            
            unique_cps = len(wallet_counterparties.get(addr, set()))
            
            consolidation = self._compute_consolidation_score(input_amounts, output_amounts)
            dispersion = self._compute_dispersion_score(input_amounts, output_amounts)
            
            features[addr] = WalletFeatures(
                transaction_count=tx_count,
                total_input_amount=sum(input_amounts),
                total_output_amount=sum(output_amounts),
                average_amount=np.mean(all_amounts) if all_amounts else 0.0,
                median_amount=np.median(all_amounts) if all_amounts else 0.0,
                amount_std=np.std(all_amounts) if len(all_amounts) > 1 else 0.0,
                total_fees=sum(fees),
                transaction_velocity=tx_per_hour,
                active_duration=active_duration,
                transactions_per_hour=tx_per_hour,
                transactions_per_day=tx_per_day,
                burst_score=burst_score,
                dormant_to_active_score=dormant_score,
                fan_in=fan_in,
                fan_out=fan_out,
                unique_counterparties=unique_cps,
                consolidation_score=consolidation,
                dispersion_score=dispersion,
                unique_ips=len(wallet_ips.get(addr, set())),
                unique_asns=len(wallet_asns.get(addr, set())),
                unique_countries=len(wallet_countries.get(addr, set())),
                ip_change_rate=len(wallet_ips.get(addr, set())) / max(tx_count, 1),
                network_observation_count=len([
                    o for o in (network_observations or [])
                    if any(a in (o.get("src_ip", ""), o.get("dst_ip", "")) 
                           for a in wallet_ips.get(addr, set()))
                ]),
            )
        
        return features
    
    def _compute_burst_score(self, timestamps: List[datetime]) -> float:
        if len(timestamps) < 2:
            return 0.0
        
        intervals = [
            (timestamps[i] - timestamps[i-1]).total_seconds()
            for i in range(1, len(timestamps))
        ]
        
        short_intervals = sum(1 for i in intervals if i < 60)
        return short_intervals / len(intervals)
    
    def _compute_dormant_score(self, timestamps: List[datetime]) -> float:
        if len(timestamps) < 2:
            return 0.0
        
        intervals = [
            (timestamps[i] - timestamps[i-1]).total_seconds() / 3600
            for i in range(1, len(timestamps))
        ]
        
        long_gaps = sum(1 for i in intervals if i > 24)
        return long_gaps / len(intervals)
    
    def _compute_consolidation_score(
        self, input_amounts: List[float], output_amounts: List[float]
    ) -> float:
        if not input_amounts or not output_amounts:
            return 0.0
        
        avg_input = np.mean(input_amounts)
        avg_output = np.mean(output_amounts)
        
        if avg_input == 0:
            return 0.0
        
        ratio = avg_output / avg_input
        return min(ratio, 2.0) / 2.0
    
    def _compute_dispersion_score(
        self, input_amounts: List[float], output_amounts: List[float]
    ) -> float:
        if not output_amounts:
            return 0.0
        
        if len(output_amounts) == 1:
            return 0.0
        
        cv = np.std(output_amounts) / max(np.mean(output_amounts), 1e-10)
        return min(cv, 5.0) / 5.0
    
    def build_feature_matrix(
        self, wallet_features: Dict[str, WalletFeatures]
    ) -> Tuple[np.ndarray, List[str], List[str]]:
        if not wallet_features:
            return np.array([]), [], []
        
        feature_names = [
            "transaction_count",
            "total_input_amount",
            "total_output_amount",
            "average_amount",
            "median_amount",
            "amount_std",
            "total_fees",
            "transaction_velocity",
            "active_duration",
            "transactions_per_hour",
            "transactions_per_day",
            "burst_score",
            "dormant_to_active_score",
            "fan_in",
            "fan_out",
            "unique_counterparties",
            "consolidation_score",
            "dispersion_score",
            "unique_ips",
            "unique_asns",
            "unique_countries",
            "ip_change_rate",
            "network_observation_count",
        ]
        
        wallet_ids = list(wallet_features.keys())
        matrix = np.zeros((len(wallet_ids), len(feature_names)))
        
        for i, wallet_id in enumerate(wallet_ids):
            wf = wallet_features[wallet_id]
            matrix[i] = [
                wf.transaction_count,
                wf.total_input_amount,
                wf.total_output_amount,
                wf.average_amount,
                wf.median_amount,
                wf.amount_std,
                wf.total_fees,
                wf.transaction_velocity,
                wf.active_duration,
                wf.transactions_per_hour,
                wf.transactions_per_day,
                wf.burst_score,
                wf.dormant_to_active_score,
                wf.fan_in,
                wf.fan_out,
                wf.unique_counterparties,
                wf.consolidation_score,
                wf.dispersion_score,
                wf.unique_ips,
                wf.unique_asns,
                wf.unique_countries,
                wf.ip_change_rate,
                wf.network_observation_count,
            ]
        
        matrix = np.nan_to_num(matrix, nan=0.0, posinf=0.0, neginf=0.0)
        
        return matrix, wallet_ids, feature_names
    
    def normalize_features(self, matrix: np.ndarray) -> np.ndarray:
        if matrix.size == 0:
            return matrix
        
        means = np.mean(matrix, axis=0)
        stds = np.std(matrix, axis=0)
        stds[stds == 0] = 1.0
        
        normalized = (matrix - means) / stds
        return np.nan_to_num(normalized, nan=0.0, posinf=0.0, neginf=0.0)


feature_engineering_service = FeatureEngineeringService()