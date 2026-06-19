"""Importe des POI **touristiques** depuis Overture Maps (GeoParquet sur S3) dans la base.

Lecture à la demande via DuckDB (extension httpfs, accès S3 anonyme), filtrée par
bbox + catégories touristiques + score de confiance. Idempotent : on n'insère pas
deux fois le même POI Overture (clé = id Overture stocké dans metadata).

Exemples :
  python manage.py import_overture_pois --bbox=-8.05,31.58,-7.95,31.68      # Marrakech
  python manage.py import_overture_pois --bbox=2.20,48.80,2.45,48.92        # Paris
  python manage.py import_overture_pois --world --step=10                    # monde (tuiles 10°)
  python manage.py import_overture_pois --bbox=... --min-confidence=0.4 --dry-run

Nécessite : pip install duckdb overturemaps  (ajoutés à requirements.txt).
"""
from __future__ import annotations

import logging
import time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.poi.models import TouristPoint

logger = logging.getLogger(__name__)

# Catégories Overture considérées comme « sites touristiques » (regex, bornes de mots
# pour éviter les faux positifs : agriCULTURAL, GARDENing, PARKing…).
TOUR_RE = (
    r'landmark|historical|monument|memorial|museum|art_gallery|tourist|attraction'
    r'|amusement_park|theme_park|water_park|national_park|botanical_garden|\bgarden\b'
    r'|\bzoo\b|aquarium|castle|palace|fortress|\bfort\b|heritage|\bhistoric'
    r'|scenic|viewpoint|lookout|planetarium|observatory|cultural_center'
    r'|\btemple\b|mosque|church|cathedral|basilica|shrine|synagogue|monastery|\bpark\b'
)
BLOCK_RE = (
    r'parking|car_park|rv_park|trailer_park|business_park|industrial_park'
    r'|office_park|skate_park|dog_park'
)
# Catégories qui relèvent plutôt d'une « activité » (parc, zoo, parc d'attractions…).
ACTIVITY_RE = r'park|zoo|aquarium|amusement|water_park|theme_park|botanical|garden'

_BASE = 's3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*'


