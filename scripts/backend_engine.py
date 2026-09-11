"""
backend_engine.py
=================
Senior Backend Engine for SIH Crypto Forensics.

Pipeline
--------
1. Ingest raw synthetic CSVs from  ../data_generator/outputs/
2. Multi-Input Heuristic Clustering (Union-Find / Disjoint-Set) to
   group wallet addresses sharing common IPs or transaction patterns
   into a single canonical Entity_ID.
3. Build a heterogeneous directed NetworkX graph over three node types:
      - "wallet"  (address)
      - "ip"      (Network_IP)
      - "tx"      (Transaction_ID)
4. Extract graph-level and network-level features:
      - In-degree / Out-degree per wallet node
      - PageRank score per wallet node
      - Transaction velocity  (txns / active-day-span)
      - IP-hopping count      (distinct IPs seen per wallet)
5. Export engineered features -> backend/processed/engineered_features.csv

Expected CSV schemas inside ../data_generator/outputs/
-------------------------------------------------------
transactions.csv  (required)
    Columns: Transaction_ID, Sender_Address, Receiver_Address,
             Amount_BTC, Timestamp, Fee_BTC, Block_Height

ip_logs.csv  (required)
    Columns: Wallet_Address, Network_IP, Timestamp

wallets.csv  (optional - enriches metadata)
    Columns: Wallet_Address, Balance_BTC, First_Seen, Last_Seen,
             Is_Exchange, Is_Mixer, Label

All paths are resolved relative to this file's location so the script
works regardless of the working directory from which it is invoked.
"""

from __future__ import annotations

import logging
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import networkx as nx
import pandas as pd

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Path constants  (all relative to this file - never to cwd)
# ---------------------------------------------------------------------------
_HERE: Path = Path(__file__).resolve().parent          # backend/
_DATA_DIR: Path = _HERE.parent / "data_generator" / "outputs"
_PROCESSED_DIR: Path = _HERE / "processed"
_OUTPUT_CSV: Path = _PROCESSED_DIR / "engineered_features.csv"

# ---------------------------------------------------------------------------
# 1.  Union-Find (Disjoint-Set Union) data structure
# ---------------------------------------------------------------------------

class UnionFind:
    """
    Weighted Union-Find with path compression and union-by-rank.

    Designed to cluster wallet addresses that share common
    Network IPs, co-spend inputs, or appear as recurring
    counterparties - the Multi-Input Heuristic.
    """

    def __init__(self) -> None:
        self._parent: Dict[str, str] = {}
        self._rank: Dict[str, int] = {}

    def _ensure(self, x: str) -> None:
        """Lazily initialise a node."""
        if x not in self._parent:
            self._parent[x] = x
            self._rank[x] = 0

    def find(self, x: str) -> str:
        """Return canonical root with path compression."""
        self._ensure(x)
        if self._parent[x] != x:
            self._parent[x] = self.find(self._parent[x])   # path compression
        return self._parent[x]

    def union(self, x: str, y: str) -> None:
        """Merge the sets containing x and y (union by rank)."""
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return
        # attach smaller tree under larger tree
        if self._rank[rx] < self._rank[ry]:
            rx, ry = ry, rx
        self._parent[ry] = rx
        if self._rank[rx] == self._rank[ry]:
            self._rank[rx] += 1

    def all_members(self) -> Dict[str, List[str]]:
        """Return mapping root -> [members]."""
        groups: Dict[str, List[str]] = defaultdict(list)
        for node in self._parent:
            groups[self.find(node)].append(node)
        return dict(groups)


# ---------------------------------------------------------------------------
# 2.  Data ingestion helpers
# ---------------------------------------------------------------------------

def _load_csv(path: Path, required_cols: List[str]) -> Optional[pd.DataFrame]:
    """
    Load a CSV from *path*. Returns None if the file does not exist.
    Raises ValueError if required columns are missing.
    """
    if not path.exists():
        log.warning("CSV not found - skipping: %s", path)
        return None
    df = pd.read_csv(path, low_memory=False)
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(
            f"{path.name}: missing required columns {missing}. "
            f"Found: {list(df.columns)}"
        )
    log.info("Loaded %-30s  rows=%d  cols=%d", path.name, len(df), len(df.columns))
    return df


