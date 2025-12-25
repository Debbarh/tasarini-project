"""
Migration to add story share tracking model.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('content', '0013_storycollection_storydraft_storyseries'),
    ]

    operations = [
        migrations.CreateModel(
            name='StoryShare',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('platform', models.CharField(
                    choices=[
                        ('facebook', 'Facebook'),
                        ('twitter', 'Twitter (X)'),
                        ('linkedin', 'LinkedIn'),
                        ('whatsapp', 'WhatsApp'),
                        ('telegram', 'Telegram'),
                        ('email', 'Email'),
                        ('copy_link', 'Copier le lien'),
                        ('embed', "Code d'intégration"),
                        ('other', 'Autre')
                    ],
                    max_length=32
                )),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('referrer', models.URLField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shares', to='content.story')),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='story_shares',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='storyshare',
            index=models.Index(fields=['story', '-created_at'], name='share_story_idx'),
        ),
        migrations.AddIndex(
            model_name='storyshare',
            index=models.Index(fields=['platform', '-created_at'], name='share_platform_idx'),
        ),
        migrations.AddIndex(
            model_name='storyshare',
            index=models.Index(fields=['user', '-created_at'], name='share_user_idx'),
        ),
    ]
