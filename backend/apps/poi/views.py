from __future__ import annotations

import copy
import uuid

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ActivityAvoidance,
    ActivityCategory,
    ActivityIntensityLevel,
    ActivityInterest,
    BudgetLevel,
    BudgetCurrency,
    BudgetFlexibilityOption,
    City,
    Country,
    CulinaryAdventureLevel,
    DietaryRestriction,
    CuisineType,
    DifficultyLevel,
    POIConversation,
    POIConversationMessage,
    POIMedia,
    RestaurantCategory,
    Tag,
    TouristPoint,
    TravelGroupType,
    TravelGroupSubtype,
    TravelGroupConfiguration,
    AccommodationType,
    AccommodationAmenity,
    AccommodationLocation,
    AccommodationAccessibilityFeature,
    AccommodationSecurityFeature,
    AccommodationAmbiance,
    FavoriteTouristPoint,
    TouristPointReview,
)
from .serializers import (
    ActivityAvoidanceSerializer,
    ActivityCategorySerializer,
    ActivityIntensityLevelSerializer,
    ActivityInterestSerializer,
    BudgetLevelSerializer,
    BudgetCurrencySerializer,
    BudgetFlexibilityOptionSerializer,
    CitySerializer,
    CountrySerializer,
    CulinaryAdventureLevelSerializer,
    DietaryRestrictionSerializer,
    CuisineTypeSerializer,
    DifficultyLevelSerializer,
    POIConversationMessageSerializer,
    POIConversationSerializer,
    POIMediaSerializer,
    RestaurantCategorySerializer,
    TagSerializer,
    TouristPointSerializer,
    TravelGroupTypeSerializer,
    TravelGroupSubtypeSerializer,
    TravelGroupConfigurationSerializer,
    LocationResolveSerializer,
    AccommodationTypeSerializer,
    AccommodationAmenitySerializer,
    AccommodationLocationSerializer,
    AccommodationAccessibilitySerializer,
    AccommodationSecuritySerializer,
    AccommodationAmbianceSerializer,
    FavoriteTouristPointSerializer,
    TouristPointReviewSerializer,
    ActivityEquipmentSerializer,
    ActivityRequirementSerializer,
    ActivityTimeSlotSerializer,
    ActivityPricingSerializer,
    ActivityBookingSerializer,
    AccommodationRoomSerializer,
    AccommodationBookingSerializer,
    AccommodationAvailabilitySerializer,
    AccommodationRatePlanSerializer,
    AccommodationRateSeasonSerializer,
    AccommodationLegacyRateSerializer,
    RestaurantMenuSerializer,
    RestaurantDishSerializer,
    RestaurantReservationSerializer,
    RestaurantOperatingHoursSerializer,
    RestaurantTableSerializer,
)


class BaseReadOnlyViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'head', 'options']


class TagViewSet(BaseReadOnlyViewSet):
    queryset = Tag.objects.all().order_by('label_fr')
    serializer_class = TagSerializer
    filterset_fields = ['code']
    search_fields = ['label_fr', 'label_en', 'code']


class AdminManageableViewSet(viewsets.ModelViewSet):
    """
    Allows read access to authenticated users but restricts mutations to admins.
    """

    def get_permissions(self):  # type: ignore[override]
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class BudgetLevelViewSet(AdminManageableViewSet):
    queryset = BudgetLevel.objects.all().order_by('display_order', 'min_daily_amount')
    serializer_class = BudgetLevelSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class BudgetCurrencyViewSet(AdminManageableViewSet):
    queryset = BudgetCurrency.objects.all().order_by('display_order', 'code')
    serializer_class = BudgetCurrencySerializer
    search_fields = ['code', 'name_fr', 'name_en']


class BudgetFlexibilityOptionViewSet(AdminManageableViewSet):
    queryset = BudgetFlexibilityOption.objects.all().order_by('display_order', 'code')
    serializer_class = BudgetFlexibilityOptionSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class CountryViewSet(AdminManageableViewSet):
    queryset = Country.objects.all().order_by('name')
    serializer_class = CountrySerializer
    search_fields = ['name', 'code']


class CityViewSet(AdminManageableViewSet):
    queryset = City.objects.select_related('country').all().order_by('name')
    serializer_class = CitySerializer
    search_fields = ['name', 'country__name', 'country__code']
    filterset_fields = {
        'country': ['exact'],
        'is_active': ['exact'],
    }


