"""
Migration to add PostgreSQL full-text search index for Story model.
"""
from django.contrib.postgres.operations import TrigramExtension
from django.contrib.postgres.search import SearchVector
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('content', '0009_contentreport_moderationaction_spampattern'),
    ]

    operations = [
        # Install pg_trgm extension for trigram similarity (optional but recommended)
        # TrigramExtension(),  # Uncomment if you want trigram support

        # Add GIN index for full-text search
        # This creates an index on the search vector for better performance
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS story_search_idx ON content_story
                USING GIN (
                    to_tsvector('simple',
                        coalesce(title, '') || ' ' ||
                        coalesce(content, '') || ' ' ||
                        coalesce(location_name, '')
                    )
                );
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS story_search_idx;
            """,
        ),

        # Add index for tag searches (JSONB GIN index)
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS story_tags_gin_idx ON content_story
                USING GIN (tags);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS story_tags_gin_idx;
            """,
        ),
    ]
