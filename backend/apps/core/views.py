from __future__ import annotations

from rest_framework import permissions, viewsets

from .models import SystemSetting
from .serializers import SystemSettingSerializer

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
]


class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    lookup_field = 'setting_key'

    def get_permissions(self):  # type: ignore[override]
        if self.action in {'list', 'retrieve'}:
            return [permissions.IsAuthenticated()]
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
