from rest_framework import serializers

from .models import TouristPointAnalytics, TravelAnalytics


class TouristPointAnalyticsSerializer(serializers.ModelSerializer):
    tourist_point_name = serializers.CharField(source='tourist_point.name', read_only=True)

    class Meta:
        model = TouristPointAnalytics
        fields = [
            'id',
            'tourist_point',
            'tourist_point_name',
            'date',
            'views',
            'clicks',
            'bookings',
            'revenue',
            'unique_visitors',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')


class TravelAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TravelAnalytics
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
