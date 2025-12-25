"""
Notification utilities for story-related events.

Provides functionality for:
- Creating notifications for reactions, comments, mentions, follows
- Extracting @mentions from text
- Sending real-time notifications
"""
from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

from django.contrib.auth import get_user_model
from django.db import transaction

if TYPE_CHECKING:
    from apps.accounts.models import User
    from .models import Story, StoryComment, StoryReaction, CommentReaction

logger = logging.getLogger(__name__)

User = get_user_model()


def extract_mentions(text: str) -> list[str]:
    """
    Extract @username mentions from text.

    Args:
        text: Text content to search for mentions

    Returns:
        List of unique usernames mentioned (without @ symbol)

    Examples:
        >>> extract_mentions("Hello @john and @jane!")
        ['john', 'jane']
        >>> extract_mentions("Email me@example.com is not a mention")
        []
    """
    # Match @username (letters, numbers, underscores, hyphens, 3-30 chars)
    # Must be preceded by space or start of string
    # Must be followed by space, punctuation, or end of string
    pattern = r'(?:^|(?<=\s))@([a-zA-Z0-9_-]{3,30})(?=\s|[.,!?;:]|$)'
    mentions = re.findall(pattern, text)

    # Return unique mentions
    return list(set(mentions))


def create_mention_notifications(
    mentioned_by: User,
    text: str,
    story: Story,
    comment: StoryComment | None = None
) -> list[str]:
    """
    Extract mentions from text and create StoryMention records + notifications.

    Args:
        mentioned_by: User who made the mention
        text: Text content containing mentions
        story: Story where mention occurred
        comment: Optional comment where mention occurred

    Returns:
        List of usernames that were mentioned and notified
    """
    from apps.accounts.models import Notification
    from .models import StoryMention

    usernames = extract_mentions(text)
    if not usernames:
        return []

    notified_users = []

    with transaction.atomic():
        for username in usernames:
            try:
                # Find the user
                mentioned_user = User.objects.get(username=username)

                # Don't notify self-mentions
                if mentioned_user == mentioned_by:
                    continue

                # Create mention record
                mention = StoryMention.objects.create(
                    mentioned_by=mentioned_by,
                    mentioned_user=mentioned_user,
                    context_type=(
                        StoryMention.MentionContext.COMMENT
                        if comment
                        else StoryMention.MentionContext.STORY
                    ),
                    story=story,
                    comment=comment,
                )

                # Create notification
                context = f"un commentaire sur '{story.title}'" if comment else f"la story '{story.title}'"
                Notification.objects.create(
                    user=mentioned_user,
                    type='mention',
                    title='Vous avez été mentionné',
                    message=f"{mentioned_by.username} vous a mentionné dans {context}",
                    metadata={
                        'story_id': str(story.id),
                        'comment_id': str(comment.id) if comment else None,
                        'mentioned_by_id': str(mentioned_by.id),
                        'mentioned_by_username': mentioned_by.username,
                        'mention_id': str(mention.id),
                    }
                )

                mention.notification_sent = True
                mention.save()

                notified_users.append(username)

            except User.DoesNotExist:
                logger.warning(f"Mentioned user @{username} not found")
                continue
            except Exception as e:
                logger.error(f"Failed to create mention notification for @{username}: {e}")
                continue

    return notified_users


def create_reaction_notification(reaction: StoryReaction) -> None:
    """
    Create notification for a story reaction.

    Args:
        reaction: StoryReaction instance
    """
    from apps.accounts.models import Notification

    # Don't notify if user reacts to their own story
    if reaction.story.author == reaction.user:
        return

    # Get emoji for reaction type
    emoji_map = {
        'like': '👍',
        'love': '❤️',
        'laugh': '😂',
        'wow': '😮',
        'sad': '😢',
        'angry': '😠',
        'thinking': '🤔',
        'celebrate': '🎉',
    }
    emoji = emoji_map.get(reaction.reaction_type, '👍')

    Notification.objects.create(
        user=reaction.story.author,
        type='reaction',
        title='Nouvelle réaction',
        message=f"{reaction.user.username} a réagi {emoji} à votre story '{reaction.story.title}'",
        metadata={
            'story_id': str(reaction.story.id),
            'reaction_id': str(reaction.id),
            'reaction_type': reaction.reaction_type,
            'reactor_id': str(reaction.user.id),
            'reactor_username': reaction.user.username,
        }
    )


