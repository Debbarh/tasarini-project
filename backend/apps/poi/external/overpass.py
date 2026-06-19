"""Overpass (OpenStreetMap) provider. Docs: https://wiki.openstreetmap.org/wiki/Overpass_API"""
from __future__ import annotations

import logging

import requests
from django.conf import settings

from .normalize import make_poi, osm_tag_images

logger = logging.getLogger(__name__)


def _query(lat: float, lon: float, radius_m: int, limit: int) -> str:
    r = min(radius_m, 100000)
    # On inclut nodes ET ways : monuments/musées sont souvent des ways (bâtiments)
    # porteurs des tags image=/wikimedia_commons=. `out center` donne leur centroïde.
    # Focus « sites touristiques » : tourisme (hors hébergements & panneaux info),
    # patrimoine historique, parcs/jardins/réserves et éléments naturels remarquables.
    # On NE récupère PAS les restaurants/commerces.
    no_lodging = 'hotel|motel|hostel|guest_house|apartment|chalet|camp_site|caravan_site|information|love_hotel'
    return f"""
[out:json][timeout:12];
(
  node["tourism"]["name"]["tourism"!~"{no_lodging}"](around:{r},{lat},{lon});
  way["tourism"]["name"]["tourism"!~"{no_lodging}"](around:{r},{lat},{lon});
  node["historic"]["name"](around:{r},{lat},{lon});
  way["historic"]["name"](around:{r},{lat},{lon});
  node["leisure"~"park|garden|nature_reserve"]["name"](around:{r},{lat},{lon});
  way["leisure"~"park|garden|nature_reserve"]["name"](around:{r},{lat},{lon});
  node["natural"~"peak|volcano|waterfall|beach|cave_entrance|spring|geyser|cliff"]["name"](around:{r},{lat},{lon});
);
out center {min(limit, 150)};
""".strip()


def fetch(lat: float, lon: float, radius_m: int, limit: int = 60) -> list[dict]:
    url = getattr(settings, 'OVERPASS_API_URL', 'https://overpass-api.de/api/interpreter')
    ua = getattr(settings, 'EXTERNAL_POI_USER_AGENT', 'Tasarini/1.0')
    try:
        resp = requests.post(
            url,
            data={'data': _query(lat, lon, radius_m, limit)},
            headers={'User-Agent': ua},
            timeout=14,
        )
        resp.raise_for_status()
        elements = resp.json().get('elements', [])
    except Exception as exc:  # noqa: BLE001
        logger.warning('Overpass fetch failed: %s', exc)
        return []

    out: list[dict] = []
    for el in elements:
        tags = el.get('tags', {}) or {}
        name = tags.get('name')
        if not name:
            continue
        plat = el.get('lat') or (el.get('center') or {}).get('lat')
        plon = el.get('lon') or (el.get('center') or {}).get('lon')
        cats = [tags.get(k) for k in ('tourism', 'historic', 'leisure', 'natural') if tags.get(k)]
        addr_parts = [tags.get('addr:street'), tags.get('addr:housenumber'), tags.get('addr:city')]
        address = ' '.join(p for p in addr_parts if p)
        poi = make_poi(
            source='osm',
            external_id=f"{el.get('type', 'node')}/{el.get('id')}",
            name=name,
            lat=plat,
            lon=plon,
            description=tags.get('description', ''),
            address=address,
            website=tags.get('website') or tags.get('contact:website') or '',
            phone=tags.get('phone') or tags.get('contact:phone') or '',
            categories=cats,
            tags=cats,
            images=osm_tag_images(tags),
            opening_hours=tags.get('opening_hours', ''),
            source_url=f"https://www.openstreetmap.org/{el.get('type', 'node')}/{el.get('id')}",
        )
        if poi:
            out.append(poi)
    return out
