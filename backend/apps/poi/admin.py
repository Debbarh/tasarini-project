import requests
from django.contrib import admin
from django.contrib import messages
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils.html import format_html
from django.conf import settings

from .models import Country, City


# Configuration LibreTranslate
import logging

LIBRETRANSLATE_URL = getattr(settings, 'LIBRETRANSLATE_URL', 'http://libretranslate:5000')
logger = logging.getLogger(__name__)

# Langues supportées
SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'hi', 'ar']

# Mapping des codes de langue pour LibreTranslate
LANGUAGE_MAP = {
    'fr': 'fr',
    'en': 'en',
    'es': 'es',
    'de': 'de',
    'it': 'it',
    'pt': 'pt',
    'ru': 'ru',
    'ja': 'ja',
    'zh': 'zh-Hans',  # LibreTranslate utilise zh-Hans pour le chinois simplifié
    'hi': 'hi',
    'ar': 'ar'
}

# Dictionnaire manuel pour les noms de lieux connus
# Format: {nom_normalise: {langue: traduction}}
LOCATION_NAMES_DICT = {
    # Villes marocaines
    'fes': {'fr': 'Fès', 'en': 'Fez', 'es': 'Fez', 'de': 'Fes', 'it': 'Fez', 'pt': 'Fez', 'ar': 'فاس', 'zh': '非斯', 'ja': 'フェズ', 'ru': 'Фес', 'hi': 'फेज़'},
    'fez': {'fr': 'Fès', 'en': 'Fez', 'es': 'Fez', 'de': 'Fes', 'it': 'Fez', 'pt': 'Fez', 'ar': 'فاس', 'zh': '非斯', 'ja': 'フェズ', 'ru': 'Фес', 'hi': 'फेज़'},
    'marrakech': {'fr': 'Marrakech', 'en': 'Marrakech', 'es': 'Marrakech', 'de': 'Marrakesch', 'it': 'Marrakech', 'pt': 'Marraquexe', 'ar': 'مراكش', 'zh': '马拉喀什', 'ja': 'マラケシュ', 'ru': 'Марракеш', 'hi': 'माराकेश'},
    'marrakesh': {'fr': 'Marrakech', 'en': 'Marrakesh', 'es': 'Marrakech', 'de': 'Marrakesch', 'it': 'Marrakech', 'pt': 'Marraquexe', 'ar': 'مراكش', 'zh': '马拉喀什', 'ja': 'マラケシュ', 'ru': 'Марракеш', 'hi': 'माराकेश'},
    'casablanca': {'fr': 'Casablanca', 'en': 'Casablanca', 'es': 'Casablanca', 'de': 'Casablanca', 'it': 'Casablanca', 'pt': 'Casablanca', 'ar': 'الدار البيضاء', 'zh': '卡萨布兰卡', 'ja': 'カサブランカ', 'ru': 'Касабланка', 'hi': 'कासाब्लांका'},
    'rabat': {'fr': 'Rabat', 'en': 'Rabat', 'es': 'Rabat', 'de': 'Rabat', 'it': 'Rabat', 'pt': 'Rabate', 'ar': 'الرباط', 'zh': '拉巴特', 'ja': 'ラバト', 'ru': 'Рабат', 'hi': 'रबात'},
    'tanger': {'fr': 'Tanger', 'en': 'Tangier', 'es': 'Tánger', 'de': 'Tanger', 'it': 'Tangeri', 'pt': 'Tânger', 'ar': 'طنجة', 'zh': '丹吉尔', 'ja': 'タンジール', 'ru': 'Танжер', 'hi': 'तांजियर'},
    'tangier': {'fr': 'Tanger', 'en': 'Tangier', 'es': 'Tánger', 'de': 'Tanger', 'it': 'Tangeri', 'pt': 'Tânger', 'ar': 'طنجة', 'zh': '丹吉尔', 'ja': 'タンジール', 'ru': 'Танжер', 'hi': 'तांजियर'},
    'agadir': {'fr': 'Agadir', 'en': 'Agadir', 'es': 'Agadir', 'de': 'Agadir', 'it': 'Agadir', 'pt': 'Agadir', 'ar': 'أكادير', 'zh': '阿加迪尔', 'ja': 'アガディール', 'ru': 'Агадир', 'hi': 'अगादिर'},
    'meknes': {'fr': 'Meknès', 'en': 'Meknes', 'es': 'Mequinez', 'de': 'Meknes', 'it': 'Meknès', 'pt': 'Mequinez', 'ar': 'مكناس', 'zh': '梅克内斯', 'ja': 'メクネス', 'ru': 'Мекнес', 'hi': 'मेकनेस'},
    'tetouan': {'fr': 'Tétouan', 'en': 'Tetouan', 'es': 'Tetuán', 'de': 'Tetouan', 'it': 'Tetouan', 'pt': 'Tetuão', 'ar': 'تطوان', 'zh': '得土安', 'ja': 'テトゥアン', 'ru': 'Тетуан', 'hi': 'तेतुआन'},
    'oujda': {'fr': 'Oujda', 'en': 'Oujda', 'es': 'Uxda', 'de': 'Oujda', 'it': 'Oujda', 'pt': 'Oujda', 'ar': 'وجدة', 'zh': '乌季达', 'ja': 'ウジダ', 'ru': 'Уджда', 'hi': 'उज्दा'},
    'essaouira': {'fr': 'Essaouira', 'en': 'Essaouira', 'es': 'Esauira', 'de': 'Essaouira', 'it': 'Essaouira', 'pt': 'Essaouira', 'ar': 'الصويرة', 'zh': '索维拉', 'ja': 'エッサウィラ', 'ru': 'Эс-Сувейра', 'hi': 'एस्साउइरा'},

    # Villes espagnoles (noms historiques arabes - Al-Andalus)
    'seville': {'ar': 'إشبيلية', 'fr': 'Séville', 'es': 'Sevilla', 'zh': '塞维利亚', 'ja': 'セビリア', 'ru': 'Севилья'},
    'sevilla': {'ar': 'إشبيلية', 'fr': 'Séville', 'en': 'Seville', 'zh': '塞维利亚', 'ja': 'セビリア', 'ru': 'Севилья'},
    'cordoba': {'ar': 'قرطبة', 'fr': 'Cordoue', 'en': 'Cordoba', 'zh': '科尔多瓦', 'ja': 'コルドバ', 'ru': 'Кордова'},
    'cordoue': {'ar': 'قرطبة', 'es': 'Córdoba', 'en': 'Cordoba', 'zh': '科尔多瓦', 'ja': 'コルドバ', 'ru': 'Кордова'},
    'granada': {'ar': 'غرناطة', 'fr': 'Grenade', 'en': 'Granada', 'zh': '格拉纳达', 'ja': 'グラナダ', 'ru': 'Гранада'},
    'grenade': {'ar': 'غرناطة', 'es': 'Granada', 'en': 'Granada', 'zh': '格拉纳达', 'ja': 'グラナダ', 'ru': 'Гранада'},
    'toledo': {'ar': 'طليطلة', 'fr': 'Tolède', 'en': 'Toledo', 'zh': '托莱多', 'ja': 'トレド', 'ru': 'Толедо'},
    'tolede': {'ar': 'طليطلة', 'es': 'Toledo', 'en': 'Toledo', 'zh': '托莱多', 'ja': 'トレド', 'ru': 'Толедо'},

    # Pays
    'morocco': {'ar': 'المغرب', 'fr': 'Maroc', 'es': 'Marruecos', 'de': 'Marokko', 'it': 'Marocco', 'pt': 'Marrocos', 'zh': '摩洛哥', 'ja': 'モロッコ', 'ru': 'Марокко', 'hi': 'मोरक्को'},
    'maroc': {'ar': 'المغرب', 'en': 'Morocco', 'es': 'Marruecos', 'de': 'Marokko', 'it': 'Marocco', 'pt': 'Marrocos', 'zh': '摩洛哥', 'ja': 'モロッコ', 'ru': 'Марокко', 'hi': 'मोरक्को'},
}


