#!/usr/bin/env python3
"""
Deterministic Synthetic Ground Truth Dataset Generator
=======================================================

Creates a reproducible synthetic dataset with known ground truth for testing.
NO special address prefixes (1Peel, 3Mix, 1Ext) are used - all addresses
are normal-looking random Bitcoin addresses.

Ground truth is stored SEPARATELY from the data.

Patterns included:
1. Normal activity
2. Peeling chain (sequential peel-off)
3. Mixing-like structure (fan-in/fan-out with uniform outputs)
4. High velocity burst
5. Dormant-to-active
6. Geographic anomaly
7. Shared infrastructure
8. False positive cases (normal but unusual-looking)
"""

import csv
import json
import hashlib
import random
import string
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass, field


# Configuration - deterministic seed
SEED = 42
random.seed(SEED)

# Output directory
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "ground_truth"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Dataset parameters
N_NORMAL_ENTITIES = 100
N_NORMAL_TXS = 500
PEELING_CHAIN_LENGTH = 8
MIXER_FAN_IN = 12
MIXER_FAN_OUT = 12
BURST_COUNT = 20
DORMANT_ENTITIES = 5
GEO_ANOMALY_ENTITIES = 3
SHARED_INFRA_GROUPS = 3
FALSE_POSITIVE_ENTITIES = 5

SCRIPT_TYPES = ["P2PKH", "P2SH", "P2WPKH", "P2WSH", "P2TR"]
COUNTRIES = ["US", "DE", "NL", "RU", "CN", "JP", "KR", "GB", "FR", "BR", "IN", "SG", "AU", "CA", "CH"]
ASN_POOL = [f"AS{random.randint(1000, 65000)}" for _ in range(100)]

BASE_TIME = datetime(2025, 1, 1, 0, 0, 0)


@dataclass
class GroundTruthLabel:
    entity_id: str
    pattern_type: str
    label: int  # 0 = normal, 1 = suspicious
    details: Dict[str, Any] = field(default_factory=dict)


def _rand_btc_address() -> str:
    """Generate a realistic-looking Bitcoin address."""
    prefix = random.choice(["1", "3", "bc1q"])
    if prefix == "bc1q":
        # Bech32-like (simplified)
        chars = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
        return prefix + "".join(random.choices(chars, k=39))
    else:
        # Base58-like (simplified)
        chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
        return prefix + "".join(random.choices(chars, k=33))


def _rand_ip() -> str:
    return f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def _rand_port(ephemeral: bool = False) -> int:
    if ephemeral:
        return random.randint(49152, 65535)
    return random.choice([8333, 8332, 18333, 18332, 443, 80, 9735])


def _txid() -> str:
    return hashlib.sha256(uuid.uuid4().bytes).hexdigest()


def _fmt_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _json_list(items: list) -> str:
    return json.dumps(items)


# Storage
ledger_rows: List[Dict] = []
network_rows: List[Dict] = []
ground_truth_labels: List[GroundTruthLabel] = []


def _add_ledger(txid_val, in_addrs, out_addrs, in_amts, out_amts, fee, script):
    ledger_rows.append({
        "txid": txid_val,
        "input_addresses": _json_list(in_addrs),
        "output_addresses": _json_list(out_addrs),
        "input_amounts": _json_list(in_amts),
        "output_amounts": _json_list(out_amts),
        "fee": round(fee, 8),
        "script_type": script,
    })


def _add_network(txid_val, ts, src_ip=None, dst_ip=None, geo=None, asn=None):
    network_rows.append({
        "timestamp": _fmt_ts(ts),
        "src_ip": src_ip or _rand_ip(),
        "dst_ip": dst_ip or _rand_ip(),
        "src_port": _rand_port(ephemeral=True),
        "dst_port": _rand_port(),
        "txid": txid_val,
        "geo_country": geo or random.choice(COUNTRIES),
        "asn": asn or random.choice(ASN_POOL),
    })


def _register_label(entity_id: str, pattern_type: str, label: int, details: Dict = None):
    ground_truth_labels.append(GroundTruthLabel(
        entity_id=entity_id,
        pattern_type=pattern_type,
        label=label,
        details=details or {}
    ))