class AccommodationTypeViewSet(AdminManageableViewSet):
    queryset = AccommodationType.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationTypeSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class AccommodationAmenityViewSet(AdminManageableViewSet):
    queryset = AccommodationAmenity.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationAmenitySerializer
    search_fields = ['code', 'label_fr', 'label_en', 'category']
    filterset_fields = {'category': ['exact', 'icontains']}


class AccommodationLocationViewSet(AdminManageableViewSet):
    queryset = AccommodationLocation.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationLocationSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class AccommodationAccessibilityViewSet(AdminManageableViewSet):
    queryset = AccommodationAccessibilityFeature.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationAccessibilitySerializer
    search_fields = ['code', 'label_fr', 'label_en']


class AccommodationSecurityViewSet(AdminManageableViewSet):
    queryset = AccommodationSecurityFeature.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationSecuritySerializer
    search_fields = ['code', 'label_fr', 'label_en']


class AccommodationAmbianceViewSet(AdminManageableViewSet):
    queryset = AccommodationAmbiance.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationAmbianceSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class LocationResolveView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LocationResolveSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        country = self._get_or_create_country(data['country_name'])
        city = self._get_or_create_city(
            country,
            data['city_name'],
            data.get('latitude'),
            data.get('longitude'),
        )
        return Response(
            {
                'country_id': str(country.id),
                'city_id': str(city.id),
                'country_name': country.name,
                'city_name': city.name,
            }
        )

    def _get_or_create_country(self, name: str) -> Country:
        country = Country.objects.filter(name__iexact=name.strip()).first()
        if country:
            return country

        code_base = slugify(name)[:3].upper() or 'CTR'
        code = code_base
        counter = 1
        while Country.objects.filter(code=code).exists():
            suffix = f"{counter}"
            max_base_length = max(1, 8 - len(suffix))
            code = f"{code_base[:max_base_length]}{suffix}".upper()
            counter += 1
            if counter > 999:
                code = uuid.uuid4().hex[:8].upper()
                break

        return Country.objects.create(name=name.strip(), code=code)

    def _get_or_create_city(self, country: Country, name: str, latitude, longitude) -> City:
        city = City.objects.filter(country=country, name__iexact=name.strip()).first()
        if city:
            return city

        return City.objects.create(
            country=country,
            name=name.strip(),
            latitude=latitude,
            longitude=longitude,
        )


class ActivityCategoryViewSet(AdminManageableViewSet):
    queryset = ActivityCategory.objects.all().order_by('display_order', 'label_fr')
    serializer_class = ActivityCategorySerializer
    search_fields = ['code', 'label_fr', 'label_en']


class ActivityIntensityLevelViewSet(AdminManageableViewSet):
    queryset = ActivityIntensityLevel.objects.all().order_by('display_order', 'level_value')
    serializer_class = ActivityIntensityLevelSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class ActivityInterestViewSet(AdminManageableViewSet):
    queryset = ActivityInterest.objects.select_related('category').all().order_by('display_order', 'label_fr')
    serializer_class = ActivityInterestSerializer
    search_fields = ['code', 'label_fr', 'label_en', 'category__label_fr']
    filterset_fields = {
        'category': ['exact', 'isnull'],
        'is_active': ['exact'],
    }


class ActivityAvoidanceViewSet(AdminManageableViewSet):
    queryset = ActivityAvoidance.objects.select_related('category').all().order_by('display_order', 'label_fr')
    serializer_class = ActivityAvoidanceSerializer
    search_fields = ['code', 'label_fr', 'label_en', 'category__label_fr']
    filterset_fields = {
        'category': ['exact', 'isnull'],
        'is_active': ['exact'],
    }


class DietaryRestrictionViewSet(AdminManageableViewSet):
    queryset = DietaryRestriction.objects.all().order_by('display_order', 'label_fr')
    serializer_class = DietaryRestrictionSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class CuisineTypeViewSet(AdminManageableViewSet):
    queryset = CuisineType.objects.all().order_by('display_order', 'label_fr')
    serializer_class = CuisineTypeSerializer
    search_fields = ['code', 'label_fr', 'label_en', 'region']


