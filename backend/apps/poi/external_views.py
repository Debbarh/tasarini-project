"""API views for external POIs in Be Inspired.

- ExternalPOIListView: live-fetch + cache, public, returns normalized POIs.
- ExternalPOIImportView: lazy-import an external POI into a real TouristPoint the
  first time a user uses it (favorite / add to itinerary), so it gets a real UUID.
"""
from __future__ import annotations

from django.core.cache import cache
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .external.aggregator import PROVIDERS, fetch_external_pois
from .models import TouristPoint
from .serializers import TouristPointSerializer


class ExternalPOIListView(APIView):
    """GET /api/v1/poi/external/?lat=&lng=&radius=&sources=&lang="""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            lat = float(request.query_params.get('lat'))
            lng = float(request.query_params.get('lng'))
        except (TypeError, ValueError):
            return Response({'detail': 'lat et lng requis (nombres).'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            radius_km = float(request.query_params.get('radius', 30))
        except (TypeError, ValueError):
            radius_km = 30
        radius_m = int(max(1, min(radius_km, 100)) * 1000)

        sources_param = request.query_params.get('sources', '')
        sources = [s.strip() for s in sources_param.split(',') if s.strip()] or None
        lang = (request.query_params.get('lang') or 'fr')[:5]

        # Limite par source (Foursquare/LocationIQ plafonnent à 50 côté API; les autres
        # montent plus haut). Défaut 100, borné à 200 pour ne pas surcharger la carte.
        try:
            limit = int(request.query_params.get('limit', 100))
        except (TypeError, ValueError):
            limit = 100
        limit = max(10, min(limit, 200))

        pois = fetch_external_pois(lat, lng, radius_m, sources=sources, limit=limit, lang=lang)
        return Response({'count': len(pois), 'sources': list(sources or PROVIDERS.keys()), 'results': pois})


class POIImageView(APIView):
    """GET /api/v1/poi/image/?q=<nom du lieu> — 1 image Wikimedia Commons, cachée 7j.

    Enrichissement d'images à la demande pour les POI sans photo (les sources
    Geoapify/OSM/Foursquare/LocationIQ n'en fournissent pas).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        if not q:
            return Response({'image': None})
        key = f"poiimg:{q.lower()[:140]}"
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)

        from apps.travel.wikimedia_service import fetch_activity_image
        info = fetch_activity_image(q)
        result = {
            'image': (info or {}).get('thumbnailUrl') or (info or {}).get('url'),
            'attribution': (info or {}).get('attribution', ''),
        } if info else {'image': None, 'attribution': ''}
        cache.set(key, result, 60 * 60 * 24 * 7)  # 7 jours
        return Response(result)


class POIEnrichView(APIView):
    """GET /api/v1/poi/enrich/?q=<nom>&lat=&lng=&lang= — enrichissement OpenTripMap.

    Renvoie {description, image, source_url} pour un POI (cherche le lieu OTM le plus
    proche correspondant au nom, lit son détail Wikipédia + image). Caché 7j.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        try:
            lat = float(request.query_params.get('lat'))
            lng = float(request.query_params.get('lng'))
        except (TypeError, ValueError):
            return Response({'description': '', 'image': None})
        lang = (request.query_params.get('lang') or 'en')[:2]
        key = f"poienrich:{round(lat, 4)}:{round(lng, 4)}:{q.lower()[:80]}:{lang}"
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)

        from .external import opentripmap
        info = opentripmap.enrich(q, lat, lng, lang=lang) or {}
        result = {
            'description': info.get('description', ''),
            'image': info.get('image') or None,
            'source_url': info.get('source_url', ''),
        }
        cache.set(key, result, 60 * 60 * 24 * 7)
        return Response(result)


class ExternalPOIImportView(APIView):
    """POST /api/v1/poi/external/import/ — find-or-create a TouristPoint from an external POI.

    Body = a normalized external POI (as returned by the list endpoint), or at least
    {metadata:{external_source, external_id}, name, latitude, longitude, ...}.
    Returns the serialized TouristPoint (real UUID id).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data or {}
        meta = data.get('metadata') or {}
        source = meta.get('external_source')
        external_id = meta.get('external_id')
        if not source or not external_id:
            return Response({'detail': 'metadata.external_source et external_id requis.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Idempotent: return the existing import if any.
        existing = TouristPoint.objects.filter(
            metadata__external_source=source,
            metadata__external_id=str(external_id),
        ).first()
        if existing:
            return Response(TouristPointSerializer(existing, context={'request': request}).data,
                            status=status.HTTP_200_OK)

        lat = data.get('latitude')
        lng = data.get('longitude')
        if lat is None or lng is None:
            return Response({'detail': 'latitude et longitude requis.'},
                            status=status.HTTP_400_BAD_REQUEST)

        tp = TouristPoint.objects.create(
            owner=request.user,
            name=(data.get('name') or 'Lieu')[:255],
            description=data.get('description') or '',
            latitude=lat,
            longitude=lng,
            address=(data.get('address') or '')[:255],
            website_url=data.get('website_url') or '',
            contact_phone=(data.get('contact_phone') or '')[:64],
            is_active=True,
            is_verified=False,
            backend=True,
            status=TouristPoint.Status.APPROVED,
            is_restaurant=bool(data.get('is_restaurant')),
            is_accommodation=bool(data.get('is_accommodation')),
            is_activity=bool(data.get('is_activity')),
            metadata={
                'external_source': source,
                'external_id': str(external_id),
                'source_url': meta.get('source_url', ''),
                'categories': meta.get('categories', []),
                'images': data.get('media_images', []),
                'tags': data.get('tags', []),
                'opening_hours': data.get('opening_hours', ''),
                'imported_from': 'be_inspired_external',
            },
        )
        return Response(TouristPointSerializer(tp, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)
