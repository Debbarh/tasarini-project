from django.db import migrations, models


class Migration(migrations.Migration):
    """Soft delete d'un partenaire : champ `deleted_at` (réversible) sur PartnerProfile."""

    dependencies = [
        ('partners', '0004_partnerprofile_address_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='partnerprofile',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
