"""
TBO City Code Cache — Dynamic Lookup via TBO CityList API

Per TBO Hotel API V2.1 spec, city codes must be fetched via POST /CityList.
This module provides a cached, fuzzy-match resolver:

    CityCodeCache.get_city_code("Jaipur, Rajasthan") → "419948"

Strategy:
    1. First try the seed dict (instant, no I/O)
    2. Then fuzzy-match against the live TBO CityList for India (fetched once,
       cached in memory for the lifetime of the process)
    3. Fallback to Delhi NCR (418069) if no match

The seed dict covers ~50 top Indian tourism destinations from well-known
TBO codes used in integration testing.
"""

import logging
import threading
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
#  Seed dict — top Indian tourism cities (TBO city codes)
#  Source: TBO integration tests + known valid codes
# ---------------------------------------------------------------------------
_SEED_CODES: Dict[str, str] = {
    # Metro cities
    "delhi": "418069",
    "delhi ncr": "418069",
    "new delhi": "418069",
    "mumbai": "128014",
    "bombay": "128014",
    "bangalore": "119532",
    "bengaluru": "119532",
    "chennai": "119977",
    "madras": "119977",
    "kolkata": "119856",
    "calcutta": "119856",
    "hyderabad": "119751",
    "pune": "128327",
    "ahmedabad": "119183",
    # Rajasthan
    "jaipur": "419948",
    "jodhpur": "420021",
    "udaipur": "420114",
    "jaisalmer": "419955",
    "pushkar": "420069",
    "bikaner": "419817",
    "ajmer": "419785",
    "mount abu": "420046",
    # Goa
    "goa": "119068",
    "north goa": "119068",
    "south goa": "119068",
    "panaji": "119068",
    # Kerala
    "kochi": "120011",
    "cochin": "120011",
    "thiruvananthapuram": "120205",
    "trivandrum": "120205",
    "munnar": "120139",
    "alleppey": "120003",
    "alappuzha": "120003",
    "kozhikode": "120055",
    "calicut": "120055",
    "kumarakom": "120060",
    # Tamil Nadu / Andhra / Karnataka
    "mysore": "120150",
    "mysuru": "120150",
    "coorg": "119991",
    "kodagu": "119991",
    "ooty": "120170",
    "mahabalipuram": "120090",
    "pondicherry": "120171",
    "puducherry": "120171",
    "madurai": "120088",
    "tirupati": "120211",
    "hampi": "119730",
    # Maharashtra / MP / Gujarat
    "aurangabad": "119213",
    "nagpur": "128208",
    "nashik": "128217",
    "bhopal": "119316",
    "indore": "119766",
    "ujjain": "120234",
    "vadodara": "119196",
    "surat": "119197",
    # North India / Himachal / Uttarakhand
    "shimla": "420092",
    "manali": "420035",
    "dharamsala": "419860",
    "mcleod ganj": "419860",
    "leh": "420023",
    "ladakh": "420023",
    "amritsar": "419788",
    "chandigarh": "419832",
    "dehradun": "419851",
    "haridwar": "419921",
    "rishikesh": "419921",
    "mussoorie": "420047",
    "nainital": "420048",
    "jim corbett": "420010",
    # UP / Bihar / East India
    "agra": "419784",
    "varanasi": "420116",
    "benaras": "420116",
    "lucknow": "420028",
    "allahabad": "419786",
    "prayagraj": "419786",
    "patna": "120180",
    "bodh gaya": "119340",
    "darjeeling": "120024",
    "gangtok": "120052",
    "shillong": "120192",
    "guwahati": "119720",
    # Islands
    "port blair": "120187",
    "andaman": "120187",
    "lakshadweep": "120070",
}

# ---------------------------------------------------------------------------
#  Runtime cache — populated on first use from TBO CityList API
# ---------------------------------------------------------------------------
_LIVE_CACHE: Dict[str, str] = {}  # normalized_name → city_code
_cache_lock = threading.Lock()
_cache_populated = False


def _normalize(name: str) -> str:
    """Lowercase, strip commas/parens/state suffixes for fuzzy matching."""
    name = name.lower().strip()
    # Drop ", India" / ", Rajasthan" / "(Delhi)" style suffixes
    for sep in (",", "(", "-"):
        name = name.split(sep)[0].strip()
    return name


def _populate_live_cache() -> None:
    """Fetch all Indian cities from TBO CityList and populate _LIVE_CACHE."""
    global _cache_populated
    try:
        from app.services.tbo_service import TBOHotelClient
        client = TBOHotelClient()
        cities = client.get_cities("IN")
        with _cache_lock:
            for city in cities:
                code = str(city.get("Code") or city.get("CityCode") or "")
                raw_name = city.get("Name") or city.get("CityName") or ""
                if code and raw_name:
                    _LIVE_CACHE[_normalize(raw_name)] = code
            _cache_populated = True
        logger.info("CityCodeCache: loaded %d Indian cities from TBO", len(_LIVE_CACHE))
    except Exception as e:
        logger.warning("CityCodeCache: could not populate from TBO CityList: %s", e)
        _cache_populated = True  # Don't retry endlessly


class CityCodeCache:
    """
    Resolve a destination string to a TBO numeric city code.

    Usage:
        code = CityCodeCache.get_city_code("Jaipur, Rajasthan")
        # → "419948"
    """

    DEFAULT_CITY_CODE = "418069"  # Delhi NCR

    @classmethod
    def get_city_code(cls, destination: str) -> str:
        """
        Resolve destination to TBO city code.

        Order:
        1. Seed dict (instant)
        2. Live TBO CityList cache (fetched once per process)
        3. Fallback: Delhi NCR

        Args:
            destination: Free-text destination, e.g. "Jaipur, India" or "mumbai"

        Returns:
            TBO numeric city code string
        """
        normalized = _normalize(destination)

        # Step 1: seed dict
        if normalized in _SEED_CODES:
            return _SEED_CODES[normalized]

        # Try word-by-word match against seed (handles "Delhi, India" → "delhi")
        for word in normalized.split():
            if word in _SEED_CODES:
                return _SEED_CODES[word]

        # Step 2: live cache (populate if needed)
        if not _cache_populated:
            _populate_live_cache()

        if normalized in _LIVE_CACHE:
            return _LIVE_CACHE[normalized]

        # Partial match against live cache
        for city_name, code in _LIVE_CACHE.items():
            if normalized in city_name or city_name in normalized:
                return code

        # Step 3: fallback
        logger.warning(
            "CityCodeCache: no TBO city code found for '%s', defaulting to Delhi NCR", destination
        )
        return cls.DEFAULT_CITY_CODE

    @classmethod
    def get_all_cities(cls) -> Dict[str, str]:
        """
        Return the full city name → code mapping (seed + live).
        Triggers live cache population if not already done.
        """
        if not _cache_populated:
            _populate_live_cache()
        combined = dict(_SEED_CODES)
        combined.update(_LIVE_CACHE)
        return combined

    @classmethod
    def refresh(cls) -> int:
        """Force re-fetch of the live city list from TBO. Returns new count."""
        global _cache_populated, _LIVE_CACHE
        with _cache_lock:
            _LIVE_CACHE = {}
            _cache_populated = False
        _populate_live_cache()
        return len(_LIVE_CACHE)
