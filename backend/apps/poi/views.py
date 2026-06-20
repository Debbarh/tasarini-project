from __future__ import annotations

import csv
import copy
import io
import uuid

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.parsers import MultiPartParser
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
    POIClaim,
    POISuggestion,
    POIReport,
    POITranslationQueue,
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
    POIClaimSerializer,
    POISuggestionSerializer,
    POIReportSerializer,
    SUGGESTABLE_FIELDS,
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
    Allows read access to all users (including unauthenticated) but restricts mutations to admins.
    """

    def get_permissions(self):  # type: ignore[override]
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class BudgetLevelViewSet(AdminManageableViewSet):
    queryset = BudgetLevel.objects.all().order_by('display_order', 'min_daily_amount')
    serializer_class = BudgetLevelSerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for a budget level via translategemma:4b"""
        from .admin import fill_missing_field_translations

        budget_level = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                budget_level,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                budget_level,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(budget_level)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'budget_level': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BudgetCurrencyViewSet(AdminManageableViewSet):
    queryset = BudgetCurrency.objects.all().order_by('display_order', 'code')
    serializer_class = BudgetCurrencySerializer
    search_fields = ['code', 'name_fr', 'name_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing name fields for a budget currency using LibreTranslate"""
        from .admin import fill_missing_field_translations

        budget_currency = self.get_object()

        try:
            count, languages = fill_missing_field_translations(
                budget_currency,
                field_prefix='name',
                base_field='name_fr',
                is_location=False
            )

            serializer = self.get_serializer(budget_currency)

            return Response({
                'message': f'{count} traductions ajoutées',
                'languages': languages,
                'budget_currency': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BudgetFlexibilityOptionViewSet(AdminManageableViewSet):
    queryset = BudgetFlexibilityOption.objects.all().order_by('display_order', 'code')
    serializer_class = BudgetFlexibilityOptionSerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for a budget flexibility option via translategemma:4b"""
        from .admin import fill_missing_field_translations

        budget_flexibility = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                budget_flexibility,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                budget_flexibility,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(budget_flexibility)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'budget_flexibility_option': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CountryViewSet(AdminManageableViewSet):
    queryset = Country.objects.all().order_by('name')
    serializer_class = CountrySerializer
    search_fields = ['name', 'code']

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Export countries as CSV"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="countries.csv"'

        writer = csv.writer(response)
        writer.writerow(['name', 'code', 'is_active'])

        for country in self.get_queryset():
            writer.writerow([
                country.name,
                country.code,
                country.is_active,
            ])

        return response

    @action(detail=False, methods=['post'], url_path='import-csv', parser_classes=[MultiPartParser])
    def import_csv(self, request):
        """Import countries from CSV"""
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        csv_file = request.FILES['file']

        # Validate file type
        if not csv_file.name.endswith('.csv'):
            return Response(
                {'error': 'File must be a CSV'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            created_count = 0
            updated_count = 0
            errors = []

            for row_num, row in enumerate(reader, start=2):  # start=2 because row 1 is header
                try:
                    # Validate required fields
                    if not row.get('name') or not row.get('code'):
                        errors.append(f"Row {row_num}: 'name' and 'code' are required")
                        continue

                    # Convert is_active to boolean
                    is_active = row.get('is_active', 'true').lower() in ['true', '1', 'yes', 'oui']

                    # Update or create country
                    country, created = Country.objects.update_or_create(
                        code=row['code'].upper(),
                        defaults={
                            'name': row['name'],
                            'is_active': is_active,
                        }
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return Response({
                'message': 'Import completed',
                'created': created_count,
                'updated': updated_count,
                'errors': errors,
            })

        except Exception as e:
            return Response(
                {'error': f'Error processing CSV: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing fields for a country using LibreTranslate"""
        from .admin import fill_missing_translations

        country = self.get_object()

        try:
            count, languages = fill_missing_translations(country)

            # Serialize the updated country
            serializer = self.get_serializer(country)

            return Response({
                'message': f'{count} traductions ajoutées',
                'languages': languages,
                'country': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CityViewSet(AdminManageableViewSet):
    queryset = City.objects.select_related('country').all().order_by('name')
    serializer_class = CitySerializer
    search_fields = ['name', 'country__name', 'country__code']
    filterset_fields = {
        'country': ['exact'],
        'is_active': ['exact'],
    }

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Export cities as CSV"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="cities.csv"'

        writer = csv.writer(response)
        writer.writerow(['name', 'country_code', 'country_name', 'latitude', 'longitude', 'is_active'])

        for city in self.get_queryset():
            writer.writerow([
                city.name,
                city.country.code,
                city.country.name,
                city.latitude if city.latitude else '',
                city.longitude if city.longitude else '',
                city.is_active,
            ])

        return response

    @action(detail=False, methods=['post'], url_path='import-csv', parser_classes=[MultiPartParser])
    def import_csv(self, request):
        """Import cities from CSV"""
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        csv_file = request.FILES['file']

        # Validate file type
        if not csv_file.name.endswith('.csv'):
            return Response(
                {'error': 'File must be a CSV'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            created_count = 0
            updated_count = 0
            errors = []

            for row_num, row in enumerate(reader, start=2):  # start=2 because row 1 is header
                try:
                    # Validate required fields
                    if not row.get('name'):
                        errors.append(f"Row {row_num}: 'name' is required")
                        continue

                    if not row.get('country_code') and not row.get('country_name'):
                        errors.append(f"Row {row_num}: Either 'country_code' or 'country_name' is required")
                        continue

                    # Find country by code or name
                    country = None
                    if row.get('country_code'):
                        try:
                            country = Country.objects.get(code=row['country_code'].upper())
                        except Country.DoesNotExist:
                            errors.append(f"Row {row_num}: Country with code '{row['country_code']}' not found")
                            continue
                    elif row.get('country_name'):
                        try:
                            country = Country.objects.get(name=row['country_name'])
                        except Country.DoesNotExist:
                            errors.append(f"Row {row_num}: Country with name '{row['country_name']}' not found")
                            continue

                    # Convert is_active to boolean
                    is_active = row.get('is_active', 'true').lower() in ['true', '1', 'yes', 'oui']

                    # Parse coordinates
                    latitude = None
                    longitude = None
                    if row.get('latitude'):
                        try:
                            latitude = float(row['latitude'])
                        except ValueError:
                            errors.append(f"Row {row_num}: Invalid latitude value")
                            continue
                    if row.get('longitude'):
                        try:
                            longitude = float(row['longitude'])
                        except ValueError:
                            errors.append(f"Row {row_num}: Invalid longitude value")
                            continue

                    # Update or create city
                    city, created = City.objects.update_or_create(
                        name=row['name'],
                        country=country,
                        defaults={
                            'latitude': latitude,
                            'longitude': longitude,
                            'is_active': is_active,
                        }
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return Response({
                'message': 'Import completed',
                'created': created_count,
                'updated': updated_count,
                'errors': errors,
            })

        except Exception as e:
            return Response(
                {'error': f'Error processing CSV: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing fields for a city using LibreTranslate"""
        from .admin import fill_missing_translations

        city = self.get_object()

        try:
            count, languages = fill_missing_translations(city)

            # Serialize the updated city
            serializer = self.get_serializer(city)

            return Response({
                'message': f'{count} traductions ajoutées',
                'languages': languages,
                'city': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccommodationTypeViewSet(AdminManageableViewSet):
    queryset = AccommodationType.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationTypeSerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for an accommodation type via translategemma:4b"""
        from .admin import fill_missing_field_translations

        accommodation_type = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                accommodation_type,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                accommodation_type,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(accommodation_type)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'accommodation_type': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccommodationAmenityViewSet(AdminManageableViewSet):
    queryset = AccommodationAmenity.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationAmenitySerializer
    search_fields = ['code', 'label_fr', 'label_en', 'category']
    filterset_fields = {'category': ['exact', 'icontains']}

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for an accommodation amenity via translategemma:4b"""
        from .admin import fill_missing_field_translations

        accommodation_amenity = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                accommodation_amenity,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                accommodation_amenity,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(accommodation_amenity)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'accommodation_amenity': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccommodationLocationViewSet(AdminManageableViewSet):
    queryset = AccommodationLocation.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationLocationSerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for an accommodation location via translategemma:4b"""
        from .admin import fill_missing_field_translations

        accommodation_location = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                accommodation_location,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                accommodation_location,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(accommodation_location)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'accommodation_location': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccommodationAccessibilityViewSet(AdminManageableViewSet):
    queryset = AccommodationAccessibilityFeature.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationAccessibilitySerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for an accommodation accessibility feature via translategemma:4b"""
        from .admin import fill_missing_field_translations

        accommodation_accessibility = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                accommodation_accessibility,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                accommodation_accessibility,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(accommodation_accessibility)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'accommodation_accessibility': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccommodationSecurityViewSet(AdminManageableViewSet):
    queryset = AccommodationSecurityFeature.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationSecuritySerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for an accommodation security feature via translategemma:4b"""
        from .admin import fill_missing_field_translations

        accommodation_security = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                accommodation_security,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                accommodation_security,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(accommodation_security)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'accommodation_security': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccommodationAmbianceViewSet(AdminManageableViewSet):
    queryset = AccommodationAmbiance.objects.all().order_by('display_order', 'label_fr')
    serializer_class = AccommodationAmbianceSerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for an accommodation ambiance via translategemma:4b"""
        from .admin import fill_missing_field_translations

        accommodation_ambiance = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                accommodation_ambiance,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                accommodation_ambiance,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(accommodation_ambiance)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'accommodation_ambiance': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LocationResolveView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LocationResolveSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        country = self._get_or_create_country(
            data['country_name'],
            data.get('country_translations', {})
        )
        city = self._get_or_create_city(
            country,
            data['city_name'],
            data.get('latitude'),
            data.get('longitude'),
            data.get('city_translations', {})
        )
        return Response(
            {
                'country_id': str(country.id),
                'city_id': str(city.id),
                'country_name': country.name,
                'city_name': city.name,
            }
        )

    def _get_or_create_country(self, name: str, translations: dict = None) -> Country:
        country = Country.objects.filter(name__iexact=name.strip()).first()
        if country:
            # Mettre à jour les traductions si elles sont fournies et que les champs sont vides
            if translations:
                updated = False
                for key, value in translations.items():
                    if key.startswith('name_') and hasattr(country, key):
                        if not getattr(country, key) and value:
                            setattr(country, key, value.strip())
                            updated = True
                if updated:
                    country.save()
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

        # Créer le pays avec les traductions
        country_data = {
            'name': name.strip(),
            'code': code
        }
        if translations:
            for key, value in translations.items():
                if key.startswith('name_') and value:
                    country_data[key] = value.strip()

        return Country.objects.create(**country_data)

    def _get_or_create_city(self, country: Country, name: str, latitude, longitude, translations: dict = None) -> City:
        city = City.objects.filter(country=country, name__iexact=name.strip()).first()
        if city:
            # Mettre à jour les traductions et coordonnées si elles sont fournies et que les champs sont vides
            if translations or latitude or longitude:
                updated = False
                if translations:
                    for key, value in translations.items():
                        if key.startswith('name_') and hasattr(city, key):
                            if not getattr(city, key) and value:
                                setattr(city, key, value.strip())
                                updated = True
                if latitude and not city.latitude:
                    city.latitude = latitude
                    updated = True
                if longitude and not city.longitude:
                    city.longitude = longitude
                    updated = True
                if updated:
                    city.save()
            return city

        # Créer la ville avec les traductions
        city_data = {
            'country': country,
            'name': name.strip(),
            'latitude': latitude,
            'longitude': longitude,
        }
        if translations:
            for key, value in translations.items():
                if key.startswith('name_') and value:
                    city_data[key] = value.strip()

        return City.objects.create(**city_data)


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

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for a dietary restriction via translategemma:4b"""
        from .admin import fill_missing_field_translations

        dietary_restriction = self.get_object()

        try:
            count_labels, languages_labels = fill_missing_field_translations(
                dietary_restriction,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            count_descriptions, languages_descriptions = fill_missing_field_translations(
                dietary_restriction,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            serializer = self.get_serializer(dietary_restriction)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'dietary_restriction': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CuisineTypeViewSet(AdminManageableViewSet):
    queryset = CuisineType.objects.all().order_by('display_order', 'label_fr')
    serializer_class = CuisineTypeSerializer
    search_fields = ['code', 'label_fr', 'label_en', 'region']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for a cuisine type via translategemma:4b"""
        from .admin import fill_missing_field_translations

        cuisine_type = self.get_object()

        try:
            count_labels, languages_labels = fill_missing_field_translations(
                cuisine_type,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            count_descriptions, languages_descriptions = fill_missing_field_translations(
                cuisine_type,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            serializer = self.get_serializer(cuisine_type)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'cuisine_type': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CulinaryAdventureLevelViewSet(AdminManageableViewSet):
    queryset = CulinaryAdventureLevel.objects.all().order_by('display_order', 'level_value')
    serializer_class = CulinaryAdventureLevelSerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for a culinary adventure level via translategemma:4b"""
        from .admin import fill_missing_field_translations

        culinary_adventure_level = self.get_object()

        try:
            count_labels, languages_labels = fill_missing_field_translations(
                culinary_adventure_level,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            count_descriptions, languages_descriptions = fill_missing_field_translations(
                culinary_adventure_level,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            serializer = self.get_serializer(culinary_adventure_level)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'culinary_adventure_level': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RestaurantCategoryViewSet(AdminManageableViewSet):
    queryset = RestaurantCategory.objects.all().order_by('display_order', 'label_fr')
    serializer_class = RestaurantCategorySerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for a restaurant category via translategemma:4b"""
        from .admin import fill_missing_field_translations

        restaurant_category = self.get_object()

        try:
            count_labels, languages_labels = fill_missing_field_translations(
                restaurant_category,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            count_descriptions, languages_descriptions = fill_missing_field_translations(
                restaurant_category,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            serializer = self.get_serializer(restaurant_category)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'restaurant_category': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TravelGroupTypeViewSet(AdminManageableViewSet):
    queryset = TravelGroupType.objects.all().order_by('display_order', 'label_fr')
    serializer_class = TravelGroupTypeSerializer
    search_fields = ['code', 'label_fr', 'label_en']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for a travel group type via translategemma:4b"""
        from .admin import fill_missing_field_translations

        travel_group_type = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                travel_group_type,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                travel_group_type,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(travel_group_type)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'travel_group_type': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TravelGroupSubtypeViewSet(AdminManageableViewSet):
    queryset = TravelGroupSubtype.objects.select_related('travel_group_type').all().order_by('display_order', 'label_fr')
    serializer_class = TravelGroupSubtypeSerializer
    filterset_fields = {'travel_group_type': ['exact'], 'is_active': ['exact']}
    search_fields = ['code', 'label_fr', 'label_en', 'travel_group_type__label_fr']

    @action(detail=True, methods=['post'], url_path='translate')
    def translate(self, request, pk=None):
        """Translate missing label and description fields for a travel group subtype via translategemma:4b"""
        from .admin import fill_missing_field_translations

        travel_group_subtype = self.get_object()

        try:
            # Translate label fields
            count_labels, languages_labels = fill_missing_field_translations(
                travel_group_subtype,
                field_prefix='label',
                base_field='label_fr',
                is_location=False
            )

            # Translate description fields
            count_descriptions, languages_descriptions = fill_missing_field_translations(
                travel_group_subtype,
                field_prefix='description',
                base_field='description_fr',
                is_location=False
            )

            # Combine counts and languages
            total_count = count_labels + count_descriptions
            all_languages = list(set(languages_labels + languages_descriptions))

            # Serialize the updated object
            serializer = self.get_serializer(travel_group_subtype)

            return Response({
                'message': f'{total_count} traductions ajoutées',
                'languages': all_languages,
                'travel_group_subtype': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la traduction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TravelGroupConfigurationViewSet(AdminManageableViewSet):
    queryset = TravelGroupConfiguration.objects.select_related('travel_group_type').all()
    serializer_class = TravelGroupConfigurationSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']


class DifficultyLevelViewSet(BaseReadOnlyViewSet):
    queryset = DifficultyLevel.objects.all().order_by('level_value')
    serializer_class = DifficultyLevelSerializer
    search_fields = ['code', 'label_fr', 'label_en']


from rest_framework.pagination import PageNumberPagination


class TouristPointPagination(PageNumberPagination):
    """Permet de demander tous les POI d'un coup (carte Be Inspired) via ?page_size=.

    Be Inspired veut afficher TOUS les POI plateforme; on autorise un grand page_size
    (la page par défaut reste 20 pour les autres usages paginés).
    """
    page_size_query_param = 'page_size'
    max_page_size = 5000


def can_manage_poi(user, point) -> bool:
    """Peut gérer un POI = admin, propriétaire, ou partenaire l'ayant dans managed_pois."""
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or point.owner_id == user.id:
        return True
    from apps.partners.models import PartnerProfile  # lazy: évite l'import circulaire
    return PartnerProfile.objects.filter(owner=user, managed_pois=point).exists()


class TouristPointViewSet(viewsets.ModelViewSet):
    queryset = TouristPoint.objects.select_related('budget_level', 'difficulty_level', 'owner', 'owner__partner_profile').prefetch_related('tags', 'media')
    serializer_class = TouristPointSerializer
    pagination_class = TouristPointPagination
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
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

        # Filtre source (admin) : 'overture' = POI importés, 'platform' = soumis (non importés).
        source = self.request.query_params.get('source')
        if source == 'overture':
            qs = qs.filter(metadata__external_source='overture')
        elif source == 'platform':
            qs = qs.exclude(metadata__external_source='overture')

        # Filtre géographique « autour de » (carte Be Inspire) : near=lat,lon + radius_km.
        # Indispensable à grande échelle (3M+ POI) : sans ça, on renverrait les 1ers POI
        # par ordre alpha, jamais ceux de la zone. On filtre par bbox (index latitude/longitude).
        near = self.request.query_params.get('near')
        radius_km = self.request.query_params.get('radius_km')
        if near and radius_km:
            try:
                lat, lon = (float(x) for x in near.split(','))
                r = float(radius_km)
                import math
                dlat = r / 111.0
                dlon = r / (111.0 * max(0.01, math.cos(math.radians(lat))))
                qs = qs.filter(
                    latitude__range=(lat - dlat, lat + dlat),
                    longitude__range=(lon - dlon, lon + dlon),
                )
            except (ValueError, TypeError):
                pass

        # L'action publique 'translate' est un POST mais reste une LECTURE (cache traduction) :
        # elle ne doit pas passer par la restriction owner (qui casse pour un anonyme).
        if getattr(self, 'action', None) == 'translate':
            return qs.filter(is_active=True)

        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            owner_filter = self.request.query_params.get('owner')
            if owner_filter in {'me', 'self'} and user.is_authenticated:
                # POI possédés OU gérés en tant que partenaire (managed_pois).
                return qs.filter(Q(owner=user) | Q(partner_profiles__owner=user)).distinct()
            if owner_filter and user.is_staff:
                if owner_filter.isdigit():
                    return qs.filter(owner_id=int(owner_filter))
                return qs.filter(owner__public_id=owner_filter)
            if user.is_staff or (user.is_authenticated and user.role in {'admin', 'editor'}):
                return qs
            return qs.filter(is_active=True)

        if user.is_staff or (user.is_authenticated and user.role in {'admin', 'editor'}):
            return qs
        # Édition : propriétaire OU partenaire gestionnaire.
        return qs.filter(Q(owner=user) | Q(partner_profiles__owner=user)).distinct()

    def perform_create(self, serializer):  # type: ignore[override]
        # Le serializer fixe owner=request.user. Si l'auteur est un partenaire approuvé,
        # on rattache aussi le POI à managed_pois (source unique de la gestion partenaire).
        point = serializer.save()
        try:
            from apps.partners.models import PartnerProfile
            profile = PartnerProfile.objects.filter(owner=self.request.user, status='approved').first()
            if profile:
                profile.managed_pois.add(point)
        except Exception:  # noqa: BLE001 - rattachement best-effort
            pass

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny], url_path='fetch-photos')
    def fetch_photos(self, request, pk=None):
        """Be Inspired : si le POI n'a AUCUNE photo, en récupère jusqu'à 3 via Openverse et les
        PERSISTE dans metadata['images']. Idempotent (ne refait rien si des photos existent)."""
        point = get_object_or_404(TouristPoint, pk=pk, is_active=True)
        meta = point.metadata or {}
        existing = [u for u in (meta.get('images') or []) if u]
        media_urls = list(
            POIMedia.objects.filter(tourist_point=point).exclude(external_url='')
            .values_list('external_url', flat=True)
        )
        have = [u for u in (media_urls + existing) if u]
        if have:
            return Response({'images': have[:3], 'fetched': False})
        from .external.openverse import search_images
        city = str(meta.get('city') or '')
        imgs = search_images(f"{point.name} {city}".strip(), n=3)
        if imgs:
            meta['images'] = imgs
            point.metadata = meta
            point.save(update_fields=['metadata', 'updated_at'])
        return Response({'images': imgs, 'fetched': bool(imgs)})

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny], url_path='translate')
    def translate(self, request, pk=None):
        """Cache-or-enqueue : si la traduction est en cache (metadata.translations[lang]) on la
        renvoie ; sinon on met (POI, langue) dans la file `POITranslationQueue` (le cron worker
        translategemma:4b la traduira en arrière-plan) et on renvoie l'original tout de suite.
        Aucune traduction synchrone (Ollama est lent sur CPU)."""
        lang = (str(request.data.get('lang') or 'fr')).split('-')[0].lower()
        point = self.get_object()
        meta = point.metadata or {}
        cache = meta.get('translations') or {}
        if isinstance(cache.get(lang), dict):
            return Response({**cache[lang], 'translated': True})
        # Pas en cache : enfiler (idempotent) et renvoyer l'original.
        try:
            POITranslationQueue.objects.get_or_create(
                tourist_point=point, lang=lang,
                defaults={'status': POITranslationQueue.Status.PENDING},
            )
        except Exception:  # noqa: BLE001
            pass
        return Response({
            'name': point.name or '', 'description': point.description or '',
            'address': point.address or '', 'translated': False, 'queued': True,
        })

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
        if can_manage_poi(user, point):
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
        if can_manage_poi(user, point):
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
        if can_manage_poi(user, point):
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

    def get_permissions(self):  # type: ignore[override]
        # Lecture publique des avis ; écriture réservée aux connectés.
        if self.action in ('list', 'retrieve', 'featured'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):  # type: ignore[override]
        qs = TouristPointReview.objects.select_related('reviewer', 'tourist_point').all()
        tourist_point_id = self.request.query_params.get('tourist_point_id')
        if tourist_point_id:
            # Un id externe ("ext:source:id") n'est pas un UUID → aucun avis (pas d'erreur 500).
            try:
                uuid.UUID(str(tourist_point_id))
            except (ValueError, AttributeError, TypeError):
                return qs.none()
            qs = qs.filter(tourist_point_id=tourist_point_id)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(reviewer=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def featured(self, request):
        """Avis publics mis en avant pour la page d'accueil (témoignages).
        Renvoie les meilleurs avis réels (note >= 4, commentaire non vide).
        Aucune donnée personnelle sensible (pas d'email)."""
        qs = (
            TouristPointReview.objects
            .select_related('reviewer', 'tourist_point')
            .filter(rating__gte=4)
            .exclude(comment='')
            .order_by('-rating', '-created_at')[:9]
        )
        data = []
        for r in qs:
            author = (getattr(r.reviewer, 'display_name', '') or '').strip()
            if not author and r.reviewer and r.reviewer.email:
                author = r.reviewer.email.split('@')[0]
            data.append({
                'id': str(r.id),
                'rating': r.rating,
                'comment': r.comment,
                'author': author or 'Voyageur',
                'touristPoint': r.tourist_point.name,
                'date': r.created_at.isoformat(),
            })
        return Response(data)

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


def post_admin_message(point, sender, content, message_type='comment'):
    """Poste un message admin dans la conversation du POI (réutilisé par claims/suggestions)."""
    conv, _ = POIConversation.objects.get_or_create(tourist_point=point)
    msg = POIConversationMessage.objects.create(
        conversation=conv, sender=sender, sender_type='admin',
        message_type=message_type, content=content or '',
    )
    conv.last_message_at = msg.created_at
    conv.save(update_fields=['last_message_at'])


def _notify_partner(user, title, body):
    """Notification partenaire best-effort (réutilise PartnerNotification)."""
    try:
        from apps.partners.models import PartnerNotification
        PartnerNotification.objects.create(partner=user, title=title, body=body or '', category='moderation')
    except Exception:  # noqa: BLE001
        pass


# Clés metadata canoniques (lues par mapApiPoi côté frontend).
_META_LIST_FIELDS = {
    'cuisine_types', 'dietary_restrictions_supported', 'restaurant_categories',
    'accommodation_types', 'accommodation_amenities', 'accommodation_locations',
    'accommodation_accessibility', 'accommodation_security', 'accommodation_ambiance',
    'activity_categories', 'activity_interests', 'activity_avoidances',
}
_META_SCALAR_FIELDS = {'culinary_adventure_level_id', 'activity_intensity_level_id'}
_META_BOOL_FIELDS = {
    'is_wheelchair_accessible', 'has_accessible_parking', 'has_accessible_restrooms',
    'has_audio_guide', 'has_sign_language_support',
}
_FLAG_FIELDS = {'is_restaurant', 'is_accommodation', 'is_activity'}


def _resolve_level(model, value):
    """Résout un BudgetLevel/DifficultyLevel par pk (int ou uuid) puis par code.
    Robuste aux types de pk : un pk invalide ne lève pas, on retombe sur le code."""
    obj = None
    try:
        obj = model.objects.filter(pk=value).first()
    except (ValueError, TypeError, ValidationError):
        obj = None
    if obj is None:
        obj = model.objects.filter(code=value).first()
    return obj


def _apply_suggestion(suggestion) -> list:
    """Applique proposed_changes au POI (mirroir de la sauvegarde POICreationForm).
    Renvoie la liste des champs réellement appliqués."""
    poi = suggestion.tourist_point
    changes = {k: v for k, v in (suggestion.proposed_changes or {}).items() if k in SUGGESTABLE_FIELDS}
    applied = []
    update_fields = set()
    meta = poi.metadata or {}
    for field, value in changes.items():
        if value is None:
            continue
        if field in {'name', 'description', 'contact_phone', 'website_url', 'address'}:
            setattr(poi, field, value); update_fields.add(field); applied.append(field)
        elif field == 'amenities' and isinstance(value, list):
            poi.amenities = value; update_fields.add('amenities'); applied.append(field)
        elif field in _FLAG_FIELDS:
            setattr(poi, field, bool(value)); update_fields.add(field); applied.append(field)
        elif field == 'budget_level_id':
            obj = _resolve_level(BudgetLevel, value)
            if obj:
                poi.budget_level = obj; update_fields.add('budget_level'); applied.append('budget_level')
        elif field == 'difficulty_level_id':
            obj = _resolve_level(DifficultyLevel, value)
            if obj:
                poi.difficulty_level = obj; update_fields.add('difficulty_level'); applied.append('difficulty_level')
        elif field == 'tags' and isinstance(value, list):
            tags = Tag.objects.filter(Q(code__in=value) | Q(id__in=[v for v in value if str(v).isdigit()]))
            if tags.exists():
                poi.tags.set(list(tags)); applied.append('tags')
        elif field == 'opening_hours':
            meta['opening_hours'] = value; applied.append(field)
        elif field in _META_BOOL_FIELDS:
            meta[field] = bool(value); applied.append(field)
        elif field in _META_LIST_FIELDS and isinstance(value, list):
            meta[field] = value; applied.append(field)
        elif field in _META_SCALAR_FIELDS:
            meta[field] = value; applied.append(field)
        elif field == 'recommendation_level':
            try:
                meta['recommendation_level'] = max(1, min(5, int(float(value))))
                applied.append(field)
            except (TypeError, ValueError):
                pass
        elif field == 'media_images' and isinstance(value, list):
            imgs = meta.get('images') or []
            for url in value[:3]:
                if not url:
                    continue
                POIMedia.objects.create(tourist_point=poi, kind='image', external_url=url)
                if url not in imgs:
                    imgs.append(url)
            meta['images'] = imgs[:6]
            applied.append('media_images')
    # Re-traduction : si un champ traduisible a changé, les traductions en cache deviennent
    # périmées → on les purge et on ré-enfile les 11 langues (le worker régénère depuis le
    # contenu VALIDÉ). Les attributs taxonomiques (codes) n'ont rien à retraduire.
    translatable_changed = any(f in applied for f in ('name', 'description', 'address'))
    if translatable_changed:
        meta.pop('translations', None)
    # provenance
    history = meta.get('enrichment_history') or []
    history.append({
        'suggestion_id': str(suggestion.id),
        'by': str(suggestion.suggested_by_id),
        'fields': applied,
        'at': timezone.now().isoformat(),
    })
    meta['enrichment_history'] = history
    poi.metadata = meta
    update_fields.add('metadata'); update_fields.add('updated_at')
    poi.save(update_fields=list(update_fields))
    if translatable_changed:
        from .admin import SUPPORTED_LANGUAGES
        for lang in SUPPORTED_LANGUAGES:
            try:
                job, created = POITranslationQueue.objects.get_or_create(
                    tourist_point=poi, lang=lang,
                    defaults={'status': POITranslationQueue.Status.PENDING},
                )
                if not created and job.status != POITranslationQueue.Status.PENDING:
                    job.status = POITranslationQueue.Status.PENDING
                    job.attempts = 0
                    job.save(update_fields=['status', 'attempts', 'updated_at'])
            except Exception:  # noqa: BLE001
                pass
    return applied


class POIClaimViewSet(viewsets.ModelViewSet):
    """Revendications de gestion de POI. Création par tout connecté ; modération admin."""
    serializer_class = POIClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):  # type: ignore[override]
        qs = POIClaim.objects.select_related('tourist_point', 'claimed_by').all()
        user = self.request.user
        if user.is_staff:
            status_param = self.request.query_params.get('status')
            return qs.filter(status=status_param) if status_param else qs
        return qs.filter(claimed_by=user)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(claimed_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def moderate(self, request, pk=None):
        claim = self.get_object()
        action_name = request.data.get('action')
        admin_message = request.data.get('admin_message', '')
        if action_name not in {'approve', 'reject'}:
            return Response({'detail': 'Action invalide'}, status=status.HTTP_400_BAD_REQUEST)

        if action_name == 'approve':
            if claim.status != POIClaim.Status.APPROVED:
                with transaction.atomic():
                    from apps.partners.models import PartnerProfile
                    claimer = claim.claimed_by
                    poi = claim.tourist_point
                    default_name = (getattr(claimer, 'display_name', '') or
                                    (claimer.email.split('@')[0] if claimer.email else 'Partenaire'))
                    profile, _ = PartnerProfile.objects.get_or_create(
                        owner=claimer, defaults={'company_name': default_name, 'status': 'approved'},
                    )
                    if profile.status != 'approved':
                        profile.status = 'approved'
                        profile.save(update_fields=['status', 'updated_at'])
                    poi.owner = claimer
                    poi.save(update_fields=['owner', 'updated_at'])
                    profile.managed_pois.add(poi)
                    claim.status = POIClaim.Status.APPROVED
                    claim.reviewed_by = request.user
                    claim.review_message = admin_message
                    claim.save(update_fields=['status', 'reviewed_by', 'review_message', 'updated_at'])
                    post_admin_message(poi, request.user,
                                       admin_message or f'Revendication approuvée : vous gérez désormais « {poi.name} ».',
                                       message_type='status_change')
                    _notify_partner(claimer, 'Revendication approuvée',
                                    admin_message or f'Vous gérez désormais « {poi.name} ».')
        else:
            claim.status = POIClaim.Status.REJECTED
            claim.reviewed_by = request.user
            claim.review_message = admin_message
            claim.save(update_fields=['status', 'reviewed_by', 'review_message', 'updated_at'])
            post_admin_message(claim.tourist_point, request.user,
                               admin_message or 'Revendication refusée.', message_type='status_change')
            _notify_partner(claim.claimed_by, 'Revendication refusée', admin_message or '')

        return Response(POIClaimSerializer(claim, context={'request': request}).data)


class POISuggestionViewSet(viewsets.ModelViewSet):
    """Suggestions d'enrichissement wiki. Création par tout connecté ; modération admin (applique)."""
    serializer_class = POISuggestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):  # type: ignore[override]
        qs = POISuggestion.objects.select_related('tourist_point', 'suggested_by').all()
        user = self.request.user
        if user.is_staff:
            status_param = self.request.query_params.get('status')
            return qs.filter(status=status_param) if status_param else qs
        return qs.filter(suggested_by=user)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(suggested_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def moderate(self, request, pk=None):
        suggestion = self.get_object()
        action_name = request.data.get('action')
        admin_message = request.data.get('admin_message', '')
        if action_name not in {'approve', 'reject'}:
            return Response({'detail': 'Action invalide'}, status=status.HTTP_400_BAD_REQUEST)

        if action_name == 'approve' and suggestion.status != POISuggestion.Status.APPROVED:
            with transaction.atomic():
                applied = _apply_suggestion(suggestion)
                suggestion.status = POISuggestion.Status.APPROVED
                suggestion.reviewed_by = request.user
                suggestion.review_message = admin_message
                suggestion.save(update_fields=['status', 'reviewed_by', 'review_message', 'updated_at'])
                post_admin_message(suggestion.tourist_point, request.user,
                                   admin_message or f'Suggestion appliquée ({", ".join(applied) or "aucun champ"}).',
                                   message_type='status_change')
        elif action_name == 'reject':
            suggestion.status = POISuggestion.Status.REJECTED
            suggestion.reviewed_by = request.user
            suggestion.review_message = admin_message
            suggestion.save(update_fields=['status', 'reviewed_by', 'review_message', 'updated_at'])
            post_admin_message(suggestion.tourist_point, request.user,
                               admin_message or 'Suggestion refusée.', message_type='status_change')

        return Response(POISuggestionSerializer(suggestion, context={'request': request}).data)


class POIReportViewSet(viewsets.ModelViewSet):
    """Signalements de POI. Création par tout utilisateur connecté → GEL immédiat du POI.
    Modération admin : `delete` (supprimer) ou `keep` (dégeler)."""
    serializer_class = POIReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):  # type: ignore[override]
        qs = POIReport.objects.select_related('tourist_point', 'reported_by').all()
        user = self.request.user
        if user.is_staff:
            status_param = self.request.query_params.get('status')
            return qs.filter(status=status_param) if status_param else qs
        return qs.filter(reported_by=user)

    def perform_create(self, serializer):  # type: ignore[override]
        report = serializer.save(reported_by=self.request.user)
        poi = report.tourist_point
        # Gel au 1er signalement (si pas déjà gelé).
        if poi.is_active or poi.status != TouristPoint.Status.UNDER_REVIEW:
            report.previous_status = poi.status
            report.save(update_fields=['previous_status', 'updated_at'])
            poi.is_active = False
            poi.status = TouristPoint.Status.UNDER_REVIEW
            poi.save(update_fields=['is_active', 'status', 'updated_at'])

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def moderate(self, request, pk=None):
        report = self.get_object()
        action_name = request.data.get('action')  # 'delete' | 'keep'
        admin_message = request.data.get('admin_message', '')
        if action_name not in {'delete', 'keep'}:
            return Response({'detail': 'Action invalide'}, status=status.HTTP_400_BAD_REQUEST)
        if report.status != POIReport.Status.PENDING:
            return Response(POIReportSerializer(report, context={'request': request}).data)

        poi = report.tourist_point
        if action_name == 'delete':
            with transaction.atomic():
                poi.delete()  # cascade : supprime aussi reports + file de traduction du POI
            return Response({'detail': 'POI supprimé', 'deleted': True})
        # keep → dégel + résolution de tous les signalements en attente du POI
        with transaction.atomic():
            poi.is_active = True
            poi.status = report.previous_status or TouristPoint.Status.APPROVED
            poi.save(update_fields=['is_active', 'status', 'updated_at'])
            POIReport.objects.filter(tourist_point=poi, status=POIReport.Status.PENDING).update(
                status=POIReport.Status.RESOLVED_KEPT, reviewed_by=request.user, review_message=admin_message,
            )
            post_admin_message(poi, request.user,
                               admin_message or 'Signalement examiné : POI conservé.', message_type='status_change')
        report.refresh_from_db()
        return Response(POIReportSerializer(report, context={'request': request}).data)


class TranslationCronView(APIView):
    """Suivi & pilotage de la traduction (admin).
    GET  = stats file + réglages quotidiens + état manuel + historique des exécutions.
    POST `action` :
       - `start`      : démarre la passe manuelle CONTINUE (sans limite de temps). `mode`=missing|full.
       - `stop`       : arrête la passe manuelle.
       - `clear_logs` : purge l'historique + les entrées de file traitées (done/failed). NE TOUCHE PAS aux traductions.
       - `queue`      : draine un lot de la file on-demand (process_batch).
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from . import services_i18n as i18n
        from .models import TranslationRunLog
        qs = POITranslationQueue.objects
        recent = list(
            qs.filter(status=POITranslationQueue.Status.DONE).select_related('tourist_point')
            .order_by('-updated_at')[:10]
            .values('tourist_point__name', 'lang', 'updated_at')
        )
        runs = list(
            TranslationRunLog.objects.order_by('-started_at')[:15].values(
                'id', 'source', 'mode', 'status', 'started_at', 'finished_at',
                'tax_changed', 'poi_completed', 'poi_processed', 'note')
        )
        return Response({
            'pending': qs.filter(status=POITranslationQueue.Status.PENDING).count(),
            'done': qs.filter(status=POITranslationQueue.Status.DONE).count(),
            'failed': qs.filter(status=POITranslationQueue.Status.FAILED).count(),
            'recent': recent,
            'daily': {
                'enabled': i18n.get_bool_setting('translation_daily_enabled', False),
                'hour': i18n.get_int_setting('translation_daily_hour', 0),
                'duration_hours': i18n.get_float_setting('translation_daily_duration_hours', 6),
                'last_run': i18n.get_setting('translation_daily_last_run', ''),
                'poi_done': i18n.get_int_setting('translation_poi_done_count', 0),
                'poi_total': TouristPoint.objects.count(),
            },
            'manual': {
                'running': i18n.get_bool_setting('translation_manual_enabled', False),
                'mode': i18n.get_setting('translation_manual_mode', 'missing'),
            },
            'runs': runs,
        })

    def post(self, request):
        from .services_translation import process_batch
        from . import services_i18n as i18n
        action = (request.data.get('action') or '').strip()

        if action == 'start':
            mode = (request.data.get('mode') or 'missing').strip()
            mode = mode if mode in ('missing', 'full') else 'missing'
            i18n.set_setting('translation_manual_mode', mode)
            i18n.set_setting('translation_manual_enabled', 'true')
            return Response({'started': True, 'mode': mode})

        if action == 'stop':
            i18n.set_setting('translation_manual_enabled', 'false')
            return Response({'stopped': True})

        if action == 'clear_logs':
            from .models import TranslationRunLog
            runs_deleted = TranslationRunLog.objects.all().delete()[0]
            jobs_deleted = POITranslationQueue.objects.filter(
                status__in=[POITranslationQueue.Status.DONE, POITranslationQueue.Status.FAILED]
            ).delete()[0]
            return Response({'cleared': True, 'runs_deleted': runs_deleted, 'jobs_deleted': jobs_deleted})

        # Défaut : vider un lot de la file on-demand.
        try:
            n = int(request.data.get('batch_size') or 10)
        except (TypeError, ValueError):
            n = 10
        return Response(process_batch(min(max(n, 1), 100)))
