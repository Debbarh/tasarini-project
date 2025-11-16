from rest_framework import serializers

from .models import SystemSetting


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
