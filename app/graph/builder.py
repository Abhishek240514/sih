import networkx as nx
from typing import List, Dict, Any, Set, Optional, Tuple
from datetime import datetime
import logging

from app.models.schemas import NormalizedTransaction, GraphNode, GraphEdge, GraphData
from app.core.config import settings

logger = logging.getLogger(__name__)


class GraphBuilder:
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.max_nodes = settings.graph_max_nodes
        self.max_edges = settings.graph_max_edges
    
    def build_graph(
        self,
        transactions: List[NormalizedTransaction],
        wallet_features: Dict[str, Any] = None,
    ) -> nx.MultiDiGraph:
        self.graph.clear()
        wallet_features = wallet_features or {}
        
        wallet_nodes = set()
        ip_nodes = set()
        asn_nodes = set()
        country_nodes = set()
        tx_nodes = set()
        
        for tx in transactions:
            if len(self.graph.nodes()) >= self.max_nodes:
                logger.warning(f"Max nodes ({self.max_nodes}) reached, stopping graph construction")
                break
            
            tx_id = f"tx_{tx.txid}"
            if tx_id not in tx_nodes:
                self.graph.add_node(
                    tx_id,
                    type="transaction",
                    label=tx.txid[:16] + "...",
                    txid=tx.txid,
                    timestamp=tx.timestamp.isoformat(),
                    input_amount=tx.input_amount,
                    output_amount=tx.output_amount,
                    fee=tx.fee,
                    script_type=tx.script_type,
                )
                tx_nodes.add(tx_id)
            
            for addr in tx.inputs:
                wallet_id = f"wallet_{addr}"
                if wallet_id not in wallet_nodes:
                    wf = wallet_features.get(addr, {})
                    risk_score = wf.get("risk_score", 0.0) if isinstance(wf, dict) else getattr(wf, "risk_score", 0.0)
                    self.graph.add_node(
                        wallet_id,
                        type="wallet",
                        label=addr[:16] + "...",
                        address=addr,
                        risk_score=risk_score,
                        transaction_count=wf.get("transaction_count", 0) if isinstance(wf, dict) else getattr(wf, "transaction_count", 0),
                    )
                    wallet_nodes.add(wallet_id)
                
                if len(self.graph.edges()) < self.max_edges:
                    self.graph.add_edge(
                        wallet_id,
                        tx_id,
                        type="INPUT",
                        amount=tx.input_amount / max(len(tx.inputs), 1),
                        timestamp=tx.timestamp.isoformat(),
                        confidence=1.0,
                    )
            
            for addr in tx.outputs:
                wallet_id = f"wallet_{addr}"
                if wallet_id not in wallet_nodes:
                    wf = wallet_features.get(addr, {})
                    risk_score = wf.get("risk_score", 0.0) if isinstance(wf, dict) else getattr(wf, "risk_score", 0.0)
                    self.graph.add_node(
                        wallet_id,
                        type="wallet",
                        label=addr[:16] + "...",
                        address=addr,
                        risk_score=risk_score,
                        transaction_count=wf.get("transaction_count", 0) if isinstance(wf, dict) else getattr(wf, "transaction_count", 0),
                    )
                    wallet_nodes.add(wallet_id)
                
                if len(self.graph.edges()) < self.max_edges:
                    self.graph.add_edge(
                        tx_id,
                        wallet_id,
                        type="OUTPUT",
                        amount=tx.output_amount / max(len(tx.outputs), 1),
                        timestamp=tx.timestamp.isoformat(),
                        confidence=1.0,
                    )
            
            for ip in tx.source_ips:
                ip_id = f"ip_{ip}"
                if ip_id not in ip_nodes:
                    self.graph.add_node(
                        ip_id,
                        type="ip",
                        label=ip,
                        address=ip,
                    )
                    ip_nodes.add(ip_id)
                
                if len(self.graph.edges()) < self.max_edges:
                    self.graph.add_edge(
                        ip_id,
                        tx_id,
                        type="OBSERVED_SOURCE",
                        timestamp=tx.timestamp.isoformat(),
                        confidence=0.7,
                    )
            
            for ip in tx.destination_ips:
                ip_id = f"ip_{ip}"
                if ip_id not in ip_nodes:
                    self.graph.add_node(
                        ip_id,
                        type="ip",
                        label=ip,
                        address=ip,
                    )
                    ip_nodes.add(ip_id)
                
                if len(self.graph.edges()) < self.max_edges:
                    self.graph.add_edge(
                        tx_id,
                        ip_id,
                        type="OBSERVED_DEST",
                        timestamp=tx.timestamp.isoformat(),
                        confidence=0.7,
                    )
            
            if tx.asn:
                asn_id = f"asn_{tx.asn}"
                if asn_id not in asn_nodes:
                    self.graph.add_node(
                        asn_id,
                        type="asn",
                        label=tx.asn,
                        asn=tx.asn,
                    )
                    asn_nodes.add(asn_id)
                
                for ip in tx.source_ips + tx.destination_ips:
                    ip_id = f"ip_{ip}"
                    if ip_id in ip_nodes and len(self.graph.edges()) < self.max_edges:
                        self.graph.add_edge(
                            ip_id,
                            asn_id,
                            type="BELONGS_TO_ASN",
                            confidence=0.9,
                        )
            
            if tx.geo_country:
                country_id = f"country_{tx.geo_country}"
                if country_id not in country_nodes:
                    self.graph.add_node(
                        country_id,
                        type="country",
                        label=tx.geo_country,
                        country_code=tx.geo_country,
                    )
                    country_nodes.add(country_id)
                
                for ip in tx.source_ips + tx.destination_ips:
                    ip_id = f"ip_{ip}"
                    if ip_id in ip_nodes and len(self.graph.edges()) < self.max_edges:
                        self.graph.add_edge(
                            ip_id,
                            country_id,
                            type="LOCATED_IN",
                            confidence=0.8,
                        )
        
        self._add_wallet_to_wallet_edges(transactions)
        
        logger.info(
            f"Graph built: {self.graph.number_of_nodes()} nodes, "
            f"{self.graph.number_of_edges()} edges"
        )
        
        return self.graph
    
    def _add_wallet_to_wallet_edges(self, transactions: List[NormalizedTransaction]) -> None:
        for tx in transactions:
            for input_addr in tx.inputs:
                for output_addr in tx.outputs:
                    if input_addr != output_addr:
                        src_id = f"wallet_{input_addr}"
                        dst_id = f"wallet_{output_addr}"
                        
                        if src_id in self.graph and dst_id in self.graph:
                            if len(self.graph.edges()) < self.max_edges:
                                amount = tx.output_amount / max(len(tx.outputs), 1)
                                self.graph.add_edge(
                                    src_id,
                                    dst_id,
                                    type="TRANSFER",
                                    txid=tx.txid,
                                    amount=amount,
                                    timestamp=tx.timestamp.isoformat(),
                                    confidence=0.8,
                                )
    
    def get_neighborhood(
        self,
        entity_id: str,
        depth: int = 2,
        max_nodes: int = 100,
        max_edges: int = 200,
    ) -> GraphData:
        if entity_id not in self.graph:
            return GraphData(nodes=[], edges=[])
        
        nodes = {entity_id}
        current_level = {entity_id}
        
        for _ in range(depth):
            next_level = set()
            for node in current_level:
                if len(nodes) >= max_nodes:
                    break
                successors = set(self.graph.successors(node))
                predecessors = set(self.graph.predecessors(node))
                neighbors = successors | predecessors
                next_level.update(neighbors)
                nodes.update(neighbors)
            current_level = next_level
            if len(nodes) >= max_nodes:
                break
        
        nodes = list(nodes)[:max_nodes]
        subgraph = self.graph.subgraph(nodes)
        
        graph_nodes = []
        for node_id, data in subgraph.nodes(data=True):
            graph_nodes.append(GraphNode(
                id=node_id,
                type=data.get("type", "unknown"),
                label=data.get("label", node_id),
                risk_score=data.get("risk_score", 0.0),
                metadata={k: v for k, v in data.items() if k not in ("type", "label", "risk_score")},
            ))
        
        graph_edges = []
        for src, dst, key, data in subgraph.edges(keys=True, data=True):
            if len(graph_edges) >= max_edges:
                break
            graph_edges.append(GraphEdge(
                source=src,
                target=dst,
                type=data.get("type", "UNKNOWN"),
                amount=data.get("amount"),
                timestamp=data.get("timestamp"),
                confidence=data.get("confidence", 1.0),
                relationship_type=data.get("type", ""),
            ))
        
        return GraphData(nodes=graph_nodes, edges=graph_edges)
    
    def get_shortest_path(
        self, source: str, target: str
    ) -> Optional[List[str]]:
        try:
            if source in self.graph and target in self.graph:
                return nx.shortest_path(self.graph.to_undirected(), source, target)
        except nx.NetworkXNoPath:
            pass
        return None
    
    def get_connected_components(self) -> List[Set[str]]:
        undirected = self.graph.to_undirected()
        return list(nx.connected_components(undirected))
    
    def get_k_hop_neighbors(self, node_id: str, k: int = 2) -> Set[str]:
        if node_id not in self.graph:
            return set()
        
        neighbors = {node_id}
        current = {node_id}
        
        for _ in range(k):
            next_level = set()
            for n in current:
                next_level.update(self.graph.successors(n))
                next_level.update(self.graph.predecessors(n))
            neighbors.update(next_level)
            current = next_level
        
        return neighbors
    
    def compute_centrality_metrics(self) -> Dict[str, Dict[str, float]]:
        undirected = self.graph.to_undirected()
        wallet_nodes = [n for n, d in self.graph.nodes(data=True) if d.get("type") == "wallet"]
        
        if not wallet_nodes:
            return {}
        
        subgraph = undirected.subgraph(wallet_nodes)
        
        metrics = {}
        
        try:
            pagerank = nx.pagerank(subgraph, max_iter=100)
            for node, score in pagerank.items():
                metrics.setdefault(node, {})["pagerank"] = score
        except Exception:
            pass
        
        try:
            betweenness = nx.betweenness_centrality(subgraph, k=min(100, len(wallet_nodes)))
            for node, score in betweenness.items():
                metrics.setdefault(node, {})["betweenness_centrality"] = score
        except Exception:
            pass
        
        try:
            closeness = nx.closeness_centrality(subgraph)
            for node, score in closeness.items():
                metrics.setdefault(node, {})["closeness_centrality"] = score
        except Exception:
            pass
        
        try:
            clustering = nx.clustering(subgraph)
            for node, score in clustering.items():
                metrics.setdefault(node, {})["clustering_coefficient"] = score
        except Exception:
            pass
        
        for node in wallet_nodes:
            metrics.setdefault(node, {})
            metrics[node]["degree"] = subgraph.degree(node)
            metrics[node]["weighted_degree"] = sum(
                data.get("amount", 1.0) for _, _, data in subgraph.edges(node, data=True)
            )
            metrics[node]["in_degree"] = self.graph.in_degree(node)
            metrics[node]["out_degree"] = self.graph.out_degree(node)
        
        return metrics
    
    def export_to_dict(self) -> Dict[str, Any]:
        nodes = []
        for node_id, data in self.graph.nodes(data=True):
            nodes.append({"id": node_id, **data})
        
        edges = []
        for src, dst, key, data in self.graph.edges(keys=True, data=True):
            edges.append({"source": src, "target": dst, "key": key, **data})
        
        return {"nodes": nodes, "edges": edges}


graph_builder = GraphBuilder()