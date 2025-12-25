"""
Management command to initialize API providers
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.core.models import APIProvider


class Command(BaseCommand):
    help = 'Initialize API providers with default data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Initializing API providers...'))

        providers_data = [
            # Kayak - Multi-service provider
            {
                'provider_code': 'kayak',
                'provider_name': 'Kayak',
                'service_type': 'hotels',
                'priority': 2,
                'description': 'Kayak API for hotel search and booking',
                'api_endpoint': settings.KAYAK_API_BASE,
                'has_credentials': bool(settings.KAYAK_API_KEY),
                'is_active': True,
            },
            {
                'provider_code': 'kayak',
                'provider_name': 'Kayak',
                'service_type': 'flights',
                'priority': 2,
                'description': 'Kayak API for flight search and booking',
                'api_endpoint': settings.KAYAK_API_BASE,
                'has_credentials': bool(settings.KAYAK_API_KEY),
                'is_active': True,
            },
            {
                'provider_code': 'kayak',
                'provider_name': 'Kayak',
                'service_type': 'car_rental',
                'priority': 1,
                'description': 'Kayak API for car rental search',
                'api_endpoint': settings.KAYAK_API_BASE,
                'has_credentials': bool(settings.KAYAK_API_KEY),
                'is_active': True,
            },

            # Amadeus - Flights specialist
            {
                'provider_code': 'amadeus',
                'provider_name': 'Amadeus',
                'service_type': 'flights',
                'priority': 1,
                'description': 'Amadeus API for flight search and booking',
                'api_endpoint': settings.AMADEUS_API_BASE,
                'has_credentials': bool(settings.AMADEUS_API_KEY and settings.AMADEUS_API_SECRET),
                'is_active': True,
            },

            # HotelBeds - Hotels
            {
                'provider_code': 'hotelbeds',
                'provider_name': 'HotelBeds',
                'service_type': 'hotels',
                'priority': 1,
                'description': 'HotelBeds API for hotel search and booking',
                'api_endpoint': settings.HOTELBEDS_API_BASE,
                'has_credentials': bool(settings.HOTELBEDS_API_KEY and settings.HOTELBEDS_SECRET),
                'is_active': False,  # Désactivé par défaut car quota exceeded
            },

            # HotelBeds Activities
            {
                'provider_code': 'hotelbeds_activities',
                'provider_name': 'HotelBeds Activities',
                'service_type': 'activities',
                'priority': 1,
                'description': 'HotelBeds API for activities and tours',
                'api_endpoint': settings.HOTELBEDS_ACTIVITIES_API_BASE,
                'has_credentials': bool(settings.HOTELBEDS_ACTIVITIES_API_KEY and settings.HOTELBEDS_ACTIVITIES_SECRET),
                'is_active': True,
            },

            # HotelBeds Transfers
            {
                'provider_code': 'hotelbeds_transfers',
                'provider_name': 'HotelBeds Transfers',
                'service_type': 'transfers',
                'priority': 1,
                'description': 'HotelBeds API for airport transfers',
                'api_endpoint': settings.HOTELBEDS_TRANSFERS_API_BASE,
                'has_credentials': bool(settings.HOTELBEDS_TRANSFERS_API_KEY and settings.HOTELBEDS_TRANSFERS_SECRET),
                'is_active': True,
            },
        ]

        created_count = 0
        updated_count = 0

        for provider_data in providers_data:
            provider, created = APIProvider.objects.update_or_create(
                provider_code=provider_data['provider_code'],
                service_type=provider_data['service_type'],
                defaults=provider_data
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Created: {provider.provider_name} - {provider.get_service_type_display()}'
                    )
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'  ↻ Updated: {provider.provider_name} - {provider.get_service_type_display()}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Done! Created: {created_count}, Updated: {updated_count}'
            )
        )
