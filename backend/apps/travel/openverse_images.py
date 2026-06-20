"""Images d'itinéraire via Openverse (remplace Unsplash pour les destinations et
Wikimedia pour les activités). Conserve EXACTEMENT les formats de sortie attendus par
le frontend (UnsplashImage[] par ville ; ActivityImage par activité)."""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List

from apps.poi.external.openverse import search_image_objects

logger = logging.getLogger(__name__)


def _to_unsplash_like(obj: dict, idx: int) -> dict:
    return {
        "id": f"ov-{idx}",
        "url": obj.get("url", ""),
        "thumbnailUrl": obj.get("thumbnailUrl") or obj.get("url", ""),
        "description": obj.get("creator") or "Openverse",
        "photographer": obj.get("creator") or "Openverse",
        "photographerUrl": obj.get("foreignLandingUrl", ""),
        "photographerUsername": "",
        "downloadLocation": "",
        "unsplashUrl": obj.get("foreignLandingUrl", ""),
    }


def _to_activity_image(obj: dict) -> dict:
    return {
        "url": obj.get("url", ""),
        "thumbnailUrl": obj.get("thumbnailUrl") or obj.get("url", ""),
        "descriptionUrl": obj.get("foreignLandingUrl", ""),
        "license": obj.get("license", ""),
        "artist": obj.get("creator", ""),
        "attribution": obj.get("attribution", "Openverse"),
        "source": "openverse",
    }


def fetch_all_destination_images(destinations: List[Dict]) -> Dict[str, List[dict]]:
    """{ville: [UnsplashImage-like, ...]} via Openverse, en parallèle."""
    cities = []
    for d in (destinations or []):
        city = (d.get("city") or d.get("country") or "").strip()
        if city and city not in cities:
            cities.append(city)
    if not cities:
        return {}

    def _one(city):
        country = ""
        objs = search_image_objects(f"{city} {country}".strip(), n=5)
        return city, [_to_unsplash_like(o, i) for i, o in enumerate(objs)]

    out: Dict[str, List[dict]] = {}
    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = {ex.submit(_one, c): c for c in cities}
        for f in as_completed(futs):
            try:
                city, imgs = f.result()
                if imgs:
                    out[city] = imgs
            except Exception as exc:  # noqa: BLE001
                logger.warning("Openverse dest images: %s", exc)
    return out


def fetch_all_activity_images(days: List[Dict]) -> Dict[str, dict]:
    """{clé_activité: ActivityImage-like} via Openverse (1 image/activité), en parallèle.
    Clé = activity.id sinon f"{dayNumber}:{index}". Requêtes dédupliquées."""
    targets = []          # (key, query)
    cache: Dict[str, dict] = {}
    for day in (days or []):
        destination = (day.get("destination") or "").strip()
        day_number = day.get("dayNumber")
        for idx, activity in enumerate(day.get("activities") or []):
            title = (activity.get("title") or "").strip()
            if not title:
                continue
            key = str(activity.get("id") or f"{day_number}:{idx}")
            query = f"{title} {destination}".strip()
            targets.append((key, query))
            cache.setdefault(query, None)
    if not targets:
        return {}

    def _one(q):
        objs = search_image_objects(q, n=1)
        return q, (_to_activity_image(objs[0]) if objs else None)

    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(_one, q): q for q in cache.keys()}
        for f in as_completed(futs):
            try:
                q, img = f.result()
                cache[q] = img
            except Exception as exc:  # noqa: BLE001
                logger.warning("Openverse activity image: %s", exc)
    result: Dict[str, dict] = {}
    for key, query in targets:
        img = cache.get(query)
        if img:
            result[key] = img
    return result
