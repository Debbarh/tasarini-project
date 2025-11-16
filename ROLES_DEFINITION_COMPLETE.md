# 🎭 Définition Complète des Rôles - Tasarini

**Date:** 12 Novembre 2025
**Version:** 2.0

---

## 📊 Vue d'Ensemble de la Hiérarchie

```
SUPER_ADMIN (Dieu mode - contrôle total)
    ↓
ADMIN (Gestion opérationnelle complète)
    ↓
EDITOR (Création/modération de contenu)
    ↓
┌───────────────┬──────────────┬────────────────┐
│               │              │                │
PARTNER       USER        CONTENT_CREATOR    GUIDE
(Business)   (Voyageur)   (Créateur)       (Local)
    ↓
GUEST (Visiteur non-connecté)
```

---

## 1️⃣ GUEST (Visiteur Non-Connecté)

**Code:** `guest`
**Niveau:** 0 (Accès public minimal)
**Authentification:** Aucune

### Description
Utilisateur non authentifié qui visite la plateforme. Accès limité pour découvrir le service avant inscription.

### Permissions Détaillées

#### ✅ CE QUI EST AUTORISÉ

**Consultation (Read-Only):**
- ✅ Page d'accueil et présentation du service
- ✅ Liste publique des POI (points d'intérêt)
  - Voir les 100 POI les mieux notés
  - Filtrer par destination, type, prix
  - Voir photos et informations de base
- ✅ Détails d'un POI spécifique
  - Informations complètes
  - Photos/vidéos
  - Avis publics (limité aux 10 premiers)
  - Note moyenne et nombre d'avis
- ✅ Articles de blog et guides de voyage (contenu public)
- ✅ Page À Propos / Contact / FAQ
- ✅ Recherche basique de destinations
- ✅ Carte interactive (vue lecture seule)
- ✅ Prévisualisation d'itinéraires publics (3 max)

**Actions:**
- ✅ Créer un compte (inscription)
- ✅ Se connecter
- ✅ Demander reset password (si email enregistré)

#### ❌ CE QUI EST INTERDIT

**Interactions:**
- ❌ Ajouter aux favoris
- ❌ Créer/modifier/supprimer un itinéraire
- ❌ Poster des avis/commentaires
- ❌ Réserver une activité
- ❌ Contacter un partenaire directement
- ❌ Voir son historique
- ❌ Recevoir des recommandations personnalisées
- ❌ Accéder au dashboard
- ❌ Télécharger des itinéraires
- ❌ Partager du contenu

**Limitations:**
- 🔒 Nombre de POI affichés: 100 maximum
- 🔒 Avis affichés par POI: 10 maximum
- 🔒 Itinéraires prévisualisables: 3 maximum
- 🔒 Pas d'accès API
- 🔒 Bannières publicitaires affichées
- 🔒 Watermark sur exports

### Transition vers USER
```
GUEST → Inscription + Email vérifié → USER
```

---

## 2️⃣ USER (Utilisateur Standard / Voyageur)

**Code:** `user` ou `traveler`
**Niveau:** 1 (Accès utilisateur standard)
**Authentification:** Requise + Email vérifié

### Description
Utilisateur standard de la plateforme qui planifie ses voyages, explore des destinations, et interagit avec le contenu.

### Permissions Détaillées

#### ✅ Tout ce que GUEST peut faire +

**Gestion de Compte:**
- ✅ Profil personnalisé (avatar, bio, préférences)
- ✅ Modifier ses informations
- ✅ Changer mot de passe
- ✅ Gérer préférences de notifications
- ✅ Configurer langue et devise
- ✅ Activer/désactiver 2FA

**Itinéraires et Planification:**
- ✅ Créer des itinéraires de voyage (max 10)
- ✅ Modifier/supprimer ses itinéraires
- ✅ Partager ses itinéraires (lien public)
- ✅ Dupliquer un itinéraire public
- ✅ Exporter en PDF (avec watermark léger)
- ✅ Mode hors-ligne (lecture seule)
- ✅ Recevoir des recommandations personnalisées

**Interactions:**
- ✅ Ajouter POI aux favoris (illimité)
- ✅ Poster des avis et notes sur POI visités
- ✅ Commenter les articles de blog
- ✅ Upvote/downvote des avis
- ✅ Signaler du contenu inapproprié
- ✅ Suivre d'autres utilisateurs
- ✅ Recevoir des notifications personnalisées

**Réservations:**
- ✅ Réserver des activités
- ✅ Réserver hébergements via partenaires
- ✅ Voir historique de réservations
- ✅ Annuler une réservation (selon conditions)
- ✅ Contacter service client

**Découverte:**
- ✅ Accès illimité aux POI
- ✅ Accès complet aux avis
- ✅ Carte interactive complète
- ✅ Suggestions IA basées sur préférences
- ✅ Voir itinéraires publics d'autres users (illimité)

**Contenu:**
- ✅ Créer des listes de souhaits
- ✅ Créer des albums photo privés
- ✅ Partager ses expériences (stories courtes)
- ✅ Participer aux discussions communautaires

#### ❌ CE QUI EST INTERDIT

**Contenu:**
- ❌ Créer/modifier des POI (sauf contribution suggérée)
- ❌ Publier des articles de blog
- ❌ Accès dashboard partenaire
- ❌ Voir analytics
- ❌ Modération de contenu

**Business:**
- ❌ Recevoir des paiements
- ❌ Gérer des réservations entrantes
- ❌ Accès API

### Limitations

| Ressource | Limite USER |
|-----------|-------------|
| Itinéraires | 10 |
| Favoris | Illimité |
| Avis par mois | 20 |
| Photos uploadées | 100 |
| Taille fichier | 5 MB |
| Partages par jour | 50 |
| Publicité | Affichée |

### Upgrade vers USER_PRO (Payant)
```
USER → Abonnement 9.99€/mois → USER_PRO

Avantages PRO:
- Itinéraires illimités
- Export PDF sans watermark
- Mode hors-ligne avancé
- Stockage photos 1GB
- Support prioritaire
- Sans publicité
- Accès early features
```

---

## 3️⃣ PARTNER (Partenaire Business)

**Code:** `partner`
**Niveau:** 2 (Accès business)
**Authentification:** Requise + Email vérifié + Dossier approuvé

### Description
Propriétaire d'établissement touristique (hôtel, restaurant, activité) qui gère ses POI et réservations.

### Workflow d'Activation

```
1. Inscription standard
2. Email verification
3. Candidature partenaire (formulaire)
   - Info entreprise (SIRET, adresse)
   - Type d'activité
   - Justificatifs (Kbis, etc.)
   - Plan tarifaire choisi
4. Review admin (24-48h)
5. Approbation → PARTNER actif
```

### Permissions Détaillées

#### ✅ Tout ce que USER peut faire +

**Gestion POI:**
- ✅ Créer des POI (Points d'Intérêt)
  - TRIAL: 3 POI max
  - STANDARD: 10 POI max
  - PREMIUM: Illimité
- ✅ Modifier ses POI (info, prix, horaires, photos)
- ✅ Supprimer ses POI
- ✅ Gérer disponibilités et calendrier
- ✅ Définir tarifs et promotions
- ✅ Upload photos/vidéos professionnelles
- ✅ Gérer les traductions (multi-langue)
- ✅ Activer/désactiver réservations en ligne

**Dashboard Partenaire:**
- ✅ Vue d'ensemble des performances
- ✅ Analytics de base:
  - Vues de ses POI
  - Clics
  - Réservations
  - Revenus
  - Note moyenne
- ✅ Graphiques 30 derniers jours
- ✅ Export CSV basique

**Réservations:**
- ✅ Voir réservations entrantes
- ✅ Accepter/refuser réservations
- ✅ Modifier une réservation
- ✅ Annuler avec raison
- ✅ Contacter le client via messagerie interne
- ✅ Gérer calendrier de disponibilité

**Communication:**
- ✅ Répondre aux avis clients
- ✅ Messagerie avec clients
- ✅ Recevoir notifications réservations
- ✅ Support partenaire (email)

**Facturation:**
- ✅ Voir ses commissions
- ✅ Voir transactions
- ✅ Télécharger factures
- ✅ Gérer info bancaire

#### ❌ CE QUI EST INTERDIT

**Modération:**
- ❌ Supprimer avis négatifs
- ❌ Modifier note moyenne
- ❌ Voir POI d'autres partenaires
- ❌ Accès dashboard admin

**Analytics:**
- ❌ Analytics plateforme globale
- ❌ Données concurrents
- ❌ Export avancé

### Tiers Partenaire

#### PARTNER_TRIAL (Essai 30 jours)
**Gratuit pendant 30 jours**
- 3 POI maximum
- Analytics basique
- Support standard
- Toutes features pour test

#### PARTNER_STANDARD (19.99€/mois)
**Plan standard pour petites structures**
- 10 POI maximum
- Analytics basique
- Commission: 12% par réservation
- Support email
- Dashboard standard

#### PARTNER_PREMIUM (49.99€/mois)
**Plan avancé pour établissements pros**
- POI illimités
- Analytics avancé:
  - Données historiques 2 ans
  - Comparaison avec concurrence
  - Prévisions IA
  - Export Excel/PDF illimité
- Commission réduite: 8%
- API access (REST + Webhooks)
- Support prioritaire (chat + téléphone)
- Multi-utilisateurs (5 comptes équipe)
- White-label widgets
- Personnalisation dashboard

---

## 4️⃣ EDITOR (Éditeur de Contenu)

**Code:** `editor`
**Niveau:** 3 (Accès éditorial)
**Authentification:** Requise + Assigné par ADMIN

### Description
Créateur de contenu éditorial officiel de la plateforme. Rédacteur, journaliste voyage, ou community manager qui crée et modère le contenu public.

### Recrutement
```
1. Candidature depuis compte USER actif
2. Portfolio + échantillons d'écriture
3. Test d'écriture (article sur destination)
4. Interview avec équipe éditoriale
5. Si accepté → Rôle EDITOR assigné
```

### Permissions Détaillées

#### ✅ Tout ce que USER peut faire +

**Création de Contenu:**
- ✅ Créer articles de blog
- ✅ Créer guides de voyage
- ✅ Créer listes "Top 10" / "Les meilleurs"
- ✅ Créer stories/récits de voyage
- ✅ Upload média illimité (photos HD, vidéos)
- ✅ Programmer publications
- ✅ Gérer brouillons
- ✅ Prévisualiser avant publication

**Gestion de Contenu:**
- ✅ Modifier ses propres articles
- ✅ Archiver ses articles
- ✅ Voir statistiques de ses articles:
  - Vues
  - Temps de lecture moyen
  - Engagement
  - Partages
  - Commentaires
- ✅ Gérer catégories et tags
- ✅ Optimisation SEO (meta description, keywords)
- ✅ Ajouter call-to-action

**Modération de Contenu:**
- ✅ Modérer commentaires sur TOUS les articles
  - Approuver/rejeter
  - Supprimer spam
  - Bannir utilisateurs abusifs (temporaire)
- ✅ Modérer avis POI signalés
  - Recommander suppression si inapproprié
  - Contacter auteur
- ✅ Modérer stories utilisateurs signalées
- ✅ Gérer file de modération (queue)

**Collaboration:**
- ✅ Voir articles d'autres EDITORS (lecture seule)
- ✅ Laisser notes/suggestions sur brouillons
- ✅ Collaborer sur articles multi-auteurs
- ✅ Calendrier éditorial (lecture)

**POI - Contribution Spéciale:**
- ✅ Suggérer modifications sur POI existants
- ✅ Soumettre nouveaux POI (review admin requise)
- ✅ Ajouter informations éditoriales aux POI
- ✅ Créer "articles liés" pour POI

**Outils Éditoriaux:**
- ✅ Éditeur Markdown avancé
- ✅ Générateur de vignettes
- ✅ Outils SEO intégrés
- ✅ Vérificateur orthographe multilingue
- ✅ Bibliothèque de médias partagée
- ✅ Templates d'articles

#### ❌ CE QUI EST INTERDIT

**Contenu d'Autres:**
- ❌ Modifier articles d'autres EDITORS
- ❌ Supprimer articles d'autres EDITORS
- ❌ Publier au nom d'autres

**POI:**
- ❌ Créer/modifier POI directement (sauf suggestion)
- ❌ Supprimer POI
- ❌ Voir analytics partenaires

**Admin:**
- ❌ Gérer utilisateurs
- ❌ Gérer partenaires
- ❌ Accès settings système
- ❌ Voir logs admin
- ❌ Gérer permissions
- ❌ Accès dashboard admin global

**Modération Limitée:**
- ❌ Bannir utilisateurs définitivement (seulement temporaire 7j max)
- ❌ Supprimer comptes utilisateurs
- ❌ Modifier avis/notes POI (seulement cacher si spam/inapproprié)

### Rémunération

**Modèle de Rémunération EDITOR:**

1. **Salaire fixe mensuel:** 500-2000€ selon expérience
2. **Bonus par article:**
   - Article standard: 50€
   - Guide complet: 100-200€
   - Article avec 10k+ vues: Bonus 50€
3. **Partage revenus pub:** 30% des revenus pub sur ses articles
4. **Primes performance:**
   - Meilleur article du mois: 200€
   - 100k vues cumulées/mois: Bonus 500€

**Équipement fourni:**
- Accès premium à tous les outils
- Bibliothèque photos professionnelles (Getty, Unsplash Pro)
- Formation continue

### Statistiques Dashboard EDITOR

```
Mon Dashboard EDITOR:
├── Articles publiés: 47
├── Vues totales: 234,567
├── Engagement moyen: 4.2 min
├── Commentaires modérés: 1,234
├── Articles en cours: 3 brouillons
├── Revenus ce mois: 1,245€
└── Classement: #3 sur 12 editors
```

---

## 5️⃣ ADMIN (Administrateur Plateforme)

**Code:** `admin`
**Niveau:** 4 (Accès administratif)
**Authentification:** Requise + Assigné par SUPER_ADMIN

### Description
Administrateur opérationnel de la plateforme. Gère les utilisateurs, partenaires, contenu, et assure le bon fonctionnement quotidien.

### Recrutement
```
1. Employé Tasarini
2. Formation interne (2 semaines)
3. Période d'essai avec EDITOR role
4. Validation par SUPER_ADMIN
5. Assignment role ADMIN
```

### Permissions Détaillées

#### ✅ Tout ce que EDITOR peut faire +

**Gestion Utilisateurs:**
- ✅ Voir tous les utilisateurs
- ✅ Rechercher utilisateurs (email, nom, ID)
- ✅ Voir détails complets d'un utilisateur
- ✅ Modifier informations utilisateur
- ✅ Réinitialiser mot de passe utilisateur
- ✅ Suspendre compte utilisateur
- ✅ Bannir utilisateur (permanent)
- ✅ Supprimer compte utilisateur
- ✅ Voir historique d'activité utilisateur
- ✅ Envoyer email à utilisateur
- ✅ Assigner rôle USER → EDITOR

**Gestion Partenaires:**
- ✅ Voir toutes les candidatures partenaires
- ✅ Approuver/rejeter candidatures
- ✅ Voir tous les partenaires actifs
- ✅ Modifier informations partenaire
- ✅ Suspendre compte partenaire
- ✅ Changer plan partenaire (TRIAL → STANDARD → PREMIUM)
- ✅ Voir POI de tous les partenaires
- ✅ Modifier POI d'un partenaire (si nécessaire)
- ✅ Désactiver POI problématique
- ✅ Voir analytics globaux partenaires

**Gestion POI:**
- ✅ CRUD complet sur TOUS les POI
- ✅ Approuver POI en attente
- ✅ Rejeter POI avec raison
- ✅ Fusionner POI dupliqués
- ✅ Déplacer POI (si erreur localisation)
- ✅ Marquer POI comme "Vérifié"
- ✅ Gérer catégories de POI
- ✅ Gérer tags de POI
- ✅ Upload photos pour POI publics

**Modération Avancée:**
- ✅ Voir tous les signalements
- ✅ Traiter signalements:
  - Avis inappropriés
  - Contenu spam
  - Photos offensantes
  - Utilisateurs abusifs
- ✅ Bannir utilisateurs définitivement
- ✅ Supprimer contenu inapproprié
- ✅ Envoyer avertissements
- ✅ Gérer blacklist

**Contenu:**
- ✅ Voir tous les articles (tous EDITORS)
- ✅ Modifier TOUS les articles
- ✅ Supprimer articles
- ✅ Publier articles en attente
- ✅ Mettre article en featured
- ✅ Gérer homepage/sliders

**Réservations:**
- ✅ Voir toutes les réservations
- ✅ Annuler une réservation (remboursement)
- ✅ Gérer litiges client-partenaire
- ✅ Voir transactions
- ✅ Gérer remboursements

**Analytics:**
- ✅ Dashboard admin complet:
  - Utilisateurs actifs
  - Nouvelles inscriptions
  - Taux conversion
  - Revenus total
  - Top POI
  - Top partners
  - Performance articles
- ✅ Rapports personnalisés
- ✅ Export données (CSV, Excel)
- ✅ Graphiques avancés

**Support Client:**
- ✅ Voir tous les tickets support
- ✅ Répondre aux tickets
- ✅ Escalader vers SUPER_ADMIN
- ✅ Accès historique conversations
- ✅ Notes internes sur utilisateurs

**Système:**
- ✅ Voir logs d'activité (lecture seule)
- ✅ Gérer notifications système
- ✅ Programmer maintenances
- ✅ Voir statut serveurs
- ✅ Gérer cache

#### ❌ CE QUI EST INTERDIT

**Super Admin:**
- ❌ Créer/modifier/supprimer ADMIN
- ❌ Créer/modifier/supprimer SUPER_ADMIN
- ❌ Modifier settings système critiques
- ❌ Accès base de données directe
- ❌ Modifier configuration serveur
- ❌ Gérer domaines/SSL
- ❌ Accès SSH serveurs
- ❌ Modifier code source
- ❌ Déployer en production

**Financier:**
- ❌ Modifier taux de commission
- ❌ Voir informations bancaires complètes
- ❌ Initier virements bancaires
- ❌ Modifier prix d'abonnements

### Dashboard ADMIN

```
Dashboard Admin - Vue Globale:
├── Utilisateurs
│   ├── Total: 45,234
│   ├── Actifs (7j): 12,456
│   ├── Nouveaux (30j): 3,456
│   └── Suspendus: 123
├── Partenaires
│   ├── Total: 1,234
│   ├── En attente: 45
│   ├── Premium: 234
│   └── Standard: 955
├── POI
│   ├── Total: 8,765
│   ├── En attente: 234
│   ├── Vérifiés: 6,543
│   └── Signalés: 12
├── Contenu
│   ├── Articles: 567
│   ├── Commentaires (30j): 4,567
│   └── Signalements: 23
├── Réservations
│   ├── Total: 23,456
│   ├── Ce mois: 1,234
│   ├── En cours: 456
│   └── Litiges: 5
└── Revenus
    ├── Ce mois: 45,678€
    ├── Commissions: 12,345€
    └── Abonnements: 8,901€
```

---

## 6️⃣ SUPER_ADMIN (Super Administrateur)

**Code:** `super_admin`
**Niveau:** 5 (Accès Dieu - Full Control)
**Authentification:** Requise + 2FA Obligatoire + IP Whitelist

### Description
Fondateur, CTO, ou développeur senior avec accès complet à TOUT le système. Responsable infrastructure, sécurité, et décisions critiques.

### Recrutement
```
- Fondateurs uniquement
- CTO / Lead Developer
- Maximum 2-3 personnes
- Assignment manuel en DB
```

### Permissions Détaillées

#### ✅ TOUT ce que ADMIN peut faire +

**Gestion Admins:**
- ✅ Créer comptes ADMIN
- ✅ Modifier ADMIN
- ✅ Supprimer ADMIN
- ✅ Assigner/retirer role ADMIN
- ✅ Voir logs d'activité de chaque ADMIN
- ✅ Révoquer sessions ADMIN
- ✅ Forcer changement mot de passe ADMIN

**Gestion Super Admins:**
- ✅ Voir liste SUPER_ADMIN
- ✅ Créer nouveau SUPER_ADMIN (avec confirmation autre SUPER_ADMIN)
- ✅ Révoquer SUPER_ADMIN (vote 2/3 SUPER_ADMIN requis)

**Système & Infrastructure:**
- ✅ Modifier TOUTES les settings système
- ✅ Gérer variables d'environnement
- ✅ Accès base de données directe
- ✅ Exécuter requêtes SQL
- ✅ Backup/Restore DB
- ✅ Accès SSH serveurs
- ✅ Gérer DNS/Domaines
- ✅ Gérer certificats SSL
- ✅ Redémarrer services
- ✅ Accès logs serveurs
- ✅ Configurer firewall

**Développement:**
- ✅ Accès code source (GitHub)
- ✅ Déployer en production
- ✅ Rollback version
- ✅ Gérer CI/CD
- ✅ Créer/modifier API endpoints
- ✅ Gérer webhooks
- ✅ Accès console Django
- ✅ Exécuter migrations DB

**Sécurité:**
- ✅ Voir TOUS les logs (audit complet)
- ✅ Accès logs de sécurité
- ✅ Gérer IP whitelist/blacklist
- ✅ Voir tentatives de connexion échouées
- ✅ Forcer déconnexion tous utilisateurs
- ✅ Activer mode maintenance
- ✅ Configurer rate limiting
- ✅ Gérer CORS

**Financier:**
- ✅ Modifier taux de commission
- ✅ Modifier prix d'abonnements
- ✅ Voir toutes les transactions
- ✅ Voir informations bancaires
- ✅ Initier remboursements
- ✅ Exporter comptabilité
- ✅ Gérer intégrations paiement (Stripe, PayPal)

**Analytics Super Avancé:**
- ✅ Accès Google Analytics complet
- ✅ Accès bases de données analytics
- ✅ Créer rapports custom SQL
- ✅ Export données massif
- ✅ Accès logs applicatifs complets

**Emails:**
- ✅ Configurer serveur SMTP
- ✅ Gérer templates email
- ✅ Tester envoi emails
- ✅ Voir logs emails (delivery/bounce)
- ✅ Whitelist/blacklist domaines

**API:**
- ✅ Créer clés API master
- ✅ Voir TOUTES les clés API
- ✅ Révoquer n'importe quelle clé API
- ✅ Voir usage API par partenaire
- ✅ Configurer rate limits API

**Features Flags:**
- ✅ Activer/désactiver features en production
- ✅ A/B testing
- ✅ Rollout progressif de features
- ✅ Kill switch global

#### ❌ Limitations (Auto-imposées)

**Best Practices:**
- 🔒 Actions critiques requièrent 2FA
- 🔒 Suppression DB requiert confirmation
- 🔒 Changements production → peer review
- 🔒 Accès SSH uniquement via VPN
- 🔒 Logs d'activité ultra-détaillés
- 🔒 Alertes automatiques sur actions sensibles

### Dashboard SUPER_ADMIN

```
Dashboard Super Admin:
├── Système
│   ├── Uptime: 99.98%
│   ├── CPU: 23%
│   ├── RAM: 4.2GB / 16GB
│   ├── Disk: 234GB / 500GB
│   ├── DB size: 12.3GB
│   └── Backup: OK (il y a 2h)
├── Sécurité
│   ├── Tentatives login échouées (24h): 234
│   ├── IPs bloquées: 12
│   ├── Alertes actives: 0
│   └── SSL: Valide (expire dans 45j)
├── Performance
│   ├── Requêtes/sec: 456
│   ├── Temps réponse moyen: 124ms
│   ├── Erreurs 5xx (24h): 3
│   └── Cache hit ratio: 87%
├── Utilisateurs
│   ├── En ligne maintenant: 1,234
│   ├── Peak aujourd'hui: 3,456
│   └── Sessions actives: 2,345
├── Financier
│   ├── CA ce mois: 67,890€
│   ├── Commissions: 15,678€
│   ├── Abonnements: 12,345€
│   └── Marge: 65%
└── Actions Rapides
    ├── [Mode Maintenance]
    ├── [Backup Now]
    ├── [Clear Cache]
    ├── [View Logs]
    └── [Deploy]
```

### Alertes Automatiques SUPER_ADMIN

**Email + SMS instantané si:**
- 🚨 Uptime < 99%
- 🚨 Erreurs 5xx > 10/min
- 🚨 Tentatives login ADMIN échouées > 5
- 🚨 Disk > 90%
- 🚨 DB backup échoué
- 🚨 SSL expire dans < 7 jours
- 🚨 Nouvel ADMIN créé
- 🚨 Modification settings critiques
- 🚨 Suppression massive de données

---

## 🔐 Matrice Complète de Permissions

| Action / Ressource | GUEST | USER | PARTNER | EDITOR | ADMIN | SUPER_ADMIN |
|-------------------|-------|------|---------|--------|-------|-------------|
| **Compte** |
| S'inscrire | ✅ | - | - | - | - | - |
| Se connecter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modifier profil | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Activer 2FA | - | ✅ | ✅ | ✅ | ✅ | ✅ (obligatoire) |
| **POI - Consultation** |
| Voir POI publics (limité) | ✅ (100 max) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir détails POI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir avis POI | ✅ (10 max) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **POI - Interactions** |
| Favoris POI | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Noter/Avis POI | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| **POI - Gestion** |
| Créer POI | - | - | ✅ | 🟡 (suggérer) | ✅ | ✅ |
| Modifier POI (ses) | - | - | ✅ | - | ✅ | ✅ |
| Modifier POI (autres) | - | - | - | - | ✅ | ✅ |
| Supprimer POI | - | - | ✅ (ses) | - | ✅ | ✅ |
| Approuver POI | - | - | - | - | ✅ | ✅ |
| **Itinéraires** |
| Voir itinéraires publics | ✅ (3 max) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Créer itinéraire | - | ✅ (10 max) | ✅ | ✅ | ✅ | ✅ |
| Exporter PDF | - | ✅ (watermark) | ✅ | ✅ | ✅ | ✅ |
| Partager itinéraire | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Contenu Éditorial** |
| Lire articles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Commenter articles | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Créer articles | - | - | - | ✅ | ✅ | ✅ |
| Modifier ses articles | - | - | - | ✅ | ✅ | ✅ |
| Modifier articles (autres) | - | - | - | - | ✅ | ✅ |
| Publier articles | - | - | - | ✅ | ✅ | ✅ |
| **Modération** |
| Signaler contenu | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modérer commentaires | - | - | - | ✅ | ✅ | ✅ |
| Modérer avis | - | - | - | 🟡 (suggérer) | ✅ | ✅ |
| Bannir utilisateurs | - | - | - | 🟡 (7j max) | ✅ | ✅ |
| **Réservations** |
| Réserver activité | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir ses réservations | - | ✅ | ✅ (reçues) | ✅ | ✅ | ✅ |
| Annuler réservation | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir toutes réservations | - | - | - | - | ✅ | ✅ |
| Gérer litiges | - | - | 🟡 (ses) | - | ✅ | ✅ |
| **Utilisateurs** |
| Voir liste users | - | - | - | - | ✅ | ✅ |
| Modifier users | - | - | - | - | ✅ | ✅ |
| Suspendre users | - | - | - | - | ✅ | ✅ |
| Supprimer users | - | - | - | - | ✅ | ✅ |
| **Partenaires** |
| Candidater partenaire | - | ✅ | - | - | - | - |
| Voir candidatures | - | - | - | - | ✅ | ✅ |
| Approuver partenaires | - | - | - | - | ✅ | ✅ |
| Gérer plans partenaires | - | - | - | - | ✅ | ✅ |
| **Administration** |
| Dashboard user | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard partner | - | - | ✅ | - | ✅ | ✅ |
| Dashboard editor | - | - | - | ✅ | ✅ | ✅ |
| Dashboard admin | - | - | - | - | ✅ | ✅ |
| Dashboard super admin | - | - | - | - | - | ✅ |
| Gérer admins | - | - | - | - | - | ✅ |
| **Analytics** |
| Voir ses stats | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir stats POI (ses) | - | - | ✅ | - | ✅ | ✅ |
| Voir stats articles (ses) | - | - | - | ✅ | ✅ | ✅ |
| Voir analytics global | - | - | - | - | ✅ | ✅ |
| Export données | - | - | 🟡 (CSV basique) | 🟡 (ses articles) | ✅ | ✅ |
| **API** |
| Accès API (limité) | ✅ (100/h) | ✅ (1000/h) | 🟡 (PREMIUM) | - | - | ✅ |
| Créer clé API | - | - | 🟡 (PREMIUM) | - | - | ✅ |
| Voir usage API | - | - | 🟡 (PREMIUM) | - | ✅ | ✅ |
| **Système** |
| Voir logs application | - | - | - | - | 🟡 (lecture) | ✅ |
| Modifier settings | - | - | - | - | - | ✅ |
| Accès DB | - | - | - | - | - | ✅ |
| Accès serveur | - | - | - | - | - | ✅ |
| Déployer code | - | - | - | - | - | ✅ |

**Légende:**
- ✅ = Autorisé complet
- 🟡 = Autorisé avec limitations
- - = Interdit

---

## 🎯 Cas d'Usage par Rôle

### Scénario 1: Marie (GUEST → USER)
```
1. Marie visite Tasarini sans compte (GUEST)
   → Explore 50 POI à Paris
   → Lit 2 articles sur les restaurants parisiens
   → Limitation: Ne peut pas sauvegarder ses favoris

2. Marie s'inscrit (USER)
   → Email: marie@example.com
   → Reçoit email de vérification
   → Clique sur lien → Compte actif

3. Marie utilise la plateforme (USER)
   → Crée itinéraire "Paris 3 jours"
   → Ajoute 15 POI aux favoris
   → Réserve visite Louvre
   → Poste avis restaurant
```

### Scénario 2: Restaurant "Le Bon Coin" (PARTNER)
```
1. Pierre, propriétaire, s'inscrit
   → Remplit candidature partenaire
   → Upload Kbis + photos restaurant
   → Choisit plan STANDARD (19.99€/mois)

2. Admin review sous 24h
   → Vérifie documents
   → Valide info
   → APPROVE → Pierre reçoit email confirmation

3. Pierre crée son POI
   → "Restaurant Le Bon Coin"
   → Upload 10 photos
   → Définit menu et prix
   → Active réservations en ligne

4. Pierre gère son business
   → Reçoit 5 réservations/jour
   → Répond aux avis clients
   → Voit analytics: 234 vues cette semaine
   → Commission: 8 réservations × 50€ × 12% = 48€
```

### Scénario 3: Sophie (EDITOR)
```
1. Sophie, blogueuse voyage, postule
   → Soumet portfolio
   → Passe test d'écriture
   → Approuvée par équipe édito

2. Sophie crée du contenu
   → Écrit "Top 10 restaurants végans Paris"
   → Upload 15 photos HD
   → Optimise SEO
   → Programme publication vendredi 10h

3. Sophie modère
   → 23 commentaires sur son article
   → Approuve 21, rejette 2 (spam)
   → Répond à questions lecteurs

4. Sophie suit ses stats
   → Article: 12,567 vues
   → Engagement: 4.2 min
   → Revenus pub: 125€
   → Bonus performance: 50€
```

### Scénario 4: Jean (ADMIN)
```
1. Jean, employé Tasarini, gère quotidien
   → Dashboard: 45 signalements à traiter
   → 12 candidatures partenaires en attente
   → 234 POI à approuver

2. Jean traite un litige
   → Client mécontent d'une réservation
   → Contacte partenaire
   → Négocie solution
   → Approuve remboursement partiel

3. Jean modère un POI problématique
   → POI "Bar XYZ" signalé 5 fois
   → Vérifie: fausses photos
   → Contacte partenaire
   → Suspend POI temporairement
   → Envoie avertissement

4. Jean approuve nouveaux partenaires
   → Review 3 candidatures
   → Approuve 2, rejette 1 (documents incomplets)
   → Envoie emails de notification
```

### Scénario 5: Thomas (SUPER_ADMIN / CTO)
```
1. Thomas monitore système
   → Dashboard: Uptime 99.99%
   → CPU spike détecté hier soir
   → Analyse logs: bot scraper
   → Ajoute IP à blacklist

2. Thomas déploie nouvelle feature
   → Review code de l'équipe dev
   → Tests passent ✅
   → Déploie en staging
   → Tests utilisateurs OK
   → Déploie en production
   → Monitore erreurs: 0

3. Thomas gère incident sécurité
   → Alerte: 50 tentatives login admin échouées
   → Identifie attaque brute force
   → Bloque IP source
   → Force reset password admin concerné
   → Active 2FA obligatoire pour tous admins
   → Envoie rapport d'incident

4. Thomas optimise infra
   → Analyse: DB queries lentes
   → Crée index manquant
   → Performance: 300ms → 50ms
   → Sauvegarde DB
   → Monitore: tout OK
```

---

## 🔄 Transitions de Rôles

### Upgrade de Rôle

```
GUEST → USER
└─ Inscription + email vérifié
   └─ Automatique, immédiat

USER → USER_PRO
└─ Abonnement payant 9.99€/mois
   └─ Automatique après paiement

USER → PARTNER
└─ Candidature + documents
   └─ Review admin (24-48h)
   └─ Si approuvé → PARTNER

USER → CONTENT_CREATOR
└─ Candidature depuis compte USER
   └─ Portfolio + échantillons
   └─ Review équipe édito
   └─ Rôle additionnel

USER/PARTNER → EDITOR
└─ Recrutement interne
   └─ Test écriture + interview
   └─ Assignment par ADMIN

EDITOR → ADMIN
└─ Employé Tasarini uniquement
   └─ Formation interne
   └─ Assignment par SUPER_ADMIN

ADMIN → SUPER_ADMIN
└─ Fondateurs/CTO uniquement
   └─ Assignment manuel en DB
   └─ Vote des autres SUPER_ADMIN
```

### Downgrade / Révocation

```
PARTNER → USER
├─ Résiliation abonnement
├─ Violation conditions
└─ Bannissement définitif

EDITOR → USER
├─ Démission
├─ Violation politique éditoriale
└─ Performance insuffisante

ADMIN → EDITOR
├─ Abus de pouvoir
├─ Violation sécurité
└─ Révocation par SUPER_ADMIN

SUPER_ADMIN → ADMIN
└─ Vote 2/3 autres SUPER_ADMIN
   (seulement cas extrêmes)
```

---

## 📋 Checklist Implémentation

### Phase 1: Rôles de Base
- [ ] Implémenter UserRole enum avec GUEST, USER, PARTNER, EDITOR, ADMIN, SUPER_ADMIN
- [ ] Créer AccountStatus enum
- [ ] Ajouter champs dans User model
- [ ] Créer migrations
- [ ] Tests unitaires rôles

### Phase 2: Permissions par Rôle
- [ ] Créer decorators @require_role(roles=[...])
- [ ] Créer decorators @require_permission(action, resource)
- [ ] Créer IsPartner permission class
- [ ] Créer IsEditor permission class
- [ ] Créer IsAdmin permission class
- [ ] Créer IsSuperAdmin permission class
- [ ] Tests permissions

### Phase 3: Middleware & Guards
- [ ] Middleware de vérification de rôle
- [ ] Middleware de vérification d'email
- [ ] Middleware de vérification de statut compte
- [ ] IP whitelist pour SUPER_ADMIN
- [ ] 2FA obligatoire pour SUPER_ADMIN

### Phase 4: Dashboards
- [ ] Dashboard USER
- [ ] Dashboard PARTNER (avec analytics)
- [ ] Dashboard EDITOR (avec stats contenu)
- [ ] Dashboard ADMIN (gestion complète)
- [ ] Dashboard SUPER_ADMIN (système)

### Phase 5: Workflows
- [ ] Workflow candidature PARTNER
- [ ] Workflow approbation POI
- [ ] Workflow candidature EDITOR
- [ ] Workflow modération contenu
- [ ] Emails de notification par rôle

### Phase 6: Documentation
- [ ] Documenter API endpoints par rôle
- [ ] Créer guide utilisateur par rôle
- [ ] Créer matrice de permissions
- [ ] Créer diagrammes de flux

---

## 🎓 Formation par Rôle

### Guide Onboarding USER
**Durée:** 5 minutes
1. Bienvenue + tour guidé
2. Créer premier itinéraire
3. Ajouter POI aux favoris
4. Réserver première activité

### Guide Onboarding PARTNER
**Durée:** 30 minutes
1. Configuration profil entreprise
2. Créer premier POI
3. Upload photos professionnelles
4. Activer réservations
5. Comprendre dashboard analytics
6. Gérer première réservation

### Formation EDITOR
**Durée:** 2 heures
1. Politique éditoriale
2. Outils d'écriture
3. SEO et optimisation
4. Modération
5. Collaboration équipe
6. Suivi performance

### Formation ADMIN
**Durée:** 2 semaines
1. Semaine 1: Dashboard et gestion users
2. Semaine 2: Modération et gestion partenaires
3. Période d'essai avec monitoring SUPER_ADMIN
4. Certification finale

---

**Document maintenu par:** Équipe Tasarini
**Dernière mise à jour:** 12 Novembre 2025
**Version:** 2.0
