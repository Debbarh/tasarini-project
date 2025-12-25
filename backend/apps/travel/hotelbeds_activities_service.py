"""
Hotelbeds Activities API service
Documentation: https://developer.hotelbeds.com/documentation/activities/
"""
import logging
import requests
import hashlib
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from django.conf import settings

logger = logging.getLogger(__name__)


class HotelbedsActivitiesAPI:
    """Hotelbeds Activities API client for activity search and bookings"""

    def __init__(self):
        self.api_key = settings.HOTELBEDS_ACTIVITIES_API_KEY
        self.secret = settings.HOTELBEDS_ACTIVITIES_SECRET
        self.base_url = settings.HOTELBEDS_ACTIVITIES_API_BASE

    def _get_signature(self) -> str:
        """Generate X-Signature header for Hotelbeds API authentication"""
        utc_timestamp = str(int(datetime.utcnow().timestamp()))
        signature_string = self.api_key + self.secret + utc_timestamp
        signature = hashlib.sha256(signature_string.encode('utf-8')).hexdigest()
        return signature

    def _get_headers(self) -> Dict[str, str]:
        """Get authentication headers for Hotelbeds Activities API"""
        return {
            'Api-Key': self.api_key,
            'X-Signature': self._get_signature(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip'
        }

    def search_activities_by_destination(
        self,
        destination_code: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        pax: int = 2,
        language: str = 'en',
        max_results: int = 10
    ) -> List[Dict]:
        """
        Search for activities in a destination

        Args:
            destination_code: Hotelbeds destination code (e.g., 'PAR' for Paris)
            from_date: Start date in YYYY-MM-DD format (optional)
            to_date: End date in YYYY-MM-DD format (optional)
            pax: Number of people (default: 2)
            language: Language code (default: 'en')
            max_results: Maximum number of results (default: 10)

        Returns:
            List of activity dictionaries
        """
        if not self.api_key or not self.secret:
            logger.warning("Hotelbeds Activities API credentials not configured")
            return []

        # Set default dates if not provided (required by API)
        if not from_date:
            from_date = datetime.now().strftime('%Y-%m-%d')
        if not to_date:
            to_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')

        try:
            # Use availability endpoint for searching activities
            url = f"{self.base_url}/activity-api/3.0/activities"
            headers = self._get_headers()

            # Build request body with required fields
            body = {
                "language": language,
                "from": from_date,  # Required field
                "to": to_date,      # Required field
                "filters": [        # Required field
                    {
                        "searchFilterItems": [
                            {
                                "type": "destination",
                                "value": destination_code
                            }
                        ]
                    }
                ],
                "pagination": {
                    "itemsPerPage": max_results,
                    "page": 1
                },
                "paxes": [{"age": 30}] * pax
            }

            logger.info(f"Searching activities for destination {destination_code}")

            response = requests.post(url, headers=headers, json=body, timeout=20)
            response.raise_for_status()

            data = response.json()
            activities = data.get('activities', [])

            # Simplify activity data
            simplified_activities = []
            for activity in activities[:max_results]:
                try:
                    # Extract modality (pricing/availability info)
                    modalities = activity.get('modalities', [])
                    modality = modalities[0] if modalities else {}

                    # Get price information
                    amounts_from = modality.get('amountsFrom', [{}])
                    price_info = amounts_from[0] if amounts_from else {}

                    # Get duration
                    duration = modality.get('duration', {})
                    duration_value = duration.get('value', 2)
                    duration_metric = duration.get('metric', 'HOURS')

                    # Get images
                    images = activity.get('images', [])
                    image_urls = [
                        f"https://photos.hotelbeds.com/giata/original/{img.get('path')}"
                        for img in images[:3]
                    ] if images else []

                    # Get content
                    content = activity.get('content', {})

                    simplified_activity = {
                        'code': activity.get('code'),
                        'name': activity.get('name'),
                        'description': content.get('description', ''),
                        'category': activity.get('category', {}).get('name', 'Activity'),
                        'type': activity.get('type', 'ACTIVITY'),
                        'country': activity.get('country', {}).get('name', ''),
                        'destination': activity.get('destination', {}).get('name', destination_code),
                        'duration': {
                            'value': duration_value,
                            'metric': duration_metric,
                            'formatted': self._format_duration(duration_value, duration_metric)
                        },
                        'price': {
                            'amount': float(price_info.get('amount', 50)),
                            'currency': price_info.get('currencyName', 'EUR')
                        },
                        'images': image_urls,
                        'geoLocation': activity.get('geoLocation', {}),
                        'modalityCode': modality.get('code'),
                        'modalityName': modality.get('name', ''),
                        'amountDetail': modality.get('amountDetail', {}),
                        'languages': [lang.get('name') for lang in modality.get('languages', [])],
                        'highlights': content.get('highlights', [])
                    }
                    simplified_activities.append(simplified_activity)
                except Exception as e:
                    logger.warning(f"Error parsing activity data: {e}")
                    continue

            logger.info(f"Found {len(simplified_activities)} activities for destination {destination_code}")
            return simplified_activities

        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching activities: {e}")
            if hasattr(e.response, 'text'):
                logger.error(f"Response: {e.response.text}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error searching activities: {e}")
            return []

    def get_activity_details(self, activity_code: str, language: str = 'en') -> Optional[Dict]:
        """
        Get detailed information about a specific activity

        Args:
            activity_code: Hotelbeds activity code
            language: Language code (default: 'en')

        Returns:
            Activity details dictionary or None
        """
        if not self.api_key or not self.secret:
            logger.warning("Hotelbeds Activities API credentials not configured")
            return None

        try:
            url = f"{self.base_url}/activity-content-api/3.0/activities/{activity_code}"
            headers = self._get_headers()
            params = {'language': language}

            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            activity = data.get('activity', {})

            # Extract relevant details
            content = activity.get('content', {})
            details = {
                'code': activity.get('code'),
                'name': activity.get('name'),
                'description': content.get('description'),
                'category': activity.get('category', {}).get('name'),
                'type': activity.get('type'),
                'country': activity.get('country', {}).get('name'),
                'destination': activity.get('destination', {}).get('name'),
                'geoLocation': activity.get('geoLocation', {}),
                'images': [
                    {
                        'path': f"https://photos.hotelbeds.com/giata/original/{img.get('path')}",
                        'type': img.get('type'),
                        'order': img.get('order')
                    }
                    for img in activity.get('images', [])
                ],
                'content': {
                    'description': content.get('description'),
                    'importantInfo': content.get('importantInfo'),
                    'highlights': content.get('highlights', [])
                },
                'modalities': activity.get('modalities', [])
            }

            return details

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching activity details: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching activity details: {e}")
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
            logger.warning("Hotelbeds Activities API credentials not configured")
            return []

        try:
            url = f"{self.base_url}/activity-content-api/3.0/locations/destinations"
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
                    'name': dest.get('name'),
                    'countryCode': dest.get('countryCode')
                }
                for dest in destinations
                if city_name.lower() in dest.get('name', '').lower()
            ]

            return matching_destinations[:5]  # Return top 5 matches

        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching destination codes: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error searching destination codes: {e}")
            return []

    def _format_duration(self, value: int, metric: str) -> str:
        """Format duration in human-readable format"""
        metric_lower = metric.lower()
        if metric_lower in ['hour', 'hours']:
            return f"{value}h" if value == 1 else f"{value}h"
        elif metric_lower in ['day', 'days']:
            return f"{value} jour" if value == 1 else f"{value} jours"
        elif metric_lower in ['minute', 'minutes']:
            return f"{value}min"
        else:
            return f"{value} {metric}"


# Global instance
hotelbeds_activities_api = HotelbedsActivitiesAPI()


def search_activities_for_trip(
    city_name: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    pax: int = 2
) -> List[Dict]:
    """
    Convenience function to search activities for a trip

    Args:
        city_name: Name of the city
        from_date: Start date (YYYY-MM-DD)
        to_date: End date (YYYY-MM-DD)
        pax: Number of people

    Returns:
        List of activities
    """
    # First, find destination code for the city
    destinations = hotelbeds_activities_api.search_destination_codes(city_name)
    if not destinations:
        logger.warning(f"No destination code found for city: {city_name}")
        return []

    destination_code = destinations[0].get('code')

    # Search activities with the destination code
    return hotelbeds_activities_api.search_activities_by_destination(
        destination_code=destination_code,
        from_date=from_date,
        to_date=to_date,
        pax=pax,
        max_results=10
    )
