import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('poi', '0020_taxonomy_icon_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='POIClaim',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('motivation', models.TextField()),
                ('proof_url', models.URLField(blank=True)),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('approved', 'Approuvée'), ('rejected', 'Rejetée')], default='pending', max_length=16)),
                ('review_message', models.TextField(blank=True)),
                ('claimed_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='poi_claims', to=settings.AUTH_USER_MODEL)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_poi_claims', to=settings.AUTH_USER_MODEL)),
                ('tourist_point', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='claims', to='poi.touristpoint')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='POISuggestion',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('proposed_changes', models.JSONField(default=dict)),
                ('comment', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('approved', 'Approuvée'), ('rejected', 'Rejetée')], default='pending', max_length=16)),
                ('review_message', models.TextField(blank=True)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_poi_suggestions', to=settings.AUTH_USER_MODEL)),
                ('suggested_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='poi_suggestions', to=settings.AUTH_USER_MODEL)),
                ('tourist_point', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='suggestions', to='poi.touristpoint')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddConstraint(
            model_name='poiclaim',
            constraint=models.UniqueConstraint(condition=models.Q(('status', 'pending')), fields=('tourist_point', 'claimed_by'), name='uniq_pending_claim_per_user_poi'),
        ),
    ]