# ============================================================
# 1. NORMAL TRAFFIC
# ============================================================

def generate_normal_traffic():
    entity_addrs: Dict[str, List[str]] = {}
    for i in range(N_NORMAL_ENTITIES):
        eid = f"entity_normal_{i:04d}"
        n_addrs = random.randint(1, 5)
        addrs = [_rand_btc_address() for _ in range(n_addrs)]
        entity_addrs[eid] = addrs
        _register_label(eid, "wallet", 0)

    entities = list(entity_addrs.keys())

    for _ in range(N_NORMAL_TXS):
        sender = random.choice(entities)
        receiver = random.choice(entities)
        n_in = random.randint(1, min(3, len(entity_addrs[sender])))
        in_addrs = random.sample(entity_addrs[sender], n_in)
        n_out = random.randint(1, min(2, len(entity_addrs[receiver])))
        out_addrs = random.sample(entity_addrs[receiver], n_out)
        if random.random() < 0.6:
            change_addr = random.choice(entity_addrs[sender])
            out_addrs.append(change_addr)

        total_in = round(random.uniform(0.001, 5.0), 8)
        fee = round(total_in * random.uniform(0.0001, 0.005), 8)
        total_out = round(total_in - fee, 8)
        in_amts = [round(total_in / n_in, 8)] * n_in
        out_amts = [round(total_out / len(out_addrs), 8)] * len(out_addrs)

        tid = _txid()
        script = random.choice(SCRIPT_TYPES)
        _add_ledger(tid, in_addrs, out_addrs, in_amts, out_amts, fee, script)
        _add_network(tid, BASE_TIME + timedelta(hours=random.randint(0, 8760)))


# ============================================================
# 2. PEELING CHAIN
# ============================================================

def generate_peeling_chain():
    """Peeling chain with normal-looking addresses."""
    chain_id = "entity_peeling_chain"
    _register_label(chain_id, "peeling_chain", 1, {
        "chain_length": PEELING_CHAIN_LENGTH,
        "initial_balance": 0,
        "peel_amount": 0,
    })

    balance = round(random.uniform(15.0, 50.0), 8)
    peel_amount = round(random.uniform(0.05, 0.25), 8)
    current_addr = _rand_btc_address()
    ts = BASE_TIME + timedelta(hours=random.randint(0, 720))
    src_ip = _rand_ip()
    asn = random.choice(ASN_POOL)

    initial_balance = balance

    for step in range(PEELING_CHAIN_LENGTH):
        fee = round(random.uniform(0.00005, 0.0003), 8)
        peel_addr = _rand_btc_address()
        next_addr = _rand_btc_address()

        out_peel = peel_amount
        out_remainder = round(balance - peel_amount - fee, 8)
        if out_remainder <= 0:
            break

        tid = _txid()
        _add_ledger(
            tid,
            in_addrs=[current_addr],
            out_addrs=[peel_addr, next_addr],
            in_amts=[balance],
            out_amts=[out_peel, out_remainder],
            fee=fee,
            script="P2PKH",
        )
        _add_network(tid, ts, src_ip=src_ip, geo="RU", asn=asn)
        ts += timedelta(minutes=random.randint(3, 20))
        current_addr = next_addr
        balance = out_remainder

    # Update label with actual values
    for label in ground_truth_labels:
        if label.entity_id == chain_id:
            label.details["initial_balance"] = initial_balance
            label.details["peel_amount"] = peel_amount


# ============================================================
# 3. MIXING-LIKE STRUCTURE
# ============================================================

