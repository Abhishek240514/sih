#!/usr/bin/env python3
"""
Synthetic Bitcoin Forensic Dataset Generator

Generates realistic synthetic Bitcoin transaction data with network metadata
for testing and development of the forensic intelligence system.
"""

import json
import csv
import random
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
import uuid
import ipaddress
from faker import Faker

fake = Faker()
random.seed(42)
Faker.seed(42)


SCRIPT_TYPES = ["P2PKH", "P2SH", "P2WPKH", "P2WSH", "P2TR"]
COUNTRIES = ["US", "CN", "RU", "DE", "GB", "JP", "KR", "BR", "IN", "NL", "FR", "SG", "HK", "CH", "CA"]
ASNS = [
    "AS15169", "AS16509", "AS13335", "AS8075", "AS32934", "AS36692", "AS45090",
    "AS14061", "AS20940", "AS24940", "AS36351", "AS396982", "AS39891", "AS39962"
]

NORMAL_WALLETS = 5000
SUSPICIOUS_WALLETS = 500


def generate_bitcoin_address() -> str:
    prefix = random.choice(["1", "3", "bc1"])
    if prefix == "bc1":
        return "bc1" + "".join(random.choices("qpzry9x8gf2tvdw0s3jn54khce6mua7l", k=39))
    else:
        return prefix + "".join(random.choices("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", k=33))


def generate_txid() -> str:
    return "".join(random.choices("0123456789abcdef", k=64))


def generate_ip() -> str:
    return str(ipaddress.IPv4Address(random.randint(0x01000000, 0xFFFFFFFF)))


def generate_private_ip() -> str:
    ranges = [
        (0x0A000000, 0x0AFFFFFF),
        (0xAC100000, 0xAC1FFFFF),
        (0xC0A80000, 0xC0A8FFFF),
    ]
    start, end = random.choice(ranges)
    return str(ipaddress.IPv4Address(random.randint(start, end)))


def random_amount(min_val: float = 0.0001, max_val: float = 10.0) -> float:
    return round(random.uniform(min_val, max_val), 8)


def generate_normal_transaction(
    wallets: List[str],
    start_time: datetime,
    day_offset: int,
) -> Dict[str, Any]:
    txid = generate_txid()
    timestamp = start_time + timedelta(days=day_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))
    
    input_count = random.randint(1, 3)
    output_count = random.randint(1, 3)
    
    input_wallets = random.sample(wallets, min(input_count, len(wallets)))
    output_wallets = random.sample(wallets, min(output_count, len(wallets)))
    
    input_amounts = [random_amount(0.001, 1.0) for _ in input_wallets]
    output_amounts = [random_amount(0.001, 1.0) for _ in output_wallets]
    
    total_in = sum(input_amounts)
    total_out = sum(output_amounts)
    fee = round(max(total_in - total_out, 0.0001), 8)
    
    if total_out > total_in:
        output_amounts[-1] = round(output_amounts[-1] - (total_out - total_in) - fee, 8)
    
    has_network = random.random() < 0.7
    
    return {
        "txid": txid,
        "timestamp": timestamp.isoformat() + "Z",
        "input_addresses": input_wallets,
        "output_addresses": output_wallets,
        "input_amounts": input_amounts,
        "output_amounts": output_amounts,
        "fee": fee,
        "script_type": random.choice(SCRIPT_TYPES),
        "src_ip": generate_ip() if has_network else None,
        "dst_ip": generate_ip() if has_network else None,
        "src_port": random.randint(1024, 65535) if has_network else None,
        "dst_port": 8333 if has_network else None,
        "geo_country": random.choice(COUNTRIES) if has_network else None,
        "asn": random.choice(ASNS) if has_network else None,
    }


def generate_burst_activity(
    wallets: List[str],
    start_time: datetime,
    day_offset: int,
    burst_wallet: str,
) -> List[Dict[str, Any]]:
    transactions = []
    num_txs = random.randint(10, 30)
    base_time = start_time + timedelta(days=day_offset, hours=random.randint(0, 23))
    
    for i in range(num_txs):
        timestamp = base_time + timedelta(minutes=i * random.randint(1, 5))
        
        input_wallets = [burst_wallet] if random.random() < 0.8 else random.sample(wallets, 2)
        output_wallets = random.sample(wallets, random.randint(1, 3))
        
        input_amounts = [random_amount(0.01, 0.5) for _ in input_wallets]
        output_amounts = [random_amount(0.01, 0.5) for _ in output_wallets]
        
        total_in = sum(input_amounts)
        total_out = sum(output_amounts)
        fee = round(max(total_in - total_out, 0.0001), 8)
        
        txid = generate_txid()
        
        transactions.append({
            "txid": txid,
            "timestamp": timestamp.isoformat() + "Z",
            "input_addresses": input_wallets,
            "output_addresses": output_wallets,
            "input_amounts": input_amounts,
            "output_amounts": output_amounts,
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "src_ip": generate_ip(),
            "dst_ip": generate_ip(),
            "src_port": random.randint(1024, 65535),
            "dst_port": 8333,
            "geo_country": random.choice(COUNTRIES),
            "asn": random.choice(ASNS),
        })
    
    return transactions


