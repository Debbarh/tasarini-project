from __future__ import annotations

import re
from urllib.parse import urlparse

import bleach
from rest_framework import serializers

from .models import (
    AdvertisementSetting,
    CommentReaction,
    ContentReport,
    DiscoveryItinerary,
    ModerationAction,
    SavedItinerary,
    SpamPattern,
    Story,
    StoryAIProviderConfig,
    StoryBookmark,
    StoryCollection,
    StoryComment,
    StoryDraft,
    StoryLike,
    StoryLink,
    StoryMedia,
    StoryMention,
    StoryReaction,
    StorySeries,
    StoryShare,
)

# Configuration for content validation
ALLOWED_MEDIA_DOMAINS = [
    # Domaine du site (médias uploadés via /media/upload/ → https://tasarini.com/media/...)
    'tasarini.com',
    'localhost',
    '127.0.0.1',
    'cloudinary.com',
    'amazonaws.com',
    's3.amazonaws.com',
    'googleapis.com',
    'azure.com',
    'imgur.com',
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'dailymotion.com',
]

ALLOWED_HTML_TAGS = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote']
ALLOWED_HTML_ATTRS = {'a': ['href', 'title']}

MAX_CONTENT_LENGTH = 50000  # 50KB
MAX_TITLE_LENGTH = 200
MAX_TAG_COUNT = 20
MAX_MEDIA_COUNT = 50


def validate_url_domain(url: str, allowed_domains: list[str]) -> bool:
    """Validate that URL domain is in allowed list"""
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False
        # Check if domain or any parent domain is in allowed list
        domain = parsed.netloc.lower()
        for allowed in allowed_domains:
            if domain == allowed or domain.endswith('.' + allowed):
                return True
        return False
    except Exception:
        return False


def sanitize_html(content: str) -> str:
    """Sanitize HTML content to prevent XSS"""
    return bleach.clean(
        content,
        tags=ALLOWED_HTML_TAGS,
        attributes=ALLOWED_HTML_ATTRS,
        strip=True
    )


class StoryCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = StoryComment
        fields = ['id', 'story', 'author', 'author_name', 'content', 'sentiment', 'created_at']
        read_only_fields = ('id', 'author', 'created_at', 'author_name')

    def get_author_name(self, obj):
        author = getattr(obj, 'author', None)
        if not author:
            return ''
        name = getattr(author, 'display_name', None) or author.get_full_name()
        if name:
            return name
        if getattr(author, 'email', None):
            return author.email.split('@')[0]
        return getattr(author, 'username', '') or f'Utilisateur {author.pk}'


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


class BaseStorySerializer(serializers.ModelSerializer):
    """Base serializer with common fields and methods"""
    comments = StoryCommentSerializer(many=True, read_only=True)
    author_name = serializers.SerializerMethodField()
    author_first_name = serializers.SerializerMethodField()
    author_last_name = serializers.SerializerMethodField()
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
            'author_first_name',
            'author_last_name',
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
            'author_first_name',
            'author_last_name',
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
        # Sanitize content before saving
        if 'content' in validated_data:
            validated_data['content'] = sanitize_html(validated_data['content'])
        story = super().create(validated_data)
        self._sync_links(story, links)
        return story

    def update(self, instance, validated_data):
        links = validated_data.pop('links', None)
        # Sanitize content before saving
        if 'content' in validated_data:
            validated_data['content'] = sanitize_html(validated_data['content'])
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

    def get_author_name(self, obj):
        author = getattr(obj, 'author', None)
        if not author:
            return ''
        name = getattr(author, 'display_name', None) or author.get_full_name()
        if name:
            return name
        if getattr(author, 'email', None):
            return author.email.split('@')[0]
        return getattr(author, 'username', '') or f'Utilisateur {author.pk}'

    def get_author_first_name(self, obj):
        author = getattr(obj, 'author', None)
        if not author:
            return ''
        # Check profile first, then user model
        if hasattr(author, 'profile') and author.profile:
            profile_first_name = getattr(author.profile, 'first_name', '')
            if profile_first_name:
                return profile_first_name
        return getattr(author, 'first_name', '')

    def get_author_last_name(self, obj):
        author = getattr(obj, 'author', None)
        if not author:
            return ''
        # Check profile first, then user model
        if hasattr(author, 'profile') and author.profile:
            profile_last_name = getattr(author.profile, 'last_name', '')
            if profile_last_name:
                return profile_last_name
        return getattr(author, 'last_name', '')


