#!/usr/bin/env python3
"""
GeoIP Database Setup Script
===========================

Downloads and installs MaxMind GeoLite2 databases for offline GeoIP lookups.

Usage:
    python scripts/setup_geoip.py

Requirements:
    pip install geoip2 requests

The script will:
1. Create data/geoip/ directory
2. Download GeoLite2-Country.mmdb (free, requires MaxMind account)
3. Download GeoLite2-ASN.mmdb (free, requires MaxMind account)
4. Verify the databases work

Note: MaxMind requires a free account for GeoLite2 downloads.
You can also manually download from https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
and place the .mmdb files in data/geoip/
"""

import os
import sys
import tarfile
import tempfile
from pathlib import Path
from urllib.request import urlopen, Request
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


# MaxMind GeoLite2 download URLs (require license key)
# These are placeholder URLs - you need a MaxMind account
GEOLITE2_COUNTRY_URL = "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key={LICENSE_KEY}&suffix=tar.gz"
GEOLITE2_ASN_URL = "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-ASN&license_key={LICENSE_KEY}&suffix=tar.gz"


def setup_geoip_directory() -> Path:
    """Create the geoip data directory."""
    geoip_dir = Path(__file__).resolve().parent.parent / "data" / "geoip"
    geoip_dir.mkdir(parents=True, exist_ok=True)
    return geoip_dir


def check_existing_databases(geoip_dir: Path) -> Tuple[bool, bool]:
    """Check if databases already exist."""
    country_db = geoip_dir / "GeoLite2-Country.mmdb"
    asn_db = geoip_dir / "GeoLite2-ASN.mmdb"
    return country_db.exists(), asn_db.exists()


def download_and_extract(url: str, dest_dir: Path, target_filename: str) -> bool:
    """Download and extract a MaxMind database."""
    try:
        logger.info(f"Downloading from {url[:80]}...")
        req = Request(url, headers={'User-Agent': 'bitcoin-forensics/1.0'})

        with tempfile.NamedTemporaryFile(suffix='.tar.gz', delete=False) as tmp:
            with urlopen(req, timeout=60) as response:
                tmp.write(response.read())
            tmp_path = tmp.name

        # Extract the .mmdb file
        with tarfile.open(tmp_path, 'r:gz') as tar:
            for member in tar.getmembers():
                if member.name.endswith('.mmdb'):
                    member.name = target_filename
                    tar.extract(member, dest_dir)
                    logger.info(f"Extracted {target_filename} to {dest_dir}")
                    break

        os.unlink(tmp_path)
        return True

    except Exception as e:
        logger.error(f"Failed to download/extract: {e}")
        return False


def verify_database(db_path: Path) -> bool:
    """Verify a GeoIP database can be opened and queried correctly."""
    try:
        import geoip2.database
        reader = geoip2.database.Reader(str(db_path))

        # Determine database type and use appropriate method
        db_name = db_path.name
        if "Country" in db_name:
            # Country database uses .country() method
            response = reader.country("8.8.8.8")
            country_code = response.country.iso_code
            logger.info(f"Verified Country database: {db_path.name} (country: {country_code})")
        elif "ASN" in db_name:
            # ASN database uses .asn() method
            response = reader.asn("8.8.8.8")
            asn = response.autonomous_system_number
            logger.info(f"Verified ASN database: {db_path.name} (ASN: AS{asn})")
        else:
            # Unknown database type, try country first then asn
            try:
                response = reader.country("8.8.8.8")
                country_code = response.country.iso_code
                logger.info(f"Verified database (country): {db_path.name} (country: {country_code})")
            except AttributeError:
                response = reader.asn("8.8.8.8")
                asn = response.autonomous_system_number
                logger.info(f"Verified database (ASN): {db_path.name} (ASN: AS{asn})")

        reader.close()
        return True
    except Exception as e:
        logger.error(f"Database verification failed for {db_path}: {e}")
        return False


def print_manual_instructions(geoip_dir: Path):
    """Print manual installation instructions."""
    print("\n" + "="*70)
    print("MANUAL INSTALLATION REQUIRED")
    print("="*70)
    print(f"""
MaxMind GeoLite2 databases require a free MaxMind account.

1. Create a free account at: https://www.maxmind.com/en/geolite2/signup
2. Generate a license key at: https://www.maxmind.com/en/accounts/current/license-key
3. Run this script with your license key:

   export MAXMIND_LICENSE_KEY="your_license_key_here"
   python scripts/setup_geoip.py

OR manually download and place in {geoip_dir}:

   - GeoLite2-Country.mmdb
   - GeoLite2-ASN.mmdb (optional)

Download from: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
""")
    print("="*70)


def main():
    geoip_dir = setup_geoip_directory()
    logger.info(f"GeoIP directory: {geoip_dir}")

    # Check existing
    country_exists, asn_exists = check_existing_databases(geoip_dir)
    if country_exists and asn_exists:
        logger.info("Both databases already exist. Verifying...")
        if verify_database(geoip_dir / "GeoLite2-Country.mmdb") and \
           verify_database(geoip_dir / "GeoLite2-ASN.mmdb"):
            logger.info("All databases verified successfully!")
            return 0

    # Check for license key
    license_key = os.environ.get("MAXMIND_LICENSE_KEY")
    if not license_key:
        print_manual_instructions(geoip_dir)
        logger.error("MAXMIND_LICENSE_KEY environment variable not set")
        return 1

    # Download databases
    success = True

    if not country_exists:
        url = GEOLITE2_COUNTRY_URL.format(LICENSE_KEY=license_key)
        success &= download_and_extract(url, geoip_dir, "GeoLite2-Country.mmdb")

    if not asn_exists:
        url = GEOLITE2_ASN_URL.format(LICENSE_KEY=license_key)
        success &= download_and_extract(url, geoip_dir, "GeoLite2-ASN.mmdb")

    # Verify
    if success:
        success &= verify_database(geoip_dir / "GeoLite2-Country.mmdb")
        if (geoip_dir / "GeoLite2-ASN.mmdb").exists():
            success &= verify_database(geoip_dir / "GeoLite2-ASN.mmdb")

    if success:
        logger.info("GeoIP setup completed successfully!")
        return 0
    else:
        logger.error("GeoIP setup failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())