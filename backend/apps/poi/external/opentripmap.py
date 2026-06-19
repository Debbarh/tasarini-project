"""OpenTripMap provider — sites touristiques riches (descriptions Wikipédia, images).

Deux usages :
- fetch(): source de POI (recherche par rayon) pour l'agrégateur.
- enrich(): enrichissement À LA DEMANDE d'un POI (description + image) via le détail
  OpenTripMap (xid), pour la fiche d'un POI qui n'a pas de description/photo.
"""
from __future__ import annotations

import logging

import requests
from django.conf import settings

from .normalize import make_poi, _force_https

logger = logging.getLogger(__name__)

_BASE = 'https://api.opentripmap.com/0.1'
# Catégories touristiques (les hébergements sont de toute façon écartés par l'agrégateur).
_KINDS = 'cultural,historic,architecture,natural,museums,monuments_and_memorials,view_points,urban_environment,amusements'


def fetch(lat: float, lon: float, radius_m: int, limit: int = 60) -> list[dict]:
    key = getattr(settings, 'OPENTRIPMAP_API_KEY', '')
    if not key:
        return []
    try:
        resp = requests.get(
            f'{_BASE}/en/places/radius',
            params={
                'radius': min(radius_m, 50000),
                'lon': lon, 'lat': lat,
                'kinds': _KINDS,
                'format': 'json',
                'limit': min(limit, 100),
                'apikey': key,
            },
            timeout=12,
        )
        resp.raise_for_status()
        items = resp.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning('OpenTripMap fetch failed: %s', exc)
        return []

    if not isinstance(items, list):
        return []
    out: list[dict] = []
    for it in items:
        xid = it.get('xid')
        name = it.get('name')
        pt = it.get('point') or {}
        if not xid or not name or not pt:
            continue
        kinds = (it.get('kinds') or '').split(',')
        poi = make_poi(
            source='opentripmap',
            external_id=xid,
            name=name,
            lat=pt.get('lat'),
            lon=pt.get('lon'),
            categories=kinds,
            tags=kinds,
            source_url=f'https://opentripmap.com/en/card/{xid}',
            extra={'otm_xid': xid, 'wikidata': it.get('wikidata', '')},
        )
        if poi:
            out.append(poi)
    return out


def _detail(xid: str) -> dict | None:
    # OpenTripMap n'accepte que /en/ (et /ru/) dans le path détail → on force 'en'.
    key = getattr(settings, 'OPENTRIPMAP_API_KEY', '')
    if not key or not xid:
        return None
    try:
        resp = requests.get(f'{_BASE}/en/places/xid/{xid}', params={'apikey': key}, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning('OpenTripMap detail failed (%s): %s', xid, exc)
        return None


def enrich(name: str, lat: float, lon: float, lang: str = 'en') -> dict:
    """Cherche le lieu OpenTripMap le plus proche correspondant au nom, renvoie
    {description, image, source_url, wikidata}. {} si rien."""
    key = getattr(settings, 'OPENTRIPMAP_API_KEY', '')
    if not key or lat is None or lon is None:
        return {}
    try:
        resp = requests.get(
            f'{_BASE}/en/places/radius',
            params={'radius': 1500, 'lon': lon, 'lat': lat, 'kinds': 'interesting_places',
                    'format': 'json', 'limit': 50, 'apikey': key},
            timeout=10,
        )
        resp.raise_for_status()
        items = [it for it in (resp.json() or []) if isinstance(it, dict) and it.get('xid') and it.get('name')]
    except Exception as exc:  # noqa: BLE001
        logger.warning('OpenTripMap enrich search failed: %s', exc)
        return {}
    if not items:
        return {}

    # Sélection : un match de nom (dans un sens ou l'autre) sinon le lieu le plus notable (rate).
    nl = (name or '').strip().lower()
    def rate(it):
        try:
            return float(it.get('rate') or 0)
        except (TypeError, ValueError):
            return 0.0
    matches = [it for it in items if nl and (nl in it['name'].lower() or it['name'].lower() in nl)]
    pool = matches or items
    chosen = max(pool, key=rate)

    d = _detail(chosen['xid']) or {}
    description = ((d.get('wikipedia_extracts') or {}).get('text') or d.get('info', {}).get('descr') or '').strip()
    image = _force_https((d.get('preview') or {}).get('source') or d.get('image') or '')
    return {
        'description': description,
        'image': image,
        'source_url': d.get('otm') or f"https://opentripmap.com/en/card/{chosen['xid']}",
        'wikidata': d.get('wikidata', ''),
    }
