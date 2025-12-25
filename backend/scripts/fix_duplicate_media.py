#!/usr/bin/env python3
"""
Script to remove duplicate media URLs from Story objects
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tasarini_backend.settings')
django.setup()

from apps.content.models import Story


def fix_duplicate_media():
    """Remove duplicate URLs from media_images and media_videos fields"""
    stories = Story.objects.all()
    fixed_count = 0

    for story in stories:
        modified = False

        # Fix media_images
        if story.media_images and isinstance(story.media_images, list):
            original_count = len(story.media_images)
            # Remove duplicates while preserving order
            unique_images = []
            seen = set()
            for img in story.media_images:
                if img not in seen:
                    unique_images.append(img)
                    seen.add(img)

            if len(unique_images) != original_count:
                story.media_images = unique_images
                modified = True
                print(f"Story #{story.id} - Images: {original_count} → {len(unique_images)}")

        # Fix media_videos
        if story.media_videos and isinstance(story.media_videos, list):
            original_count = len(story.media_videos)
            # Remove duplicates while preserving order
            unique_videos = []
            seen = set()
            for vid in story.media_videos:
                if vid not in seen:
                    unique_videos.append(vid)
                    seen.add(vid)

            if len(unique_videos) != original_count:
                story.media_videos = unique_videos
                modified = True
                print(f"Story #{story.id} - Videos: {original_count} → {len(unique_videos)}")

        if modified:
            story.save()
            fixed_count += 1

    print(f"\n✅ Nettoyage terminé: {fixed_count} stories corrigées")
    return fixed_count


if __name__ == '__main__':
    print("🧹 Démarrage du nettoyage des médias dupliqués...\n")
    fix_duplicate_media()
