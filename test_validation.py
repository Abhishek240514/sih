import sys
import logging
sys.path.append("/Users/abhishekchopra/Desktop/bitcoin-forensics")
logging.basicConfig(level=logging.DEBUG)
from app.ingestion.csv_parser import parse_csv_row
import csv

with open("/Users/abhishekchopra/.gemini/antigravity-ide/brain/db6ede19-d8b8-4587-8e01-62f11fc268d4/sample_bitcoin_forensics.csv", "r") as f:
    reader = csv.DictReader(f)
    for row in list(reader)[:1]:
        print("Row:", row)
        tx = parse_csv_row(row)
        print("Row parsing result:", "SUCCESS" if tx else "FAILED")
