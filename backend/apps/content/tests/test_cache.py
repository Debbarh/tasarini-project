"""
Tests for content app cache utilities.
"""
from __future__ import annotations

from django.core.cache import cache
from django.test import TestCase

from apps.content.cache_utils import (
    cache_trending_stories,
    cache_user_recommendations,
    generate_cache_key,
    get_cached_trending_stories,
    get_cached_user_recommendations,
    invalidate_story_caches,
    invalidate_user_recommendation_cache,
)


class CacheUtilsTest(TestCase):
    """Tests for cache utility functions"""

    def setUp(self):
        """Clear cache before each test"""
        cache.clear()

    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()

    def test_generate_cache_key(self):
        """Test cache key generation"""
        key1 = generate_cache_key('test', param1='value1', param2='value2')
        key2 = generate_cache_key('test', param1='value1', param2='value2')
        key3 = generate_cache_key('test', param1='different', param2='value2')

        # Same parameters should generate same key
        self.assertEqual(key1, key2)
        # Different parameters should generate different key
        self.assertNotEqual(key1, key3)
        # Key should have the prefix
        self.assertTrue(key1.startswith('test:'))

    def test_cache_key_consistency(self):
        """Test that parameter order doesn't affect cache key"""
        key1 = generate_cache_key('test', a='1', b='2', c='3')
        key2 = generate_cache_key('test', c='3', a='1', b='2')

        # Parameters in different order should generate same key
        self.assertEqual(key1, key2)

    def test_cache_and_get_trending_stories(self):
        """Test caching trending stories"""
        test_data = [
            {'id': 1, 'title': 'Story 1'},
            {'id': 2, 'title': 'Story 2'}
        ]

        # Cache the data
        cache_trending_stories(days=7, data=test_data)

        # Retrieve from cache
        cached_data = get_cached_trending_stories(days=7)

        self.assertIsNotNone(cached_data)
        self.assertEqual(cached_data, test_data)

    def test_get_cached_trending_stories_miss(self):
        """Test cache miss for trending stories"""
        # Try to get data that was never cached
        cached_data = get_cached_trending_stories(days=30)

        self.assertIsNone(cached_data)

    def test_cache_trending_different_days(self):
        """Test that different days parameters cache separately"""
        data_7days = [{'id': 1, 'title': 'Story 1'}]
        data_30days = [{'id': 2, 'title': 'Story 2'}]

        cache_trending_stories(days=7, data=data_7days)
        cache_trending_stories(days=30, data=data_30days)

        # Should get different data for different days
        self.assertEqual(get_cached_trending_stories(days=7), data_7days)
        self.assertEqual(get_cached_trending_stories(days=30), data_30days)

    def test_cache_and_get_user_recommendations(self):
        """Test caching user recommendations"""
        test_data = [
            {'id': 1, 'title': 'Recommended Story 1'},
            {'id': 2, 'title': 'Recommended Story 2'}
        ]

        # Cache the data
        cache_user_recommendations(user_id=123, data=test_data)

        # Retrieve from cache
        cached_data = get_cached_user_recommendations(user_id=123)

        self.assertIsNotNone(cached_data)
        self.assertEqual(cached_data, test_data)

    def test_cache_recommendations_different_users(self):
        """Test that different users have separate caches"""
        data_user1 = [{'id': 1, 'title': 'Story 1'}]
        data_user2 = [{'id': 2, 'title': 'Story 2'}]

        cache_user_recommendations(user_id=1, data=data_user1)
        cache_user_recommendations(user_id=2, data=data_user2)

        # Should get different data for different users
        self.assertEqual(get_cached_user_recommendations(user_id=1), data_user1)
        self.assertEqual(get_cached_user_recommendations(user_id=2), data_user2)

    def test_invalidate_story_caches(self):
        """Test invalidating story caches"""
        # Cache trending data for different days
        cache_trending_stories(days=7, data=[{'id': 1}])
        cache_trending_stories(days=14, data=[{'id': 2}])
        cache_trending_stories(days=30, data=[{'id': 3}])

        # Invalidate all trending caches
        invalidate_story_caches()

        # All trending caches should be cleared
        self.assertIsNone(get_cached_trending_stories(days=7))
        self.assertIsNone(get_cached_trending_stories(days=14))
        self.assertIsNone(get_cached_trending_stories(days=30))

    def test_invalidate_user_recommendation_cache(self):
        """Test invalidating user recommendation cache"""
        # Cache recommendations for a user
        cache_user_recommendations(user_id=123, data=[{'id': 1}])

        # Invalidate the cache
        invalidate_user_recommendation_cache(user_id=123)

        # Cache should be cleared
        self.assertIsNone(get_cached_user_recommendations(user_id=123))

    def test_invalidate_user_cache_does_not_affect_others(self):
        """Test that invalidating one user's cache doesn't affect others"""
        cache_user_recommendations(user_id=1, data=[{'id': 1}])
        cache_user_recommendations(user_id=2, data=[{'id': 2}])

        # Invalidate only user 1's cache
        invalidate_user_recommendation_cache(user_id=1)

        # User 1's cache should be cleared
        self.assertIsNone(get_cached_user_recommendations(user_id=1))
        # User 2's cache should still exist
        self.assertIsNotNone(get_cached_user_recommendations(user_id=2))

    def test_cache_with_custom_timeout(self):
        """Test caching with custom timeout"""
        test_data = [{'id': 1, 'title': 'Story 1'}]

        # Cache with very short timeout (1 second)
        cache_trending_stories(days=7, data=test_data, timeout=1)

        # Should be available immediately
        cached_data = get_cached_trending_stories(days=7)
        self.assertIsNotNone(cached_data)

        # Note: We can't easily test expiration without sleeping,
        # so we just verify it accepts the timeout parameter
