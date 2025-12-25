#!/usr/bin/env python3
"""
Script to create all widgets from templates in the database
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tasarini_backend.settings')
django.setup()

from apps.core.models import Widget

# Widget templates matching the frontend registry
WIDGET_TEMPLATES = [
    {
        'code': 'car_rental',
        'name': 'Location de voiture',
        'type': 'partner',
        'service_type': 'car_rental',
        'placement': 'home_transport_car',
        'description': 'Widget de recherche et réservation de voitures de location',
        'priority': 1,
    },
    {
        'code': 'transfer_basic',
        'name': 'Transferts aéroport (Base)',
        'type': 'partner',
        'service_type': 'transfers',
        'placement': 'home_transport_transfers',
        'description': 'Widget de réservation de transferts aéroport - Version basique',
        'priority': 1,
    },
    {
        'code': 'transfer_alt',
        'name': 'Transferts aéroport (Alt)',
        'type': 'partner',
        'service_type': 'transfers',
        'placement': 'home_transport_transfers',
        'description': 'Widget de réservation de transferts aéroport - Version alternative',
        'priority': 2,
    },
    {
        'code': 'transfer_3',
        'name': 'Transferts aéroport (V3)',
        'type': 'partner',
        'service_type': 'transfers',
        'placement': 'home_transport_transfers',
        'description': 'Widget de réservation de transferts aéroport - Version 3',
        'priority': 3,
    },
    {
        'code': 'tours_basic',
        'name': 'Tours & Visites (Base)',
        'type': 'partner',
        'service_type': 'activities',
        'placement': 'home_activities_tours',
        'description': 'Widget de recherche et réservation d\'activités touristiques',
        'priority': 1,
    },
    {
        'code': 'tours_alt',
        'name': 'Tours & Visites (Alt)',
        'type': 'partner',
        'service_type': 'activities',
        'placement': 'home_activities_tours',
        'description': 'Widget de recherche et réservation d\'activités touristiques - Version alternative',
        'priority': 2,
    },
    {
        'code': 'public_transport',
        'name': 'Transport public (12Go)',
        'type': 'partner',
        'service_type': 'transfers',
        'placement': 'home_transport_public',
        'description': 'Widget de réservation de bus, trains et ferries',
        'priority': 1,
    },
    {
        'code': 'airalo_esim',
        'name': 'Cartes eSIM Airalo',
        'type': 'partner',
        'service_type': 'all',
        'placement': 'home_services_esim',
        'description': 'Widget de vente de cartes eSIM pour connectivité internationale',
        'priority': 1,
    },
    {
        'code': 'eatwith',
        'name': 'Expériences culinaires EatWith',
        'type': 'partner',
        'service_type': 'restaurants',
        'placement': 'home_activities_dining',
        'description': 'Widget de réservation d\'expériences gastronomiques',
        'priority': 1,
    },
    {
        'code': 'airhelp',
        'name': 'Indemnisation vols AirHelp',
        'type': 'partner',
        'service_type': 'flights',
        'placement': 'home_services_compensation',
        'description': 'Widget pour réclamer une indemnisation en cas d\'annulation ou retard de vol',
        'priority': 1,
    },
    {
        'code': 'indrive_city',
        'name': 'Transport urbain inDrive',
        'type': 'partner',
        'service_type': 'transfers',
        'placement': 'home_transport_urban',
        'description': 'Widget de réservation de transport urbain avec inDrive',
        'priority': 1,
    },
    {
        'code': 'expedia_search',
        'name': 'Recherche Expedia',
        'type': 'search',
        'service_type': 'all',
        'placement': 'home_services_booking',
        'description': 'Widget de recherche de vols et hébergements Expedia',
        'priority': 1,
    },
]


def create_widgets():
    """Create all widgets from templates"""
    created = 0
    updated = 0
    skipped = 0

    for template in WIDGET_TEMPLATES:
        widget_code = template['code']

        # Check if widget already exists
        widget, created_new = Widget.objects.get_or_create(
            widget_code=widget_code,
            defaults={
                'widget_name': template['name'],
                'widget_type': template['type'],
                'placement': template['placement'],
                'service_type': template['service_type'],
                'description': template['description'],
                'priority': template['priority'],
                'is_active': True,  # Activate by default
                'configuration': {},
                'content': {},
            }
        )

        if created_new:
            created += 1
            print(f"✅ Créé: {template['name']} ({widget_code})")
        else:
            # Update existing widget with new placement if needed
            if widget.placement != template['placement']:
                widget.placement = template['placement']
                widget.widget_name = template['name']
                widget.description = template['description']
                widget.priority = template['priority']
                widget.save()
                updated += 1
                print(f"🔄 Mis à jour: {template['name']} ({widget_code})")
            else:
                skipped += 1
                print(f"⏭️  Existe déjà: {template['name']} ({widget_code})")

    print("\n" + "="*60)
    print(f"📊 Résumé:")
    print(f"   ✅ Créés: {created}")
    print(f"   🔄 Mis à jour: {updated}")
    print(f"   ⏭️  Déjà existants: {skipped}")
    print(f"   📦 Total: {created + updated + skipped}")
    print("="*60)

    # Show active widgets count
    active_count = Widget.objects.filter(is_active=True).count()
    total_count = Widget.objects.count()
    print(f"\n🎯 Widgets actifs: {active_count}/{total_count}")


if __name__ == '__main__':
    print("🚀 Création des widgets depuis les templates...\n")
    create_widgets()
    print("\n✨ Terminé!")