def generate_mixing_structure():
    """Mixer with normal-looking addresses."""
    mixer_id = "entity_mixer"
    _register_label(mixer_id, "mixing_structure", 1, {
        "fan_in": MIXER_FAN_IN,
        "fan_out": MIXER_FAN_OUT,
        "denomination": 0,
    })

    pool_addr = _rand_btc_address()
    denomination = round(random.uniform(0.1, 0.5), 8)

    ts = BASE_TIME + timedelta(hours=random.randint(0, 4000))
    mixer_ip = _rand_ip()
    mixer_asn = random.choice(ASN_POOL)

    fan_in_total = 0.0

    # Fan-in phase
    for _ in range(MIXER_FAN_IN):
        depositor = _rand_btc_address()
        amount = round(denomination + random.uniform(-0.005, 0.005), 8)
        fee = round(random.uniform(0.00005, 0.0002), 8)
        tid = _txid()
        _add_ledger(
            tid,
            in_addrs=[depositor],
            out_addrs=[pool_addr],
            in_amts=[round(amount + fee, 8)],
            out_amts=[amount],
            fee=fee,
            script="P2SH",
        )
        _add_network(tid, ts, dst_ip=mixer_ip, geo=random.choice(["NL", "CH", "DE"]), asn=mixer_asn)
        fan_in_total += amount
        ts += timedelta(seconds=random.randint(30, 300))

    # Fan-out phase
    ts += timedelta(minutes=random.randint(10, 60))
    per_output = round(fan_in_total / MIXER_FAN_OUT, 8)
    remaining = round(fan_in_total, 8)

    for i in range(MIXER_FAN_OUT):
        recipient = _rand_btc_address()
        fee = round(random.uniform(0.00005, 0.0002), 8)
        out_amt = per_output if i < MIXER_FAN_OUT - 1 else round(remaining - fee, 8)
        remaining = round(remaining - out_amt - fee, 8)
        if out_amt <= 0:
            break

        tid = _txid()
        _add_ledger(
            tid,
            in_addrs=[pool_addr],
            out_addrs=[recipient],
            in_amts=[round(out_amt + fee, 8)],
            out_amts=[out_amt],
            fee=fee,
            script="P2WSH",
        )
        _add_network(tid, ts, src_ip=mixer_ip, geo=random.choice(["NL", "CH", "DE"]), asn=mixer_asn)
        ts += timedelta(seconds=random.randint(10, 120))

    # Update label
    for label in ground_truth_labels:
        if label.entity_id == mixer_id:
            label.details["denomination"] = denomination


# ============================================================
# 4. HIGH VELOCITY BURST
# ============================================================

def generate_burst_activity():
    """High-velocity burst with normal addresses."""
    burst_id = "entity_burst"
    _register_label(burst_id, "high_velocity_burst", 1, {
        "burst_count": BURST_COUNT,
        "avg_interval_seconds": 0,
    })

    burst_addr = _rand_btc_address()
    ts = BASE_TIME + timedelta(hours=random.randint(0, 6000))
    src_ip = _rand_ip()
    burst_asn = random.choice(ASN_POOL)

    intervals = []

    for i in range(BURST_COUNT):
        victim_addr = _rand_btc_address()
        demand_amount = round(random.uniform(0.002, 0.05), 8)
        fee = round(random.uniform(0.00003, 0.0001), 8)
        tid = _txid()
        _add_ledger(
            tid,
            in_addrs=[burst_addr],
            out_addrs=[victim_addr],
            in_amts=[round(demand_amount + fee, 8)],
            out_amts=[demand_amount],
            fee=fee,
            script="P2WPKH",
        )
        _add_network(tid, ts, src_ip=src_ip, geo="NG", asn=burst_asn)
        interval = random.randint(2, 45)
        intervals.append(interval)
        ts += timedelta(seconds=interval)

    for label in ground_truth_labels:
        if label.entity_id == burst_id:
            label.details["avg_interval_seconds"] = sum(intervals) / len(intervals)


# ============================================================
# 5. DORMANT-TO-ACTIVE
# ============================================================

