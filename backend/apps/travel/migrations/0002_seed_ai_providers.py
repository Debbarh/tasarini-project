from django.db import migrations


def seed_providers(apps, schema_editor):
    AIProviderConfig = apps.get_model('travel', 'AIProviderConfig')
    defaults = [
        {
            'provider': 'openai',
            'display_name': 'OpenAI',
            'is_enabled': False,
            'model_name': 'gpt-4o-mini',
            'temperature': 0.7,
        },
        {
            'provider': 'gemini',
            'display_name': 'Gemini',
            'is_enabled': False,
            'model_name': 'gemini-1.5-pro',
            'temperature': 0.7,
        },
    ]
    for item in defaults:
        AIProviderConfig.objects.update_or_create(
            provider=item['provider'],
            defaults=item,
        )


def unseed_providers(apps, schema_editor):
    AIProviderConfig = apps.get_model('travel', 'AIProviderConfig')
    AIProviderConfig.objects.filter(provider__in=['openai', 'gemini']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('travel', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_providers, unseed_providers),
    ]