# --- Moteur de traduction unifié : translategemma:4b via Ollama (remplace DeepL) ---
import re as _re

_LANG_NAME = {
    'fr': 'French', 'en': 'English', 'es': 'Spanish', 'de': 'German', 'it': 'Italian',
    'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
}
_TARGET_SCRIPT = {
    'fr': 'latin', 'en': 'latin', 'es': 'latin', 'de': 'latin', 'it': 'latin', 'pt': 'latin',
    'ru': 'cyrillic', 'ja': 'cjk', 'zh': 'cjk', 'ar': 'arabic', 'hi': 'devanagari',
}


def _char_script(ch):
    o = ord(ch)
    if (0x41 <= o <= 0x24F) or (0x1E00 <= o <= 0x1EFF):
        return 'latin'
    if (0x600 <= o <= 0x6FF) or (0x750 <= o <= 0x77F):
        return 'arabic'
    if 0x400 <= o <= 0x4FF:
        return 'cyrillic'
    if (0x4E00 <= o <= 0x9FFF) or (0x3040 <= o <= 0x30FF):
        return 'cjk'
    if 0x900 <= o <= 0x97F:
        return 'devanagari'
    return 'other'


def _foreign_fraction(text, target_lang):
    """Fraction de lettres dont le script DIFFÈRE de celui de la langue cible.
    0 = texte entièrement dans le script cible (nom propre déjà lisible → on garde)."""
    target = _TARGET_SCRIPT.get(target_lang)
    if not target:
        return 1.0
    total = foreign = 0
    for ch in text:
        if not ch.isalpha():
            continue
        total += 1
        if _char_script(ch) != target:
            foreign += 1
    return (foreign / total) if total else 0.0


