"""Traduction à la demande d'un programme « Plan your trip ».

Le contenu d'un itinéraire (titres, descriptions, conseils, sections enrichies) est généré par
l'IA dans la langue du moment et figé dans le JSON. Ce module retraduit TOUTES les valeurs
texte vers une langue cible, à la demande, avec un cache par chaîne (Redis) → la 1re fois dans
une langue prend quelques secondes, ensuite c'est instantané.

Stratégie : on collecte les chaînes traduisibles (en excluant ids, URLs, nombres, coords, enums),
on déduplique, on traduit par lots via le provider IA actif, on met chaque chaîne en cache, puis
on reconstruit le JSON à l'identique en remplaçant les valeurs.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re

from django.core.cache import cache

logger = logging.getLogger(__name__)

# Clés dont la valeur ne doit JAMAIS être traduite (techniques / non textuelles).
EXCLUDE_KEYS = {
    'id', 'poi_id', 'sessionId', 'session_id', 'latitude', 'longitude', 'lat', 'lng',
    'difficulty', 'currency', 'code', 'url', 'image', 'images', 'thumbnailUrl', 'thumbnail',
    'startDate', 'endDate', 'date', 'color', 'icon', 'language', 'lang', 'poi',
    'matchScore', 'score', 'dayNumber', 'duration', 'cost', 'totalCost', 'totalBudget',
    'price', 'rating', 'phone', 'email', 'website', 'website_url', 'address',
}

_NUMERIC_RE = re.compile(r'^[\s0-9.,:/\-€$%°]+$')
_CACHE_TTL = 7 * 24 * 3600  # 7 jours
_BATCH = 40


def _is_translatable(s: str) -> bool:
    s2 = s.strip()
    if len(s2) < 2:
        return False
    if s2.startswith('http://') or s2.startswith('https://'):
        return False
    if _NUMERIC_RE.match(s2):
        return False
    if s2.lower() in {'easy', 'moderate', 'hard'}:
        return False
    return True


def _process(node, key, strings, mode, repl=None):
    """Parcourt le JSON. mode='collect' → empile les chaînes traduisibles ; mode='apply' →
    remplace chaque chaîne traduisible par la suivante de `repl` (même ordre que la collecte)."""
    if isinstance(node, dict):
        return {k: _process(v, k, strings, mode, repl) for k, v in node.items()}
    if isinstance(node, list):
        return [_process(v, key, strings, mode, repl) for v in node]
    if isinstance(node, str):
        if key in EXCLUDE_KEYS or not _is_translatable(node):
            return node
        if mode == 'collect':
            strings.append(node)
            return node
        return next(repl, node)
    return node


def _cache_key(text: str, lang: str) -> str:
    return f"itintr:{lang}:{hashlib.sha1(text.encode('utf-8')).hexdigest()}"


def _ai_translate_batch(texts, lang_name, provider):
    """Traduit une liste de chaînes via le provider IA. Renvoie une liste alignée (même
    longueur/ordre). En cas d'échec ou de désalignement, renvoie les originaux (sûr)."""
    from .ai_providers import call_provider_with_prompt, AIProviderException
    prompt = (
        f"Traduis en {lang_name} chaque élément de ce tableau JSON de chaînes. "
        "Conserve les noms propres et noms de lieux. Garde le MÊME nombre d'éléments, dans le MÊME ordre. "
        'Réponds STRICTEMENT en JSON valide de la forme {"t": [\"...\", ...]} sans texte avant/après.\n'
        + json.dumps(texts, ensure_ascii=False)
    )
    try:
        resp = call_provider_with_prompt(provider, prompt, retries=2) or {}
    except AIProviderException as exc:
        logger.warning("translate batch a échoué: %s", exc)
        return list(texts)
    out = resp.get('t') if isinstance(resp, dict) else None
    if isinstance(out, list) and len(out) == len(texts):
        return [str(x) if x is not None else src for x, src in zip(out, texts)]
    logger.warning("translate batch désaligné (%s attendu, %s reçu)", len(texts), len(out) if isinstance(out, list) else 'n/a')
    return list(texts)


def translate_itinerary(itinerary, lang_code, lang_name, provider):
    """Renvoie une COPIE de l'itinéraire dont les valeurs texte sont traduites en `lang_code`.
    Best-effort : toute chaîne non traduite reste dans sa langue d'origine."""
    if not isinstance(itinerary, dict):
        return itinerary
    strings: list[str] = []
    _process(itinerary, None, strings, 'collect')
    if not strings:
        return itinerary

    uniq = list(dict.fromkeys(strings))
    translated_map = {}
    to_translate = []
    for s in uniq:
        cached = cache.get(_cache_key(s, lang_code))
        if cached is not None:
            translated_map[s] = cached
        else:
            to_translate.append(s)

    if to_translate and provider is not None:
        for i in range(0, len(to_translate), _BATCH):
            batch = to_translate[i:i + _BATCH]
            res = _ai_translate_batch(batch, lang_name, provider)
            for src, tr in zip(batch, res):
                translated_map[src] = tr
                try:
                    cache.set(_cache_key(src, lang_code), tr, _CACHE_TTL)
                except Exception:  # noqa: BLE001
                    pass

    repl = iter(translated_map.get(s, s) for s in strings)
    return _process(itinerary, None, [], 'apply', repl)
