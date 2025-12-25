"""
Social sharing and embed utilities for stories.

Provides functionality for:
- Open Graph metadata generation
- Embed code generation
- Social media sharing URLs
- Share tracking
"""
from __future__ import annotations

import logging
from typing import Any
from urllib.parse import quote, urlencode

from django.conf import settings

logger = logging.getLogger(__name__)


class SocialSharing:
    """Utilities for social media sharing"""

    # Default sharing messages
    DEFAULT_SHARE_TEXT = "Découvrez cette histoire de voyage inspirante sur Tasarini"

    @staticmethod
    def get_story_url(story_id: str, base_url: str | None = None) -> str:
        """
        Get the full URL for a story.

        Args:
            story_id: UUID of the story
            base_url: Base URL (defaults to settings.FRONTEND_URL or site domain)

        Returns:
            Full URL to the story
        """
        if not base_url:
            base_url = getattr(settings, 'FRONTEND_URL', 'https://tasarini.com')

        # Remove trailing slash
        base_url = base_url.rstrip('/')

        return f"{base_url}/stories/{story_id}"

    @staticmethod
    def get_facebook_share_url(story_id: str, base_url: str | None = None) -> str:
        """
        Generate Facebook share URL.

        Args:
            story_id: UUID of the story
            base_url: Base URL for the story

        Returns:
            Facebook share URL
        """
        story_url = SocialSharing.get_story_url(story_id, base_url)
        params = {'u': story_url}
        return f"https://www.facebook.com/sharer/sharer.php?{urlencode(params)}"

    @staticmethod
    def get_twitter_share_url(
        story_id: str,
        title: str,
        base_url: str | None = None
    ) -> str:
        """
        Generate Twitter (X) share URL.

        Args:
            story_id: UUID of the story
            title: Story title
            base_url: Base URL for the story

        Returns:
            Twitter share URL
        """
        story_url = SocialSharing.get_story_url(story_id, base_url)
        text = f"{title} - {SocialSharing.DEFAULT_SHARE_TEXT}"
        params = {
            'url': story_url,
            'text': text[:280],  # Twitter character limit
            'via': 'Tasarini'
        }
        return f"https://twitter.com/intent/tweet?{urlencode(params)}"

    @staticmethod
    def get_linkedin_share_url(story_id: str, base_url: str | None = None) -> str:
        """
        Generate LinkedIn share URL.

        Args:
            story_id: UUID of the story
            base_url: Base URL for the story

        Returns:
            LinkedIn share URL
        """
        story_url = SocialSharing.get_story_url(story_id, base_url)
        params = {'url': story_url}
        return f"https://www.linkedin.com/sharing/share-offsite/?{urlencode(params)}"

    @staticmethod
    def get_whatsapp_share_url(
        story_id: str,
        title: str,
        base_url: str | None = None
    ) -> str:
        """
        Generate WhatsApp share URL.

        Args:
            story_id: UUID of the story
            title: Story title
            base_url: Base URL for the story

        Returns:
            WhatsApp share URL
        """
        story_url = SocialSharing.get_story_url(story_id, base_url)
        text = f"{title}\n\n{story_url}"
        params = {'text': text}
        return f"https://wa.me/?{urlencode(params)}"

    @staticmethod
    def get_telegram_share_url(
        story_id: str,
        title: str,
        base_url: str | None = None
    ) -> str:
        """
        Generate Telegram share URL.

        Args:
            story_id: UUID of the story
            title: Story title
            base_url: Base URL for the story

        Returns:
            Telegram share URL
        """
        story_url = SocialSharing.get_story_url(story_id, base_url)
        params = {
            'url': story_url,
            'text': title
        }
        return f"https://t.me/share/url?{urlencode(params)}"

    @staticmethod
    def get_email_share_url(
        story_id: str,
        title: str,
        content_excerpt: str,
        base_url: str | None = None
    ) -> str:
        """
        Generate mailto link for email sharing.

        Args:
            story_id: UUID of the story
            title: Story title
            content_excerpt: Brief excerpt from the story
            base_url: Base URL for the story

        Returns:
            Mailto URL
        """
        story_url = SocialSharing.get_story_url(story_id, base_url)
        subject = f"Histoire de voyage : {title}"
        body = f"{title}\n\n{content_excerpt}\n\nLire la suite : {story_url}"
        params = {
            'subject': subject,
            'body': body
        }
        return f"mailto:?{urlencode(params)}"

    @staticmethod
    def get_all_share_urls(
        story_id: str,
        title: str,
        content_excerpt: str,
        base_url: str | None = None
    ) -> dict[str, str]:
        """
        Get all social sharing URLs for a story.

        Args:
            story_id: UUID of the story
            title: Story title
            content_excerpt: Brief excerpt from the story
            base_url: Base URL for the story

        Returns:
            Dictionary with platform names and their share URLs
        """
        return {
            'facebook': SocialSharing.get_facebook_share_url(story_id, base_url),
            'twitter': SocialSharing.get_twitter_share_url(story_id, title, base_url),
            'linkedin': SocialSharing.get_linkedin_share_url(story_id, base_url),
            'whatsapp': SocialSharing.get_whatsapp_share_url(story_id, title, base_url),
            'telegram': SocialSharing.get_telegram_share_url(story_id, title, base_url),
            'email': SocialSharing.get_email_share_url(story_id, title, content_excerpt, base_url),
            'direct_url': SocialSharing.get_story_url(story_id, base_url),
        }


