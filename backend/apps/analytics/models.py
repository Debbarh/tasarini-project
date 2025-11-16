from __future__ import annotations

from django.conf import settings
from django.db import models


class TouristPointAnalytics(models.Model):
    """Analytics data for tourist points - tracks views, clicks, bookings, revenue"""
    tourist_point = models.ForeignKey(
        'poi.TouristPoint',
        related_name='analytics',
        on_delete=models.CASCADE
    )
    date = models.DateField()
    views = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    bookings = models.PositiveIntegerField(default=0)
    revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unique_visitors = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('tourist_point', 'date')
        indexes = [
            models.Index(fields=['tourist_point', '-date']),
            models.Index(fields=['date']),
        ]
        db_table = 'tourist_point_analytics'

    def __str__(self) -> str:
        return f"Analytics {self.tourist_point.name} - {self.date}"


class TravelAnalytics(models.Model):
    session_id = models.CharField(max_length=120, unique=True)
    user_country = models.CharField(max_length=120, blank=True, null=True)
    user_city = models.CharField(max_length=120, blank=True, null=True)
    user_region = models.CharField(max_length=120, blank=True, null=True)
    user_gender = models.CharField(max_length=20, blank=True, null=True)

    destinations = models.JSONField(blank=True, null=True)
    trip_duration = models.PositiveIntegerField(blank=True, null=True)
    travel_group_type = models.CharField(max_length=120, blank=True, null=True)
    travel_group_size = models.PositiveIntegerField(blank=True, null=True)

    budget_level = models.CharField(max_length=50, blank=True, null=True)
    budget_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    budget_currency = models.CharField(max_length=10, blank=True, null=True)

    culinary_preferences = models.JSONField(blank=True, null=True)
    accommodation_preferences = models.JSONField(blank=True, null=True)
    activity_preferences = models.JSONField(blank=True, null=True)

    step_completed = models.CharField(max_length=120)
    completion_status = models.CharField(
        max_length=32,
        choices=[('in_progress', 'In Progress'), ('completed', 'Completed'), ('abandoned', 'Abandoned')],
        default='completed',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['completion_status']),
            models.Index(fields=['user_country']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self) -> str:
        return f"Analytics {self.session_id}"
