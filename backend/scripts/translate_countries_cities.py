"""
Script de traduction automatique des champs Country et City
Utilise OpenAI pour traduire les noms dans les 11 langues supportées
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tasarini_backend.settings')
django.setup()

from poi.models import Country, City
from openai import OpenAI
import time

# Configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    print("❌ OPENAI_API_KEY non trouvée dans les variables d'environnement")
    sys.exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

LANGUAGES = {
    'fr': 'French',
    'en': 'English',
    'es': 'Spanish',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'zh': 'Chinese (Simplified)',
    'hi': 'Hindi',
    'ar': 'Arabic'
}


def translate_text(text: str, target_language: str, entity_type: str = "country") -> str:
    """
    Traduit un texte vers la langue cible en utilisant OpenAI
    
    Args:
        text: Texte à traduire
        target_language: Code de la langue cible (ex: 'es', 'de')
        entity_type: Type d'entité ('country' ou 'city')
    
    Returns:
        Texte traduit
    """
    language_full = LANGUAGES.get(target_language, target_language)
    
    if entity_type == "country":
        prompt = f"""Translate this country name to {language_full}. 
Return ONLY the translated country name, nothing else.
Do not add explanations, quotes, or punctuation.

Country name: {text}
Translation:"""
    else:
        prompt = f"""Translate this city name to {language_full}. 
Return ONLY the translated city name, nothing else.
Do not add explanations, quotes, or punctuation.
Keep the original name if it's a proper noun that shouldn't be translated.

City name: {text}
Translation:"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional translator specializing in geographical names. Provide accurate, concise translations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=50
        )
        
        translation = response.choices[0].message.content.strip()
        # Nettoyer la réponse (enlever guillemets, points, etc.)
        translation = translation.strip('"\'.,;:!? ')
        return translation
    
    except Exception as e:
        print(f"  ⚠️  Erreur de traduction: {e}")
        return text  # Retourner le texte original en cas d'erreur


def translate_countries(dry_run=False, limit=None):
    """
    Traduit tous les pays dans les 11 langues
    
    Args:
        dry_run: Si True, affiche les traductions sans sauvegarder
        limit: Nombre maximum de pays à traduire (None = tous)
    """
    print("\n" + "="*80)
    print("🌍 TRADUCTION DES PAYS")
    print("="*80 + "\n")
    
    countries = Country.objects.filter(is_active=True)
    if limit:
        countries = countries[:limit]
    
    total = countries.count()
    print(f"📊 {total} pays à traduire\n")
    
    for idx, country in enumerate(countries, 1):
        print(f"[{idx}/{total}] 🏳️  {country.name} ({country.code})")
        
        # Utiliser le champ 'name' comme source si name_fr est vide
        source_name = country.name_fr or country.name
        
        if not source_name:
            print(f"  ⚠️  Pas de nom source, skip")
            continue
        
        # Remplir name_fr avec name si vide
        if not country.name_fr:
            country.name_fr = country.name
            if not dry_run:
                country.save(update_fields=['name_fr'])
            print(f"  ✅ FR: {country.name}")
        
        # Traduire dans chaque langue
        for lang_code, lang_name in LANGUAGES.items():
            if lang_code == 'fr':  # Skip français (déjà fait)
                continue
            
            field_name = f'name_{lang_code}'
            current_value = getattr(country, field_name)
            
            # Skip si déjà traduit
            if current_value:
                print(f"  ✓ {lang_code.upper()}: {current_value} (déjà présent)")
                continue
            
            # Traduire
            translation = translate_text(source_name, lang_code, 'country')
            print(f"  🔄 {lang_code.upper()}: {translation}")
            
            # Sauvegarder
            if not dry_run:
                setattr(country, field_name, translation)
                country.save(update_fields=[field_name])
            
            # Délai pour éviter le rate limiting
            time.sleep(0.5)
        
        print()  # Ligne vide entre les pays


def translate_cities(dry_run=False, limit=None):
    """
    Traduit toutes les villes dans les 11 langues
    
    Args:
        dry_run: Si True, affiche les traductions sans sauvegarder
        limit: Nombre maximum de villes à traduire (None = toutes)
    """
    print("\n" + "="*80)
    print("🏙️  TRADUCTION DES VILLES")
    print("="*80 + "\n")
    
    cities = City.objects.filter(is_active=True).select_related('country')
    if limit:
        cities = cities[:limit]
    
    total = cities.count()
    print(f"📊 {total} villes à traduire\n")
    
    for idx, city in enumerate(cities, 1):
        print(f"[{idx}/{total}] 🏙️  {city.name} ({city.country.code})")
        
        # Utiliser le champ 'name' comme source si name_fr est vide
        source_name = city.name_fr or city.name
        
        if not source_name:
            print(f"  ⚠️  Pas de nom source, skip")
            continue
        
        # Remplir name_fr avec name si vide
        if not city.name_fr:
            city.name_fr = city.name
            if not dry_run:
                city.save(update_fields=['name_fr'])
            print(f"  ✅ FR: {city.name}")
        
        # Traduire dans chaque langue
        for lang_code, lang_name in LANGUAGES.items():
            if lang_code == 'fr':  # Skip français (déjà fait)
                continue
            
            field_name = f'name_{lang_code}'
            current_value = getattr(city, field_name)
            
            # Skip si déjà traduit
            if current_value:
                print(f"  ✓ {lang_code.upper()}: {current_value} (déjà présent)")
                continue
            
            # Traduire
            translation = translate_text(source_name, lang_code, 'city')
            print(f"  🔄 {lang_code.upper()}: {translation}")
            
            # Sauvegarder
            if not dry_run:
                setattr(city, field_name, translation)
                city.save(update_fields=[field_name])
            
            # Délai pour éviter le rate limiting
            time.sleep(0.5)
        
        print()  # Ligne vide entre les villes


def main():
    """Point d'entrée principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Traduire les pays et villes en 11 langues')
    parser.add_argument('--dry-run', action='store_true', help='Mode test (pas de sauvegarde)')
    parser.add_argument('--limit', type=int, help='Nombre max d\'entités à traduire')
    parser.add_argument('--countries', action='store_true', help='Traduire uniquement les pays')
    parser.add_argument('--cities', action='store_true', help='Traduire uniquement les villes')
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("\n⚠️  MODE DRY-RUN: Aucune donnée ne sera sauvegardée\n")
    
    try:
        if args.countries or (not args.countries and not args.cities):
            translate_countries(dry_run=args.dry_run, limit=args.limit)
        
        if args.cities or (not args.countries and not args.cities):
            translate_cities(dry_run=args.dry_run, limit=args.limit)
        
        print("\n" + "="*80)
        print("✅ TRADUCTION TERMINÉE")
        print("="*80 + "\n")
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Traduction interrompue par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
