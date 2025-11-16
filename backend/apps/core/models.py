from __future__ import annotations

from django.db import models


class SystemSetting(models.Model):
    SETTING_TYPES = [
        ('string', 'String'),
        ('boolean', 'Boolean'),
        ('number', 'Number'),
    ]

    setting_key = models.CharField(max_length=120, unique=True)
    setting_value = models.TextField(blank=True)
    setting_type = models.CharField(max_length=16, choices=SETTING_TYPES, default='string')
    description = models.TextField(blank=True)
    category = models.CharField(max_length=64, default='general')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['setting_key']

    def __str__(self):  # pragma: no cover
        return f"{self.setting_key}={self.setting_value}"
