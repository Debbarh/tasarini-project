"""
Spam detection utilities for content moderation.
"""
from __future__ import annotations

import re
import logging
from typing import Any
from collections import Counter

from django.core.cache import cache
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


class SpamDetector:
    """
    Spam detection system for stories and comments.

    Detection methods:
    - Keyword blacklist matching
    - URL spam detection
    - Repeated content detection
    - Excessive caps/special characters
    - Rapid posting detection
    """

    # Common spam indicators
    SPAM_KEYWORDS = [
        'viagra', 'cialis', 'casino', 'lottery', 'winner', 'congratulations',
        'bitcoin', 'crypto', 'investment', 'trading', 'forex',
        'click here', 'buy now', 'limited offer', 'act now',
        'weight loss', 'diet pills', 'make money', 'work from home',
    ]

    SUSPICIOUS_URL_PATTERNS = [
        r'bit\.ly',
        r'tinyurl',
        r't\.co',
        r'goo\.gl',
        r'\b[a-z0-9]{6,}\.(com|net|org|info)',  # Suspicious short domains
    ]

    @staticmethod
    def check_content(content: str, user_id: int, content_type: str = 'comment') -> dict[str, Any]:
        """
        Check content for spam indicators.

        Args:
            content: The text content to check
            user_id: ID of the user posting the content
            content_type: Type of content ('comment' or 'story')

        Returns:
            dict with spam detection results:
            - is_spam: bool
            - confidence: float (0-1)
            - reasons: list of detected issues
            - severity: int (1-10)
        """
        reasons = []
        severity = 0

        # Check for keyword spam
        keyword_result = SpamDetector._check_keywords(content)
        if keyword_result['detected']:
            reasons.append(f"Mots-clés suspects: {', '.join(keyword_result['keywords'])}")
            severity += keyword_result['severity']

        # Check for URL spam
        url_result = SpamDetector._check_urls(content)
        if url_result['detected']:
            reasons.append(f"URLs suspectes détectées ({url_result['count']})")
            severity += url_result['severity']

        # Check for excessive caps
        caps_result = SpamDetector._check_excessive_caps(content)
        if caps_result['detected']:
            reasons.append(f"Utilisation excessive de majuscules ({caps_result['percentage']}%)")
            severity += caps_result['severity']

        # Check for repeated content
        if content_type == 'comment':
            repeat_result = SpamDetector._check_repeated_content(content, user_id)
            if repeat_result['detected']:
                reasons.append(f"Contenu répété détecté ({repeat_result['count']} fois récemment)")
                severity += repeat_result['severity']

        # Check for rapid posting
        rapid_result = SpamDetector._check_rapid_posting(user_id, content_type)
        if rapid_result['detected']:
            reasons.append(f"Publication trop rapide ({rapid_result['count']} en {rapid_result['timeframe']})")
            severity += rapid_result['severity']

        # Calculate confidence based on severity
        confidence = min(severity / 10.0, 1.0)
        is_spam = severity >= 5  # Threshold for marking as spam

        return {
            'is_spam': is_spam,
            'confidence': confidence,
            'reasons': reasons,
            'severity': severity,
        }

    @staticmethod
    def _check_keywords(content: str) -> dict[str, Any]:
        """Check for spam keywords"""
        content_lower = content.lower()
        found_keywords = [kw for kw in SpamDetector.SPAM_KEYWORDS if kw in content_lower]

        return {
            'detected': len(found_keywords) > 0,
            'keywords': found_keywords,
            'severity': min(len(found_keywords) * 3, 8),
        }

    @staticmethod
    def _check_urls(content: str) -> dict[str, Any]:
        """Check for suspicious URLs"""
        # Count all URLs
        url_pattern = r'https?://[^\s]+'
        urls = re.findall(url_pattern, content)

        # Check for suspicious URL patterns
        suspicious_count = 0
        for url in urls:
            for pattern in SpamDetector.SUSPICIOUS_URL_PATTERNS:
                if re.search(pattern, url, re.IGNORECASE):
                    suspicious_count += 1
                    break

        # Too many URLs or suspicious URL shorteners
        detected = len(urls) > 3 or suspicious_count > 0
        severity = 0
        if suspicious_count > 0:
            severity = 7
        elif len(urls) > 3:
            severity = 4

        return {
            'detected': detected,
            'count': len(urls),
            'suspicious': suspicious_count,
            'severity': severity,
        }

    @staticmethod
    def _check_excessive_caps(content: str) -> dict[str, Any]:
        """Check for excessive use of capital letters"""
        if len(content) < 10:
            return {'detected': False, 'percentage': 0, 'severity': 0}

        letters = [c for c in content if c.isalpha()]
        if not letters:
            return {'detected': False, 'percentage': 0, 'severity': 0}

        caps_count = sum(1 for c in letters if c.isupper())
        percentage = (caps_count / len(letters)) * 100

        detected = percentage > 60  # More than 60% caps
        severity = 3 if detected else 0

        return {
            'detected': detected,
            'percentage': round(percentage, 1),
            'severity': severity,
        }

    @staticmethod
    def _check_repeated_content(content: str, user_id: int) -> dict[str, Any]:
        """Check if user has posted identical or very similar content recently"""
        from .models import StoryComment

        # Get user's recent comments (last 24 hours)
        since = timezone.now() - timedelta(hours=24)
        recent_comments = StoryComment.objects.filter(
            author_id=user_id,
            created_at__gte=since
        ).values_list('content', flat=True)[:50]

        # Count how many times this exact content was posted
        exact_matches = sum(1 for c in recent_comments if c == content)

        # Check for very similar content (simple similarity check)
        similar_matches = 0
        content_words = set(content.lower().split())
        for comment in recent_comments:
            comment_words = set(comment.lower().split())
            if len(content_words & comment_words) / max(len(content_words), 1) > 0.8:
                similar_matches += 1

        total_matches = exact_matches + (similar_matches // 2)
        detected = total_matches >= 3
        severity = min(total_matches * 2, 8)

        return {
            'detected': detected,
            'count': total_matches,
            'severity': severity,
        }

    @staticmethod
    def _check_rapid_posting(user_id: int, content_type: str) -> dict[str, Any]:
        """Check if user is posting too rapidly"""
        cache_key = f'post_rate:{content_type}:{user_id}'

        # Get recent post count from cache
        recent_posts = cache.get(cache_key, [])
        now = timezone.now()

        # Remove posts older than 5 minutes
        cutoff = now - timedelta(minutes=5)
        recent_posts = [ts for ts in recent_posts if ts > cutoff]

        # Add current post
        recent_posts.append(now)
        cache.set(cache_key, recent_posts, 300)  # 5 minutes

        # Check thresholds
        count = len(recent_posts)
        detected = False
        severity = 0

        if content_type == 'comment':
            if count > 10:  # More than 10 comments in 5 minutes
                detected = True
                severity = 6
            elif count > 5:
                detected = True
                severity = 3
        elif content_type == 'story':
            if count > 5:  # More than 5 stories in 5 minutes
                detected = True
                severity = 7

        return {
            'detected': detected,
            'count': count,
            'timeframe': '5 minutes',
            'severity': severity,
        }

    @staticmethod
    def check_with_patterns(content: str) -> dict[str, Any]:
        """
        Check content against custom spam patterns from database.

        Returns:
            dict with matched patterns and recommended action
        """
        from .models import SpamPattern

        patterns = SpamPattern.objects.filter(is_active=True).order_by('-severity')

        matched_patterns = []
        max_severity = 0
        recommended_action = None

        for pattern in patterns:
            matched = False

            if pattern.pattern_type == SpamPattern.PatternType.KEYWORD:
                if pattern.pattern.lower() in content.lower():
                    matched = True

            elif pattern.pattern_type == SpamPattern.PatternType.REGEX:
                try:
                    if re.search(pattern.pattern, content, re.IGNORECASE):
                        matched = True
                except re.error:
                    logger.warning(f"Invalid regex pattern: {pattern.id}")

            elif pattern.pattern_type == SpamPattern.PatternType.URL_PATTERN:
                if re.search(pattern.pattern, content, re.IGNORECASE):
                    matched = True

            if matched:
                matched_patterns.append({
                    'id': str(pattern.id),
                    'type': pattern.pattern_type,
                    'description': pattern.description,
                    'severity': pattern.severity,
                    'action': pattern.auto_action,
                })

                if pattern.severity > max_severity:
                    max_severity = pattern.severity
                    recommended_action = pattern.auto_action

        return {
            'matched': len(matched_patterns) > 0,
            'patterns': matched_patterns,
            'max_severity': max_severity,
            'recommended_action': recommended_action,
        }

    @staticmethod
    def get_user_spam_score(user_id: int) -> dict[str, Any]:
        """
        Calculate overall spam score for a user based on their history.

        Returns:
            dict with user spam metrics
        """
        from .models import ModerationAction, StoryComment

        # Count moderation actions against this user
        actions = ModerationAction.objects.filter(
            target_user_id=user_id,
            action_type__in=[
                ModerationAction.ActionType.SPAM_DETECTED,
                ModerationAction.ActionType.CONTENT_HIDDEN,
                ModerationAction.ActionType.WARNING,
            ]
        )

        spam_actions = actions.filter(action_type=ModerationAction.ActionType.SPAM_DETECTED).count()
        total_actions = actions.count()

        # Get recent comment activity
        recent_comments = StoryComment.objects.filter(
            author_id=user_id,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()

        # Calculate score (0-100)
        score = 0
        score += spam_actions * 20  # Each spam detection adds 20 points
        score += (total_actions - spam_actions) * 5  # Other actions add 5 points

        # High volume posting can be suspicious
        if recent_comments > 100:
            score += 10

        score = min(score, 100)

        return {
            'score': score,
            'spam_actions': spam_actions,
            'total_actions': total_actions,
            'recent_activity': recent_comments,
            'risk_level': 'high' if score > 60 else 'medium' if score > 30 else 'low',
        }
