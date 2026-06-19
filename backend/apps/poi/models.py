from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Tag(TimeStampedModel):
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True)
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class BudgetLevel(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    label_fr = models.CharField(max_length=120)
    label_en = models.CharField(max_length=120, blank=True)
    label_es = models.CharField(max_length=120, blank=True, default='')
    label_de = models.CharField(max_length=120, blank=True, default='')
    label_it = models.CharField(max_length=120, blank=True, default='')
    label_pt = models.CharField(max_length=120, blank=True, default='')
    label_ru = models.CharField(max_length=120, blank=True, default='')
    label_ja = models.CharField(max_length=120, blank=True, default='')
    label_zh = models.CharField(max_length=120, blank=True, default='')
    label_hi = models.CharField(max_length=120, blank=True, default='')
    label_ar = models.CharField(max_length=120, blank=True, default='')
    description_fr = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    icon_emoji = models.CharField(max_length=8, blank=True)
    icon_name = models.CharField(max_length=64, blank=True, default='')
    min_daily_amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    max_daily_amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    default_daily_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class BudgetCurrency(TimeStampedModel):
    code = models.CharField(max_length=16, unique=True)
    name_fr = models.CharField(max_length=120)
    name_en = models.CharField(max_length=120, blank=True)
    name_es = models.CharField(max_length=120, blank=True, default='')
    name_de = models.CharField(max_length=120, blank=True, default='')
    name_it = models.CharField(max_length=120, blank=True, default='')
    name_pt = models.CharField(max_length=120, blank=True, default='')
    name_ru = models.CharField(max_length=120, blank=True, default='')
    name_ja = models.CharField(max_length=120, blank=True, default='')
    name_zh = models.CharField(max_length=120, blank=True, default='')
    name_hi = models.CharField(max_length=120, blank=True, default='')
    name_ar = models.CharField(max_length=120, blank=True, default='')
    symbol = models.CharField(max_length=8, default='€')
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'code']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.code} ({self.symbol})"


class BudgetFlexibilityOption(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    label_fr = models.CharField(max_length=120)
    label_en = models.CharField(max_length=120, blank=True)
    label_es = models.CharField(max_length=120, blank=True, default='')
    label_de = models.CharField(max_length=120, blank=True, default='')
    label_it = models.CharField(max_length=120, blank=True, default='')
    label_pt = models.CharField(max_length=120, blank=True, default='')
    label_ru = models.CharField(max_length=120, blank=True, default='')
    label_ja = models.CharField(max_length=120, blank=True, default='')
    label_zh = models.CharField(max_length=120, blank=True, default='')
    label_hi = models.CharField(max_length=120, blank=True, default='')
    label_ar = models.CharField(max_length=120, blank=True, default='')
    description_fr = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    percentage_variation = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'code']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class Country(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)  # Original name field (kept for compatibility)
    code = models.CharField(max_length=8, unique=True)
    is_active = models.BooleanField(default=True)
    
    # Multilingual name fields
    name_fr = models.CharField(max_length=150, blank=True, default='')
    name_en = models.CharField(max_length=150, blank=True, default='')
    name_es = models.CharField(max_length=150, blank=True, default='')
    name_de = models.CharField(max_length=150, blank=True, default='')
    name_it = models.CharField(max_length=150, blank=True, default='')
    name_pt = models.CharField(max_length=150, blank=True, default='')
    name_ru = models.CharField(max_length=150, blank=True, default='')
    name_ja = models.CharField(max_length=150, blank=True, default='')
    name_zh = models.CharField(max_length=150, blank=True, default='')
    name_hi = models.CharField(max_length=150, blank=True, default='')
    name_ar = models.CharField(max_length=150, blank=True, default='')

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class City(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    country = models.ForeignKey(Country, related_name='cities', on_delete=models.CASCADE)
    name = models.CharField(max_length=150)  # Original name field (kept for compatibility)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Multilingual name fields
    name_fr = models.CharField(max_length=150, blank=True, default='')
    name_en = models.CharField(max_length=150, blank=True, default='')
    name_es = models.CharField(max_length=150, blank=True, default='')
    name_de = models.CharField(max_length=150, blank=True, default='')
    name_it = models.CharField(max_length=150, blank=True, default='')
    name_pt = models.CharField(max_length=150, blank=True, default='')
    name_ru = models.CharField(max_length=150, blank=True, default='')
    name_ja = models.CharField(max_length=150, blank=True, default='')
    name_zh = models.CharField(max_length=150, blank=True, default='')
    name_hi = models.CharField(max_length=150, blank=True, default='')
    name_ar = models.CharField(max_length=150, blank=True, default='')

    class Meta:
        ordering = ['name']
        unique_together = ('country', 'name')

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.country.code})"


