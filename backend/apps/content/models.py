from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.poi.models import TouristPoint


class Story(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='stories', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    content = models.TextField(default='')
    cover_image = models.URLField(blank=True)
    tourist_point = models.ForeignKey(TouristPoint, null=True, blank=True, on_delete=models.SET_NULL)
    tags = models.JSONField(default=list, blank=True)
    media_images = models.JSONField(default=list, blank=True)
    media_videos = models.JSONField(default=list, blank=True)
    location_name = models.CharField(max_length=255, blank=True)
    location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    trip_date = models.DateField(null=True, blank=True)
    story_type = models.CharField(max_length=32, default='user')
    ai_generated_from = models.CharField(max_length=255, blank=True)
    is_public = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    likes_count = models.PositiveIntegerField(default=0)
    views_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)
    shares_count = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class StoryMedia(models.Model):
    story = models.ForeignKey(Story, related_name='media', on_delete=models.CASCADE)
    file = models.FileField(upload_to='story-media/', blank=True)
    external_url = models.URLField(blank=True)
    caption = models.CharField(max_length=255, blank=True)


class StoryComment(models.Model):
    story = models.ForeignKey(Story, related_name='comments', on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    sentiment = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class StoryLike(models.Model):
    story = models.ForeignKey(Story, related_name='likes', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='story_likes', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'user')


class StoryBookmark(models.Model):
    story = models.ForeignKey(Story, related_name='bookmarks', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='story_bookmarks', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'user')


class StoryLink(models.Model):
    story = models.ForeignKey(Story, related_name='links', on_delete=models.CASCADE)
    linked_type = models.CharField(max_length=50)
    linked_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)


class AdvertisementSetting(models.Model):
    VIDEO_TYPE_CHOICES = [
        ('link', 'Lien'),
        ('upload', 'Upload'),
    ]

    video_type = models.CharField(max_length=16, choices=VIDEO_TYPE_CHOICES, default='link')
    video_url = models.URLField(blank=True)
    is_enabled = models.BooleanField(default=False)
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    duration_seconds = models.PositiveIntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class DiscoveryItinerary(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'easy'),
        ('medium', 'medium'),
        ('hard', 'hard'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='discovery_itineraries', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    poi_ids = models.JSONField(default=list, blank=True)
    estimated_duration_hours = models.PositiveIntegerField(default=0)
    total_distance_km = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    difficulty_level = models.CharField(max_length=16, choices=DIFFICULTY_CHOICES, default='easy')
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class SavedItinerary(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='saved_itineraries', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    itinerary_data = models.JSONField()
    destination_summary = models.CharField(max_length=512, blank=True)
    trip_duration = models.PositiveIntegerField(default=0)
    travel_dates = models.JSONField(default=dict, blank=True)
    is_favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):  # pragma: no cover
        return self.title
