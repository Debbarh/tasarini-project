"""
Migration to add StoryMedia model for rich media management.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('content', '0014_storyshare'),
    ]

    operations = [
        migrations.CreateModel(
            name='StoryMedia',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('media_type', models.CharField(
                    max_length=10,
                    choices=[
                        ('image', 'Image'),
                        ('video', 'Vidéo')
                    ]
                )),
                ('original_filename', models.CharField(max_length=255)),
                ('file_size', models.PositiveIntegerField(help_text='Size in bytes')),
                ('mime_type', models.CharField(max_length=100)),

                # URLs for different sizes
                ('url_original', models.URLField(help_text='Original uploaded file')),
                ('url_large', models.URLField(blank=True, help_text='Large size (1920px)')),
                ('url_medium', models.URLField(blank=True, help_text='Medium size (1024px)')),
                ('url_thumbnail', models.URLField(blank=True, help_text='Thumbnail (300px)')),
                ('url_webp', models.URLField(blank=True, help_text='WebP optimized version')),

                # Image/Video metadata
                ('width', models.PositiveIntegerField(null=True, blank=True)),
                ('height', models.PositiveIntegerField(null=True, blank=True)),
                ('duration', models.PositiveIntegerField(null=True, blank=True, help_text='Video duration in seconds')),

                # Processing status
                ('processing_status', models.CharField(
                    max_length=20,
                    choices=[
                        ('pending', 'En attente'),
                        ('processing', 'En traitement'),
                        ('completed', 'Terminé'),
                        ('failed', 'Échoué')
                    ],
                    default='pending'
                )),
                ('processing_error', models.TextField(blank=True)),

                # Metadata
                ('alt_text', models.CharField(max_length=255, blank=True, help_text='Accessibility alt text')),
                ('caption', models.TextField(blank=True)),
                ('order', models.PositiveIntegerField(default=0, help_text='Display order in story')),

                # Storage paths
                ('storage_path_original', models.CharField(max_length=500)),
                ('storage_path_variants', models.JSONField(
                    default=dict,
                    blank=True,
                    help_text='Paths to generated variants'
                )),

                # Timestamps
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),

                # Foreign keys
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='story_media',
                    to=settings.AUTH_USER_MODEL
                )),
                ('story', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='media_items',
                    to='content.story',
                    null=True,
                    blank=True,
                    help_text='Story this media belongs to (null if in library only)'
                )),
            ],
            options={
                'ordering': ['order', '-created_at'],
            },
        ),

        # Add indexes for performance
        migrations.AddIndex(
            model_name='storymedia',
            index=models.Index(fields=['user', '-created_at'], name='media_user_idx'),
        ),
        migrations.AddIndex(
            model_name='storymedia',
            index=models.Index(fields=['story', 'order'], name='media_story_order_idx'),
        ),
        migrations.AddIndex(
            model_name='storymedia',
            index=models.Index(fields=['media_type', '-created_at'], name='media_type_idx'),
        ),
        migrations.AddIndex(
            model_name='storymedia',
            index=models.Index(fields=['processing_status'], name='media_status_idx'),
        ),
    ]
