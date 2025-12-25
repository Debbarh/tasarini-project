# Generated manually for multilingual support
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0011_touristpointreview'),
    ]

    operations = [
        # Add multilingual fields to Country model
        migrations.AddField(
            model_name='country',
            name='name_en',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_es',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_de',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_it',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_pt',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_ru',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_ja',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_zh',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_hi',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_ar',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='country',
            name='name_fr',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        
        # Add multilingual fields to City model
        migrations.AddField(
            model_name='city',
            name='name_en',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_es',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_de',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_it',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_pt',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_ru',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_ja',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_zh',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_hi',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_ar',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='city',
            name='name_fr',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
    ]
