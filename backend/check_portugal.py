#!/usr/bin/env python3
"""Script pour vérifier si le Portugal existe"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tasarini_backend.settings')
django.setup()

from apps.poi.models import Country, City

# Vérifier Portugal
portugal = Country.objects.filter(name__iexact='Portugal')
print(f"Portugal existe: {portugal.exists()}")

if portugal.exists():
    p = portugal.first()
    print(f"  - Nom: {p.name}")
    print(f"  - Code: {p.code}")
    print(f"  - is_active: {p.is_active}")
    print(f"  - ID: {p.id}")

    # Villes du Portugal
    cities = City.objects.filter(country=p)
    print(f"  - Villes: {cities.count()}")
    for city in cities[:5]:
        print(f"    * {city.name} (is_active: {city.is_active})")
else:
    print("❌ Portugal n'existe PAS dans la base de données")

# Afficher tous les pays
all_countries = Country.objects.all()
print(f"\n📋 Tous les pays ({all_countries.count()}):")
for country in all_countries:
    print(f"  - {country.name} (is_active: {country.is_active})")
