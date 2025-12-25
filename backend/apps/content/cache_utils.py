"""
Cache utilities for content app.

This module provides caching functionality for Travel Stories to improve performance
by reducing database queries for frequently accessed data.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any

from django.conf import settings
from django.core.cache import cache


def generate_cache_key(prefix: str, **kwargs) -> str:
    """
    Generate a unique cache key based on prefix and parameters.

    Args:
        prefix: Cache key prefix (e.g., 'story_list', 'trending_stories')
        **kwargs: Parameters to include in the cache key

    Returns:
        str: Unique cache key

    Example:
        >>> generate_cache_key('story_list', page=1, ordering='newest')
        'story_list:7d8f9a2c1e4b3f6a'
    """
    # Sort kwargs to ensure consistent key generation
    sorted_params = sorted(kwargs.items())
    params_str = json.dumps(sorted_params, sort_keys=True)
    params_hash = hashlib.md5(params_str.encode()).hexdigest()[:16]
    return f"{prefix}:{params_hash}"


def cache_story_list(query_params: dict, data: Any, timeout: int = None) -> None:
    """
    Cache story list results.

    Args:
        query_params: Query parameters used for filtering
        data: Data to cache
        timeout: Cache timeout in seconds (default: CACHE_TTL_SHORT)
    """
    if timeout is None:
        timeout = getattr(settings, 'CACHE_TTL_SHORT', 300)

    cache_key = generate_cache_key('story_list', **query_params)
    cache.set(cache_key, data, timeout)


def get_cached_story_list(query_params: dict) -> Any | None:
    """
    Get cached story list results.

    Args:
        query_params: Query parameters used for filtering

    Returns:
        Cached data or None if not found
    """
    cache_key = generate_cache_key('story_list', **query_params)
    return cache.get(cache_key)


def cache_trending_stories(days: int, data: Any, timeout: int = None) -> None:
    """
    Cache trending stories.

    Args:
        days: Number of days used for trending calculation
        data: Data to cache
        timeout: Cache timeout in seconds (default: CACHE_TTL_MEDIUM)
    """
    if timeout is None:
        timeout = getattr(settings, 'CACHE_TTL_MEDIUM', 900)

    cache_key = f"trending_stories:days_{days}"
    cache.set(cache_key, data, timeout)


def get_cached_trending_stories(days: int) -> Any | None:
    """
    Get cached trending stories.

    Args:
        days: Number of days used for trending calculation

    Returns:
        Cached data or None if not found
    """
    cache_key = f"trending_stories:days_{days}"
    return cache.get(cache_key)


def cache_user_recommendations(user_id: int, data: Any, timeout: int = None) -> None:
    """
    Cache user story recommendations.

    Args:
        user_id: User ID
        data: Data to cache
        timeout: Cache timeout in seconds (default: CACHE_TTL_MEDIUM)
    """
    if timeout is None:
        timeout = getattr(settings, 'CACHE_TTL_MEDIUM', 900)

    cache_key = f"story_recommendations:user_{user_id}"
    cache.set(cache_key, data, timeout)


def get_cached_user_recommendations(user_id: int) -> Any | None:
    """
    Get cached user story recommendations.

    Args:
        user_id: User ID

    Returns:
        Cached data or None if not found
    """
    cache_key = f"story_recommendations:user_{user_id}"
    return cache.get(cache_key)


def invalidate_story_caches(story_id: int = None) -> None:
    """
    Invalidate story-related caches.

    This should be called when:
    - A story is created/updated/deleted
    - A story is liked/unliked
    - A comment is added/removed

    Args:
        story_id: Optional story ID to invalidate specific caches
    """
    # Invalidate trending stories cache
    for days in [7, 14, 30]:
        cache_key = f"trending_stories:days_{days}"
        cache.delete(cache_key)

    # Note: We don't invalidate all story_list caches because they would be too many
    # Instead, we rely on the TTL to expire them naturally
    # For specific story updates, the cache will be stale for at most CACHE_TTL_SHORT


def invalidate_user_recommendation_cache(user_id: int) -> None:
    """
    Invalidate a specific user's recommendation cache.

    This should be called when:
    - User likes a story
    - User's preferences change

    Args:
        user_id: User ID
    """
    cache_key = f"story_recommendations:user_{user_id}"
    cache.delete(cache_key)
