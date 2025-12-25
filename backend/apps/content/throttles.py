"""
Custom throttle classes for content endpoints
"""
from rest_framework.throttling import UserRateThrottle


class LikeThrottle(UserRateThrottle):
    """Throttle for like actions - 30 requests per minute"""
    rate = '30/min'
    scope = 'likes'


class CommentThrottle(UserRateThrottle):
    """Throttle for comment actions - 10 requests per minute"""
    rate = '10/min'
    scope = 'comments'


class BookmarkThrottle(UserRateThrottle):
    """Throttle for bookmark actions - 30 requests per minute"""
    rate = '30/min'
    scope = 'bookmarks'


class StoryCreateThrottle(UserRateThrottle):
    """Throttle for story creation - 5 requests per minute"""
    rate = '5/min'
    scope = 'story_create'
