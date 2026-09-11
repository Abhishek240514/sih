#!/usr/bin/env python3
"""
generate_data.py — Synthetic Blockchain Forensics Data Generator
================================================================
Generates three relational CSV files for blockchain analytics research:
  1. network_logs.csv      — IP-level network telemetry tied to transactions
  2. blockchain_ledger.csv — On-chain transaction records (inputs/outputs)
  3. ground_truth.csv      — Entity labels (0 = normal, 1 = anomaly)

Three distinct criminal patterns are injected:
  • Peeling Chain   — sequential peel-off of small amounts from a large UTXO
  • Mixer / Tumbler — fan-in / fan-out structure with uniform output amounts
  • High-Velocity Extortion — burst of many small txns from one address cluster

All array-valued CSV fields are serialised as JSON strings.
Runs fully offline with only the Python standard library.
"""

import csv
import hashlib
import json
import os
import random
import string
import uuid
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
NUM_NORMAL_ENTITIES = 200
NUM_NORMAL_TXS = 800
PEELING_CHAIN_LENGTH = 12
MIXER_FAN_IN = 15
MIXER_FAN_OUT = 15
EXTORTION_BURST_COUNT = 40

SCRIPT_TYPES = ["P2PKH", "P2SH", "P2WPKH", "P2WSH", "P2TR"]
COUNTRIES = [
    "US", "DE", "NL", "RU", "CN", "JP", "KR", "GB", "FR", "BR",
    "IN", "SG", "AU", "CA", "UA", "RO", "NG", "ZA", "AE", "CH",
]
ASN_POOL = [f"AS{random.randint(1000, 65000)}" for _ in range(60)]

