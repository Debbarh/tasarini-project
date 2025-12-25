from __future__ import annotations

import csv
import copy
import io
import uuid

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
        """Translate missing label and description fields for a budget level using DeepL"""
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
        """Translate missing label and description fields for a budget flexibility option using DeepL"""
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
        """Translate missing label and description fields for an accommodation type using DeepL"""
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
        """Translate missing label and description fields for an accommodation amenity using DeepL"""
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
        """Translate missing label and description fields for an accommodation location using DeepL"""
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
        """Translate missing label and description fields for an accommodation accessibility feature using DeepL"""
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
        """Translate missing label and description fields for an accommodation security feature using DeepL"""
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
        """Translate missing label and description fields for an accommodation ambiance using DeepL"""
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
        """Translate missing label and description fields for a dietary restriction using DeepL"""
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
        """Translate missing label and description fields for a cuisine type using DeepL"""
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
        """Translate missing label and description fields for a culinary adventure level using DeepL"""
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
        """Translate missing label and description fields for a restaurant category using DeepL"""
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
        """Translate missing label and description fields for a travel group type using DeepL"""
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
        """Translate missing label and description fields for a travel group subtype using DeepL"""
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


class TouristPointViewSet(viewsets.ModelViewSet):
    queryset = TouristPoint.objects.select_related('budget_level', 'difficulty_level').prefetch_related('tags', 'media')
    serializer_class = TouristPointSerializer
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

        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            owner_filter = self.request.query_params.get('owner')
            if owner_filter in {'me', 'self'} and user.is_authenticated:
                return qs.filter(owner=user)
            if owner_filter and user.is_staff:
                if owner_filter.isdigit():
                    return qs.filter(owner_id=int(owner_filter))
                return qs.filter(owner__public_id=owner_filter)
            if user.is_staff or (user.is_authenticated and user.role in {'admin', 'editor'}):
                return qs
            return qs.filter(is_active=True)

        if user.is_staff or (user.is_authenticated and user.role in {'admin', 'editor'}):
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
