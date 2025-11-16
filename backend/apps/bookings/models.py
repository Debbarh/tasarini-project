from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.poi.models import TouristPoint


class Room(models.Model):
    tourist_point = models.ForeignKey(TouristPoint, related_name='rooms', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    capacity = models.PositiveIntegerField(default=2)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    amenities = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.tourist_point.name})"


class RatePlan(models.Model):
    room = models.ForeignKey(Room, related_name='rate_plans', on_delete=models.CASCADE)
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cancellation_policy = models.TextField(blank=True)
    is_refundable = models.BooleanField(default=True)
    included_meals = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('room', 'code')


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]

    room = models.ForeignKey(Room, related_name='bookings', on_delete=models.PROTECT)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='bookings', on_delete=models.CASCADE)
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.PositiveSmallIntegerField(default=1)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='pending')
    special_requests = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