def create_comment_notification(comment: StoryComment) -> None:
    """
    Create notification for a new comment.

    Args:
        comment: StoryComment instance
    """
    from apps.accounts.models import Notification

    # Don't notify if user comments on their own story
    if comment.story.author == comment.author:
        return

    Notification.objects.create(
        user=comment.story.author,
        type='comment',
        title='Nouveau commentaire',
        message=f"{comment.author.username} a commenté votre story '{comment.story.title}'",
        metadata={
            'story_id': str(comment.story.id),
            'comment_id': str(comment.id),
            'commenter_id': str(comment.author.id),
            'commenter_username': comment.author.username,
            'comment_preview': comment.content[:100],
        }
    )


def create_comment_reaction_notification(reaction: CommentReaction) -> None:
    """
    Create notification for a comment reaction.

    Args:
        reaction: CommentReaction instance
    """
    from apps.accounts.models import Notification

    # Don't notify if user reacts to their own comment
    if reaction.comment.author == reaction.user:
        return

    emoji_map = {
        'like': '👍',
        'love': '❤️',
        'laugh': '😂',
        'thinking': '🤔',
    }
    emoji = emoji_map.get(reaction.reaction_type, '👍')

    Notification.objects.create(
        user=reaction.comment.author,
        type='comment_reaction',
        title='Réaction à votre commentaire',
        message=f"{reaction.user.username} a réagi {emoji} à votre commentaire",
        metadata={
            'story_id': str(reaction.comment.story.id),
            'comment_id': str(reaction.comment.id),
            'reaction_id': str(reaction.id),
            'reaction_type': reaction.reaction_type,
            'reactor_id': str(reaction.user.id),
            'reactor_username': reaction.user.username,
        }
    )


def create_follow_notification(follower: User, followed: User) -> None:
    """
    Create notification when a user follows another.

    Args:
        follower: User who is following
        followed: User being followed
    """
    from apps.accounts.models import Notification

    Notification.objects.create(
        user=followed,
        type='follow',
        title='Nouvel abonné',
        message=f"{follower.username} a commencé à vous suivre",
        metadata={
            'follower_id': str(follower.id),
            'follower_username': follower.username,
        }
    )


def create_new_story_notifications(story: Story) -> int:
    """
    Create notifications for followers when a user publishes a new story.

    Args:
        story: Newly published Story instance

    Returns:
        Number of notifications created
    """
    from apps.accounts.models import Notification, UserFollow

    # Get all followers of the story author
    followers = UserFollow.objects.filter(
        followed=story.author,
        is_active=True
    ).select_related('follower')

    count = 0
    for follow in followers:
        try:
            Notification.objects.create(
                user=follow.follower,
                type='new_story',
                title='Nouvelle story',
                message=f"{story.author.username} a publié une nouvelle story : '{story.title}'",
                metadata={
                    'story_id': str(story.id),
                    'author_id': str(story.author.id),
                    'author_username': story.author.username,
                    'story_title': story.title,
                }
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to create new story notification for {follow.follower.username}: {e}")
            continue

    return count


def bulk_mark_notifications_read(user: User, notification_ids: list[str]) -> int:
    """
    Mark multiple notifications as read.

    Args:
        user: User who owns the notifications
        notification_ids: List of notification IDs to mark as read

    Returns:
        Number of notifications marked as read
    """
    from apps.accounts.models import Notification

    count = Notification.objects.filter(
        user=user,
        id__in=notification_ids,
        is_read=False
    ).update(is_read=True)

    return count
