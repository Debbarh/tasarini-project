"""Complète DietaryRestriction.description aux 11 langues (ajoute it, pt, ru, ja, zh, hi, ar)."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0023_poireport_poitranslationqueue'),
    ]

    operations = [
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_it',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_pt',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_ru',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_ja',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_zh',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_hi',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
    ]
