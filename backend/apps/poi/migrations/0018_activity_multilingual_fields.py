from django.db import migrations, models


LANG_CODES = ['es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'hi', 'ar']


def build_label_fields(model_name: str):
    return [
        migrations.AddField(
            model_name=model_name,
            name=f'label_{code}',
            field=models.CharField(blank=True, default='', max_length=255),
        )
        for code in LANG_CODES
    ]


def build_description_fields(model_name: str):
    return [
        migrations.AddField(
            model_name=model_name,
            name=f'description_{code}',
            field=models.TextField(blank=True, default=''),
        )
        for code in LANG_CODES
    ]


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0017_accommodation_multilingual_fields'),
    ]

    operations = [
        # ActivityCategory
        migrations.AlterField(
            model_name='activitycategory',
            name='label_en',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='activitycategory',
            name='description_fr',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='activitycategory',
            name='description_en',
            field=models.TextField(blank=True, default=''),
        ),
        *build_label_fields('activitycategory'),
        *build_description_fields('activitycategory'),

        # ActivityIntensityLevel
        migrations.AlterField(
            model_name='activityintensitylevel',
            name='label_en',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='activityintensitylevel',
            name='description_fr',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='activityintensitylevel',
            name='description_en',
            field=models.TextField(blank=True, default=''),
        ),
        *build_label_fields('activityintensitylevel'),
        *build_description_fields('activityintensitylevel'),

        # ActivityInterest
        migrations.AlterField(
            model_name='activityinterest',
            name='label_en',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='activityinterest',
            name='description_fr',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='activityinterest',
            name='description_en',
            field=models.TextField(blank=True, default=''),
        ),
        *build_label_fields('activityinterest'),
        *build_description_fields('activityinterest'),

        # ActivityAvoidance
        migrations.AlterField(
            model_name='activityavoidance',
            name='label_en',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='activityavoidance',
            name='description_fr',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='activityavoidance',
            name='description_en',
            field=models.TextField(blank=True, default=''),
        ),
        *build_label_fields('activityavoidance'),
        *build_description_fields('activityavoidance'),
    ]
