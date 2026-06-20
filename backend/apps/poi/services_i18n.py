"""Moteur d'internationalisation unifié : « détecter → corriger → compléter ».

Réutilise `translate_text` (translategemma:4b) de admin.py. Deux cibles :
  - Taxonomies (colonnes `label_xx`/`name_xx`/`description_xx`) : détection de langue par
    valeur, réaffectation des valeurs mal placées (mode `auto`), complétion des langues vides.
  - POI (`TouristPoint`) : la langue d'origine du texte de base sert de source ; les 11 langues
    sont écrites dans `metadata['translations'][lang] = {name, description, address}`.

Deux modes :
  - `missing` (manuel) : ne remplit que les langues vides, aucune réaffectation. Idempotent.
  - `auto`    (cron nuit) : réaffecte le mal placé (colonne cible vide) puis complète.
"""
from __future__ import annotations

import logging

from django.utils import timezone

import hashlib
import re

from django.conf import settings as dj_settings

from .admin import (
    SUPPORTED_LANGUAGES, translate_text, translate_via_ollama,
    translate_batch_via_ollama, _foreign_fraction, LOCATION_NAMES_DICT,
)
from .lang_detect import detect_language

logger = logging.getLogger(__name__)

_CACHE_MAXLEN = 200  # ne cacher que les chaînes courtes (noms/adresses)


def _sha1(text: str) -> str:
    return hashlib.sha1(text.encode('utf-8')).hexdigest()


def translate_many(items, target_lang):
    """Traduit une liste d'items `(texte, is_location)` vers `target_lang`, en RENVOYANT
    la liste des traductions (même ordre). Pipeline d'accélération :
      1) garde-fou script + dictionnaire de lieux → aucun appel ;
      2) cache (TranslationCache) → réutilise l'existant ;
      3) traduction par LOTS (translate_batch_via_ollama, fallback per-item) ;
      4) écriture du cache (chaînes courtes).
    """
    from .models import TranslationCache
    n = len(items)
    results = [None] * n
    need = []
    for i, (text, is_loc) in enumerate(items):
        t = (text or '').strip()
        if not t:
            results[i] = text
            continue
        if is_loc:
            entry = LOCATION_NAMES_DICT.get(t.lower())
            if entry and target_lang in entry:
                results[i] = entry[target_lang]
                continue
            if _foreign_fraction(t, target_lang) < 0.25:
                results[i] = t  # déjà dans le script cible
                continue
        need.append(i)
    if not need:
        return results
    # 2) cache groupé
    hash_by_i = {i: _sha1((items[i][0] or '').strip()) for i in need}
    rows = TranslationCache.objects.filter(
        target_lang=target_lang, text_hash__in=list(set(hash_by_i.values()))
    ).values_list('text_hash', 'translated_text')
    cache_map = dict(rows)
    still = []
    for i in need:
        c = cache_map.get(hash_by_i[i])
        if c is not None:
            results[i] = c
        else:
            still.append(i)
    if not still:
        return results
    # 3) dédup intra-lot
    by_text = {}
    order = []
    for i in still:
        t = (items[i][0] or '').strip()
        if t not in by_text:
            by_text[t] = []
            order.append(t)
        by_text[t].append(i)
    # 4) traduction (batch ou per-item)
    translated = {}
    batch_on = getattr(dj_settings, 'TRANSLATION_BATCH_ENABLED', True)
    if batch_on and len(order) > 1:
        bs = max(1, getattr(dj_settings, 'TRANSLATION_BATCH_TEXTS', 25))
        for k in range(0, len(order), bs):
            chunk = order[k:k + bs]
            out = translate_batch_via_ollama(chunk, target_lang)
            if out is None:  # repli per-item → aucune corruption
                out = [(translate_via_ollama(t, target_lang) or t) for t in chunk]
            for t, tr in zip(chunk, out):
                translated[t] = tr or t
    else:
        for t in order:
            translated[t] = translate_via_ollama(t, target_lang) or t
    # 5) recomposition + écriture cache
    new_rows = []
    for t in order:
        tr = translated[t]
        for i in by_text[t]:
            results[i] = tr
        if t and tr and len(t) <= _CACHE_MAXLEN:
            new_rows.append(TranslationCache(
                text_hash=_sha1(t), target_lang=target_lang, source_text=t[:255], translated_text=tr))
    if new_rows:
        try:
            TranslationCache.objects.bulk_create(new_rows, ignore_conflicts=True)
        except Exception as exc:  # noqa: BLE001
            logger.warning("cache bulk_create: %s", exc)
    return results

