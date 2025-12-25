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
        ('poi', '0016_culinary_multilingual_fields'),
    ]

    operations = [
        # AccommodationType
        *build_label_fields('accommodationtype'),
        *build_description_fields('accommodationtype'),

        # AccommodationAmenity
        *build_label_fields('accommodationamenity'),
        *build_description_fields('accommodationamenity'),

        # AccommodationLocation
        *build_label_fields('accommodationlocation'),
        *build_description_fields('accommodationlocation'),

        # AccommodationAccessibilityFeature
        *build_label_fields('accommodationaccessibilityfeature'),
        *build_description_fields('accommodationaccessibilityfeature'),

        # AccommodationSecurityFeature
        *build_label_fields('accommodationsecurityfeature'),
        *build_description_fields('accommodationsecurityfeature'),

        # AccommodationAmbiance
        *build_label_fields('accommodationambiance'),
        *build_description_fields('accommodationambiance'),
    ]
