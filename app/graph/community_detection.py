import networkx as nx
from typing import Dict, List, Set, Any, Optional
import logging
import random

from app.core.config import settings

logger = logging.getLogger(__name__)


class CommunityDetector:
    def __init__(self, random_seed: int = 42):
        self.random_seed = random_seed
        random.seed(random_seed)
    
    def detect_communities_louvain(self, graph: nx.Graph) -> Dict[str, int]:
        try:
            import community as community_louvain
            
            partition = community_louvain.best_partition(graph, random_state=self.random_seed)
            
            communities = {}
            for node, comm_id in partition.items():
                communities[node] = comm_id
            
            logger.info(f"Louvain detected {len(set(partition.values()))} communities")
            return communities
        except ImportError:
            logger.warning("python-louvain not installed, falling back to greedy modularity")
            return self.detect_communities_greedy(graph)
    
    def detect_communities_greedy(self, graph: nx.Graph) -> Dict[str, int]:
        try:
            communities = list(nx.algorithms.community.greedy_modularity_communities(graph))
            
            partition = {}
            for i, comm in enumerate(communities):
                for node in comm:
                    partition[node] = i
            
            logger.info(f"Greedy modularity detected {len(communities)} communities")
            return partition
        except Exception as e:
            logger.error(f"Greedy modularity failed: {e}")
            return self.detect_communities_connected_components(graph)
    
    def detect_communities_connected_components(self, graph: nx.Graph) -> Dict[str, int]:
        components = list(nx.connected_components(graph))
        
        partition = {}
        for i, comp in enumerate(components):
            for node in comp:
                partition[node] = i
        
        logger.info(f"Connected components detected {len(components)} communities")
        return partition
    
    def detect_communities_label_propagation(self, graph: nx.Graph) -> Dict[str, int]:
        try:
            communities = list(nx.algorithms.community.label_propagation_communities(graph))
            
            partition = {}
            for i, comm in enumerate(communities):
                for node in comm:
                    partition[node] = i
            
            logger.info(f"Label propagation detected {len(communities)} communities")
            return partition
        except Exception as e:
            logger.error(f"Label propagation failed: {e}")
            return self.detect_communities_connected_components(graph)
    
    def compute_community_risk_scores(
        self,
        graph: nx.Graph,
        communities: Dict[str, int],
        node_risk_scores: Dict[str, float],
    ) -> Dict[int, float]:
        community_nodes = {}
        for node, comm_id in communities.items():
            community_nodes.setdefault(comm_id, []).append(node)
        
        risk_scores = {}
        for comm_id, nodes in community_nodes.items():
            if not nodes:
                risk_scores[comm_id] = 0.0
                continue
            
            risks = [node_risk_scores.get(n, 0.0) for n in nodes]
            avg_risk = sum(risks) / len(risks)
            max_risk = max(risks)
            
            risk_scores[comm_id] = 0.7 * avg_risk + 0.3 * max_risk
        
        return risk_scores
    
    def get_community_statistics(
        self,
        graph: nx.Graph,
        communities: Dict[str, int],
    ) -> Dict[int, Dict[str, Any]]:
        community_nodes = {}
        for node, comm_id in communities.items():
            community_nodes.setdefault(comm_id, []).append(node)
        
        stats = {}
        for comm_id, nodes in community_nodes.items():
            subgraph = graph.subgraph(nodes)
            stats[comm_id] = {
                "size": len(nodes),
                "internal_edges": subgraph.number_of_edges(),
                "external_edges": sum(
                    1 for n in nodes for _, dst in graph.edges(n) if dst not in nodes
                ),
                "density": nx.density(subgraph) if len(nodes) > 1 else 0.0,
                "avg_degree": sum(dict(subgraph.degree()).values()) / len(nodes) if nodes else 0.0,
            }
        
        return stats
    
    def filter_small_communities(
        self,
        communities: Dict[str, int],
        min_size: int = None,
    ) -> Dict[str, int]:
        min_size = min_size or settings.graph_community_min_size
        
        community_sizes = {}
        for comm_id in communities.values():
            community_sizes[comm_id] = community_sizes.get(comm_id, 0) + 1
        
        valid_communities = {cid for cid, size in community_sizes.items() if size >= min_size}
        
        filtered = {}
        for node, comm_id in communities.items():
            if comm_id in valid_communities:
                filtered[node] = comm_id
            else:
                filtered[node] = -1
        
        return filtered


community_detector = CommunityDetector()