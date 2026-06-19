from __future__ import annotations

import uuid

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
        indexes = [
            # Index for filtering by story type, visibility, and sorting by date
            models.Index(fields=['story_type', 'is_public', '-created_at'], name='story_type_public_idx'),
            # Index for location searches
            models.Index(fields=['location_name'], name='story_location_idx'),
            # Index for date filtering
            models.Index(fields=['trip_date'], name='story_trip_date_idx'),
            # Index for featured stories sorting
            models.Index(fields=['is_featured', '-likes_count'], name='story_featured_likes_idx'),
            # Index for author's stories
            models.Index(fields=['author', '-created_at'], name='story_author_date_idx'),
            # Index for public stories by popularity
            models.Index(fields=['is_public', '-likes_count', '-created_at'], name='story_popular_idx'),
        ]


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


class StoryAIProviderConfig(models.Model):
    """Configuration for AI providers used in story generation"""
    class Provider(models.TextChoices):
        OPENAI = 'openai', 'OpenAI'
        GEMINI = 'gemini', 'Gemini'
        PERPLEXITY = 'perplexity', 'Perplexity'
        OLLAMA = 'ollama', 'Ollama (local)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=50, choices=Provider.choices, unique=True)
    display_name = models.CharField(max_length=100)
    is_enabled = models.BooleanField(default=False)
    model_name = models.CharField(max_length=150, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=2, default=0.70)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_name']
        verbose_name = 'Story AI Provider Configuration'
        verbose_name_plural = 'Story AI Provider Configurations'

    def __str__(self) -> str:
        return f"{self.get_provider_display()} ({'actif' if self.is_enabled else 'inactif'})"


class ContentReport(models.Model):
    """User reports for inappropriate content (stories or comments)"""
    class ReportType(models.TextChoices):
        SPAM = 'spam', 'Spam'
        HARASSMENT = 'harassment', 'Harcèlement'
        HATE_SPEECH = 'hate_speech', 'Discours haineux'
        INAPPROPRIATE = 'inappropriate', 'Contenu inapproprié'
        MISINFORMATION = 'misinformation', 'Désinformation'
        COPYRIGHT = 'copyright', 'Violation de droits d\'auteur'
        OTHER = 'other', 'Autre'

    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        REVIEWING = 'reviewing', 'En cours de révision'
        RESOLVED = 'resolved', 'Résolu'
        DISMISSED = 'dismissed', 'Rejeté'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='content_reports',
        on_delete=models.CASCADE
    )
    report_type = models.CharField(max_length=32, choices=ReportType.choices)
    reason = models.TextField()

    # Reported content - either story or comment
    reported_story = models.ForeignKey(
        Story,
        null=True,
        blank=True,
        related_name='reports',
        on_delete=models.CASCADE
    )
    reported_comment = models.ForeignKey(
        StoryComment,
        null=True,
        blank=True,
        related_name='reports',
        on_delete=models.CASCADE
    )

    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    moderator_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        related_name='reviewed_reports',
        on_delete=models.SET_NULL
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at'], name='report_status_idx'),
            models.Index(fields=['reporter', '-created_at'], name='report_reporter_idx'),
            models.Index(fields=['report_type'], name='report_type_idx'),
        ]

    def __str__(self) -> str:
        content_type = 'Story' if self.reported_story else 'Comment'
        return f"{content_type} report by {self.reporter.username} - {self.get_report_type_display()}"


