import uuid

from django.db import migrations, models


def populate_share_tokens(apps, schema_editor):
    SavedItinerary = apps.get_model('content', 'SavedItinerary')
    for row in SavedItinerary.objects.filter(share_token__isnull=True).iterator():
        row.share_token = uuid.uuid4()
        row.save(update_fields=['share_token'])


class Migration(migrations.Migration):
    """Partage public d'un itinéraire par lien : `is_public` + `share_token` (jeton non devinable).
    Le jeton unique est ajouté en 3 temps pour ne pas violer la contrainte sur les lignes existantes.
    Migration ciblée sur SavedItinerary uniquement (ne touche pas au drift des modèles stories)."""

    dependencies = [
        ('content', '0017_story_ai_provider_ollama'),
    ]

    operations = [
        migrations.AddField(
            model_name='saveditinerary',
            name='is_public',
            field=models.BooleanField(default=False),
        ),
        # 1) colonne nullable, non unique
        migrations.AddField(
            model_name='saveditinerary',
            name='share_token',
            field=models.UUIDField(null=True, editable=False, db_index=True),
        ),
        # 2) valeur unique par ligne existante
        migrations.RunPython(populate_share_tokens, migrations.RunPython.noop),
        # 3) contrainte d'unicité + défaut
        migrations.AlterField(
            model_name='saveditinerary',
            name='share_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True),
        ),
    ]
