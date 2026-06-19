"""Worker cron de traduction des POI (file `POITranslationQueue` → translategemma:4b).

Process mono-instance (un seul conteneur), résilient. L'activation, l'intervalle et la
taille de lot sont **réglés depuis l'admin** (modèle `SystemSetting`, relus à chaque cycle) :
  - translation_cron_enabled (bool)
  - translation_cron_interval_minutes (number)
  - translation_batch_size (number)
"""
from __future__ import annotations

import time

from django.core.management.base import BaseCommand

from apps.poi.services_translation import process_batch


def _setting(key, default, cast):
    from apps.core.models import SystemSetting
    obj = SystemSetting.objects.filter(setting_key=key).first()
    if not obj:
        return default
    val = (obj.setting_value or '').strip()
    try:
        if cast is bool:
            return val.lower() in ('1', 'true', 'yes', 'on')
        return cast(val)
    except (TypeError, ValueError):
        return default


class Command(BaseCommand):
    help = "Boucle de traduction des POI (réglée via l'admin SystemSetting). Utilise translategemma:4b."

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Traite un seul lot puis quitte.')
        parser.add_argument('--idle-sleep', type=int, default=30, help='Pause (s) quand désactivé (def. 30).')

    def handle(self, *args, **opts):
        once = opts['once']
        idle = max(5, opts['idle_sleep'])
        self.stdout.write(self.style.SUCCESS('translate_worker démarré.'))
        while True:
            enabled = _setting('translation_cron_enabled', False, bool)
            if not enabled:
                if once:
                    self.stdout.write('Cron désactivé (translation_cron_enabled=false).')
                    break
                time.sleep(idle)
                continue
            interval = max(1, _setting('translation_cron_interval_minutes', 5, int))
            batch = max(1, _setting('translation_batch_size', 20, int))
            try:
                res = process_batch(batch)
                if res['processed']:
                    self.stdout.write(f"lot traité: {res}")
                    self.stdout.flush()
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"erreur lot: {exc}")
            if once:
                break
            time.sleep(interval * 60)