# Registre des modèles de taxonomie localisés + leurs groupes de champs.
# (name = nom propre → is_location ; label/description = libellé/prose.)
def _taxonomy_registry():
    from . import models as m
    return [
        (m.Tag, ['label']),
        (m.BudgetLevel, ['label', 'description']),
        (m.BudgetCurrency, ['name']),
        (m.BudgetFlexibilityOption, ['label', 'description']),
        (m.Country, ['name']),
        (m.City, ['name']),
        (m.ActivityCategory, ['label', 'description']),
        (m.ActivityIntensityLevel, ['label', 'description']),
        (m.ActivityInterest, ['label', 'description']),
        (m.ActivityAvoidance, ['label', 'description']),
        (m.AccommodationType, ['label', 'description']),
        (m.AccommodationAmenity, ['label', 'description']),
        (m.AccommodationLocation, ['label', 'description']),
        (m.AccommodationAccessibilityFeature, ['label', 'description']),
        (m.AccommodationSecurityFeature, ['label', 'description']),
        (m.AccommodationAmbiance, ['label', 'description']),
        (m.DietaryRestriction, ['label', 'description']),
        (m.CuisineType, ['label', 'description']),
        (m.CulinaryAdventureLevel, ['label', 'description']),
        (m.RestaurantCategory, ['label', 'description']),
        (m.TravelGroupType, ['label', 'description']),
        (m.TravelGroupSubtype, ['label', 'description']),
        (m.DifficultyLevel, ['label']),
    ]


_POI_FIELDS = ('name', 'description', 'address')
_POI_LOCATION = {'name', 'address'}


def _expired(deadline) -> bool:
    return deadline is not None and timezone.now() >= deadline


# ---------------------------------------------------------------------------
# Taxonomies
# ---------------------------------------------------------------------------
def _group_values(obj, group):
    """{lang: valeur} pour les colonnes existantes du groupe."""
    out = {}
    for lang in SUPPORTED_LANGUAGES:
        field = f'{group}_{lang}'
        if hasattr(obj, field):
            out[lang] = (getattr(obj, field, '') or '').strip()
    return out


def _pick_source(obj, group, present):
    # 1) une valeur dont la langue détectée == sa colonne → source la plus fiable
    for lang, val in present.items():
        if val and detect_language(val) == lang:
            return lang, val
    # 2) anglais puis français
    for lang in ('en', 'fr'):
        if present.get(lang):
            return lang, present[lang]
    # 3) n'importe quelle valeur non vide
    for lang, val in present.items():
        if val:
            return lang, val
    # 4) champ de base sans suffixe (ex. Country.name)
    base = getattr(obj, group, None)
    if base and str(base).strip():
        return 'fr', str(base).strip()
    return None, None


def taxonomy_object_complete(obj, field_groups) -> bool:
    for group in field_groups:
        vals = _group_values(obj, group)
        if vals and not all(vals.values()):
            return False
    return True


def translate_taxonomy_object(obj, field_groups, *, mode='missing') -> dict:
    changed = False
    moved = []
    for group in field_groups:
        present = _group_values(obj, group)
        if not present:
            continue
        is_loc = (group == 'name')

        if mode == 'auto':  # réaffecter les valeurs mal placées vers une colonne cible VIDE
            for lang, val in list(present.items()):
                if not val:
                    continue
                det = detect_language(val)
                if det and det != lang and det in present and not present.get(det):
                    setattr(obj, f'{group}_{det}', val)
                    setattr(obj, f'{group}_{lang}', '')
                    present[det], present[lang] = val, ''
                    changed = True
                    moved.append(f'{group}:{lang}->{det}')

        source_lang, source_text = _pick_source(obj, group, present)
        if not source_text:
            continue

        for lang in SUPPORTED_LANGUAGES:
            field = f'{group}_{lang}'
            if not hasattr(obj, field):
                continue
            if present.get(lang):
                continue  # déjà rempli (aucun mode ne réécrit l'existant)
            if lang == source_lang:
                setattr(obj, field, source_text)
                present[lang] = source_text
                changed = True
                continue
            translated = translate_text(source_text, source_lang, lang, is_location=is_loc)
            if translated:
                setattr(obj, field, translated)
                present[lang] = translated
                changed = True
    if changed:
        obj.save()
    return {'changed': changed, 'moved': moved}


