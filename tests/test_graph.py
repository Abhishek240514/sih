import pytest
import networkx as nx
from datetime import datetime
from app.models.schemas import NormalizedTransaction
from app.graph.builder import GraphBuilder
from app.graph.community_detection import CommunityDetector
from app.graph.analytics import GraphAnalytics


class TestGraphBuilder:
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
    
    def test_build_graph(self):
        builder = GraphBuilder()
        graph = builder.build_graph(self.transactions)
        
        assert graph.number_of_nodes() > 0
        assert graph.number_of_edges() > 0
        
        node_types = set(d.get("type") for _, d in graph.nodes(data=True))
        assert "wallet" in node_types
        assert "transaction" in node_types
        assert "ip" in node_types
        assert "asn" in node_types
        assert "country" in node_types
    
    def test_wallet_nodes_created(self):
        builder = GraphBuilder()
        builder.build_graph(self.transactions)
        
        wallet_nodes = [n for n, d in builder.graph.nodes(data=True) if d.get("type") == "wallet"]
        assert "wallet_wallet_a" in wallet_nodes
        assert "wallet_wallet_b" in wallet_nodes
        assert "wallet_wallet_c" in wallet_nodes
    
    def test_transaction_nodes_created(self):
        builder = GraphBuilder()
        builder.build_graph(self.transactions)
        
        tx_nodes = [n for n, d in builder.graph.nodes(data=True) if d.get("type") == "transaction"]
        assert "tx_tx1" in tx_nodes
        assert "tx_tx2" in tx_nodes
    
    def test_get_neighborhood(self):
        builder = GraphBuilder()
        builder.build_graph(self.transactions)
        
        neighborhood = builder.get_neighborhood("wallet_wallet_b", depth=1)
        
        assert len(neighborhood.nodes) > 0
        assert any(n.id == "wallet_wallet_b" for n in neighborhood.nodes)
    
    def test_shortest_path(self):
        builder = GraphBuilder()
        builder.build_graph(self.transactions)
        
        path = builder.get_shortest_path("wallet_wallet_a", "wallet_wallet_c")
        assert path is not None
        assert "wallet_wallet_a" in path
        assert "wallet_wallet_c" in path
    
    def test_connected_components(self):
        builder = GraphBuilder()
        builder.build_graph(self.transactions)
        
        components = builder.get_connected_components()
        assert len(components) > 0
    
    def test_compute_centrality_metrics(self):
        builder = GraphBuilder()
        builder.build_graph(self.transactions)
        
        metrics = builder.compute_centrality_metrics()
        
        assert "wallet_wallet_a" in metrics
        assert "degree" in metrics["wallet_wallet_a"]
        assert "pagerank" in metrics["wallet_wallet_a"]


class TestCommunityDetection:
    def setup_method(self):
        self.graph = nx.erdos_renyi_graph(20, 0.3, seed=42)
        self.detector = CommunityDetector(random_seed=42)
    
    def test_greedy_modularity(self):
        communities = self.detector.detect_communities_greedy(self.graph)
        
        assert len(communities) == 20
        assert len(set(communities.values())) > 1
    
    def test_connected_components(self):
        communities = self.detector.detect_communities_connected_components(self.graph)
        
        assert len(communities) == 20
    
    def test_compute_community_risk_scores(self):
        communities = self.detector.detect_communities_greedy(self.graph)
        node_risks = {n: 0.5 for n in self.graph.nodes()}
        node_risks[0] = 0.9
        
        risk_scores = self.detector.compute_community_risk_scores(self.graph, communities, node_risks)
        
        assert len(risk_scores) > 0
        for score in risk_scores.values():
            assert 0 <= score <= 1
    
    def test_filter_small_communities(self):
        # Community 0: 2 nodes (0,1) - size 2 < 3 -> filtered to -1
        # Community 1: 3 nodes (2,3,4) - size 3 >= 3 -> kept as 1
        # Community 2: 1 node (5) - size 1 < 3 -> filtered to -1
        communities = {0: 0, 1: 0, 2: 1, 3: 1, 4: 1, 5: 2}
        filtered = self.detector.filter_small_communities(communities, min_size=3)
        
        assert filtered[0] == -1  # filtered out (size 2 < 3)
        assert filtered[1] == -1  # filtered out (size 2 < 3)
        assert filtered[2] == 1   # kept (size 3 >= 3)
        assert filtered[3] == 1   # kept (size 3 >= 3)
        assert filtered[4] == 1   # kept (size 3 >= 3)
        assert filtered[5] == -1  # filtered out (size 1 < 3)


class TestGraphAnalytics:
    def setup_method(self):
        # Use the global graph_builder
        from app.graph.builder import graph_builder
        self.builder = graph_builder
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
        ]
        self.builder.build_graph(self.transactions)
        self.analytics = GraphAnalytics()
    
    def test_compute_wallet_graph_features(self):
        features = self.analytics.compute_wallet_graph_features()
        
        assert "wallet_wallet_a" in features
        assert "wallet_wallet_b" in features
        for f in features.values():
            assert "pagerank" in f
            assert "betweenness_centrality" in f
    
    def test_compute_graph_anomaly_scores(self):
        scores = self.analytics.compute_graph_anomaly_scores()
        
        assert "wallet_wallet_a" in scores
        assert 0 <= scores["wallet_wallet_a"] <= 1
    
    def test_get_transaction_flow(self):
        flow = self.analytics.get_transaction_flow("wallet_a", max_hops=2)
        
        assert isinstance(flow, list)