class UserStorySerializer(BaseStorySerializer):
    """Serializer for regular users - admin fields are read-only"""

    class Meta(BaseStorySerializer.Meta):
        read_only_fields = BaseStorySerializer.Meta.read_only_fields + (
            'is_featured',
            'is_verified',
            'story_type',
            'ai_generated_from',
            'published_at',
        )

    def validate_title(self, value):
        """Validate title length"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le titre ne peut pas être vide")
        if len(value) > MAX_TITLE_LENGTH:
            raise serializers.ValidationError(
                f"Le titre ne peut pas dépasser {MAX_TITLE_LENGTH} caractères"
            )
        return value.strip()

    def validate_content(self, value):
        """Validate content length"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le contenu ne peut pas être vide")
        if len(value) > MAX_CONTENT_LENGTH:
            raise serializers.ValidationError(
                f"Le contenu ne peut pas dépasser {MAX_CONTENT_LENGTH} caractères"
            )
        return value

    def validate_tags(self, value):
        """Validate tags count and format"""
        if not value:
            return value
        if len(value) > MAX_TAG_COUNT:
            raise serializers.ValidationError(
                f"Vous ne pouvez pas avoir plus de {MAX_TAG_COUNT} tags"
            )
        # Remove duplicates and empty tags
        cleaned_tags = []
        seen = set()
        for tag in value:
            tag_clean = tag.strip().lower()
            if tag_clean and tag_clean not in seen:
                cleaned_tags.append(tag_clean)
                seen.add(tag_clean)
        return cleaned_tags

    @staticmethod
    def _clean_media_urls(value, label):
        """Déduplique (en préservant l'ordre), valide le domaine, puis applique la limite.

        On déduplique AVANT le contrôle de limite : un bug client a déjà produit des
        milliers de fois la même URL (carrousel ~80k images) ; on veut réduire à 1
        plutôt que rejeter la sauvegarde.
        """
        if not value:
            return value
        # Remove duplicates while preserving order
        unique_urls = []
        seen = set()
        for url in value:
            if url not in seen:
                unique_urls.append(url)
                seen.add(url)
        # Validate each URL domain
        for url in unique_urls:
            if not validate_url_domain(url, ALLOWED_MEDIA_DOMAINS):
                raise serializers.ValidationError(
                    f"Le domaine de l'URL '{url}' n'est pas autorisé"
                )
        if len(unique_urls) > MAX_MEDIA_COUNT:
            raise serializers.ValidationError(
                f"Vous ne pouvez pas avoir plus de {MAX_MEDIA_COUNT} {label}"
            )
        return unique_urls

    def validate_media_images(self, value):
        """Validate media images URLs"""
        return self._clean_media_urls(value, "images")

    def validate_media_videos(self, value):
        """Validate media videos URLs"""
        return self._clean_media_urls(value, "vidéos")


class AdminStorySerializer(BaseStorySerializer):
    """Serializer for admin users - all fields are writable"""
    pass


# Alias for backward compatibility
StorySerializer = UserStorySerializer


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


class StoryAIProviderConfigSerializer(serializers.ModelSerializer):
    """Serializer for AI provider configuration"""

    class Meta:
        model = StoryAIProviderConfig
        fields = [
            'id',
            'provider',
            'display_name',
            'is_enabled',
            'model_name',
            'temperature',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'provider', 'display_name', 'created_at', 'updated_at')


