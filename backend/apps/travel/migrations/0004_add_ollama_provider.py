from django.db import migrations, models


def add_ollama_provider(apps, schema_editor):
    AIProviderConfig = apps.get_model('travel', 'AIProviderConfig')
    AIProviderConfig.objects.update_or_create(
        provider='ollama',
        defaults={
            'provider': 'ollama',
            'display_name': 'Ollama (local)',
            'is_enabled': False,
            'model_name': 'qwen2.5:3b',
            'temperature': 0.7,
        },
    )


def remove_ollama_provider(apps, schema_editor):
    AIProviderConfig = apps.get_model('travel', 'AIProviderConfig')
    AIProviderConfig.objects.filter(provider='ollama').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('travel', '0003_add_perplexity_provider'),
    ]

    operations = [
        migrations.AlterField(
            model_name='aiproviderconfig',
            name='provider',
            field=models.CharField(
                choices=[
                    ('openai', 'OpenAI'),
                    ('gemini', 'Gemini'),
                    ('perplexity', 'Perplexity'),
                    ('ollama', 'Ollama'),
                ],
                max_length=50,
                unique=True,
            ),
        ),
        migrations.RunPython(add_ollama_provider, remove_ollama_provider),
    ]
