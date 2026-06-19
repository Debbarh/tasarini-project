"""Corrige des libellés de taxonomie mal traduits (MT mot-à-mot).
À exécuter : docker exec -i tasarini_backend python manage.py shell < scripts/fix_taxonomy_labels.py
"""
from apps.poi.models import ActivityIntensityLevel, AccommodationLocation, CulinaryAdventureLevel


def set_labels(obj, mapping):
    if not obj:
        return
    changed = []
    for lang, val in mapping.items():
        fld = f'label_{lang}'
        if hasattr(obj, fld):
            setattr(obj, fld, val)
            changed.append(fld)
    if changed:
        obj.save(update_fields=changed)
    return changed


# 1) Intensité "active" : "Asset" -> "Active"
set_labels(ActivityIntensityLevel.objects.filter(code='active').first(), {
    'en': 'Active', 'fr': 'Actif', 'es': 'Activo', 'de': 'Aktiv', 'it': 'Attivo',
    'pt': 'Ativo', 'ru': 'Активный', 'ja': 'アクティブ', 'zh': '活跃', 'ar': 'نشط', 'hi': 'सक्रिय',
})

# 2) Emplacement "countryside" : "Campaign/Campaña/Kampagne/Campanha" -> correct
set_labels(AccommodationLocation.objects.filter(code='countryside').first(), {
    'en': 'Countryside', 'fr': 'Campagne', 'es': 'Zona rural', 'de': 'Ländlich', 'it': 'Campagna',
    'pt': 'Zona rural', 'ru': 'Сельская местность', 'ja': '田園地帯', 'zh': '乡村', 'ar': 'الريف', 'hi': 'ग्रामीण',
})

# 3) Culinaire "conservative" : "Curator" -> "Conservative"
set_labels(CulinaryAdventureLevel.objects.filter(code='conservative').first(), {
    'en': 'Conservative', 'fr': 'Conservateur', 'es': 'Conservador', 'de': 'Konservativ', 'it': 'Conservatore',
    'pt': 'Conservador', 'ru': 'Консервативный', 'ja': '保守的', 'zh': '保守', 'ar': 'محافظ', 'hi': 'रूढ़िवादी',
})

print('Libellés corrigés (active, countryside, conservative).')
