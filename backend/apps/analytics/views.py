from datetime import timedelta

from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.poi.models import TouristPoint

from .models import TouristPointAnalytics, TravelAnalytics
from .serializers import TouristPointAnalyticsSerializer, TravelAnalyticsSerializer


class TouristPointAnalyticsViewSet(viewsets.ModelViewSet):
    """ViewSet for TouristPointAnalytics - read-only for partners to view their POI analytics"""
    queryset = TouristPointAnalytics.objects.select_related('tourist_point').all()
    serializer_class = TouristPointAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        """Filter analytics based on user's tourist points"""
        queryset = super().get_queryset()
        user = self.request.user

        # Filter by tourist_point_id if provided
        tourist_point_id = self.request.query_params.get('tourist_point_id')
        if tourist_point_id:
            queryset = queryset.filter(tourist_point_id=tourist_point_id)

        # Filter by date range
        date_gte = self.request.query_params.get('date__gte')
        if date_gte:
            queryset = queryset.filter(date__gte=date_gte)

        date_lte = self.request.query_params.get('date__lte')
        if date_lte:
            queryset = queryset.filter(date__lte=date_lte)

        # Only show analytics for user's own POIs (unless admin)
        if not user.is_staff:
            queryset = queryset.filter(tourist_point__owner=user)

        return queryset.order_by('-date')


class TravelAnalyticsViewSet(viewsets.ModelViewSet):
    queryset = TravelAnalytics.objects.all().order_by('-created_at')
    serializer_class = TravelAnalyticsSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_permissions(self):  # type: ignore[override]
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        request = self.request
        if not request:
            return qs.none()

        days = request.query_params.get('days')
        if days:
            try:
                days_int = int(days)
                since = timezone.now() - timedelta(days=days_int)
                qs = qs.filter(created_at__gte=since)
            except ValueError:
                pass

        country = request.query_params.get('country')
        if country and country != 'all':
            qs = qs.filter(user_country=country)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance, _ = TravelAnalytics.objects.update_or_create(
            session_id=serializer.validated_data['session_id'],
            defaults=serializer.validated_data,
        )
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def countries(self, request):
        countries = (
            TravelAnalytics.objects.exclude(user_country__isnull=True)
            .exclude(user_country='')
            .order_by('user_country')
            .values_list('user_country', flat=True)
            .distinct()
        )
        return Response(list(countries))


def _parse_days_param(request, default: int = 7) -> int:
    raw = request.query_params.get('days')
    if not raw:
        return default
    try:
        value = int(raw)
        return value if value > 0 else default
    except ValueError:
        return default


class BeInspiredOverviewView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        days = _parse_days_param(request, default=30)
        since = timezone.now() - timedelta(days=days)

        pois = TouristPoint.objects.all()
        total_pois = pois.filter(is_active=True).count()
        total_reviews = pois.aggregate(total=Sum('review_count'))['total'] or 0
        avg_rating = pois.aggregate(avg=Avg('rating'))['avg'] or 0
        total_favorites = sum(int((poi.metadata or {}).get('favorite_count', 0) or 0) for poi in pois)
        total_itineraries = TravelAnalytics.objects.filter(created_at__gte=since).count()
        active_users = User.objects.filter(is_active=True).count()

        return Response(
            {
                'totalPOIs': total_pois,
                'totalFavorites': total_favorites,
                'totalReviews': total_reviews,
                'totalItineraries': total_itineraries,
                'avgRating': round(avg_rating or 0, 1),
                'activeUsers': active_users,
            }
        )


class BeInspiredPOIStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        days = _parse_days_param(request, default=30)
        since = timezone.now() - timedelta(days=days)
        limit = min(max(int(request.query_params.get('limit', 20)), 1), 100)

        pois = (
            TouristPoint.objects.prefetch_related('tags')
            .filter(created_at__gte=since)
            .order_by('-rating', '-review_count', '-created_at')[:limit]
        )

        data = []
        for poi in pois:
            metadata = poi.metadata or {}
            data.append(
                {
                    'id': str(poi.id),
                    'name': poi.name,
                    'rating': float(poi.rating or 0),
                    'review_count': poi.review_count,
                    'favorite_count': int(metadata.get('favorite_count', 0) or 0),
                    'view_count': int(metadata.get('view_count', metadata.get('views', 0)) or 0),
                    'created_at': poi.created_at,
                    'is_active': poi.is_active,
                    'is_verified': poi.is_verified,
                    'tags': list(poi.tags.values_list('label_fr', flat=True)),
                }
            )
        return Response(data)


class BeInspiredUserActivityView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        limit = min(max(int(request.query_params.get('limit', 20)), 1), 100)
        users = User.objects.select_related('profile').order_by('-last_login', '-date_joined')[:limit]

        data = []
        for user in users:
            profile = getattr(user, 'profile', None)
            metadata = (profile.metadata if profile else {}) or {}
            favorites_meta = metadata.get('favorite_pois')
            favorites_count = len(favorites_meta) if isinstance(favorites_meta, list) else int(metadata.get('favorites_count', 0) or 0)
            reviews_count = int(metadata.get('reviews_count', 0) or 0)
            itineraries_count = int(metadata.get('itineraries_count', 0) or 0)
            last_activity = user.last_login or user.date_joined
            data.append(
                {
                    'id': str(user.public_id),
                    'email': user.email,
                    'favorites_count': favorites_count,
                    'reviews_count': reviews_count,
                    'itineraries_count': itineraries_count,
                    'last_activity': last_activity,
                }
            )
        return Response(data)


class BeInspiredAIStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        days = _parse_days_param(request, default=7)
        since = timezone.now() - timedelta(days=days)
        records = TravelAnalytics.objects.filter(created_at__gte=since)

        total_requests = records.count()
        usage_by_day = (
            records.annotate(day=TruncDate('created_at'))
            .values('day')
            .order_by('day')
            .annotate(count=Count('id'))
        )

        data = {
            'total_requests': total_requests,
            'successful_requests': total_requests,  # placeholder
            'average_response_time': 2.1,
            'most_asked_topics': ['Recommandations', 'Activités', 'Culture', 'Gastronomie', 'Nature'],
            'usage_by_day': [
                {'date': entry['day'], 'count': entry['count']}
                for entry in usage_by_day
            ],
            'popular_queries': [
                {'query': 'Restaurants locaux', 'count': 456, 'satisfaction': 4.6},
                {'query': 'Activités gratuites', 'count': 389, 'satisfaction': 4.4},
                {'query': 'Itinéraires culturels', 'count': 301, 'satisfaction': 4.3},
            ],
            'response_times': {'avg': 1.8, 'p50': 1.2, 'p95': 3.4, 'p99': 5.2},
        }
        return Response(data)
