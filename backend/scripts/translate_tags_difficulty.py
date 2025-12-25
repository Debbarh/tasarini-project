"""
Script de traduction automatique pour Tag et DifficultyLevel (Be Inspired)
Utilise OpenAI pour traduire les labels dans les 11 langues supportées
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tasarini_backend.settings')
django.setup()

from poi.models import Tag, DifficultyLevel
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


def translate_text(text: str, target_language: str, context: str = "tag") -> str:
    """
    Traduit un texte vers la langue cible en utilisant OpenAI
    
    Args:
        text: Texte à traduire
        target_language: Code de la langue cible (ex: 'es', 'de')
        context: Type d'entité ('tag' ou 'difficulty')
    
    Returns:
        Texte traduit
    """
    language_full = LANGUAGES.get(target_language, target_language)
    
    if context == "tag":
        prompt = f"""Translate this tag/label for a travel/tourism context to {language_full}. 
Return ONLY the translated text, nothing else.
Do not add explanations, quotes, or punctuation.

Tag: {text}
Translation:"""
    else:  # difficulty level
        prompt = f"""Translate this difficulty level label to {language_full}. 
Return ONLY the translated label, nothing else.
Do not add explanations, quotes, or punctuation.

Difficulty level: {text}
Translation:"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional translator specializing in travel and tourism terminology. Provide accurate, concise translations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=100
        )
        
        translation = response.choices[0].message.content.strip()
        # Nettoyer la réponse
        translation = translation.strip('"\'.,;:!? ')
        return translation
    
    except Exception as e:
        print(f"  ⚠️  Erreur de traduction: {e}")
        return text  # Retourner le texte original en cas d'erreur


def translate_tags(dry_run=False, limit=None):
    """
    Traduit tous les tags dans les 11 langues
    
    Args:
        dry_run: Si True, affiche les traductions sans sauvegarder
        limit: Nombre maximum de tags à traduire (None = tous)
    """
    print("\n" + "="*80)
    print("🏷️  TRADUCTION DES TAGS")
    print("="*80 + "\n")
    
    tags = Tag.objects.all()
    if limit:
        tags = tags[:limit]
    
    total = tags.count()
    print(f"📊 {total} tags à traduire\n")
    
    for idx, tag in enumerate(tags, 1):
        print(f"[{idx}/{total}] 🏷️  {tag.code}")
        
        # Utiliser label_fr comme source
        source_label = tag.label_fr
        
        if not source_label:
            print(f"  ⚠️  Pas de label_fr, skip")
            continue
        
        print(f"  ✅ FR: {source_label}")
        
        # Traduire dans chaque langue
        for lang_code, lang_name in LANGUAGES.items():
            if lang_code == 'fr':  # Skip français
                continue
            
            field_name = f'label_{lang_code}'
            current_value = getattr(tag, field_name)
            
            # Skip si déjà traduit
            if current_value:
                print(f"  ✓ {lang_code.upper()}: {current_value} (déjà présent)")
                continue
            
            # Traduire
            translation = translate_text(source_label, lang_code, 'tag')
            print(f"  🔄 {lang_code.upper()}: {translation}")
            
            # Sauvegarder
            if not dry_run:
                setattr(tag, field_name, translation)
                tag.save(update_fields=[field_name])
            
            # Délai pour éviter le rate limiting
            time.sleep(0.5)
        
        print()


def translate_difficulty_levels(dry_run=False, limit=None):
    """
    Traduit tous les niveaux de difficulté dans les 11 langues
    
    Args:
        dry_run: Si True, affiche les traductions sans sauvegarder
        limit: Nombre maximum de niveaux à traduire (None = tous)
    """
    print("\n" + "="*80)
    print("📊 TRADUCTION DES NIVEAUX DE DIFFICULTÉ")
    print("="*80 + "\n")
    
    levels = DifficultyLevel.objects.all()
    if limit:
        levels = levels[:limit]
    
    total = levels.count()
    print(f"📊 {total} niveaux de difficulté à traduire\n")
    
    for idx, level in enumerate(levels, 1):
        print(f"[{idx}/{total}] 📊 {level.code}")
        
        # Utiliser label_fr comme source
        source_label = level.label_fr
        
        if not source_label:
            print(f"  ⚠️  Pas de label_fr, skip")
            continue
        
        print(f"  ✅ FR: {source_label}")
        
        # Traduire dans chaque langue
        for lang_code, lang_name in LANGUAGES.items():
            if lang_code == 'fr':  # Skip français
                continue
            
            field_name = f'label_{lang_code}'
            current_value = getattr(level, field_name)
            
            # Skip si déjà traduit
            if current_value:
                print(f"  ✓ {lang_code.upper()}: {current_value} (déjà présent)")
                continue
            
            # Traduire
            translation = translate_text(source_label, lang_code, 'difficulty')
            print(f"  🔄 {lang_code.upper()}: {translation}")
            
            # Sauvegarder
            if not dry_run:
                setattr(level, field_name, translation)
                level.save(update_fields=[field_name])
            
            # Délai pour éviter le rate limiting
            time.sleep(0.5)
        
        print()


def main():
    """Point d'entrée principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Traduire les tags et niveaux de difficulté en 11 langues')
    parser.add_argument('--dry-run', action='store_true', help='Mode test (pas de sauvegarde)')
    parser.add_argument('--limit', type=int, help='Nombre max d\'entités à traduire')
    parser.add_argument('--tags', action='store_true', help='Traduire uniquement les tags')
    parser.add_argument('--difficulty', action='store_true', help='Traduire uniquement les niveaux de difficulté')
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("\n⚠️  MODE DRY-RUN: Aucune donnée ne sera sauvegardée\n")
    
    try:
        if args.tags or (not args.tags and not args.difficulty):
            translate_tags(dry_run=args.dry_run, limit=args.limit)
        
        if args.difficulty or (not args.tags and not args.difficulty):
            translate_difficulty_levels(dry_run=args.dry_run, limit=args.limit)
        
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
