"""
Amadeus API service for flights and travel data
Documentation: https://developers.amadeus.com/
"""
import logging
import requests
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


class AmadeusAPI:
    """Amadeus API client for flight search and travel data"""

    def __init__(self):
        self.api_key = settings.AMADEUS_API_KEY
        self.api_secret = settings.AMADEUS_API_SECRET
        self.base_url = settings.AMADEUS_API_BASE
        self.access_token = None

    def _get_access_token(self) -> Optional[str]:
        """Get OAuth2 access token (cached for 30 minutes)"""
        # Check cache first
        cached_token = cache.get('amadeus_access_token')
        if cached_token:
            return cached_token

        if not self.api_key or not self.api_secret:
            logger.warning("Amadeus API credentials not configured")
            return None

        try:
            url = f"{self.base_url}/v1/security/oauth2/token"
            headers = {'Content-Type': 'application/x-www-form-urlencoded'}
            data = {
                'grant_type': 'client_credentials',
                'client_id': self.api_key,
                'client_secret': self.api_secret
            }

            response = requests.post(url, headers=headers, data=data, timeout=10)
            response.raise_for_status()

            token_data = response.json()
            access_token = token_data.get('access_token')
            expires_in = token_data.get('expires_in', 1799)  # Default ~30 minutes

            # Cache token for slightly less than expiry time
            cache.set('amadeus_access_token', access_token, expires_in - 60)

            logger.info("Successfully obtained Amadeus access token")
            return access_token

        except requests.exceptions.RequestException as e:
            logger.error(f"Error obtaining Amadeus access token: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error obtaining Amadeus access token: {e}")
            return None

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
        Search for flight offers

        Args:
            origin: IATA code of departure city (e.g., 'PAR')
            destination: IATA code of destination city (e.g., 'NYC')
            departure_date: Departure date in YYYY-MM-DD format
            return_date: Return date in YYYY-MM-DD format (optional for one-way)
            adults: Number of adult passengers (default: 1)
            max_results: Maximum number of results to return (default: 5)

        Returns:
            List of flight offer dictionaries
        """
        access_token = self._get_access_token()
        if not access_token:
            return []

        try:
            url = f"{self.base_url}/v2/shopping/flight-offers"
            headers = {'Authorization': f'Bearer {access_token}'}
            params = {
                'originLocationCode': origin,
                'destinationLocationCode': destination,
                'departureDate': departure_date,
                'adults': adults,
                'max': max_results,
                'currencyCode': 'EUR'
            }

            if return_date:
                params['returnDate'] = return_date

            response = requests.get(url, headers=headers, params=params, timeout=15)
            response.raise_for_status()

            data = response.json()
            offers = data.get('data', [])

            # Simplify flight data
            simplified_offers = []
            for offer in offers:
                try:
                    itineraries = offer.get('itineraries', [])
                    price = offer.get('price', {})

                    simplified_offer = {
                        'id': offer.get('id'),
                        'price': {
                            'total': price.get('total'),
                            'currency': price.get('currency', 'EUR')
                        },
                        'outbound': self._parse_itinerary(itineraries[0]) if len(itineraries) > 0 else None,
                        'inbound': self._parse_itinerary(itineraries[1]) if len(itineraries) > 1 else None,
                        'numberOfBookableSeats': offer.get('numberOfBookableSeats'),
                        'validatingAirlineCodes': offer.get('validatingAirlineCodes', [])
                    }
                    simplified_offers.append(simplified_offer)
                except Exception as e:
                    logger.warning(f"Error parsing flight offer: {e}")
                    continue

            logger.info(f"Found {len(simplified_offers)} flight offers for {origin} → {destination}")
            return simplified_offers

        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching flights: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error searching flights: {e}")
            return []

    def _parse_itinerary(self, itinerary: Dict) -> Dict:
        """Parse and simplify itinerary data"""
        segments = itinerary.get('segments', [])
        duration = itinerary.get('duration', '')

        return {
            'duration': duration,
            'segments': [
                {
                    'departure': {
                        'iataCode': seg.get('departure', {}).get('iataCode'),
                        'at': seg.get('departure', {}).get('at')
                    },
                    'arrival': {
                        'iataCode': seg.get('arrival', {}).get('iataCode'),
                        'at': seg.get('arrival', {}).get('at')
                    },
                    'carrierCode': seg.get('carrierCode'),
                    'number': seg.get('number'),
                    'aircraft': seg.get('aircraft', {}).get('code'),
                    'duration': seg.get('duration')
                }
                for seg in segments
            ]
        }

    def get_airport_city_search(self, keyword: str) -> List[Dict]:
        """
        Search for airports/cities by keyword

        Args:
            keyword: Search keyword (city name or airport code)

        Returns:
            List of matching locations
        """
        access_token = self._get_access_token()
        if not access_token:
            return []

        try:
            url = f"{self.base_url}/v1/reference-data/locations"
            headers = {'Authorization': f'Bearer {access_token}'}
            params = {
                'keyword': keyword,
                'subType': 'CITY,AIRPORT',
                'page[limit]': 10
            }

            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            locations = data.get('data', [])

            simplified_locations = [
                {
                    'iataCode': loc.get('iataCode'),
                    'name': loc.get('name'),
                    'cityName': loc.get('address', {}).get('cityName'),
                    'countryName': loc.get('address', {}).get('countryName'),
                    'type': loc.get('subType')
                }
                for loc in locations
            ]

            return simplified_locations

        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching airports: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error searching airports: {e}")
            return []


# Global instance
amadeus_api = AmadeusAPI()


def search_flights_for_trip(origin: str, destination: str, departure_date: str, return_date: Optional[str] = None, passengers: int = 1) -> List[Dict]:
    """
    Convenience function to search flights for a trip

    Args:
        origin: Origin city IATA code
        destination: Destination city IATA code
        departure_date: Departure date (YYYY-MM-DD)
        return_date: Return date (YYYY-MM-DD), optional
        passengers: Number of passengers

    Returns:
        List of flight offers
    """
    return amadeus_api.search_flights(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        adults=passengers,
        max_results=5
    )


def find_airport_by_city(city_name: str) -> Optional[str]:
    """
    Find airport IATA code for a city name

    Args:
        city_name: Name of the city

    Returns:
        IATA code of main airport or None
    """
    locations = amadeus_api.get_airport_city_search(city_name)
    if locations:
        # Prefer airports over cities, return first match
        for loc in locations:
            if loc.get('type') == 'AIRPORT':
                return loc.get('iataCode')
        # Fallback to first result
        return locations[0].get('iataCode')
    return None
