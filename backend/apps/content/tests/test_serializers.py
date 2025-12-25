"""
Tests for content app serializers.
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.content.models import Story, StoryComment
from apps.content.serializers import (
    StoryCommentSerializer,
    StoryMediaSerializer,
    UserStorySerializer,
)

User = get_user_model()


class UserStorySerializerTest(TestCase):
    """Tests for UserStorySerializer"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        self.story = Story.objects.create(
            author=self.user,
            title='Test Story',
            content='<p>This is <strong>test</strong> content</p>',
            tags=['travel', 'test'],
            is_public=True
        )

    def test_serialize_story(self):
        """Test serializing a story"""
        serializer = UserStorySerializer(instance=self.story)
        data = serializer.data

        self.assertEqual(data['title'], 'Test Story')
        self.assertEqual(data['author'], self.user.id)
        self.assertIn('author_name', data)
        self.assertTrue(data['is_public'])
        self.assertEqual(len(data['tags']), 2)

    def test_validate_title_length(self):
        """Test title length validation"""
        data = {
            'title': 'A' * 250,  # Too long
            'content': 'Test content',
            'is_public': True
        }
        serializer = UserStorySerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('title', serializer.errors)

    def test_validate_empty_title(self):
        """Test empty title validation"""
        data = {
            'title': '',
            'content': 'Test content',
            'is_public': True
        }
        serializer = UserStorySerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('title', serializer.errors)

    def test_validate_empty_content(self):
        """Test empty content validation"""
        data = {
            'title': 'Test Title',
            'content': '',
            'is_public': True
        }
        serializer = UserStorySerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('content', serializer.errors)

    def test_validate_tags_count(self):
        """Test maximum tags validation"""
        data = {
            'title': 'Test Title',
            'content': 'Test content',
            'tags': ['tag' + str(i) for i in range(25)],  # Too many tags (max 20)
            'is_public': True
        }
        serializer = UserStorySerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('tags', serializer.errors)

    def test_tags_deduplication(self):
        """Test that duplicate tags are removed"""
        data = {
            'title': 'Test Title',
            'content': 'Test content',
            'tags': ['travel', 'TRAVEL', 'Travel', 'adventure'],
            'is_public': True
        }
        serializer = UserStorySerializer(data=data)
        self.assertTrue(serializer.is_valid())
        # Should have only 2 unique tags (travel, adventure)
        self.assertEqual(len(serializer.validated_data['tags']), 2)

    def test_html_sanitization(self):
        """Test that HTML content is sanitized"""
        data = {
            'title': 'Test Title',
            'content': '<p>Safe content</p><script>alert("xss")</script>',
            'is_public': True
        }
        serializer = UserStorySerializer(data=data)
        self.assertTrue(serializer.is_valid())

        # Create story to trigger sanitization
        story = serializer.save(author=self.user)
        # Script tags should be removed
        self.assertNotIn('<script>', story.content)
        self.assertIn('<p>Safe content</p>', story.content)


class StoryCommentSerializerTest(TestCase):
    """Tests for StoryCommentSerializer"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        self.story = Story.objects.create(
            author=self.user,
            title='Test Story',
            content='Test content'
        )

    def test_serialize_comment(self):
        """Test serializing a comment"""
        comment = StoryComment.objects.create(
            story=self.story,
            author=self.user,
            content='Great story!'
        )
        serializer = StoryCommentSerializer(instance=comment)
        data = serializer.data

        self.assertEqual(data['content'], 'Great story!')
        self.assertEqual(data['author'], self.user.id)
        self.assertIn('author_name', data)
        self.assertIn('created_at', data)

    def test_author_name_with_display_name(self):
        """Test author_name uses display_name if available"""
        self.user.display_name = 'Johnny'
        self.user.save()

        comment = StoryComment.objects.create(
            story=self.story,
            author=self.user,
            content='Test comment'
        )
        serializer = StoryCommentSerializer(instance=comment)
        self.assertEqual(serializer.data['author_name'], 'Johnny')

    def test_author_name_fallback_to_email(self):
        """Test author_name falls back to email username"""
        user = User.objects.create_user(
            username='user2',
            email='john.doe@example.com',
            password='pass123'
        )
        comment = StoryComment.objects.create(
            story=self.story,
            author=user,
            content='Test comment'
        )
        serializer = StoryCommentSerializer(instance=comment)
        # Should use part before @ in email
        self.assertEqual(serializer.data['author_name'], 'john.doe')


class StoryMediaSerializerTest(TestCase):
    """Tests for StoryMediaSerializer"""

    def test_serialize_media(self):
        """Test serializing story media"""
        from apps.content.models import StoryMedia

        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        story = Story.objects.create(
            author=user,
            title='Test Story',
            content='Test content'
        )
        media = StoryMedia.objects.create(
            story=story,
            external_url='https://example.com/image.jpg',
            caption='Beautiful view'
        )

        serializer = StoryMediaSerializer(instance=media)
        data = serializer.data

        self.assertEqual(data['external_url'], 'https://example.com/image.jpg')
        self.assertEqual(data['caption'], 'Beautiful view')
        self.assertIn('id', data)