def ingest_data(data_dir: Path) -> Tuple[
    pd.DataFrame, pd.DataFrame, Optional[pd.DataFrame]
]:
    """
    Read the three canonical CSVs produced by data_generator.

    Returns
    -------
    tx_df     : transactions DataFrame
    ip_df     : ip_logs DataFrame
    wallet_df : wallets DataFrame (may be None if file absent)
    """
    tx_df = _load_csv(
        data_dir / "transactions.csv",
        required_cols=[
            "Transaction_ID", "Sender_Address", "Receiver_Address",
            "Amount_BTC", "Timestamp",
        ],
    )
    ip_df = _load_csv(
        data_dir / "ip_logs.csv",
        required_cols=["Wallet_Address", "Network_IP", "Timestamp"],
    )
    wallet_df = _load_csv(
        data_dir / "wallets.csv",
        required_cols=["Wallet_Address"],
    )

    if tx_df is None or ip_df is None:
        raise FileNotFoundError(
            f"Core CSVs (transactions.csv, ip_logs.csv) not found in {data_dir}. "
            "Run the data_generator first."
        )

    # Parse timestamps
    tx_df["Timestamp"] = pd.to_datetime(tx_df["Timestamp"], errors="coerce")
    ip_df["Timestamp"] = pd.to_datetime(ip_df["Timestamp"], errors="coerce")

    return tx_df, ip_df, wallet_df


# ---------------------------------------------------------------------------
# 3.  Multi-Input Heuristic Clustering
# ---------------------------------------------------------------------------

def build_entity_clusters(
    tx_df: pd.DataFrame,
    ip_df: pd.DataFrame,
) -> pd.Series:
    """
    Multi-Input Heuristic Clustering via Union-Find.

    Heuristic rules applied (union any wallets that share):
      H1 - Common Network IP (same IP used by multiple wallets)
      H2 - Co-spend inputs   (wallets appearing together as senders
                              to the same Transaction_ID in the same block)
      H3 - Reciprocal micro-transactions (wallets that send *and* receive
                              dust amounts < 0.001 BTC to/from each other,
                              a common mixing pattern)

    Returns
    -------
    pd.Series  indexed by Wallet_Address, values are Entity_ID strings
    """
    uf = UnionFind()

    # Collect every unique wallet address first
    all_wallets: set = (
        set(tx_df["Sender_Address"].dropna())
        | set(tx_df["Receiver_Address"].dropna())
        | set(ip_df["Wallet_Address"].dropna())
    )
    for w in all_wallets:
        uf.find(w)   # ensure all wallets are initialised

    # --- H1: Common Network IP -----------------------------------------
    log.info("Applying heuristic H1: Common Network IP ...")
    ip_to_wallets: Dict[str, List[str]] = defaultdict(list)
    for _, row in ip_df.iterrows():
        ip_to_wallets[row["Network_IP"]].append(row["Wallet_Address"])

    for ip, wallets in ip_to_wallets.items():
        wallets = list(set(wallets))   # deduplicate
        for i in range(1, len(wallets)):
            uf.union(wallets[0], wallets[i])

    # --- H2: Co-spend inputs -------------------------------------------
    log.info("Applying heuristic H2: Co-spend inputs ...")
    # Group senders by (Transaction_ID) - if multiple senders share the same
    # tx (multi-input), they likely belong to the same entity / mixing service.
    tx_to_senders: Dict[str, List[str]] = defaultdict(list)
    for _, row in tx_df.iterrows():
        tx_to_senders[row["Transaction_ID"]].append(row["Sender_Address"])

    for tx_id, senders in tx_to_senders.items():
        senders = list(set(senders))
        for i in range(1, len(senders)):
            uf.union(senders[0], senders[i])

    # --- H3: Reciprocal micro-transactions -----------------------------
    log.info("Applying heuristic H3: Reciprocal micro-transactions ...")
    if "Amount_BTC" in tx_df.columns:
        dust_tx = tx_df[tx_df["Amount_BTC"] < 0.001]
        # Create ordered pairs (min, max) to detect bidirectional dust flows
        dust_pairs: set = set()
        for _, row in dust_tx.iterrows():
            sender = row["Sender_Address"]
            receiver = row["Receiver_Address"]
            if pd.notna(sender) and pd.notna(receiver):
                key = (min(sender, receiver), max(sender, receiver))
                dust_pairs.add(key)
        for a, b in dust_pairs:
            uf.union(a, b)

    # Build a wallet -> Entity_ID mapping
    root_to_entity: Dict[str, str] = {}
    entity_counter = 0

    wallet_to_entity: Dict[str, str] = {}
    for wallet in sorted(all_wallets):
        root = uf.find(wallet)
        if root not in root_to_entity:
            entity_counter += 1
            root_to_entity[root] = f"ENT_{entity_counter:06d}"
        wallet_to_entity[wallet] = root_to_entity[root]

    log.info(
        "Clustering complete: %d wallets -> %d entities",
        len(wallet_to_entity), len(root_to_entity),
    )
    return pd.Series(wallet_to_entity, name="Entity_ID")