class CulinaryAdventureLevelViewSet(AdminManageableViewSet):
    queryset = CulinaryAdventureLevel.objects.all().order_by('display_order', 'level_value')
    serializer_class = CulinaryAdventureLevelSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class RestaurantCategoryViewSet(AdminManageableViewSet):
    queryset = RestaurantCategory.objects.all().order_by('display_order', 'label_fr')
    serializer_class = RestaurantCategorySerializer
    search_fields = ['code', 'label_fr', 'label_en']


class TravelGroupTypeViewSet(AdminManageableViewSet):
    queryset = TravelGroupType.objects.all().order_by('display_order', 'label_fr')
    serializer_class = TravelGroupTypeSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class TravelGroupSubtypeViewSet(AdminManageableViewSet):
    queryset = TravelGroupSubtype.objects.select_related('travel_group_type').all().order_by('display_order', 'label_fr')
    serializer_class = TravelGroupSubtypeSerializer
    filterset_fields = {'travel_group_type': ['exact'], 'is_active': ['exact']}
    search_fields = ['code', 'label_fr', 'label_en', 'travel_group_type__label_fr']


class TravelGroupConfigurationViewSet(AdminManageableViewSet):
    queryset = TravelGroupConfiguration.objects.select_related('travel_group_type').all()
    serializer_class = TravelGroupConfigurationSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']


class DifficultyLevelViewSet(BaseReadOnlyViewSet):
    queryset = DifficultyLevel.objects.all().order_by('level_value')
    serializer_class = DifficultyLevelSerializer
    search_fields = ['code', 'label_fr', 'label_en']


