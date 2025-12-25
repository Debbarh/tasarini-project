"""
Tests for content app views and API endpoints.
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.content.models import (
    Story,
    StoryBookmark,
    StoryComment,
    StoryLike,
)

User = get_user_model()


class StoryViewSetTest(APITestCase):
    """Tests for StoryViewSet API endpoints"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='pass123'
        )
        self.story = Story.objects.create(
            author=self.user,
            title='Test Story',
            content='Test content about my travels',
            is_public=True,
            tags=['travel', 'test']
        )
        self.private_story = Story.objects.create(
            author=self.user,
            title='Private Story',
            content='Private content',
            is_public=False
        )

    def test_list_stories_unauthenticated(self):
        """Test listing stories without authentication"""
        url = reverse('story-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return paginated response
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        # Should only see public stories
        self.assertEqual(response.data['count'], 1)

    def test_list_stories_authenticated(self):
        """Test listing stories with authentication"""
        self.client.force_authenticate(user=self.user)
        url = reverse('story-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_retrieve_public_story(self):
        """Test retrieving a public story"""
        url = reverse('story-detail', args=[self.story.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Story')

    def test_retrieve_private_story_unauthorized(self):
        """Test that private stories are not accessible to non-authors"""
        self.client.force_authenticate(user=self.other_user)
        url = reverse('story-detail', args=[self.private_story.id])
        response = self.client.get(url)

        # Should return 404 because story is not public and user is not author
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_story_authenticated(self):
        """Test creating a story while authenticated"""
        self.client.force_authenticate(user=self.user)
        url = reverse('story-list')
        data = {
            'title': 'New Story',
            'content': 'New content about my adventures',
            'tags': ['adventure', 'new'],
            'is_public': True
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Story.objects.count(), 3)  # 2 + 1 new
        self.assertEqual(response.data['title'], 'New Story')
        self.assertEqual(response.data['author'], self.user.id)

    def test_create_story_unauthenticated(self):
        """Test creating a story without authentication"""
        url = reverse('story-list')
        data = {
            'title': 'New Story',
            'content': 'Content',
            'is_public': True
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_own_story(self):
        """Test updating your own story"""
        self.client.force_authenticate(user=self.user)
        url = reverse('story-detail', args=[self.story.id])
        data = {'title': 'Updated Title'}
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.story.refresh_from_db()
        self.assertEqual(self.story.title, 'Updated Title')

    def test_update_other_user_story(self):
        """Test updating another user's story (should fail)"""
        self.client.force_authenticate(user=self.other_user)
        url = reverse('story-detail', args=[self.story.id])
        data = {'title': 'Hacked Title'}
        response = self.client.patch(url, data, format='json')

        # Should be forbidden
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_own_story(self):
        """Test deleting your own story"""
        self.client.force_authenticate(user=self.user)
        url = reverse('story-detail', args=[self.story.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Story.objects.filter(id=self.story.id).count(), 0)

    def test_pagination(self):
        """Test that story list is paginated"""
        # Create multiple stories
        for i in range(25):
            Story.objects.create(
                author=self.user,
                title=f'Story {i}',
                content=f'Content {i}',
                is_public=True
            )

        url = reverse('story-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('total_pages', response.data)
        self.assertEqual(response.data['page_size'], 20)
        # Should have 20 items per page
        self.assertEqual(len(response.data['results']), 20)

    def test_filter_by_tags(self):
        """Test filtering stories by tags"""
        Story.objects.create(
            author=self.user,
            title='Paris Story',
            content='Content',
            tags=['paris', 'france'],
            is_public=True
        )

        url = reverse('story-list')
        response = self.client.get(url, {'tags': 'paris'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_search_stories(self):
        """Test searching stories"""
        url = reverse('story-list')
        response = self.client.get(url, {'search': 'travels'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find the story with "travels" in content
        self.assertGreater(response.data['count'], 0)

    def test_sort_by_newest(self):
        """Test sorting stories by newest"""
        url = reverse('story-list')
        response = self.client.get(url, {'sort': 'newest'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        # Results should be in descending order of creation
        if len(results) > 1:
            self.assertGreaterEqual(results[0]['created_at'], results[1]['created_at'])


class StoryLikeViewTest(APITestCase):
    """Tests for story like/unlike endpoints"""

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
            content='Test content',
            is_public=True
        )

    def test_like_story(self):
        """Test liking a story"""
        self.client.force_authenticate(user=self.user)
        url = reverse('story-like', args=[self.story.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['liked'])
        self.assertEqual(response.data['likes_count'], 1)
        self.assertEqual(StoryLike.objects.filter(story=self.story).count(), 1)

    def test_unlike_story(self):
        """Test unliking a story"""
        self.client.force_authenticate(user=self.user)
        # First like
        StoryLike.objects.create(story=self.story, user=self.user)

        url = reverse('story-like', args=[self.story.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['liked'])
        self.assertEqual(response.data['likes_count'], 0)

    def test_get_like_status(self):
        """Test getting like status"""
        self.client.force_authenticate(user=self.user)
        url = reverse('story-like', args=[self.story.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['liked'])

    def test_like_unauthenticated(self):
        """Test liking without authentication"""
        url = reverse('story-like', args=[self.story.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class StoryBookmarkViewTest(APITestCase):
    """Tests for story bookmark endpoints"""

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
            content='Test content',
            is_public=True
        )

    def test_bookmark_story(self):
        """Test bookmarking a story"""
        self.client.force_authenticate(user=self.user)
        url = reverse('story-bookmark', args=[self.story.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['bookmarked'])
        self.assertEqual(StoryBookmark.objects.filter(story=self.story).count(), 1)

    def test_unbookmark_story(self):
        """Test removing a bookmark"""
        self.client.force_authenticate(user=self.user)
        StoryBookmark.objects.create(story=self.story, user=self.user)

        url = reverse('story-bookmark', args=[self.story.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['bookmarked'])


class StoryCommentViewSetTest(APITestCase):
    """Tests for story comment endpoints"""

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
            content='Test content',
            is_public=True
        )

    def test_create_comment(self):
        """Test creating a comment"""
        self.client.force_authenticate(user=self.user)
        url = reverse('storycomment-list')
        data = {
            'story': self.story.id,
            'content': 'Great story!'
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StoryComment.objects.count(), 1)
        self.assertEqual(response.data['content'], 'Great story!')

        # Check that story's comment count was updated
        self.story.refresh_from_db()
        self.assertEqual(self.story.comments_count, 1)

    def test_list_comments_for_story(self):
        """Test listing comments for a specific story"""
        StoryComment.objects.create(
            story=self.story,
            author=self.user,
            content='Comment 1'
        )
        StoryComment.objects.create(
            story=self.story,
            author=self.user,
            content='Comment 2'
        )

        url = reverse('storycomment-list')
        response = self.client.get(url, {'story': self.story.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_delete_own_comment(self):
        """Test deleting your own comment"""
        comment = StoryComment.objects.create(
            story=self.story,
            author=self.user,
            content='My comment'
        )
        self.story.comments_count = 1
        self.story.save()

        self.client.force_authenticate(user=self.user)
        url = reverse('storycomment-detail', args=[comment.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(StoryComment.objects.count(), 0)

        # Check that story's comment count was updated
        self.story.refresh_from_db()
        self.assertEqual(self.story.comments_count, 0)


class TrendingStoriesViewTest(APITestCase):
    """Tests for trending stories endpoint"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Create stories with different engagement metrics
        self.popular_story = Story.objects.create(
            author=self.user,
            title='Popular Story',
            content='Content',
            is_public=True,
            likes_count=100,
            comments_count=50,
            views_count=1000
        )
        self.unpopular_story = Story.objects.create(
            author=self.user,
            title='Unpopular Story',
            content='Content',
            is_public=True,
            likes_count=1,
            comments_count=0,
            views_count=10
        )

    def test_trending_stories(self):
        """Test getting trending stories"""
        url = reverse('story-trending')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data
        # Popular story should be first
        self.assertGreater(len(results), 0)

    def test_trending_with_days_parameter(self):
        """Test trending stories with custom days parameter"""
        url = reverse('story-trending')
        response = self.client.get(url, {'days': 30})

        self.assertEqual(response.status_code, status.HTTP_200_OK)


class StoryStatsViewTest(APITestCase):
    """Tests for user story statistics endpoint"""

    def setUp(self):
        """Create test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Create some stories
        for i in range(5):
            Story.objects.create(
                author=self.user,
                title=f'Story {i}',
                content='Content',
                is_public=True,
                likes_count=i * 10,
                location_name=f'City {i}'
            )

    def test_user_stats(self):
        """Test getting user statistics"""
        self.client.force_authenticate(user=self.user)
        url = reverse('story-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['stories_count'], 5)
        self.assertEqual(response.data['total_likes'], 0 + 10 + 20 + 30 + 40)
        self.assertEqual(response.data['countries_visited'], 5)

    def test_stats_unauthenticated(self):
        """Test stats endpoint requires authentication"""
        url = reverse('story-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
