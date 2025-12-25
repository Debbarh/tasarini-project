# Generated manually for multilingual support - Be Inspired models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0012_add_multilingual_fields_to_country_city'),
    ]

    operations = [
        # Add multilingual fields to Tag model
        migrations.AddField(
            model_name='tag',
            name='label_es',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tag',
            name='label_de',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tag',
            name='label_it',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tag',
            name='label_pt',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tag',
            name='label_ru',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tag',
            name='label_ja',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tag',
            name='label_zh',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tag',
            name='label_hi',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tag',
            name='label_ar',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        
        # Add multilingual fields to DifficultyLevel model
        migrations.AddField(
            model_name='difficultylevel',
            name='label_es',
            field=models.CharField(max_length=120, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='difficultylevel',
            name='label_de',
            field=models.CharField(max_length=120, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='difficultylevel',
            name='label_it',
            field=models.CharField(max_length=120, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='difficultylevel',
            name='label_pt',
            field=models.CharField(max_length=120, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='difficultylevel',
            name='label_ru',
            field=models.CharField(max_length=120, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='difficultylevel',
            name='label_ja',
            field=models.CharField(max_length=120, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='difficultylevel',
            name='label_zh',
            field=models.CharField(max_length=120, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='difficultylevel',
            name='label_hi',
            field=models.CharField(max_length=120, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='difficultylevel',
            name='label_ar',
            field=models.CharField(max_length=120, blank=True, default=''),
        ),
    ]
