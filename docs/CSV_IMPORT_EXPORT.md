# Guide d'Import/Export CSV pour les Pays et Villes

Ce document explique comment utiliser les fonctionnalités d'import et d'export CSV pour gérer les pays et villes dans le système.

## Accès à la fonctionnalité

1. Connectez-vous en tant qu'administrateur
2. Accédez à **Admin Dashboard** > **Paramètres Plan Your Trip** > **Destinations**
3. Vous verrez deux onglets : **Pays** et **Villes**

## Export CSV

### Exporter les Pays

1. Cliquez sur l'onglet **Pays**
2. Cliquez sur le bouton **Exporter CSV**
3. Un fichier `countries.csv` sera téléchargé

**Format du fichier exporté :**
```csv
name,code,is_active
France,FR,True
Maroc,MA,True
Espagne,ES,True
```

### Exporter les Villes

1. Cliquez sur l'onglet **Villes**
2. Cliquez sur le bouton **Exporter CSV**
3. Un fichier `cities.csv` sera téléchargé

**Format du fichier exporté :**
```csv
name,country_code,country_name,latitude,longitude,is_active
Paris,FR,France,48.8566,2.3522,True
Lyon,FR,France,45.7640,4.8357,True
Casablanca,MA,Maroc,33.5731,-7.5898,True
```

## Import CSV

### Importer des Pays

1. Préparez votre fichier CSV avec les colonnes suivantes :
   - `name` (obligatoire) : Nom du pays
   - `code` (obligatoire) : Code ISO du pays (2-8 caractères)
   - `is_active` (optionnel) : `true`, `false`, `1`, `0`, `yes`, `no`, `oui`, `non`

2. Cliquez sur l'onglet **Pays**
3. Cliquez sur le bouton **Importer CSV**
4. Sélectionnez votre fichier CSV
5. Le système affichera un résumé :
   - Nombre de pays créés
   - Nombre de pays mis à jour
   - Liste des erreurs éventuelles

**Exemple de fichier d'import :**
```csv
name,code,is_active
Portugal,PT,true
Allemagne,DE,true
Belgique,BE,true
```

### Importer des Villes

1. Préparez votre fichier CSV avec les colonnes suivantes :
   - `name` (obligatoire) : Nom de la ville
   - `country_code` (obligatoire si country_name non fourni) : Code ISO du pays
   - `country_name` (obligatoire si country_code non fourni) : Nom du pays
   - `latitude` (optionnel) : Latitude GPS (format décimal)
   - `longitude` (optionnel) : Longitude GPS (format décimal)
   - `is_active` (optionnel) : `true`, `false`, `1`, `0`, `yes`, `no`, `oui`, `non`

2. Cliquez sur l'onglet **Villes**
3. Cliquez sur le bouton **Importer CSV**
4. Sélectionnez votre fichier CSV
5. Le système affichera un résumé :
   - Nombre de villes créées
   - Nombre de villes mises à jour
   - Liste des erreurs éventuelles

**Exemple de fichier d'import :**
```csv
name,country_code,country_name,latitude,longitude,is_active
Lisbonne,PT,Portugal,38.7223,-9.1393,true
Porto,PT,Portugal,41.1579,-8.6291,true
Berlin,DE,Allemagne,52.5200,13.4050,true
Munich,DE,Allemagne,48.1351,11.5820,true
Bruxelles,BE,Belgique,50.8503,4.3517,true
```

## Comportement de l'Import

### Création vs Mise à jour

#### Pays
- Si un pays avec le même **code** existe déjà : **mise à jour**
- Sinon : **création**

#### Villes
- Si une ville avec le même **nom** ET le même **pays** existe déjà : **mise à jour**
- Sinon : **création**

### Gestion des Erreurs

L'import continue même en cas d'erreurs sur certaines lignes. À la fin :
- Les lignes valides sont importées
- Les erreurs sont affichées avec le numéro de ligne
- Les erreurs sont également loguées dans la console du navigateur

**Exemples d'erreurs courantes :**
- Champs obligatoires manquants
- Code pays introuvable
- Format de coordonnées GPS invalide
- Fichier non-CSV

## Conseils

1. **Testez avec un petit fichier** : Avant d'importer un gros fichier, testez avec quelques lignes
2. **Utilisez l'export comme template** : Exportez d'abord pour voir le format exact
3. **Vérifiez les codes pays** : Assurez-vous que les pays existent avant d'importer les villes
4. **UTF-8 obligatoire** : Enregistrez vos fichiers CSV en UTF-8 pour les caractères accentués
5. **Sauvegardez avant l'import** : Exportez vos données actuelles avant de faire un gros import

## Support des Encodages

Le système supporte l'encodage UTF-8 pour les fichiers CSV, permettant l'import de noms avec des caractères spéciaux comme :
- Français : é, è, ê, à, ç
- Espagnol : ñ, á, í, ó, ú
- Allemand : ä, ö, ü, ß
- Arabe : caractères arabes
- etc.

## Endpoints API

Pour les développeurs, les endpoints suivants sont disponibles :

### Pays
- **Export** : `GET /api/v1/locations/countries/export-csv/`
- **Import** : `POST /api/v1/locations/countries/import-csv/`
  - Content-Type: `multipart/form-data`
  - Paramètre : `file` (fichier CSV)

### Villes
- **Export** : `GET /api/v1/locations/cities/export-csv/`
- **Import** : `POST /api/v1/locations/cities/import-csv/`
  - Content-Type: `multipart/form-data`
  - Paramètre : `file` (fichier CSV)

Tous les endpoints nécessitent une authentification admin.
