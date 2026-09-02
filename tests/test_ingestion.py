import pytest
import json
from datetime import datetime, timedelta
from app.ingestion.validator import (
    is_valid_ip, is_valid_port, parse_timestamp,
    validate_tx_id, validate_address, validate_amount,
    normalize_addresses, normalize_amounts, validate_record
)
from app.ingestion.csv_parser import parse_csv_row
from app.ingestion.json_parser import parse_json_row
from app.models.schemas import NormalizedTransaction


class TestValidator:
    def test_valid_ipv4(self):
        assert is_valid_ip("192.168.1.1") is True
        assert is_valid_ip("10.0.0.1") is True
        assert is_valid_ip("255.255.255.255") is True
    
    def test_invalid_ipv4(self):
        assert is_valid_ip("256.1.1.1") is False
        assert is_valid_ip("192.168.1") is False
        assert is_valid_ip("not.an.ip") is False
        assert is_valid_ip("") is False
        assert is_valid_ip(None) is False
    
    def test_valid_ipv6(self):
        assert is_valid_ip("2001:0db8:85a3:0000:0000:8a2e:0370:7334") is True
        assert is_valid_ip("::1") is True
    
    def test_valid_port(self):
        assert is_valid_port(80) is True
        assert is_valid_port(8333) is True
        assert is_valid_port(65535) is True
        assert is_valid_port(0) is True
        assert is_valid_port("80") is True
    
    def test_invalid_port(self):
        assert is_valid_port(65536) is False
        assert is_valid_port(-1) is False
        assert is_valid_port("invalid") is False
    
    def test_parse_timestamp(self):
        ts = parse_timestamp("2024-01-15T10:30:00Z")
        assert ts is not None
        assert ts.year == 2024
        assert ts.month == 1
        assert ts.day == 15
    
    def test_parse_timestamp_various_formats(self):
        formats = [
            "2024-01-15T10:30:00.123Z",
            "2024-01-15T10:30:00Z",
            "2024-01-15 10:30:00",
            "2024-01-15",
            1705315800,
        ]
        for fmt in formats:
            ts = parse_timestamp(fmt)
            assert ts is not None, f"Failed to parse {fmt}"
    
    def test_invalid_timestamp(self):
        assert parse_timestamp("invalid") is None
        assert parse_timestamp("") is None
        assert parse_timestamp(None) is None
    
    def test_validate_tx_id(self):
        assert validate_tx_id("a" * 64) is True
        assert validate_tx_id("abc123") is False  # too short, min 32 chars
        assert validate_tx_id("") is False
        assert validate_tx_id(None) is False
    
    def test_validate_address(self):
        assert validate_address("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa") is True
        assert validate_address("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy") is True
        assert validate_address("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq") is True
        assert validate_address("") is False
        assert validate_address("short") is False
    
    def test_validate_amount(self):
        assert validate_amount(0.5) == 0.5
        assert validate_amount("1.23") == 1.23
        assert validate_amount(0) == 0.0
        assert validate_amount(-1) is None
        assert validate_amount("invalid") is None
        assert validate_amount(None) is None
    
    def test_normalize_addresses(self):
        # Uses validate_address which requires valid bitcoin address format
        valid_addr = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        assert normalize_addresses([valid_addr, valid_addr]) == [valid_addr, valid_addr]
        assert normalize_addresses(f'["{valid_addr}", "{valid_addr}"]') == [valid_addr, valid_addr]
        assert normalize_addresses(f"{valid_addr}, {valid_addr}") == [valid_addr, valid_addr]
        assert normalize_addresses([]) == []
        assert normalize_addresses(None) == []
    
    def test_normalize_amounts(self):
        assert normalize_amounts([0.1, 0.2]) == [0.1, 0.2]
        assert normalize_amounts('[0.1, 0.2]') == [0.1, 0.2]
        assert normalize_amounts("0.1, 0.2") == [0.1, 0.2]
        assert normalize_amounts([]) == []
        assert normalize_amounts(None) == []
    
    def test_validate_record_valid(self):
        record = {
            "txid": "a" * 64,
            "timestamp": "2024-01-15T10:30:00Z",
            "input_addresses": ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
            "output_addresses": ["3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"],
            "input_amounts": [0.5],
            "output_amounts": [0.49],
            "fee": 0.01,
        }
        valid, errors = validate_record(record)
        assert valid is True
        assert len(errors) == 0
    
    def test_validate_record_missing_txid(self):
        record = {"timestamp": "2024-01-15T10:30:00Z"}
        valid, errors = validate_record(record)
        assert valid is False
        assert any("txid" in e.lower() for e in errors)
    
    def test_validate_record_mismatched_arrays(self):
        record = {
            "txid": "a" * 64,
            "timestamp": "2024-01-15T10:30:00Z",
            "input_addresses": ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"],
            "input_amounts": [0.5],
        }
        valid, errors = validate_record(record)
        # Validation checks lengths after normalization
        # 2 addresses vs 1 amount = mismatch
        assert valid is False
        assert any("mismatch" in e.lower() for e in errors)


class TestCSVParsing:
    def test_parse_csv_row_valid(self):
        row = {
            "txid": "a" * 64,
            "timestamp": "2024-01-15T10:30:00Z",
            "input_addresses": '["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"]',
            "output_addresses": '["3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"]',
            "input_amounts": "[0.5]",
            "output_amounts": "[0.49]",
            "fee": "0.01",
            "script_type": "P2PKH",
            "src_ip": "192.168.1.1",
            "dst_ip": "10.0.0.1",
            "src_port": "54321",
            "dst_port": "8333",
            "geo_country": "US",
            "asn": "AS15169",
        }
        tx = parse_csv_row(row)
        assert tx is not None
        assert isinstance(tx, NormalizedTransaction)
        assert tx.txid == "a" * 64
        assert len(tx.inputs) == 1
        assert len(tx.outputs) == 1
    
    def test_parse_csv_row_invalid(self):
        row = {
            "txid": "",
            "timestamp": "invalid",
        }
        tx = parse_csv_row(row)
        assert tx is None


class TestJSONParsing:
    def test_parse_json_row_valid(self):
        row = {
            "txid": "b" * 64,
            "timestamp": "2024-01-15T10:30:00Z",
            "input_addresses": ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
            "output_addresses": ["3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"],
            "input_amounts": [0.5],
            "output_amounts": [0.49],
            "fee": 0.01,
        }
        tx = parse_json_row(row)
        assert tx is not None
        assert tx.txid == "b" * 64


class TestSchemas:
    def test_normalized_transaction(self):
        tx = NormalizedTransaction(
            txid="c" * 64,
            timestamp=datetime.utcnow(),
            inputs=["addr1"],
            outputs=["addr2"],
            input_amounts=[0.5],
            output_amounts=[0.49],
            fee=0.01,
            input_amount=0.5,
            output_amount=0.49,
        )
        assert tx.txid == "c" * 64
        assert tx.input_amount == 0.5
        assert tx.output_amount == 0.49
    
    def test_risk_levels(self):
        from app.models.schemas import RiskLevel
        assert RiskLevel.LOW == "LOW"
        assert RiskLevel.MEDIUM == "MEDIUM"
        assert RiskLevel.HIGH == "HIGH"
        assert RiskLevel.CRITICAL == "CRITICAL"