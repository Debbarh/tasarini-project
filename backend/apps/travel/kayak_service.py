"""
Kayak API service for travel bookings
Documentation: https://www.kayak.com/affiliates/api
"""
import logging
import requests
from typing import Dict, List, Optional
from django.conf import settings

logger = logging.getLogger(__name__)


class KayakAPI:
    """Kayak API client for hotel, flight and car rental search"""

    def __init__(self):
        self.api_key = settings.KAYAK_API_KEY
        self.base_url = settings.KAYAK_API_BASE

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Kayak API"""
        headers = {
            'Accept': 'application/json'
        }
        if self.api_key:
            # Auth par header selon la doc Kayak
            headers['X-Api-Key'] = self.api_key
        else:
            logger.error("❌ Kayak API key not configured")
        return headers

    def search_hotels(
        self,
        destination: str,
        check_in: str,
        check_out: str,
        adults: int = 2,
        rooms: int = 1,
        max_results: int = 10
    ) -> List[Dict]:
        """
        Search for hotels using Kayak API

        Args:
            destination: City name or destination code
            check_in: Check-in date in YYYY-MM-DD format
            check_out: Check-out date in YYYY-MM-DD format
            adults: Number of adults (default: 2)
            rooms: Number of rooms (default: 1)
            max_results: Maximum number of results (default: 10)

        Returns:
            List of hotel dictionaries
        """
        if not self.api_key:
            logger.error("❌ Kayak API key not configured")
            return []

        try:
            url = f"{self.base_url}/hotels/v1/search"
            headers = self._get_headers()

            # Build request parameters
            params = {
                'destination': destination,
                'checkin': check_in,
                'checkout': check_out,
                'adults': adults,
                'rooms': rooms,
                'limit': max_results
            }

            logger.info(f"🌐 Sending request to Kayak: {url}")
            logger.info(f"📦 Request params: {params}")

            response = requests.get(url, headers=headers, params=params, timeout=20)

            logger.info(f"📡 Kayak response status: {response.status_code}")

            response.raise_for_status()

            data = response.json()
            hotels = data.get('hotels', [])

            logger.info(f"✅ Successfully parsed {len(hotels)} hotels from Kayak")

            # Simplify hotel data
            simplified_hotels = []
            for hotel in hotels[:max_results]:
                try:
                    simplified_hotel = {
                        'code': hotel.get('id'),
                        'name': hotel.get('name'),
                        'address': hotel.get('address'),
                        'city': hotel.get('city'),
                        'rating': hotel.get('rating'),
                        'latitude': hotel.get('latitude'),
                        'longitude': hotel.get('longitude'),
                        'minRate': hotel.get('price', {}).get('amount'),
                        'currency': hotel.get('price', {}).get('currency', 'EUR'),
                        'provider': 'kayak'
                    }
                    simplified_hotels.append(simplified_hotel)
                except Exception as e:
                    logger.warning(f"Error parsing hotel data: {e}")
                    continue

            logger.info(f"✅ Found {len(simplified_hotels)} hotels for destination {destination}")
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

    def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        return_date: Optional[str] = None,
        adults: int = 1,
        max_results: int = 5
    ) -> List[Dict]:
        """
        Search for flight offers using Kayak API

        Args:
            origin: Origin airport code (e.g., 'PAR')
            destination: Destination airport code (e.g., 'NYC')
            departure_date: Departure date in YYYY-MM-DD format
            return_date: Return date in YYYY-MM-DD format (optional for one-way)
            adults: Number of adult passengers (default: 1)
            max_results: Maximum number of results to return (default: 5)

        Returns:
            List of flight offer dictionaries
        """
        if not self.api_key:
            logger.error("❌ Kayak API key not configured")
            return []

        try:
            url = f"{self.base_url}/flights/v1/search"
            headers = self._get_headers()

            params = {
                'origin': origin,
                'destination': destination,
                'departure_date': departure_date,
                'adults': adults,
                'limit': max_results
            }

            if return_date:
                params['return_date'] = return_date

            logger.info(f"🌐 Sending request to Kayak flights: {url}")

            response = requests.get(url, headers=headers, params=params, timeout=15)
            response.raise_for_status()

            data = response.json()
            flights = data.get('flights', [])

            # Simplify flight data
            simplified_flights = []
            for flight in flights:
                try:
                    simplified_flight = {
                        'id': flight.get('id'),
                        'price': {
                            'total': flight.get('price', {}).get('amount'),
                            'currency': flight.get('price', {}).get('currency', 'EUR')
                        },
                        'airline': flight.get('airline'),
                        'departure': flight.get('departure'),
                        'arrival': flight.get('arrival'),
                        'duration': flight.get('duration'),
                        'stops': flight.get('stops'),
                        'provider': 'kayak'
                    }
                    simplified_flights.append(simplified_flight)
                except Exception as e:
                    logger.warning(f"Error parsing flight data: {e}")
                    continue

            logger.info(f"✅ Found {len(simplified_flights)} flights for {origin} → {destination}")
            return simplified_flights

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error searching flights with Kayak: {e}")
            return []
        except Exception as e:
            logger.error(f"❌ Unexpected error searching flights: {e}")
            return []

    def search_car_rentals(
        self,
        location: str,
        pickup_date: str,
        dropoff_date: str,
        pickup_time: str = "10:00",
        dropoff_time: str = "10:00",
        max_results: int = 10
    ) -> List[Dict]:
        """
        Search for car rentals using Kayak API

        Args:
            location: Pickup location (city or airport code)
            pickup_date: Pickup date in YYYY-MM-DD format
            dropoff_date: Dropoff date in YYYY-MM-DD format
            pickup_time: Pickup time (default: 10:00)
            dropoff_time: Dropoff time (default: 10:00)
            max_results: Maximum number of results (default: 10)

        Returns:
            List of car rental dictionaries
        """
        if not self.api_key:
            logger.error("❌ Kayak API key not configured")
            return []

        try:
            url = f"{self.base_url}/cars/v1/search"
            headers = self._get_headers()

            params = {
                'apiKey': self.api_key,
                'location': location,
                'pickup_date': pickup_date,
                'dropoff_date': dropoff_date,
                'pickup_time': pickup_time,
                'dropoff_time': dropoff_time,
                'limit': max_results
            }

            logger.info(f"🌐 Sending request to Kayak car rentals: {url}")

            response = requests.get(url, headers=headers, params=params, timeout=15)
            response.raise_for_status()

            data = response.json()
            cars = data.get('cars', [])

            # Simplify car rental data
            simplified_cars = []
            for car in cars:
                try:
                    simplified_car = {
                        'id': car.get('id'),
                        'vehicle': car.get('vehicle'),
                        'category': car.get('category'),
                        'company': car.get('company'),
                        'price': {
                            'total': car.get('price', {}).get('amount'),
                            'currency': car.get('price', {}).get('currency', 'EUR'),
                            'per_day': car.get('price', {}).get('per_day')
                        },
                        'features': car.get('features', []),
                        'provider': 'kayak'
                    }
                    simplified_cars.append(simplified_car)
                except Exception as e:
                    logger.warning(f"Error parsing car rental data: {e}")
                    continue

            logger.info(f"✅ Found {len(simplified_cars)} car rentals for {location}")
            return simplified_cars

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error searching car rentals with Kayak: {e}")
            return []
        except Exception as e:
            logger.error(f"❌ Unexpected error searching car rentals: {e}")
            return []


# Global instance
kayak_api = KayakAPI()


def search_hotels_kayak(city: str, check_in: str, check_out: str, adults: int = 2, rooms: int = 1) -> List[Dict]:
    """
    Convenience function to search hotels with Kayak

    Args:
        city: City name
        check_in: Check-in date (YYYY-MM-DD)
        check_out: Check-out date (YYYY-MM-DD)
        adults: Number of adults
        rooms: Number of rooms

    Returns:
        List of hotels
    """
    return kayak_api.search_hotels(
        destination=city,
        check_in=check_in,
        check_out=check_out,
        adults=adults,
        rooms=rooms,
        max_results=10
    )
