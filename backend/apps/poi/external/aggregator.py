"""Fan out to all external providers in parallel, dedupe, cache.

Cache key is rounded to ~1km (3 decimals) so nearby map pans reuse results and we
stay well within provider rate limits.
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FutureTimeout

from django.core.cache import cache

from . import foursquare, geoapify, locationiq, opentripmap, overpass, wikidata
from .normalize import dedupe, is_tourist_site

logger = logging.getLogger(__name__)

CACHE_TTL = 60 * 60  # 1 hour
OVERALL_TIMEOUT = 16  # s — au-delà, on renvoie ce qu'on a (un provider lent ne bloque pas la carte)

# Découverte = base (import Overture). On retire les sources live redondantes avec Overture
# (OSM/Overpass, Geoapify, Foursquare, LocationIQ — Overture est construit à partir d'OSM +
# Meta + Microsoft + Foursquare open data). On ne garde qu'OpenTripMap + Wikidata, utiles en
# repli/enrichissement. L'enrichissement des fiches (/poi/enrich/, /poi/image/) reste séparé.
PROVIDERS = {
    'wikidata': wikidata.fetch,
    'opentripmap': opentripmap.fetch,
}


def _cache_key(lat: float, lon: float, radius_m: int, sources: tuple, lang: str) -> str:
    # v2 = focus « sites touristiques » (invalide les caches précédents incluant restos/commerces).
    return f"extpoi:v2:{round(lat, 3)}:{round(lon, 3)}:{radius_m}:{'-'.join(sources)}:{lang}"


def fetch_external_pois(lat: float, lon: float, radius_m: int, sources=None,
                        limit: int = 60, lang: str = 'fr') -> list[dict]:
    """Return a deduped list of normalized POIs from the requested sources."""
    sources = tuple(sources) if sources else tuple(PROVIDERS.keys())
    sources = tuple(s for s in sources if s in PROVIDERS)
    if not sources:
        return []

    key = _cache_key(lat, lon, radius_m, sources, lang)
    cached = cache.get(key)
    if cached is not None:
        return cached

    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=len(sources)) as pool:
        futures = {}
        for name in sources:
            fn = PROVIDERS[name]
            if name == 'wikidata':
                futures[pool.submit(fn, lat, lon, radius_m, limit, lang)] = name
            else:
                futures[pool.submit(fn, lat, lon, radius_m, limit)] = name
        try:
            for fut in as_completed(futures, timeout=OVERALL_TIMEOUT):
                name = futures[fut]
                try:
                    results.extend(fut.result() or [])
                except Exception as exc:  # noqa: BLE001
                    logger.warning('Provider %s crashed: %s', name, exc)
        except FutureTimeout:
            # Un/des provider(s) trop lent(s) : on renvoie ce qui est déjà arrivé.
            slow = [n for f, n in futures.items() if not f.done()]
            logger.warning('External POIs: providers lents ignorés (>%ss): %s', OVERALL_TIMEOUT, slow)

    # Focus « sites touristiques » : on ne garde QUE des lieux dont une catégorie
    # correspond à l'allowlist touristique (monuments, musées, patrimoine, nature,
    # points de vue…). Restaurants, hébergements et POI génériques sont écartés.
    merged = [p for p in dedupe(results) if is_tourist_site(p)]
    # On ne cache QUE si on a un résultat non vide (évite de figer 1h une réponse partielle vide).
    if merged:
        cache.set(key, merged, CACHE_TTL)
    return merged