def _clean_translation(out):
    if not out:
        return None
    out = out.replace('**', '').strip()
    if len(out) >= 2 and out[0] in '"«“' and out[-1] in '"»”':
        out = out[1:-1].strip()
    out = _re.sub(r'^(translation|traduction|traducción|übersetzung)\s*[:\-]\s*', '', out, flags=_re.I).strip()
    return out or None


def translate_via_ollama(text, target_lang):
    """Traduit `text` vers `target_lang` via translategemma:4b (Ollama). None si échec."""
    lang_name = _LANG_NAME.get(target_lang, target_lang)
    base = getattr(settings, 'OLLAMA_API_BASE', 'http://ollama:11434')
    model = getattr(settings, 'TRANSLATION_OLLAMA_MODEL', 'translategemma:4b')
    prompt = (
        f"Translate the following text to {lang_name}. Reply with ONLY the translated "
        f"text - no explanation, no alternatives, no quotes, no notes.\n\n{text}"
    )
    try:
        resp = requests.post(
            f"{base}/api/generate",
            json={'model': model, 'prompt': prompt, 'stream': False, 'options': {'temperature': 0}},
            timeout=getattr(settings, 'TRANSLATION_TIMEOUT', 90),
        )
        resp.raise_for_status()
        out = (resp.json().get('response') or '').strip()
    except Exception as exc:  # noqa: BLE001 - résilient
        logger.warning("Ollama translate failed (%s): %s", target_lang, exc)
        return None
    return _clean_translation(out)


def translate_text(text, source_lang='en', target_lang='fr', is_location=False):
    """Traduit un texte via translategemma:4b (Ollama). Même signature qu'avant.

    is_location=True (noms de lieux / adresses) : raccourci dictionnaire, ET on NE traduit
    PAS si le texte est déjà dans le script de la langue cible (évite de corrompre un nom
    propre déjà lisible, ex. « Mosquée El Takwa » en français). Les descriptions
    (is_location=False) sont toujours traduites. Renvoie l'original si la traduction échoue.
    """
    if not text or not str(text).strip():
        return text
    text = str(text)
    if is_location:
        entry = LOCATION_NAMES_DICT.get(text.lower().strip())
        if entry and target_lang in entry:
            return entry[target_lang]
        if _foreign_fraction(text, target_lang) < 0.25:
            return text  # nom propre quasi entièrement dans le script cible → on garde tel quel
    translated = translate_via_ollama(text, target_lang)
    return translated or text


