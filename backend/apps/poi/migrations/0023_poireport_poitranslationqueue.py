import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0022_touristpoint_latlon_index'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='POITranslationQueue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('lang', models.CharField(max_length=8)),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('done', 'Traduit'), ('failed', 'Échec')], default='pending', max_length=12)),
                ('attempts', models.PositiveSmallIntegerField(default=0)),
                ('last_error', models.CharField(blank=True, max_length=255)),
                ('tourist_point', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='translation_jobs', to='poi.touristpoint')),
            ],
            options={'abstract': False},
        ),
        migrations.CreateModel(
            name='POIReport',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('reason', models.CharField(choices=[('spam', 'Spam / publicité'), ('offensive', 'Contenu offensant'), ('wrong_location', 'Mauvaise localisation'), ('closed', 'Lieu fermé / inexistant'), ('duplicate', 'Doublon'), ('other', 'Autre')], default='other', max_length=20)),
                ('description', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('resolved_deleted', 'Supprimé'), ('resolved_kept', 'Conservé')], default='pending', max_length=20)),
                ('previous_status', models.CharField(blank=True, max_length=32)),
                ('review_message', models.TextField(blank=True)),
                ('reported_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='poi_reports', to=settings.AUTH_USER_MODEL)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_poi_reports', to=settings.AUTH_USER_MODEL)),
                ('tourist_point', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='poi.touristpoint')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddConstraint(
            model_name='poitranslationqueue',
            constraint=models.UniqueConstraint(fields=('tourist_point', 'lang'), name='uniq_poi_lang_translation'),
        ),
        migrations.AddIndex(
            model_name='poitranslationqueue',
            index=models.Index(fields=['status', 'created_at'], name='poitransq_status_idx'),
        ),
        migrations.AddConstraint(
            model_name='poireport',
            constraint=models.UniqueConstraint(condition=models.Q(('status', 'pending')), fields=('tourist_point', 'reported_by'), name='uniq_pending_report_per_user'),
        ),
    ]
