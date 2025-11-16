from __future__ import annotations

import uuid

from decimal import Decimal

from django.conf import settings
from django.db import models

from django.utils import timezone

from apps.poi.models import TouristPoint


class PartnerProfile(models.Model):
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='partner_profile')
    company_name = models.CharField(max_length=255)
    website = models.URLField(blank=True)
    status = models.CharField(
        max_length=32,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('suspended', 'Suspended')],
        default='pending',
    )
    api_key = models.CharField(max_length=64, default='', blank=True)
    managed_pois = models.ManyToManyField(TouristPoint, blank=True, related_name='partner_profiles')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):  # pragma: no cover - deterministic
        if not self.api_key:
            self.api_key = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def __str__(self) -> str:  # pragma: no cover
        return self.company_name


class PartnerApplication(models.Model):
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='partner_applications')
    motivation = models.TextField()
    status = models.CharField(
        max_length=32,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_applications',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PartnerNotification(models.Model):
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='partner_notifications')
    title = models.CharField(max_length=255)
    body = models.TextField()
    category = models.CharField(max_length=64, default='general')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class PartnerBookingConfig(models.Model):
    SYSTEM_CHOICES = [
        ('internal', 'Internal'),
        ('external', 'External'),
        ('api', 'API'),
        ('webhook', 'Webhook'),
    ]

    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='booking_configs')
    tourist_point = models.ForeignKey(TouristPoint, on_delete=models.CASCADE, related_name='booking_configs')
    system_type = models.CharField(max_length=32, choices=SYSTEM_CHOICES, default='external')
    endpoint_url = models.URLField(blank=True)
    webhook_url = models.URLField(blank=True)
    api_credentials = models.JSONField(default=dict, blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=False)
    test_mode = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('partner', 'tourist_point')
        ordering = ['-updated_at']

    def save(self, *args, **kwargs):  # pragma: no cover - deterministic side effects on related object
        super().save(*args, **kwargs)
        metadata = self.tourist_point.metadata or {}
        metadata['booking'] = {
            'system_type': self.system_type,
            'is_active': self.is_active,
            'test_mode': self.test_mode,
            'endpoint_url': self.endpoint_url,
            'webhook_url': self.webhook_url,
        }
        self.tourist_point.metadata = metadata
        self.tourist_point.save(update_fields=['metadata', 'updated_at'])

    def delete(self, *args, **kwargs):  # pragma: no cover - deterministic cleanup
        poi = self.tourist_point
        super().delete(*args, **kwargs)
        metadata = poi.metadata or {}
        if metadata.pop('booking', None) is not None:
            poi.metadata = metadata
            poi.save(update_fields=['metadata', 'updated_at'])


class PartnerPaymentMethod(models.Model):
    METHOD_CHOICES = [
        ('bank', 'Bank transfer'),
        ('paypal', 'PayPal'),
        ('stripe', 'Stripe'),
    ]

    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_methods')
    method_type = models.CharField(max_length=32, choices=METHOD_CHOICES)
    label = models.CharField(max_length=255, blank=True)
    details = models.JSONField(default=dict, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-updated_at']

    def save(self, *args, **kwargs):  # pragma: no cover - simple state mgmt
        super().save(*args, **kwargs)
        if self.is_default:
            (
                PartnerPaymentMethod.objects.filter(partner=self.partner)
                .exclude(pk=self.pk)
                .update(is_default=False, updated_at=timezone.now())
            )


class PartnerCommission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]

    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='partner_commissions')
    booking = models.ForeignKey(
        'bookings.Booking', null=True, blank=True, related_name='partner_commissions', on_delete=models.SET_NULL
    )
    tourist_point = models.ForeignKey(TouristPoint, on_delete=models.CASCADE, related_name='partner_commissions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('15.0'))
    booking_reference = models.CharField(max_length=64, blank=True)
    customer_name = models.CharField(max_length=255, blank=True)
    booking_date = models.DateField()
    payment_status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='pending')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-booking_date']


class PartnerWithdrawal(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='partner_withdrawals')
    payment_method = models.ForeignKey(
        PartnerPaymentMethod, on_delete=models.PROTECT, related_name='withdrawals'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='pending')
    metadata = models.JSONField(default=dict, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']


class PartnerEndpointHealth(models.Model):
    STATUS_CHOICES = [
        ('healthy', 'Healthy'),
        ('degraded', 'Degraded'),
        ('unhealthy', 'Unhealthy'),
    ]

    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='endpoint_health')
    endpoint_url = models.URLField()
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='healthy')
    response_time_ms = models.PositiveIntegerField(default=0)
    uptime_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)
    success_rate_24h = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)
    last_checked = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
