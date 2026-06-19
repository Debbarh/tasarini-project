"""LocationIQ Nearby (Points of Interest) provider.

Docs: https://docs.locationiq.com/reference/nearby
GET {base}/nearby?key=&lat=&lon=&tag=&radius=&limit=&format=json
"""
from __future__ import annotations

import logging

import requests
from django.conf import settings

from .normalize import make_poi

logger = logging.getLogger(__name__)

# LocationIQ "tag" groups — broad touristy coverage.
_TAGS = 'all'

# Types/classes non inspirants à exclure (banques, services, voirie…).
_BLOCK = {
    'bank', 'atm', 'bureau_de_change', 'fuel', 'charging_station', 'parking',
    'post_office', 'post_box', 'police', 'townhall', 'fire_station', 'school',
    'kindergarten', 'college', 'university', 'hospital', 'clinic', 'doctors',
    'dentist', 'pharmacy', 'veterinary', 'recycling', 'waste_basket', 'bench',
    'toilets', 'drinking_water', 'bicycle_parking', 'bus_stop', 'bus_station',
    'taxi', 'car_rental', 'car_wash', 'car_repair', 'driving_school', 'office',
    'courthouse', 'social_facility', 'shelter', 'grave_yard', 'cemetery',
}


def fetch(lat: float, lon: float, radius_m: int, limit: int = 50) -> list[dict]:
    key = getattr(settings, 'LOCATIONIQ_API_KEY', '')
    if not key:
        return []
    base = getattr(settings, 'LOCATIONIQ_API_BASE', 'https://us1.locationiq.com/v1')
    ua = getattr(settings, 'EXTERNAL_POI_USER_AGENT', 'Tasarini/1.0')
    try:
        resp = requests.get(
            f'{base}/nearby',
            params={
                'key': key,
                'lat': lat,
                'lon': lon,
                'tag': _TAGS,
                'radius': min(radius_m, 30000),  # LocationIQ caps nearby radius
                'limit': min(limit, 50),
                'format': 'json',
            },
            headers={'User-Agent': ua},
            timeout=12,
        )
        resp.raise_for_status()
        items = resp.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning('LocationIQ fetch failed: %s', exc)
        return []

    if not isinstance(items, list):
        return []

    out: list[dict] = []
    for it in items:
        pid = it.get('place_id') or it.get('osm_id')
        if not pid:
            continue
        if it.get('type') in _BLOCK or it.get('class') in _BLOCK:
            continue
        name = it.get('name') or (it.get('address') or {}).get('name') or it.get('display_name', '').split(',')[0]
        cats = [c for c in (it.get('type'), it.get('class')) if c]
        poi = make_poi(
            source='locationiq',
            external_id=str(pid),
            name=name or '',
            lat=it.get('lat'),
            lon=it.get('lon'),
            address=it.get('display_name', ''),
            categories=cats,
            tags=cats,
            source_url=(f"https://www.openstreetmap.org/{it.get('osm_type')}/{it.get('osm_id')}"
                        if it.get('osm_id') and it.get('osm_type') else ''),
        )
        if poi:
            out.append(poi)
    return out
