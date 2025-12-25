"""
Migration to add content moderation models.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('content', '0008_seed_story_ai_providers'),
    ]

    operations = [
        migrations.CreateModel(
            name='ContentReport',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('report_type', models.CharField(choices=[('spam', 'Spam'), ('harassment', 'Harcèlement'), ('hate_speech', 'Discours haineux'), ('inappropriate', 'Contenu inapproprié'), ('misinformation', 'Désinformation'), ('copyright', "Violation de droits d'auteur"), ('other', 'Autre')], max_length=32)),
                ('reason', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('reviewing', 'En cours de révision'), ('resolved', 'Résolu'), ('dismissed', 'Rejeté')], default='pending', max_length=32)),
                ('moderator_notes', models.TextField(blank=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('reporter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='content_reports', to=settings.AUTH_USER_MODEL)),
                ('reported_comment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='content.storycomment')),
                ('reported_story', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='content.story')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_reports', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ModerationAction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action_type', models.CharField(choices=[('warning', 'Avertissement'), ('content_hidden', 'Contenu masqué'), ('content_deleted', 'Contenu supprimé'), ('user_suspended', 'Utilisateur suspendu'), ('user_banned', 'Utilisateur banni'), ('spam_detected', 'Spam détecté'), ('approved', 'Approuvé')], max_length=32)),
                ('reason', models.TextField()),
                ('is_automated', models.BooleanField(default=False)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('moderator', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='moderation_actions', to=settings.AUTH_USER_MODEL)),
                ('related_report', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='actions', to='content.contentreport')),
                ('target_comment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='moderation_actions', to='content.storycomment')),
                ('target_story', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='moderation_actions', to='content.story')),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='received_moderation_actions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SpamPattern',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('pattern_type', models.CharField(choices=[('keyword', 'Mot-clé'), ('regex', 'Expression régulière'), ('url', "Pattern d'URL"), ('repeated', 'Texte répété')], max_length=32)),
                ('pattern', models.TextField()),
                ('description', models.CharField(max_length=255)),
                ('severity', models.PositiveSmallIntegerField(default=5)),
                ('is_active', models.BooleanField(default=True)),
                ('auto_action', models.CharField(choices=[('warning', 'Avertissement'), ('content_hidden', 'Contenu masqué'), ('content_deleted', 'Contenu supprimé'), ('user_suspended', 'Utilisateur suspendu'), ('user_banned', 'Utilisateur banni'), ('spam_detected', 'Spam détecté'), ('approved', 'Approuvé')], default='warning', max_length=32)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-severity', '-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='contentreport',
            index=models.Index(fields=['status', '-created_at'], name='report_status_idx'),
        ),
        migrations.AddIndex(
            model_name='contentreport',
            index=models.Index(fields=['reporter', '-created_at'], name='report_reporter_idx'),
        ),
        migrations.AddIndex(
            model_name='contentreport',
            index=models.Index(fields=['report_type'], name='report_type_idx'),
        ),
        migrations.AddIndex(
            model_name='moderationaction',
            index=models.Index(fields=['target_user', '-created_at'], name='mod_action_user_idx'),
        ),
        migrations.AddIndex(
            model_name='moderationaction',
            index=models.Index(fields=['action_type', '-created_at'], name='mod_action_type_idx'),
        ),
        migrations.AddIndex(
            model_name='moderationaction',
            index=models.Index(fields=['is_automated'], name='mod_action_auto_idx'),
        ),
    ]