def process_taxonomies(*, mode='auto', deadline=None) -> dict:
    """Parcourt toutes les taxonomies incomplètes. Renvoie un récap."""
    res = {'objects': 0, 'changed': 0, 'moved': 0, 'stopped': False}
    for Model, groups in _taxonomy_registry():
        for obj in Model.objects.all().iterator(chunk_size=200):
            if _expired(deadline):
                res['stopped'] = True
                return res
            if taxonomy_object_complete(obj, groups):
                continue
            r = translate_taxonomy_object(obj, groups, mode=mode)
            res['objects'] += 1
            res['changed'] += 1 if r['changed'] else 0
            res['moved'] += len(r['moved'])
    return res


# ---------------------------------------------------------------------------
# POI
# ---------------------------------------------------------------------------
def poi_complete(poi) -> bool:
    tr = (poi.metadata or {}).get('translations') or {}
    return all(lang in tr for lang in SUPPORTED_LANGUAGES)


_NAME_SENTINEL = '{{0}}'  # placeholder i18n : préservé tel quel par le modèle


def _translate_description(desc, name, L0, lang):
    """Traduit la description en PROTÉGEANT le nom du lieu : on ne le traduit pas, on le
    laisse tel quel entre guillemets « … ». Si le nom n'apparaît pas, traduction normale."""
    desc = (desc or '').strip()
    if not desc:
        return ''
    name = (name or '').strip()
    if name and name.lower() in desc.lower():
        pat = re.compile(re.escape(name), re.IGNORECASE)
        protected = pat.sub(_NAME_SENTINEL, desc)  # remplace le nom par un repère neutre
        out = translate_via_ollama(protected, lang) or protected
        if _NAME_SENTINEL in out:  # le repère a survécu → on restaure le nom entre guillemets
            return out.replace(_NAME_SENTINEL, f'« {name} »')
        # repli rare (repère perdu) : traduction simple
    return translate_text(desc, source_lang=L0, target_lang=lang, is_location=False) or desc


def poi_lang_payload(base, names_auth, L0, lang):
    """Construit {name, description, address} d'un POI pour `lang` selon la POLITIQUE QUALITÉ :
      - name    : nom AUTHENTIQUE (open data, `metadata['names'][lang]`) si présent, SINON nom d'origine
                  (jamais de translittération LLM inventée).
      - address : conservée telle quelle (nom propre).
      - description : prose traduite par le LLM, MAIS le nom du lieu reste non traduit, entre « … ».
    """
    return {
        'name': (names_auth.get(lang) or base['name']),
        'description': _translate_description(base['description'], base['name'], L0, lang),
        'address': base['address'],
    }


def translate_poi_object(poi, *, mode='missing') -> dict:
    base = {f: (getattr(poi, f, '') or '').strip() for f in _POI_FIELDS}
    if not any(base.values()):
        return {'changed': False, 'L0': None, 'langs': []}
    L0 = detect_language(base['description'] or base['name']) or 'en'
    meta = poi.metadata or {}
    names_auth = meta.get('names') or {}  # noms authentiques (open data) si enrichis
    translations = dict(meta.get('translations') or {})
    changed = False
    langs = []
    if translations.get(L0) != base:
        translations[L0] = dict(base)  # le contenu de base = sa propre langue
        changed = True
    for lang in SUPPORTED_LANGUAGES:
        if lang == L0 or translations.get(lang):
            continue
        translations[lang] = poi_lang_payload(base, names_auth, L0, lang)
        langs.append(lang)
        changed = True
    if changed:
        meta['translations'] = translations
        poi.metadata = meta
        poi.save(update_fields=['metadata', 'updated_at'])
    return {'changed': changed, 'L0': L0, 'langs': langs}