class TouristPointViewSet(viewsets.ModelViewSet):
    queryset = TouristPoint.objects.select_related('budget_level', 'difficulty_level').prefetch_related('tags', 'media')
    serializer_class = TouristPointSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = {
        'is_active': ['exact'],
        'is_verified': ['exact'],
        'backend': ['exact'],
        'status': ['exact'],
        'is_restaurant': ['exact'],
        'is_accommodation': ['exact'],
        'is_activity': ['exact'],
        'budget_level__code': ['exact'],
        'price_range': ['exact'],
    }
    search_fields = ['name', 'description', 'address', 'tags__label_fr']
    ordering_fields = ['name', 'rating', 'created_at']

    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        user = self.request.user

        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            owner_filter = self.request.query_params.get('owner')
            if owner_filter in {'me', 'self'} and user.is_authenticated:
                return qs.filter(owner=user)
            if owner_filter and user.is_staff:
                if owner_filter.isdigit():
                    return qs.filter(owner_id=int(owner_filter))
                return qs.filter(owner__public_id=owner_filter)
            if user.is_staff or user.role in {'admin', 'editor'}:
                return qs
            return qs.filter(is_active=True)

        if user.is_staff or user.role in {'admin', 'editor'}:
            return qs
        return qs.filter(owner=user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def moderate(self, request, pk=None):
        point = self.get_object()
        status_value = request.data.get('status')
        if status_value not in dict(TouristPoint.Status.choices):
            return Response({'detail': 'Statut invalide'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        admin_message = request.data.get('admin_message')

        point.status = status_value
        if status_value == TouristPoint.Status.APPROVED:
            point.is_active = True
            point.is_verified = True
            point.rejection_reason = ''
            point.blocked_reason = ''
        elif status_value == TouristPoint.Status.REJECTED:
            point.is_active = False
            point.is_verified = False
            point.rejection_reason = reason
            point.blocked_reason = ''
        elif status_value == TouristPoint.Status.BLOCKED:
            point.is_active = False
            point.is_verified = False
            point.blocked_reason = reason
            point.rejection_reason = ''
        else:
            point.rejection_reason = ''
            point.blocked_reason = ''

        metadata = point.metadata or {}
        if admin_message:
            metadata['admin_message'] = admin_message
        elif 'admin_message' in metadata:
            del metadata['admin_message']
        point.metadata = metadata
        point.save(update_fields=[
            'status',
            'is_active',
            'is_verified',
            'rejection_reason',
            'blocked_reason',
            'metadata',
            'updated_at',
        ])
        return Response(self.get_serializer(point).data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def analytics(self, request, pk=None):
        """Get analytics for a specific POI"""
        point = self.get_object()

        # Check permissions - only owner or admin can view analytics
        if point.owner != request.user and not request.user.is_staff:
            raise permissions.PermissionDenied('Accès refusé.')

        metadata = point.metadata or {}
        views_count = int(metadata.get('view_count', metadata.get('views', 0)) or 0)
        favorite_count = int(metadata.get('favorite_count', 0) or 0)

        return Response({
            'poi_id': str(point.id),
            'views': views_count,
            'favorites': favorite_count,
            'reviews': point.review_count,
            'rating': float(point.rating or 0),
        })


class ActivityMetadataMixin:
    SECTION_CONFIG = {
        'equipment': {'metadata_key': 'equipment', 'serializer': ActivityEquipmentSerializer},
        'requirements': {'metadata_key': 'requirements', 'serializer': ActivityRequirementSerializer},
        'time-slots': {'metadata_key': 'time_slots', 'serializer': ActivityTimeSlotSerializer},
        'pricing': {'metadata_key': 'pricing', 'serializer': ActivityPricingSerializer},
        'bookings': {'metadata_key': 'bookings', 'serializer': ActivityBookingSerializer},
    }

    def normalize_section(self, raw_section: str) -> tuple[str, dict]:
        normalized = raw_section.replace('_', '-').lower()
        if normalized not in self.SECTION_CONFIG:
            raise NotFound('Section d’activité inconnue.')
        return normalized, self.SECTION_CONFIG[normalized]

    def get_tourist_point(self, pk):
        point = get_object_or_404(TouristPoint, pk=pk)
        user = self.request.user
        if user.is_staff or point.owner_id == user.id:
            return point
        raise permissions.PermissionDenied('Accès refusé.')

    def get_section_items(self, point, metadata_key: str):
        metadata = point.metadata or {}
        activity = metadata.get('activity') or {}
        return copy.deepcopy(activity.get(metadata_key, []))

    def save_section_items(self, point, metadata_key: str, items):
        metadata = point.metadata or {}
        activity = metadata.get('activity') or {}
        activity[metadata_key] = items
        metadata['activity'] = activity
        point.metadata = metadata
        point.save(update_fields=['metadata', 'updated_at'])


class ActivityMetadataCollectionView(ActivityMetadataMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, section):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        items = self.get_section_items(point, config['metadata_key'])
        serializer = config['serializer'](items, many=True)
        return Response(serializer.data)

    def post(self, request, pk, section):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        serializer_class = config['serializer']
        serializer = serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = dict(serializer.validated_data)
        entry.setdefault('id', str(uuid.uuid4()))
        timestamp = timezone.now().isoformat()
        entry.setdefault('created_at', timestamp)
        entry['updated_at'] = timestamp
        items = self.get_section_items(point, config['metadata_key'])
        items.append(entry)
        self.save_section_items(point, config['metadata_key'], items)
        return Response(serializer_class(entry).data, status=status.HTTP_201_CREATED)


class ActivityMetadataDetailView(ActivityMetadataMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk, section, item_id):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        serializer_class = config['serializer']
        serializer = serializer_class(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updates = dict(serializer.validated_data)
        items = self.get_section_items(point, config['metadata_key'])
        str_id = str(item_id)
        for idx, item in enumerate(items):
            if str(item.get('id')) == str_id:
                updated = {**item, **updates}
                updated['id'] = item.get('id', str_id)
                updated['updated_at'] = timezone.now().isoformat()
                if 'tourist_point_id' in item or 'tourist_point_id' in updates:
                    updated['tourist_point_id'] = str(point.id)
                items[idx] = updated
                self.save_section_items(point, config['metadata_key'], items)
                return Response(serializer_class(updated).data)
        raise NotFound('Élément introuvable.')

    def delete(self, request, pk, section, item_id):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        items = self.get_section_items(point, config['metadata_key'])
        str_id = str(item_id)
        new_items = [item for item in items if str(item.get('id')) != str_id]
        if len(new_items) == len(items):
            raise NotFound('Élément introuvable.')
        self.save_section_items(point, config['metadata_key'], new_items)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AccommodationMetadataMixin:
    SECTION_CONFIG = {
        'rooms': {'metadata_key': 'rooms', 'serializer': AccommodationRoomSerializer},
        'bookings': {'metadata_key': 'bookings', 'serializer': AccommodationBookingSerializer},
        'availability': {'metadata_key': 'availability', 'serializer': AccommodationAvailabilitySerializer},
        'rate-plans': {'metadata_key': 'rate_plans', 'serializer': AccommodationRatePlanSerializer},
        'rate-seasons': {'metadata_key': 'rate_seasons', 'serializer': AccommodationRateSeasonSerializer},
        'legacy-rates': {'metadata_key': 'legacy_rates', 'serializer': AccommodationLegacyRateSerializer},
    }

    def normalize_section(self, raw_section: str) -> tuple[str, dict]:
        normalized = raw_section.replace('_', '-').lower()
        if normalized not in self.SECTION_CONFIG:
            raise NotFound('Section hébergement inconnue.')
        return normalized, self.SECTION_CONFIG[normalized]

    def get_tourist_point(self, pk):
        point = get_object_or_404(TouristPoint, pk=pk)
        user = self.request.user
        if user.is_staff or point.owner_id == user.id:
            return point
        raise permissions.PermissionDenied('Accès refusé.')

    def get_section_items(self, point, metadata_key: str):
        metadata = point.metadata or {}
        accommodation = metadata.get('accommodation') or {}
        return copy.deepcopy(accommodation.get(metadata_key, []))

    def save_section_items(self, point, metadata_key: str, items):
        metadata = point.metadata or {}
        accommodation = metadata.get('accommodation') or {}
        accommodation[metadata_key] = items
        metadata['accommodation'] = accommodation
        point.metadata = metadata
        point.save(update_fields=['metadata', 'updated_at'])

    def apply_filters(self, section: str, items: list[dict]):
        params = self.request.query_params
        room_id = params.get('room_id')
        if room_id:
            items = [item for item in items if str(item.get('room_id')) == room_id]

        if section == 'bookings':
            status_filter = params.get('status')
            if status_filter:
                items = [item for item in items if item.get('booking_status') == status_filter]

        if section == 'availability':
            date_filter = params.get('date')
            if date_filter:
                items = [item for item in items if item.get('date') == date_filter]
            start_date = params.get('start_date')
            end_date = params.get('end_date')
            if start_date:
                items = [item for item in items if item.get('date') and item['date'] >= start_date]
            if end_date:
                items = [item for item in items if item.get('date') and item['date'] <= end_date]

        if section == 'rate-seasons':
            rate_plan_id = params.get('rate_plan_id')
            if rate_plan_id:
                items = [item for item in items if str(item.get('rate_plan_id')) == rate_plan_id]

        return items


class AccommodationMetadataCollectionView(AccommodationMetadataMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, section):
        section, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        items = self.get_section_items(point, config['metadata_key'])
        items = self.apply_filters(section, items)
        serializer = config['serializer'](items, many=True)
        return Response(serializer.data)

    def post(self, request, pk, section):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        serializer_class = config['serializer']
        serializer = serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = dict(serializer.validated_data)
        entry.setdefault('id', str(uuid.uuid4()))
        timestamp = timezone.now().isoformat()
        entry.setdefault('created_at', timestamp)
        entry['updated_at'] = timestamp
        entry['tourist_point_id'] = str(point.id)
        items = self.get_section_items(point, config['metadata_key'])
        items.append(entry)
        self.save_section_items(point, config['metadata_key'], items)
        return Response(serializer_class(entry).data, status=status.HTTP_201_CREATED)


class AccommodationMetadataDetailView(AccommodationMetadataMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk, section, item_id):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        serializer_class = config['serializer']
        serializer = serializer_class(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updates = dict(serializer.validated_data)
        items = self.get_section_items(point, config['metadata_key'])
        str_id = str(item_id)
        for idx, item in enumerate(items):
            if str(item.get('id')) == str_id:
                updated = {**item, **updates}
                updated['id'] = item.get('id', str_id)
                updated['updated_at'] = timezone.now().isoformat()
                if 'tourist_point_id' in item or 'tourist_point_id' in updates:
                    updated['tourist_point_id'] = str(point.id)
                items[idx] = updated
                self.save_section_items(point, config['metadata_key'], items)
                return Response(serializer_class(updated).data)
        raise NotFound('Élément introuvable.')

    def delete(self, request, pk, section, item_id):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        items = self.get_section_items(point, config['metadata_key'])
        str_id = str(item_id)
        new_items = [item for item in items if str(item.get('id')) != str_id]
        if len(new_items) == len(items):
            raise NotFound('Élément introuvable.')
        self.save_section_items(point, config['metadata_key'], new_items)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RestaurantMetadataMixin:
    SECTION_CONFIG = {
        'menus': {'metadata_key': 'menus', 'serializer': RestaurantMenuSerializer},
        'dishes': {'metadata_key': 'dishes', 'serializer': RestaurantDishSerializer},
        'reservations': {'metadata_key': 'reservations', 'serializer': RestaurantReservationSerializer},
        'operating-hours': {'metadata_key': 'operating_hours', 'serializer': RestaurantOperatingHoursSerializer},
        'tables': {'metadata_key': 'tables', 'serializer': RestaurantTableSerializer},
    }

    def normalize_section(self, raw_section: str) -> tuple[str, dict]:
        normalized = raw_section.replace('_', '-').lower()
        if normalized not in self.SECTION_CONFIG:
            raise NotFound('Section restaurant inconnue.')
        return normalized, self.SECTION_CONFIG[normalized]

    def get_tourist_point(self, pk):
        point = get_object_or_404(TouristPoint, pk=pk)
        user = self.request.user
        if user.is_staff or point.owner_id == user.id:
            return point
        raise permissions.PermissionDenied('Accès refusé.')

    def get_section_items(self, point, metadata_key: str):
        metadata = point.metadata or {}
        restaurant = metadata.get('restaurant') or {}
        return copy.deepcopy(restaurant.get(metadata_key, []))

    def save_section_items(self, point, metadata_key: str, items):
        metadata = point.metadata or {}
        restaurant = metadata.get('restaurant') or {}
        restaurant[metadata_key] = items
        metadata['restaurant'] = restaurant
        point.metadata = metadata
        point.save(update_fields=['metadata', 'updated_at'])

    def apply_filters(self, section: str, items: list[dict]):
        params = self.request.query_params
        restaurant_id = str(self.kwargs.get('pk'))

        if section in {'menus', 'dishes', 'reservations', 'operating-hours', 'tables'}:
            for item in items:
                item.setdefault('restaurant_id', restaurant_id)

        if section == 'dishes':
            menu_id = params.get('menu_id')
            if menu_id:
                items = [item for item in items if str(item.get('menu_id')) == menu_id]

        if section == 'reservations':
            date_filter = params.get('reservation_date')
            if date_filter:
                items = [item for item in items if item.get('reservation_date') == date_filter]
            status_filter = params.get('status')
            if status_filter:
                items = [item for item in items if item.get('status') == status_filter]

        if section == 'tables':
            availability = params.get('is_available')
            if availability is not None:
                bool_value = availability.lower() in {'1', 'true', 'yes'}
                items = [item for item in items if bool(item.get('is_available', True)) == bool_value]

        return items


class RestaurantMetadataCollectionView(RestaurantMetadataMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, section):
        section, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        items = self.get_section_items(point, config['metadata_key'])
        items = self.apply_filters(section, items)
        serializer = config['serializer'](items, many=True)
        return Response(serializer.data)

    def post(self, request, pk, section):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        serializer_class = config['serializer']
        serializer = serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = dict(serializer.validated_data)
        entry.setdefault('id', str(uuid.uuid4()))
        timestamp = timezone.now().isoformat()
        entry.setdefault('created_at', timestamp)
        entry['updated_at'] = timestamp
        entry.setdefault('restaurant_id', str(point.id))
        items = self.get_section_items(point, config['metadata_key'])
        items.append(entry)
        self.save_section_items(point, config['metadata_key'], items)
        return Response(serializer_class(entry).data, status=status.HTTP_201_CREATED)


class RestaurantMetadataDetailView(RestaurantMetadataMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk, section, item_id):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        serializer_class = config['serializer']
        serializer = serializer_class(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updates = dict(serializer.validated_data)
        items = self.get_section_items(point, config['metadata_key'])
        str_id = str(item_id)
        for idx, item in enumerate(items):
            if str(item.get('id')) == str_id:
                updated = {**item, **updates}
                updated['id'] = item.get('id', str_id)
                updated['updated_at'] = timezone.now().isoformat()
                updated['restaurant_id'] = str(point.id)
                items[idx] = updated
                self.save_section_items(point, config['metadata_key'], items)
                return Response(serializer_class(updated).data)
        raise NotFound('Élément introuvable.')

    def delete(self, request, pk, section, item_id):
        _, config = self.normalize_section(section)
        point = self.get_tourist_point(pk)
        items = self.get_section_items(point, config['metadata_key'])
        str_id = str(item_id)
        new_items = [item for item in items if str(item.get('id')) != str_id]
        if len(new_items) == len(items):
            raise NotFound('Élément introuvable.')
        self.save_section_items(point, config['metadata_key'], new_items)
        return Response(status=status.HTTP_204_NO_CONTENT)


class POIConversationViewSet(viewsets.ModelViewSet):
    serializer_class = POIConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = POIConversation.objects.select_related('tourist_point', 'tourist_point__owner')

    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(tourist_point__owner=user)

    def perform_create(self, serializer):  # type: ignore[override]
        if not self.request.user.is_staff:
            raise permissions.PermissionDenied('Seul un administrateur peut créer des conversations.')
        serializer.save()

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        if request.method == 'GET':
            messages = conversation.messages.select_related('sender').order_by('created_at')
            serializer = POIConversationMessageSerializer(messages, many=True)
            return Response(serializer.data)

        content = request.data.get('content')
        if not content:
            return Response({'detail': 'content requis'}, status=status.HTTP_400_BAD_REQUEST)
        message_type = request.data.get('message_type', 'comment')
        if message_type not in dict(POIConversationMessage.MESSAGE_TYPES):
            return Response({'detail': 'message_type invalide'}, status=status.HTTP_400_BAD_REQUEST)

        sender = request.user
        sender_type = 'admin' if sender.is_staff else 'partner'
        message = POIConversationMessage.objects.create(
            conversation=conversation,
            sender=sender,
            sender_type=sender_type,
            message_type=message_type,
            content=content,
        )
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=['last_message_at'])
        serializer = POIConversationMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FavoriteTouristPointViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteTouristPointSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):  # type: ignore[override]
        return (
            FavoriteTouristPoint.objects.filter(user=self.request.user)
            .select_related('tourist_point', 'tourist_point__budget_level')
            .prefetch_related('tourist_point__tags')
        )

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(user=self.request.user)

    def get_object(self):  # type: ignore[override]
        obj = super().get_object()
        if obj.user != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('Accès refusé.')
        return obj


class TouristPointReviewViewSet(viewsets.ModelViewSet):
    serializer_class = TouristPointReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    filterset_fields = ['tourist_point']
    ordering_fields = ['created_at', 'rating']

    def get_queryset(self):  # type: ignore[override]
        qs = TouristPointReview.objects.select_related('reviewer', 'tourist_point').all()
        tourist_point_id = self.request.query_params.get('tourist_point_id')
        if tourist_point_id:
            qs = qs.filter(tourist_point_id=tourist_point_id)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(reviewer=self.request.user)

    def get_object(self):  # type: ignore[override]
        obj = super().get_object()
        if obj.reviewer != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('Vous ne pouvez modifier que vos propres avis.')
        return obj

    def perform_update(self, serializer):  # type: ignore[override]
        obj = self.get_object()
        if obj.reviewer != self.request.user:
            raise permissions.PermissionDenied('Vous ne pouvez modifier que vos propres avis.')
        serializer.save()

    def perform_destroy(self, instance):  # type: ignore[override]
        if instance.reviewer != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('Vous ne pouvez supprimer que vos propres avis.')
        instance.delete()


class POIMediaViewSet(viewsets.ModelViewSet):
    """ViewSet for POIMedia model"""
    queryset = POIMedia.objects.all()
    serializer_class = POIMediaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter media based on query params"""
        queryset = super().get_queryset()
        tourist_point_id = self.request.query_params.get('tourist_point')
        if tourist_point_id:
            queryset = queryset.filter(tourist_point_id=tourist_point_id)
        return queryset

    def perform_create(self, serializer):  # type: ignore[override]
        """Create POIMedia and ensure user owns the tourist point"""
        tourist_point = serializer.validated_data.get('tourist_point')
        if tourist_point.owner != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('Vous ne pouvez ajouter des médias qu\'à vos propres points d\'intérêt.')
        serializer.save()
