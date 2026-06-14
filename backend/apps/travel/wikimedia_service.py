"""
Wikimedia Commons service : récupère UNE image libre par activité d'itinéraire.
API publique (sans clé) : https://commons.wikimedia.org/w/api.php
Wikimedia EXIGE un User-Agent identifiable (sinon 403).
"""
import html
import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "Tasarini/1.0 (https://tasarini.com; contact@tasarini.com)"
_TAG_RE = re.compile(r"<[^>]+>")


def _clean(text: str) -> str:
    """Retire les balises HTML et décode les entités (champs extmetadata)."""
    if not text:
        return ""
    return html.unescape(_TAG_RE.sub("", text)).strip()


def fetch_activity_image(query: str) -> Optional[Dict[str, str]]:
    """
    Récupère 1 image Wikimedia Commons pour une requête (ex: "Tour Eiffel Paris").
    Renvoie un dict {url, thumbnailUrl, descriptionUrl, license, artist, attribution}
    ou None si rien/erreur.
    """
    if not query or not query.strip():
        return None

    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": query.strip(),
        "gsrnamespace": "6",   # espace Fichier (images uniquement)
        "gsrlimit": "1",
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "iiurlwidth": "800",
    }
    try:
        resp = requests.get(
            COMMONS_API, params=params,
            headers={"User-Agent": USER_AGENT}, timeout=10,
        )
        resp.raise_for_status()
        pages = (resp.json().get("query", {}) or {}).get("pages", {}) or {}
        for page in pages.values():
            infos = page.get("imageinfo") or []
            if not infos:
                continue
            info = infos[0]
            url = info.get("url", "")
            if not url:
                continue
            meta = info.get("extmetadata", {}) or {}
            artist = _clean((meta.get("Artist", {}) or {}).get("value", ""))
            license_name = _clean((meta.get("LicenseShortName", {}) or {}).get("value", ""))
            return {
                "url": url,
                "thumbnailUrl": info.get("thumburl", url),
                "descriptionUrl": info.get("descriptionurl", ""),
                "license": license_name,
                "artist": artist,
                "attribution": " · ".join(p for p in [artist, license_name] if p),
                "source": "wikimedia",
            }
        return None
    except requests.exceptions.RequestException as e:
        logger.warning(f"Wikimedia error for '{query}': {e}")
        return None
    except Exception as e:
        logger.warning(f"Wikimedia unexpected error for '{query}': {e}")
        return None


def fetch_all_activity_images(days: List[Dict]) -> Dict[str, Dict]:
    """
    Pour chaque activité de chaque jour, récupère 1 image Commons EN PARALLÈLE.
    Clé de sortie = activity.id (repli f"{dayNumber}:{index}" si pas d'id).
    Déduplique les requêtes identiques (titre + destination).
    """
    # Construire la liste (clé, requête) en dédupliquant les requêtes
    targets: List[tuple] = []   # (result_key, query)
    query_cache: Dict[str, Optional[Dict]] = {}

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
            query_cache.setdefault(query, None)

    if not targets:
        return {}

    # Récupérer chaque requête UNIQUE en parallèle (politesse Wikimedia : 4 workers)
    unique_queries = list(query_cache.keys())
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_query = {executor.submit(fetch_activity_image, q): q for q in unique_queries}
        for future in as_completed(future_to_query):
            q = future_to_query[future]
            try:
                query_cache[q] = future.result()
            except Exception as e:
                logger.warning(f"Wikimedia future error: {e}")
                query_cache[q] = None

    # Mapper le résultat par clé d'activité
    result: Dict[str, Dict] = {}
    for key, query in targets:
        img = query_cache.get(query)
        if img:
            result[key] = img

    logger.info(f"Wikimedia: {len(result)}/{len(targets)} images d'activités récupérées")
    return result
