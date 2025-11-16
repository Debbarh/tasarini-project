from __future__ import annotations

from rest_framework import serializers

from .models import (
    AdvertisementSetting,
    DiscoveryItinerary,
    SavedItinerary,
    Story,
    StoryBookmark,
    StoryComment,
    StoryLike,
    StoryLink,
    StoryMedia,
)


class StoryMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoryMedia
        fields = ['id', 'file', 'external_url', 'caption']
        read_only_fields = ('id',)


class StoryCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.display_name', read_only=True)

    class Meta:
        model = StoryComment
        fields = ['id', 'story', 'author', 'author_name', 'content', 'sentiment', 'created_at']
        read_only_fields = ('id', 'author', 'created_at', 'author_name')


class StoryLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoryLink
        fields = ['id', 'linked_type', 'linked_id']
        read_only_fields = ('id',)


class AdvertisementSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdvertisementSetting
        fields = [
            'id',
            'video_type',
            'video_url',
            'is_enabled',
            'title',
            'description',
            'duration_seconds',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')


class StorySerializer(serializers.ModelSerializer):
    media = StoryMediaSerializer(many=True, read_only=True)
    comments = StoryCommentSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source='author.display_name', read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    travel_story_links = StoryLinkSerializer(source='links', many=True, read_only=True)
    linked_entities = StoryLinkSerializer(source='links', many=True, write_only=True, required=False)

    class Meta:
        model = Story
        fields = [
            'id',
            'author',
            'author_name',
            'title',
            'content',
            'cover_image',
            'tourist_point',
            'tags',
            'media_images',
            'media_videos',
            'location_name',
            'location_lat',
            'location_lon',
            'trip_date',
            'story_type',
            'ai_generated_from',
            'is_public',
            'is_featured',
            'is_verified',
            'likes_count',
            'views_count',
            'comments_count',
            'shares_count',
            'published_at',
            'media',
            'comments',
            'travel_story_links',
            'linked_entities',
            'created_at',
            'updated_at',
        ]
        read_only_fields = (
            'id',
            'author',
            'author_name',
            'likes_count',
            'comments_count',
            'views_count',
            'shares_count',
            'travel_story_links',
            'created_at',
            'updated_at',
        )

    def create(self, validated_data):
        links = validated_data.pop('links', [])
        story = super().create(validated_data)
        self._sync_links(story, links)
        return story

    def update(self, instance, validated_data):
        links = validated_data.pop('links', None)
        story = super().update(instance, validated_data)
        if links is not None:
            story.links.all().delete()
            self._sync_links(story, links)
        return story

    @staticmethod
    def _sync_links(story: Story, links: list[dict]):
        if not links:
            return
        StoryLink.objects.bulk_create(
            [
                StoryLink(story=story, linked_type=link['linked_type'], linked_id=link['linked_id'])
                for link in links
            ]
        )


class DiscoveryItinerarySerializer(serializers.ModelSerializer):
    user_display_name = serializers.CharField(source='user.display_name', read_only=True)

    class Meta:
        model = DiscoveryItinerary
        fields = [
            'id',
            'user',
            'user_display_name',
            'title',
            'description',
            'poi_ids',
            'estimated_duration_hours',
            'total_distance_km',
            'difficulty_level',
            'is_public',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'user', 'user_display_name', 'created_at', 'updated_at')


class SavedItinerarySerializer(serializers.ModelSerializer):
    user_display_name = serializers.CharField(source='user.display_name', read_only=True)

    class Meta:
        model = SavedItinerary
        fields = [
            'id',
            'user',
            'user_display_name',
            'title',
            'description',
            'itinerary_data',
            'destination_summary',
            'trip_duration',
            'travel_dates',
            'is_favorite',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'user', 'user_display_name', 'created_at', 'updated_at')
