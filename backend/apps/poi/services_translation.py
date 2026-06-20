"""Traitement par lot de la file de traduction des POI (translategemma:4b via Ollama).

Partagé par la commande `translate_worker` (boucle cron) et l'endpoint admin « lancer
maintenant » (`TranslationCronView.post`). Écrit le résultat dans
`TouristPoint.metadata['translations'][lang]`.
"""
from __future__ import annotations

import logging

from .models import POITranslationQueue
from .admin import translate_text

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3
# Noms & adresses = noms propres → garde-fou « même script » (is_location=True).
# La description est de la prose → toujours traduite.
_LOCATION_FIELDS = {'name', 'address'}


def process_batch(batch_size: int = 20) -> dict:
    """Traite jusqu'à `batch_size` entrées `pending`. Renvoie {processed, done, failed}."""
    jobs = list(
        POITranslationQueue.objects.select_related('tourist_point')
        .filter(status=POITranslationQueue.Status.PENDING)
        .order_by('created_at')[:batch_size]
    )
    done = failed = 0
    for job in jobs:
        poi = job.tourist_point
        try:
            from .services_i18n import poi_lang_payload
            from .lang_detect import detect_language
            base = {f: (getattr(poi, f, '') or '').strip() for f in ('name', 'description', 'address')}
            meta = poi.metadata or {}
            names_auth = meta.get('names') or {}
            L0 = detect_language(base['description'] or base['name']) or 'en'
            # Politique qualité : nom authentique/original, adresse originale, description = LLM.
            out = poi_lang_payload(base, names_auth, L0, job.lang)
            translations = meta.get('translations') or {}
            translations[job.lang] = out
            meta['translations'] = translations
            poi.metadata = meta
            poi.save(update_fields=['metadata', 'updated_at'])
            job.status = POITranslationQueue.Status.DONE
            job.last_error = ''
            job.save(update_fields=['status', 'last_error', 'updated_at'])
            done += 1
        except Exception as exc:  # noqa: BLE001 - on isole chaque job
            job.attempts += 1
            job.last_error = str(exc)[:255]
            job.status = (
                POITranslationQueue.Status.FAILED
                if job.attempts >= MAX_ATTEMPTS
                else POITranslationQueue.Status.PENDING
            )
            job.save(update_fields=['attempts', 'last_error', 'status', 'updated_at'])
            failed += 1
            logger.warning("Translation job %s failed: %s", job.id, exc)
    return {'processed': len(jobs), 'done': done, 'failed': failed}
