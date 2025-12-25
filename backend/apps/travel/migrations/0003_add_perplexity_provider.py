from django.db import migrations


def add_perplexity_provider(apps, schema_editor):
    AIProviderConfig = apps.get_model('travel', 'AIProviderConfig')
    AIProviderConfig.objects.update_or_create(
        provider='perplexity',
        defaults={
            'provider': 'perplexity',
            'display_name': 'Perplexity',
            'is_enabled': False,
            'model_name': 'sonar',
            'temperature': 0.7,
        },
    )


def remove_perplexity_provider(apps, schema_editor):
    AIProviderConfig = apps.get_model('travel', 'AIProviderConfig')
    AIProviderConfig.objects.filter(provider='perplexity').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('travel', '0002_seed_ai_providers'),
    ]

    operations = [
        migrations.RunPython(add_perplexity_provider, remove_perplexity_provider),
    ]
