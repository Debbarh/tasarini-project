from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0015_budget_multilingual_fields'),
    ]

    operations = [
        # DietaryRestriction labels
        migrations.AddField(
            model_name='dietaryrestriction',
            name='label_es',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='label_de',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='label_it',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='label_pt',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='label_ru',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='label_ja',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='label_zh',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='label_hi',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='label_ar',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        # DietaryRestriction descriptions
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_es',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_de',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_it',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_pt',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_ru',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_ja',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_zh',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_hi',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='dietaryrestriction',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
        # CuisineType labels/descriptions
        migrations.AddField(
            model_name='cuisinetype',
            name='label_es',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='label_de',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='label_it',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='label_pt',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='label_ru',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='label_ja',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='label_zh',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='label_hi',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='label_ar',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='description_es',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='description_de',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='description_it',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='description_pt',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='description_ru',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='description_ja',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='description_zh',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='description_hi',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='cuisinetype',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
        # CulinaryAdventureLevel labels/descriptions
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='label_es',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='label_de',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='label_it',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='label_pt',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='label_ru',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='label_ja',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='label_zh',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='label_hi',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='label_ar',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='description_es',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='description_de',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='description_it',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='description_pt',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='description_ru',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='description_ja',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='description_zh',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='description_hi',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='culinaryadventurelevel',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
        # RestaurantCategory labels/descriptions
        migrations.AddField(
            model_name='restaurantcategory',
            name='label_es',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='label_de',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='label_it',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='label_pt',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='label_ru',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='label_ja',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='label_zh',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='label_hi',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='label_ar',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='description_es',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='description_de',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='description_it',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='description_pt',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='description_ru',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='description_ja',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='description_zh',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='description_hi',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='restaurantcategory',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
    ]
