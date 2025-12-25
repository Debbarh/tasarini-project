"""
Middleware for content app monitoring and metrics.
"""
from __future__ import annotations

import logging
import time
from typing import Callable

from django.core.cache import cache
from django.http import HttpRequest, HttpResponse

logger = logging.getLogger(__name__)


class StoryMetricsMiddleware:
    """
    Middleware to track metrics for story-related requests.

    Tracks:
    - Response times for story endpoints
    - Cache hit/miss rates
    - API usage patterns
    """

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Only track story-related endpoints
        if not request.path.startswith('/api/v1/stories'):
            return self.get_response(request)

        # Track request start time
        start_time = time.time()

        # Process request
        response = self.get_response(request)

        # Calculate response time
        response_time = (time.time() - start_time) * 1000  # in milliseconds

        # Log metrics
        self._log_request_metrics(request, response, response_time)

        # Update performance metrics in cache
        self._update_performance_metrics(request.path, response_time)

        return response

    def _log_request_metrics(
        self,
        request: HttpRequest,
        response: HttpResponse,
        response_time: float
    ) -> None:
        """Log request metrics in structured format"""
        logger.info(
            'Story API Request',
            extra={
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'response_time_ms': round(response_time, 2),
                'user_id': request.user.id if request.user.is_authenticated else None,
                'query_params': dict(request.GET),
            }
        )

    def _update_performance_metrics(self, path: str, response_time: float) -> None:
        """Update running average of response times"""
        cache_key = f'metrics:response_time:{path}'

        # Get current metrics
        metrics = cache.get(cache_key, {'count': 0, 'total': 0, 'avg': 0})

        # Update metrics
        metrics['count'] += 1
        metrics['total'] += response_time
        metrics['avg'] = metrics['total'] / metrics['count']

        # Store back in cache (24 hours TTL)
        cache.set(cache_key, metrics, 86400)


class StoryViewTrackingMiddleware:
    """
    Middleware to automatically track story views.

    Increments view count when a story detail page is accessed.
    Uses Redis-like increment to avoid race conditions.
    """

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)

        # Only track successful GET requests to story detail endpoints
        if (
            request.method == 'GET'
            and response.status_code == 200
            and '/api/v1/stories/' in request.path
            and request.path.count('/') >= 5  # /api/v1/stories/{id}/
        ):
            # Extract story ID from path
            try:
                # Path format: /api/v1/stories/{id}/ or /api/v1/stories/{id}/action/
                parts = request.path.strip('/').split('/')
                if len(parts) >= 4 and parts[3]:  # Has story ID
                    story_id = parts[3]
                    # Only increment if it's a detail view (not an action like /like/)
                    if len(parts) == 4 or (len(parts) == 5 and parts[4] == ''):
                        self._increment_view_count(story_id, request)
            except (ValueError, IndexError):
                pass  # Invalid story ID, skip tracking

        return response

    def _increment_view_count(self, story_id: str, request: HttpRequest) -> None:
        """Increment view count for a story (async to not slow down response)"""
        from django.db.models import F
        from apps.content.models import Story

        try:
            # Use F expression to avoid race conditions
            Story.objects.filter(id=story_id).update(views_count=F('views_count') + 1)

            logger.debug(
                f'Story view tracked: {story_id}',
                extra={
                    'story_id': story_id,
                    'user_id': request.user.id if request.user.is_authenticated else None,
                    'ip': self._get_client_ip(request),
                }
            )
        except Story.DoesNotExist:
            pass  # Story doesn't exist, skip
        except Exception as e:
            logger.error(f'Error tracking story view: {e}')

    @staticmethod
    def _get_client_ip(request: HttpRequest) -> str:
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
