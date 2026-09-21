import hashlib
import uuid
from typing import List, Dict, Any, Optional, AsyncIterator
from pathlib import Path
import logging

from app.ingestion.csv_parser import (
    parse_csv_bytes, parse_csv_streaming, validate_csv_columns
)
from app.ingestion.json_parser import (
    parse_json_bytes, parse_json_streaming, validate_json_structure
)
from app.ingestion.xml_parser import parse_xml_bytes, validate_xml_structure
from app.models.schemas import (
    NormalizedTransaction,
    IngestionReport,
    DatasetFormat,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class IngestionService:
    def __init__(self):
        self.max_file_size = settings.max_upload_size
        self.allowed_extensions = settings.allowed_extensions
        # Use streaming for files larger than this
        self.streaming_threshold = 50 * 1024 * 1024  # 50 MB
    
    def detect_format(self, filename: str) -> DatasetFormat:
        ext = Path(filename).suffix.lower()
        if ext == ".csv":
            return DatasetFormat.CSV
        elif ext == ".json":
            return DatasetFormat.JSON
        elif ext == ".xml":
            return DatasetFormat.XML
        else:
            raise ValueError(f"Unsupported file extension: {ext}")
    
    def validate_file_size(self, content: bytes) -> None:
        if len(content) > self.max_file_size:
            raise ValueError(f"File size {len(content)} exceeds maximum {self.max_file_size}")
    
    def compute_content_hash(self, content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()[:16]
    
    def _should_use_streaming(self, content: bytes) -> bool:
        return len(content) > self.streaming_threshold
    
    async def parse_content(
        self, content: bytes, format: DatasetFormat
    ) -> List[NormalizedTransaction]:
        """Parse content - uses streaming for large files."""
        self.validate_file_size(content)
        
        if self._should_use_streaming(content):
            logger.info(f"Large file detected ({len(content)} bytes), using streaming parser")
            return await self._parse_streaming(content, format)
        
        # Standard parsing for smaller files
        if format == DatasetFormat.CSV:
            return await parse_csv_bytes(content)
        elif format == DatasetFormat.JSON:
            return await parse_json_bytes(content)
        elif format == DatasetFormat.XML:
            return await parse_xml_bytes(content)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    async def _parse_streaming(
        self, content: bytes, format: DatasetFormat
    ) -> List[NormalizedTransaction]:
        """Parse using streaming for large files."""
        all_transactions = []
        
        if format == DatasetFormat.CSV:
            async for chunk in parse_csv_streaming(content):
                all_transactions.extend(chunk)
        elif format == DatasetFormat.JSON:
            async for chunk in parse_json_streaming(content):
                all_transactions.extend(chunk)
        else:
            # XML doesn't have streaming yet, fall back
            logger.warning(f"Streaming not implemented for {format}, using standard parser")
            if format == DatasetFormat.XML:
                return await parse_xml_bytes(content)
            raise ValueError(f"Unsupported format for streaming: {format}")
        
        logger.info(f"Streaming parse complete: {len(all_transactions)} transactions")
        return all_transactions
    
    def deduplicate_transactions(
        self, transactions: List[NormalizedTransaction]
    ) -> tuple[List[NormalizedTransaction], int]:
        seen = set()
        unique = []
        duplicates = 0
        
        for tx in transactions:
            key = (tx.txid, tx.timestamp.isoformat())
            if key not in seen:
                seen.add(key)
                unique.append(tx)
            else:
                duplicates += 1
        
        return unique, duplicates
    
    def generate_report(
        self,
        dataset_id: str,
        total_records: int,
        valid_records: int,
        invalid_records: int,
        duplicates: int,
        warnings: List[str],
    ) -> IngestionReport:
        return IngestionReport(
            dataset_id=dataset_id,
            total_records=total_records,
            valid_records=valid_records,
            invalid_records=invalid_records,
            duplicates=duplicates,
            warnings=warnings,
        )
    
    async def ingest(
        self, content: bytes, filename: str, dataset_id: str
    ) -> tuple[List[NormalizedTransaction], IngestionReport]:
        format = self.detect_format(filename)
        logger.info(f"Ingesting dataset {dataset_id} with format {format} ({len(content)} bytes)")
        
        warnings = []
        
        try:
            if format == DatasetFormat.CSV:
                import pandas as pd
                import io
                # Quick validation on sample
                if len(content) > 100000:
                    # For large files, just validate first chunk
                    df = pd.read_csv(io.BytesIO(content[:100000]), nrows=1)
                else:
                    df = pd.read_csv(io.BytesIO(content), nrows=1)
                warnings.extend(validate_csv_columns(df))
            elif format == DatasetFormat.JSON:
                data = parse_json_bytes.__wrapped__(content) if hasattr(parse_json_bytes, '__wrapped__') else []
                import json
                try:
                    parsed = json.loads(content.decode("utf-8"))
                    if isinstance(parsed, list):
                        warnings.extend(validate_json_structure(parsed))
                except:
                    pass
            elif format == DatasetFormat.XML:
                xml_str = content.decode("utf-8")
                import xml.etree.ElementTree as ET
                root = ET.fromstring(xml_str)
                records = []
                for elem in root:
                    if elem.tag in ("transaction", "tx", "record"):
                        records.append(self._xml_elem_to_dict(elem))
                warnings.extend(validate_xml_structure(records))
        except Exception as e:
            warnings.append(f"Structure validation warning: {str(e)}")
        
        transactions = await self.parse_content(content, format)
        
        unique_transactions, duplicates = self.deduplicate_transactions(transactions)
        
        report = self.generate_report(
            dataset_id=dataset_id,
            total_records=len(transactions) + duplicates,
            valid_records=len(unique_transactions),
            invalid_records=len(transactions) - len(unique_transactions),
            duplicates=duplicates,
            warnings=warnings,
        )
        
        logger.info(
            f"Ingestion complete for {dataset_id}: "
            f"{report.valid_records} valid, {report.invalid_records} invalid, "
            f"{report.duplicates} duplicates"
        )
        
        return unique_transactions, report
    
    def _xml_elem_to_dict(self, elem) -> Dict[str, Any]:
        result = {}
        for child in elem:
            if len(child) == 0:
                result[child.tag] = child.text
            else:
                if child.tag in ("input_addresses", "output_addresses", "input_amounts", "output_amounts"):
                    result[child.tag] = [c.text for c in child if c.text]
                else:
                    result[child.tag] = self._xml_elem_to_dict(child)
        for key, value in elem.attrib.items():
            result[f"@{key}"] = value
        return result


ingestion_service = IngestionService()