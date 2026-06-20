"""Persistance des POI d'un itinéraire généré (Plan your trip).

À la sauvegarde d'un itinéraire, on persiste chaque ACTIVITÉ géolocalisée en `TouristPoint` :
  - DÉDUP contre la base existante (nom similaire + proximité ~150 m) → on RÉUTILISE, jamais de doublon.
  - Sinon création d'un POI NON PUBLIC (status=pending, is_active=False) appartenant à l'utilisateur,
    avec la description fournie par l'IA. Validable ensuite via la modération admin existante.
On renseigne `activity.location.poi_id` (existant ou créé). On ne modifie jamais un POI existant.
"""
from __future__ import annotations

import logging
import math

logger = logging.getLogger(__name__)

_RADIUS_M = 150  # rayon de dédup (mètres)


def _norm(s) -> str:
    return ' '.join((s or '').strip().lower().split())


def _find_existing(name, lat, lng):
    """POI existant proche (bbox via index lat/lon) avec nom similaire, sinon None."""
    from .models import TouristPoint
    dlat = _RADIUS_M / 111000.0
    dlng = _RADIUS_M / (111000.0 * max(0.1, math.cos(math.radians(lat))))
    nname = _norm(name)
    qs = TouristPoint.objects.filter(
        latitude__range=(lat - dlat, lat + dlat),
        longitude__range=(lng - dlng, lng + dlng),
    ).only('id', 'name')[:50]
    for p in qs:
        pn = _norm(p.name)
        if pn and (pn == nname or nname in pn or pn in nname):
            return p
    return None


def persist_itinerary_pois(itinerary_data, user):
    """Persiste les activités géolocalisées d'un itinéraire en POI (dédup). Renvoie l'itinéraire
    enrichi (chaque activity.location reçoit un `poi_id`). Robuste : isole chaque activité."""
    from .models import TouristPoint
    if not isinstance(itinerary_data, dict) or user is None:
        return itinerary_data
    seen = {}  # clé (lat5, lng5, nom_normalisé) -> poi_id (dédup intra-itinéraire)
    created = reused = 0
    for day in (itinerary_data.get('days') or []):
        if not isinstance(day, dict):
            continue
        for act in (day.get('activities') or []):
            if not isinstance(act, dict):
                continue
            loc = act.get('location')
            if not isinstance(loc, dict):
                continue
            name = (loc.get('name') or act.get('title') or '').strip()
            lat, lng = loc.get('latitude'), loc.get('longitude')
            if not name or lat is None or lng is None:
                continue
            try:
                lat, lng = round(float(lat), 6), round(float(lng), 6)
            except (TypeError, ValueError):
                continue
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                continue
            key = (round(lat, 5), round(lng, 5), _norm(name))
            if key in seen:
                loc['poi_id'] = seen[key]
                continue
            try:
                existing = _find_existing(name, lat, lng)
                if existing:
                    loc['poi_id'] = str(existing.id)
                    seen[key] = str(existing.id)
                    reused += 1
                    continue
                # Jusqu'à 3 photos Openverse (si elles existent) persistées sur le POI.
                try:
                    from .external.openverse import search_images
                    imgs = search_images(name, n=3)
                except Exception:  # noqa: BLE001
                    imgs = []
                meta = {'source': 'ai_itinerary'}
                if imgs:
                    meta['images'] = imgs
                    loc['images'] = imgs  # exposées aussi dans l'itinéraire
                poi = TouristPoint.objects.create(
                    owner=user,
                    name=name[:255],
                    description=(act.get('description') or ''),
                    address=(loc.get('address') or '')[:255],
                    latitude=lat,
                    longitude=lng,
                    is_active=False,                       # NON public tant que non validé
                    status=TouristPoint.Status.PENDING,
                    is_activity=True,
                    metadata=meta,
                )
                loc['poi_id'] = str(poi.id)
                seen[key] = str(poi.id)
                created += 1
            except Exception as exc:  # noqa: BLE001 - on isole chaque activité
                logger.warning("persist_itinerary_pois '%s' échec: %s", name, exc)
    if created or reused:
        logger.info("persist_itinerary_pois: %d créés, %d réutilisés", created, reused)
    return itinerary_data