# ---------------------------------------------------------------------------
# 4.  Heterogeneous directed graph construction
# ---------------------------------------------------------------------------

def build_heterogeneous_graph(
    tx_df: pd.DataFrame,
    ip_df: pd.DataFrame,
    wallet_to_entity: pd.Series,
) -> nx.DiGraph:
    """
    Construct a heterogeneous directed graph with three node types:
      - "wallet"  nodes (Wallet_Address)
      - "ip"      nodes (Network_IP)
      - "tx"      nodes (Transaction_ID)

    Edges and their semantics
    -------------------------
    wallet  --[SENT]-->   tx       (Sender_Address -> Transaction_ID)
    tx      --[RECV]-->   wallet   (Transaction_ID -> Receiver_Address)
    wallet  --[USED_IP]-> ip       (Wallet_Address -> Network_IP)

    Each node carries a `node_type` attribute.
    Each edge carries an `edge_type` attribute plus relevant numeric metadata.
    """
    G = nx.DiGraph()

    # Wallet nodes
    all_wallets = set(tx_df["Sender_Address"].dropna()) | set(
        tx_df["Receiver_Address"].dropna()
    )
    for w in all_wallets:
        G.add_node(
            w,
            node_type="wallet",
            entity_id=wallet_to_entity.get(w, "UNKNOWN"),
        )

    # Transaction nodes & wallet<->tx edges
    for _, row in tx_df.iterrows():
        tx_id = row["Transaction_ID"]
        sender = row["Sender_Address"]
        receiver = row["Receiver_Address"]
        amount = row.get("Amount_BTC", 0.0)
        fee = row.get("Fee_BTC", 0.0)
        ts = row.get("Timestamp", None)

        if pd.isna(tx_id):
            continue

        G.add_node(
            tx_id,
            node_type="tx",
            amount_btc=float(amount) if pd.notna(amount) else 0.0,
            fee_btc=float(fee) if pd.notna(fee) else 0.0,
            timestamp=str(ts),
        )

        if pd.notna(sender):
            G.add_edge(
                sender, tx_id,
                edge_type="SENT",
                amount_btc=float(amount) if pd.notna(amount) else 0.0,
                timestamp=str(ts),
            )

        if pd.notna(receiver):
            G.add_edge(
                tx_id, receiver,
                edge_type="RECV",
                amount_btc=float(amount) if pd.notna(amount) else 0.0,
                timestamp=str(ts),
            )

    # IP nodes & wallet->ip edges
    for _, row in ip_df.iterrows():
        wallet = row["Wallet_Address"]
        ip = row["Network_IP"]
        ts = row.get("Timestamp", None)

        if pd.isna(ip) or pd.isna(wallet):
            continue

        G.add_node(ip, node_type="ip")
        G.add_edge(
            wallet, ip,
            edge_type="USED_IP",
            timestamp=str(ts),
        )

    log.info(
        "Graph built: %d nodes  %d edges",
        G.number_of_nodes(), G.number_of_edges(),
    )
    return G


# ---------------------------------------------------------------------------
# 5.  Feature engineering
# ---------------------------------------------------------------------------

def _wallet_subgraph(G: nx.DiGraph, wallets: Iterable[str]) -> nx.DiGraph:
    """Return induced subgraph restricted to wallet->tx->wallet edges only."""
    wallet_set = set(wallets)
    tx_nodes = {n for n, d in G.nodes(data=True) if d.get("node_type") == "tx"}
    keep = wallet_set | tx_nodes
    return G.subgraph(keep).copy()


