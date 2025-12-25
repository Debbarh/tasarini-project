"""
Unsplash API service for fetching destination images
"""
import logging
import requests
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.conf import settings

logger = logging.getLogger(__name__)


def fetch_destination_images(destination: str, count: int = 5) -> List[Dict[str, str]]:
    """
    Fetch images for a destination from Unsplash API
    Following Unsplash API Guidelines: https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines

    Args:
        destination: Name of the destination (city or country)
        count: Number of images to fetch (default: 5)

    Returns:
        List of image dictionaries with id, url, thumbnailUrl, description, photographer info
    """
    if not settings.UNSPLASH_ACCESS_KEY:
        logger.warning("UNSPLASH_ACCESS_KEY not configured")
        return []

    try:
        url = f"{settings.UNSPLASH_API_BASE}/search/photos"
        headers = {
            "Authorization": f"Client-ID {settings.UNSPLASH_ACCESS_KEY}"
        }
        params = {
            "query": f"{destination} travel landmark",
            "per_page": count,
            "orientation": "landscape",
            "order_by": "relevant"
        }

        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        results = data.get("results", [])

        images = []
        for photo in results:
            # UTM parameters as required by Unsplash API guidelines
            utm_params = "?utm_source=tasarini&utm_medium=referral"

            user = photo.get("user", {})
            user_username = user.get("username", "")
            photographer_url = user.get("links", {}).get("html", "")

            # Add UTM parameters to photographer URL
            if photographer_url:
                photographer_url = f"{photographer_url}{utm_params}"

            images.append({
                "id": photo.get("id", ""),
                "url": photo.get("urls", {}).get("regular", ""),
                "thumbnailUrl": photo.get("urls", {}).get("small", ""),
                "description": photo.get("description") or photo.get("alt_description") or f"Beautiful view of {destination}",
                "photographer": user.get("name", "Unknown"),
                "photographerUrl": photographer_url,
                "photographerUsername": user_username,
                "downloadLocation": photo.get("links", {}).get("download_location", ""),  # For triggering download endpoint
                "unsplashUrl": f"https://unsplash.com/photos/{photo.get('id', '')}{utm_params}"  # Direct link to photo on Unsplash
            })

        logger.info(f"Fetched {len(images)} images for destination: {destination}")
        return images

    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching Unsplash images for {destination}: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error fetching Unsplash images: {e}")
        return []


def trigger_download(download_location: str) -> bool:
    """
    Trigger the download endpoint as required by Unsplash API guidelines
    Must be called when a photo is displayed/used (not actual download)

    Args:
        download_location: The download_location URL from the photo API response

    Returns:
        True if successful, False otherwise
    """
    if not download_location or not settings.UNSPLASH_ACCESS_KEY:
        return False

    try:
        headers = {
            "Authorization": f"Client-ID {settings.UNSPLASH_ACCESS_KEY}"
        }
        response = requests.get(download_location, headers=headers, timeout=5)
        response.raise_for_status()
        logger.debug(f"Triggered download endpoint: {download_location}")
        return True
    except Exception as e:
        logger.warning(f"Failed to trigger download endpoint: {e}")
        return False


def fetch_all_destination_images(destinations: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Fetch images for multiple destinations IN PARALLEL using ThreadPoolExecutor

    Args:
        destinations: List of destination dicts with 'city' and/or 'country' keys

    Returns:
        Dictionary mapping destination names to their image lists
    """
    images_by_destination = {}

    def fetch_for_destination(dest: Dict) -> tuple[Optional[str], List[Dict]]:
        """Helper function to fetch images for a single destination"""
        city = dest.get("city", "")
        country = dest.get("country", "")

        # Prefer city name, fallback to country
        destination_name = city or country
        if not destination_name:
            return None, []

        images = fetch_destination_images(destination_name, count=5)
        return destination_name, images

    # Parallel fetch with max 3 workers to respect Unsplash rate limits
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_dest = {
            executor.submit(fetch_for_destination, dest): dest
            for dest in destinations
        }

        for future in as_completed(future_to_dest):
            try:
                dest_name, images = future.result()
                if dest_name and images:
                    images_by_destination[dest_name] = images
            except Exception as e:
                logger.error(f"Error fetching images for destination: {e}")

    # Parallel trigger downloads (fire and forget) - faster than sequential
    all_images = [img for imgs in images_by_destination.values() for img in imgs]
    with ThreadPoolExecutor(max_workers=10) as executor:
        for image in all_images:
            if image.get("downloadLocation"):
                executor.submit(trigger_download, image["downloadLocation"])

    return images_by_destination
