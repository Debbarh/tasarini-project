from __future__ import annotations

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SystemSetting, APIProvider, Widget
from .serializers import SystemSettingSerializer, APIProviderSerializer, WidgetSerializer

DEFAULT_SETTINGS = [
    ('site_name', 'Voyage AI', 'string', 'Nom public du site', 'general'),
    ('site_description', 'Plateforme de recommandations touristiques', 'string', '', 'general'),
    ('maintenance_mode', 'false', 'boolean', 'Active la maintenance', 'general'),
    ('registration_enabled', 'true', 'boolean', 'Permettre les inscriptions', 'auth'),
    ('email_notifications', 'true', 'boolean', 'Notifier par email', 'notifications'),
    ('partner_registration', 'true', 'boolean', 'Permettre les partenaires', 'partners'),
    ('automatic_verification', 'false', 'boolean', 'Vérification auto des POI', 'partners'),
    ('max_file_size', '10', 'number', 'Taille max upload (Mo)', 'uploads'),
    ('session_timeout', '24', 'number', 'Durée session (h)', 'auth'),
    ('api_rate_limit', '1000', 'number', 'Limite API', 'api'),
    ('enable_analytics', 'true', 'boolean', 'Active les analytics', 'analytics'),
    ('enable_geolocation', 'true', 'boolean', 'Active la géolocalisation', 'analytics'),
    ('default_language', 'fr', 'string', 'Langue par défaut', 'i18n'),
    ('currency', 'EUR', 'string', 'Devise par défaut', 'i18n'),
    ('time_zone', 'Europe/Paris', 'string', 'Fuseau horaire', 'i18n'),
    ('booking_center_enabled', 'true', 'boolean', 'Active l\'affichage de la centrale de réservation', 'features'),
    ('plan_your_trip_enabled', 'true', 'boolean', 'Active le module Plan Your Trip', 'features'),
    ('be_inspired_enabled', 'true', 'boolean', 'Active le module Be Inspired', 'features'),
    ('travel_stories_enabled', 'true', 'boolean', 'Active le module Travel Stories', 'features'),
]


class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    lookup_field = 'setting_key'

    def get_permissions(self):  # type: ignore[override]
        # Allow public read access to system settings (needed for frontend feature toggles)
        if self.action in {'list', 'retrieve'}:
            return [permissions.AllowAny()]
        # Only admins can modify settings
        return [permissions.IsAdminUser()]

    def get_queryset(self):  # type: ignore[override]
        self._ensure_defaults()
        qs = super().get_queryset()
        if self.action == 'list':
            return qs.filter(is_active=True)
        return qs

    def _ensure_defaults(self):
        existing_keys = set(SystemSetting.objects.values_list('setting_key', flat=True))
        to_create = [
            SystemSetting(
                setting_key=key,
                setting_value=value,
                setting_type=stype,
                description=description,
                category=category,
            )
            for key, value, stype, description, category in DEFAULT_SETTINGS
            if key not in existing_keys
        ]
        if to_create:
            SystemSetting.objects.bulk_create(to_create, ignore_conflicts=True)


class APIProviderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing API providers"""
    queryset = APIProvider.objects.all()
    serializer_class = APIProviderSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_permissions(self):  # type: ignore[override]
        """
        Allow public read access for provider discovery endpoints.
        Keep admin restriction for any modifying action.
        """
        if self.action in ['active', 'by_service']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):  # type: ignore[override]
        """Get queryset with optional filtering"""
        qs = super().get_queryset()

        # Filter by service_type if provided
        service_type = self.request.query_params.get('service_type')
        if service_type:
            qs = qs.filter(service_type=service_type)

        # Filter by is_active if provided
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')

        return qs

    @action(detail=False, methods=['get'])
    def by_service(self, request):
        """Get providers grouped by service type"""
        providers = self.get_queryset()
        grouped = {}

        for provider in providers:
            service = provider.service_type
            if service not in grouped:
                grouped[service] = []
            grouped[service].append(APIProviderSerializer(provider).data)

        return Response(grouped)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active providers"""
        providers = self.get_queryset().filter(is_active=True).order_by('service_type', 'priority')
        serializer = self.get_serializer(providers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle active status of a provider"""
        provider = self.get_object()
        provider.is_active = not provider.is_active
        provider.save()
        serializer = self.get_serializer(provider)
        return Response(serializer.data)


class WidgetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing widgets"""
    queryset = Widget.objects.all()
    serializer_class = WidgetSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_permissions(self):  # type: ignore[override]
        """
        Allow public read access for widget discovery endpoints.
        Keep admin restriction for any modifying action.
        """
        if self.action in ['active', 'by_placement', 'by_service']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):  # type: ignore[override]
        """Get queryset with optional filtering"""
        qs = super().get_queryset()

        # Filter by widget_type if provided
        widget_type = self.request.query_params.get('widget_type')
        if widget_type:
            qs = qs.filter(widget_type=widget_type)

        # Filter by placement if provided
        placement = self.request.query_params.get('placement')
        if placement:
            qs = qs.filter(placement=placement)

        # Filter by service_type if provided
        service_type = self.request.query_params.get('service_type')
        if service_type:
            qs = qs.filter(service_type__in=[service_type, 'all'])

        # Filter by is_active if provided
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')

        return qs

    @action(detail=False, methods=['get'])
    def by_placement(self, request):
        """Get widgets grouped by placement"""
        widgets = self.get_queryset()
        grouped = {}

        for widget in widgets:
            placement = widget.placement
            if placement not in grouped:
                grouped[placement] = []
            grouped[placement].append(WidgetSerializer(widget).data)

        return Response(grouped)

    @action(detail=False, methods=['get'])
    def by_service(self, request):
        """Get widgets grouped by service type"""
        widgets = self.get_queryset()
        grouped = {}

        for widget in widgets:
            service = widget.service_type
            if service not in grouped:
                grouped[service] = []
            grouped[service].append(WidgetSerializer(widget).data)

        return Response(grouped)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active widgets"""
        widgets = self.get_queryset().filter(is_active=True).order_by('placement', 'priority')
        serializer = self.get_serializer(widgets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle active status of a widget"""
        widget = self.get_object()
        widget.is_active = not widget.is_active
        widget.save()
        serializer = self.get_serializer(widget)
        return Response(serializer.data)