BASE_TIME = datetime(2025, 1, 1, 0, 0, 0)

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "generated")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_output_dir():
    """Create the outputs/ directory if it does not exist."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def _rand_btc_address(prefix: str = "1") -> str:
    """Return a plausible-looking Base58 Bitcoin address."""
    payload = "".join(random.choices(string.ascii_letters + string.digits, k=33))
    return prefix + payload


def _rand_ip() -> str:
    return f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def _rand_port(ephemeral: bool = False) -> int:
    if ephemeral:
        return random.randint(49152, 65535)
    return random.choice([8333, 8332, 18333, 18332, 443, 80, 9735])


def _txid() -> str:
    """64-char hex hash resembling a real txid."""
    return hashlib.sha256(uuid.uuid4().bytes).hexdigest()


def _rand_timestamp(start: datetime, span_hours: int = 8760) -> datetime:
    """Random timestamp within `span_hours` hours of `start`."""
    delta = timedelta(seconds=random.randint(0, span_hours * 3600))
    return start + delta


def _fmt_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _json_list(items: list) -> str:
    """Serialise a Python list as a JSON string for CSV storage."""
    return json.dumps(items)


# ---------------------------------------------------------------------------
# Record accumulators
# ---------------------------------------------------------------------------
network_rows: list[dict] = []
ledger_rows: list[dict] = []
ground_truth: dict[str, dict] = {}  # entity_id -> {type, label}


def _register_entity(entity_id: str, etype: str, label: int):
    if entity_id not in ground_truth:
        ground_truth[entity_id] = {"type": etype, "label": label}


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


# ---------------------------------------------------------------------------
# 1. Normal traffic generation
# ---------------------------------------------------------------------------

def generate_normal_traffic():
    """Create NUM_NORMAL_ENTITIES normal entities and NUM_NORMAL_TXS transactions."""
    entity_addrs: dict[str, list[str]] = {}
    for i in range(NUM_NORMAL_ENTITIES):
        eid = f"entity_norm_{i:04d}"
        n_addrs = random.randint(1, 5)
        addrs = [_rand_btc_address() for _ in range(n_addrs)]
        entity_addrs[eid] = addrs
        _register_entity(eid, "wallet", 0)

    entities = list(entity_addrs.keys())

    for _ in range(NUM_NORMAL_TXS):
        sender = random.choice(entities)
        receiver = random.choice(entities)
        # Pick random subset of sender addresses as inputs
        n_in = random.randint(1, min(3, len(entity_addrs[sender])))
        in_addrs = random.sample(entity_addrs[sender], n_in)
        # Pick random subset of receiver addresses as outputs (+ possible change)
        n_out = random.randint(1, min(2, len(entity_addrs[receiver])))
        out_addrs = random.sample(entity_addrs[receiver], n_out)
        # Optionally add a change address back to sender
        if random.random() < 0.6:
            change_addr = random.choice(entity_addrs[sender])
            out_addrs.append(change_addr)

        total_in = round(random.uniform(0.001, 5.0), 8)
        fee = round(total_in * random.uniform(0.0001, 0.005), 8)
        total_out = round(total_in - fee, 8)
        in_amts = [round(total_in / n_in, 8)] * n_in
        out_amts_raw = [round(total_out / len(out_addrs), 8)] * len(out_addrs)

        tid = _txid()
        script = random.choice(SCRIPT_TYPES)
        _add_ledger(tid, in_addrs, out_addrs, in_amts, out_amts_raw, fee, script)
        _add_network(tid, _rand_timestamp(BASE_TIME))


# ---------------------------------------------------------------------------
# 2. Anomaly: Peeling Chain
# ---------------------------------------------------------------------------

def inject_peeling_chain():
    """
    Peeling chain: a single large UTXO is successively spent, peeling off a
    small fixed amount to a new address each time and forwarding the remainder
    to another fresh address.  Characteristic of structured cash-out.
    """
    eid = "entity_peel_chain"
    _register_entity(eid, "peeling_chain", 1)

    balance = round(random.uniform(15.0, 50.0), 8)
    peel_amount = round(random.uniform(0.05, 0.25), 8)
    current_addr = _rand_btc_address(prefix="1Peel")
    ts = _rand_timestamp(BASE_TIME, span_hours=720)
    src_ip = _rand_ip()  # same origin node
    asn = random.choice(ASN_POOL)

    for step in range(PEELING_CHAIN_LENGTH):
        fee = round(random.uniform(0.00005, 0.0003), 8)
        peel_addr = _rand_btc_address(prefix="1Peel")
        next_addr = _rand_btc_address(prefix="1Peel")

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
        # Network: same source IP, short inter-tx interval
        _add_network(tid, ts, src_ip=src_ip, geo="RU", asn=asn)
        ts += timedelta(minutes=random.randint(3, 20))
        current_addr = next_addr
        balance = out_remainder


# ---------------------------------------------------------------------------
# 3. Anomaly: Mixer / Tumbler
# ---------------------------------------------------------------------------

def inject_mixer():
    """
    Mixer/Tumbler topology:
      Phase 1 (fan-in):  Many inputs → single mixing pool address
      Phase 2 (fan-out): Pool address → many equal-sized outputs
    Uniform output denominations and temporal clustering are hallmarks.
    """
    eid = "entity_mixer"
    _register_entity(eid, "mixer", 1)

    pool_addr = _rand_btc_address(prefix="3Mix")
    denomination = round(random.uniform(0.1, 0.5), 8)

    # --- Fan-in phase ---
    ts = _rand_timestamp(BASE_TIME, span_hours=4000)
    mixer_ip = _rand_ip()
    mixer_asn = random.choice(ASN_POOL)

    fan_in_total = 0.0
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

    # --- Fan-out phase ---
    ts += timedelta(minutes=random.randint(10, 60))  # mixing delay
    per_output = round(fan_in_total / MIXER_FAN_OUT, 8)
    remaining = round(fan_in_total, 8)

    for i in range(MIXER_FAN_OUT):
        recipient = _rand_btc_address(prefix="bc1q")
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


# ---------------------------------------------------------------------------
# 4. Anomaly: High-Velocity Extortion Burst
# ---------------------------------------------------------------------------

def inject_extortion_burst():
    """
    High-velocity extortion: a single entity rapidly sends many small
    transactions to unique victim addresses within a very short window.
    Mimics ransomware / sextortion campaigns.
    """
    eid = "entity_extortion"
    _register_entity(eid, "extortion", 1)

    extortion_addr = _rand_btc_address(prefix="1Ext")
    ts = _rand_timestamp(BASE_TIME, span_hours=6000)
    src_ip = _rand_ip()
    extortion_asn = random.choice(ASN_POOL)

    for _ in range(EXTORTION_BURST_COUNT):
        victim_addr = _rand_btc_address()
        demand_amount = round(random.uniform(0.002, 0.05), 8)
        fee = round(random.uniform(0.00003, 0.0001), 8)
        tid = _txid()
        _add_ledger(
            tid,
            in_addrs=[extortion_addr],
            out_addrs=[victim_addr],
            in_amts=[round(demand_amount + fee, 8)],
            out_amts=[demand_amount],
            fee=fee,
            script="P2WPKH",
        )
        # Very short inter-arrival — characteristic burst
        _add_network(tid, ts, src_ip=src_ip, geo="NG", asn=extortion_asn)
        ts += timedelta(seconds=random.randint(2, 45))


# ---------------------------------------------------------------------------
# CSV Writers
# ---------------------------------------------------------------------------

NETWORK_FIELDS = ["timestamp", "src_ip", "dst_ip", "src_port", "dst_port",
                  "txid", "geo_country", "asn"]

LEDGER_FIELDS = ["txid", "input_addresses", "output_addresses",
                 "input_amounts", "output_amounts", "fee", "script_type"]

TRUTH_FIELDS = ["entity_id", "type", "label"]


def write_csvs():
    _ensure_output_dir()

    # --- network_logs.csv ---
    net_path = os.path.join(OUTPUT_DIR, "network_logs.csv")
    with open(net_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=NETWORK_FIELDS)
        writer.writeheader()
        # Shuffle to avoid anomalies clustering at the end of the file
        random.shuffle(network_rows)
        writer.writerows(network_rows)
    print(f"  ✓ {net_path}  ({len(network_rows)} rows)")

    # --- blockchain_ledger.csv ---
    ledger_path = os.path.join(OUTPUT_DIR, "blockchain_ledger.csv")
    with open(ledger_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=LEDGER_FIELDS)
        writer.writeheader()
        random.shuffle(ledger_rows)
        writer.writerows(ledger_rows)
    print(f"  ✓ {ledger_path}  ({len(ledger_rows)} rows)")

    # --- ground_truth.csv ---
    truth_path = os.path.join(OUTPUT_DIR, "ground_truth.csv")
    truth_rows = [
        {"entity_id": eid, "type": meta["type"], "label": meta["label"]}
        for eid, meta in ground_truth.items()
    ]
    with open(truth_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=TRUTH_FIELDS)
        writer.writeheader()
        writer.writerows(truth_rows)
    print(f"  ✓ {truth_path}  ({len(truth_rows)} rows)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    random.seed(42)  # reproducibility

    print("╔══════════════════════════════════════════════════╗")
    print("║  Blockchain Forensics — Synthetic Data Generator ║")
    print("╚══════════════════════════════════════════════════╝\n")

    print("[1/4] Generating normal traffic …")
    generate_normal_traffic()

    print("[2/4] Injecting peeling chain …")
    inject_peeling_chain()

    print("[3/4] Injecting mixer / tumbler …")
    inject_mixer()

    print("[4/4] Injecting high-velocity extortion burst …")
    inject_extortion_burst()

    print(f"\nTotal transactions: {len(ledger_rows)}")
    print(f"Total entities:     {len(ground_truth)}  "
          f"(normal: {sum(1 for v in ground_truth.values() if v['label']==0)}, "
          f"anomaly: {sum(1 for v in ground_truth.values() if v['label']==1)})\n")

    print("Writing CSVs …")
    write_csvs()

    print("\n✅ Done. All files saved to:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
