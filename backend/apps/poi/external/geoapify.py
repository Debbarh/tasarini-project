"""Geoapify Places provider. Docs: https://apidocs.geoapify.com/docs/places/"""
from __future__ import annotations

import logging

import requests
from django.conf import settings

from .normalize import make_poi, osm_tag_images

logger = logging.getLogger(__name__)

# Focus « sites touristiques » uniquement : monuments/sights, musées & culture,
# parcs & nature. PAS de restauration, commerces ni catégories génériques.
_CATEGORIES = ','.join([
    'tourism.sights', 'tourism.attraction',
    'entertainment.museum', 'entertainment.culture', 'entertainment.zoo', 'entertainment.aquarium',
    'leisure.park', 'natural', 'natural.mountain', 'natural.water',
])


def fetch(lat: float, lon: float, radius_m: int, limit: int = 60) -> list[dict]:
    key = getattr(settings, 'GEOAPIFY_API_KEY', '')
    if not key:
        return []
    try:
        resp = requests.get(
            'https://api.geoapify.com/v2/places',
            params={
                'categories': _CATEGORIES,
                'filter': f'circle:{lon},{lat},{min(radius_m, 50000)}',
                'bias': f'proximity:{lon},{lat}',
                'limit': min(limit, 100),
                'apiKey': key,
            },
            timeout=12,
        )
        resp.raise_for_status()
        features = resp.json().get('features', [])
    except Exception as exc:  # noqa: BLE001 - resilient: one source down must not break the rest
        logger.warning('Geoapify fetch failed: %s', exc)
        return []

    out: list[dict] = []
    for feat in features:
        props = feat.get('properties', {}) or {}
        pid = props.get('place_id') or props.get('osm_id')
        if not pid:
            continue
        # Geoapify expose les tags OSM bruts dans datasource.raw → on y récupère l'image.
        raw = (props.get('datasource') or {}).get('raw') if isinstance(props.get('datasource'), dict) else {}
        poi = make_poi(
            source='geoapify',
            external_id=pid,
            name=props.get('name') or '',
            lat=props.get('lat'),
            lon=props.get('lon'),
            address=props.get('formatted') or props.get('address_line2') or '',
            website=props.get('website') or '',
            phone=props.get('contact', {}).get('phone', '') if isinstance(props.get('contact'), dict) else '',
            categories=props.get('categories') or [],
            tags=props.get('categories') or [],
            images=osm_tag_images(raw),
            opening_hours=(props.get('opening_hours') or (raw.get('opening_hours') if isinstance(raw, dict) else '') or ''),
            source_url=props.get('website') or '',
        )
        if poi:
            out.append(poi)
    return out