class ActivityCategory(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True, default='')
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True, default='')
    description_en = models.TextField(blank=True, default='')
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    icon_emoji = models.CharField(max_length=8, blank=True)
    icon_name = models.CharField(max_length=64, blank=True)
    color_class = models.CharField(max_length=64, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'label_fr']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class ActivityIntensityLevel(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True, default='')
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True, default='')
    description_en = models.TextField(blank=True, default='')
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    icon_emoji = models.CharField(max_length=8, blank=True)
    icon_name = models.CharField(max_length=64, blank=True, default='')
    level_value = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'level_value']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class ActivityInterest(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True, default='')
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True, default='')
    description_en = models.TextField(blank=True, default='')
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    category = models.ForeignKey(
        ActivityCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='interests',
    )
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'label_fr']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class ActivityAvoidance(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True, default='')
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True, default='')
    description_en = models.TextField(blank=True, default='')
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    category = models.ForeignKey(
        ActivityCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='avoidances',
    )
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'label_fr']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class AccommodationBaseModel(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True)
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    icon_emoji = models.CharField(max_length=8, blank=True)
    icon_name = models.CharField(max_length=64, blank=True, default='')
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        abstract = True
        ordering = ['display_order', 'label_fr']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class AccommodationType(AccommodationBaseModel):
    pass


class AccommodationAmenity(AccommodationBaseModel):
    category = models.CharField(max_length=120, blank=True)


class AccommodationLocation(AccommodationBaseModel):
    pass


class AccommodationAccessibilityFeature(AccommodationBaseModel):
    pass


class AccommodationSecurityFeature(AccommodationBaseModel):
    pass


class AccommodationAmbiance(AccommodationBaseModel):
    pass


