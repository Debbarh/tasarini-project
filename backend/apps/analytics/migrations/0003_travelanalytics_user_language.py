from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0002_touristpointanalytics'),
    ]

    operations = [
        migrations.AddField(
            model_name='travelanalytics',
            name='user_language',
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.AddField(
            model_name='travelanalytics',
            name='user_neighborhood',
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
    ]
