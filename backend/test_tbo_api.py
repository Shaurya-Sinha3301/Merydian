import logging
import time
from zeep import Client, Settings as ZeepSettings
from zeep.transports import Transport
import httpx

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Reduce zeep noise
logging.getLogger("zeep").setLevel(logging.WARNING)

# Credentials
WSDL_URL = "http://api.tbotechnology.in/hotelapi_v7/hotelservice.svc?wsdl"
USERNAME = "hackathontest"
PASSWORD = "Hac@98147521"
CLIENT_ID = "tbotechnology" 
END_USER_IP = "127.0.0.1"

def test_zeep():
    logger.info("Initializing Zeep Client...")
    settings = ZeepSettings(strict=False, xml_huge_tree=True)
    try:
        client = Client(wsdl=WSDL_URL, settings=settings)
        logger.info("WSDL Parsed Successfully.")
        
        # Construct Header Data
        # Error indicated AuthenticationData signature: Password, UserName, IPAddress
        header_val = {
            'UserName': USERNAME,
            'Password': PASSWORD,
            'IPAddress': END_USER_IP
        }
        
        # 1. Get Top Destinations to find a valid CityId
        logger.info("Calling TopDestinations to find a valid City...")
        try:
             # Needs only Credentials header
             dest_res = client.service.TopDestinations(_soapheaders={'Credentials': header_val})
             
             valid_city_id = None
             if dest_res.Status.StatusCode == '01' and dest_res.CityList:
                 # Structure seems to be: CityList (wrapper) -> City (list of cities)
                 # Or CityList -> CityList -> City?
                 # Log said Item Dir: ['City']
                 
                 wrapper = dest_res.CityList
                 if hasattr(wrapper, 'CityList'): # Sometimes it's CityList.CityList
                      raw_cities = wrapper.CityList
                 elif hasattr(wrapper, 'City'):
                      raw_cities = wrapper.City
                 else:
                      raw_cities = wrapper
                 
                 if not isinstance(raw_cities, list):
                     raw_cities = [raw_cities]
                     
                 logger.info(f"Found {len(raw_cities)} Cities in Top List. Searching for Delhi...")
                 
                 for city in raw_cities:
                     if hasattr(city, 'CityCode'):
                         # logger.info(f"City: {city.CityName}, Code: {city.CityCode}")
                         if city.CityName and 'Delhi' in city.CityName:
                             valid_city_id = city.CityCode
                             logger.info(f"!!! Found Delhi in Top List: {city.CityName} ({city.CityCode}) !!!")
                             break
                 
                 if valid_city_id:
                     logger.info(f"Using CityId: {valid_city_id}")
                 else:
                      logger.warning("Delhi not found in Top Destinations. Defaulting to standard Delhi Code 130443.")
                      valid_city_id = '130443'
                      
             else:
                 logger.warning("TopDestinations parsing failed.")
                 valid_city_id = '130443'
                 
             if not valid_city_id: valid_city_id = '130443'
                 
        except Exception as e:
            logger.error(f"TopDestinations Failed: {e}")
            valid_city_id = '130443' # Fallback

        # 2. Try Hotel Search with Token/Auth
        logger.info(f"\n--- Attempting Hotel Search for CityId: {valid_city_id} ---")
        
        # Hotel Search Arguments
        import datetime
        # User requested Jan 31, but today is Feb 1st 2026 (based on system time)
        # So Jan 31 is in the Past. Adjusting to future.
        checkin = datetime.date.today() + datetime.timedelta(days=2) # Feb 3rd
        checkout = checkin + datetime.timedelta(days=2) # 2 nights
        
        logger.info(f"Search Dates: {checkin} to {checkout}")
        
        # RoomGuests - Use Factory to be safe
        try:
             ns = 'http://TekTravel/HotelBookingApi'
             room_guest_type = client.get_type(f'{{{ns}}}RoomGuest')
             
             # User requested: 1 Adult, 0 Children
             # Error indicated correct param is ChildAge (singular)
             room_guest = room_guest_type(
                 AdultCount=1, 
                 ChildCount=0, 
                 ChildAge={'int': []} 
             )
             logger.info(f"Created RoomGuest object: {room_guest}")

        except Exception as e:
            logger.warning(f"Type factory failed: {e}")
            # Fallback
            room_guest = {'AdultCount': 1, 'ChildCount': 0, 'ChildAge': {'int': []}}
        
        search_args = {
            'CheckInDate': checkin,
            'CheckOutDate': checkout,
            # 'CountryName': 'India', 
            # 'CityName': 'Delhi',
            'CityId': valid_city_id, 
            'IsNearBySearchAllowed': False,
            'NoOfRooms': 1,
            'GuestNationality': 'IN',
            'RoomGuests': {'RoomGuest': [room_guest]}, 
            'PreferredCurrencyCode': 'INR',
            'ResultCount': 10, # Request more results
            'Filters': None,
            'IsRoomInfoRequired': True, 
            'GeoCodes': None,
            'ResponseTime': 0
        }
        
        logger.info("Calling HotelSearch...")
        # ... logic continues ...
        try:
            # Pass dictionary for header. Zeep maps it to the element 'Credentials'
            res = client.service.HotelSearch(**search_args, _soapheaders={'Credentials': header_val})
            
            logger.info("!!! HOTEL SEARCH SUCCESS !!!")
            logger.info(f"Status: {res.Status}")
            
            # Print some details
            if hasattr(res, 'HotelResultList') and res.HotelResultList:
                logger.info(f"Found {len(res.HotelResultList)} hotels.")
                first = res.HotelResultList[0] if isinstance(res.HotelResultList, list) else res.HotelResultList.Hotel_Result[0]
                logger.info(f"First Hotel: {first.HotelName}, Address: {first.Address}")
            else:
                logger.info("No hotels found or different response structure.")
                logger.info(res)
                
        except Exception as e:
            logger.error(f"HotelSearch Failed: {e}")
            
    except Exception as e:
        logger.error(f"Error initializing Client: {e}")

if __name__ == "__main__":
    test_zeep()