def generate_fan_out(
    wallets: List[str],
    start_time: datetime,
    day_offset: int,
    source_wallet: str,
) -> List[Dict[str, Any]]:
    transactions = []
    num_outputs = random.randint(15, 50)
    base_time = start_time + timedelta(days=day_offset, hours=random.randint(0, 23))
    
    for i in range(num_outputs):
        timestamp = base_time + timedelta(minutes=i * random.randint(5, 30))
        
        output_wallets = [random.choice(wallets) for _ in range(random.randint(1, 3))]
        input_amount = random_amount(0.1, 2.0)
        output_amounts = [round(input_amount / len(output_wallets) * random.uniform(0.9, 1.0), 8) for _ in output_wallets]
        
        total_out = sum(output_amounts)
        fee = round(max(input_amount - total_out, 0.0001), 8)
        
        txid = generate_txid()
        
        transactions.append({
            "txid": txid,
            "timestamp": timestamp.isoformat() + "Z",
            "input_addresses": [source_wallet],
            "output_addresses": output_wallets,
            "input_amounts": [input_amount],
            "output_amounts": output_amounts,
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "src_ip": generate_ip(),
            "dst_ip": generate_ip(),
            "src_port": random.randint(1024, 65535),
            "dst_port": 8333,
            "geo_country": random.choice(COUNTRIES),
            "asn": random.choice(ASNS),
        })
    
    return transactions


def generate_fan_in(
    wallets: List[str],
    start_time: datetime,
    day_offset: int,
    target_wallet: str,
) -> List[Dict[str, Any]]:
    transactions = []
    num_inputs = random.randint(15, 50)
    base_time = start_time + timedelta(days=day_offset, hours=random.randint(0, 23))
    
    for i in range(num_inputs):
        timestamp = base_time + timedelta(minutes=i * random.randint(5, 30))
        
        input_wallets = [random.choice(wallets) for _ in range(random.randint(1, 3))]
        output_amount = random_amount(0.1, 2.0)
        input_amounts = [round(output_amount / len(input_wallets) * random.uniform(0.9, 1.0), 8) for _ in input_wallets]
        
        total_in = sum(input_amounts)
        fee = round(max(total_in - output_amount, 0.0001), 8)
        
        txid = generate_txid()
        
        transactions.append({
            "txid": txid,
            "timestamp": timestamp.isoformat() + "Z",
            "input_addresses": input_wallets,
            "output_addresses": [target_wallet],
            "input_amounts": input_amounts,
            "output_amounts": [output_amount],
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "src_ip": generate_ip(),
            "dst_ip": generate_ip(),
            "src_port": random.randint(1024, 65535),
            "dst_port": 8333,
            "geo_country": random.choice(COUNTRIES),
            "asn": random.choice(ASNS),
        })
    
    return transactions


def generate_layering(
    wallets: List[str],
    start_time: datetime,
    day_offset: int,
    source_wallet: str,
) -> List[Dict[str, Any]]:
    transactions = []
    num_hops = random.randint(5, 15)
    current_wallet = source_wallet
    base_time = start_time + timedelta(days=day_offset, hours=random.randint(0, 23))
    
    for i in range(num_hops):
        timestamp = base_time + timedelta(hours=i * random.randint(1, 6))
        
        next_wallet = generate_bitcoin_address()
        wallets.append(next_wallet)
        
        amount = random_amount(0.1, 1.0)
        fee = round(amount * random.uniform(0.001, 0.01), 8)
        
        txid = generate_txid()
        
        transactions.append({
            "txid": txid,
            "timestamp": timestamp.isoformat() + "Z",
            "input_addresses": [current_wallet],
            "output_addresses": [next_wallet],
            "input_amounts": [amount],
            "output_amounts": [round(amount - fee, 8)],
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "src_ip": generate_ip(),
            "dst_ip": generate_ip(),
            "src_port": random.randint(1024, 65535),
            "dst_port": 8333,
            "geo_country": random.choice(COUNTRIES),
            "asn": random.choice(ASNS),
        })
        
        current_wallet = next_wallet
    
    return transactions