class DietaryRestriction(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True)
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    icon_emoji = models.CharField(max_length=8, blank=True)
    icon_name = models.CharField(max_length=64, blank=True, default='')
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'label_fr']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class CuisineType(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True)
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    region = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'label_fr']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class CulinaryAdventureLevel(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True)
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    level_value = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'level_value']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class RestaurantCategory(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True)
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    icon_emoji = models.CharField(max_length=8, blank=True)
    icon_name = models.CharField(max_length=64, blank=True, default='')
    price_range_min = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    price_range_max = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'label_fr']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class TravelGroupType(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True)
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=64, blank=True)
    color = models.CharField(max_length=32, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'label_fr']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class TravelGroupSubtype(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    travel_group_type = models.ForeignKey(TravelGroupType, related_name='subtypes', on_delete=models.CASCADE)
    code = models.CharField(max_length=64)
    label_fr = models.CharField(max_length=255)
    label_en = models.CharField(max_length=255, blank=True)
    label_es = models.CharField(max_length=255, blank=True, default='')
    label_de = models.CharField(max_length=255, blank=True, default='')
    label_it = models.CharField(max_length=255, blank=True, default='')
    label_pt = models.CharField(max_length=255, blank=True, default='')
    label_ru = models.CharField(max_length=255, blank=True, default='')
    label_ja = models.CharField(max_length=255, blank=True, default='')
    label_zh = models.CharField(max_length=255, blank=True, default='')
    label_hi = models.CharField(max_length=255, blank=True, default='')
    label_ar = models.CharField(max_length=255, blank=True, default='')
    description_fr = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_es = models.TextField(blank=True, default='')
    description_de = models.TextField(blank=True, default='')
    description_it = models.TextField(blank=True, default='')
    description_pt = models.TextField(blank=True, default='')
    description_ru = models.TextField(blank=True, default='')
    description_ja = models.TextField(blank=True, default='')
    description_zh = models.TextField(blank=True, default='')
    description_hi = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=64, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ('travel_group_type', 'code')
        ordering = ['display_order', 'label_fr']

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class TravelGroupConfiguration(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    travel_group_type = models.OneToOneField(TravelGroupType, related_name='configuration', on_delete=models.CASCADE)
    has_fixed_size = models.BooleanField(default=False)
    fixed_size = models.PositiveSmallIntegerField(null=True, blank=True)
    min_size = models.PositiveSmallIntegerField(null=True, blank=True)
    max_size = models.PositiveSmallIntegerField(null=True, blank=True)
    default_size = models.PositiveSmallIntegerField(null=True, blank=True)
    allows_children = models.BooleanField(default=True)
    min_child_age = models.PositiveSmallIntegerField(null=True, blank=True)
    max_child_age = models.PositiveSmallIntegerField(null=True, blank=True)
    requires_size_input = models.BooleanField(default=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"Config {self.travel_group_type.code}"


class DifficultyLevel(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    label_fr = models.CharField(max_length=120)
    label_en = models.CharField(max_length=120, blank=True)
    label_es = models.CharField(max_length=120, blank=True, default='')
    label_de = models.CharField(max_length=120, blank=True, default='')
    label_it = models.CharField(max_length=120, blank=True, default='')
    label_pt = models.CharField(max_length=120, blank=True, default='')
    label_ru = models.CharField(max_length=120, blank=True, default='')
    label_ja = models.CharField(max_length=120, blank=True, default='')
    label_zh = models.CharField(max_length=120, blank=True, default='')
    label_hi = models.CharField(max_length=120, blank=True, default='')
    label_ar = models.CharField(max_length=120, blank=True, default='')
    level_value = models.PositiveSmallIntegerField(default=1)
    is_child_friendly = models.BooleanField(default=True)
    is_senior_friendly = models.BooleanField(default=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.label_fr


class TouristPoint(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Brouillon'
        PENDING = 'pending_validation', 'En attente'
        UNDER_REVIEW = 'under_review', 'En cours de revue'
        APPROVED = 'approved', 'Approuvé'
        REJECTED = 'rejected', 'Rejeté'
        BLOCKED = 'blocked', 'Bloqué'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='tourist_points', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=64, blank=True)
    website_url = models.URLField(blank=True)
    price_range = models.CharField(max_length=64, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    review_count = models.PositiveIntegerField(default=0)
    budget_level = models.ForeignKey(BudgetLevel, null=True, blank=True, on_delete=models.SET_NULL)
    difficulty_level = models.ForeignKey(DifficultyLevel, null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    backend = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    rejection_reason = models.TextField(blank=True)
    blocked_reason = models.TextField(blank=True)
    validation_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    submission_count = models.PositiveIntegerField(default=0)
    is_restaurant = models.BooleanField(default=False)
    is_accommodation = models.BooleanField(default=False)
    is_activity = models.BooleanField(default=False)
    amenities = models.JSONField(default=list, blank=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name='tourist_points')
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['name']
        indexes = [
            # Requêtes carte par fenêtre lat/lon (essentiel à grande échelle, ex. import Overture mondial).
            models.Index(fields=['latitude', 'longitude'], name='poi_lat_lon_idx'),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class POIMedia(TimeStampedModel):
    tourist_point = models.ForeignKey(TouristPoint, related_name='media', on_delete=models.CASCADE)
    kind = models.CharField(max_length=32, default='image')
    file = models.FileField(upload_to='poi-media/', blank=True)
    external_url = models.URLField(blank=True)
    alt_text = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.tourist_point.name} - {self.kind}"


class POIConversation(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tourist_point = models.OneToOneField(TouristPoint, related_name='conversation', on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-last_message_at', '-created_at']

    def touch(self):  # pragma: no cover - helper
        self.last_message_at = timezone.now()
        self.save(update_fields=['last_message_at'])

    def __str__(self) -> str:  # pragma: no cover
        return f"Conversation for {self.tourist_point.name}"


class POIConversationMessage(TimeStampedModel):
    MESSAGE_TYPES = [
        ('comment', 'Commentaire'),
        ('status_change', 'Changement de statut'),
        ('request_info', 'Demande d’information'),
        ('justification', 'Justification'),
    ]
    SENDER_TYPES = [
        ('admin', 'Admin'),
        ('partner', 'Partner'),
    ]

    conversation = models.ForeignKey(POIConversation, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='poi_messages', on_delete=models.CASCADE)
    sender_type = models.CharField(max_length=16, choices=SENDER_TYPES)
    message_type = models.CharField(max_length=32, choices=MESSAGE_TYPES, default='comment')
    content = models.TextField()

    class Meta:
        ordering = ['created_at']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.conversation_id} - {self.sender_type}"


class POIClaim(TimeStampedModel):
    """Revendication de gestion d'un POI par un utilisateur (« ce lieu m'appartient »).

    Validée par un admin → l'utilisateur devient partenaire et gère le POI.
    Calqué sur PartnerApplication (motivation + statut + reviewed_by).
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        APPROVED = 'approved', 'Approuvée'
        REJECTED = 'rejected', 'Rejetée'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tourist_point = models.ForeignKey(TouristPoint, related_name='claims', on_delete=models.CASCADE)
    claimed_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='poi_claims', on_delete=models.CASCADE)
    motivation = models.TextField()
    proof_url = models.URLField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='reviewed_poi_claims',
    )
    review_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['tourist_point', 'claimed_by'],
                condition=models.Q(status='pending'),
                name='uniq_pending_claim_per_user_poi',
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Claim {self.tourist_point_id} by {self.claimed_by_id} ({self.status})"


class POISuggestion(TimeStampedModel):
    """Suggestion d'enrichissement « wiki » d'un POI (modérée par un admin).

    `proposed_changes` = dict plat champ→valeur (whitelist SUGGESTABLE_FIELDS).
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        APPROVED = 'approved', 'Approuvée'
        REJECTED = 'rejected', 'Rejetée'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tourist_point = models.ForeignKey(TouristPoint, related_name='suggestions', on_delete=models.CASCADE)
    suggested_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='poi_suggestions', on_delete=models.CASCADE)
    proposed_changes = models.JSONField(default=dict)
    comment = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='reviewed_poi_suggestions',
    )
    review_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:  # pragma: no cover
        return f"Suggestion {self.tourist_point_id} by {self.suggested_by_id} ({self.status})"


class POITranslationQueue(TimeStampedModel):
    """File d'attente de traduction d'un POI vers une langue (vidée par le cron worker
    translategemma:4b). Une entrée par (POI, langue) ; le résultat va dans
    TouristPoint.metadata['translations'][lang]."""
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        DONE = 'done', 'Traduit'
        FAILED = 'failed', 'Échec'

    tourist_point = models.ForeignKey(TouristPoint, related_name='translation_jobs', on_delete=models.CASCADE)
    lang = models.CharField(max_length=8)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.CharField(max_length=255, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['tourist_point', 'lang'], name='uniq_poi_lang_translation'),
        ]
        indexes = [models.Index(fields=['status', 'created_at'], name='poitransq_status_idx')]

    def __str__(self) -> str:  # pragma: no cover
        return f"TranslationJob {self.tourist_point_id} {self.lang} ({self.status})"


class POIReport(TimeStampedModel):
    """Signalement d'un POI par un utilisateur connecté. Au 1er signalement le POI est
    gelé (is_active=False, status=under_review) jusqu'à décision admin (supprimer/garder)."""
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        RESOLVED_DELETED = 'resolved_deleted', 'Supprimé'
        RESOLVED_KEPT = 'resolved_kept', 'Conservé'

    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam / publicité'
        OFFENSIVE = 'offensive', 'Contenu offensant'
        WRONG_LOCATION = 'wrong_location', 'Mauvaise localisation'
        CLOSED = 'closed', 'Lieu fermé / inexistant'
        DUPLICATE = 'duplicate', 'Doublon'
        OTHER = 'other', 'Autre'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tourist_point = models.ForeignKey(TouristPoint, related_name='reports', on_delete=models.CASCADE)
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='poi_reports', on_delete=models.CASCADE)
    reason = models.CharField(max_length=20, choices=Reason.choices, default=Reason.OTHER)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    previous_status = models.CharField(max_length=32, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='reviewed_poi_reports',
    )
    review_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['tourist_point', 'reported_by'],
                condition=models.Q(status='pending'),
                name='uniq_pending_report_per_user',
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Report {self.tourist_point_id} by {self.reported_by_id} ({self.status})"


class FavoriteTouristPoint(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='favorite_tourist_points',
        on_delete=models.CASCADE,
    )
    tourist_point = models.ForeignKey(
        TouristPoint,
        related_name='favorite_entries',
        on_delete=models.CASCADE,
    )

    class Meta:
        unique_together = ('user', 'tourist_point')
        ordering = ['-created_at']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user_id} -> {self.tourist_point_id}"


class TouristPointReview(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tourist_point = models.ForeignKey(
        TouristPoint,
        related_name='reviews',
        on_delete=models.CASCADE,
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='tourist_point_reviews',
        on_delete=models.CASCADE,
    )
    rating = models.PositiveSmallIntegerField(
        default=5,
        help_text='Rating from 1 to 5'
    )
    comment = models.TextField()

    class Meta:
        unique_together = ('tourist_point', 'reviewer')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tourist_point', '-created_at']),
            models.Index(fields=['reviewer', '-created_at']),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Review by {self.reviewer_id} for {self.tourist_point.name}"
