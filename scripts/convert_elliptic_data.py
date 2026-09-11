import pandas as pd
import numpy as np
import os
import argparse
import random
from datetime import datetime, timedelta

def convert_elliptic(source_dir: str, output_dir: str):
    """
    Converts the standard Kaggle Elliptic Dataset into the format
    expected by the Coinwise Forensics application.
    
    Expected input files in source_dir:
    - elliptic_txs_features.csv
    - elliptic_txs_classes.csv
    - elliptic_txs_edgelist.csv
    """
    os.makedirs(output_dir, exist_ok=True)
    print(f"Reading Elliptic dataset from {source_dir}...")
    
    # 1. Load Classes (Labels)
    classes_df = pd.read_csv(os.path.join(source_dir, 'elliptic_txs_classes.csv'))
    # Class 1 = Illicit (Anomaly), Class 2 = Licit, Class 'unknown' = Unknown
    classes_df['is_anomalous'] = classes_df['class'].apply(lambda x: True if str(x) == '1' else False)
    
    # Generate Ground Truth mapping
    ground_truth = classes_df[['txId', 'is_anomalous']].rename(columns={'txId': 'entity_id'})
    ground_truth['entity_type'] = 'transaction'
    
    # We also need wallet-level ground truth. Let's assume txId maps to an entity/wallet for simplicity in this system
    wallet_ground_truth = ground_truth.copy()
    wallet_ground_truth['entity_id'] = wallet_ground_truth['entity_id'].apply(lambda x: f"wallet_{x}")
    wallet_ground_truth['entity_type'] = 'wallet'
    
    final_ground_truth = pd.concat([ground_truth, wallet_ground_truth])
    final_ground_truth.to_csv(os.path.join(output_dir, 'ground_truth.csv'), index=False)
    print("✅ Created ground_truth.csv")
    
    # 2. Load Features (Transactions)
    # The first column is txId, the second is time step.
    features_df = pd.read_csv(os.path.join(source_dir, 'elliptic_txs_features.csv'), header=None)
    features_df.rename(columns={0: 'txId', 1: 'time_step'}, inplace=True)
    
    # 3. Load Edges (Inputs/Outputs)
    edges_df = pd.read_csv(os.path.join(source_dir, 'elliptic_txs_edgelist.csv'))
    
    print("Processing blockchain ledger...")
    # The Elliptic dataset is transaction-to-transaction edges.
    # Our system expects Wallet-to-Wallet via transactions.
    # We will simulate this by treating each edge as: txId1 -> (Wallet_txId2) -> txId2
    
    base_time = datetime.now() - timedelta(days=365)
    
    ledger_records = []
    # To keep it fast for presentation, we can process a subset or the whole thing
    for idx, row in edges_df.iterrows():
        tx_in = row['txId1']
        tx_out = row['txId2']
        
        # We need the time step for tx_in
        # (For simplicity in this script, we assign pseudo-random timestamps based on the dataset order)
        pseudo_time = base_time + timedelta(minutes=int(idx))
        
        # Our app schema expects: txid, timestamp, inputs (JSON array of addresses), outputs, input_amount, output_amount, fee
        ledger_records.append({
            'txid': f"tx_{tx_in}_{tx_out}",
            'timestamp': pseudo_time.isoformat(),
            'inputs': f'["wallet_{tx_in}"]',
            'outputs': f'["wallet_{tx_out}"]',
            'input_amount': round(random.uniform(0.1, 10.5), 4),
            'output_amount': round(random.uniform(0.1, 10.5), 4),
            'fee': round(random.uniform(0.0001, 0.005), 4)
        })
        
        if idx > 10000: # Limit to 10k transactions for fast UI demo loading
            break

    ledger_df = pd.DataFrame(ledger_records)
    ledger_df.to_csv(os.path.join(output_dir, 'blockchain_ledger.csv'), index=False)
    print("✅ Created blockchain_ledger.csv (Demo Subset)")
    
    # 4. Generate some mock network logs to match the transactions
    print("Generating network logs...")
    network_records = []
    for tx in ledger_records[:5000]: # Add network data to half of them
        network_records.append({
            'timestamp': tx['timestamp'],
            'txid': tx['txid'],
            'src_ip': f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            'dst_ip': f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            'geo_country': random.choice(['US', 'RU', 'CN', 'UK', 'DE', 'NL', 'UA'])
        })
        
    network_df = pd.DataFrame(network_records)
    network_df.to_csv(os.path.join(output_dir, 'network_logs.csv'), index=False)
    print("✅ Created network_logs.csv")
    
    print(f"\n🎉 Success! You can now drag and drop the files in '{output_dir}' into the platform.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Map Elliptic dataset to Coinwise Schema")
    parser.add_argument('--source', type=str, required=True, help="Folder containing Elliptic dataset CSVs")
    parser.add_argument('--output', type=str, default='../data/elliptic_mapped', help="Output folder")
    args = parser.parse_args()
    
    convert_elliptic(args.source, args.output)