def generate_geographic_anomaly(
    wallets: List[str],
    start_time: datetime,
    day_offset: int,
    wallet: str,
) -> List[Dict[str, Any]]:
    transactions = []
    num_txs = random.randint(5, 15)
    base_time = start_time + timedelta(days=day_offset, hours=random.randint(0, 23))
    
    countries = random.sample(COUNTRIES, min(5, len(COUNTRIES)))
    
    for i in range(num_txs):
        timestamp = base_time + timedelta(hours=i * random.randint(1, 12))
        
        country = random.choice(countries)
        asn = random.choice(ASNS)
        
        input_wallets = [wallet] if random.random() < 0.5 else random.sample(wallets, 2)
        output_wallets = random.sample(wallets, random.randint(1, 3))
        
        input_amounts = [random_amount(0.01, 1.0) for _ in input_wallets]
        output_amounts = [random_amount(0.01, 1.0) for _ in output_wallets]
        
        total_in = sum(input_amounts)
        total_out = sum(output_amounts)
        fee = round(max(total_in - total_out, 0.0001), 8)
        
        txid = generate_txid()
        
        transactions.append({
            "txid": txid,
            "timestamp": timestamp.isoformat() + "Z",
            "input_addresses": input_wallets,
            "output_addresses": output_wallets,
            "input_amounts": input_amounts,
            "output_amounts": output_amounts,
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "src_ip": generate_ip(),
            "dst_ip": generate_ip(),
            "src_port": random.randint(1024, 65535),
            "dst_port": 8333,
            "geo_country": country,
            "asn": asn,
        })
    
    return transactions


def generate_shared_infrastructure(
    wallets: List[str],
    start_time: datetime,
    day_offset: int,
    shared_ip: str,
    wallet_group: List[str],
) -> List[Dict[str, Any]]:
    transactions = []
    num_txs = random.randint(10, 30)
    base_time = start_time + timedelta(days=day_offset, hours=random.randint(0, 23))
    
    for i in range(num_txs):
        timestamp = base_time + timedelta(minutes=i * random.randint(10, 60))
        
        wallet = random.choice(wallet_group)
        input_wallets = [wallet]
        output_wallets = random.sample(wallets, random.randint(1, 3))
        
        input_amounts = [random_amount(0.01, 1.0)]
        output_amounts = [random_amount(0.01, 1.0) for _ in output_wallets]
        
        total_in = sum(input_amounts)
        total_out = sum(output_amounts)
        fee = round(max(total_in - total_out, 0.0001), 8)
        
        txid = generate_txid()
        
        transactions.append({
            "txid": txid,
            "timestamp": timestamp.isoformat() + "Z",
            "input_addresses": input_wallets,
            "output_addresses": output_wallets,
            "input_amounts": input_amounts,
            "output_amounts": output_amounts,
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "src_ip": shared_ip,
            "dst_ip": generate_ip(),
            "src_port": random.randint(1024, 65535),
            "dst_port": 8333,
            "geo_country": random.choice(COUNTRIES),
            "asn": random.choice(ASNS),
        })
    
    return transactions


