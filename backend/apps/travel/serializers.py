from rest_framework import serializers

from .models import AIProviderConfig


class AIProviderConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIProviderConfig
        fields = '__all__'
        read_only_fields = ('id', 'provider', 'display_name', 'created_at', 'updated_at')
