"""Common normalized POI shape + helpers shared by all external providers.

A normalized POI is a plain dict shaped to match what the frontend `POI` interface /
`TouristPointSerializer` expect (the subset the map needs), so external POIs render
exactly like platform ones. The `metadata.external_*` keys carry the provenance and
are what the lazy-import endpoint uses to find-or-create a real TouristPoint.
"""
from __future__ import annotations

import math


# --- Category mapping --------------------------------------------------------
# We classify every external POI into one of the platform's 4 marker buckets so it
# gets the right colour/icon on the map: restaurant / accommodation / activity /
# tourist (default). Keys are lowercase substrings matched against source categories.
_RESTAURANT_HINTS = (
    'restaurant', 'cafe', 'café', 'bar', 'pub', 'fast_food', 'food', 'bakery',
    'catering', 'ice_cream', 'biergarten', 'dining',
)
_ACCOMMODATION_HINTS = (
    'hotel', 'hostel', 'guest_house', 'guesthouse', 'motel', 'apartment',
    'accommodation', 'camp_site', 'camping', 'chalet', 'resort', 'lodging',
)
_ACTIVITY_HINTS = (
    'leisure', 'sport', 'park', 'hiking', 'climbing', 'beach', 'theme_park',
    'water_park', 'zoo', 'aquarium', 'entertainment', 'activity', 'trail',
    'viewpoint', 'nature', 'diving', 'ski',
)
# Everything cultural/sightseeing falls back to "tourist".

# Allowlist POSITIVE des « sites touristiques » : on ne garde QUE des lieux dont
# une catégorie/tag correspond (monuments, musées, patrimoine, nature, points de
# vue, places emblématiques…). Tout le reste (commerces, services, sport/fitness,
# génériques) est écarté. Restaurants/hébergements sont déjà exclus en amont.
_TOURIST_HINTS = (
    # tourisme & sites
    'tourism', 'sight', 'attraction', 'viewpoint', 'view_point', 'scenic', 'lookout',
    'landmark', 'monument', 'memorial', 'heritage', 'historic', 'archaeolog', 'ruins',
    'ruin', 'castle', 'palace', 'fort', 'citadel', 'tower', 'lighthouse', 'aqueduct',
    'amphitheatre', 'theatre', 'theater', 'opera', 'architecture', 'amusement',
    'urban_environment', 'artwork', 'attraction',
    # culture
    'museum', 'gallery', 'art', 'culture', 'cultural', 'exhibition', 'planetarium',
    # patrimoine religieux
    'temple', 'church', 'cathedral', 'basilica', 'mosque', 'synagogue', 'shrine',
    'chapel', 'abbey', 'monastery', 'convent', 'minaret', 'mausoleum', 'tomb', 'kasbah',
    # nature
    'park', 'garden', 'botanic', 'nature_reserve', 'national_park', 'natural',
    'waterfall', 'peak', 'volcano', 'mountain', 'cliff', 'gorge', 'canyon', 'cave',
    'beach', 'lake', 'spring', 'geyser', 'glacier', 'island', 'forest', 'oasis',
    'zoo', 'aquarium', 'wildlife', 'safari', 'dune', 'lagoon',
    # places emblématiques
    'square', 'plaza', 'fountain', 'statue', 'obelisk', 'arch', 'gate', 'promenade',
    'medina', 'souk', 'old_town', 'historic_centre', 'picnic',
)


def classify(categories) -> str:
    """Return one of: restaurant | accommodation | activity | tourist."""
    blob = ' '.join(str(c).lower() for c in (categories or []))
    if any(h in blob for h in _RESTAURANT_HINTS):
        return 'restaurant'
    if any(h in blob for h in _ACCOMMODATION_HINTS):
        return 'accommodation'
    if any(h in blob for h in _ACTIVITY_HINTS):
        return 'activity'
    return 'tourist'


def is_tourist_site(poi: dict) -> bool:
    """True si le POI est un site touristique (allowlist positive). Exclut
    restaurants/hébergements et tout ce qui ne correspond à aucun indice touristique."""
    if not poi or poi.get('is_restaurant') or poi.get('is_accommodation'):
        return False
    cats = (poi.get('metadata') or {}).get('categories') or []
    blob = ' '.join(str(c).lower() for c in (list(cats) + list(poi.get('tags') or [])))
    return any(h in blob for h in _TOURIST_HINTS)


def make_poi(*, source: str, external_id: str, name: str, lat, lon,
             description: str = '', address: str = '', website: str = '',
             phone: str = '', categories=None, images=None, tags=None,
             source_url: str = '', rating=None, opening_hours: str = '', extra=None) -> dict | None:
    """Build a normalized POI dict, or None if it lacks the essentials."""
    if not name or lat is None or lon is None:
        return None
    # Rejette les noms "junk" sans aucune lettre (ex. numéros de rue LocationIQ).
    if not any(ch.isalpha() for ch in name):
        return None
    try:
        lat = round(float(lat), 6)
        lon = round(float(lon), 6)
    except (TypeError, ValueError):
        return None

    categories = [c for c in (categories or []) if c]
    bucket = classify(categories)
    tag_list = list(dict.fromkeys([t for t in (tags or []) if t]))  # unique, ordered

    return {
        'id': f'ext:{source}:{external_id}',
        'name': name.strip()[:255],
        'description': (description or '').strip(),
        'latitude': lat,
        'longitude': lon,
        'address': (address or '').strip()[:255],
        'website_url': website or '',
        'contact_phone': phone or '',
        'rating': rating,
        'review_count': 0,
        'tags': tag_list[:12],
        # Force https : Wikidata P18 renvoie des URLs http → bloquées en mixed-content sur le site https.
        'media_images': [_force_https(i) for i in (images or []) if i][:6],
        'is_active': True,
        'is_external': True,
        'opening_hours': (opening_hours or '').strip(),
        'is_restaurant': bucket == 'restaurant',
        'is_accommodation': bucket == 'accommodation',
        'is_activity': bucket == 'activity',
        'metadata': {
            'external_source': source,
            'external_id': str(external_id),
            'source_url': source_url or '',
            'categories': categories[:8],
            **(extra or {}),
        },
    }


def _force_https(url: str) -> str:
    """Passe une URL http en https (anti mixed-content sur le site https)."""
    u = str(url or '')
    return 'https://' + u[len('http://'):] if u.startswith('http://') else u


def osm_tag_images(tags) -> list:
    """Extrait des images depuis des tags OSM (image=URL, wikimedia_commons=File:...).

    Utilisé par Overpass ET Geoapify (qui expose les tags OSM bruts dans datasource.raw).
    """
    if not isinstance(tags, dict):
        return []
    out = []
    img = str(tags.get('image', '') or '')
    if img.startswith('http'):
        out.append(img)
    commons = str(tags.get('wikimedia_commons', '') or '')
    if commons.startswith('File:'):
        fname = commons[len('File:'):].replace(' ', '_')
        out.append(f'https://commons.wikimedia.org/wiki/Special:FilePath/{fname}?width=800')
    return out


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def dedupe(pois: list[dict]) -> list[dict]:
    """Drop near-duplicates across providers: same source+id, or same name within ~60m."""
    out: list[dict] = []
    seen_ids: set[str] = set()
    for poi in pois:
        key = poi['id']
        if key in seen_ids:
            continue
        dup = False
        for kept in out:
            if kept['name'].lower() == poi['name'].lower():
                if haversine_km(kept['latitude'], kept['longitude'],
                                poi['latitude'], poi['longitude']) < 0.06:
                    dup = True
                    break
        if dup:
            continue
        seen_ids.add(key)
        out.append(poi)
    return out
