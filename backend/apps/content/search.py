"""
Full-text search utilities for stories.

Uses PostgreSQL full-text search with ranking and suggestions.
"""
from __future__ import annotations

import logging
from typing import Any

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.core.cache import cache
from django.db.models import F, Q, QuerySet

logger = logging.getLogger(__name__)


class StorySearch:
    """
    Advanced search functionality for stories using PostgreSQL full-text search.

    Features:
    - Full-text search with ranking
    - Weighted search (title weighted higher than content)
    - Search suggestions
    - Highlighted results
    - Combined filters
    """

    # Weight configuration for search ranking
    # A = highest weight (title)
    # B = medium weight (tags, location)
    # C = low weight (content)
    SEARCH_WEIGHTS = {
        'title': 'A',
        'content': 'C',
        'tags': 'B',
        'location': 'B',
    }

    @staticmethod
    def search_stories(
        queryset: QuerySet,
        search_query: str,
        min_rank: float = 0.1,
    ) -> QuerySet:
        """
        Perform full-text search on stories with ranking.

        Args:
            queryset: Base queryset to search
            search_query: Search terms
            min_rank: Minimum rank threshold (0-1)

        Returns:
            QuerySet ordered by search rank
        """
        if not search_query or not search_query.strip():
            return queryset

        # Create search vector with weights
        search_vector = (
            SearchVector('title', weight='A')
            + SearchVector('content', weight='C')
            + SearchVector('location_name', weight='B')
        )

        # Create search query
        # Use 'simple' config for better international support
        query = SearchQuery(search_query, config='simple')

        # Annotate with search rank
        queryset = queryset.annotate(
            search=search_vector,
            rank=SearchRank(search_vector, query)
        ).filter(
            search=query,
            rank__gte=min_rank
        ).order_by('-rank', '-created_at')

        return queryset

    @staticmethod
    def search_with_filters(
        queryset: QuerySet,
        search_query: str | None = None,
        tags: list[str] | None = None,
        location: str | None = None,
        author_id: int | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        story_type: str | None = None,
        min_rank: float = 0.1,
    ) -> QuerySet:
        """
        Combine full-text search with filters.

        Args:
            queryset: Base queryset
            search_query: Search terms
            tags: List of tags to filter
            location: Location name filter
            author_id: Filter by author
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            story_type: Type of story
            min_rank: Minimum search rank

        Returns:
            Filtered and ranked queryset
        """
        # Apply filters first
        if author_id:
            queryset = queryset.filter(author_id=author_id)

        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag])

        if location:
            queryset = queryset.filter(location_name__icontains=location)

        if date_from:
            queryset = queryset.filter(trip_date__gte=date_from)

        if date_to:
            queryset = queryset.filter(trip_date__lte=date_to)

        if story_type:
            queryset = queryset.filter(story_type=story_type)

        # Apply search if provided
        if search_query and search_query.strip():
            queryset = StorySearch.search_stories(queryset, search_query, min_rank)
        else:
            # If no search, order by newest
            queryset = queryset.order_by('-created_at')

        return queryset

    @staticmethod
    def get_search_suggestions(
        query: str,
        limit: int = 10,
    ) -> dict[str, list[str]]:
        """
        Get search suggestions based on partial query.

        Args:
            query: Partial search query
            limit: Maximum number of suggestions per category

        Returns:
            Dictionary with suggestions for titles, tags, and locations
        """
        from .models import Story

        cache_key = f'search_suggestions:{query.lower()[:50]}'
        cached = cache.get(cache_key)
        if cached:
            return cached

        query_lower = query.lower().strip()
        if len(query_lower) < 2:
            return {'titles': [], 'tags': [], 'locations': []}

        # Get title suggestions
        title_suggestions = list(
            Story.objects.filter(
                is_public=True,
                title__icontains=query_lower
            ).values_list('title', flat=True)
            .distinct()[:limit]
        )

        # Get tag suggestions
        all_tags = Story.objects.filter(
            is_public=True
        ).exclude(
            tags__isnull=True
        ).values_list('tags', flat=True)

        matching_tags = set()
        for tag_list in all_tags:
            if tag_list:
                for tag in tag_list:
                    if query_lower in tag.lower():
                        matching_tags.add(tag)
                        if len(matching_tags) >= limit:
                            break

        # Get location suggestions
        location_suggestions = list(
            Story.objects.filter(
                is_public=True,
                location_name__icontains=query_lower
            ).exclude(
                location_name=''
            ).values_list('location_name', flat=True)
            .distinct()[:limit]
        )

        result = {
            'titles': title_suggestions,
            'tags': sorted(list(matching_tags))[:limit],
            'locations': location_suggestions,
        }

        # Cache for 5 minutes
        cache.set(cache_key, result, 300)

        return result

    @staticmethod
    def get_popular_searches(days: int = 7, limit: int = 10) -> list[dict[str, Any]]:
        """
        Get popular search queries from cache/analytics.

        This is a placeholder for tracking search queries.
        In production, you'd track searches in a separate model.

        Args:
            days: Number of days to look back
            limit: Maximum number of results

        Returns:
            List of popular search queries with counts
        """
        # Placeholder implementation
        # In production, you'd have a SearchLog model
        cache_key = f'popular_searches:{days}:{limit}'
        cached = cache.get(cache_key)
        if cached:
            return cached

        # For now, return popular tags as proxy for searches
        from .models import Story
        from collections import Counter
        from django.utils import timezone
        from datetime import timedelta

        since = timezone.now() - timedelta(days=days)
        recent_stories = Story.objects.filter(
            created_at__gte=since,
            is_public=True
        ).values_list('tags', flat=True)

        tag_counts = Counter()
        for tag_list in recent_stories:
            if tag_list:
                tag_counts.update(tag_list)

        popular = [
            {'query': tag, 'count': count}
            for tag, count in tag_counts.most_common(limit)
        ]

        cache.set(cache_key, popular, 3600)  # Cache for 1 hour
        return popular

    @staticmethod
    def highlight_results(
        text: str,
        query: str,
        max_length: int = 200,
    ) -> str:
        """
        Highlight search terms in text and return excerpt.

        Args:
            text: Full text content
            query: Search query to highlight
            max_length: Maximum length of excerpt

        Returns:
            Text excerpt with highlighted terms
        """
        if not query or not text:
            return text[:max_length] + ('...' if len(text) > max_length else '')

        # Simple highlighting implementation
        # In production, you might use PostgreSQL's ts_headline
        query_terms = query.lower().split()
        text_lower = text.lower()

        # Find first occurrence of any search term
        first_pos = len(text)
        for term in query_terms:
            pos = text_lower.find(term)
            if pos != -1 and pos < first_pos:
                first_pos = pos

        # Extract excerpt around first match
        start = max(0, first_pos - 50)
        end = min(len(text), start + max_length)

        excerpt = text[start:end]
        if start > 0:
            excerpt = '...' + excerpt
        if end < len(text):
            excerpt = excerpt + '...'

        # Highlight terms (wrap in markers)
        for term in query_terms:
            if len(term) > 2:  # Only highlight terms longer than 2 chars
                # Case-insensitive replacement
                import re
                pattern = re.compile(re.escape(term), re.IGNORECASE)
                excerpt = pattern.sub(f'<mark>{term}</mark>', excerpt)

        return excerpt

    @staticmethod
    def get_related_stories(
        story_id: int,
        limit: int = 5,
    ) -> QuerySet:
        """
        Get stories related to a given story based on tags and location.

        Args:
            story_id: ID of the story to find related content for
            limit: Maximum number of related stories

        Returns:
            QuerySet of related stories
        """
        from .models import Story

        try:
            story = Story.objects.get(id=story_id)
        except Story.DoesNotExist:
            return Story.objects.none()

        cache_key = f'related_stories:{story_id}:{limit}'
        cached_ids = cache.get(cache_key)
        if cached_ids:
            return Story.objects.filter(id__in=cached_ids)

        # Find stories with matching tags or location
        related = Story.objects.filter(
            is_public=True
        ).exclude(
            id=story_id
        )

        # Score by tag similarity
        if story.tags:
            # Stories with any matching tags
            tag_queries = [Q(tags__contains=[tag]) for tag in story.tags]
            tag_query = tag_queries[0]
            for q in tag_queries[1:]:
                tag_query |= q

            related = related.filter(tag_query)

        # Boost stories from same location
        if story.location_name:
            related = related.annotate(
                location_match=Q(location_name__iexact=story.location_name)
            )

        # Order by likes and comments
        related = related.order_by(
            '-likes_count',
            '-comments_count',
            '-created_at'
        )[:limit]

        # Cache the IDs
        related_ids = list(related.values_list('id', flat=True))
        cache.set(cache_key, related_ids, 1800)  # 30 minutes

        return related