def extract_features(
    G: nx.DiGraph,
    tx_df: pd.DataFrame,
    ip_df: pd.DataFrame,
    wallet_to_entity: pd.Series,
) -> pd.DataFrame:
    """
    Compute per-wallet features:

    Graph features  (computed on the full heterogeneous graph)
    ----------------------------------------------------------
    in_degree        : #edges arriving at a wallet node (from tx nodes)
    out_degree       : #edges departing from a wallet node (to tx nodes)
    pagerank         : PageRank score (wallet-only subgraph, via tx intermediaries)

    Network features
    ----------------
    tx_velocity      : transactions per active day
                       (total_tx_count / (last_seen - first_seen).days + 1)
    ip_hop_count     : distinct Network_IPs used by this wallet
    total_sent_btc   : sum of BTC sent
    total_recv_btc   : sum of BTC received
    entity_size      : how many wallets share this entity (cluster size)
    entity_id        : canonical entity identifier

    Returns
    -------
    pd.DataFrame  indexed by Wallet_Address, one row per wallet
    """
    log.info("Extracting in/out degree features ...")
    wallet_nodes = [
        n for n, d in G.nodes(data=True) if d.get("node_type") == "wallet"
    ]

    in_deg: Dict[str, int] = {}
    out_deg: Dict[str, int] = {}
    for w in wallet_nodes:
        # Count only edges to/from tx-type nodes (ignore ip edges)
        in_deg[w] = sum(
            1 for pred in G.predecessors(w)
            if G.nodes[pred].get("node_type") == "tx"
        )
        out_deg[w] = sum(
            1 for succ in G.successors(w)
            if G.nodes[succ].get("node_type") == "tx"
        )

    # PageRank on wallet-tx subgraph
    log.info("Computing PageRank ...")
    sub = _wallet_subgraph(G, wallet_nodes)
    try:
        pr_raw = nx.pagerank(sub, alpha=0.85, max_iter=200, tol=1e-6)
    except nx.exception.PowerIterationFailedConvergence:
        log.warning("PageRank did not converge - using degree centrality fallback.")
        pr_raw = nx.degree_centrality(sub)

    pagerank = {w: pr_raw.get(w, 0.0) for w in wallet_nodes}

    # Transaction velocity
    log.info("Computing transaction velocity ...")
    tx_times: Dict[str, List[pd.Timestamp]] = defaultdict(list)
    for _, row in tx_df.iterrows():
        ts = row["Timestamp"]
        if pd.isna(ts):
            continue
        sender = row["Sender_Address"]
        receiver = row["Receiver_Address"]
        if pd.notna(sender):
            tx_times[sender].append(ts)
        if pd.notna(receiver):
            tx_times[receiver].append(ts)

    tx_velocity: Dict[str, float] = {}
    total_tx_count: Dict[str, int] = {}
    for w in wallet_nodes:
        times = tx_times.get(w, [])
        count = len(times)
        total_tx_count[w] = count
        if count == 0:
            tx_velocity[w] = 0.0
        elif count == 1:
            tx_velocity[w] = 1.0
        else:
            span_days = (max(times) - min(times)).days + 1
            tx_velocity[w] = count / span_days

    # IP hopping count
    log.info("Computing IP hopping counts ...")
    wallet_ips: Dict[str, set] = defaultdict(set)
    for _, row in ip_df.iterrows():
        wallet = row["Wallet_Address"]
        ip = row["Network_IP"]
        if pd.notna(wallet) and pd.notna(ip):
            wallet_ips[wallet].add(ip)

    ip_hop_count = {w: len(wallet_ips.get(w, set())) for w in wallet_nodes}

    # Sent / Received BTC
    log.info("Computing sent/received BTC totals ...")
    sent_btc: Dict[str, float] = defaultdict(float)
    recv_btc: Dict[str, float] = defaultdict(float)
    for _, row in tx_df.iterrows():
        amt = row.get("Amount_BTC", 0.0)
        if pd.isna(amt):
            amt = 0.0
        sender = row["Sender_Address"]
        receiver = row["Receiver_Address"]
        if pd.notna(sender):
            sent_btc[sender] += float(amt)
        if pd.notna(receiver):
            recv_btc[receiver] += float(amt)

    # Entity cluster size
    entity_sizes: Dict[str, int] = defaultdict(int)
    for w in wallet_nodes:
        eid = wallet_to_entity.get(w, "UNKNOWN")
        entity_sizes[eid] += 1

    # Assemble feature DataFrame
    log.info("Assembling feature DataFrame ...")
    records = []
    for w in wallet_nodes:
        eid = wallet_to_entity.get(w, "UNKNOWN")
        records.append(
            {
                "Wallet_Address":  w,
                "Entity_ID":       eid,
                "entity_size":     entity_sizes[eid],
                "in_degree":       in_deg[w],
                "out_degree":      out_deg[w],
                "pagerank":        round(pagerank[w], 10),
                "tx_count":        total_tx_count[w],
                "tx_velocity":     round(tx_velocity[w], 6),
                "ip_hop_count":    ip_hop_count[w],
                "total_sent_btc":  round(sent_btc.get(w, 0.0), 8),
                "total_recv_btc":  round(recv_btc.get(w, 0.0), 8),
            }
        )

    feature_df = pd.DataFrame(records).set_index("Wallet_Address")
    feature_df.sort_index(inplace=True)
    log.info("Feature matrix shape: %s", feature_df.shape)
    return feature_df


