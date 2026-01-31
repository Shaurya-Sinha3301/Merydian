import logging
import datetime
from zeep import Client, Settings as ZeepSettings
from typing import Optional, List, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# TBO specific constants (Move to config/env in real prod if sensitive changes often)
WSDL_URL = "http://api.tbotechnology.in/hotelapi_v7/hotelservice.svc?wsdl"
# In a real app, these should be in settings.HEADER_CREDENTIALS or similar
# For now, we use the values we verified
USERNAME = "hackathontest"
PASSWORD = "Hac@98147521"
END_USER_IP = "127.0.0.1"

class TBOService:
    def __init__(self):
        self.wsdl_url = WSDL_URL
        self.settings = ZeepSettings(strict=False, xml_huge_tree=True)
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        try:
            self.client = Client(wsdl=self.wsdl_url, settings=self.settings)
            logger.info("TBO Zeep Client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize TBO Zeep Client: {e}")
            raise

    def get_auth_header(self) -> Dict[str, Any]:
        """Constructs the Credentials header required for TBO V7 operations."""
        return {
            'Credentials': {
                'UserName': USERNAME,
                'Password': PASSWORD,
                'IPAddress': END_USER_IP
            }
        }

    def search_hotels(self, city_name: str, checkin_date: datetime.date, checkout_date: datetime.date) -> Dict[str, Any]:
        """
        Orchestrates the search:
        1. Calls TopDestinations to find valid CityCode for `city_name`.
        2. Calls HotelSearch using that CityCode.
        """
        if not self.client:
           self._initialize_client()

        # 1. Find City Code
        city_code = self._get_city_code(city_name)
        if not city_code:
            logger.warning(f"City '{city_name}' not found in TopDestinations. Defaulting to Delhi (130443).")
            city_code = "130443"

        # 2. Execute Search
        return self._execute_hotel_search(city_code, checkin_date, checkout_date)

    def _get_city_code(self, city_name_query: str) -> Optional[str]:
        """Helper to fetch CityCode from TopDestinations."""
        try:
            res = self.client.service.TopDestinations(_soapheaders=self.get_auth_header())
            
            if res.Status.StatusCode == '01' and res.CityList:
                 # Handle Zeep unpacking
                 wrapper = res.CityList
                 if hasattr(wrapper, 'CityList'): 
                      raw_cities = wrapper.CityList
                 elif hasattr(wrapper, 'City'):
                      raw_cities = wrapper.City
                 else:
                      raw_cities = wrapper
                 
                 if not isinstance(raw_cities, list):
                     raw_cities = [raw_cities]
                     
                 for city in raw_cities:
                     if hasattr(city, 'CityCode') and city.CityName:
                         if city_name_query.lower() in city.CityName.lower():
                             logger.info(f"Found City: {city.CityName} ({city.CityCode})")
                             return city.CityCode
            return None
        except Exception as e:
            logger.error(f"TopDestinations lookup failed: {e}")
            return None

    def _execute_hotel_search(self, city_code: str, checkin: datetime.date, checkout: datetime.date) -> Dict[str, Any]:
        """Performs the actual HotelSearch operation."""
        try:
            # Construct strict RoomGuest
            ns = 'http://TekTravel/HotelBookingApi'
            room_guest_type = self.client.get_type(f'{{{ns}}}RoomGuest')
            
            room_guest = room_guest_type(
                AdultCount=1, 
                ChildCount=0, 
                ChildAge={'int': []} # Singular ChildAge
            )
            
            search_args = {
                'CheckInDate': checkin,
                'CheckOutDate': checkout,
                'CityId': city_code, 
                'IsNearBySearchAllowed': False,
                'NoOfRooms': 1,
                'GuestNationality': 'IN',
                'RoomGuests': {'RoomGuest': [room_guest]}, 
                'PreferredCurrencyCode': 'INR',
                'ResultCount': 10,
                'Filters': None,
                'IsRoomInfoRequired': True, 
                'GeoCodes': None,
                'ResponseTime': 0
            }
            
            logger.info(f"Calling TBO HotelSearch for CityId {city_code}...")
            res = self.client.service.HotelSearch(**search_args, _soapheaders=self.get_auth_header())
            
            # Convert Zeep object to dict-like structure or return raw
            # For simplicity, returning the Status and Result count for now
            return res
            
        except Exception as e:
            logger.error(f"HotelSearch Operation Failed: {e}")
            # Return error dict
            return {"error": str(e), "Status": {"StatusCode": "99", "Description": "Exception"}}

tbo_service = TBOService()
