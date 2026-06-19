"""Remplit les champs de traduction VIDES des taxonomies poi à partir du français.
DeepL pour toutes les langues sauf le hindi (LibreTranslate interne).
N'écrase jamais une traduction existante non vide. À exécuter via:
  docker exec -i tasarini_backend python manage.py shell < scripts/fill_taxonomy_translations.py
"""
import json
import re
import time
import urllib.parse
import urllib.request

from django.apps import apps as dj
from django.conf import settings

LANGS = ['en', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'hi', 'ar']
DEEPL_TARGET = {
    'en': 'EN-US', 'es': 'ES', 'de': 'DE', 'it': 'IT', 'pt': 'PT-PT',
    'ru': 'RU', 'ja': 'JA', 'zh': 'ZH', 'ar': 'AR',
}
DEEPL_URL = 'https://api-free.deepl.com/v2/translate'
LT_URL = 'http://libretranslate:5000/translate'
KEY = getattr(settings, 'DEEPL_API_KEY', '')


def deepl_batch(texts, target):
    params = [('text', t) for t in texts]
    params += [('target_lang', target), ('source_lang', 'FR')]
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(
        DEEPL_URL, data=data,
        headers={'Authorization': f'DeepL-Auth-Key {KEY}'})
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.load(r)
    return [t['text'] for t in res['translations']]


def lt_one(text):
    data = urllib.parse.urlencode({
        'q': text, 'source': 'fr', 'target': 'hi', 'format': 'text'
    }).encode()
    req = urllib.request.Request(
        LT_URL, data=data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)['translatedText']


# 1) Découverte des cibles : (obj, field_to_set, source_text)
targets = {l: [] for l in LANGS}  # lang -> list of (obj, fieldname, src)
for model in dj.get_app_config('poi').get_models():
    fields = {f.name for f in model._meta.get_fields() if hasattr(f, 'name')}
    for base in ('label', 'name', 'description'):
        if f'{base}_fr' in fields and any(f'{base}_{l}' in fields for l in LANGS):
            for obj in model.objects.all():
                src = (getattr(obj, f'{base}_fr', None) or getattr(obj, base, None) or '').strip()
                if not src:
                    continue
                for l in LANGS:
                    fld = f'{base}_{l}'
                    if fld in fields and not (getattr(obj, fld, None) or '').strip():
                        targets[l].append((obj, fld, src))
            # pas de break : on traite label/name ET description

total = sum(len(v) for v in targets.values())
print(f'Champs à remplir: {total}')

# 2) Traduction + assignation
to_save = {}  # id(obj) -> (obj, set(fields))
for l in LANGS:
    items = targets[l]
    if not items:
        continue
    print(f'{l}: {len(items)} champs...', flush=True)
    if l in DEEPL_TARGET:
        for i in range(0, len(items), 45):
            chunk = items[i:i + 45]
            trans = deepl_batch([src for _, _, src in chunk], DEEPL_TARGET[l])
            for (obj, fld, _), tr in zip(chunk, trans):
                setattr(obj, fld, tr)
                to_save.setdefault(id(obj), (obj, set()))[1].add(fld)
            time.sleep(0.3)
    else:  # hi via LibreTranslate
        for n, (obj, fld, src) in enumerate(items, 1):
            try:
                setattr(obj, fld, lt_one(src))
                to_save.setdefault(id(obj), (obj, set()))[1].add(fld)
            except Exception as e:
                print('  hi err:', e)
            if n % 50 == 0:
                print(f'  hi {n}/{len(items)}', flush=True)

# 3) Sauvegarde groupée par objet (update_fields)
saved = 0
for obj, flds in to_save.values():
    obj.save(update_fields=list(flds))
    saved += 1
print(f'Objets sauvegardés: {saved} | champs remplis: {total}')
