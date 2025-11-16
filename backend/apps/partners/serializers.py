from __future__ import annotations

from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.poi.models import TouristPoint
from apps.poi.serializers import TouristPointSerializer
from .models import (
    PartnerApplication,
    PartnerBookingConfig,
    PartnerCommission,
    PartnerEndpointHealth,
    PartnerNotification,
    PartnerPaymentMethod,
    PartnerProfile,
    PartnerWithdrawal,
)


class PartnerProfileSerializer(serializers.ModelSerializer):
    managed_pois = TouristPointSerializer(many=True, read_only=True)
    owner_detail = UserSerializer(source='owner', read_only=True)
    managed_poi_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        source='managed_pois',
        queryset=TouristPoint.objects.none(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = PartnerProfile
        fields = [
            'id',
            'owner',
            'owner_detail',
            'company_name',
            'website',
            'status',
            'api_key',
            'metadata',
            'managed_pois',
            'managed_poi_ids',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'owner', 'owner_detail', 'api_key', 'created_at', 'updated_at')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.poi.models import TouristPoint

        self.fields['managed_poi_ids'].queryset = TouristPoint.objects.all()

    def create(self, validated_data):  # type: ignore[override]
        managed_pois = validated_data.pop('managed_pois', [])
        profile = PartnerProfile.objects.create(**validated_data)
        if managed_pois:
            profile.managed_pois.set(managed_pois)
        return profile

    def update(self, instance, validated_data):  # type: ignore[override]
        managed_pois = validated_data.pop('managed_pois', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if managed_pois is not None:
            instance.managed_pois.set(managed_pois)
        return instance


class PartnerApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerApplication
        fields = '__all__'
        read_only_fields = ('id', 'status', 'reviewed_by', 'partner', 'created_at', 'updated_at')


class PartnerNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerNotification
        fields = '__all__'
        read_only_fields = ('created_at',)


class PartnerAnalyticsSerializer(serializers.Serializer):
    totalPOIs = serializers.IntegerField()
    approvedPOIs = serializers.IntegerField()
    pendingPOIs = serializers.IntegerField()
    rejectedPOIs = serializers.IntegerField()
    totalViews = serializers.IntegerField()
    totalBookings = serializers.IntegerField()
    monthlyRevenue = serializers.IntegerField()
    performanceScore = serializers.IntegerField()


class PartnerBulkPOIStatusSerializer(serializers.Serializer):
    poi_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    status = serializers.CharField()


class PartnerBookingConfigSerializer(serializers.ModelSerializer):
    tourist_point_detail = TouristPointSerializer(source='tourist_point', read_only=True)

    class Meta:
        model = PartnerBookingConfig
        fields = [
            'id',
            'partner',
            'tourist_point',
            'tourist_point_detail',
            'system_type',
            'endpoint_url',
            'webhook_url',
            'api_credentials',
            'custom_fields',
            'is_active',
            'test_mode',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'partner', 'created_at', 'updated_at')

    def validate_tourist_point(self, value: TouristPoint):
        request = self.context['request']
        user = request.user
        if user.is_staff:
            return value
        if value.owner != user:
            raise serializers.ValidationError('Vous ne pouvez configurer que vos propres points.')
        return value

    def create(self, validated_data):  # type: ignore[override]
        validated_data['partner'] = self.context['request'].user
        return super().create(validated_data)


class PartnerPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerPaymentMethod
        fields = [
            'id',
            'partner',
            'method_type',
            'label',
            'details',
            'is_default',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'partner', 'created_at', 'updated_at')

    def create(self, validated_data):  # type: ignore[override]
        partner = self.context['request'].user
        validated_data['partner'] = partner
        if 'is_default' not in validated_data:
            validated_data['is_default'] = not PartnerPaymentMethod.objects.filter(partner=partner).exists()
        return super().create(validated_data)


class PartnerCommissionSerializer(serializers.ModelSerializer):
    tourist_point_detail = TouristPointSerializer(source='tourist_point', read_only=True)
    tourist_point_name = serializers.CharField(source='tourist_point.name', read_only=True)

    class Meta:
        model = PartnerCommission
        fields = [
            'id',
            'partner',
            'tourist_point',
            'tourist_point_detail',
            'tourist_point_name',
            'booking',
            'amount',
            'commission_rate',
            'booking_reference',
            'customer_name',
            'booking_date',
            'payment_status',
            'metadata',
            'created_at',
        ]
        read_only_fields = ('id', 'partner', 'created_at')


class PartnerWithdrawalSerializer(serializers.ModelSerializer):
    payment_method_detail = PartnerPaymentMethodSerializer(source='payment_method', read_only=True)

    class Meta:
        model = PartnerWithdrawal
        fields = [
            'id',
            'partner',
            'payment_method',
            'payment_method_detail',
            'amount',
            'status',
            'metadata',
            'requested_at',
            'processed_at',
        ]
        read_only_fields = ('id', 'partner', 'status', 'metadata', 'requested_at', 'processed_at')

    def validate_payment_method(self, value: PartnerPaymentMethod):
        request = self.context['request']
        if request.user.is_staff:
            return value
        if value.partner != request.user:
            raise serializers.ValidationError('Méthode de paiement invalide.')
        return value

    def create(self, validated_data):  # type: ignore[override]
        validated_data['partner'] = self.context['request'].user
        return super().create(validated_data)


class PartnerEndpointHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerEndpointHealth
        fields = [
            'id',
            'partner',
            'endpoint_url',
            'status',
            'response_time_ms',
            'uptime_percentage',
            'success_rate_24h',
            'last_checked',
            'error_message',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'partner', 'last_checked', 'created_at', 'updated_at')

    def create(self, validated_data):  # type: ignore[override]
        validated_data['partner'] = self.context['request'].user
        return super().create(validated_data)