class ModerationAction(models.Model):
    """Record of moderation actions taken on content"""
    class ActionType(models.TextChoices):
        WARNING = 'warning', 'Avertissement'
        CONTENT_HIDDEN = 'content_hidden', 'Contenu masqué'
        CONTENT_DELETED = 'content_deleted', 'Contenu supprimé'
        USER_SUSPENDED = 'user_suspended', 'Utilisateur suspendu'
        USER_BANNED = 'user_banned', 'Utilisateur banni'
        SPAM_DETECTED = 'spam_detected', 'Spam détecté'
        APPROVED = 'approved', 'Approuvé'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='moderation_actions',
        on_delete=models.SET_NULL,
        null=True
    )
    action_type = models.CharField(max_length=32, choices=ActionType.choices)
    reason = models.TextField()

    # Target of the action
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        related_name='received_moderation_actions',
        on_delete=models.CASCADE
    )
    target_story = models.ForeignKey(
        Story,
        null=True,
        blank=True,
        related_name='moderation_actions',
        on_delete=models.CASCADE
    )
    target_comment = models.ForeignKey(
        StoryComment,
        null=True,
        blank=True,
        related_name='moderation_actions',
        on_delete=models.CASCADE
    )

    # Link to the report that triggered this action (if any)
    related_report = models.ForeignKey(
        ContentReport,
        null=True,
        blank=True,
        related_name='actions',
        on_delete=models.SET_NULL
    )

    is_automated = models.BooleanField(default=False)  # True if action was taken by spam filter
    metadata = models.JSONField(default=dict, blank=True)  # Additional context
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_user', '-created_at'], name='mod_action_user_idx'),
            models.Index(fields=['action_type', '-created_at'], name='mod_action_type_idx'),
            models.Index(fields=['is_automated'], name='mod_action_auto_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.get_action_type_display()} - {self.created_at.strftime('%Y-%m-%d')}"


class SpamPattern(models.Model):
    """Patterns used for spam detection"""
    class PatternType(models.TextChoices):
        KEYWORD = 'keyword', 'Mot-clé'
        REGEX = 'regex', 'Expression régulière'
        URL_PATTERN = 'url', 'Pattern d\'URL'
        REPEATED_TEXT = 'repeated', 'Texte répété'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pattern_type = models.CharField(max_length=32, choices=PatternType.choices)
    pattern = models.TextField()  # The actual pattern to match
    description = models.CharField(max_length=255)
    severity = models.PositiveSmallIntegerField(default=5)  # 1-10 scale
    is_active = models.BooleanField(default=True)
    auto_action = models.CharField(
        max_length=32,
        choices=ModerationAction.ActionType.choices,
        default=ModerationAction.ActionType.WARNING
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-severity', '-created_at']

    def __str__(self) -> str:
        return f"{self.get_pattern_type_display()}: {self.description}"


class StoryCollection(models.Model):
    """Collection/Album of stories grouped by theme or topic"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='story_collections',
        on_delete=models.CASCADE
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cover_image = models.URLField(blank=True)
    stories = models.ManyToManyField(
        Story,
        related_name='collections',
        blank=True,
        through='StoryCollectionItem'
    )
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['author', '-created_at'], name='collection_author_idx'),
            models.Index(fields=['is_public', '-created_at'], name='collection_public_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.title} by {self.author.username}"


class StoryCollectionItem(models.Model):
    """Through model for story-collection relationship with ordering"""
    collection = models.ForeignKey(StoryCollection, on_delete=models.CASCADE)
    story = models.ForeignKey(Story, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'added_at']
        unique_together = ('collection', 'story')

    def __str__(self) -> str:
        return f"{self.story.title} in {self.collection.title}"


class StoryDraft(models.Model):
    """Draft version of a story before publishing"""
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Brouillon'
        SCHEDULED = 'scheduled', 'Planifié'
        PUBLISHED = 'published', 'Publié'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='story_drafts',
        on_delete=models.CASCADE
    )
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True)
    cover_image = models.URLField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    location_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)

    # Scheduling
    scheduled_for = models.DateTimeField(null=True, blank=True)
    auto_publish = models.BooleanField(default=False)

    # Link to published story
    published_story = models.ForeignKey(
        Story,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='drafts'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['author', '-updated_at'], name='draft_author_idx'),
            models.Index(fields=['status'], name='draft_status_idx'),
            models.Index(fields=['scheduled_for'], name='draft_scheduled_idx'),
        ]

    def __str__(self) -> str:
        return f"Draft: {self.title or 'Untitled'} by {self.author.username}"


class StorySeries(models.Model):
    """Series of related stories (e.g., travel journey across multiple countries)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='story_series',
        on_delete=models.CASCADE
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cover_image = models.URLField(blank=True)
    stories = models.ManyToManyField(
        Story,
        related_name='series',
        blank=True,
        through='StorySeriesItem'
    )
    is_public = models.BooleanField(default=True)
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Story Series'
        indexes = [
            models.Index(fields=['author', '-created_at'], name='series_author_idx'),
            models.Index(fields=['is_public', '-created_at'], name='series_public_idx'),
        ]

    def __str__(self) -> str:
        return f"Series: {self.title} by {self.author.username}"


class StorySeriesItem(models.Model):
    """Through model for story-series relationship with strict ordering"""
    series = models.ForeignKey(StorySeries, on_delete=models.CASCADE)
    story = models.ForeignKey(Story, on_delete=models.CASCADE)
    order = models.PositiveIntegerField()
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        unique_together = ('series', 'story')
        unique_together = [('series', 'order')]  # Ensure unique ordering within series

    def __str__(self) -> str:
        return f"{self.order}. {self.story.title} in {self.series.title}"


class StoryShare(models.Model):
    """Track story shares on social media platforms"""

    class Platform(models.TextChoices):
        FACEBOOK = 'facebook', 'Facebook'
        TWITTER = 'twitter', 'Twitter (X)'
        LINKEDIN = 'linkedin', 'LinkedIn'
        WHATSAPP = 'whatsapp', 'WhatsApp'
        TELEGRAM = 'telegram', 'Telegram'
        EMAIL = 'email', 'Email'
        COPY_LINK = 'copy_link', 'Copier le lien'
        EMBED = 'embed', 'Code d\'intégration'
        OTHER = 'other', 'Autre'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='shares')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='story_shares'
    )
    platform = models.CharField(max_length=32, choices=Platform.choices)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['story', '-created_at']),
            models.Index(fields=['platform', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self) -> str:
        return f"{self.story.title} shared on {self.platform}"


class StoryMedia(models.Model):
    """
    Track individual media items uploaded for stories with metadata and variants.
    Supports images and videos with automatic optimization and multiple sizes.
    """

    class MediaType(models.TextChoices):
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Vidéo'

    class ProcessingStatus(models.TextChoices):
        PENDING = 'pending', 'En attente'
        PROCESSING = 'processing', 'En traitement'
        COMPLETED = 'completed', 'Terminé'
        FAILED = 'failed', 'Échoué'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='story_media'
    )
    story = models.ForeignKey(
        'Story',
        on_delete=models.CASCADE,
        related_name='media_items',
        null=True,
        blank=True,
        help_text="Story this media belongs to (null if in library only)"
    )

    # File information
    media_type = models.CharField(max_length=10, choices=MediaType.choices)
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="Size in bytes")
    mime_type = models.CharField(max_length=100)

    # URLs for different sizes (images) or formats (videos)
    url_original = models.URLField(help_text="Original uploaded file")
    url_large = models.URLField(blank=True, help_text="Large size (1920px)")
    url_medium = models.URLField(blank=True, help_text="Medium size (1024px)")
    url_thumbnail = models.URLField(blank=True, help_text="Thumbnail (300px)")
    url_webp = models.URLField(blank=True, help_text="WebP optimized version")

    # Image metadata
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    duration = models.PositiveIntegerField(null=True, blank=True, help_text="Video duration in seconds")

    # Processing status
    processing_status = models.CharField(
        max_length=20,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.PENDING
    )
    processing_error = models.TextField(blank=True)

    # Metadata
    alt_text = models.CharField(max_length=255, blank=True, help_text="Accessibility alt text")
    caption = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order in story")

    # Storage paths
    storage_path_original = models.CharField(max_length=500)
    storage_path_variants = models.JSONField(
        default=dict,
        blank=True,
        help_text="Paths to generated variants"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='media_user_idx'),
            models.Index(fields=['story', 'order'], name='media_story_order_idx'),
            models.Index(fields=['media_type', '-created_at'], name='media_type_idx'),
            models.Index(fields=['processing_status'], name='media_status_idx'),
        ]

    def __str__(self) -> str:
        story_info = f" for {self.story.title}" if self.story else " (library)"
        return f"{self.media_type} {self.original_filename}{story_info}"

    @property
    def is_image(self) -> bool:
        """Check if media is an image"""
        return self.media_type == self.MediaType.IMAGE

    @property
    def is_video(self) -> bool:
        """Check if media is a video"""
        return self.media_type == self.MediaType.VIDEO

    @property
    def is_processed(self) -> bool:
        """Check if media processing is complete"""
        return self.processing_status == self.ProcessingStatus.COMPLETED

    def get_best_url(self, size: str = 'medium') -> str:
        """
        Get the best available URL for requested size.

        Args:
            size: Requested size ('thumbnail', 'medium', 'large', 'original')

        Returns:
            URL of the requested size, or best available fallback
        """
        size_map = {
            'thumbnail': self.url_thumbnail,
            'medium': self.url_medium,
            'large': self.url_large,
            'original': self.url_original,
        }

        requested_url = size_map.get(size, self.url_medium)
        if requested_url:
            return requested_url

        # Fallback logic: try to find any available size
        for fallback_size in ['medium', 'large', 'original', 'thumbnail']:
            fallback_url = size_map.get(fallback_size)
            if fallback_url:
                return fallback_url

        return self.url_original