class Command(BaseCommand):
    help = "Importe des POI touristiques depuis Overture Maps (GeoParquet) par bbox ou monde entier."

    def add_arguments(self, parser):
        parser.add_argument('--bbox', type=str, default=None,
                            help='minlon,minlat,maxlon,maxlat (ex. -8.05,31.58,-7.95,31.68)')
        parser.add_argument('--world', action='store_true', help='Parcourt le monde en tuiles.')
        parser.add_argument('--step', type=float, default=10.0, help='Taille des tuiles monde en degrés (def. 10).')
        parser.add_argument('--release', type=str, default=None, help='Release Overture (def. dernière).')
        parser.add_argument('--min-confidence', type=float, default=0.5, help='Score de confiance min (def. 0.5).')
        parser.add_argument('--owner-email', type=str, default=None, help='Email du compte propriétaire des POI importés.')
        parser.add_argument('--dry-run', action='store_true', help='Compte sans écrire en base.')
        parser.add_argument('--sleep', type=float, default=1.0, help='Pause (s) entre tuiles en mode --world (def. 1).')

    def handle(self, *args, **opts):
        try:
            import duckdb  # noqa: F401
        except ImportError:
            raise CommandError("duckdb n'est pas installé. Ajoutez `duckdb` à requirements.txt et rebuild.")

        release = opts['release'] or self._latest_release()
        self.stdout.write(f"Release Overture : {release}")
        min_conf = opts['min_confidence']
        dry = opts['dry_run']
        owner = self._resolve_owner(opts.get('owner_email'))
        self.stdout.write(f"Propriétaire des POI importés : {owner} (id={owner.id})")

        con = self._duck()

        if opts['world']:
            step = opts['step']
            total = 0
            tiles = list(self._world_tiles(step))
            self.stdout.write(f"Monde : {len(tiles)} tuiles de {step}°.")
            sleep_s = opts.get('sleep') or 0
            for i, bbox in enumerate(tiles, 1):
                try:
                    n = self._import_bbox(con, release, bbox, min_conf, owner, dry)
                    total += n
                    self.stdout.write(f"  [{i}/{len(tiles)}] {bbox} → +{n} (cumul {total})", ending='\n')
                    self.stdout.flush()
                except Exception as exc:  # noqa: BLE001
                    self.stderr.write(f"  [{i}/{len(tiles)}] {bbox} ERREUR: {exc}")
                if sleep_s:
                    time.sleep(sleep_s)
            self.stdout.write(self.style.SUCCESS(f"Terminé. {total} POI importés."))
            return

        if not opts['bbox']:
            raise CommandError("Fournissez --bbox=minlon,minlat,maxlon,maxlat ou --world.")
        try:
            bbox = tuple(float(x) for x in opts['bbox'].split(','))
            assert len(bbox) == 4
        except Exception:
            raise CommandError("--bbox mal formé. Attendu : minlon,minlat,maxlon,maxlat")
        n = self._import_bbox(con, release, bbox, min_conf, owner, dry)
        self.stdout.write(self.style.SUCCESS(f"{'(dry-run) ' if dry else ''}{n} POI {'trouvés' if dry else 'importés'}."))

    # ---- helpers ----
    def _latest_release(self):
        try:
            from overturemaps import core
            return core.get_latest_release()
        except Exception:
            return '2026-06-17.0'  # repli

    def _duck(self):
        import duckdb
        con = duckdb.connect()
        con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
        # Bornes de ressources pour ne pas saturer le VPS (site live en parallèle).
        con.execute("SET memory_limit='1536MB'; SET threads=2;")
        return con

    def _resolve_owner(self, email):
        User = get_user_model()
        if email:
            u = User.objects.filter(email=email).first()
            if not u:
                raise CommandError(f"Aucun utilisateur avec l'email {email}.")
            return u
        u = User.objects.filter(is_staff=True).order_by('id').first()
        if u:
            return u
        u, _ = User.objects.get_or_create(
            username='overture_import',
            defaults={'email': 'overture-import@tasarini.local', 'display_name': 'Overture Import'},
        )
        u.set_unusable_password(); u.save(update_fields=['password'])
        return u

    def _world_tiles(self, step):
        lon = -180.0
        while lon < 180.0:
            lat = -60.0  # on saute les pôles (peu de POI)
            while lat < 75.0:
                yield (round(lon, 3), round(lat, 3), round(lon + step, 3), round(lat + step, 3))
                lat += step
            lon += step

    def _import_bbox(self, con, release, bbox, min_conf, owner, dry):
        minlon, minlat, maxlon, maxlat = bbox
        path = _BASE.format(release=release)
        q = f"""
            SELECT id, names.primary AS name, categories.primary AS category,
                   bbox.xmin AS lon, bbox.ymin AS lat,
                   websites[1] AS website, addresses[1].freeform AS address, confidence
            FROM read_parquet('{path}', hive_partitioning=1)
            WHERE bbox.xmin BETWEEN {minlon} AND {maxlon}
              AND bbox.ymin BETWEEN {minlat} AND {maxlat}
              AND names.primary IS NOT NULL
              AND confidence >= {min_conf}
              AND regexp_matches(categories.primary, '{TOUR_RE}')
              AND NOT regexp_matches(categories.primary, '{BLOCK_RE}')
        """
        rows = con.execute(q).fetchall()
        if not rows:
            return 0
        if dry:
            return len(rows)

        # Dédup : on ne réinsère pas un id Overture déjà importé dans cette zone.
        existing = set(
            TouristPoint.objects.filter(
                metadata__external_source='overture',
                latitude__range=(minlat, maxlat),
                longitude__range=(minlon, maxlon),
            ).values_list('metadata__external_id', flat=True)
        )

        import re
        act_re = re.compile(ACTIVITY_RE)
        objs = []
        seen = set()
        for oid, name, category, lon, lat, website, address, confidence in rows:
            if not oid or oid in existing or oid in seen:
                continue
            if lat is None or lon is None:
                continue
            seen.add(oid)
            is_activity = bool(category and act_re.search(category))
            objs.append(TouristPoint(
                owner=owner,
                name=(name or '')[:255],
                description='',
                latitude=round(float(lat), 6),
                longitude=round(float(lon), 6),
                address=(address or '')[:255],
                website_url=(website or '')[:200] if website else '',
                is_active=True,
                is_verified=True,
                status='approved',
                is_restaurant=False,
                is_accommodation=False,
                is_activity=is_activity,
                metadata={
                    'external_source': 'overture',
                    'external_id': str(oid),
                    'categories': [category] if category else [],
                    'confidence': float(confidence) if confidence is not None else None,
                    'source_url': f'https://explore.overturemaps.org/#{oid}',
                    'license': 'Overture Maps (ODbL/CDLA)',
                },
            ))
        # bulk_create par lots
        created = 0
        for i in range(0, len(objs), 500):
            TouristPoint.objects.bulk_create(objs[i:i + 500], ignore_conflicts=True)
            created += len(objs[i:i + 500])
        return created
