#!/usr/bin/env python3
"""Script pour activer tous les pays et villes inactifs"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tasarini_backend.settings')
django.setup()

from apps.poi.models import Country, City

# Activer tous les pays inactifs
inactive_countries = Country.objects.filter(is_active=False)
print(f"📊 Pays inactifs trouvés: {inactive_countries.count()}")
for country in inactive_countries:
    print(f"  - {country.name}")

if inactive_countries.exists():
    count = inactive_countries.update(is_active=True)
    print(f"✅ {count} pays activés")
else:
    print("✅ Tous les pays sont déjà actifs")

# Activer toutes les villes inactives
inactive_cities = City.objects.filter(is_active=False)
print(f"\n📊 Villes inactives trouvées: {inactive_cities.count()}")
if inactive_cities.count() <= 20:
    for city in inactive_cities:
        print(f"  - {city.name} ({city.country.name})")
else:
    for city in inactive_cities[:20]:
        print(f"  - {city.name} ({city.country.name})")
    print(f"  ... et {inactive_cities.count() - 20} autres")

if inactive_cities.exists():
    count = inactive_cities.update(is_active=True)
    print(f"✅ {count} villes activées")
else:
    print("✅ Toutes les villes sont déjà actives")

print("\n🎉 Terminé!")
