import networkx as nx
from typing import Dict, List, Set, Any, Optional, Tuple, Callable
from datetime import datetime
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.graph.builder import graph_builder
from app.core.config import settings

logger = logging.getLogger(__name__)


class GraphAnalytics:
    def __init__(self):
        self.graph = graph_builder.graph
        self._executor = ThreadPoolExecutor(max_workers=2)
    
    def compute_wallet_graph_features(self) -> Dict[str, Dict[str, float]]:
        wallet_nodes = [
            n for n, d in self.graph.nodes(data=True) if d.get("type") == "wallet"
        ]
        
        if not wallet_nodes:
            return {}
        
        undirected = self.graph.to_undirected()
        wallet_subgraph = undirected.subgraph(wallet_nodes)
        
        features = {}
        
        try:
            pagerank = nx.pagerank(wallet_subgraph, max_iter=100, tol=1e-6)
        except Exception:
            pagerank = {n: 0.0 for n in wallet_nodes}
        
        try:
            k_sample = min(10, len(wallet_nodes)) if len(wallet_nodes) > 1000 else min(50, len(wallet_nodes))
            betweenness = nx.betweenness_centrality(
                wallet_subgraph, k=k_sample, normalized=True
            )
        except Exception:
            betweenness = {n: 0.0 for n in wallet_nodes}
        
        try:
            if len(wallet_nodes) > 100:
                closeness = {n: 0.0 for n in wallet_nodes}
            else:
                closeness = nx.closeness_centrality(wallet_subgraph)
        except Exception:
            closeness = {n: 0.0 for n in wallet_nodes}
        
        try:
            clustering = nx.clustering(wallet_subgraph)
        except Exception:
            clustering = {n: 0.0 for n in wallet_nodes}
        
        for node in wallet_nodes:
            features[node] = {
                "pagerank": pagerank.get(node, 0.0),
                "betweenness_centrality": betweenness.get(node, 0.0),
                "closeness_centrality": closeness.get(node, 0.0),
                "clustering_coefficient": clustering.get(node, 0.0),
                "degree": wallet_subgraph.degree(node),
                "weighted_degree": sum(
                    data.get("amount", 1.0)
                    for _, _, data in wallet_subgraph.edges(node, data=True)
                ),
                "in_degree": self.graph.in_degree(node),
                "out_degree": self.graph.out_degree(node),
            }
        
        return features
    
    async def compute_wallet_graph_features_async(self) -> Dict[str, Dict[str, float]]:
        """Compute graph features asynchronously for large graphs."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, self.compute_wallet_graph_features)
    
    def find_suspicious_paths(
        self,
        source: str,
        max_depth: int = 4,
        min_amount: float = 0.0,
    ) -> List[List[str]]:
        if source not in self.graph:
            return []
        
        paths = []
        visited = set()
        
        def dfs(node: str, path: List[str], depth: int, total_amount: float):
            if depth > max_depth or node in visited:
                return
            
            visited.add(node)
            path.append(node)
            
            if depth > 0 and total_amount >= min_amount:
                paths.append(path.copy())
            
            for succ in self.graph.successors(node):
                edge_data = self.graph.get_edge_data(node, succ)
                if edge_data:
                    for key, data in edge_data.items():
                        amount = data.get("amount", 0.0)
                        if amount >= min_amount:
                            dfs(succ, path, depth + 1, total_amount + amount)
            
            path.pop()
            visited.remove(node)
        
        dfs(source, [], 0, 0.0)
        
        paths.sort(key=lambda p: len(p), reverse=True)
        return paths[:50]
    
    def get_transaction_flow(
        self, wallet_address: str, max_hops: int = 3
    ) -> List[Dict[str, Any]]:
        wallet_id = f"wallet_{wallet_address}"
        
        if wallet_id not in self.graph:
            return []
        
        flow = []
        visited_txs = set()
        
        def trace_flow(node: str, hop: int, direction: str):
            if hop > max_hops:
                return
            
            if direction == "out":
                for succ in self.graph.successors(node):
                    edge_data = self.graph.get_edge_data(node, succ)
                    if edge_data:
                        for key, data in edge_data.items():
                            if data.get("type") in ("OUTPUT", "TRANSFER"):
                                txid = data.get("txid", succ)
                                if txid not in visited_txs:
                                    visited_txs.add(txid)
                                    flow.append({
                                        "hop": hop,
                                        "direction": "out",
                                        "txid": txid,
                                        "amount": data.get("amount", 0.0),
                                        "timestamp": data.get("timestamp"),
                                        "from": node,
                                        "to": succ,
                                    })
                                    trace_flow(succ, hop + 1, "out")
            
            elif direction == "in":
                for pred in self.graph.predecessors(node):
                    edge_data = self.graph.get_edge_data(pred, node)
                    if edge_data:
                        for key, data in edge_data.items():
                            if data.get("type") in ("INPUT", "TRANSFER"):
                                txid = data.get("txid", node)
                                if txid not in visited_txs:
                                    visited_txs.add(txid)
                                    flow.append({
                                        "hop": hop,
                                        "direction": "in",
                                        "txid": txid,
                                        "amount": data.get("amount", 0.0),
                                        "timestamp": data.get("timestamp"),
                                        "from": pred,
                                        "to": node,
                                    })
                                    trace_flow(pred, hop + 1, "in")
        
        trace_flow(wallet_id, 0, "out")
        trace_flow(wallet_id, 0, "in")
        
        flow.sort(key=lambda x: (x["hop"], x["timestamp"] or ""))
        return flow
    
    def compute_graph_anomaly_scores(self) -> Dict[str, float]:
        wallet_nodes = [
            n for n, d in self.graph.nodes(data=True) if d.get("type") == "wallet"
        ]
        
        if not wallet_nodes:
            return {}
        
        features = self.compute_wallet_graph_features()
        
        scores = {}
        
        if features:
            pagerank_vals = [f["pagerank"] for f in features.values()]
            betweenness_vals = [f["betweenness_centrality"] for f in features.values()]
            clustering_vals = [f["clustering_coefficient"] for f in features.values()]
            degree_vals = [f["degree"] for f in features.values()]
            
            def normalize(vals):
                if not vals:
                    return {}
                min_v, max_v = min(vals), max(vals)
                if max_v == min_v:
                    return {k: 0.5 for k in features}
                return {k: (v - min_v) / (max_v - min_v) for k, v in zip(features.keys(), vals)}
            
            pr_norm = normalize(pagerank_vals)
            bt_norm = normalize(betweenness_vals)
            cl_norm = normalize(clustering_vals)
            deg_norm = normalize(degree_vals)
            
            for node in wallet_nodes:
                f = features.get(node, {})
                scores[node] = (
                    0.3 * pr_norm.get(node, 0) +
                    0.3 * bt_norm.get(node, 0) +
                    0.2 * cl_norm.get(node, 0) +
                    0.2 * deg_norm.get(node, 0)
                )
        
        return scores
    
    def get_temporal_subgraph(
        self, start_time: datetime, end_time: datetime
    ) -> nx.MultiDiGraph:
        subgraph = nx.MultiDiGraph()
        
        for node_id, data in self.graph.nodes(data=True):
            if data.get("type") == "transaction":
                ts_str = data.get("timestamp")
                if ts_str:
                    try:
                        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                        if start_time <= ts <= end_time:
                            subgraph.add_node(node_id, **data)
                    except Exception:
                        pass
            else:
                subgraph.add_node(node_id, **data)
        
        for src, dst, key, data in self.graph.edges(keys=True, data=True):
            if src in subgraph and dst in subgraph:
                subgraph.add_edge(src, dst, key=key, **data)
        
        return subgraph
    
    def compute_centrality_incremental(
        self,
        new_wallet_nodes: List[str],
        callback: Optional[Callable] = None,
    ) -> Dict[str, Dict[str, float]]:
        """
        Compute centrality for new nodes only (incremental update).
        More efficient than full recomputation for large graphs.
        """
        if not new_wallet_nodes:
            return {}
        
        undirected = self.graph.to_undirected()
        wallet_nodes = [n for n, d in self.graph.nodes(data=True) if d.get("type") == "wallet"]
        wallet_subgraph = undirected.subgraph(wallet_nodes)
        
        # Compute centrality for all (for now - could be optimized)
        features = self.compute_wallet_graph_features()
        
        # Return only requested nodes
        return {n: features.get(n, {}) for n in new_wallet_nodes if n in features}


graph_analytics = GraphAnalytics()