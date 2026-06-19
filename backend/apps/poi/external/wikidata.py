"""Wikidata provider — notable places near a point via SPARQL `wikibase:around`.

Good for monuments/landmarks with multilingual labels + images (P18). The label
language follows the request (defaults fr,en).
"""
from __future__ import annotations

import logging
import re

import requests
from django.conf import settings

from .normalize import make_poi

logger = logging.getLogger(__name__)

_POINT_RE = re.compile(r'Point\(([-\d.]+)\s+([-\d.]+)\)')

# Noms à exclure : voies/plaques/administratif (peu inspirants, fréquents près des villes).
_NOISE_RE = re.compile(
    r'^(avenue|rue|boulevard|bd|place|plaque|allée|allee|impasse|quai|passage|square|'
    r'cours|chemin|sentier|voie|route|pont|carrefour|rond-point|esplanade|villa|cité|cite)\b',
    re.IGNORECASE,
)


def _sparql(lat: float, lon: float, radius_km: float, limit: int, lang: str) -> str:
    return f"""
SELECT ?item ?itemLabel ?itemDescription ?coord ?image WHERE {{
  SERVICE wikibase:around {{
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point({lon} {lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "{radius_km}" .
  }}
  OPTIONAL {{ ?item wdt:P18 ?image. }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "{lang},en". }}
}}
LIMIT {min(limit, 100)}
""".strip()


def fetch(lat: float, lon: float, radius_m: int, limit: int = 40, lang: str = 'fr') -> list[dict]:
    url = getattr(settings, 'WIKIDATA_SPARQL_URL', 'https://query.wikidata.org/sparql')
    ua = getattr(settings, 'EXTERNAL_POI_USER_AGENT', 'Tasarini/1.0')
    radius_km = round(min(radius_m, 100000) / 1000.0, 2)
    try:
        resp = requests.get(
            url,
            params={'query': _sparql(lat, lon, radius_km, limit, lang), 'format': 'json'},
            headers={'User-Agent': ua, 'Accept': 'application/sparql-results+json'},
            timeout=20,
        )
        resp.raise_for_status()
        rows = resp.json().get('results', {}).get('bindings', [])
    except Exception as exc:  # noqa: BLE001
        logger.warning('Wikidata fetch failed: %s', exc)
        return []

    out: list[dict] = []
    for row in rows:
        uri = row.get('item', {}).get('value', '')
        qid = uri.rsplit('/', 1)[-1] if uri else ''
        coord = row.get('coord', {}).get('value', '')
        m = _POINT_RE.search(coord or '')
        if not qid or not m:
            continue
        plon, plat = float(m.group(1)), float(m.group(2))
        label = row.get('itemLabel', {}).get('value', '')
        # Skip rows where the label is just the Q-id (no human label in requested langs)
        if not label or label == qid:
            continue
        # Filtrer les voies/plaques/administratif (peu inspirants).
        if _NOISE_RE.match(label.strip()):
            continue
        image = row.get('image', {}).get('value', '')
        poi = make_poi(
            source='wikidata',
            external_id=qid,
            name=label,
            lat=plat,
            lon=plon,
            description=row.get('itemDescription', {}).get('value', ''),
            images=[image] if image else [],
            categories=['wikidata', 'tourism'],
            tags=['wikidata'],
            source_url=uri,
        )
        if poi:
            out.append(poi)
    return out
