"""
Structural Detection Service
============================
Implements real structural heuristics for peeling-chain and mixing-like patterns.
These are deterministic structural heuristics, NOT machine learning.
Clearly separated from ML signals, graph signals, and correlation signals.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from collections import defaultdict
import logging
import math

from app.models.schemas import NormalizedTransaction, WalletFeatures

logger = logging.getLogger(__name__)


@dataclass
class StructuralSignal:
    pattern: str
    score: float
    confidence: float
    wallets: List[str]
    transactions: List[str]
    features: Dict[str, float]
    evidence: List[str]


class StructuralDetector:
    """
    Detects structural patterns in transaction graphs.
    
    PEELING CHAIN: Sequential peel-off of small amounts from a large UTXO
    - consecutive transaction count
    - chain length
    - temporal spacing
    - amount progression
    - output/input count
    - change amount
    - retained amount ratio
    - wallet reuse
    - graph path continuity
    - single-output/change patterns
    
    MIXING-LIKE STRUCTURE: Fan-in/fan-out with uniform outputs
    - fan-in
    - fan-out
    - input count
    - output count
    - equal-output ratio
    - amount variance
    - amount entropy
    - temporal concentration
    - graph neighborhood structure
    """
    
    def __init__(self):
        self.min_peeling_chain_length = 3
        self.min_mixing_fan_in = 5
        self.min_mixing_fan_out = 5
        self.max_temporal_gap_seconds = 3600  # 1 hour for peeling chain
        self.min_equal_output_ratio = 0.7
    
    def detect_peeling_chain(
        self,
        transactions: List[NormalizedTransaction],
        wallet_features: Dict[str, WalletFeatures],
    ) -> List[StructuralSignal]:
        """
        Detect peeling chain patterns using actual transaction sequence analysis.
        
        A peeling chain is identified by:
        1. A sequence of transactions where one input address appears repeatedly
        2. Each transaction has 2 outputs: one small "peel" amount, one large "change" amount
        3. The change address becomes the input for the next transaction
        4. Temporal proximity between transactions
        5. Consistent peel amount or ratio
        """
        signals = []
        
        # Build transaction lookup by txid for quick access
        tx_by_id = {tx.txid: tx for tx in transactions}
        
        # Build address -> transactions mapping for finding chain starts
        addr_to_txs = defaultdict(list)
        for tx in transactions:
            for addr in tx.inputs:
                addr_to_txs[addr].append(tx)
        
        # Find potential chain starts: addresses that have transactions with 2 outputs
        # (peel + change pattern). We check each address that appears as input.
        for start_addr, txs in addr_to_txs.items():
            # Only consider addresses that have at least one transaction with 2 outputs
            has_two_output_tx = any(len(tx.outputs) == 2 and len(tx.output_amounts) == 2 for tx in txs)
            if not has_two_output_tx:
                continue
            
            # Try to trace a chain starting from this address
            chain_result = self._trace_peeling_chain(start_addr, txs, tx_by_id)
            if chain_result:
                signals.append(chain_result)
        
        return signals
    
    def _trace_peeling_chain(
        self,
        start_addr: str,
        start_txs: List[NormalizedTransaction],
        tx_by_id: Dict[str, NormalizedTransaction],
    ) -> Optional[StructuralSignal]:
        """
        Trace a peeling chain by following change addresses across transactions.
        """
        # Sort start transactions by timestamp
        start_txs_sorted = sorted(start_txs, key=lambda t: t.timestamp)
        
        best_chain = None
        best_score = 0
        
        # Try each potential starting transaction
        for first_tx in start_txs_sorted:
            chain = self._follow_chain(first_tx, start_addr, tx_by_id)
            if chain and len(chain["txs"]) >= self.min_peeling_chain_length:
                score = self._score_chain(chain)
                if score > best_score:
                    best_score = score
                    best_chain = chain
        
        if best_chain is None or best_score < 0.3:
            return None
        
        return self._build_chain_signal(best_chain, best_score)
    
    def _follow_chain(
        self,
        first_tx: NormalizedTransaction,
        start_addr: str,
        tx_by_id: Dict[str, NormalizedTransaction],
    ) -> Optional[Dict]:
        """
        Follow a potential peeling chain from the first transaction.
        """
        chain_wallets = [start_addr]
        chain_txs = [first_tx.txid]
        peel_amounts = []
        change_ratios = []
        temporal_gaps = []
        
        current_addr = start_addr
        prev_ts = first_tx.timestamp
        
        # Check first transaction
        if len(first_tx.inputs) != 1 or first_tx.inputs[0] != start_addr:
            return None
        if len(first_tx.outputs) != 2 or len(first_tx.output_amounts) != 2:
            return None
        
        out_1, out_2 = first_tx.output_amounts[0], first_tx.output_amounts[1]
        peel_amt = min(out_1, out_2)
        change_amt = max(out_1, out_2)
        total_out = out_1 + out_2
        
        if total_out <= 0:
            return None
        
        peel_amounts.append(peel_amt)
        change_ratios.append(change_amt / total_out)
        change_addr = first_tx.outputs[0] if out_1 > out_2 else first_tx.outputs[1]
        chain_wallets.append(change_addr)
        
        # Follow the chain
        current_addr = change_addr
        
        for _ in range(self.min_peeling_chain_length * 3):  # Max iterations
            # Find next transaction where current_addr is input
            next_tx = None
            for tx in tx_by_id.values():
                if current_addr in tx.inputs and tx.txid not in chain_txs:
                    # Check temporal proximity
                    gap = (tx.timestamp - prev_ts).total_seconds()
                    if gap > self.max_temporal_gap_seconds:
                        continue
                    next_tx = tx
                    break
            
            if not next_tx:
                break
            
            # Validate next transaction
            if len(next_tx.inputs) != 1 or next_tx.inputs[0] != current_addr:
                break
            if len(next_tx.outputs) != 2 or len(next_tx.output_amounts) != 2:
                break
            
            out_1, out_2 = next_tx.output_amounts[0], next_tx.output_amounts[1]
            peel_amt = min(out_1, out_2)
            change_amt = max(out_1, out_2)
            total_out = out_1 + out_2
            
            if total_out <= 0:
                break
            
            peel_amounts.append(peel_amt)
            change_ratios.append(change_amt / total_out)
            change_addr = next_tx.outputs[0] if out_1 > out_2 else next_tx.outputs[1]
            chain_wallets.append(change_addr)
            chain_txs.append(next_tx.txid)
            
            gap = (next_tx.timestamp - prev_ts).total_seconds()
            temporal_gaps.append(gap)
            prev_ts = next_tx.timestamp
            
            current_addr = change_addr
        
        if len(chain_txs) < self.min_peeling_chain_length:
            return None
        
        return {
            "txs": chain_txs,
            "wallets": chain_wallets,
            "peel_amounts": peel_amounts,
            "change_ratios": change_ratios,
            "temporal_gaps": temporal_gaps,
        }
    
    def _score_chain(self, chain: Dict) -> float:
        """Score a traced chain."""
        n_chain = len(chain["txs"])
        peel_amounts = chain["peel_amounts"]
        change_ratios = chain["change_ratios"]
        temporal_gaps = chain["temporal_gaps"]
        
        avg_peel = sum(peel_amounts) / n_chain
        avg_change_ratio = sum(change_ratios) / n_chain
        avg_gap = sum(temporal_gaps) / len(temporal_gaps) if temporal_gaps else 0
        
        peel_cv = self._coefficient_of_variation(peel_amounts)
        change_ratio_cv = self._coefficient_of_variation(change_ratios)
        
        score_factors = []
        score_factors.append(min(1.0, n_chain / 20.0))
        score_factors.append(max(0.0, 1.0 - peel_cv))
        score_factors.append(max(0.0, 1.0 - change_ratio_cv))
        
        if avg_gap < 60:
            score_factors.append(1.0)
        elif avg_gap < 300:
            score_factors.append(0.8)
        elif avg_gap < 1800:
            score_factors.append(0.5)
        else:
            score_factors.append(0.2)
        
        if avg_peel > 0 and avg_change_ratio > 0:
            peel_ratio = avg_peel / (avg_peel / (1 - avg_change_ratio)) if avg_change_ratio < 1 else 0
            if peel_ratio < 0.1:
                score_factors.append(1.0)
            elif peel_ratio < 0.2:
                score_factors.append(0.7)
            else:
                score_factors.append(0.3)
        
        return sum(score_factors) / len(score_factors)
    
    def _build_chain_signal(self, chain: Dict, score: float) -> StructuralSignal:
        """Build StructuralSignal from traced chain."""
        n_chain = len(chain["txs"])
        peel_amounts = chain["peel_amounts"]
        change_ratios = chain["change_ratios"]
        temporal_gaps = chain["temporal_gaps"]
        
        avg_peel = sum(peel_amounts) / n_chain
        avg_change_ratio = sum(change_ratios) / n_chain
        avg_gap = sum(temporal_gaps) / len(temporal_gaps) if temporal_gaps else 0
        
        peel_cv = self._coefficient_of_variation(peel_amounts)
        change_ratio_cv = self._coefficient_of_variation(change_ratios)
        
        consistent_factors = sum(1 for f in [
            min(1.0, n_chain / 20.0),
            max(0.0, 1.0 - peel_cv),
            max(0.0, 1.0 - change_ratio_cv),
            1.0 if avg_gap < 60 else (0.8 if avg_gap < 300 else 0.5 if avg_gap < 1800 else 0.2),
        ] if f > 0.5)
        confidence = min(1.0, consistent_factors / 4)
        
        evidence = [
            f"Chain length: {n_chain} transactions",
            f"Average peel amount: {avg_peel:.8f} BTC",
            f"Average change ratio: {avg_change_ratio:.2%}",
            f"Average inter-transaction gap: {avg_gap:.0f}s",
            f"Peel amount CV: {peel_cv:.3f}",
            f"Change ratio CV: {change_ratio_cv:.3f}",
        ]
        
        features = {
            "chain_length": n_chain,
            "avg_peel_amount": avg_peel,
            "avg_change_ratio": avg_change_ratio,
            "avg_temporal_gap": avg_gap,
            "peel_cv": peel_cv,
            "change_ratio_cv": change_ratio_cv,
        }
        
        return StructuralSignal(
            pattern="peeling_chain",
            score=score,
            confidence=confidence,
            wallets=list(set(chain["wallets"])),
            transactions=chain["txs"],
            features=features,
            evidence=evidence,
        )
    
    def detect_mixing_like(
        self,
        transactions: List[NormalizedTransaction],
        wallet_features: Dict[str, WalletFeatures],
    ) -> List[StructuralSignal]:
        """
        Detect mixing-like transaction structures using graph features.
        
        Mixing-like patterns show:
        - High fan-in (many inputs to a pool address)
        - High fan-out (many outputs from pool address)
        - Uniform/equal output amounts
        - Temporal clustering
        - Low amount variance
        """
        signals = []
        
        # Find potential pool addresses (high fan-in then high fan-out)
        addr_stats = defaultdict(lambda: {"fan_in": 0, "fan_out": 0, "in_txs": [], "out_txs": [], "amounts_in": [], "amounts_out": []})
        
        for tx in transactions:
            for addr in tx.inputs:
                addr_stats[addr]["fan_in"] += len(tx.outputs)
                addr_stats[addr]["in_txs"].append(tx)
                addr_stats[addr]["amounts_in"].extend(tx.input_amounts)
            for addr in tx.outputs:
                addr_stats[addr]["fan_out"] += len(tx.inputs)
                addr_stats[addr]["out_txs"].append(tx)
                addr_stats[addr]["amounts_out"].extend(tx.output_amounts)
        
        for addr, stats in addr_stats.items():
            if stats["fan_in"] < self.min_mixing_fan_in or stats["fan_out"] < self.min_mixing_fan_out:
                continue
            
            # Analyze the mixing pattern
            mix_result = self._analyze_mixing_pattern(addr, stats)
            if mix_result:
                signals.append(mix_result)
        
        return signals
    
    def _analyze_mixing_pattern(
        self,
        pool_addr: str,
        stats: Dict,
    ) -> Optional[StructuralSignal]:
        """Analyze a potential mixing pool address."""
        # Check if there's a clear fan-in then fan-out phase
        in_txs = sorted(stats["in_txs"], key=lambda t: t.timestamp)
        out_txs = sorted(stats["out_txs"], key=lambda t: t.timestamp)
        
        if not in_txs or not out_txs:
            return None
        
        # Check temporal separation (mixing delay)
        last_in_time = in_txs[-1].timestamp
        first_out_time = out_txs[0].timestamp
        mixing_delay = (first_out_time - last_in_time).total_seconds()
        
        # Output amount analysis
        output_amounts = stats["amounts_out"]
        if len(output_amounts) < self.min_mixing_fan_out:
            return None
        
        # Calculate equal-output ratio
        mean_out = sum(output_amounts) / len(output_amounts)
        if mean_out == 0:
            return None
        
        equal_count = sum(1 for a in output_amounts if abs(a - mean_out) / mean_out < 0.05)
        equal_output_ratio = equal_count / len(output_amounts)
        
        if equal_output_ratio < self.min_equal_output_ratio:
            return None
        
        # Amount variance/entropy
        cv_out = self._coefficient_of_variation(output_amounts)
        entropy_out = self._entropy(output_amounts)
        
        # Input analysis
        input_amounts = stats["amounts_in"]
        total_in = sum(input_amounts)
        total_out = sum(output_amounts)
        throughput_balance = 1.0 - abs(total_in - total_out) / max(total_in, total_out, 1)
        
        # Temporal concentration of outputs
        out_times = [t.timestamp for t in out_txs]
        temporal_concentration = self._temporal_concentration(out_times)
        
        # Score factors
        score_factors = []
        evidence = []
        
        # Fan-in/fan-out
        fan_in_score = min(1.0, stats["fan_in"] / 50.0)
        fan_out_score = min(1.0, stats["fan_out"] / 50.0)
        score_factors.extend([fan_in_score, fan_out_score])
        evidence.append(f"Fan-in: {stats['fan_in']}, Fan-out: {stats['fan_out']}")
        
        # Equal output ratio
        score_factors.append(equal_output_ratio)
        evidence.append(f"Equal output ratio: {equal_output_ratio:.2%}")
        
        # Amount variance (low = more suspicious for mixing)
        score_factors.append(max(0.0, 1.0 - cv_out))
        evidence.append(f"Output amount CV: {cv_out:.3f}")
        
        # Throughput balance
        score_factors.append(throughput_balance)
        evidence.append(f"Throughput balance: {throughput_balance:.2%}")
        
        # Temporal concentration
        score_factors.append(temporal_concentration)
        evidence.append(f"Temporal concentration: {temporal_concentration:.2f}")
        
        # Mixing delay
        if mixing_delay < 3600:  # Under 1 hour
            score_factors.append(0.8)
        elif mixing_delay < 86400:  # Under 1 day
            score_factors.append(0.5)
        else:
            score_factors.append(0.2)
        evidence.append(f"Mixing delay: {mixing_delay:.0f}s")
        
        final_score = sum(score_factors) / len(score_factors)
        consistent_factors = sum(1 for f in score_factors if f > 0.5)
        confidence = min(1.0, consistent_factors / len(score_factors))
        
        # Only return if reasonably confident
        if final_score < 0.3 or confidence < 0.3:
            return None
        
        features = {
            "fan_in": stats["fan_in"],
            "fan_out": stats["fan_out"],
            "equal_output_ratio": equal_output_ratio,
            "output_cv": cv_out,
            "output_entropy": entropy_out,
            "throughput_balance": throughput_balance,
            "temporal_concentration": temporal_concentration,
            "mixing_delay": mixing_delay,
            "total_volume_in": total_in,
            "total_volume_out": total_out,
        }
        
        wallets = [pool_addr]
        wallets.extend(set(addr for tx in stats["in_txs"] for addr in tx.inputs))
        wallets.extend(set(addr for tx in stats["out_txs"] for addr in tx.outputs))
        
        txs = [tx.txid for tx in stats["in_txs"] + stats["out_txs"]]
        
        return StructuralSignal(
            pattern="mixing_like_structure",
            score=final_score,
            confidence=confidence,
            wallets=list(set(wallets)),
            transactions=txs,
            features=features,
            evidence=evidence,
        )
    
    def _coefficient_of_variation(self, values: List[float]) -> float:
        """Calculate coefficient of variation (std/mean)."""
        if not values:
            return 0.0
        mean = sum(values) / len(values)
        if mean == 0:
            return 0.0
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std = math.sqrt(variance)
        return std / mean
    
    def _entropy(self, values: List[float]) -> float:
        """Calculate Shannon entropy of value distribution."""
        if not values:
            return 0.0
        # Discretize into bins
        min_v, max_v = min(values), max(values)
        if min_v == max_v:
            return 0.0
        
        bins = 10
        bin_width = (max_v - min_v) / bins
        counts = [0] * bins
        
        for v in values:
            idx = min(int((v - min_v) / bin_width), bins - 1)
            counts[idx] += 1
        
        total = len(values)
        entropy = 0.0
        for count in counts:
            if count > 0:
                p = count / total
                entropy -= p * math.log2(p)
        
        return entropy / math.log2(bins)  # Normalize to [0, 1]
    
    def _temporal_concentration(self, timestamps: List[datetime]) -> float:
        """Measure how concentrated transactions are in time (0=dispersed, 1=burst)."""
        if len(timestamps) < 2:
            return 0.0
        
        intervals = [(timestamps[i] - timestamps[i-1]).total_seconds() for i in range(1, len(timestamps))]
        mean_interval = sum(intervals) / len(intervals)
        
        # High concentration = low mean interval relative to span
        total_span = (timestamps[-1] - timestamps[0]).total_seconds()
        if total_span == 0:
            return 1.0
        
        # If all transactions happened in a short burst
        if mean_interval < 60:  # Under 1 minute average
            return 1.0
        elif mean_interval < 300:
            return 0.8
        elif mean_interval < 3600:
            return 0.5
        else:
            return 0.2


# Global instance
structural_detector = StructuralDetector()