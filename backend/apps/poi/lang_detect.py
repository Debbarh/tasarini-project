"""Détection de la langue d'un texte, restreinte aux 11 langues supportées.

Stratégie : le **script** d'abord (signal fort et indépendant de la longueur pour
arabe/cyrillique/devanagari/CJK), puis `langdetect` pour départager les langues à
script latin (fr/en/es/de/it/pt). En cas de doute → renvoie None (l'appelant ne
réaffectera alors aucun contenu : on ne casse rien).
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'hi', 'ar']
_LATIN_LANGS = {'fr', 'en', 'es', 'de', 'it', 'pt'}

# Seuil de confiance pour accepter une détection latine (réaffectation = destructif → strict).
_LATIN_MIN_PROB = 0.90
_LATIN_MIN_ALPHA = 6

try:  # langdetect est optionnel : si absent, seules les langues non-latines sont détectées.
    from langdetect import detect_langs, DetectorFactory
    DetectorFactory.seed = 0
    _HAS_LANGDETECT = True
except Exception:  # noqa: BLE001
    _HAS_LANGDETECT = False
    logger.warning("langdetect indisponible : détection limitée aux scripts non-latins.")

_LANGDETECT_MAP = {'zh-cn': 'zh', 'zh-tw': 'zh'}


def _char_script(ch: str) -> str:
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


def _dominant_script(text: str):
    counts: dict[str, int] = {}
    for ch in text:
        if not ch.isalpha():
            continue
        s = _char_script(ch)
        counts[s] = counts.get(s, 0) + 1
    if not counts:
        return None, 0.0
    total = sum(counts.values())
    script, n = max(counts.items(), key=lambda kv: kv[1])
    return script, n / total


def _langdetect_code(text: str):
    if not _HAS_LANGDETECT:
        return None, 0.0
    try:
        res = detect_langs(text)
    except Exception:  # noqa: BLE001 - langdetect lève sur texte sans alpha
        return None, 0.0
    if not res:
        return None, 0.0
    top = res[0]
    return _LANGDETECT_MAP.get(top.lang, top.lang), float(top.prob)


def detect_language(text) -> str | None:
    """Renvoie un code parmi SUPPORTED_LANGUAGES, ou None si indécidable."""
    if not text:
        return None
    text = str(text).strip()
    if not text:
        return None
    script, _frac = _dominant_script(text)
    if script is None:
        return None
    if script == 'arabic':
        return 'ar'
    if script == 'cyrillic':
        return 'ru'
    if script == 'devanagari':
        return 'hi'
    if script == 'cjk':
        # Présence de kana (hiragana/katakana) = japonais ; sinon han → langdetect, défaut zh.
        if any(0x3040 <= ord(c) <= 0x30FF for c in text):
            return 'ja'
        code, _ = _langdetect_code(text)
        return 'ja' if code == 'ja' else 'zh'
    # Script latin : exiger une détection langdetect fiable et un minimum de texte.
    alpha = sum(1 for ch in text if ch.isalpha())
    if alpha < _LATIN_MIN_ALPHA:
        return None
    code, prob = _langdetect_code(text)
    if code in _LATIN_LANGS and prob >= _LATIN_MIN_PROB:
        return code
    return None