class OpenGraphMetadata:
    """Generate Open Graph metadata for stories"""

    @staticmethod
    def generate_og_tags(story: Any) -> dict[str, str]:
        """
        Generate Open Graph meta tags for a story.

        Args:
            story: Story model instance

        Returns:
            Dictionary of OG tag names and values
        """
        # Get story URL
        story_url = SocialSharing.get_story_url(str(story.id))

        # Get first image from media if available
        image_url = None
        if story.media and isinstance(story.media, list) and len(story.media) > 0:
            first_media = story.media[0]
            if isinstance(first_media, dict):
                image_url = first_media.get('url')

        # Get content excerpt (first 200 chars)
        description = story.content[:200] + '...' if len(story.content) > 200 else story.content
        # Remove HTML tags if any
        import re
        description = re.sub(r'<[^>]+>', '', description)

        og_tags = {
            'og:title': story.title,
            'og:description': description,
            'og:url': story_url,
            'og:type': 'article',
            'og:site_name': 'Tasarini - Histoires de Voyage',
            'og:locale': 'fr_FR',
        }

        # Add image if available
        if image_url:
            og_tags['og:image'] = image_url
            og_tags['og:image:width'] = '1200'
            og_tags['og:image:height'] = '630'
            og_tags['og:image:alt'] = story.title

        # Add article-specific tags
        og_tags['article:published_time'] = story.created_at.isoformat()
        og_tags['article:modified_time'] = story.updated_at.isoformat()
        og_tags['article:author'] = story.author.username

        # Add tags as article:tag
        if story.tags:
            for i, tag in enumerate(story.tags[:5]):  # Limit to 5 tags
                og_tags[f'article:tag_{i}'] = tag

        # Twitter Card tags
        og_tags['twitter:card'] = 'summary_large_image' if image_url else 'summary'
        og_tags['twitter:site'] = '@Tasarini'
        og_tags['twitter:title'] = story.title
        og_tags['twitter:description'] = description
        if image_url:
            og_tags['twitter:image'] = image_url

        return og_tags

    @staticmethod
    def generate_html_meta_tags(story: Any) -> str:
        """
        Generate HTML meta tags string for a story.

        Args:
            story: Story model instance

        Returns:
            HTML string with meta tags
        """
        og_tags = OpenGraphMetadata.generate_og_tags(story)

        html_parts = []
        for name, content in og_tags.items():
            # Escape content for HTML
            content_escaped = str(content).replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')

            if name.startswith('twitter:'):
                html_parts.append(f'<meta name="{name}" content="{content_escaped}" />')
            else:
                html_parts.append(f'<meta property="{name}" content="{content_escaped}" />')

        return '\n'.join(html_parts)


class EmbedGenerator:
    """Generate embed codes for stories"""

    @staticmethod
    def generate_embed_code(
        story_id: str,
        width: str = '100%',
        height: str = '600px',
        theme: str = 'light',
        show_author: bool = True,
        show_location: bool = True,
        base_url: str | None = None
    ) -> str:
        """
        Generate iframe embed code for a story.

        Args:
            story_id: UUID of the story
            width: Width of the iframe (e.g., '100%', '600px')
            height: Height of the iframe (e.g., '600px', '80vh')
            theme: Theme ('light' or 'dark')
            show_author: Whether to show author info
            show_location: Whether to show location info
            base_url: Base URL for the embed

        Returns:
            HTML iframe embed code
        """
        if not base_url:
            base_url = getattr(settings, 'FRONTEND_URL', 'https://tasarini.com')

        base_url = base_url.rstrip('/')

        # Build query parameters for customization
        params = {
            'theme': theme,
            'author': '1' if show_author else '0',
            'location': '1' if show_location else '0',
        }

        embed_url = f"{base_url}/embed/story/{story_id}?{urlencode(params)}"

        iframe_code = f'''<iframe
    src="{embed_url}"
    width="{width}"
    height="{height}"
    frameborder="0"
    scrolling="auto"
    allowfullscreen
    sandbox="allow-scripts allow-same-origin"
    title="Tasarini Story Embed"
    style="border: 1px solid #e0e0e0; border-radius: 8px;">
</iframe>'''

        return iframe_code

    @staticmethod
    def generate_responsive_embed_code(
        story_id: str,
        theme: str = 'light',
        show_author: bool = True,
        show_location: bool = True,
        base_url: str | None = None
    ) -> str:
        """
        Generate responsive embed code that maintains aspect ratio.

        Args:
            story_id: UUID of the story
            theme: Theme ('light' or 'dark')
            show_author: Whether to show author info
            show_location: Whether to show location info
            base_url: Base URL for the embed

        Returns:
            HTML code with responsive wrapper
        """
        iframe = EmbedGenerator.generate_embed_code(
            story_id,
            width='100%',
            height='100%',
            theme=theme,
            show_author=show_author,
            show_location=show_location,
            base_url=base_url
        )

        responsive_code = f'''<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
{iframe}
</div>'''

        return responsive_code
