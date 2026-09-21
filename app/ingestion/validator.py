import re
import ipaddress
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse


IPV4_PATTERN = re.compile(
    r"^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
)
IPV6_PATTERN = re.compile(
    r"^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$"
)


def is_valid_ip(ip: str) -> bool:
    if not ip:
        return False
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def is_valid_ipv4(ip: str) -> bool:
    if not ip:
        return False
    return bool(IPV4_PATTERN.match(ip))


def is_valid_ipv6(ip: str) -> bool:
    if not ip:
        return False
    try:
        ipaddress.IPv6Address(ip)
        return True
    except ValueError:
        return False


def is_valid_port(port: Any) -> bool:
    if port is None:
        return True
    try:
        p = int(port)
        return 0 <= p <= 65535
    except (ValueError, TypeError):
        return False


def parse_timestamp(ts: Any) -> Optional[datetime]:
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts
    if isinstance(ts, (int, float)):
        try:
            return datetime.fromtimestamp(ts)
        except (ValueError, OSError):
            return None
    if isinstance(ts, str):
        ts = ts.strip()
        # Try to parse as unix timestamp string first
        if ts.replace(".", "", 1).isdigit():
            try:
                return datetime.fromtimestamp(float(ts))
            except (ValueError, OSError):
                pass
        
        formats = [
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(ts, fmt)
            except ValueError:
                continue
    return None


def validate_tx_id(txid: str) -> bool:
    if not txid or not isinstance(txid, str):
        return False
    return len(txid.strip()) >= 32


def validate_address(address: str) -> bool:
    if not address or not isinstance(address, str):
        return False
    addr = address.strip()
    return len(addr) >= 26 and len(addr) <= 62


def validate_amount(amount: Any) -> Optional[float]:
    if amount is None:
        return None
    try:
        val = float(amount)
        return val if val >= 0 else None
    except (ValueError, TypeError):
        return None


def validate_country(country: str) -> Optional[str]:
    if not country or not isinstance(country, str):
        return None
    c = country.strip().upper()
    return c if len(c) == 2 and c.isalpha() else None


def validate_asn(asn: str) -> Optional[str]:
    if not asn or not isinstance(asn, str):
        return None
    asn_str = asn.strip().upper()
    if asn_str.startswith("AS"):
        asn_str = asn_str[2:]
    if asn_str.isdigit():
        return f"AS{asn_str}"
    return None


def normalize_addresses(addresses: Any) -> List[str]:
    if not addresses:
        return []
    if isinstance(addresses, str):
        try:
            import json
            addresses = json.loads(addresses)
        except json.JSONDecodeError:
            addresses = [a.strip() for a in addresses.split(",") if a.strip()]
    if isinstance(addresses, list):
        return [a.strip() for a in addresses if isinstance(a, str) and validate_address(a)]
    return []


def normalize_amounts(amounts: Any) -> List[float]:
    if not amounts:
        return []
    if isinstance(amounts, str):
        try:
            import json
            amounts = json.loads(amounts)
        except json.JSONDecodeError:
            amounts = [a.strip() for a in amounts.split(",") if a.strip()]
    if isinstance(amounts, list):
        result = []
        for a in amounts:
            val = validate_amount(a)
            if val is not None:
                result.append(val)
        return result
    val = validate_amount(amounts)
    return [val] if val is not None else []


def validate_record(record: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errors = []
    
    if not record.get("txid") or not validate_tx_id(str(record.get("txid", ""))):
        errors.append("Invalid or missing txid")
    
    ts = parse_timestamp(record.get("timestamp"))
    if ts is None:
        errors.append("Invalid or missing timestamp")
    
    input_addrs = normalize_addresses(record.get("input_addresses"))
    output_addrs = normalize_addresses(record.get("output_addresses"))
    
    input_amounts = normalize_amounts(record.get("input_amounts"))
    output_amounts = normalize_amounts(record.get("output_amounts"))
    
    if input_addrs and input_amounts and len(input_addrs) != len(input_amounts):
        errors.append("Input addresses and amounts length mismatch")
    if output_addrs and output_amounts and len(output_addrs) != len(output_amounts):
        errors.append("Output addresses and amounts length mismatch")
    
    src_ip = record.get("src_ip")
    if src_ip and not is_valid_ip(str(src_ip)):
        errors.append(f"Invalid source IP: {src_ip}")
    
    dst_ip = record.get("dst_ip")
    if dst_ip and not is_valid_ip(str(dst_ip)):
        errors.append(f"Invalid destination IP: {dst_ip}")
    
    src_port = record.get("src_port")
    if src_port is not None and not is_valid_port(src_port):
        errors.append(f"Invalid source port: {src_port}")
    
    dst_port = record.get("dst_port")
    if dst_port is not None and not is_valid_port(dst_port):
        errors.append(f"Invalid destination port: {dst_port}")
    
    fee = validate_amount(record.get("fee"))
    if fee is None and record.get("fee") is not None:
        errors.append("Invalid fee")
    
    return len(errors) == 0, errors