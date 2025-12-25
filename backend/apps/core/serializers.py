from rest_framework import serializers

from .models import SystemSetting, APIProvider, Widget


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = [
            'id',
            'setting_key',
            'setting_value',
            'setting_type',
            'description',
            'category',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')


class APIProviderSerializer(serializers.ModelSerializer):
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    provider_code_display = serializers.CharField(source='get_provider_code_display', read_only=True)

    class Meta:
        model = APIProvider
        fields = [
            'id',
            'provider_code',
            'provider_code_display',
            'provider_name',
            'service_type',
            'service_type_display',
            'is_active',
            'priority',
            'description',
            'api_endpoint',
            'has_credentials',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')


class WidgetSerializer(serializers.ModelSerializer):
    widget_type_display = serializers.CharField(source='get_widget_type_display', read_only=True)
    placement_display = serializers.CharField(source='get_placement_display', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)

    class Meta:
        model = Widget
        fields = [
            'id',
            'widget_code',
            'widget_name',
            'widget_type',
            'widget_type_display',
            'placement',
            'placement_display',
            'service_type',
            'service_type_display',
            'is_active',
            'priority',
            'description',
            'configuration',
            'content',
            'script_url',
            'css_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')
