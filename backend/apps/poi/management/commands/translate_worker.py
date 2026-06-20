"""Worker de traduction (mono-instance, résilient). Deux responsabilités :

1. **File on-demand** : draine `POITranslationQueue` (POI consultés) à l'intervalle réglé,
   si `translation_cron_enabled`. Réactif.
2. **Passe quotidienne** : si `translation_daily_enabled`, démarre chaque jour à partir de
   `translation_daily_hour` (locale) une passe **time-boxée** (`translation_daily_duration_hours`)
   qui traduit itérativement taxonomies + tous les POI (backfill par curseur, reprenable).

Tous les réglages sont relus à chaque cycle (modèle `SystemSetting`).
"""
from __future__ import annotations

import time
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.poi.services_translation import process_batch
from apps.poi import services_i18n as i18n


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
    help = "Worker de traduction (file on-demand + passe quotidienne time-boxée). translategemma:4b."

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Un seul cycle puis quitte.')
        parser.add_argument('--idle-sleep', type=int, default=30, help='Pause (s) quand tout est inactif.')

    def handle(self, *args, **opts):
        once = opts['once']
        idle = max(5, opts['idle_sleep'])
        self.stdout.write(self.style.SUCCESS('translate_worker démarré (file + passe quotidienne).'))
        while True:
            did_work = False
            # 1) Passe quotidienne (indépendante du toggle on-demand).
            try:
                did_work = self._maybe_daily() or did_work
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"erreur passe quotidienne: {exc}")

            # 2) File on-demand (POI consultés).
            if _setting('translation_cron_enabled', False, bool):
                batch = max(1, _setting('translation_batch_size', 20, int))
                try:
                    res = process_batch(batch)
                    if res['processed']:
                        did_work = True
                        self.stdout.write(f"file on-demand: {res}")
                        self.stdout.flush()
                except Exception as exc:  # noqa: BLE001
                    self.stderr.write(f"erreur file: {exc}")

            if once:
                break
            if _setting('translation_cron_enabled', False, bool):
                time.sleep(max(1, _setting('translation_cron_interval_minutes', 5, int)) * 60)
            else:
                time.sleep(idle)

    def _maybe_daily(self) -> bool:
        """Déclenche la passe quotidienne si l'heure est venue et qu'elle n'a pas déjà tourné aujourd'hui."""
        if not i18n.get_bool_setting('translation_daily_enabled', False):
            return False
        now = timezone.localtime()
        if now.hour < i18n.get_int_setting('translation_daily_hour', 0):
            return False
        today = timezone.localdate().isoformat()
        if i18n.get_setting('translation_daily_last_run', '') == today:
            return False
        # Marquer tôt pour éviter un double déclenchement si plusieurs cycles passent.
        i18n.set_setting('translation_daily_last_run', today)
        dur = max(0.001, i18n.get_float_setting('translation_daily_duration_hours', 6))
        deadline = now + timedelta(hours=dur)
        self.stdout.write(self.style.SUCCESS(
            f"passe quotidienne démarrée ({today}, {dur} h, jusqu'à {deadline:%H:%M})."))
        self.stdout.flush()
        summary = i18n.run_pass(mode='auto', deadline=deadline, poi_batch=25)
        self.stdout.write(f"passe quotidienne terminée: {summary}")
        self.stdout.flush()
        return True
