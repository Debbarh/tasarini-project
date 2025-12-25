from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0013_add_multilingual_fields_to_tag_difficulty'),
    ]

    operations = [
        # TravelGroupType label fields
        migrations.AddField(
            model_name='travelgrouptype',
            name='label_es',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='label_de',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='label_it',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='label_pt',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='label_ru',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='label_ja',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='label_zh',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='label_hi',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='label_ar',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        # TravelGroupType description fields
        migrations.AddField(
            model_name='travelgrouptype',
            name='description_es',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='description_de',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='description_it',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='description_pt',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='description_ru',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='description_ja',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='description_zh',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='description_hi',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgrouptype',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
        # TravelGroupSubtype label fields
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='label_es',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='label_de',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='label_it',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='label_pt',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='label_ru',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='label_ja',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='label_zh',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='label_hi',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='label_ar',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        # TravelGroupSubtype description fields
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='description_es',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='description_de',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='description_it',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='description_pt',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='description_ru',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='description_ja',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='description_zh',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='description_hi',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='travelgroupsubtype',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
    ]
