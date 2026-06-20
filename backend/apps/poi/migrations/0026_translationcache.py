"""Mémoire de traduction (TranslationCache) — dédup des chaînes pour accélérer le cron."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0025_translationrunlog'),
    ]

    operations = [
        migrations.CreateModel(
            name='TranslationCache',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text_hash', models.CharField(max_length=40)),
                ('target_lang', models.CharField(max_length=8)),
                ('source_text', models.CharField(max_length=255)),
                ('translated_text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.AddConstraint(
            model_name='translationcache',
            constraint=models.UniqueConstraint(fields=['text_hash', 'target_lang'], name='uniq_transcache_hash_lang'),
        ),
        migrations.AddIndex(
            model_name='translationcache',
            index=models.Index(fields=['text_hash', 'target_lang'], name='transcache_hash_lang_idx'),
        ),
    ]