def generate_dormant_to_active():
    """Wallets dormant for long time, then sudden activity."""
    for i in range(DORMANT_ENTITIES):
        entity_id = f"entity_dormant_{i}"
        _register_label(entity_id, "dormant_to_active", 1, {
            "dormant_days": 0,
            "active_tx_count": 0,
        })

        addr = _rand_btc_address()
        # Long dormant period
        dormant_start = BASE_TIME + timedelta(days=random.randint(0, 100))
        dormant_end = dormant_start + timedelta(days=random.randint(100, 300))
        
        # One transaction during dormant period (or none)
        tid = _txid()
        _add_ledger(tid, [_rand_btc_address()], [addr], [0.5], [0.49], 0.01, "P2PKH")
        _add_network(tid, dormant_start)
        
        # Sudden burst of activity
        active_start = dormant_end
        n_active = random.randint(10, 30)
        for j in range(n_active):
            tid = _txid()
            _add_ledger(
                tid,
                [addr],
                [_rand_btc_address()],
                [round(random.uniform(0.01, 0.5), 8)],
                [round(random.uniform(0.01, 0.5), 8)],
                0.0001,
                "P2PKH",
            )
            _add_network(tid, active_start + timedelta(minutes=j*5))
        
        # Update label
        for label in ground_truth_labels:
            if label.entity_id == entity_id:
                label.details["dormant_days"] = (dormant_end - dormant_start).days
                label.details["active_tx_count"] = n_active


# ============================================================
# 6. GEOGRAPHIC ANOMALY
# ============================================================

def generate_geographic_anomaly():
    """Wallet seen from many countries in short time."""
    for i in range(GEO_ANOMALY_ENTITIES):
        entity_id = f"entity_geo_anomaly_{i}"
        _register_label(entity_id, "geographic_anomaly", 1, {
            "country_count": 0,
            "time_span_hours": 0,
        })

        addr = _rand_btc_address()
        countries = random.sample(COUNTRIES, min(8, len(COUNTRIES)))
        ts = BASE_TIME + timedelta(hours=random.randint(0, 8000))
        
        for j, country in enumerate(countries):
            tid = _txid()
            _add_ledger(
                tid,
                [addr] if j == 0 else [_rand_btc_address()],
                [_rand_btc_address()],
                [round(random.uniform(0.1, 2.0), 8)],
                [round(random.uniform(0.1, 2.0), 8)],
                0.0001,
                "P2PKH",
            )
            _add_network(tid, ts, geo=country)
            ts += timedelta(hours=random.randint(1, 12))
        
        for label in ground_truth_labels:
            if label.entity_id == entity_id:
                label.details["country_count"] = len(countries)
                label.details["time_span_hours"] = (ts - (ts - timedelta(hours=12*len(countries)))).total_seconds() / 3600


# ============================================================
# 7. SHARED INFRASTRUCTURE
# ============================================================

def generate_shared_infrastructure():
    """Multiple wallets using same IP/ASN."""
    for group_idx in range(SHARED_INFRA_GROUPS):
        group_id = f"entity_shared_infra_{group_idx}"
        _register_label(group_id, "shared_infrastructure", 1, {
            "wallet_count": 0,
            "shared_ip": "",
        })
        
        shared_ip = _rand_ip()
        shared_asn = random.choice(ASN_POOL)
        n_wallets = random.randint(5, 15)
        wallet_addrs = [_rand_btc_address() for _ in range(n_wallets)]
        ts = BASE_TIME + timedelta(hours=random.randint(0, 8000))
        
        for wallet_addr in wallet_addrs:
            for _ in range(random.randint(2, 5)):
                tid = _txid()
                _add_ledger(
                    tid,
                    [wallet_addr],
                    [_rand_btc_address()],
                    [round(random.uniform(0.01, 1.0), 8)],
                    [round(random.uniform(0.01, 1.0), 8)],
                    0.0001,
                    "P2PKH",
                )
                _add_network(tid, ts, src_ip=shared_ip, asn=shared_asn)
                ts += timedelta(minutes=random.randint(10, 60))
        
        for label in ground_truth_labels:
            if label.entity_id == group_id:
                label.details["wallet_count"] = n_wallets
                label.details["shared_ip"] = shared_ip


# ============================================================
# 8. FALSE POSITIVE CASES
# ============================================================

