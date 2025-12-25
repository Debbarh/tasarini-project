"""
Migration to add reaction and mention models for user engagement.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('content', '0015_storymedia'),
    ]

    operations = [
        # Create StoryReaction model
        migrations.CreateModel(
            name='StoryReaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('reaction_type', models.CharField(
                    max_length=20,
                    choices=[
                        ('like', '👍 J\'aime'),
                        ('love', '❤️ J\'adore'),
                        ('laugh', '😂 Drôle'),
                        ('wow', '😮 Wow'),
                        ('sad', '😢 Triste'),
                        ('angry', '😠 En colère'),
                        ('thinking', '🤔 Réfléchir'),
                        ('celebrate', '🎉 Célébrer'),
                    ],
                    default='like'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('story', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reactions',
                    to='content.story'
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='story_reactions',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('story', 'user')},
            },
        ),

        # Create CommentReaction model
        migrations.CreateModel(
            name='CommentReaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('reaction_type', models.CharField(
                    max_length=20,
                    choices=[
                        ('like', '👍 J\'aime'),
                        ('love', '❤️ J\'adore'),
                        ('laugh', '😂 Drôle'),
                        ('thinking', '🤔 Réfléchir'),
                    ],
                    default='like'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('comment', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reactions',
                    to='content.storycomment'
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='comment_reactions',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('comment', 'user')},
            },
        ),

        # Create StoryMention model
        migrations.CreateModel(
            name='StoryMention',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('context_type', models.CharField(
                    max_length=20,
                    choices=[
                        ('story', 'Story'),
                        ('comment', 'Commentaire'),
                    ]
                )),
                ('notification_sent', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('mentioned_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='mentions_made',
                    to=settings.AUTH_USER_MODEL
                )),
                ('mentioned_user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='mentions_received',
                    to=settings.AUTH_USER_MODEL
                )),
                ('story', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='mentions',
                    to='content.story',
                    null=True,
                    blank=True
                )),
                ('comment', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='mentions',
                    to='content.storycomment',
                    null=True,
                    blank=True
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),

        # Add indexes for StoryReaction
        migrations.AddIndex(
            model_name='storyreaction',
            index=models.Index(fields=['story', '-created_at'], name='reaction_story_idx'),
        ),
        migrations.AddIndex(
            model_name='storyreaction',
            index=models.Index(fields=['user', '-created_at'], name='reaction_user_idx'),
        ),
        migrations.AddIndex(
            model_name='storyreaction',
            index=models.Index(fields=['reaction_type'], name='reaction_type_idx'),
        ),

        # Add indexes for CommentReaction
        migrations.AddIndex(
            model_name='commentreaction',
            index=models.Index(fields=['comment', '-created_at'], name='cmnt_reaction_idx'),
        ),

        # Add indexes for StoryMention
        migrations.AddIndex(
            model_name='storymention',
            index=models.Index(fields=['mentioned_user', '-created_at'], name='mention_user_idx'),
        ),
        migrations.AddIndex(
            model_name='storymention',
            index=models.Index(fields=['story'], name='mention_story_idx'),
        ),
        migrations.AddIndex(
            model_name='storymention',
            index=models.Index(fields=['notification_sent'], name='mention_notif_idx'),
        ),
    ]
