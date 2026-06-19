"""Foursquare Places provider (new Places API, 2025).

Uses bearer auth + the X-Places-Api-Version header. Base URL and version are
overridable via settings in case Foursquare bumps the API. Resilient: returns []
on any error so the other providers still work.
"""
from __future__ import annotations

import logging

import requests
from django.conf import settings

from .normalize import make_poi

logger = logging.getLogger(__name__)

_BASE = 'https://places-api.foursquare.com/places/search'
_VERSION = '2025-06-17'


def fetch(lat: float, lon: float, radius_m: int, limit: int = 50) -> list[dict]:
    key = getattr(settings, 'FOURSQUARE_API_KEY', '')
    if not key:
        return []
    base = getattr(settings, 'FOURSQUARE_API_BASE', _BASE)
    version = getattr(settings, 'FOURSQUARE_API_VERSION', _VERSION)
    try:
        resp = requests.get(
            base,
            params={
                'll': f'{lat},{lon}',
                'radius': min(radius_m, 100000),
                'limit': min(limit, 50),
                'fields': 'fsq_place_id,name,location,categories,latitude,longitude,website,tel',
            },
            headers={
                'Authorization': f'Bearer {key}',
                'X-Places-Api-Version': version,
                'Accept': 'application/json',
            },
            timeout=12,
        )
        resp.raise_for_status()
        results = resp.json().get('results', [])
    except Exception as exc:  # noqa: BLE001
        logger.warning('Foursquare fetch failed: %s', exc)
        return []

    out: list[dict] = []
    for place in results:
        pid = place.get('fsq_place_id') or place.get('fsq_id')
        if not pid:
            continue
        loc = place.get('location', {}) or {}
        cats = [c.get('name') for c in (place.get('categories') or []) if c.get('name')]
        poi = make_poi(
            source='foursquare',
            external_id=pid,
            name=place.get('name') or '',
            lat=place.get('latitude') or loc.get('latitude'),
            lon=place.get('longitude') or loc.get('longitude'),
            address=loc.get('formatted_address') or loc.get('address') or '',
            website=place.get('website') or '',
            phone=place.get('tel') or '',
            categories=cats,
            tags=cats,
            source_url=f'https://foursquare.com/v/{pid}',
        )
        if poi:
            out.append(poi)
    return out