class ContentReportSerializer(serializers.ModelSerializer):
    """Serializer for content reports"""
    reporter_name = serializers.CharField(source='reporter.username', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.username', read_only=True, allow_null=True)
    reported_story_title = serializers.CharField(source='reported_story.title', read_only=True, allow_null=True)

    class Meta:
        model = ContentReport
        fields = [
            'id',
            'reporter',
            'reporter_name',
            'report_type',
            'reason',
            'reported_story',
            'reported_story_title',
            'reported_comment',
            'status',
            'moderator_notes',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = (
            'id',
            'reporter',
            'reporter_name',
            'reviewed_by_name',
            'reported_story_title',
            'created_at',
            'updated_at',
        )

    def validate(self, data):
        """Ensure either story or comment is reported, not both"""
        story = data.get('reported_story')
        comment = data.get('reported_comment')

        if not story and not comment:
            raise serializers.ValidationError(
                "Vous devez signaler soit une story, soit un commentaire"
            )
        if story and comment:
            raise serializers.ValidationError(
                "Vous ne pouvez signaler qu'une story ou un commentaire, pas les deux"
            )

        return data


class ModerationActionSerializer(serializers.ModelSerializer):
    """Serializer for moderation actions"""
    moderator_name = serializers.CharField(source='moderator.username', read_only=True, allow_null=True)
    target_user_name = serializers.CharField(source='target_user.username', read_only=True, allow_null=True)

    class Meta:
        model = ModerationAction
        fields = [
            'id',
            'moderator',
            'moderator_name',
            'action_type',
            'reason',
            'target_user',
            'target_user_name',
            'target_story',
            'target_comment',
            'related_report',
            'is_automated',
            'metadata',
            'created_at',
        ]
        read_only_fields = (
            'id',
            'moderator_name',
            'target_user_name',
            'created_at',
        )


class SpamPatternSerializer(serializers.ModelSerializer):
    """Serializer for spam patterns"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)

    class Meta:
        model = SpamPattern
        fields = [
            'id',
            'pattern_type',
            'pattern',
            'description',
            'severity',
            'is_active',
            'auto_action',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_by', 'created_by_name', 'created_at', 'updated_at')

    def validate_pattern(self, value):
        """Validate regex patterns"""
        pattern_type = self.initial_data.get('pattern_type')
        if pattern_type == 'regex':
            try:
                import re
                re.compile(value)
            except re.error as e:
                raise serializers.ValidationError(f"Expression régulière invalide: {str(e)}")
        return value


class StoryCollectionSerializer(serializers.ModelSerializer):
    """Serializer for story collections"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    stories_count = serializers.SerializerMethodField()
    story_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        source='stories',
        queryset=Story.objects.all(),
        required=False
    )

    class Meta:
        model = StoryCollection
        fields = [
            'id',
            'author',
            'author_name',
            'title',
            'description',
            'cover_image',
            'stories_count',
            'story_ids',
            'is_public',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'author', 'author_name', 'stories_count', 'created_at', 'updated_at')

    def get_stories_count(self, obj):
        return obj.stories.count()


class StoryDraftSerializer(serializers.ModelSerializer):
    """Serializer for story drafts"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    published_story_title = serializers.CharField(
        source='published_story.title',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = StoryDraft
        fields = [
            'id',
            'author',
            'author_name',
            'title',
            'content',
            'cover_image',
            'tags',
            'location_name',
            'status',
            'scheduled_for',
            'auto_publish',
            'published_story',
            'published_story_title',
            'created_at',
            'updated_at',
        ]
        read_only_fields = (
            'id',
            'author',
            'author_name',
            'published_story_title',
            'created_at',
            'updated_at',
        )

    def validate_scheduled_for(self, value):
        """Ensure scheduled_for is in the future"""
        if value:
            from django.utils import timezone
            if value <= timezone.now():
                raise serializers.ValidationError(
                    "La date de publication doit être dans le futur"
                )
        return value


class StorySeriesSerializer(serializers.ModelSerializer):
    """Serializer for story series"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    stories_count = serializers.SerializerMethodField()
    story_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        source='stories',
        queryset=Story.objects.all(),
        required=False
    )

    class Meta:
        model = StorySeries
        fields = [
            'id',
            'author',
            'author_name',
            'title',
            'description',
            'cover_image',
            'stories_count',
            'story_ids',
            'is_public',
            'is_complete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = (
            'id',
            'author',
            'author_name',
            'stories_count',
            'created_at',
            'updated_at',
        )

    def get_stories_count(self, obj):
        return obj.stories.count()