def fill_missing_translations(obj, base_name_field='name'):
    """
    Remplit les champs de traduction manquants d'un objet (Country ou City)

    Args:
        obj: Instance de Country ou City
        base_name_field: Nom du champ contenant le nom de base (défaut: 'name')

    Returns:
        tuple: (nombre de traductions ajoutées, liste des langues traduites)
    """
    # Récupérer le nom de base
    base_name = getattr(obj, base_name_field, None)
    if not base_name:
        return 0, []

    # Déterminer la langue source (en priorité : name_en, name_fr, ou name)
    source_text = getattr(obj, 'name_en', None) or getattr(obj, 'name_fr', None) or base_name
    source_lang = 'en' if getattr(obj, 'name_en', None) else 'fr'

    translations_added = 0
    languages_translated = []
    logger.info("Begin fill_missing_translations for %s (%s)", obj, obj.pk)
    logger.info("Detected source text '%s' in language '%s'", source_text, source_lang)

    for lang in SUPPORTED_LANGUAGES:
        field_name = f'name_{lang}'

        # Vérifier si le champ existe et est vide
        if hasattr(obj, field_name):
            current_value = getattr(obj, field_name, '')

            # Ne traduire que si le champ est vide
            if not current_value or current_value.strip() == '':
                # Ne pas traduire si c'est la langue source
                if lang != source_lang:
                    # Activer le mode location pour une meilleure translittération des noms propres
                    translated = translate_text(source_text, source_lang, lang, is_location=True)

                    if translated:
                        setattr(obj, field_name, translated)
                        translations_added += 1
                        languages_translated.append(lang)
                        logger.info("Translated '%s' to %s -> '%s'", source_text, lang, translated)
                    else:
                        # Si la traduction échoue (ex: Hindi), utiliser la version anglaise comme fallback
                        if hasattr(obj, 'name_en'):
                            english_text = getattr(obj, 'name_en', '')
                            if english_text:
                                setattr(obj, field_name, english_text)
                                translations_added += 1
                                languages_translated.append(lang)
                                logger.info("Translation failed for %s, using English fallback: '%s'", lang, english_text)
                else:
                    # Pour la langue source, copier le texte source
                    setattr(obj, field_name, source_text)
                    translations_added += 1
                    languages_translated.append(lang)

    # Sauvegarder l'objet
    if translations_added > 0:
        obj.save()
        logger.info("Saved %s after adding %s translations (%s)", obj, translations_added, languages_translated)
    else:
        logger.info("No translations added for %s", obj)

    return translations_added, languages_translated


