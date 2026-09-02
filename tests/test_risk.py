import pytest
import numpy as np
from datetime import datetime
from app.models.schemas import Wallet, WalletFeatures, RiskLevel, NormalizedTransaction
from app.services.risk_service import risk_scoring_service
from app.services.correlation_service import correlation_service


class TestRiskScoring:
    def setup_method(self):
        self.wallet = Wallet(
            address="wallet_test",
            transaction_count=10,
            total_in=5.0,
            total_out=4.9,
            average_transaction_value=0.5,
            unique_counterparties=8,
            fan_in=5,
            fan_out=5,
            first_seen=datetime(2024, 1, 1),
            last_seen=datetime(2024, 1, 15),
            risk_score=0.0,
            risk_level=RiskLevel.LOW,
            features=WalletFeatures(
                transaction_count=10,
                total_input_amount=5.0,
                total_output_amount=4.9,
                average_amount=0.5,
                median_amount=0.5,
                amount_std=0.1,
                total_fees=0.1,
                transaction_velocity=0.5,
                active_duration=336.0,
                transactions_per_hour=0.5,
                transactions_per_day=12.0,
                burst_score=0.1,
                dormant_to_active_score=0.0,
                fan_in=5,
                fan_out=5,
                unique_counterparties=8,
                consolidation_score=0.5,
                dispersion_score=0.3,
                degree=10,
                weighted_degree=5.0,
                in_degree=5,
                out_degree=5,
                betweenness_centrality=0.1,
                closeness_centrality=0.3,
                pagerank=0.01,
                clustering_coefficient=0.2,
                unique_ips=3,
                unique_asns=2,
                unique_countries=1,
                ip_change_rate=0.3,
                network_observation_count=5,
            )
        )
    
    def test_compute_risk_score_normal(self):
        score = risk_scoring_service.compute_risk_score(
            self.wallet,
            ml_anomaly_score=0.1,
            graph_anomaly_score=0.1,
            temporal_anomaly_score=0.1,
            network_correlation_score=0.1,
            behavioral_score=0.1,
        )
        
        assert 0 <= score <= 1
        assert score < 0.3
    
    def test_compute_risk_score_high(self):
        score = risk_scoring_service.compute_risk_score(
            self.wallet,
            ml_anomaly_score=0.9,
            graph_anomaly_score=0.8,
            temporal_anomaly_score=0.7,
            network_correlation_score=0.8,
            behavioral_score=0.9,
        )
        
        assert 0 <= score <= 1
        assert score > 0.7
    
    def test_get_risk_level(self):
        assert risk_scoring_service.get_risk_level(0.1) == RiskLevel.LOW
        assert risk_scoring_service.get_risk_level(0.3) == RiskLevel.MEDIUM
        assert risk_scoring_service.get_risk_level(0.6) == RiskLevel.HIGH
        assert risk_scoring_service.get_risk_level(0.9) == RiskLevel.CRITICAL
    
    def test_normalize_score(self):
        assert risk_scoring_service._normalize_score(0.5) == 0.5
        assert risk_scoring_service._normalize_score(-0.5) == 0.0
        assert risk_scoring_service._normalize_score(1.5) == 1.0
    
    def test_compute_temporal_anomaly_score(self):
        wallet = self.wallet
        wallet.features.burst_score = 0.8
        wallet.features.transaction_velocity = 20.0
        
        score = risk_scoring_service.compute_temporal_anomaly_score(wallet)
        
        assert 0 <= score <= 1
        assert score > 0.3
    
    def test_compute_network_correlation_score(self):
        wallet = self.wallet
        wallet.features.unique_ips = 10
        wallet.features.ip_change_rate = 0.8
        wallet.features.unique_asns = 5
        wallet.features.unique_countries = 3
        
        score = risk_scoring_service.compute_network_correlation_score(wallet)
        
        assert 0 <= score <= 1
        assert score > 0.3
    
    def test_compute_behavioral_score(self):
        wallet = self.wallet
        wallet.features.fan_out = 20
        wallet.features.unique_counterparties = 30
        wallet.features.dispersion_score = 0.8
        
        score = risk_scoring_service.compute_behavioral_score(wallet)
        
        assert 0 <= score <= 1
        assert score > 0.3
    
    def test_generate_explanations(self):
        reasons = risk_scoring_service.generate_explanations(
            self.wallet,
            ml_anomaly_score=0.8,
            graph_anomaly_score=0.6,
            temporal_anomaly_score=0.3,
            network_correlation_score=0.4,
            behavioral_score=0.5,
        )
        
        assert len(reasons) > 0
        for r in reasons:
            assert r.contribution > 0
            assert r.evidence_type in ["observed", "model_derived", "heuristic", "correlation"]
        
        reasons.sort(key=lambda x: x.contribution, reverse=True)
        assert reasons[0].contribution >= reasons[-1].contribution
    
    def test_rank_entities(self):
        wallets = {
            "wallet_1": self.wallet,
            "wallet_2": Wallet(
                address="wallet_2",
                transaction_count=100,
                total_in=100.0,
                total_out=99.0,
                average_transaction_value=1.0,
                unique_counterparties=50,
                fan_in=50,
                fan_out=50,
                first_seen=datetime(2024, 1, 1),
                last_seen=datetime(2024, 1, 15),
                risk_score=0.0,
                risk_level=RiskLevel.LOW,
                features=WalletFeatures(
                    transaction_count=100,
                    total_input_amount=100.0,
                    total_output_amount=99.0,
                    average_amount=1.0,
                    median_amount=1.0,
                    amount_std=0.5,
                    total_fees=1.0,
                    transaction_velocity=5.0,
                    active_duration=336.0,
                    transactions_per_hour=5.0,
                    transactions_per_day=120.0,
                    burst_score=0.5,
                    dormant_to_active_score=0.1,
                    fan_in=50,
                    fan_out=50,
                    unique_counterparties=50,
                    consolidation_score=0.5,
                    dispersion_score=0.5,
                    degree=50,
                    weighted_degree=50.0,
                    in_degree=25,
                    out_degree=25,
                    betweenness_centrality=0.5,
                    closeness_centrality=0.5,
                    pagerank=0.1,
                    clustering_coefficient=0.3,
                    unique_ips=10,
                    unique_asns=5,
                    unique_countries=3,
                    ip_change_rate=0.5,
                    network_observation_count=50,
                )
            ),
        }
        
        ranked = risk_scoring_service.rank_entities(wallets)
        
        assert len(ranked) == 2
        assert ranked[0][1] >= ranked[1][1]


