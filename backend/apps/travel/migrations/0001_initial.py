from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='AIProviderConfig',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('provider', models.CharField(choices=[('openai', 'OpenAI'), ('gemini', 'Gemini')], max_length=50, unique=True)),
                ('display_name', models.CharField(max_length=100)),
                ('is_enabled', models.BooleanField(default=False)),
                ('model_name', models.CharField(blank=True, max_length=150)),
                ('temperature', models.DecimalField(decimal_places=2, default=0.7, max_digits=4)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['display_name'],
            },
        ),
    ]