class StoryShareSerializer(serializers.ModelSerializer):
    """Serializer for story shares tracking"""

    class Meta:
        model = StoryShare
        fields = (
            'id',
            'story',
            'user',
            'platform',
            'created_at',
        )
        read_only_fields = ('id', 'user', 'created_at')


class StoryMediaSerializer(serializers.ModelSerializer):
    """Serializer for story media items with metadata"""

    user_username = serializers.CharField(source='user.username', read_only=True)
    story_title = serializers.CharField(source='story.title', read_only=True, allow_null=True)
    is_image = serializers.BooleanField(read_only=True)
    is_video = serializers.BooleanField(read_only=True)
    is_processed = serializers.BooleanField(read_only=True)

    class Meta:
        model = StoryMedia
        fields = (
            'id',
            'user',
            'user_username',
            'story',
            'story_title',
            'media_type',
            'original_filename',
            'file_size',
            'mime_type',
            'url_original',
            'url_large',
            'url_medium',
            'url_thumbnail',
            'url_webp',
            'width',
            'height',
            'duration',
            'processing_status',
            'processing_error',
            'alt_text',
            'caption',
            'order',
            'storage_path_original',
            'storage_path_variants',
            'created_at',
            'updated_at',
            'is_image',
            'is_video',
            'is_processed',
        )
        read_only_fields = (
            'id',
            'user',
            'user_username',
            'story_title',
            'file_size',
            'mime_type',
            'url_original',
            'url_large',
            'url_medium',
            'url_thumbnail',
            'url_webp',
            'width',
            'height',
            'duration',
            'processing_status',
            'processing_error',
            'storage_path_original',
            'storage_path_variants',
            'created_at',
            'updated_at',
            'is_image',
            'is_video',
            'is_processed',
        )

    def get_best_url(self, obj: StoryMedia, size: str = 'medium') -> str:
        """Get best available URL for requested size"""
        return obj.get_best_url(size)


class StoryReactionSerializer(serializers.ModelSerializer):
    """Serializer for story reactions"""

    user_username = serializers.CharField(source='user.username', read_only=True)
    story_title = serializers.CharField(source='story.title', read_only=True)

    class Meta:
        model = StoryReaction
        fields = (
            'id',
            'story',
            'story_title',
            'user',
            'user_username',
            'reaction_type',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'user', 'user_username', 'story_title', 'created_at', 'updated_at')


class CommentReactionSerializer(serializers.ModelSerializer):
    """Serializer for comment reactions"""

    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CommentReaction
        fields = (
            'id',
            'comment',
            'user',
            'user_username',
            'reaction_type',
            'created_at',
        )
        read_only_fields = ('id', 'user', 'user_username', 'created_at')


class StoryMentionSerializer(serializers.ModelSerializer):
    """Serializer for story mentions"""

    mentioned_by_username = serializers.CharField(source='mentioned_by.username', read_only=True)
    mentioned_user_username = serializers.CharField(source='mentioned_user.username', read_only=True)
    story_title = serializers.CharField(source='story.title', read_only=True, allow_null=True)

    class Meta:
        model = StoryMention
        fields = (
            'id',
            'mentioned_by',
            'mentioned_by_username',
            'mentioned_user',
            'mentioned_user_username',
            'context_type',
            'story',
            'story_title',
            'comment',
            'notification_sent',
            'created_at',
        )
        read_only_fields = (
            'id',
            'mentioned_by',
            'mentioned_by_username',
            'mentioned_user_username',
            'story_title',
            'notification_sent',
            'created_at',
        )
