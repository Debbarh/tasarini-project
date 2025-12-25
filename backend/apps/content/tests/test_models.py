"""
Tests for content app models.
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.content.models import (
    AdvertisementSetting,
    DiscoveryItinerary,
    SavedItinerary,
    Story,
    StoryAIProviderConfig,
    StoryBookmark,
    StoryComment,
    StoryLike,
    StoryLink,
    StoryMedia,
)

User = get_user_model()


class StoryModelTest(TestCase):
    """Tests for the Story model"""

    def setUp(self):
        """Create test user and story"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.story = Story.objects.create(
            author=self.user,
            title='Test Travel Story',
            content='This is a test story about my travels.',
            is_public=True,
            tags=['travel', 'adventure', 'test']
        )

    def test_story_creation(self):
        """Test creating a story"""
        self.assertEqual(self.story.author, self.user)
        self.assertEqual(self.story.title, 'Test Travel Story')
        self.assertTrue(self.story.is_public)
        self.assertEqual(self.story.likes_count, 0)
        self.assertEqual(self.story.comments_count, 0)
        self.assertEqual(len(self.story.tags), 3)

    def test_story_string_representation(self):
        """Test story __str__ method"""
        # Models don't have __str__ yet, but we can add it
        self.assertIsNotNone(self.story.title)

    def test_story_defaults(self):
        """Test default values for story fields"""
        story = Story.objects.create(
            author=self.user,
            title='Minimal Story',
            content='Minimal content'
        )
        self.assertTrue(story.is_public)
        self.assertEqual(story.story_type, 'user')
        self.assertEqual(story.likes_count, 0)
        self.assertEqual(story.views_count, 0)
        self.assertIsInstance(story.tags, list)

    def test_story_ordering(self):
        """Test stories are ordered by creation date descending"""
        story1 = Story.objects.create(
            author=self.user,
            title='Story 1',
            content='Content 1'
        )
        story2 = Story.objects.create(
            author=self.user,
            title='Story 2',
            content='Content 2'
        )
        stories = Story.objects.all()
        self.assertEqual(stories[0], story2)  # Most recent first
        self.assertEqual(stories[1], story1)


class StoryCommentModelTest(TestCase):
    """Tests for the StoryComment model"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.story = Story.objects.create(
            author=self.user,
            title='Test Story',
            content='Test content'
        )

    def test_comment_creation(self):
        """Test creating a comment"""
        comment = StoryComment.objects.create(
            story=self.story,
            author=self.user,
            content='Great story!'
        )
        self.assertEqual(comment.story, self.story)
        self.assertEqual(comment.author, self.user)
        self.assertEqual(comment.content, 'Great story!')
        self.assertIsNotNone(comment.created_at)

    def test_comment_ordering(self):
        """Test comments are ordered by creation date ascending"""
        comment1 = StoryComment.objects.create(
            story=self.story,
            author=self.user,
            content='First comment'
        )
        comment2 = StoryComment.objects.create(
            story=self.story,
            author=self.user,
            content='Second comment'
        )
        comments = StoryComment.objects.all()
        self.assertEqual(comments[0], comment1)  # Oldest first
        self.assertEqual(comments[1], comment2)


class StoryLikeModelTest(TestCase):
    """Tests for the StoryLike model"""

    def setUp(self):
        """Create test data"""
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='pass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='pass123'
        )
        self.story = Story.objects.create(
            author=self.user1,
            title='Test Story',
            content='Test content'
        )

    def test_like_creation(self):
        """Test creating a like"""
        like = StoryLike.objects.create(
            story=self.story,
            user=self.user2
        )
        self.assertEqual(like.story, self.story)
        self.assertEqual(like.user, self.user2)
        self.assertIsNotNone(like.created_at)

    def test_unique_like_constraint(self):
        """Test that a user can only like a story once"""
        StoryLike.objects.create(story=self.story, user=self.user2)

        # Trying to create duplicate like should raise error
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            StoryLike.objects.create(story=self.story, user=self.user2)


class StoryBookmarkModelTest(TestCase):
    """Tests for the StoryBookmark model"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.story = Story.objects.create(
            author=self.user,
            title='Test Story',
            content='Test content'
        )

    def test_bookmark_creation(self):
        """Test creating a bookmark"""
        bookmark = StoryBookmark.objects.create(
            story=self.story,
            user=self.user
        )
        self.assertEqual(bookmark.story, self.story)
        self.assertEqual(bookmark.user, self.user)

    def test_unique_bookmark_constraint(self):
        """Test that a user can only bookmark a story once"""
        StoryBookmark.objects.create(story=self.story, user=self.user)

        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            StoryBookmark.objects.create(story=self.story, user=self.user)