def backfill_pois(start_cursor='', *, mode='auto', batch=50, deadline=None) -> dict:
    """Traduit jusqu'à `batch` POI à partir du curseur (id UUID). Reprenable.
    Politique qualité : noms/adresses = authentique (open data) ou original (aucune
    translittération LLM) ; descriptions = LLM. → quasi sans appel Ollama (descriptions ~0).
    Renvoie {cursor, processed, completed, wrapped}."""
    from .models import TouristPoint
    qs = TouristPoint.objects.order_by('id')
    if start_cursor:
        try:
            qs = qs.filter(id__gt=start_cursor)
        except (ValueError, TypeError):
            qs = TouristPoint.objects.order_by('id')  # curseur corrompu → recommencer
    pois = list(qs.only('id', 'name', 'description', 'address', 'metadata')[:batch])
    if not pois:
        return {'cursor': '', 'processed': 0, 'completed': 0, 'wrapped': True}
    cursor = str(pois[-1].id)
    completed = 0
    for poi in pois:
        if _expired(deadline):
            break
        if poi_complete(poi):
            continue
        try:
            if translate_poi_object(poi, mode=mode)['changed']:
                completed += 1
        except Exception as exc:  # noqa: BLE001 - on isole chaque POI
            logger.warning("backfill POI %s: %s", poi.id, exc)
    return {'cursor': cursor, 'processed': len(pois), 'completed': completed,
            'wrapped': len(pois) < batch}


# ---------------------------------------------------------------------------
# Réglages partagés (SystemSetting) + orchestration de la passe
# ---------------------------------------------------------------------------
def get_setting(key, default=''):
    from apps.core.models import SystemSetting
    o = SystemSetting.objects.filter(setting_key=key).first()
    return o.setting_value if (o and o.setting_value not in (None, '')) else default


def set_setting(key, value):
    from apps.core.models import SystemSetting
    SystemSetting.objects.update_or_create(
        setting_key=key, defaults={'setting_value': str(value)})


def get_int_setting(key, default=0):
    try:
        return int(float(get_setting(key, default)))
    except (TypeError, ValueError):
        return default


def get_float_setting(key, default=0.0):
    try:
        return float(get_setting(key, default))
    except (TypeError, ValueError):
        return default


def get_bool_setting(key, default=False):
    val = str(get_setting(key, 'true' if default else 'false')).strip().lower()
    return val in ('1', 'true', 'yes', 'on')


def _incr_setting(key, delta):
    set_setting(key, get_int_setting(key, 0) + int(delta))


# --- Historique des exécutions (TranslationRunLog) ---
def start_run_log(source, mode):
    from .models import TranslationRunLog
    return TranslationRunLog.objects.create(
        source=source, mode=mode, status=TranslationRunLog.Status.RUNNING)


def update_run_log(log, summary):
    if not log:
        return
    log.tax_changed += int(summary.get('tax', {}).get('changed', 0) or 0)
    log.poi_completed += int(summary.get('poi_completed', 0) or 0)
    log.poi_processed += int(summary.get('poi_processed', 0) or 0)
    log.save(update_fields=['tax_changed', 'poi_completed', 'poi_processed', 'updated_at'])


def finish_run_log(log, status, note=''):
    if not log:
        return
    log.status = status
    log.finished_at = timezone.now()
    if note:
        log.note = note[:255]
    log.save(update_fields=['status', 'finished_at', 'note', 'updated_at'])


def current_manual_log():
    from .models import TranslationRunLog
    return (TranslationRunLog.objects
            .filter(source=TranslationRunLog.Source.MANUAL, status=TranslationRunLog.Status.RUNNING)
            .order_by('-started_at').first())


def run_pass(*, mode='auto', deadline=None, poi_batch=25, drain_queue=True) -> dict:
    """Passe complète (taxonomies puis backfill POI par curseur), bornée par `deadline`.
    Gère le curseur et le compteur de POI terminés. Utilisée par le cron nuit ET le bouton
    admin « passe complète »."""
    summary = {'tax': process_taxonomies(mode=mode, deadline=deadline),
               'poi_processed': 0, 'poi_completed': 0, 'wrapped': False}
    cursor = get_setting('translation_bulk_cursor', '')
    while not _expired(deadline):
        if drain_queue:
            try:
                from .services_translation import process_batch
                process_batch(10)  # priorité aux POI consultés (on-demand)
            except Exception as exc:  # noqa: BLE001
                logger.warning("drain queue pendant la passe: %s", exc)
        r = backfill_pois(cursor, mode=mode, batch=poi_batch, deadline=deadline)
        cursor = r['cursor']
        set_setting('translation_bulk_cursor', cursor)
        summary['poi_processed'] += r['processed']
        summary['poi_completed'] += r['completed']
        if r['completed']:
            _incr_setting('translation_poi_done_count', r['completed'])
        if r['wrapped']:
            set_setting('translation_bulk_cursor', '')  # fin de table → entretien cyclique
            summary['wrapped'] = True
            break
        if r['processed'] == 0:
            break
    return summary