# ---------------------------------------------------------------------------
# 6.  Export
# ---------------------------------------------------------------------------

def export_features(feature_df: pd.DataFrame, output_path: Path) -> None:
    """Write the feature DataFrame to CSV, creating parent directories as needed."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    feature_df.to_csv(output_path)
    log.info("Engineered features exported -> %s", output_path)


# ---------------------------------------------------------------------------
# 7.  Graph summary / diagnostics
# ---------------------------------------------------------------------------

def log_graph_summary(G: nx.DiGraph) -> None:
    """Print a concise breakdown of node and edge types."""
    node_type_counts: Dict[str, int] = defaultdict(int)
    for _, d in G.nodes(data=True):
        node_type_counts[d.get("node_type", "unknown")] += 1

    edge_type_counts: Dict[str, int] = defaultdict(int)
    for _, _, d in G.edges(data=True):
        edge_type_counts[d.get("edge_type", "unknown")] += 1

    log.info("Graph Summary:")
    for nt, cnt in sorted(node_type_counts.items()):
        log.info("  Node type %-12s : %d", nt, cnt)
    for et, cnt in sorted(edge_type_counts.items()):
        log.info("  Edge type %-12s : %d", et, cnt)


# ---------------------------------------------------------------------------
# 8.  Main pipeline
# ---------------------------------------------------------------------------

def run_pipeline(
    data_dir: Path = _DATA_DIR,
    output_path: Path = _OUTPUT_CSV,
) -> pd.DataFrame:
    """
    Execute the full backend pipeline end-to-end.

    Parameters
    ----------
    data_dir    : directory containing transactions.csv, ip_logs.csv, wallets.csv
    output_path : destination path for engineered_features.csv

    Returns
    -------
    pd.DataFrame  with the final engineered features (also written to disk)
    """
    log.info("SIH Crypto Forensics - Backend Engine v1.0")
    log.info("Data directory  : %s", data_dir)
    log.info("Output path     : %s", output_path)

    # Step 1 - Ingest
    log.info("STEP 1: Ingesting raw CSVs ...")
    tx_df, ip_df, wallet_df = ingest_data(data_dir)

    # Step 2 - Cluster
    log.info("STEP 2: Multi-Input Heuristic Clustering (Union-Find) ...")
    wallet_to_entity = build_entity_clusters(tx_df, ip_df)

    # Step 3 - Graph
    log.info("STEP 3: Building heterogeneous directed graph ...")
    G = build_heterogeneous_graph(tx_df, ip_df, wallet_to_entity)
    log_graph_summary(G)

    # Step 4 - Features
    log.info("STEP 4: Extracting graph & network features ...")
    feature_df = extract_features(G, tx_df, ip_df, wallet_to_entity)

    # Step 5 - Export
    log.info("STEP 5: Exporting engineered features ...")
    export_features(feature_df, output_path)

    log.info("Pipeline complete.")
    return feature_df


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="SIH Crypto Forensics - Backend Engine"
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=_DATA_DIR,
        help=f"Path to CSV input directory (default: {_DATA_DIR})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=_OUTPUT_CSV,
        help=f"Path for output CSV (default: {_OUTPUT_CSV})",
    )
    args = parser.parse_args()

    try:
        features = run_pipeline(data_dir=args.data_dir, output_path=args.output)
        print(f"\nDone. Feature matrix: {features.shape[0]} wallets x {features.shape[1]} features")
        print(features.head().to_string())
    except FileNotFoundError as exc:
        log.error(str(exc))
        sys.exit(1)
