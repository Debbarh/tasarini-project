"""Worker de traduction (mono-instance, résilient). Trois responsabilités :

1. **File on-demand** : draine `POITranslationQueue` (POI consultés) à l'intervalle réglé,
   si `translation_cron_enabled`.
2. **Passe quotidienne** : si `translation_daily_enabled`, démarre chaque jour à partir de
   `translation_daily_hour` (locale) une passe **time-boxée** (`translation_daily_duration_hours`).
3. **Passe manuelle continue** : si `translation_manual_enabled` (start/stop par l'admin),
   travaille SANS limite de temps jusqu'à l'arrêt manuel (ou auto-arrêt quand tout est traduit).

Chaque passe (manuelle/quotidienne) est tracée dans `TranslationRunLog` (« état de ce qui a
été fait »). Tous les réglages sont relus à chaque cycle (`SystemSetting`).
"""
from __future__ import annotations

import time
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.poi.services_translation import process_batch
from apps.poi import services_i18n as i18n

TICK_SECONDS = 5            # cadence de base de la boucle (réactivité start/stop)
MANUAL_CHUNK_SECONDS = 25   # durée d'un « morceau » de passe manuelle entre 2 relectures du flag


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
    help = "Worker de traduction (file on-demand + passe quotidienne + passe manuelle start/stop)."

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Un seul cycle puis quitte.')

    def handle(self, *args, **opts):
        once = opts['once']
        self.stdout.write(self.style.SUCCESS('translate_worker démarré (file + quotidien + manuel).'))
        last_queue = 0.0
        while True:
            # 1) Passe quotidienne (scheduler).
            try:
                self._maybe_daily()
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"erreur passe quotidienne: {exc}")

            # 2) Passe manuelle continue (start/stop admin).
            try:
                self._manual_tick()
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"erreur passe manuelle: {exc}")

            # 3) File on-demand à l'intervalle réglé.
            try:
                if _setting('translation_cron_enabled', False, bool):
                    interval = max(1, _setting('translation_cron_interval_minutes', 5, int)) * 60
                    now = time.monotonic()
                    if now - last_queue >= interval:
                        res = process_batch(max(1, _setting('translation_batch_size', 20, int)))
                        last_queue = now
                        if res['processed']:
                            self.stdout.write(f"file on-demand: {res}")
                            self.stdout.flush()
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"erreur file: {exc}")

            if once:
                break
            time.sleep(TICK_SECONDS)

    # -- Passe manuelle ----------------------------------------------------
    def _manual_tick(self):
        manual_on = i18n.get_bool_setting('translation_manual_enabled', False)
        log = i18n.current_manual_log()
        if not manual_on:
            if log is not None:  # arrêté par l'admin → finaliser le log courant
                i18n.finish_run_log(log, 'stopped', note='Arrêté manuellement.')
            return
        if log is None:  # début d'une session manuelle
            log = i18n.start_run_log('manual', i18n.get_setting('translation_manual_mode', 'missing'))
            self.stdout.write(self.style.SUCCESS(f"passe manuelle démarrée (mode={log.mode})."))
        mode = i18n.get_setting('translation_manual_mode', 'missing')
        pass_mode = 'auto' if mode == 'full' else 'missing'
        summary = i18n.run_pass(mode=pass_mode,
                                deadline=timezone.now() + timedelta(seconds=MANUAL_CHUNK_SECONDS),
                                poi_batch=10)
        i18n.update_run_log(log, summary)
        no_work = (summary.get('wrapped')
                   and not summary.get('poi_completed')
                   and not summary.get('tax', {}).get('changed'))
        if no_work:  # plus rien à traduire → auto-arrêt
            i18n.set_setting('translation_manual_enabled', 'false')
            i18n.finish_run_log(log, 'done', note='Terminé : tout est traduit.')
            self.stdout.write(self.style.SUCCESS('passe manuelle: tout est traduit → arrêt automatique.'))
        self.stdout.flush()

    # -- Passe quotidienne -------------------------------------------------
    def _maybe_daily(self):
        if not i18n.get_bool_setting('translation_daily_enabled', False):
            return
        now = timezone.localtime()
        if now.hour < i18n.get_int_setting('translation_daily_hour', 0):
            return
        today = timezone.localdate().isoformat()
        if i18n.get_setting('translation_daily_last_run', '') == today:
            return
        i18n.set_setting('translation_daily_last_run', today)  # marquer tôt (évite double run)
        dur = max(0.001, i18n.get_float_setting('translation_daily_duration_hours', 6))
        deadline = now + timedelta(hours=dur)
        log = i18n.start_run_log('daily', 'auto')
        self.stdout.write(self.style.SUCCESS(f"passe quotidienne démarrée ({today}, {dur} h)."))
        self.stdout.flush()
        summary = i18n.run_pass(mode='auto', deadline=deadline, poi_batch=25)
        i18n.update_run_log(log, summary)
        i18n.finish_run_log(log, 'done', note=f"taxonomies={summary.get('tax', {}).get('changed', 0)}")
        self.stdout.write(f"passe quotidienne terminée: {summary}")
        self.stdout.flush()
