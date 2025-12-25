# 🌍 Script de Traduction - Countries & Cities

Ce script traduit automatiquement les noms de pays et de villes dans les 11 langues supportées par Tasarini.

## 📋 Prérequis

1. **Clé API OpenAI** : Vous devez avoir une clé API OpenAI configurée
2. **Package Python** : Installer le package OpenAI

```bash
pip install openai
```

## 🚀 Utilisation

### Configuration

Définir la clé API OpenAI :

```bash
export OPENAI_API_KEY="votre-clé-api-ici"
```

### Commandes

#### Traduire tout (pays + villes) :
```bash
cd /Users/abdelazizdebbarh/Desktop/tasarini/tasarini-project/backend
python3 scripts/translate_countries_cities.py
```

#### Mode test (dry-run) - Voir les traductions sans sauvegarder :
```bash
python3 scripts/translate_countries_cities.py --dry-run
```

#### Traduire uniquement les pays :
```bash
python3 scripts/translate_countries_cities.py --countries
```

#### Traduire uniquement les villes :
```bash
python3 scripts/translate_countries_cities.py --cities
```

#### Limiter le nombre d'entités (pour tester) :
```bash
python3 scripts/translate_countries_cities.py --limit 5 --dry-run
```

## 📊 Langues supportées

Le script traduit dans les 11 langues suivantes :

| Code | Langue | Exemple |
|------|--------|---------|
| `fr` | Français | France |
| `en` | English | France |
| `es` | Español | Francia |
| `de` | Deutsch | Frankreich |
| `it` | Italiano | Francia |
| `pt` | Português | França |
| `ru` | Русский | Франция |
| `ja` | 日本語 | フランス |
| `zh` | 中文 | 法国 |
| `hi` | हिन्दी | फ्रांस |
| `ar` | العربية | فرنسا |

## 🔄 Fonctionnement

1. Le script parcourt tous les pays/villes actifs
2. Pour chaque entité :
   - Utilise `name` ou `name_fr` comme source
   - Traduit vers chaque langue via OpenAI GPT-4o-mini
   - Sauvegarde dans les champs `name_{lang_code}`
   - Skip les traductions déjà existantes

3. Délai de 0.5s entre chaque appel API pour éviter le rate limiting

## ⚠️ Notes importantes

- **Première exécution** : Peut prendre du temps selon le nombre d'entités
- **Coût API** : Environ 0.001$ par traduction (très peu coûteux avec GPT-4o-mini)
- **Reprendre** : Le script peut être interrompu et repris, il skip les traductions existantes
- **Noms propres** : Le script préserve intelligemment les noms qui ne doivent pas être traduits

## 📈 Progression

Le script affiche en temps réel :
- Nombre total d'entités
- Progression (N/Total)
- Traductions effectuées
- Traductions déjà existantes (skip)

Exemple de sortie :
```
================================================================================
🌍 TRADUCTION DES PAYS
================================================================================

📊 45 pays à traduire

[1/45] 🏳️  France (FR)
  ✅ FR: France
  🔄 EN: France
  🔄 ES: Francia
  🔄 DE: Frankreich
  ...

[2/45] 🏳️  Morocco (MA)
  ✅ FR: Maroc
  ✓ EN: Morocco (déjà présent)
  🔄 ES: Marruecos
  ...
```

## 🐛 Dépannage

### Erreur "OPENAI_API_KEY non trouvée"
```bash
export OPENAI_API_KEY="sk-..."
```

### Erreur "No module named 'openai'"
```bash
pip install openai
```

### Rate Limiting
Le script inclut déjà des délais. Si vous avez des erreurs de rate limit, attendez quelques minutes.

## 📝 Exemples de traductions

**Paris** :
- FR: Paris
- EN: Paris
- ES: París
- DE: Paris
- IT: Parigi
- PT: Paris
- RU: Париж
- JA: パリ
- ZH: 巴黎
- HI: पेरिस
- AR: باريس

**Morocco** :
- FR: Maroc
- EN: Morocco
- ES: Marruecos
- DE: Marokko
- IT: Marocco
- PT: Marrocos
- RU: Марокко
- JA: モロッコ
- ZH: 摩洛哥
- HI: मोरक्को
- AR: المغرب
