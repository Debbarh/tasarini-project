"""
Custom pagination classes for content app.

Provides enhanced pagination with additional metadata for better UX.
"""
from __future__ import annotations

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StoryPagination(PageNumberPagination):
    """
    Custom pagination for Story lists.

    Features:
    - Default page size: 20 stories
    - Configurable via ?page_size= query parameter (max 100)
    - Rich metadata including counts and page info

    Query Parameters:
        page: Page number (default: 1)
        page_size: Number of items per page (default: 20, max: 100)

    Response Format:
        {
            "count": 150,              # Total number of stories
            "next": "http://.../stories/?page=3",
            "previous": "http://.../stories/?page=1",
            "total_pages": 8,          # Total number of pages
            "current_page": 2,         # Current page number
            "page_size": 20,           # Items per page
            "results": [...]           # Story objects
        }
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        """Add custom metadata to paginated response"""
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.page.paginator.per_page,
            'results': data
        })


class CommentPagination(PageNumberPagination):
    """
    Custom pagination for Story Comments.

    Features:
    - Smaller page size for comments: 10 items
    - Configurable via ?page_size= query parameter (max 50)
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

    def get_paginated_response(self, data):
        """Add custom metadata to paginated response"""
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.page.paginator.per_page,
            'results': data
        })
