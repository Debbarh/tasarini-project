# Debug des Sessions - Instructions de Test

## Problème
Les sessions ne s'affichent pas dans le frontend malgré leur présence en base de données.

## Ce qui a été vérifié ✅

### Backend
1. ✅ **Endpoint fonctionne** : Test curl réussi avec JWT
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/accounts/sessions/
# Retourne bien les 3 sessions
```

2. ✅ **3 sessions existent en DB** :
   - Desktop | Chrome 120 | 127.0.0.1 | Paris
   - Mobile | Safari 17 | 192.168.1.42 | Lyon
   - Tablet | Firefox 121 | 192.168.1.89 | Marseille

3. ✅ **Authentication configurée** : JWT avec `rest_framework_simplejwt`

### Frontend
1. ✅ **Component existe** : `ActiveSessions.tsx` créé
2. ✅ **apiClient configuré** : Utilise Bearer tokens
3. ❓ **Appel API réussit ?** : À vérifier avec les logs

## Tests à effectuer

### Test 1 : Vérifier les logs dans la console du navigateur

1. Ouvrir http://localhost:5173/profile
2. Se connecter avec : `a.debbarh@tasarini.com` / `testpass123`
3. Aller sur l'onglet **"Sécurité"**
4. Ouvrir la console du navigateur (F12)
5. Chercher les logs `[ActiveSessions]` :

**Logs attendus si tout fonctionne** :
```
[ActiveSessions] Fetching sessions from: accounts/sessions/
[ActiveSessions] Access token: Present
[ActiveSessions] Received sessions data: [{...}, {...}, {...}]
[ActiveSessions] Number of sessions: 3
```

**Logs si problème d'authentification** :
```
[ActiveSessions] Access token: Missing
[ActiveSessions] Error fetching sessions: ApiError
```

**Logs si problème de requête** :
```
[ActiveSessions] Error fetching sessions: TypeError: Failed to fetch
```

### Test 2 : Vérifier le token JWT

Dans la console du navigateur :
```javascript
// Vérifier si un token existe
localStorage.getItem('tasarini_access_token')

// Devrait afficher quelque chose comme :
// "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
```

### Test 3 : Vérifier la requête réseau

1. Onglet Network (Réseau) dans les DevTools
2. Filtrer par "sessions"
3. Recharger l'onglet Sécurité
4. Vérifier si une requête GET vers `http://localhost:8000/api/v1/accounts/sessions/` apparaît

**Si la requête apparaît** :
- Status 200 → Backend OK, vérifier la réponse
- Status 401 → Problème d'authentification
- Status 404 → URL incorrecte
- Pas de requête → Le composant n'appelle pas l'API

### Test 4 : Test manuel de l'API depuis la console

Dans la console du navigateur :
```javascript
// Test direct de l'API
const token = localStorage.getItem('tasarini_access_token');
fetch('http://localhost:8000/api/v1/accounts/sessions/', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Sessions:', data))
.catch(err => console.error('Error:', err));
```

## Scénarios possibles

### Scénario A : Pas de token
**Symptôme** : `Access token: Missing`
**Cause** : L'utilisateur n'est pas authentifié ou le token a expiré
**Solution** : Se reconnecter

### Scénario B : Token invalide
**Symptôme** : Status 401 Unauthorized
**Cause** : Token expiré ou invalide
**Solution** : Vérifier la durée de vie du token JWT ou se reconnecter

### Scénario C : CORS bloqué
**Symptôme** : `TypeError: Failed to fetch` + erreur CORS dans la console
**Cause** : Configuration CORS incorrecte
**Solution** : Vérifier `CORS_ALLOWED_ORIGINS` dans settings.py

### Scénario D : URL incorrecte
**Symptôme** : Status 404 Not Found
**Cause** : L'endpoint n'existe pas ou URL mal formée
**Solution** : Vérifier que l'URL est bien `accounts/sessions/` (sans `/` au début)

### Scénario E : Réponse vide du backend
**Symptôme** : `Number of sessions: 0` mais pas d'erreur
**Cause** : Le backend retourne `[]`
**Solution** : Vérifier que les sessions appartiennent bien à l'utilisateur connecté

## Informations de debug ajoutées

### Fichier modifié
`frontend/src/components/profile/ActiveSessions.tsx` (lignes 35-46)

### Logs ajoutés
- Confirmation du début du fetch
- Présence/absence du token
- Données reçues du backend
- Nombre de sessions
- Détails des erreurs

## Prochaines étapes après le test

Une fois les logs analysés, on pourra :
1. Identifier la cause exacte du problème
2. Corriger l'erreur spécifique
3. Retirer les logs de debug
4. Continuer avec la Phase 5 (RGPD UI)

---

**Note** : Le mot de passe de test a été temporairement changé pour faciliter les tests curl.

**Utilisateur de test** :
- Email : `a.debbarh@tasarini.com`
- Password : `testpass123`
