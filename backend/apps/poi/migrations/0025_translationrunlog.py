"""Historique des exécutions du cron de traduction (TranslationRunLog)."""
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0024_dietary_description_langs'),
    ]

    operations = [
        migrations.CreateModel(
            name='TranslationRunLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('source', models.CharField(choices=[('manual', 'Manuel'), ('daily', 'Quotidien')], max_length=12)),
                ('mode', models.CharField(blank=True, max_length=16)),
                ('status', models.CharField(choices=[('running', 'En cours'), ('done', 'Terminé'), ('stopped', 'Arrêté')], default='running', max_length=12)),
                ('started_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('tax_changed', models.PositiveIntegerField(default=0)),
                ('poi_completed', models.PositiveIntegerField(default=0)),
                ('poi_processed', models.PositiveIntegerField(default=0)),
                ('note', models.CharField(blank=True, max_length=255)),
            ],
            options={
                'ordering': ['-started_at'],
            },
        ),
        migrations.AddIndex(
            model_name='translationrunlog',
            index=models.Index(fields=['source', 'status'], name='transrun_src_status_idx'),
        ),
    ]
