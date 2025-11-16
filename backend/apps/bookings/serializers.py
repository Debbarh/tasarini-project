from __future__ import annotations

from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.poi.serializers import TouristPointSerializer
from .models import Booking, RatePlan, Room


class RatePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RatePlan
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class RoomSerializer(serializers.ModelSerializer):
    rate_plans = RatePlanSerializer(many=True, read_only=True)
    tourist_point_detail = TouristPointSerializer(source='tourist_point', read_only=True)

    class Meta:
        model = Room
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class BookingSerializer(serializers.ModelSerializer):
    room_detail = RoomSerializer(source='room', read_only=True)
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'room',
            'room_detail',
            'user',
            'user_detail',
            'check_in',
            'check_out',
            'guests',
            'total_amount',
            'status',
            'special_requests',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('created_at', 'updated_at', 'user', 'user_detail')

    def create(self, validated_data):  # type: ignore[override]
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