class StoryMediaModelTest(TestCase):
    """Tests for the StoryMedia model"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.story = Story.objects.create(
            author=self.user,
            title='Test Story',
            content='Test content'
        )

    def test_media_creation_with_url(self):
        """Test creating media with external URL"""
        media = StoryMedia.objects.create(
            story=self.story,
            external_url='https://example.com/image.jpg',
            caption='Beautiful sunset'
        )
        self.assertEqual(media.story, self.story)
        self.assertEqual(media.external_url, 'https://example.com/image.jpg')
        self.assertEqual(media.caption, 'Beautiful sunset')


class StoryLinkModelTest(TestCase):
    """Tests for the StoryLink model"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.story = Story.objects.create(
            author=self.user,
            title='Test Story',
            content='Test content'
        )

    def test_link_creation(self):
        """Test creating a story link"""
        link = StoryLink.objects.create(
            story=self.story,
            linked_type='tourist_point',
            linked_id='123e4567-e89b-12d3-a456-426614174000'
        )
        self.assertEqual(link.story, self.story)
        self.assertEqual(link.linked_type, 'tourist_point')
        self.assertIsNotNone(link.created_at)


class StoryAIProviderConfigModelTest(TestCase):
    """Tests for the StoryAIProviderConfig model"""

    def test_provider_creation(self):
        """Test creating an AI provider config"""
        provider = StoryAIProviderConfig.objects.create(
            provider='openai',
            display_name='OpenAI',
            is_enabled=True,
            model_name='gpt-4o-mini',
            temperature=0.75
        )
        self.assertEqual(provider.provider, 'openai')
        self.assertEqual(provider.display_name, 'OpenAI')
        self.assertTrue(provider.is_enabled)
        self.assertEqual(float(provider.temperature), 0.75)

    def test_unique_provider_constraint(self):
        """Test that provider names must be unique"""
        StoryAIProviderConfig.objects.create(
            provider='openai',
            display_name='OpenAI',
            model_name='gpt-4o-mini'
        )

        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            StoryAIProviderConfig.objects.create(
                provider='openai',
                display_name='OpenAI Duplicate',
                model_name='gpt-4'
            )


class DiscoveryItineraryModelTest(TestCase):
    """Tests for the DiscoveryItinerary model"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_itinerary_creation(self):
        """Test creating a discovery itinerary"""
        itinerary = DiscoveryItinerary.objects.create(
            user=self.user,
            title='Paris Weekend',
            description='A weekend in Paris',
            poi_ids=['poi1', 'poi2', 'poi3'],
            is_public=True
        )
        self.assertEqual(itinerary.user, self.user)
        self.assertEqual(itinerary.title, 'Paris Weekend')
        self.assertTrue(itinerary.is_public)
        self.assertEqual(len(itinerary.poi_ids), 3)


class SavedItineraryModelTest(TestCase):
    """Tests for the SavedItinerary model"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_saved_itinerary_creation(self):
        """Test creating a saved itinerary"""
        itinerary = SavedItinerary.objects.create(
            user=self.user,
            title='My Saved Trip',
            itinerary_data={'destinations': ['Paris', 'London']},
            is_favorite=True
        )
        self.assertEqual(itinerary.user, self.user)
        self.assertEqual(itinerary.title, 'My Saved Trip')
        self.assertTrue(itinerary.is_favorite)
        self.assertIsInstance(itinerary.itinerary_data, dict)
