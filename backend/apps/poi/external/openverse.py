"""Client Openverse (images sous licence ouverte). Aucune clé requise.

Remplace les anciennes sources photo (Unsplash, Wikimedia Commons, image OpenTripMap).
Renvoie des URLs d'images directement utilisables.
"""
from __future__ import annotations

import logging

import requests

logger = logging.getLogger(__name__)

_API = "https://api.openverse.org/v1/images/"
_HEADERS = {"User-Agent": "Tasarini/1.0 (+https://tasarini.com)"}
_TIMEOUT = 12


def search_images(query, n=3):
    """Renvoie jusqu'à `n` URLs d'images Openverse pour `query` (liste, [] si rien/erreur)."""
    query = (query or "").strip()
    if not query:
        return []
    n = max(1, min(int(n or 3), 20))
    try:
        r = requests.get(
            _API,
            params={"q": query, "page_size": n, "mature": "false"},
            headers=_HEADERS,
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        results = r.json().get("results") or []
    except Exception as exc:  # noqa: BLE001 - résilient
        logger.warning("Openverse '%s' échec: %s", query, exc)
        return []
    out = []
    for it in results:
        url = it.get("url") or it.get("thumbnail")
        if url and url not in out:
            out.append(url)
        if len(out) >= n:
            break
    return out


def search_image_objects(query, n=3):
    """Comme search_images mais renvoie des objets {url, thumbnailUrl, attribution, source, license}."""
    query = (query or "").strip()
    if not query:
        return []
    n = max(1, min(int(n or 3), 20))
    try:
        r = requests.get(
            _API,
            params={"q": query, "page_size": n, "mature": "false"},
            headers=_HEADERS,
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        results = r.json().get("results") or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("Openverse '%s' échec: %s", query, exc)
        return []
    out = []
    for it in results:
        url = it.get("url") or it.get("thumbnail")
        if not url:
            continue
        creator = it.get("creator") or ""
        lic = " ".join(x for x in [it.get("license"), it.get("license_version")] if x).upper()
        out.append({
            "url": url,
            "thumbnailUrl": it.get("thumbnail") or url,
            "source": it.get("source") or "openverse",
            "license": lic,
            "attribution": (f"{creator} ({lic})" if creator else (lic or "Openverse")),
            "foreignLandingUrl": it.get("foreign_landing_url") or "",
            "creator": creator,
        })
        if len(out) >= n:
            break
    return out
