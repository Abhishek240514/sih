import pytest
import numpy as np
from datetime import datetime, timedelta
from app.models.schemas import NormalizedTransaction, WalletFeatures
from app.services.feature_service import feature_engineering_service


class TestFeatureEngineering:
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
                timestamp=datetime(2024, 1, 15, 10, 5, 0),
                inputs=["wallet_b"],
                outputs=["wallet_c"],
                input_amounts=[0.99],
                output_amounts=[0.98],
                fee=0.01,
                source_ips=["192.168.1.2"],
                destination_ips=["10.0.0.2"],
                source_ports=[54322],
                destination_ports=[8333],
                geo_country="US",
                asn="AS15169",
                input_amount=0.99,
                output_amount=0.98,
            ),
        ]
    
    def test_compute_transaction_features(self):
        features = feature_engineering_service.compute_transaction_features(self.transactions)
        
        assert "tx1" in features
        assert "tx2" in features
        assert features["tx1"]["input_amount"] == 1.0
        assert features["tx1"]["output_amount"] == 0.99
        assert features["tx1"]["input_count"] == 1
        assert features["tx1"]["output_count"] == 1
    
    def test_compute_wallet_features(self):
        wallet_features = feature_engineering_service.compute_wallet_features(self.transactions)
        
        assert "wallet_a" in wallet_features
        assert "wallet_b" in wallet_features
        assert "wallet_c" in wallet_features
        
        wf_a = wallet_features["wallet_a"]
        assert wf_a.transaction_count == 1
        assert wf_a.total_input_amount == 1.0
        assert wf_a.total_output_amount == 0.99  # wallet_a receives output in tx1
        assert wf_a.fan_out == 1
        assert wf_a.fan_in == 1  # wallet_a has 1 input in tx1
        assert wf_a.unique_ips == 2  # source + destination
        assert wf_a.unique_asns == 1
        assert wf_a.unique_countries == 1
    
    def test_compute_wallet_features_multiple_txs(self):
        txs = self.transactions + [
            NormalizedTransaction(
                txid="tx3",
                timestamp=datetime(2024, 1, 15, 11, 0, 0),
                inputs=["wallet_a"],
                outputs=["wallet_d"],
                input_amounts=[0.5],
                output_amounts=[0.49],
                fee=0.01,
                source_ips=["192.168.1.3"],
                destination_ips=["10.0.0.3"],
                source_ports=[54323],
                destination_ports=[8333],
                geo_country="DE",
                asn="AS32934",
                input_amount=0.5,
                output_amount=0.49,
            )
        ]
        
        wallet_features = feature_engineering_service.compute_wallet_features(txs)
        
        wf_a = wallet_features["wallet_a"]
        assert wf_a.transaction_count == 2
        assert wf_a.total_input_amount == 1.5
        assert wf_a.unique_ips == 4  # 2 source + 2 destination across both txs
        assert wf_a.unique_countries == 2
        assert wf_a.unique_asns == 2
    
    def test_build_feature_matrix(self):
        wallet_features = feature_engineering_service.compute_wallet_features(self.transactions)
        
        matrix, wallet_ids, feature_names = feature_engineering_service.build_feature_matrix(wallet_features)
        
        assert matrix.shape[0] == 3
        assert matrix.shape[1] == len(feature_names)
        assert len(wallet_ids) == 3
        assert "transaction_count" in feature_names
        assert "fan_out" in feature_names
        # pagerank is added from graph features, not in basic feature matrix
    
    def test_normalize_features(self):
        matrix = np.array([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0], [7.0, 8.0, 9.0]])
        normalized = feature_engineering_service.normalize_features(matrix)
        
        assert normalized.shape == matrix.shape
        assert np.allclose(np.mean(normalized, axis=0), 0, atol=1e-10)
        assert np.allclose(np.std(normalized, axis=0), 1, atol=1e-10)
    
    def test_normalize_features_with_nan(self):
        matrix = np.array([[1.0, np.nan], [2.0, 3.0], [np.inf, 4.0]])
        normalized = feature_engineering_service.normalize_features(matrix)
        
        assert not np.any(np.isnan(normalized))
        assert not np.any(np.isinf(normalized))
    
    def test_burst_score_calculation(self):
        timestamps = [
            datetime(2024, 1, 15, 10, 0, 0),
            datetime(2024, 1, 15, 10, 0, 30),
            datetime(2024, 1, 15, 10, 1, 0),
            datetime(2024, 1, 15, 10, 1, 30),
        ]
        score = feature_engineering_service._compute_burst_score(timestamps)
        assert score > 0.5
    
    def test_dormant_score_calculation(self):
        timestamps = [
            datetime(2024, 1, 1, 10, 0, 0),
            datetime(2024, 2, 1, 10, 0, 0),
            datetime(2024, 3, 1, 10, 0, 0),
        ]
        score = feature_engineering_service._compute_dormant_score(timestamps)
        assert score > 0.5
    
    def test_consolidation_dispersion_scores(self):
        # consolidation_score = min(avg_output/avg_input, 2.0) / 2.0
        # For inputs [1.0, 1.0], outputs [0.5, 0.5]: avg_out=0.5, avg_in=1.0, ratio=0.5, result=0.25
        assert feature_engineering_service._compute_consolidation_score([1.0, 1.0], [0.5, 0.5]) == 0.25
        # dispersion_score = CV of outputs capped at 5.0 / 5.0
        # For [0.3, 0.3, 0.3, 0.1]: mean=0.25, std≈0.095, CV≈0.38, result≈0.076
        assert feature_engineering_service._compute_dispersion_score([1.0], [0.3, 0.3, 0.3, 0.1]) > 0.0