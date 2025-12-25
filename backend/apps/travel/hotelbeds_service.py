"""
Hotelbeds API service for hotel bookings
Documentation: https://developer.hotelbeds.com/
"""
import logging
import requests
import hashlib
from typing import Dict, List, Optional
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


class HotelbedsAPI:
    """Hotelbeds API client for hotel search and bookings"""

    def __init__(self):
        self.api_key = settings.HOTELBEDS_API_KEY
        self.secret = settings.HOTELBEDS_SECRET
        self.base_url = settings.HOTELBEDS_API_BASE

    def _get_signature(self) -> str:
        """Generate X-Signature header for Hotelbeds API authentication"""
        utc_timestamp = str(int(datetime.utcnow().timestamp()))
        signature_string = self.api_key + self.secret + utc_timestamp
        signature = hashlib.sha256(signature_string.encode('utf-8')).hexdigest()
        return signature

    def _get_headers(self) -> Dict[str, str]:
        """Get authentication headers for Hotelbeds API"""
        return {
            'Api-Key': self.api_key,
            'X-Signature': self._get_signature(),
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

    def search_hotels(
        self,
        destination_code: str,
        check_in: str,
        check_out: str,
        adults: int = 2,
        rooms: int = 1,
        max_results: int = 10
    ) -> List[Dict]:
        """
        Search for hotels

        Args:
            destination_code: Hotelbeds destination code (e.g., 'PAR' for Paris)
            check_in: Check-in date in YYYY-MM-DD format
            check_out: Check-out date in YYYY-MM-DD format
            adults: Number of adults (default: 2)
            rooms: Number of rooms (default: 1)
            max_results: Maximum number of results (default: 10)

        Returns:
            List of hotel dictionaries
        """
        if not self.api_key or not self.secret:
            logger.error("❌ Hotelbeds API credentials not configured")
            logger.error(f"   API_KEY: {'SET' if self.api_key else 'MISSING'}")
            logger.error(f"   SECRET: {'SET' if self.secret else 'MISSING'}")
            logger.error(f"   BASE_URL: {self.base_url}")
            return []

        try:
            url = f"{self.base_url}/hotel-api/1.0/hotels"
            headers = self._get_headers()

            # Build request body
            body = {
                "stay": {
                    "checkIn": check_in,
                    "checkOut": check_out
                },
                "occupancies": [
                    {
                        "rooms": rooms,
                        "adults": adults,
                        "children": 0
                    }
                ],
                "destination": {
                    "code": destination_code
                }
            }

            logger.info(f"🌐 Sending request to HotelBeds: {url}")
            logger.info(f"📦 Request body: {body}")

            response = requests.post(url, headers=headers, json=body, timeout=20)

            logger.info(f"📡 HotelBeds response status: {response.status_code}")

            response.raise_for_status()

            data = response.json()
            hotels = data.get('hotels', {}).get('hotels', [])

            logger.info(f"✅ Successfully parsed {len(hotels)} hotels from response")

            # Simplify hotel data
            simplified_hotels = []
            for idx, hotel in enumerate(hotels[:max_results]):
                try:
                    # Debug: Log first hotel to understand structure
                    if idx == 0:
                        logger.info(f"🔍 Sample hotel keys: {list(hotel.keys())}")
                        logger.info(f"🔍 Has rooms: {bool(hotel.get('rooms'))}, count: {len(hotel.get('rooms', []))}")
                        if hotel.get('rooms'):
                            first_room = hotel['rooms'][0]
                            logger.info(f"🔍 First room keys: {list(first_room.keys())}")
                            logger.info(f"🔍 First room: {first_room}")

                    rooms_data = hotel.get('rooms', [])

                    # HotelBeds already provides minRate and maxRate - use them directly!
                    min_rate = hotel.get('minRate')
                    max_rate = hotel.get('maxRate')

                    # Convert string prices to float if needed
                    if isinstance(min_rate, str):
                        min_rate = float(min_rate)
                    if isinstance(max_rate, str):
                        max_rate = float(max_rate)

                    # Log with INFO level to ensure it shows up
                    if idx < 3:  # Log first 3 hotels
                        logger.info(f"💰 Hotel '{hotel.get('name')}': minRate={min_rate}, maxRate={max_rate}, currency={hotel.get('currency')}")

                    simplified_hotel = {
                        'code': hotel.get('code'),
                        'name': hotel.get('name'),
                        'categoryCode': hotel.get('categoryCode'),
                        'categoryName': hotel.get('categoryName'),
                        'destinationCode': hotel.get('destinationCode'),
                        'destinationName': hotel.get('destinationName'),
                        'zoneCode': hotel.get('zoneCode'),
                        'zoneName': hotel.get('zoneName'),
                        'latitude': hotel.get('latitude'),
                        'longitude': hotel.get('longitude'),
                        'minRate': min_rate,
                        'maxRate': max_rate,
                        'currency': hotel.get('currency', 'EUR'),
                        'rooms': len(rooms_data)
                    }
                    simplified_hotels.append(simplified_hotel)
                except Exception as e:
                    logger.warning(f"Error parsing hotel data: {e}")
                    continue

            logger.info(f"✅ Found {len(simplified_hotels)} hotels for destination {destination_code}")
            return simplified_hotels

        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ HTTP Error searching hotels: {e}")
            logger.error(f"   Response content: {e.response.text if hasattr(e, 'response') else 'N/A'}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request Error searching hotels: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error searching hotels: {e}")
            logger.exception("Full traceback:")
            raise

    def get_hotel_details(self, hotel_code: str, check_in: str, check_out: str) -> Optional[Dict]:
        """
        Get detailed information about a specific hotel

        Args:
            hotel_code: Hotelbeds hotel code
            check_in: Check-in date in YYYY-MM-DD format
            check_out: Check-out date in YYYY-MM-DD format

        Returns:
            Hotel details dictionary or None
        """
        if not self.api_key or not self.secret:
            logger.warning("Hotelbeds API credentials not configured")
            return None

        try:
            url = f"{self.base_url}/hotel-content-api/1.0/hotels/{hotel_code}"
            headers = self._get_headers()

            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            data = response.json()
            hotel = data.get('hotel', {})

            # Extract relevant details
            details = {
                'code': hotel.get('code'),
                'name': hotel.get('name', {}).get('content'),
                'description': hotel.get('description', {}).get('content'),
                'categoryCode': hotel.get('categoryCode'),
                'categoryName': hotel.get('categoryName'),
                'address': {
                    'content': hotel.get('address', {}).get('content'),
                    'city': hotel.get('city', {}).get('content'),
                    'postalCode': hotel.get('postalCode')
                },
                'coordinates': {
                    'latitude': hotel.get('coordinates', {}).get('latitude'),
                    'longitude': hotel.get('coordinates', {}).get('longitude')
                },
                'facilities': [
                    {
                        'code': f.get('facilityCode'),
                        'description': f.get('description', {}).get('content')
                    }
                    for f in hotel.get('facilities', [])[:10]  # Limit to 10 main facilities
                ],
                'images': [
                    {
                        'path': img.get('path'),
                        'type': img.get('imageTypeCode')
                    }
                    for img in hotel.get('images', [])[:5]  # Limit to 5 images
                ]
            }

            return details

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching hotel details: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching hotel details: {e}")
            return None

    def search_destination_codes(self, city_name: str) -> List[Dict]:
        """
        Search for destination codes by city name

        Args:
            city_name: Name of the city

        Returns:
            List of destination codes
        """
        if not self.api_key or not self.secret:
            logger.warning("Hotelbeds API credentials not configured")
            return []

        try:
            url = f"{self.base_url}/hotel-content-api/1.0/locations/destinations"
            headers = self._get_headers()
            params = {'fields': 'all', 'language': 'ENG'}

            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            destinations = data.get('destinations', [])

            # Filter by city name (case-insensitive)
            matching_destinations = [
                {
                    'code': dest.get('code'),
                    'name': dest.get('name', {}).get('content'),
                    'countryCode': dest.get('countryCode')
                }
                for dest in destinations
                if city_name.lower() in dest.get('name', {}).get('content', '').lower()
            ]

            return matching_destinations[:5]  # Return top 5 matches

        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching destination codes: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error searching destination codes: {e}")
            return []


# Global instance
hotelbeds_api = HotelbedsAPI()


def search_hotels_for_trip(city_name: str, check_in: str, check_out: str, adults: int = 2, rooms: int = 1) -> List[Dict]:
    """
    Convenience function to search hotels for a trip

    Args:
        city_name: Name of the city
        check_in: Check-in date (YYYY-MM-DD)
        check_out: Check-out date (YYYY-MM-DD)
        adults: Number of adults
        rooms: Number of rooms

    Returns:
        List of hotels
    """
    # First, find destination code for the city
    destinations = hotelbeds_api.search_destination_codes(city_name)
    if not destinations:
        logger.warning(f"No destination code found for city: {city_name}")
        return []

    destination_code = destinations[0].get('code')

    # Search hotels with the destination code
    return hotelbeds_api.search_hotels(
        destination_code=destination_code,
        check_in=check_in,
        check_out=check_out,
        adults=adults,
        rooms=rooms,
        max_results=10
    )
