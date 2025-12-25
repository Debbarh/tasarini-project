"""
Migration to add story-related notification types.
"""
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0013_add_achievement_system'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(
                max_length=64,
                choices=[
                    ('activity_reminder', 'Rappel activité'),
                    ('trip_start', 'Début de voyage'),
                    ('trip_end', 'Fin de voyage'),
                    ('general', 'Général'),
                    ('new_partner', 'Nouveau partenaire'),
                    ('new_poi', 'Nouveau POI'),
                    # Story-related notifications
                    ('reaction', 'Réaction à une story'),
                    ('comment', 'Commentaire sur une story'),
                    ('comment_reaction', 'Réaction à un commentaire'),
                    ('mention', 'Mention'),
                    ('follow', 'Nouvel abonné'),
                    ('new_story', "Nouvelle story d'un abonné"),
                ],
                default='general'
            ),
        ),
    ]
