from django.core.management.base import BaseCommand
from apps.core.models import SystemSetting


class Command(BaseCommand):
    help = 'Ajoute le paramètre booking_center_enabled à la base de données'

    def handle(self, *args, **options):
        setting, created = SystemSetting.objects.get_or_create(
            setting_key='booking_center_enabled',
            defaults={
                'setting_value': 'true',
                'setting_type': 'boolean',
                'description': 'Active ou désactive l\'affichage de la centrale de réservation sur le frontend',
                'category': 'features',
                'is_active': True,
            }
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Paramètre "{setting.setting_key}" créé avec succès !'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠ Le paramètre "{setting.setting_key}" existe déjà (valeur: {setting.setting_value})'
                )
            )

        # Afficher les détails du paramètre
        self.stdout.write(f'\nDétails du paramètre:')
        self.stdout.write(f'  - Clé: {setting.setting_key}')
        self.stdout.write(f'  - Valeur: {setting.setting_value}')
        self.stdout.write(f'  - Type: {setting.setting_type}')
        self.stdout.write(f'  - Catégorie: {setting.category}')
        self.stdout.write(f'  - Description: {setting.description}')
        self.stdout.write(f'  - Actif: {setting.is_active}')