def generate_false_positives():
    """Normal wallets that might look suspicious but aren't."""
    for i in range(FALSE_POSITIVE_ENTITIES):
        entity_id = f"entity_false_positive_{i}"
        _register_label(entity_id, "false_positive", 0, {
            "reason": "normal_but_unusual",
        })

        addr = _rand_btc_address()
        ts = BASE_TIME + timedelta(hours=random.randint(0, 8000))
        
        # High fan-out but normal context (e.g., exchange distribution)
        for j in range(random.randint(15, 25)):
            tid = _txid()
            _add_ledger(
                tid,
                [addr],
                [_rand_btc_address()],
                [round(random.uniform(0.1, 1.0), 8)],
                [round(random.uniform(0.1, 1.0), 8)],
                0.0001,
                "P2PKH",
            )
            _add_network(tid, ts)
            ts += timedelta(minutes=random.randint(5, 60))


# ============================================================
# MAIN
# ============================================================

def write_csvs():
    # Shuffle to mix patterns
    random.shuffle(network_rows)
    random.shuffle(ledger_rows)

    # network_logs.csv
    net_fields = ["timestamp", "src_ip", "dst_ip", "src_port", "dst_port",
                  "txid", "geo_country", "asn"]
    net_path = OUTPUT_DIR / "network_logs.csv"
    with open(net_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=net_fields)
        writer.writeheader()
        writer.writerows(network_rows)
    print(f"  ✓ {net_path} ({len(network_rows)} rows)")

    # blockchain_ledger.csv
    ledger_fields = ["txid", "input_addresses", "output_addresses",
                     "input_amounts", "output_amounts", "fee", "script_type"]
    ledger_path = OUTPUT_DIR / "blockchain_ledger.csv"
    with open(ledger_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=ledger_fields)
        writer.writeheader()
        writer.writerows(ledger_rows)
    print(f"  ✓ {ledger_path} ({len(ledger_rows)} rows)")

    # ground_truth.csv
    truth_fields = ["entity_id", "pattern_type", "label", "details"]
    truth_path = OUTPUT_DIR / "ground_truth.csv"
    with open(truth_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=truth_fields)
        writer.writeheader()
        for label in ground_truth_labels:
            writer.writerow({
                "entity_id": label.entity_id,
                "pattern_type": label.pattern_type,
                "label": label.label,
                "details": json.dumps(label.details),
            })
    print(f"  ✓ {truth_path} ({len(ground_truth_labels)} rows)")

    # ground_truth.json (machine-readable)
    truth_json_path = OUTPUT_DIR / "ground_truth.json"
    with open(truth_json_path, "w", encoding="utf-8") as f:
        json.dump([
            {
                "entity_id": l.entity_id,
                "pattern_type": l.pattern_type,
                "label": l.label,
                "details": l.details,
            }
            for l in ground_truth_labels
        ], f, indent=2)
    print(f"  ✓ {truth_json_path}")


def main():
    print("╔════════════════════════════════════════════════════╗")
    print("║  Deterministic Ground Truth Dataset Generator      ║")
    print("╚════════════════════════════════════════════════════╝\n")

    print("[1/8] Generating normal traffic...")
    generate_normal_traffic()

    print("[2/8] Generating peeling chain...")
    generate_peeling_chain()

    print("[3/8] Generating mixing structure...")
    generate_mixing_structure()

    print("[4/8] Generating high-velocity burst...")
    generate_burst_activity()

    print("[5/8] Generating dormant-to-active...")
    generate_dormant_to_active()

    print("[6/8] Generating geographic anomaly...")
    generate_geographic_anomaly()

    print("[7/8] Generating shared infrastructure...")
    generate_shared_infrastructure()

    print("[8/8] Generating false positives...")
    generate_false_positives()

    print(f"\nTotal transactions: {len(ledger_rows)}")
    print(f"Total network obs:  {len(network_rows)}")
    print(f"Total labels:       {len(ground_truth_labels)}")
    normal_count = sum(1 for l in ground_truth_labels if l.label == 0)
    anomaly_count = sum(1 for l in ground_truth_labels if l.label == 1)
    print(f"  Normal: {normal_count}, Anomaly: {anomaly_count}")
    print(f"Pattern types: {set(l.pattern_type for l in ground_truth_labels)}")

    print("\nWriting CSVs...")
    write_csvs()

    print(f"\n✅ Done. All files saved to: {OUTPUT_DIR}")
    print("   No special address prefixes (1Peel/3Mix/1Ext) used.")


if __name__ == "__main__":
    main()