import json
import ijson
from typing import List, Dict, Any, Iterator, Optional, Union, AsyncIterator
from pathlib import Path
import logging

from app.ingestion.validator import (
    validate_record,
    parse_timestamp,
    normalize_addresses,
    normalize_amounts,
    validate_tx_id,
)
from app.models.schemas import NormalizedTransaction
from app.core.config import settings

logger = logging.getLogger(__name__)


def parse_json_file(file_path: str, chunk_size: int = 10000) -> Iterator[List[Dict[str, Any]]]:
    with open(file_path, "rb") as f:
        parser = ijson.items(f, "item")
        chunk = []
        for item in parser:
            chunk.append(item)
            if len(chunk) >= chunk_size:
                yield chunk
                chunk = []
        if chunk:
            yield chunk


def parse_json_array(content: Union[str, bytes]) -> List[Dict[str, Any]]:
    if isinstance(content, bytes):
        content = content.decode("utf-8")
    try:
        data = json.loads(content)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            if "transactions" in data and isinstance(data["transactions"], list):
                return data["transactions"]
            elif "data" in data and isinstance(data["data"], list):
                return data["data"]
            else:
                return [data]
        else:
            return []
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        raise


def parse_json_row(row: Dict[str, Any]) -> Optional[NormalizedTransaction]:
    is_valid, errors = validate_record(row)
    if not is_valid:
        logger.debug(f"Row validation failed: {errors}")
        return None
    
    txid = str(row.get("txid", "")).strip()
    if not validate_tx_id(txid):
        return None
    
    ts = parse_timestamp(row.get("timestamp"))
    if ts is None:
        return None
    
    input_addresses = normalize_addresses(row.get("input_addresses"))
    output_addresses = normalize_addresses(row.get("output_addresses"))
    input_amounts = normalize_amounts(row.get("input_amounts"))
    output_amounts = normalize_amounts(row.get("output_amounts"))
    
    fee = row.get("fee")
    fee_val = float(fee) if fee is not None else 0.0
    
    src_ip = row.get("src_ip")
    dst_ip = row.get("dst_ip")
    src_ips = [src_ip.strip()] if src_ip and str(src_ip).strip() else []
    dst_ips = [dst_ip.strip()] if dst_ip and str(dst_ip).strip() else []
    
    src_port = row.get("src_port")
    dst_port = row.get("dst_port")
    src_ports = [int(src_port)] if src_port is not None else []
    dst_ports = [int(dst_port)] if dst_port is not None else []
    
    geo_country = row.get("geo_country")
    asn = row.get("asn")
    script_type = row.get("script_type")
    
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


def parse_json_data(data: List[Dict[str, Any]]) -> List[NormalizedTransaction]:
    transactions = []
    for row in data:
        try:
            tx = parse_json_row(row)
            if tx:
                transactions.append(tx)
        except Exception as e:
            logger.warning(f"Error parsing JSON row: {e}")
            continue
    return transactions


async def parse_json_bytes(content: bytes) -> List[NormalizedTransaction]:
    try:
        data = parse_json_array(content)
        return parse_json_data(data)
    except Exception as e:
        logger.error(f"Failed to parse JSON bytes: {e}")
        raise


async def parse_json_streaming(
    content: bytes,
    chunk_size: int = 10000,
    max_chunks: Optional[int] = None,
) -> AsyncIterator[List[NormalizedTransaction]]:
    """
    Stream parse large JSON arrays in chunks.
    Assumes JSON is an array of objects at the root level.
    """
    if isinstance(content, bytes):
        content = content.decode("utf-8")
    
    # Use ijson for streaming parsing
    import io
    parser = ijson.items(io.StringIO(content), "item")
    
    chunk = []
    chunks_processed = 0
    
    for item in parser:
        chunk.append(item)
        if len(chunk) >= chunk_size:
            transactions = parse_json_data(chunk)
            if transactions:
                yield transactions
            
            chunk = []
            chunks_processed += 1
            
            if max_chunks and chunks_processed >= max_chunks:
                logger.warning(f"Reached max_chunks limit ({max_chunks}), stopping")
                break
            
            # Allow other tasks to run
            import asyncio
            await asyncio.sleep(0)
    
    # Process remaining items
    if chunk:
        transactions = parse_json_data(chunk)
        if transactions:
            yield transactions


def validate_json_structure(data: List[Dict[str, Any]]) -> List[str]:
    warnings = []
    if not data:
        warnings.append("Empty JSON array")
        return warnings
    
    sample = data[0] if data else {}
    required = {"txid", "timestamp"}
    missing = required - set(sample.keys())
    if missing:
        warnings.append(f"Missing required fields in sample: {missing}")
    
    return warnings