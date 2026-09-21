"""
Real Offline GeoIP Service
==========================
Uses a local MaxMind GeoLite2 database (.mmdb format) for IP geolocation.
No runtime internet access required.

Requirements:
- pip install geoip2
- Download GeoLite2-Country.mmdb from https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
- Place in data/geoip/GeoLite2-Country.mmdb

Returns:
- country: ISO 3166-1 alpha-2 code (e.g., "US", "DE")
- asn: Autonomous System Number (if ASN database available)
- Private IPs return None/None with PRIVATE classification
- Invalid IPs return None/None
- Missing database returns None/None with clear error logging
"""

import ipaddress
import logging
from pathlib import Path
from typing import Optional, Tuple
from functools import lru_cache

logger = logging.getLogger(__name__)

# Try to import geoip2
try:
    import geoip2.database
    GEOIP2_AVAILABLE = True
except ImportError:
    GEOIP2_AVAILABLE = False
    logger.warning("geoip2 package not installed. GeoIP lookups will return None. Install with: pip install geoip2")


# Path to the local GeoIP database
GEOIP_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "geoip" / "GeoLite2-Country.mmdb"
GEOIP_ASN_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "geoip" / "GeoLite2-ASN.mmdb"


class GeoIPService:
    """Offline GeoIP lookup service using MaxMind databases."""
    
    def __init__(self):
        self._country_reader = None
        self._asn_reader = None
        self._initialized = False
        self._init_error = None
    
    def initialize(self) -> bool:
        """Initialize the GeoIP database readers."""
        if self._initialized:
            return self._country_reader is not None
        
        self._initialized = True
        
        if not GEOIP2_AVAILABLE:
            self._init_error = "geoip2 package not installed"
            logger.warning(self._init_error)
            return False
        
        # Try to load country database
        if GEOIP_DB_PATH.exists():
            try:
                self._country_reader = geoip2.database.Reader(str(GEOIP_DB_PATH))
                logger.info(f"Loaded GeoIP country database from {GEOIP_DB_PATH}")
            except Exception as e:
                self._init_error = f"Failed to load GeoIP country database: {e}"
                logger.error(self._init_error)
        else:
            self._init_error = f"GeoIP country database not found at {GEOIP_DB_PATH}. Download from https://dev.maxmind.com/geoip/geolite2-free-geolocation-data"
            logger.warning(self._init_error)
        
        # Try to load ASN database (optional)
        if GEOIP_ASN_DB_PATH.exists():
            try:
                self._asn_reader = geoip2.database.Reader(str(GEOIP_ASN_DB_PATH))
                logger.info(f"Loaded GeoIP ASN database from {GEOIP_ASN_DB_PATH}")
            except Exception as e:
                logger.warning(f"Failed to load GeoIP ASN database: {e}")
        else:
            logger.info(f"GeoIP ASN database not found at {GEOIP_ASN_DB_PATH} (optional)")
        
        return self._country_reader is not None
    
    def lookup(self, ip: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Look up country and ASN for an IP address.
        
        Returns:
            (country_code, asn) tuple
            - country_code: ISO 3166-1 alpha-2 (e.g., "US") or None
            - asn: AS number string (e.g., "AS15169") or None
            
        Special cases:
            - Private IPs: returns (None, None) - caller should handle as PRIVATE
            - Invalid IPs: returns (None, None)
            - Database missing: returns (None, None)
        """
        # Validate IP
        if not ip or not self._is_valid_ip(ip):
            return None, None
        
        # Check for private/reserved IPs
        if self._is_private_ip(ip):
            return None, None  # Caller should classify as PRIVATE
        
        # Initialize if needed
        if not self._initialized:
            self.initialize()
        
        # If no database, return None
        if not self._country_reader:
            return None, None
        
        country_code = None
        asn = None
        
        # Country lookup
        try:
            response = self._country_reader.country(ip)
            country_code = response.country.iso_code
        except geoip2.errors.AddressNotFoundError:
            pass  # IP not in database
        except Exception as e:
            logger.debug(f"GeoIP country lookup failed for {ip}: {e}")
        
        # ASN lookup (optional)
        if self._asn_reader:
            try:
                response = self._asn_reader.asn(ip)
                asn = f"AS{response.autonomous_system_number}"
            except geoip2.errors.AddressNotFoundError:
                pass
            except Exception as e:
                logger.debug(f"GeoIP ASN lookup failed for {ip}: {e}")
        
        return country_code, asn
    
    def _is_valid_ip(self, ip: str) -> bool:
        """Check if string is a valid IP address."""
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False
    
    def _is_private_ip(self, ip: str) -> bool:
        """Check if IP is private/reserved (RFC 1918, RFC 6598, etc.)."""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_multicast
                or ip_obj.is_reserved
                or ip_obj.is_unspecified
            )
        except ValueError:
            return False
    
    def classify_ip(self, ip: str) -> str:
        """
        Classify an IP address.
        
        Returns:
            - "PRIVATE" for private/reserved IPs
            - "PUBLIC" for public IPs with database entry
            - "UNKNOWN" for public IPs not in database
            - "INVALID" for invalid IP strings
        """
        if not ip or not self._is_valid_ip(ip):
            return "INVALID"
        
        if self._is_private_ip(ip):
            return "PRIVATE"
        
        if not self._initialized:
            self.initialize()
        
        if not self._country_reader:
            return "UNKNOWN"
        
        try:
            self._country_reader.country(ip)
            return "PUBLIC"
        except geoip2.errors.AddressNotFoundError:
            return "UNKNOWN"
        except Exception:
            return "UNKNOWN"
    
    def close(self):
        """Close database readers."""
        if self._country_reader:
            self._country_reader.close()
            self._country_reader = None
        if self._asn_reader:
            self._asn_reader.close()
            self._asn_reader = None
        self._initialized = False


# Global instance
geoip_service = GeoIPService()


def resolve_offline_geoip(ip: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Resolve GeoIP for an IP address using local database.
    
    This replaces the fake arithmetic first-octet mapping.
    
    Returns:
        (country_code, asn) or (None, None)
        
    Note: For private IPs, returns (None, None). Caller should check
    classify_ip() if they need to distinguish PRIVATE from UNKNOWN.
    """
    return geoip_service.lookup(ip)


def classify_ip_type(ip: str) -> str:
    """Classify IP as PRIVATE, PUBLIC, UNKNOWN, or INVALID."""
    return geoip_service.classify_ip(ip)


def initialize_geoip() -> bool:
    """Initialize the GeoIP service. Call at application startup."""
    return geoip_service.initialize()


# For backward compatibility with validator.py
def is_valid_ip(ip: str) -> bool:
    """Check if string is a valid IP address."""
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False