class StoryReaction(models.Model):
    """
    Rich reactions to stories (beyond simple likes).
    Supports multiple reaction types like love, laugh, wow, sad, angry, etc.
    """

    class ReactionType(models.TextChoices):
        LIKE = 'like', '👍 J\'aime'
        LOVE = 'love', '❤️ J\'adore'
        LAUGH = 'laugh', '😂 Drôle'
        WOW = 'wow', '😮 Wow'
        SAD = 'sad', '😢 Triste'
        ANGRY = 'angry', '😠 En colère'
        THINKING = 'thinking', '🤔 Réfléchir'
        CELEBRATE = 'celebrate', '🎉 Célébrer'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    story = models.ForeignKey(
        'Story',
        on_delete=models.CASCADE,
        related_name='reactions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='story_reactions'
    )
    reaction_type = models.CharField(
        max_length=20,
        choices=ReactionType.choices,
        default=ReactionType.LIKE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # User can have only one reaction per story (but can change type)
        unique_together = ('story', 'user')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['story', '-created_at'], name='reaction_story_idx'),
            models.Index(fields=['user', '-created_at'], name='reaction_user_idx'),
            models.Index(fields=['reaction_type'], name='reaction_type_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} {self.reaction_type} on {self.story.title}"


class CommentReaction(models.Model):
    """Reactions to comments"""

    class ReactionType(models.TextChoices):
        LIKE = 'like', '👍 J\'aime'
        LOVE = 'love', '❤️ J\'adore'
        LAUGH = 'laugh', '😂 Drôle'
        THINKING = 'thinking', '🤔 Réfléchir'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comment = models.ForeignKey(
        'StoryComment',
        on_delete=models.CASCADE,
        related_name='reactions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comment_reactions'
    )
    reaction_type = models.CharField(
        max_length=20,
        choices=ReactionType.choices,
        default=ReactionType.LIKE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('comment', 'user')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['comment', '-created_at'], name='cmnt_reaction_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} {self.reaction_type} on comment"


class StoryMention(models.Model):
    """
    Track @mentions in stories and comments.
    Automatically extracted from content when stories/comments are created or updated.
    """

    class MentionContext(models.TextChoices):
        STORY = 'story', 'Story'
        COMMENT = 'comment', 'Commentaire'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who mentioned whom
    mentioned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mentions_made'
    )
    mentioned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mentions_received'
    )

    # Context (where the mention occurred)
    context_type = models.CharField(
        max_length=20,
        choices=MentionContext.choices
    )
    story = models.ForeignKey(
        'Story',
        on_delete=models.CASCADE,
        related_name='mentions',
        null=True,
        blank=True
    )
    comment = models.ForeignKey(
        'StoryComment',
        on_delete=models.CASCADE,
        related_name='mentions',
        null=True,
        blank=True
    )

    # Notification tracking
    notification_sent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['mentioned_user', '-created_at'], name='mention_user_idx'),
            models.Index(fields=['story'], name='mention_story_idx'),
            models.Index(fields=['notification_sent'], name='mention_notif_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.mentioned_by.username} mentioned {self.mentioned_user.username}"
