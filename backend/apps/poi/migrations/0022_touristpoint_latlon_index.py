from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0021_poiclaim_poisuggestion'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='touristpoint',
            index=models.Index(fields=['latitude', 'longitude'], name='poi_lat_lon_idx'),
        ),
    ]
