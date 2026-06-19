from django.db import migrations, models


def seed_ollama(apps, schema_editor):
    StoryAIProviderConfig = apps.get_model('content', 'StoryAIProviderConfig')
    StoryAIProviderConfig.objects.get_or_create(
        provider='ollama',
        defaults={
            'display_name': 'Ollama (local)',
            'is_enabled': False,
            'model_name': 'qwen2.5:3b',
            'temperature': 0.75,
            'metadata': {'description': 'Serveur Ollama local pour la génération de stories hors-ligne'},
        },
    )


def remove_ollama(apps, schema_editor):
    StoryAIProviderConfig = apps.get_model('content', 'StoryAIProviderConfig')
    StoryAIProviderConfig.objects.filter(provider='ollama').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0016_storyreaction_commentreaction_storymention'),
    ]

    operations = [
        migrations.AlterField(
            model_name='storyaiproviderconfig',
            name='provider',
            field=models.CharField(
                choices=[
                    ('openai', 'OpenAI'),
                    ('gemini', 'Gemini'),
                    ('perplexity', 'Perplexity'),
                    ('ollama', 'Ollama (local)'),
                ],
                max_length=50,
                unique=True,
            ),
        ),
        migrations.RunPython(seed_ollama, remove_ollama),
    ]
