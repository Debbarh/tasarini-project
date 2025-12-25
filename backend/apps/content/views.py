from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.db.models import Count, F, Prefetch, Q, Sum
from django.utils import timezone
from rest_framework import parsers, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from .models import (
    AdvertisementSetting,
    DiscoveryItinerary,
    SavedItinerary,
    Story,
    StoryBookmark,
    StoryCollection,
    StoryCollectionItem,
    StoryComment,
    StoryDraft,
    StoryLike,
    StoryMedia,
    StorySeries,
    StorySeriesItem,
)
from .serializers import (
    AdminStorySerializer,
    AdvertisementSettingSerializer,
    DiscoveryItinerarySerializer,
    SavedItinerarySerializer,
    StoryCollectionSerializer,
    StoryCommentSerializer,
    StoryDraftSerializer,
    StoryMediaSerializer,
    StorySeriesSerializer,
    UserStorySerializer,
)
from .throttles import BookmarkThrottle, CommentThrottle, LikeThrottle, StoryCreateThrottle


class StoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing travel stories.

    ## Endpoints:
    - GET /api/v1/stories/ - List all public stories
    - POST /api/v1/stories/ - Create a new story (authenticated, rate limited: 5/min)
    - GET /api/v1/stories/{id}/ - Retrieve a specific story
    - PATCH /api/v1/stories/{id}/ - Update a story (owner or staff only)
    - DELETE /api/v1/stories/{id}/ - Delete a story (owner or staff only)
    - GET /api/v1/stories/trending/ - Get trending stories
    - GET /api/v1/stories/recommendations/ - Get personalized recommendations
    - GET /api/v1/stories/stats/ - Get user's story statistics
    - GET /api/v1/stories/search-suggestions/ - Get search suggestions (autocomplete)
    - GET /api/v1/stories/{id}/related/ - Get related stories
    - GET /api/v1/stories/popular-searches/ - Get popular search queries
    - GET /api/v1/stories/{id}/like/ - Check like status
    - POST /api/v1/stories/{id}/like/ - Toggle like (rate limited: 30/min)
    - GET /api/v1/stories/{id}/bookmark/ - Check bookmark status
    - POST /api/v1/stories/{id}/bookmark/ - Toggle bookmark (rate limited: 30/min)

    ## Query Parameters:
    - search: Full-text search in title, content, and location (uses PostgreSQL FTS with ranking)
    - fulltext: Use full-text search vs simple ILIKE (default: true)
    - location: Filter by location name
    - date_from: Filter stories after this date (YYYY-MM-DD)
    - date_to: Filter stories before this date (YYYY-MM-DD)
    - tags: Comma-separated list of tags
    - story_type: Filter by type (user, ai_generated, partner_sponsored)
    - linked_type: Filter by linked entity type (tourist_point, itinerary, activity)
    - has_location: Filter stories with location (true/false)
    - mine: Show only user's own stories (true/false)
    - sort: Sort order (newest, popular, most_liked, most_commented, or rank if searching)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)

    ## Search Features:
    - Full-text search with weighted ranking (title > tags/location > content)
    - Autocomplete suggestions for titles, tags, and locations
    - Related stories based on tags and location similarity
    - Popular search tracking
    - Combined filters with search ranking

    ## Permissions:
    - List/Retrieve: Public (authenticated or not)
    - Create/Update/Delete: Authenticated users only (own stories or staff)
    - Like/Bookmark: Authenticated users only

    ## Security:
    - Content is sanitized to prevent XSS attacks
    - Media URLs are validated against allowed domains
    - Admin-only fields (is_featured, is_verified) are protected
    - Rate limiting applied to prevent abuse
    """
    serializer_class = UserStorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['is_public', 'story_type', 'is_featured']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'published_at', 'likes_count']

    def get_pagination_class(self):  # type: ignore[override]
        """Use custom pagination for story lists"""
        from .pagination import StoryPagination
        return StoryPagination

    def get_serializer_class(self):  # type: ignore[override]
        """
        Return appropriate serializer based on user permissions.

        Admin users get AdminStorySerializer (can modify all fields).
        Regular users get UserStorySerializer (admin fields are read-only).
        """
        if self.request and self.request.user and self.request.user.is_staff:
            return AdminStorySerializer
        return UserStorySerializer

    def get_queryset(self):  # type: ignore[override]
        # Optimize query by prefetching all related objects to avoid N+1 queries
        comments_queryset = StoryComment.objects.select_related('author', 'author__profile')

        qs = (
            Story.objects.select_related('author', 'author__profile', 'tourist_point')
            .prefetch_related(
                'media',
                Prefetch('comments', queryset=comments_queryset),
                'links'
            )
        )

        request = getattr(self, 'request', None)
        if not request:
            return qs

        params = request.query_params
        days_param = params.get('days')
        if days_param:
            try:
                days = int(days_param)
                since = timezone.now() - timedelta(days=days)
                qs = qs.filter(created_at__gte=since)
            except ValueError:
                pass

        user = request.user
        mine = params.get('mine')
        wants_own_stories = mine and mine.lower() in ('1', 'true', 'yes')

        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            if wants_own_stories and user.is_authenticated:
                qs = qs.filter(author=user)
            else:
                qs = qs.filter(is_public=True)
        else:
            if user.is_staff:
                pass
            else:
                qs = qs.filter(author=user)

        # Use advanced full-text search if available
        search = params.get('search')
        use_fulltext = params.get('fulltext', 'true').lower() in ('1', 'true', 'yes')

        if search and use_fulltext:
            # Use PostgreSQL full-text search with ranking
            from .search import StorySearch
            qs = StorySearch.search_stories(qs, search, min_rank=0.1)
        elif search:
            # Fallback to simple ILIKE search
            qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))

        location = params.get('location')
        if location:
            qs = qs.filter(location_name__icontains=location)

        date_from = params.get('date_from')
        if date_from:
            qs = qs.filter(trip_date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            qs = qs.filter(trip_date__lte=date_to)

        tags = params.get('tags')
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
            for tag in tag_list:
                qs = qs.filter(tags__contains=[tag])

        linked_type = params.get('linked_type')
        if linked_type:
            qs = qs.filter(links__linked_type=linked_type).distinct()

        story_type = params.get('story_type')
        if story_type:
            qs = qs.filter(story_type=story_type)

        has_location = params.get('has_location')
        if has_location and has_location.lower() in ('1', 'true', 'yes'):
            qs = qs.exclude(location_lat__isnull=True).exclude(location_lon__isnull=True)

        ordering = params.get('ordering') or params.get('sort')
        if ordering == 'popular':
            qs = qs.order_by('-likes_count', '-comments_count', '-created_at')
        elif ordering == 'most_liked':
            qs = qs.order_by('-likes_count', '-created_at')
        elif ordering == 'most_commented':
            qs = qs.order_by('-comments_count', '-created_at')
        elif ordering == 'newest':
            qs = qs.order_by('-created_at')
        elif ordering:
            qs = qs.order_by(ordering)

        # Pagination is handled by DRF's pagination_class
        return qs

    def get_throttles(self):  # type: ignore[override]
        """Apply specific throttles based on action"""
        if self.action == 'create':
            return [StoryCreateThrottle()]
        return super().get_throttles()

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(author=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def search_suggestions(self, request):
        """
        Get search suggestions based on partial query.

        ## Query Parameters:
        - q: Partial search query (minimum 2 characters)
        - limit: Maximum suggestions per category (default: 10)

        ## Response:
        Returns suggestions for titles, tags, and locations

        ## Example:
        GET /api/v1/stories/search-suggestions/?q=paris&limit=5
        """
        from .search import StorySearch

        query = request.query_params.get('q', '')
        limit = request.query_params.get('limit', '10')

        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 10

        if len(query) < 2:
            return Response({
                'titles': [],
                'tags': [],
                'locations': [],
                'message': 'Query must be at least 2 characters'
            })

        suggestions = StorySearch.get_search_suggestions(query, limit)
        return Response(suggestions)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def related(self, request, pk=None):
        """
        Get stories related to this story based on tags and location.

        ## Query Parameters:
        - limit: Maximum number of related stories (default: 5)

        ## Example:
        GET /api/v1/stories/{id}/related/?limit=10
        """
        from .search import StorySearch

        story = self.get_object()
        limit = request.query_params.get('limit', '5')

        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 5

        related_stories = StorySearch.get_related_stories(story.id, limit)
        serializer = self.get_serializer(related_stories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def popular_searches(self, request):
        """
        Get popular search queries.

        ## Query Parameters:
        - days: Number of days to look back (default: 7)
        - limit: Maximum number of results (default: 10)

        ## Example:
        GET /api/v1/stories/popular-searches/?days=30
        """
        from .search import StorySearch

        days = request.query_params.get('days', '7')
        limit = request.query_params.get('limit', '10')

        try:
            days = int(days)
            limit = int(limit)
        except (ValueError, TypeError):
            days = 7
            limit = 10

        popular = StorySearch.get_popular_searches(days, limit)
        return Response(popular)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def trending(self, request):
        """
        Get trending stories based on engagement metrics.

        ## Query Parameters:
        - days: Number of days to look back (default: 7)

        ## Response:
        Returns top 20 stories ordered by engagement score:
        - Likes count × 3 + Comments count × 5 + Views count × 0.1

        ## Caching:
        Results are cached for 15 minutes to improve performance

        ## Example:
        GET /api/v1/stories/trending/?days=30
        """
        from .cache_utils import cache_trending_stories, get_cached_trending_stories

        days = request.query_params.get('days', '7')
        try:
            days_int = int(days)
        except ValueError:
            days_int = 7

        # Try to get from cache
        cached_data = get_cached_trending_stories(days_int)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate trending stories
        since = timezone.now() - timedelta(days=days_int)
        qs = self.get_queryset().filter(created_at__gte=since)
        stories = []
        for story in qs:
            engagement = story.likes_count * 3 + story.comments_count * 5 + story.views_count * 0.1
            stories.append((engagement, story))
        stories.sort(key=lambda item: item[0], reverse=True)
        top_stories = [story for _, story in stories[:20]]
        serializer = self.get_serializer(top_stories, many=True)

        # Cache the result
        cache_trending_stories(days_int, serializer.data)

        return Response(serializer.data)

    @action(
        detail=True,
        methods=['get', 'post'],
        permission_classes=[permissions.IsAuthenticated],
        throttle_classes=[LikeThrottle],
        url_path='like'
    )
    def like(self, request, pk=None):
        """
        Get or toggle like status for a story.

        ## Methods:
        - GET: Check if user has liked the story
        - POST: Toggle like (add if not liked, remove if already liked)

        ## Rate Limiting:
        30 requests per minute per user

        ## Response:
        - liked: boolean indicating if user likes the story
        - likes_count: total number of likes for the story

        ## Example:
        POST /api/v1/stories/123/like/
        Response: {"liked": true, "likes_count": 42}
        """
        story = self.get_object()
        if request.method == 'GET':
            liked = StoryLike.objects.filter(story=story, user=request.user).exists()
            return Response({'liked': liked, 'likes_count': StoryLike.objects.filter(story=story).count()})

        like, created = StoryLike.objects.get_or_create(story=story, user=request.user)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True
        likes_count = StoryLike.objects.filter(story=story).count()
        story.likes_count = likes_count
        story.save(update_fields=['likes_count'])

        # Invalidate caches after like/unlike
        from .cache_utils import invalidate_story_caches, invalidate_user_recommendation_cache
        invalidate_story_caches(story.id)  # Invalidate trending stories
        invalidate_user_recommendation_cache(request.user.id)  # Invalidate user's recommendations

        return Response({'liked': liked, 'likes_count': likes_count})

    @action(
        detail=True,
        methods=['get', 'post'],
        permission_classes=[permissions.IsAuthenticated],
        throttle_classes=[BookmarkThrottle],
        url_path='bookmark'
    )
    def bookmark(self, request, pk=None):
        """
        Get or toggle bookmark status for a story.

        ## Methods:
        - GET: Check if user has bookmarked the story
        - POST: Toggle bookmark (add if not bookmarked, remove if already bookmarked)

        ## Rate Limiting:
        30 requests per minute per user

        ## Response:
        - bookmarked: boolean indicating if user has bookmarked the story

        ## Example:
        POST /api/v1/stories/123/bookmark/
        Response: {"bookmarked": true}
        """
        story = self.get_object()
        if request.method == 'GET':
            bookmarked = StoryBookmark.objects.filter(story=story, user=request.user).exists()
            return Response({'bookmarked': bookmarked})

        bookmark, created = StoryBookmark.objects.get_or_create(story=story, user=request.user)
        if not created:
            bookmark.delete()
            bookmarked = False
        else:
            bookmarked = True
        return Response({'bookmarked': bookmarked})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='stats')
    def stats(self, request):
        """
        Get user's story statistics.

        ## Response:
        - stories_count: Total number of stories by user
        - total_likes: Sum of all likes across user's stories
        - countries_visited: Number of unique locations visited
        - followers_count: Number of followers (future feature)
        - following_count: Number of users followed (future feature)

        ## Example:
        GET /api/v1/stories/stats/
        Response: {
            "stories_count": 15,
            "total_likes": 234,
            "countries_visited": 8,
            "followers_count": 0,
            "following_count": 0
        }
        """
        qs = Story.objects.filter(author=request.user)
        stories_count = qs.count()
        total_likes = qs.aggregate(total=Sum('likes_count'))['total'] or 0
        countries_visited = (
            qs.exclude(location_name__isnull=True)
            .exclude(location_name='')
            .values_list('location_name', flat=True)
            .distinct()
            .count()
        )
        data = {
            'stories_count': stories_count,
            'followers_count': 0,
            'following_count': 0,
            'countries_visited': countries_visited,
            'total_likes': total_likes,
        }
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='recommendations')
    def recommendations(self, request):
        """
        Get personalized story recommendations based on user preferences.

        ## Algorithm:
        1. If user has liked stories:
           - Analyze liked stories to extract user preferences (tags, locations)
           - Score candidate stories based on:
             * Matching tags: +3 points per tag
             * Matching location: +5 points
             * Likes count: +0.1 per like
             * Comments count: +0.2 per comment
           - Return top 10 scored stories
        2. If user has no likes:
           - Return featured stories
           - Fallback to most popular stories

        ## Caching:
        Results are cached for 15 minutes per user to improve performance

        ## Response:
        List of up to 10 recommended stories

        ## Example:
        GET /api/v1/stories/recommendations/
        """
        from .cache_utils import cache_user_recommendations, get_cached_user_recommendations

        # Try to get from cache
        cached_data = get_cached_user_recommendations(request.user.id)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate recommendations
        liked_story_ids = list(StoryLike.objects.filter(user=request.user).values_list('story_id', flat=True))
        base_queryset = self.get_queryset().exclude(author=request.user)

        if liked_story_ids:
            liked_stories = Story.objects.filter(id__in=liked_story_ids)
            user_tags = {tag.lower() for story in liked_stories for tag in (story.tags or [])}
            user_locations = {
                story.location_name.lower()
                for story in liked_stories
                if story.location_name
            }

            # Order before slicing to avoid Django queryset error
            candidate_qs = base_queryset.exclude(id__in=liked_story_ids).order_by('-likes_count', '-created_at')[:200]
            scored = []
            for story in candidate_qs:
                score = 0.0
                if story.tags:
                    story_tags = {tag.lower() for tag in story.tags}
                    score += 3 * len(user_tags.intersection(story_tags))
                if story.location_name and story.location_name.lower() in user_locations:
                    score += 5
                score += story.likes_count * 0.1 + story.comments_count * 0.2
                if score > 0:
                    scored.append((score, story))

            if scored:
                scored.sort(key=lambda item: item[0], reverse=True)
                recommended_stories = [story for _, story in scored[:10]]
            else:
                # Already ordered at line 539, just take first 10
                recommended_stories = list(candidate_qs[:10])
        else:
            recommended_stories = list(base_queryset.filter(is_featured=True)[:10])
            if not recommended_stories:
                recommended_stories = list(base_queryset.order_by('-likes_count', '-created_at')[:10])

        serializer = self.get_serializer(recommended_stories, many=True)

        # Cache the result
        cache_user_recommendations(request.user.id, serializer.data)

        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def share_urls(self, request, pk=None):
        """
        Get all social sharing URLs for a story.

        ## Response:
        Returns URLs for all major social platforms

        ## Example:
        GET /api/v1/stories/{id}/share-urls/
        """
        from .sharing import SocialSharing

        story = self.get_object()

        # Get content excerpt for email
        content_excerpt = story.content[:200] + '...' if len(story.content) > 200 else story.content

        # Get base URL from query params or settings
        base_url = request.query_params.get('base_url')

        share_urls = SocialSharing.get_all_share_urls(
            story_id=str(story.id),
            title=story.title,
            content_excerpt=content_excerpt,
            base_url=base_url
        )

        return Response(share_urls)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def track_share(self, request, pk=None):
        """
        Track a story share.

        ## Body:
        - platform: Social platform (facebook, twitter, linkedin, etc.)

        ## Response:
        - message: Success message
        - share_id: UUID of the tracked share

        ## Example:
        POST /api/v1/stories/{id}/track-share/
        Body: {"platform": "facebook"}
        """
        from .models import StoryShare

        story = self.get_object()
        platform = request.data.get('platform', 'other')

        # Get client info
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        referrer = request.META.get('HTTP_REFERER', '')

        # Create share record
        share = StoryShare.objects.create(
            story=story,
            user=request.user if request.user.is_authenticated else None,
            platform=platform,
            ip_address=ip_address,
            user_agent=user_agent,
            referrer=referrer
        )

        return Response({
            'message': 'Partage enregistré avec succès',
            'share_id': str(share.id)
        })

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def embed_code(self, request, pk=None):
        """
        Get embed code for a story.

        ## Query Parameters:
        - width: Width of the embed (default: '100%')
        - height: Height of the embed (default: '600px')
        - theme: Theme ('light' or 'dark', default: 'light')
        - show_author: Show author info ('true' or 'false', default: 'true')
        - show_location: Show location info ('true' or 'false', default: 'true')
        - responsive: Use responsive embed ('true' or 'false', default: 'false')

        ## Response:
        - embed_code: HTML iframe code
        - embed_url: Direct embed URL

        ## Example:
        GET /api/v1/stories/{id}/embed-code/?responsive=true&theme=dark
        """
        from .sharing import EmbedGenerator, SocialSharing

        story = self.get_object()

        # Get parameters
        width = request.query_params.get('width', '100%')
        height = request.query_params.get('height', '600px')
        theme = request.query_params.get('theme', 'light')
        show_author = request.query_params.get('show_author', 'true').lower() in ('1', 'true', 'yes')
        show_location = request.query_params.get('show_location', 'true').lower() in ('1', 'true', 'yes')
        responsive = request.query_params.get('responsive', 'false').lower() in ('1', 'true', 'yes')
        base_url = request.query_params.get('base_url')

        # Generate embed code
        if responsive:
            embed_code = EmbedGenerator.generate_responsive_embed_code(
                story_id=str(story.id),
                theme=theme,
                show_author=show_author,
                show_location=show_location,
                base_url=base_url
            )
        else:
            embed_code = EmbedGenerator.generate_embed_code(
                story_id=str(story.id),
                width=width,
                height=height,
                theme=theme,
                show_author=show_author,
                show_location=show_location,
                base_url=base_url
            )

        # Also return the direct embed URL
        from urllib.parse import urlencode
        if not base_url:
            from django.conf import settings
            base_url = getattr(settings, 'FRONTEND_URL', 'https://tasarini.com').rstrip('/')

        params = {
            'theme': theme,
            'author': '1' if show_author else '0',
            'location': '1' if show_location else '0',
        }
        embed_url = f"{base_url}/embed/story/{story.id}?{urlencode(params)}"

        return Response({
            'embed_code': embed_code,
            'embed_url': embed_url
        })

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def og_metadata(self, request, pk=None):
        """
        Get Open Graph metadata for a story.

        ## Response:
        - og_tags: Dictionary of Open Graph tags
        - html_meta_tags: HTML string with meta tags

        ## Example:
        GET /api/v1/stories/{id}/og-metadata/
        """
        from .sharing import OpenGraphMetadata

        story = self.get_object()

        og_tags = OpenGraphMetadata.generate_og_tags(story)
        html_meta_tags = OpenGraphMetadata.generate_html_meta_tags(story)

        return Response({
            'og_tags': og_tags,
            'html_meta_tags': html_meta_tags
        })

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def share_stats(self, request, pk=None):
        """
        Get sharing statistics for a story (admin only).

        ## Response:
        - total_shares: Total number of shares
        - shares_by_platform: Breakdown by platform
        - recent_shares: List of recent shares

        ## Example:
        GET /api/v1/stories/{id}/share-stats/
        """
        from .models import StoryShare
        from django.db.models import Count

        story = self.get_object()

        # Get total shares
        total_shares = StoryShare.objects.filter(story=story).count()

        # Get shares by platform
        shares_by_platform = list(
            StoryShare.objects.filter(story=story)
            .values('platform')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Get recent shares
        recent_shares = StoryShare.objects.filter(story=story).select_related('user')[:10]
        from .serializers import StoryShareSerializer
        recent_shares_data = StoryShareSerializer(recent_shares, many=True).data

        return Response({
            'total_shares': total_shares,
            'shares_by_platform': shares_by_platform,
            'recent_shares': recent_shares_data
        })


class DiscoveryItineraryViewSet(viewsets.ModelViewSet):
    serializer_class = DiscoveryItinerarySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):  # type: ignore[override]
        qs = DiscoveryItinerary.objects.select_related('user').order_by('-created_at')
        request = getattr(self, 'request', None)
        if not request:
            return qs.none()

        params = request.query_params
        search = params.get('search')
        difficulty = params.get('difficulty')
        mine = params.get('mine')
        public_only = params.get('public')

        truthy = {'1', 'true', 'yes', 'on'}
        user = request.user

        if request.method in permissions.SAFE_METHODS:
            if mine and mine.lower() in truthy and user.is_authenticated:
                qs = qs.filter(user=user)
            elif public_only and public_only.lower() in truthy:
                qs = qs.filter(is_public=True)
            elif user.is_authenticated:
                qs = qs.filter(Q(is_public=True) | Q(user=user))
            else:
                qs = qs.filter(is_public=True)
        else:
            qs = qs.filter(user=user)

        if search:
            qs = qs.filter(title__icontains=search)

        if difficulty:
            qs = qs.filter(difficulty_level=difficulty)

        # Pagination is handled by DRF's pagination_class
        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):  # type: ignore[override]
        instance = self.get_object()
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('Vous ne pouvez modifier que vos itinéraires.')
        serializer.save()

    def perform_destroy(self, instance):  # type: ignore[override]
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('Vous ne pouvez supprimer que vos itinéraires.')
        instance.delete()


class SavedItineraryViewSet(viewsets.ModelViewSet):
    serializer_class = SavedItinerarySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):  # type: ignore[override]
        qs = SavedItinerary.objects.filter(user=self.request.user).order_by('-created_at')
        params = self.request.query_params
        favorite = params.get('favorite')
        search = params.get('search')
        if favorite and favorite.lower() in {'1', 'true', 'yes'}:
            qs = qs.filter(is_favorite=True)
        if search:
            qs = qs.filter(title__icontains=search)
        # Pagination is handled by DRF's pagination_class
        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(user=self.request.user)

class StoryGenerationView(APIView):
    """
    Generate travel stories using AI providers.

    ## Endpoints:
    - POST /api/v1/stories/generate/ - Generate a story using AI

    ## Request Body:
    - mode: 'prompt' or 'itinerary'
    - prompt: Text prompt for story generation (if mode='prompt')
    - itinerary: Itinerary data for story generation (if mode='itinerary')

    ## Response:
    - title: Generated story title
    - content: Generated story content
    - tags: Suggested tags
    - location: Suggested location
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .ai_providers import generate_story_with_provider, AIProviderException
        from .models import StoryAIProviderConfig

        # Get active AI provider
        try:
            provider = StoryAIProviderConfig.objects.filter(is_enabled=True).first()
            if not provider:
                # Fallback to template-based generation
                return self._generate_with_template(request.data)

            # Use AI provider
            result = generate_story_with_provider(provider, request.data)
            if result:
                return Response(result)
            else:
                # Fallback to template if AI fails
                return self._generate_with_template(request.data)

        except AIProviderException as e:
            logger.error(f"AI generation failed: {e}")
            # Fallback to template
            return self._generate_with_template(request.data)
        except Exception as e:
            logger.error(f"Unexpected error during story generation: {e}")
            return Response(
                {"error": "Erreur lors de la génération de l'histoire"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_with_template(self, data: dict):
        """Fallback template-based generation"""
        mode = data.get('mode', 'prompt')
        if mode == 'itinerary':
            itinerary = data.get('itinerary') or {}
            payload = self._from_itinerary(itinerary)
        else:
            prompt = data.get('prompt') or ''
            payload = self._from_prompt(prompt)
        return Response(payload)

    def _from_itinerary(self, itinerary: dict):
        title = itinerary.get('title') or 'Carnet de voyage'
        trip = itinerary.get('itinerary_data') or itinerary
        trip_obj = trip.get('trip') if isinstance(trip, dict) else {}
        destinations = trip_obj.get('destinations') if isinstance(trip_obj, dict) else trip.get('destinations', [])
        destination_names = []
        if isinstance(destinations, list):
            for dest in destinations:
                city = dest.get('city') or dest.get('country')
                if city:
                    destination_names.append(city)
        summary = ', '.join(destination_names[:3]) if destination_names else 'vos points d’intérêt favoris'
        paragraphs = [
            f"{title} commence par {summary}. Chaque étape met en avant une ambiance différente entre découvertes locales et pauses gourmandes.",
            "Les rencontres avec les artisans, les balades matinales et les dégustations improvisées ponctuent ce séjour.",
            "En fin de journée, prenez le temps d'écrire quelques lignes pour graver ces souvenirs chaleureux.",
        ]
        tags = [name.split()[0] for name in destination_names[:3]] if destination_names else ['voyage', 'inspiration']
        location = destination_names[0] if destination_names else 'Destination secrète'
        return {
            'title': title,
            'content': '\n\n'.join(paragraphs),
            'tags': tags,
            'location': location,
        }

    def _from_prompt(self, prompt: str):
        clean_prompt = prompt.strip() or 'une escapade créative'
        title = f"Inspiration : {clean_prompt[:40]}".rstrip()
        paragraphs = [
            f"Vous rêvez de {clean_prompt}? Voici une version romancée de cette aventure.",
            "Commencez par explorer les ruelles où l'on entend encore les récits des habitants. "
            "Laissez-vous guider par les senteurs, les musiques et les sourires rencontrés.",
            "Terminez par un coucher de soleil qui colore les façades et promet de nouvelles escapades.",
        ]
        tags = ['story', 'ai', 'voyage']
        return {'title': title, 'content': '\n\n'.join(paragraphs), 'tags': tags, 'location': 'À personnaliser'}


class StoryCommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing story comments.

    ## Endpoints:
    - GET /api/v1/story-comments/ - List comments (filterable by story)
    - POST /api/v1/story-comments/ - Create a comment (rate limited: 10/min)
    - GET /api/v1/story-comments/{id}/ - Retrieve a comment
    - DELETE /api/v1/story-comments/{id}/ - Delete own comment

    ## Query Parameters:
    - story: Filter by story ID

    ## Rate Limiting:
    Comment creation is limited to 10 requests per minute per user

    ## Response:
    - id: Comment ID
    - story: Story ID
    - author: Author user ID
    - author_name: Display name of author
    - content: Comment text
    - sentiment: Sentiment analysis result (optional)
    - created_at: Timestamp

    ## Example:
    POST /api/v1/story-comments/
    Body: {"story": 123, "content": "Great story!"}
    """
    serializer_class = StoryCommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['story']
    ordering = ['created_at']

    def get_pagination_class(self):  # type: ignore[override]
        """Use custom pagination for comments"""
        from .pagination import CommentPagination
        return CommentPagination

    def get_throttles(self):  # type: ignore[override]
        """
        Apply comment creation throttle (10 requests per minute).
        """
        if self.action == 'create':
            return [CommentThrottle()]
        return super().get_throttles()

    def get_queryset(self):  # type: ignore[override]
        # Optimize query by prefetching author profile to avoid N+1 queries
        return StoryComment.objects.select_related('author', 'author__profile', 'story')

    def perform_create(self, serializer):  # type: ignore[override]
        from .spam_detection import SpamDetector
        from .models import ModerationAction

        # Check content for spam before creating
        content = serializer.validated_data.get('content', '')
        spam_result = SpamDetector.check_content(
            content,
            self.request.user.id,
            'comment'
        )

        # If spam detected with high confidence, reject
        if spam_result['is_spam'] and spam_result['confidence'] > 0.7:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'content': f"Ce commentaire a été identifié comme spam: {', '.join(spam_result['reasons'])}"
            })

        comment = serializer.save(author=self.request.user)
        Story.objects.filter(pk=comment.story_id).update(comments_count=F('comments_count') + 1)

        # Log moderate spam (not blocked but recorded)
        if spam_result['is_spam'] and spam_result['confidence'] <= 0.7:
            ModerationAction.objects.create(
                action_type=ModerationAction.ActionType.SPAM_DETECTED,
                reason=f"Spam potentiel détecté (confiance: {spam_result['confidence']}): {', '.join(spam_result['reasons'])}",
                target_comment=comment,
                target_user=self.request.user,
                is_automated=True,
                metadata={'spam_result': spam_result}
            )
            logger.warning(
                f"Potential spam comment created by user {self.request.user.id}: {comment.id}"
            )

        # Invalidate trending cache after comment creation
        from .cache_utils import invalidate_story_caches
        invalidate_story_caches(comment.story_id)

    def perform_destroy(self, instance):  # type: ignore[override]
        story_id = instance.story_id
        super().perform_destroy(instance)
        Story.objects.filter(pk=story_id, comments_count__gt=0).update(comments_count=F('comments_count') - 1)

        # Invalidate trending cache after comment deletion
        from .cache_utils import invalidate_story_caches
        invalidate_story_caches(story_id)


class AdvertisementSettingViewSet(viewsets.ModelViewSet):
    serializer_class = AdvertisementSettingSerializer
    queryset = AdvertisementSetting.objects.all().order_by('-created_at')

    def get_permissions(self):  # type: ignore[override]
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class StoryAIProviderConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Story AI Provider configurations.

    ## Endpoints:
    - GET /api/v1/content/story-ai-providers/ - List all AI provider configurations
    - PATCH /api/v1/content/story-ai-providers/{id}/ - Update configuration (admin only)

    Only admin users can modify configurations.
    """
    from .serializers import StoryAIProviderConfigSerializer
    from .models import StoryAIProviderConfig

    serializer_class = StoryAIProviderConfigSerializer
    queryset = StoryAIProviderConfig.objects.all()
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_permissions(self):  # type: ignore[override]
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class StoryAnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for story analytics and metrics.

    ## Endpoints:
    - GET /api/v1/content/analytics/top-stories/ - Get top performing stories
    - GET /api/v1/content/analytics/engagement-stats/ - Get overall engagement statistics
    - GET /api/v1/content/analytics/trending-tags/ - Get trending tags
    - GET /api/v1/content/analytics/performance-trends/ - Get performance trends over time
    - GET /api/v1/content/analytics/user-stats/ - Get user engagement statistics
    - GET /api/v1/content/analytics/ai-stats/ - Get AI generation performance stats
    - POST /api/v1/content/analytics/invalidate/ - Invalidate analytics cache (admin only)

    ## Permissions:
    - Read access: Authenticated users
    - Cache invalidation: Admin users only
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def top_stories(self, request):
        """
        Get top performing stories by engagement score.

        Query Parameters:
        - days: Number of days to look back (default: 7)
        - limit: Maximum number of stories to return (default: 10)
        """
        from .analytics import StoryAnalytics

        days = request.query_params.get('days', 7)
        limit = request.query_params.get('limit', 10)

        try:
            days = int(days)
            limit = int(limit)
        except (ValueError, TypeError):
            days = 7
            limit = 10

        stories = StoryAnalytics.get_top_stories(days=days, limit=limit)
        return Response(stories)

    @action(detail=False, methods=['get'])
    def engagement_stats(self, request):
        """Get overall engagement statistics for all stories."""
        from .analytics import StoryAnalytics

        stats = StoryAnalytics.get_engagement_stats()
        return Response(stats)

    @action(detail=False, methods=['get'])
    def trending_tags(self, request):
        """
        Get trending tags based on usage and engagement.

        Query Parameters:
        - days: Number of days to look back (default: 30)
        - limit: Maximum number of tags to return (default: 20)
        """
        from .analytics import StoryAnalytics

        days = request.query_params.get('days', 30)
        limit = request.query_params.get('limit', 20)

        try:
            days = int(days)
            limit = int(limit)
        except (ValueError, TypeError):
            days = 30
            limit = 20

        tags = StoryAnalytics.get_trending_tags(days=days, limit=limit)
        return Response(tags)

    @action(detail=False, methods=['get'])
    def performance_trends(self, request):
        """
        Get content performance trends over time.

        Query Parameters:
        - days: Number of days to analyze (default: 30)
        """
        from .analytics import StoryAnalytics

        days = request.query_params.get('days', 30)

        try:
            days = int(days)
        except (ValueError, TypeError):
            days = 30

        trends = StoryAnalytics.get_content_performance_trends(days=days)
        return Response(trends)

    @action(detail=False, methods=['get'])
    def user_stats(self, request):
        """Get engagement statistics for the current user's stories."""
        from .analytics import StoryAnalytics

        stats = StoryAnalytics.get_user_engagement_stats(user_id=request.user.id)
        return Response(stats)

    @action(detail=False, methods=['get'])
    def ai_stats(self, request):
        """Get AI generation performance statistics."""
        from .analytics import AIMetrics

        stats = AIMetrics.get_ai_performance_stats()
        return Response(stats)

    @action(detail=False, methods=['get'])
    def cache_performance(self, request):
        """Get cache performance metrics."""
        from .analytics import StoryAnalytics

        performance = StoryAnalytics.get_cache_performance()
        return Response(performance)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def invalidate(self, request):
        """Invalidate all analytics caches (admin only)."""
        from .analytics import StoryAnalytics

        StoryAnalytics.invalidate_analytics_cache()
        return Response({'message': 'Analytics caches invalidated successfully'})


class ContentReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for content reporting.

    ## Endpoints:
    - GET /api/v1/content/reports/ - List reports (moderators see all, users see own)
    - POST /api/v1/content/reports/ - Create a report
    - GET /api/v1/content/reports/{id}/ - Retrieve a report
    - PATCH /api/v1/content/reports/{id}/ - Update report status (moderators only)
    - POST /api/v1/content/reports/{id}/resolve/ - Resolve a report (moderators only)
    - POST /api/v1/content/reports/{id}/dismiss/ - Dismiss a report (moderators only)

    ## Permissions:
    - Create: Authenticated users
    - List: Own reports for regular users, all reports for moderators
    - Update/Resolve/Dismiss: Moderators only
    """
    from .serializers import ContentReportSerializer
    from .models import ContentReport

    serializer_class = ContentReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'report_type']
    ordering = ['-created_at']

    def get_queryset(self):  # type: ignore[override]
        user = self.request.user
        qs = ContentReport.objects.select_related(
            'reporter',
            'reviewed_by',
            'reported_story',
            'reported_comment'
        )

        # Moderators see all reports, regular users see only their own
        if not user.is_staff:
            qs = qs.filter(reporter=user)

        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        """Create a report and check for spam patterns"""
        from .spam_detection import SpamDetector

        report = serializer.save(reporter=self.request.user)

        # If reporting a comment, check if it's spam
        if report.reported_comment:
            spam_result = SpamDetector.check_content(
                report.reported_comment.content,
                report.reported_comment.author_id,
                'comment'
            )

            if spam_result['is_spam']:
                # Automatically take action on spam
                from .models import ModerationAction
                ModerationAction.objects.create(
                    action_type=ModerationAction.ActionType.SPAM_DETECTED,
                    reason=f"Spam automatiquement détecté: {', '.join(spam_result['reasons'])}",
                    target_comment=report.reported_comment,
                    target_user=report.reported_comment.author,
                    related_report=report,
                    is_automated=True,
                    metadata={'spam_result': spam_result}
                )

                logger.info(
                    f"Spam detected in comment {report.reported_comment.id} "
                    f"with confidence {spam_result['confidence']}"
                )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def resolve(self, request, pk=None):
        """Resolve a report (mark as resolved)"""
        report = self.get_object()
        moderator_notes = request.data.get('moderator_notes', '')

        report.status = ContentReport.Status.RESOLVED
        report.moderator_notes = moderator_notes
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save()

        return Response({'message': 'Signalement résolu avec succès'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def dismiss(self, request, pk=None):
        """Dismiss a report (mark as dismissed)"""
        report = self.get_object()
        moderator_notes = request.data.get('moderator_notes', '')

        report.status = ContentReport.Status.DISMISSED
        report.moderator_notes = moderator_notes
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save()

        return Response({'message': 'Signalement rejeté avec succès'})


class ModerationActionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for moderation actions.

    ## Endpoints:
    - GET /api/v1/content/moderation-actions/ - List all moderation actions (staff only)
    - POST /api/v1/content/moderation-actions/ - Create a moderation action (staff only)
    - GET /api/v1/content/moderation-actions/{id}/ - Retrieve an action

    ## Permissions:
    - All operations: Staff only
    """
    from .serializers import ModerationActionSerializer
    from .models import ModerationAction

    serializer_class = ModerationActionSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = ModerationAction.objects.select_related(
        'moderator',
        'target_user',
        'target_story',
        'target_comment',
        'related_report'
    ).all()
    filterset_fields = ['action_type', 'is_automated', 'target_user']
    ordering = ['-created_at']

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(moderator=self.request.user)


class SpamPatternViewSet(viewsets.ModelViewSet):
    """
    ViewSet for spam pattern management.

    ## Endpoints:
    - GET /api/v1/content/spam-patterns/ - List all spam patterns (staff only)
    - POST /api/v1/content/spam-patterns/ - Create a spam pattern (staff only)
    - PATCH /api/v1/content/spam-patterns/{id}/ - Update a pattern (staff only)
    - DELETE /api/v1/content/spam-patterns/{id}/ - Delete a pattern (staff only)
    - POST /api/v1/content/spam-patterns/{id}/test/ - Test pattern against sample text

    ## Permissions:
    - All operations: Staff only
    """
    from .serializers import SpamPatternSerializer
    from .models import SpamPattern

    serializer_class = SpamPatternSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = SpamPattern.objects.select_related('created_by').all()
    filterset_fields = ['pattern_type', 'is_active']
    ordering = ['-severity', '-created_at']

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test a spam pattern against sample text"""
        import re
        from .models import SpamPattern

        pattern_obj = self.get_object()
        test_text = request.data.get('text', '')

        if not test_text:
            return Response(
                {'error': 'Le paramètre "text" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        matched = False

        if pattern_obj.pattern_type == SpamPattern.PatternType.KEYWORD:
            matched = pattern_obj.pattern.lower() in test_text.lower()

        elif pattern_obj.pattern_type == SpamPattern.PatternType.REGEX:
            try:
                matched = bool(re.search(pattern_obj.pattern, test_text, re.IGNORECASE))
            except re.error as e:
                return Response(
                    {'error': f'Expression régulière invalide: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        elif pattern_obj.pattern_type == SpamPattern.PatternType.URL_PATTERN:
            matched = bool(re.search(pattern_obj.pattern, test_text, re.IGNORECASE))

        return Response({
            'matched': matched,
            'pattern_type': pattern_obj.pattern_type,
            'severity': pattern_obj.severity,
            'would_trigger_action': pattern_obj.auto_action if matched else None,
        })


class SpamCheckView(APIView):
    """
    Endpoint for checking content for spam before posting.

    POST /api/v1/content/check-spam/
    Body: {"content": "text to check"}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .spam_detection import SpamDetector

        content = request.data.get('content', '')
        if not content:
            return Response(
                {'error': 'Le paramètre "content" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Run spam detection
        spam_result = SpamDetector.check_content(
            content,
            request.user.id,
            'comment'
        )

        # Check against custom patterns
        pattern_result = SpamDetector.check_with_patterns(content)

        return Response({
            'is_spam': spam_result['is_spam'],
            'confidence': spam_result['confidence'],
            'reasons': spam_result['reasons'],
            'severity': spam_result['severity'],
            'custom_patterns_matched': pattern_result['matched'],
            'matched_patterns': pattern_result['patterns'],
            'recommended_action': pattern_result.get('recommended_action'),
        })


class StoryCollectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for story collections.

    ## Endpoints:
    - GET /api/v1/content/collections/ - List collections (user's own + public)
    - POST /api/v1/content/collections/ - Create a collection
    - GET /api/v1/content/collections/{id}/ - Retrieve a collection
    - PATCH /api/v1/content/collections/{id}/ - Update a collection (owner only)
    - DELETE /api/v1/content/collections/{id}/ - Delete a collection (owner only)
    - POST /api/v1/content/collections/{id}/add-story/ - Add story to collection
    - POST /api/v1/content/collections/{id}/remove-story/ - Remove story from collection
    - POST /api/v1/content/collections/{id}/reorder/ - Reorder stories in collection

    ## Permissions:
    - List/Retrieve: Authenticated users (own + public collections)
    - Create/Update/Delete: Collection owner only
    """
    serializer_class = StoryCollectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering = ['-created_at']

    def get_queryset(self):  # type: ignore[override]
        user = self.request.user
        qs = StoryCollection.objects.select_related('author').prefetch_related('stories')

        # Show user's own collections + public collections
        if self.action == 'list':
            qs = qs.filter(Q(author=user) | Q(is_public=True))
        else:
            # For detail views, check in perform_update/destroy
            pass

        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):  # type: ignore[override]
        instance = self.get_object()
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos collections")
        serializer.save()

    def perform_destroy(self, instance):  # type: ignore[override]
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("Vous ne pouvez supprimer que vos collections")
        instance.delete()

    @action(detail=True, methods=['post'])
    def add_story(self, request, pk=None):
        """
        Add a story to the collection.

        Body: {"story_id": "uuid"}
        """
        collection = self.get_object()

        # Only owner can modify
        if collection.author != request.user:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos collections")

        story_id = request.data.get('story_id')
        if not story_id:
            return Response(
                {'error': 'Le paramètre "story_id" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if story exists
        try:
            story = Story.objects.get(id=story_id)
        except Story.DoesNotExist:
            return Response(
                {'error': 'Story non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if already in collection
        if StoryCollectionItem.objects.filter(collection=collection, story=story).exists():
            return Response(
                {'error': 'Cette story est déjà dans la collection'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Add to collection (at the end)
        max_order = StoryCollectionItem.objects.filter(collection=collection).aggregate(
            max_order=Count('order')
        )['max_order'] or 0

        StoryCollectionItem.objects.create(
            collection=collection,
            story=story,
            order=max_order + 1
        )

        return Response({'message': 'Story ajoutée à la collection avec succès'})

    @action(detail=True, methods=['post'])
    def remove_story(self, request, pk=None):
        """
        Remove a story from the collection.

        Body: {"story_id": "uuid"}
        """
        collection = self.get_object()

        # Only owner can modify
        if collection.author != request.user:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos collections")

        story_id = request.data.get('story_id')
        if not story_id:
            return Response(
                {'error': 'Le paramètre "story_id" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Remove from collection
        deleted_count, _ = StoryCollectionItem.objects.filter(
            collection=collection,
            story_id=story_id
        ).delete()

        if deleted_count == 0:
            return Response(
                {'error': 'Cette story n\'est pas dans la collection'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({'message': 'Story retirée de la collection avec succès'})

    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """
        Reorder stories in the collection.

        Body: {"story_ids": ["uuid1", "uuid2", "uuid3"]}
        The array order defines the new order.
        """
        collection = self.get_object()

        # Only owner can modify
        if collection.author != request.user:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos collections")

        story_ids = request.data.get('story_ids', [])
        if not isinstance(story_ids, list):
            return Response(
                {'error': 'Le paramètre "story_ids" doit être un tableau'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update order for each story
        for index, story_id in enumerate(story_ids):
            StoryCollectionItem.objects.filter(
                collection=collection,
                story_id=story_id
            ).update(order=index)

        return Response({'message': 'Ordre des stories mis à jour avec succès'})


class StoryDraftViewSet(viewsets.ModelViewSet):
    """
    ViewSet for story drafts.

    ## Endpoints:
    - GET /api/v1/content/drafts/ - List user's drafts
    - POST /api/v1/content/drafts/ - Create a draft
    - GET /api/v1/content/drafts/{id}/ - Retrieve a draft
    - PATCH /api/v1/content/drafts/{id}/ - Update a draft
    - DELETE /api/v1/content/drafts/{id}/ - Delete a draft
    - POST /api/v1/content/drafts/{id}/publish/ - Publish draft as a story
    - POST /api/v1/content/drafts/{id}/schedule/ - Schedule draft for publication

    ## Permissions:
    - All operations: Owner only
    """
    serializer_class = StoryDraftSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering = ['-updated_at']

    def get_queryset(self):  # type: ignore[override]
        # Users can only see their own drafts
        return StoryDraft.objects.filter(author=self.request.user).select_related('published_story')

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """
        Publish a draft as a story.

        The draft will be converted to a published Story and linked.
        """
        draft = self.get_object()

        # Check if already published
        if draft.status == StoryDraft.Status.PUBLISHED:
            return Response(
                {'error': 'Ce brouillon a déjà été publié'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate required fields
        if not draft.title or not draft.content:
            return Response(
                {'error': 'Le titre et le contenu sont requis pour publier'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create published story
        story = Story.objects.create(
            author=draft.author,
            title=draft.title,
            content=draft.content,
            location_name=draft.location_name or '',
            location_lat=draft.location_lat,
            location_lon=draft.location_lon,
            tags=draft.tags,
            media=draft.media,
            is_public=draft.is_public,
            story_type=draft.story_type,
        )

        # Update draft
        draft.status = StoryDraft.Status.PUBLISHED
        draft.published_story = story
        draft.save()

        # Serialize and return the published story
        from .serializers import UserStorySerializer
        serializer = UserStorySerializer(story)

        return Response({
            'message': 'Brouillon publié avec succès',
            'story': serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """
        Schedule a draft for automatic publication.

        Body: {
            "scheduled_for": "2024-12-31T15:00:00Z",
            "auto_publish": true
        }
        """
        draft = self.get_object()

        scheduled_for = request.data.get('scheduled_for')
        auto_publish = request.data.get('auto_publish', True)

        if not scheduled_for:
            return Response(
                {'error': 'Le paramètre "scheduled_for" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse datetime
        from django.utils.dateparse import parse_datetime
        scheduled_dt = parse_datetime(scheduled_for)
        if not scheduled_dt:
            return Response(
                {'error': 'Format de date invalide. Utilisez le format ISO 8601'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if in future
        if scheduled_dt <= timezone.now():
            return Response(
                {'error': 'La date de publication doit être dans le futur'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update draft
        draft.scheduled_for = scheduled_dt
        draft.auto_publish = auto_publish
        draft.status = StoryDraft.Status.SCHEDULED
        draft.save()

        return Response({
            'message': 'Publication planifiée avec succès',
            'scheduled_for': draft.scheduled_for.isoformat()
        })


class StorySeriesViewSet(viewsets.ModelViewSet):
    """
    ViewSet for story series.

    ## Endpoints:
    - GET /api/v1/content/series/ - List series (user's own + public)
    - POST /api/v1/content/series/ - Create a series
    - GET /api/v1/content/series/{id}/ - Retrieve a series
    - PATCH /api/v1/content/series/{id}/ - Update a series
    - DELETE /api/v1/content/series/{id}/ - Delete a series
    - POST /api/v1/content/series/{id}/add-story/ - Add story to series
    - POST /api/v1/content/series/{id}/remove-story/ - Remove story from series
    - POST /api/v1/content/series/{id}/reorder/ - Reorder stories in series
    - POST /api/v1/content/series/{id}/mark-complete/ - Mark series as complete

    ## Permissions:
    - List/Retrieve: Authenticated users
    - Create/Update/Delete: Owner only
    """
    serializer_class = StorySeriesSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering = ['-created_at']

    def get_queryset(self):  # type: ignore[override]
        user = self.request.user
        qs = StorySeries.objects.select_related('author').prefetch_related('stories')

        # Show user's own series + public series (from public stories)
        if self.action == 'list':
            qs = qs.filter(Q(author=user) | Q(is_public=True))

        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):  # type: ignore[override]
        instance = self.get_object()
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos séries")
        serializer.save()

    def perform_destroy(self, instance):  # type: ignore[override]
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("Vous ne pouvez supprimer que vos séries")
        instance.delete()

    @action(detail=True, methods=['post'])
    def add_story(self, request, pk=None):
        """
        Add a story to the series.

        Body: {"story_id": "uuid", "order": 1}
        Order is required and must be unique within the series.
        """
        series = self.get_object()

        # Only owner can modify
        if series.author != request.user:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos séries")

        story_id = request.data.get('story_id')
        order = request.data.get('order')

        if not story_id:
            return Response(
                {'error': 'Le paramètre "story_id" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order is None:
            return Response(
                {'error': 'Le paramètre "order" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if story exists
        try:
            story = Story.objects.get(id=story_id)
        except Story.DoesNotExist:
            return Response(
                {'error': 'Story non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if already in series
        if StorySeriesItem.objects.filter(series=series, story=story).exists():
            return Response(
                {'error': 'Cette story est déjà dans la série'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if order already exists
        if StorySeriesItem.objects.filter(series=series, order=order).exists():
            return Response(
                {'error': f'La position {order} est déjà utilisée dans cette série'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Add to series
        StorySeriesItem.objects.create(
            series=series,
            story=story,
            order=order
        )

        return Response({'message': 'Story ajoutée à la série avec succès'})

    @action(detail=True, methods=['post'])
    def remove_story(self, request, pk=None):
        """
        Remove a story from the series.

        Body: {"story_id": "uuid"}
        """
        series = self.get_object()

        # Only owner can modify
        if series.author != request.user:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos séries")

        story_id = request.data.get('story_id')
        if not story_id:
            return Response(
                {'error': 'Le paramètre "story_id" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Remove from series
        deleted_count, _ = StorySeriesItem.objects.filter(
            series=series,
            story_id=story_id
        ).delete()

        if deleted_count == 0:
            return Response(
                {'error': 'Cette story n\'est pas dans la série'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({'message': 'Story retirée de la série avec succès'})

    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """
        Reorder stories in the series.

        Body: {"story_orders": [{"story_id": "uuid1", "order": 1}, {"story_id": "uuid2", "order": 2}]}
        """
        series = self.get_object()

        # Only owner can modify
        if series.author != request.user:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos séries")

        story_orders = request.data.get('story_orders', [])
        if not isinstance(story_orders, list):
            return Response(
                {'error': 'Le paramètre "story_orders" doit être un tableau'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate all orders are unique
        orders = [item.get('order') for item in story_orders]
        if len(orders) != len(set(orders)):
            return Response(
                {'error': 'Les positions doivent être uniques'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update order for each story
        for item in story_orders:
            story_id = item.get('story_id')
            order = item.get('order')

            if not story_id or order is None:
                continue

            StorySeriesItem.objects.filter(
                series=series,
                story_id=story_id
            ).update(order=order)

        return Response({'message': 'Ordre des stories mis à jour avec succès'})

    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        """
        Mark a series as complete (no more stories will be added).
        """
        series = self.get_object()

        # Only owner can modify
        if series.author != request.user:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos séries")

        series.is_complete = True
        series.save()

        return Response({'message': 'Série marquée comme complète avec succès'})


class StoryMediaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for story media library management.

    ## Endpoints:
    - GET /api/v1/content/media/ - List user's media library
    - POST /api/v1/content/media/ - Upload new media (with optimization)
    - GET /api/v1/content/media/{id}/ - Retrieve media details
    - PATCH /api/v1/content/media/{id}/ - Update media metadata
    - DELETE /api/v1/content/media/{id}/ - Delete media
    - POST /api/v1/content/media/{id}/attach-to-story/ - Attach to a story
    - POST /api/v1/content/media/{id}/detach-from-story/ - Detach from story
    - POST /api/v1/content/media/upload/ - Upload with processing

    ## Permissions:
    - Authenticated users can upload and manage their own media
    - Media can be in library (story=null) or attached to story
    """

    serializer_class = StoryMediaSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        """Return user's own media"""
        return StoryMedia.objects.filter(user=self.request.user).select_related(
            'story', 'user'
        )

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """
        Upload media with automatic processing and optimization.

        Expected data:
        - file: File to upload (required)
        - media_type: 'image' or 'video' (required)
        - story_id: UUID of story to attach (optional)
        - alt_text: Accessibility alt text (optional)
        - caption: Media caption (optional)

        Returns uploaded media with all variants.
        """
        from django.core.files.storage import default_storage
        from apps.media.processing import (
            ImageProcessor,
            VideoProcessor,
            generate_storage_path,
        )

        # Validate input
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'error': 'Aucun fichier fourni'},
                status=status.HTTP_400_BAD_REQUEST
            )

        media_type = request.data.get('media_type')
        if media_type not in ['image', 'video']:
            return Response(
                {'error': 'Type de média invalide (doit être "image" ou "video")'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get optional parameters
        story_id = request.data.get('story_id')
        alt_text = request.data.get('alt_text', '')
        caption = request.data.get('caption', '')

        try:
            # Validate story if provided
            story = None
            if story_id:
                story = Story.objects.get(id=story_id, author=request.user)

            # Process based on media type
            if media_type == 'image':
                # Validate image
                ImageProcessor.validate_image_file(file_obj, max_size_mb=10)

                # Process image
                processed_data = ImageProcessor.process_image(file_obj, generate_webp=True)

                # Save original file
                original_path = generate_storage_path(
                    str(request.user.public_id),
                    file_obj.name,
                    media_type='image'
                )
                file_obj.seek(0)
                saved_original_path = default_storage.save(original_path, file_obj)
                original_url = request.build_absolute_uri(
                    settings.MEDIA_URL + saved_original_path
                )

                # Save variants
                variant_paths = {}
                variant_urls = {}

                for variant_name, variant_file in processed_data['variants'].items():
                    # Determine extension
                    ext = 'webp' if 'webp' in variant_name else 'jpg'
                    variant_path = generate_storage_path(
                        str(request.user.public_id),
                        f"{file_obj.name}.{ext}",
                        variant=variant_name,
                        media_type='image'
                    )
                    saved_variant_path = default_storage.save(variant_path, variant_file)
                    variant_paths[variant_name] = saved_variant_path
                    variant_urls[variant_name] = request.build_absolute_uri(
                        settings.MEDIA_URL + saved_variant_path
                    )

                # Create media record
                media_item = StoryMedia.objects.create(
                    user=request.user,
                    story=story,
                    media_type=StoryMedia.MediaType.IMAGE,
                    original_filename=file_obj.name,
                    file_size=file_obj.size,
                    mime_type=file_obj.content_type,
                    url_original=original_url,
                    url_large=variant_urls.get('large', ''),
                    url_medium=variant_urls.get('medium', ''),
                    url_thumbnail=variant_urls.get('thumbnail', ''),
                    url_webp=variant_urls.get('webp_original', ''),
                    width=processed_data['width'],
                    height=processed_data['height'],
                    processing_status=StoryMedia.ProcessingStatus.COMPLETED,
                    alt_text=alt_text,
                    caption=caption,
                    storage_path_original=saved_original_path,
                    storage_path_variants=variant_paths,
                )

            else:  # video
                # Validate video
                VideoProcessor.validate_video_file(file_obj)

                # Save video file
                video_path = generate_storage_path(
                    str(request.user.public_id),
                    file_obj.name,
                    media_type='video'
                )
                saved_video_path = default_storage.save(video_path, file_obj)
                video_url = request.build_absolute_uri(
                    settings.MEDIA_URL + saved_video_path
                )

                # Create media record
                media_item = StoryMedia.objects.create(
                    user=request.user,
                    story=story,
                    media_type=StoryMedia.MediaType.VIDEO,
                    original_filename=file_obj.name,
                    file_size=file_obj.size,
                    mime_type=file_obj.content_type,
                    url_original=video_url,
                    processing_status=StoryMedia.ProcessingStatus.COMPLETED,
                    alt_text=alt_text,
                    caption=caption,
                    storage_path_original=saved_video_path,
                )

            # Serialize and return
            serializer = self.get_serializer(media_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Story.DoesNotExist:
            return Response(
                {'error': 'Story non trouvée ou vous n\'en êtes pas l\'auteur'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Media upload failed: {e}")
            return Response(
                {'error': 'Échec de l\'upload du média'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def attach_to_story(self, request, pk=None):
        """
        Attach media from library to a story.

        Expected data:
        - story_id: UUID of the story
        - order: Display order (optional)
        """
        media = self.get_object()
        story_id = request.data.get('story_id')
        order = request.data.get('order', 0)

        if not story_id:
            return Response(
                {'error': 'story_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            story = Story.objects.get(id=story_id, author=request.user)
            media.story = story
            media.order = order
            media.save()

            serializer = self.get_serializer(media)
            return Response(serializer.data)

        except Story.DoesNotExist:
            return Response(
                {'error': 'Story non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def detach_from_story(self, request, pk=None):
        """Detach media from story (return to library)"""
        media = self.get_object()
        media.story = None
        media.order = 0
        media.save()

        serializer = self.get_serializer(media)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        """Delete media files when deleting record"""
        from django.core.files.storage import default_storage

        # Delete original file
        if instance.storage_path_original:
            try:
                default_storage.delete(instance.storage_path_original)
            except Exception as e:
                logger.warning(f"Failed to delete original file: {e}")

        # Delete variant files
        for variant_path in instance.storage_path_variants.values():
            try:
                default_storage.delete(variant_path)
            except Exception as e:
                logger.warning(f"Failed to delete variant file: {e}")

        instance.delete()