class TestCorrelationService:
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
            NormalizedTransaction(
                txid="tx2",
                timestamp=datetime(2024, 1, 15, 10, 2, 0),
                inputs=["wallet_b"],
                outputs=["wallet_c"],
                input_amounts=[0.99],
                output_amounts=[0.98],
                fee=0.01,
                source_ips=["192.168.1.1"],
                destination_ips=["10.0.0.2"],
                source_ports=[54322],
                destination_ports=[8333],
                geo_country="US",
                asn="AS15169",
                input_amount=0.99,
                output_amount=0.98,
            ),
        ]
        
        self.network_obs = [
            {
                "timestamp": datetime(2024, 1, 15, 10, 0, 10),
                "src_ip": "192.168.1.1",
                "dst_ip": "10.0.0.1",
                "txid": "tx1",
                "geo_country": "US",
                "asn": "AS15169",
            },
        ]
    
    def test_correlate_ip_transaction(self):
        evidence = correlation_service.correlate_ip_transaction(
            self.transactions, self.network_obs
        )
        
        assert len(evidence) > 0
        for e in evidence:
            assert e.ip == "192.168.1.1"
            assert 0 <= e.correlation_score <= 1
            assert len(e.evidence) > 0
    
    def test_get_ip_wallet_correlations(self):
        correlations = correlation_service.get_ip_wallet_correlations(self.transactions)
        
        assert "192.168.1.1" in correlations
        assert "wallet_a" in correlations["192.168.1.1"]
        assert "wallet_b" in correlations["192.168.1.1"]
    
    def test_find_shared_infrastructure(self):
        shared = correlation_service.find_shared_infrastructure(self.transactions)
        
        assert len(shared) > 0
        for s in shared:
            assert "ip" in s
            assert "wallets" in s
            assert s["wallet_count"] >= 2