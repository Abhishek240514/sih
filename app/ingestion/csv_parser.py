import csv
import io
from typing import List, Dict, Any, Iterator, Optional
import pandas as pd
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


REQUIRED_COLUMNS = {"txid", "timestamp"}
OPTIONAL_COLUMNS = {
    "input_addresses",
    "output_addresses",
    "input_amounts",
    "output_amounts",
    "fee",
    "script_type",
    "src_ip",
    "dst_ip",
    "src_port",
    "dst_port",
    "geo_country",
    "asn",
}


def detect_delimiter(sample: str) -> str:
    sniffer = csv.Sniffer()
    try:
        dialect = sniffer.sniff(sample, delimiters=",;\t|")
        return dialect.delimiter
    except csv.Error:
        return ","


def read_csv_file(file_path: str, chunk_size: int = 10000) -> Iterator[pd.DataFrame]:
    delimiter = ","
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        sample = f.read(8192)
        delimiter = detect_delimiter(sample)
    
    logger.info(f"Detected CSV delimiter: '{delimiter}'")
    
    for chunk in pd.read_csv(
        file_path,
        delimiter=delimiter,
        chunksize=chunk_size,
        encoding="utf-8",
        on_bad_lines="skip",
        dtype=str,
        keep_default_na=False,
        na_values=["", "NA", "N/A", "null", "NULL", "None"],
    ):
        yield chunk


def parse_csv_row(row: Dict[str, Any]) -> Optional[NormalizedTransaction]:
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
    fee_val = float(fee) if fee is not None and str(fee).strip() else 0.0
    
    src_ip = row.get("src_ip")
    dst_ip = row.get("dst_ip")
    src_ips = [src_ip.strip()] if src_ip and str(src_ip).strip() else []
    dst_ips = [dst_ip.strip()] if dst_ip and str(dst_ip).strip() else []
    
    src_port = row.get("src_port")
    dst_port = row.get("dst_port")
    src_ports = [int(src_port)] if src_port is not None and str(src_port).strip() else []
    dst_ports = [int(dst_port)] if dst_port is not None and str(dst_port).strip() else []
    
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


def parse_csv_dataframe(df: pd.DataFrame) -> List[NormalizedTransaction]:
    transactions = []
    for _, row in df.iterrows():
        try:
            tx = parse_csv_row(row.to_dict())
            if tx:
                transactions.append(tx)
        except Exception as e:
            logger.warning(f"Error parsing row: {e}")
            continue
    return transactions


async def parse_csv_bytes(content: bytes) -> List[NormalizedTransaction]:
    try:
        df = pd.read_csv(
            io.BytesIO(content),
            dtype=str,
            keep_default_na=False,
            na_values=["", "NA", "N/A", "null", "NULL", "None"],
        )
        # Check if it's a raw Elliptic dataset file
        if len(df.columns) > 100:
            # Features file
            df = pd.read_csv(
                io.BytesIO(content),
                dtype=str,
                header=None,
                keep_default_na=False,
                na_values=["", "NA", "N/A", "null", "NULL", "None"],
            )
            df.rename(columns={0: 'txid'}, inplace=True)
            df['timestamp'] = df[1].astype(int) * 3600 * 24 + 1700000000
            df['input_addresses'] = df['txid'].apply(lambda x: f"wallet_{x}")
            df['output_addresses'] = df['txid'].apply(lambda x: f"wallet_{x}")
            df['input_amounts'] = "1.0"
            df['output_amounts'] = "1.0"
        elif len(df.columns) == 2 and 'txId1' in df.columns and 'txId2' in df.columns:
            # Edgelist file
            df.rename(columns={'txId1': 'txid'}, inplace=True)
            df['timestamp'] = 1700000000
            df['input_addresses'] = df['txid'].apply(lambda x: f"wallet_{x}")
            df['output_addresses'] = df['txId2'].apply(lambda x: f"wallet_{x}")
            df['input_amounts'] = "1.0"
            df['output_amounts'] = "1.0"
        elif len(df.columns) == 2 and 'class' in df.columns:
            # Classes file
            df.rename(columns={'txId': 'txid'}, inplace=True)
            df['timestamp'] = 1700000000
            df['input_addresses'] = df['txid'].apply(lambda x: f"wallet_{x}")
            df['output_addresses'] = df['txid'].apply(lambda x: f"wallet_{x}")
            df['input_amounts'] = "1.0"
            df['output_amounts'] = "1.0"
            
        return parse_csv_dataframe(df)
    except Exception as e:
        logger.error(f"Failed to parse CSV bytes: {e}")
        raise


def validate_csv_columns(df: pd.DataFrame) -> List[str]:
    cols = set(df.columns.str.lower().str.strip())
    missing = REQUIRED_COLUMNS - cols
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    return list(cols)