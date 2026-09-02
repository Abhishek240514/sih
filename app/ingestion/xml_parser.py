import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Iterator, Optional
import logging

from app.ingestion.validator import (
    validate_record,
    parse_timestamp,
    normalize_addresses,
    normalize_amounts,
    validate_tx_id,
)
from app.models.schemas import NormalizedTransaction

logger = logging.getLogger(__name__)


def parse_xml_file(file_path: str, chunk_size: int = 10000) -> Iterator[List[Dict[str, Any]]]:
    context = ET.iterparse(file_path, events=("start", "end"))
    chunk = []
    current_elem = None
    
    for event, elem in context:
        if event == "start" and elem.tag in ("transaction", "tx", "record"):
            current_elem = elem
        elif event == "end" and elem.tag in ("transaction", "tx", "record"):
            record = xml_element_to_dict(elem)
            chunk.append(record)
            elem.clear()
            if len(chunk) >= chunk_size:
                yield chunk
                chunk = []
            current_elem = None
    
    if chunk:
        yield chunk


def xml_element_to_dict(elem: ET.Element) -> Dict[str, Any]:
    result = {}
    for child in elem:
        if len(child) == 0:
            result[child.tag] = child.text
        else:
            if child.tag in ("input_addresses", "output_addresses", "input_amounts", "output_amounts"):
                result[child.tag] = [c.text for c in child if c.text]
            else:
                result[child.tag] = xml_element_to_dict(child)
    
    for key, value in elem.attrib.items():
        result[f"@{key}"] = value
    
    return result


def parse_xml_string(content: str) -> List[Dict[str, Any]]:
    try:
        root = ET.fromstring(content)
        records = []
        
        for elem in root:
            if elem.tag in ("transaction", "tx", "record"):
                records.append(xml_element_to_dict(elem))
            elif elem.tag == "transactions":
                for child in elem:
                    if child.tag in ("transaction", "tx", "record"):
                        records.append(xml_element_to_dict(child))
        
        if not records and root.tag in ("transaction", "tx", "record"):
            records.append(xml_element_to_dict(root))
        
        return records
    except ET.ParseError as e:
        logger.error(f"XML parse error: {e}")
        raise


def parse_xml_row(row: Dict[str, Any]) -> Optional[NormalizedTransaction]:
    flat_row = flatten_dict(row)
    
    is_valid, errors = validate_record(flat_row)
    if not is_valid:
        logger.debug(f"Row validation failed: {errors}")
        return None
    
    txid = str(flat_row.get("txid", "")).strip()
    if not validate_tx_id(txid):
        return None
    
    ts = parse_timestamp(flat_row.get("timestamp"))
    if ts is None:
        return None
    
    input_addresses = normalize_addresses(flat_row.get("input_addresses"))
    output_addresses = normalize_addresses(flat_row.get("output_addresses"))
    input_amounts = normalize_amounts(flat_row.get("input_amounts"))
    output_amounts = normalize_amounts(flat_row.get("output_amounts"))
    
    fee = flat_row.get("fee")
    fee_val = float(fee) if fee is not None else 0.0
    
    src_ip = flat_row.get("src_ip")
    dst_ip = flat_row.get("dst_ip")
    src_ips = [src_ip.strip()] if src_ip and str(src_ip).strip() else []
    dst_ips = [dst_ip.strip()] if dst_ip and str(dst_ip).strip() else []
    
    src_port = flat_row.get("src_port")
    dst_port = flat_row.get("dst_port")
    src_ports = [int(src_port)] if src_port is not None else []
    dst_ports = [int(dst_port)] if dst_port is not None else []
    
    geo_country = flat_row.get("geo_country")
    asn = flat_row.get("asn")
    script_type = flat_row.get("script_type")
    
    input_amount = sum(input_amounts)
    output_amount = sum(output_amounts)
    
    return NormalizedTransaction(
        txid=txid,
        timestamp=ts,
        inputs=input_addresses,
        outputs=output_addresses,
        input_amounts=input_amounts,
        output_amounts=output_amounts,
        fee=fee_val,
        script_type=script_type,
        source_ips=src_ips,
        destination_ips=dst_ips,
        source_ports=src_ports,
        destination_ports=dst_ports,
        geo_country=geo_country,
        asn=asn,
        input_amount=input_amount,
        output_amount=output_amount,
    )


def flatten_dict(d: Dict[str, Any], parent_key: str = "", sep: str = "_") -> Dict[str, Any]:
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        new_key = new_key.replace("@", "")
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            if v and isinstance(v[0], dict):
                for i, item in enumerate(v):
                    items.extend(flatten_dict(item, f"{new_key}{sep}{i}", sep=sep).items())
            else:
                items.append((new_key, v))
        else:
            items.append((new_key, v))
    return dict(items)


def parse_xml_data(data: List[Dict[str, Any]]) -> List[NormalizedTransaction]:
    transactions = []
    for row in data:
        try:
            tx = parse_xml_row(row)
            if tx:
                transactions.append(tx)
        except Exception as e:
            logger.warning(f"Error parsing XML row: {e}")
            continue
    return transactions


async def parse_xml_bytes(content: bytes) -> List[NormalizedTransaction]:
    try:
        xml_str = content.decode("utf-8")
        data = parse_xml_string(xml_str)
        return parse_xml_data(data)
    except Exception as e:
        logger.error(f"Failed to parse XML bytes: {e}")
        raise


def validate_xml_structure(data: List[Dict[str, Any]]) -> List[str]:
    warnings = []
    if not data:
        warnings.append("Empty XML data")
        return warnings
    
    sample = data[0] if data else {}
    flat = flatten_dict(sample)
    required = {"txid", "timestamp"}
    missing = required - set(flat.keys())
    if missing:
        warnings.append(f"Missing required fields in sample: {missing}")
    
    return warnings