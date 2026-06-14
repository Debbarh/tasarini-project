#!/usr/bin/env python3
"""Fill missing i18n keys in all locale files, using French (complete reference)
as source. DeepL for supported languages, LibreTranslate for Hindi.
Only fills keys that are MISSING in a target locale — never overwrites existing
(curated) translations. Placeholders like {{count}} are protected."""
import json, os, re, sys, time, urllib.request, urllib.parse

LOCALES_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n', 'locales')
DEEPL_KEY = os.environ.get('DEEPL_KEY', '').strip()
DEEPL_URL = 'https://api-free.deepl.com/v2/translate'
LT_URL = 'https://tasarini.com/translate/translate'

# target lang code -> DeepL target_lang (None => use LibreTranslate)
DEEPL_TARGET = {
    'en': 'EN-US', 'de': 'DE', 'es': 'ES', 'it': 'IT', 'pt': 'PT-PT',
    'ru': 'RU', 'ja': 'JA', 'zh': 'ZH', 'ar': 'AR',
}
LT_TARGET = {'hi': 'hi'}  # DeepL has no Hindi

PH = re.compile(r'\{\{.*?\}\}')

def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        nk = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, nk))
        else:
            out[nk] = v
    return out

def set_key(d, path, value):
    parts = path.split('.')
    cur = d
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    cur[parts[-1]] = value

def protect(text):
    return PH.sub(lambda m: f'<keep>{m.group(0)}</keep>', text)

def unprotect(text):
    return text.replace('<keep>', '').replace('</keep>', '')

def deepl_batch(texts, target):
    params = [('text', protect(t)) for t in texts]
    params += [('target_lang', target), ('source_lang', 'FR'),
               ('tag_handling', 'xml'), ('ignore_tags', 'keep')]
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(DEEPL_URL, data=data,
        headers={'Authorization': f'DeepL-Auth-Key {DEEPL_KEY}'})
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.load(r)
    return [unprotect(t['text']) for t in res['translations']]

def lt_one(text, target):
    # protect placeholders with ascii sentinels LibreTranslate won't translate
    holders = PH.findall(text)
    tmp = text
    for i, h in enumerate(holders):
        tmp = tmp.replace(h, f'XPH{i}X', 1)
    data = urllib.parse.urlencode({
        'q': tmp, 'source': 'fr', 'target': target, 'format': 'text'
    }).encode()
    req = urllib.request.Request(LT_URL, data=data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(req, timeout=60) as r:
        out = json.load(r)['translatedText']
    for i, h in enumerate(holders):
        out = out.replace(f'XPH{i}X', h).replace(f'XPH {i} X', h)
    return out

def main():
    fr = json.load(open(os.path.join(LOCALES_DIR, 'fr.json'), encoding='utf-8'))
    fr_flat = {k: v for k, v in flatten(fr).items() if isinstance(v, str)}
    print(f'Référence FR: {len(fr_flat)} clés string')

    grand_total = 0
    for lang in list(DEEPL_TARGET) + list(LT_TARGET):
        path = os.path.join(LOCALES_DIR, f'{lang}.json')
        data = json.load(open(path, encoding='utf-8'))
        existing = set(flatten(data))
        missing = [(k, fr_flat[k]) for k in fr_flat if k not in existing]
        if not missing:
            print(f'{lang}: déjà complet')
            continue
        print(f'{lang}: {len(missing)} clés à traduire...', flush=True)

        if lang in DEEPL_TARGET:
            tgt = DEEPL_TARGET[lang]
            for i in range(0, len(missing), 45):
                chunk = missing[i:i+45]
                trans = deepl_batch([t for _, t in chunk], tgt)
                for (k, _), tr in zip(chunk, trans):
                    set_key(data, k, tr)
                print(f'  {lang}: {min(i+45, len(missing))}/{len(missing)}', flush=True)
                time.sleep(0.3)
        else:
            tgt = LT_TARGET[lang]
            for n, (k, src) in enumerate(missing, 1):
                try:
                    set_key(data, k, lt_one(src, tgt))
                except Exception as e:
                    set_key(data, k, src)  # fallback: keep FR
                if n % 50 == 0:
                    print(f'  {lang}: {n}/{len(missing)}', flush=True)

        json.dump(data, open(path, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        json.load(open(path, encoding='utf-8'))  # validate
        grand_total += len(missing)
        print(f'  {lang}: écrit ✅')

    print(f'\nTotal traduit: {grand_total} clés')

if __name__ == '__main__':
    if not DEEPL_KEY:
        print('DEEPL_KEY manquant', file=sys.stderr); sys.exit(1)
    main()