def generate_dataset(
    num_transactions: int = 100000,
    num_wallets: int = 30000,
    num_days: int = 30,
    output_format: str = "json",
    output_path: str = "data/sample/dataset.json",
) -> Dict[str, Any]:
    print(f"Generating dataset: {num_transactions} transactions, {num_wallets} wallets, {num_days} days")
    
    start_time = datetime.utcnow() - timedelta(days=num_days)
    
    normal_wallets = [generate_bitcoin_address() for _ in range(NORMAL_WALLETS)]
    suspicious_wallets = [generate_bitcoin_address() for _ in range(SUSPICIOUS_WALLETS)]
    all_wallets = normal_wallets + suspicious_wallets
    
    transactions = []
    labels = {}
    
    print("Generating normal transactions...")
    normal_tx_count = int(num_transactions * 0.7)
    for _ in range(normal_tx_count):
        day = random.randint(0, num_days - 1)
        tx = generate_normal_transaction(all_wallets, start_time, day)
        transactions.append(tx)
        labels[tx["txid"]] = "normal"
    
    print("Generating burst activity...")
    burst_wallets = random.sample(suspicious_wallets, 50)
    for wallet in burst_wallets:
        day = random.randint(0, num_days - 1)
        burst_txs = generate_burst_activity(all_wallets, start_time, day, wallet)
        for tx in burst_txs:
            transactions.append(tx)
            labels[tx["txid"]] = "burst"
    
    print("Generating fan-out patterns...")
    fanout_wallets = random.sample(suspicious_wallets, 30)
    for wallet in fanout_wallets:
        day = random.randint(0, num_days - 1)
        fanout_txs = generate_fan_out(all_wallets, start_time, day, wallet)
        for tx in fanout_txs:
            transactions.append(tx)
            labels[tx["txid"]] = "fan_out"
    
    print("Generating fan-in patterns...")
    fanin_wallets = random.sample(suspicious_wallets, 30)
    for wallet in fanin_wallets:
        day = random.randint(0, num_days - 1)
        fanin_txs = generate_fan_in(all_wallets, start_time, day, wallet)
        for tx in fanin_txs:
            transactions.append(tx)
            labels[tx["txid"]] = "fan_in"
    
    print("Generating layering/peeling chains...")
    layer_wallets = random.sample(suspicious_wallets, 20)
    for wallet in layer_wallets:
        day = random.randint(0, num_days - 1)
        layer_txs = generate_layering(all_wallets, start_time, day, wallet)
        for tx in layer_txs:
            transactions.append(tx)
            labels[tx["txid"]] = "layering"
    
    print("Generating geographic anomalies...")
    geo_wallets = random.sample(suspicious_wallets, 20)
    for wallet in geo_wallets:
        day = random.randint(0, num_days - 1)
        geo_txs = generate_geographic_anomaly(all_wallets, start_time, day, wallet)
        for tx in geo_txs:
            transactions.append(tx)
            labels[tx["txid"]] = "geographic_anomaly"
    
    print("Generating shared infrastructure...")
    shared_ips = [generate_private_ip() for _ in range(10)]
    for shared_ip in shared_ips:
        group_size = random.randint(5, 15)
        wallet_group = random.sample(all_wallets, group_size)
        day = random.randint(0, num_days - 1)
        shared_txs = generate_shared_infrastructure(all_wallets, start_time, day, shared_ip, wallet_group)
        for tx in shared_txs:
            transactions.append(tx)
            labels[tx["txid"]] = "shared_infrastructure"
    
    random.shuffle(transactions)
    transactions = transactions[:num_transactions]
    
    print(f"Generated {len(transactions)} transactions")
    
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    if output_format == "json":
        with open(output_path, "w") as f:
            json.dump(transactions, f, indent=2)
    elif output_format == "csv":
        if transactions:
            fieldnames = list(transactions[0].keys())
            with open(output_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(transactions)
    elif output_format == "xml":
        root = ET.Element("transactions")
        for tx in transactions:
            tx_elem = ET.SubElement(root, "transaction")
            for key, value in tx.items():
                if isinstance(value, list):
                    list_elem = ET.SubElement(tx_elem, key)
                    for item in value:
                        item_elem = ET.SubElement(list_elem, "item")
                        item_elem.text = str(item)
                else:
                    child = ET.SubElement(tx_elem, key)
                    child.text = str(value) if value is not None else ""
        tree = ET.ElementTree(root)
        tree.write(output_path, encoding="utf-8", xml_declaration=True)
    
    labels_path = output_path.with_suffix(".labels.json")
    with open(labels_path, "w") as f:
        json.dump(labels, f, indent=2)
    
    print(f"Dataset saved to {output_path}")
    print(f"Labels saved to {labels_path}")
    
    label_counts = {}
    for label in labels.values():
        label_counts[label] = label_counts.get(label, 0) + 1
    print(f"Label distribution: {label_counts}")
    
    return {
        "transactions": len(transactions),
        "wallets": len(set(w for tx in transactions for w in tx["input_addresses"] + tx["output_addresses"])),
        "labels": label_counts,
    }


if __name__ == "__main__":
    import xml.etree.ElementTree as ET
    
    parser = argparse.ArgumentParser(description="Generate synthetic Bitcoin forensic dataset")
    parser.add_argument("--transactions", type=int, default=100000, help="Number of transactions")
    parser.add_argument("--wallets", type=int, default=30000, help="Number of wallets")
    parser.add_argument("--days", type=int, default=30, help="Number of days")
    parser.add_argument("--format", choices=["json", "csv", "xml"], default="json", help="Output format")
    parser.add_argument("--output", type=str, default="data/sample/dataset.json", help="Output file path")
    
    args = parser.parse_args()
    
    generate_dataset(
        num_transactions=args.transactions,
        num_wallets=args.wallets,
        num_days=args.days,
        output_format=args.format,
        output_path=args.output,
    )