def fill_missing_field_translations(obj, field_prefix='label', base_field=None, is_location=False):
    """
    Remplit les champs de traduction manquants d'un objet (générique)

    Args:
        obj: Instance de modèle (TravelGroupType, TravelGroupSubtype, etc.)
        field_prefix: Préfixe des champs de traduction ('label', 'name', 'description', etc.)
        base_field: Nom du champ de base (ex: 'label', 'name'). Si None, utilise field_prefix
        is_location: Si True, active le mode translittération pour les noms de lieux

    Returns:
        tuple: (nombre de traductions ajoutées, liste des langues traduites)
    """
    # Si base_field n'est pas spécifié, utiliser field_prefix
    if base_field is None:
        base_field = field_prefix

    # Récupérer le texte de base
    base_text = getattr(obj, base_field, None)
    if not base_text:
        return 0, []

    # Déterminer la langue source (en priorité : *_en, *_fr, ou base)
    source_text = (
        getattr(obj, f'{field_prefix}_en', None) or
        getattr(obj, f'{field_prefix}_fr', None) or
        base_text
    )
    source_lang = 'en' if getattr(obj, f'{field_prefix}_en', None) else 'fr'

    translations_added = 0
    languages_translated = []
    logger.info("Begin fill_missing_field_translations for %s (%s) with field_prefix='%s'",
                obj, obj.pk, field_prefix)
    logger.info("Detected source text '%s' in language '%s'", source_text, source_lang)

    for lang in SUPPORTED_LANGUAGES:
        field_name = f'{field_prefix}_{lang}'

        # Vérifier si le champ existe et est vide
        if hasattr(obj, field_name):
            current_value = getattr(obj, field_name, '')

            # Ne traduire que si le champ est vide
            if not current_value or current_value.strip() == '':
                # Ne pas traduire si c'est la langue source
                if lang != source_lang:
                    # Traduire le texte
                    translated = translate_text(source_text, source_lang, lang, is_location=is_location)

                    if translated:
                        setattr(obj, field_name, translated)
                        translations_added += 1
                        languages_translated.append(lang)
                        logger.info("Translated '%s' to %s -> '%s'", source_text, lang, translated)
                    else:
                        # Si la traduction échoue (ex: Hindi), utiliser la version anglaise comme fallback
                        english_field = f'{field_prefix}_en'
                        if hasattr(obj, english_field):
                            english_text = getattr(obj, english_field, '')
                            if english_text:
                                setattr(obj, field_name, english_text)
                                translations_added += 1
                                languages_translated.append(lang)
                                logger.info("Translation failed for %s, using English fallback: '%s'", lang, english_text)
                else:
                    # Pour la langue source, copier le texte source
                    setattr(obj, field_name, source_text)
                    translations_added += 1
                    languages_translated.append(lang)

    # Sauvegarder l'objet
    if translations_added > 0:
        obj.save()
        logger.info("Saved %s after adding %s translations (%s)", obj, translations_added, languages_translated)
    else:
        logger.info("No translations added for %s", obj)

    return translations_added, languages_translated


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'translation_status', 'is_active', 'translate_button')
    list_filter = ('is_active',)
    search_fields = ('name', 'code', 'name_fr', 'name_en')
    readonly_fields = ('id', 'created_at', 'updated_at', 'translate_button_form')

    fieldsets = (
        ('Informations de base', {
            'fields': ('id', 'name', 'code', 'is_active')
        }),
        ('Traductions', {
            'fields': (
                'translate_button_form',
                'name_fr', 'name_en', 'name_es', 'name_de',
                'name_it', 'name_pt', 'name_ru', 'name_ja',
                'name_zh', 'name_hi', 'name_ar'
            ),
            'description': 'Cliquez sur le bouton "🌐 Traduire les champs manquants" ci-dessous pour remplir automatiquement les traductions vides.'
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['translate_missing_fields_action']

    def translation_status(self, obj):
        """Affiche le statut de traduction (nombre de langues remplies)"""
        filled = 0
        for lang in SUPPORTED_LANGUAGES:
            if getattr(obj, f'name_{lang}', ''):
                filled += 1

        color = 'green' if filled == len(SUPPORTED_LANGUAGES) else 'orange' if filled >= 5 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}/{}</span>',
            color, filled, len(SUPPORTED_LANGUAGES)
        )
    translation_status.short_description = 'Traductions'

    def translate_button(self, obj):
        """Bouton pour traduire un pays spécifique (dans la liste)"""
        return format_html(
            '<a class="button" href="{}">🌐 Traduire</a>',
            reverse('admin:translate_country', args=[obj.pk])
        )
    translate_button.short_description = 'Actions'
    translate_button.allow_tags = True

    def translate_button_form(self, obj):
        """Bouton de traduction dans le formulaire de modification"""
        if obj and obj.pk:
            return format_html(
                '<div style="margin: 10px 0;">'
                '<a class="button" href="{}" style="'
                'background-color: #417690; '
                'color: white; '
                'padding: 10px 15px; '
                'text-decoration: none; '
                'border-radius: 4px; '
                'display: inline-block; '
                'font-weight: bold;">'
                '🌐 Traduire les champs manquants'
                '</a>'
                '<p style="margin-top: 10px; color: #666; font-size: 12px;">'
                'Les champs déjà remplis ne seront pas modifiés. '
                'Seuls les champs vides seront traduits automatiquement via LibreTranslate.'
                '</p>'
                '</div>',
                reverse('admin:translate_country', args=[obj.pk])
            )
        return format_html(
            '<p style="color: #666;">Enregistrez d\'abord le pays pour pouvoir le traduire.</p>'
        )
    translate_button_form.short_description = 'Traduction automatique'

    def translate_missing_fields_action(self, request, queryset):
        """Action pour traduire plusieurs pays à la fois"""
        total_translations = 0
        countries_updated = 0

        for country in queryset:
            count, _ = fill_missing_translations(country)
            if count > 0:
                total_translations += count
                countries_updated += 1

        self.message_user(
            request,
            f"{countries_updated} pays mis à jour avec {total_translations} nouvelles traductions.",
            messages.SUCCESS
        )
    translate_missing_fields_action.short_description = "🌐 Traduire les champs manquants"

    def get_urls(self):
        """Ajouter une URL personnalisée pour traduire un pays"""
        urls = super().get_urls()
        custom_urls = [
            path(
                '<uuid:country_id>/translate/',
                self.admin_site.admin_view(self.translate_country_view),
                name='translate_country',
            ),
        ]
        return custom_urls + urls

    def translate_country_view(self, request, country_id):
        """Vue pour traduire un pays spécifique"""
        country = Country.objects.get(pk=country_id)

        count, languages = fill_missing_translations(country)

        if count > 0:
            self.message_user(
                request,
                f"✅ {count} traductions ajoutées pour '{country.name}' ({', '.join(languages)})",
                messages.SUCCESS
            )
        else:
            self.message_user(
                request,
                f"ℹ️ Toutes les traductions sont déjà remplies pour '{country.name}'.",
                messages.INFO
            )

        # Rediriger vers la page de modification
        return redirect('admin:poi_country_change', country_id)


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'country', 'translation_status', 'is_active', 'translate_button')
    list_filter = ('is_active', 'country')
    search_fields = ('name', 'country__name', 'name_fr', 'name_en')
    readonly_fields = ('id', 'created_at', 'updated_at', 'translate_button_form')
    autocomplete_fields = ['country']

    fieldsets = (
        ('Informations de base', {
            'fields': ('id', 'name', 'country', 'latitude', 'longitude', 'is_active')
        }),
        ('Traductions', {
            'fields': (
                'translate_button_form',
                'name_fr', 'name_en', 'name_es', 'name_de',
                'name_it', 'name_pt', 'name_ru', 'name_ja',
                'name_zh', 'name_hi', 'name_ar'
            ),
            'description': 'Cliquez sur le bouton "🌐 Traduire les champs manquants" ci-dessous pour remplir automatiquement les traductions vides.'
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['translate_missing_fields_action']

    def translation_status(self, obj):
        """Affiche le statut de traduction (nombre de langues remplies)"""
        filled = 0
        for lang in SUPPORTED_LANGUAGES:
            if getattr(obj, f'name_{lang}', ''):
                filled += 1

        color = 'green' if filled == len(SUPPORTED_LANGUAGES) else 'orange' if filled >= 5 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}/{}</span>',
            color, filled, len(SUPPORTED_LANGUAGES)
        )
    translation_status.short_description = 'Traductions'

    def translate_button(self, obj):
        """Bouton pour traduire une ville spécifique (dans la liste)"""
        return format_html(
            '<a class="button" href="{}">🌐 Traduire</a>',
            reverse('admin:translate_city', args=[obj.pk])
        )
    translate_button.short_description = 'Actions'
    translate_button.allow_tags = True

    def translate_button_form(self, obj):
        """Bouton de traduction dans le formulaire de modification"""
        if obj and obj.pk:
            return format_html(
                '<div style="margin: 10px 0;">'
                '<a class="button" href="{}" style="'
                'background-color: #417690; '
                'color: white; '
                'padding: 10px 15px; '
                'text-decoration: none; '
                'border-radius: 4px; '
                'display: inline-block; '
                'font-weight: bold;">'
                '🌐 Traduire les champs manquants'
                '</a>'
                '<p style="margin-top: 10px; color: #666; font-size: 12px;">'
                'Les champs déjà remplis ne seront pas modifiés. '
                'Seuls les champs vides seront traduits automatiquement via LibreTranslate.'
                '</p>'
                '</div>',
                reverse('admin:translate_city', args=[obj.pk])
            )
        return format_html(
            '<p style="color: #666;">Enregistrez d\'abord la ville pour pouvoir la traduire.</p>'
        )
    translate_button_form.short_description = 'Traduction automatique'

    def translate_missing_fields_action(self, request, queryset):
        """Action pour traduire plusieurs villes à la fois"""
        total_translations = 0
        cities_updated = 0

        for city in queryset:
            count, _ = fill_missing_translations(city)
            if count > 0:
                total_translations += count
                cities_updated += 1

        self.message_user(
            request,
            f"{cities_updated} villes mises à jour avec {total_translations} nouvelles traductions.",
            messages.SUCCESS
        )
    translate_missing_fields_action.short_description = "🌐 Traduire les champs manquants"

    def get_urls(self):
        """Ajouter une URL personnalisée pour traduire une ville"""
        urls = super().get_urls()
        custom_urls = [
            path(
                '<uuid:city_id>/translate/',
                self.admin_site.admin_view(self.translate_city_view),
                name='translate_city',
            ),
        ]
        return custom_urls + urls

    def translate_city_view(self, request, city_id):
        """Vue pour traduire une ville spécifique"""
        city = City.objects.get(pk=city_id)

        count, languages = fill_missing_translations(city)

        if count > 0:
            self.message_user(
                request,
                f"✅ {count} traductions ajoutées pour '{city.name}' ({', '.join(languages)})",
                messages.SUCCESS
            )
        else:
            self.message_user(
                request,
                f"ℹ️ Toutes les traductions sont déjà remplies pour '{city.name}'.",
                messages.INFO
            )

        # Rediriger vers la page de modification
        return redirect('admin:poi_city_change', city_id)
