"""
Migration to add story collections, drafts, and series models.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('content', '0012_add_fulltext_search_index'),
    ]

    operations = [
        # Create StoryCollection model
        migrations.CreateModel(
            name='StoryCollection',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('cover_image', models.URLField(blank=True)),
                ('is_public', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='story_collections', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),

        # Create StoryCollectionItem through model
        migrations.CreateModel(
            name='StoryCollectionItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(default=0)),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('collection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='content.storycollection')),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='content.story')),
            ],
            options={
                'ordering': ['order', 'added_at'],
                'unique_together': {('collection', 'story')},
            },
        ),

        # Add stories M2M field to StoryCollection
        migrations.AddField(
            model_name='storycollection',
            name='stories',
            field=models.ManyToManyField(related_name='collections', through='content.StoryCollectionItem', to='content.story'),
        ),

        # Create StoryDraft model
        migrations.CreateModel(
            name='StoryDraft',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(blank=True, max_length=255)),
                ('content', models.TextField(blank=True)),
                ('location_name', models.CharField(blank=True, max_length=255)),
                ('location_lat', models.FloatField(blank=True, null=True)),
                ('location_lon', models.FloatField(blank=True, null=True)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('media', models.JSONField(blank=True, default=list)),
                ('is_public', models.BooleanField(default=True)),
                ('story_type', models.CharField(choices=[('user', 'Utilisateur'), ('ai_generated', 'Généré par IA'), ('partner_sponsored', 'Sponsorisé partenaire')], default='user', max_length=32)),
                ('status', models.CharField(choices=[('draft', 'Brouillon'), ('scheduled', 'Planifié'), ('published', 'Publié')], default='draft', max_length=32)),
                ('scheduled_for', models.DateTimeField(blank=True, null=True)),
                ('auto_publish', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='story_drafts', to=settings.AUTH_USER_MODEL)),
                ('published_story', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='draft_versions', to='content.story')),
            ],
            options={
                'ordering': ['-updated_at'],
            },
        ),

        # Create StorySeries model
        migrations.CreateModel(
            name='StorySeries',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('cover_image', models.URLField(blank=True)),
                ('is_public', models.BooleanField(default=True)),
                ('is_complete', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='story_series', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'verbose_name_plural': 'Story series',
            },
        ),

        # Create StorySeriesItem through model
        migrations.CreateModel(
            name='StorySeriesItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField()),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('series', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='content.storyseries')),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='content.story')),
            ],
            options={
                'ordering': ['order'],
                'unique_together': {('series', 'order')},
            },
        ),

        # Add stories M2M field to StorySeries
        migrations.AddField(
            model_name='storyseries',
            name='stories',
            field=models.ManyToManyField(related_name='series', through='content.StorySeriesItem', to='content.story'),
        ),

        # Add indexes for performance
        migrations.AddIndex(
            model_name='storycollection',
            index=models.Index(fields=['author', '-created_at'], name='collection_author_idx'),
        ),
        migrations.AddIndex(
            model_name='storycollection',
            index=models.Index(fields=['is_public'], name='collection_public_idx'),
        ),
        migrations.AddIndex(
            model_name='storydraft',
            index=models.Index(fields=['author', '-updated_at'], name='draft_author_idx'),
        ),
        migrations.AddIndex(
            model_name='storydraft',
            index=models.Index(fields=['status', 'scheduled_for'], name='draft_schedule_idx'),
        ),
        migrations.AddIndex(
            model_name='storyseries',
            index=models.Index(fields=['author', '-created_at'], name='series_author_idx'),
        ),
        migrations.AddIndex(
            model_name='storyseries',
            index=models.Index(fields=['is_public', 'is_complete'], name='series_status_idx'),
        ),
    ]
