# Corrections des problèmes de profil

## Problèmes identifiés

1. ❌ **Upload d'avatar ne fonctionnait pas**
2. ❌ **Sauvegarde des modifications du profil échouait**

## Causes des problèmes

### 1. URL incorrecte pour la mise à jour du profil
**Problème** : Le code frontend utilisait `accounts/profile/` (singulier)
**Réalité** : L'endpoint backend est `accounts/profiles/me/` (pluriel + action me)

### 2. Endpoint utilisateur non configurable en PATCH
**Problème** : L'action `me` du `UserViewSet` n'acceptait que GET
**Besoin** : Mettre à jour la langue préférée avec PATCH

### 3. URL incorrecte pour la mise à jour utilisateur
**Problème** : Le code utilisait `accounts/me/`
**Réalité** : L'endpoint est `users/me/` (router DRF)

## Corrections appliquées

### Backend (`backend/apps/accounts/views.py`)

#### 1. Ajout du support PATCH à l'action `me` du UserViewSet (lignes 64-73)

**Avant** :
```python
@action(detail=False, methods=['get'])
def me(self, request):
    serializer = self.get_serializer(request.user)
    return Response(serializer.data)
```

**Après** :
```python
@action(detail=False, methods=['get', 'patch'])
def me(self, request):
    if request.method == 'GET':
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    elif request.method == 'PATCH':
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
```

**Impact** : Permet maintenant de faire `PATCH /api/v1/users/me/` pour modifier l'utilisateur

### Frontend (`frontend/src/pages/Profile.tsx`)

#### 1. Correction de l'URL de mise à jour du profil (ligne 216)

**Avant** :
```typescript
await apiClient.patch('accounts/profile/', {
  first_name: profileForm.first_name,
  last_name: profileForm.last_name,
  phone_number: profileForm.phone_number,
  bio: profileForm.bio,
});
```

**Après** :
```typescript
await apiClient.patch('accounts/profiles/me/', {
  first_name: profileForm.first_name,
  last_name: profileForm.last_name,
  phone_number: profileForm.phone_number,
  bio: profileForm.bio,
});
```

#### 2. Correction de l'URL de mise à jour de la langue (ligne 225)

**Avant** :
```typescript
await apiClient.patch('accounts/me/', {
  preferred_language: profileForm.preferred_language,
});
```

**Après** :
```typescript
await apiClient.patch('users/me/', {
  preferred_language: profileForm.preferred_language,
});
```

## Endpoints corrigés

| Fonctionnalité | Méthode | URL correcte | Données |
|----------------|---------|--------------|---------|
| **Upload avatar** | POST | `/api/v1/accounts/upload-avatar/` | FormData avec 'avatar' |
| **Récupérer stats** | GET | `/api/v1/accounts/stats/` | - |
| **Mise à jour profil** | PATCH | `/api/v1/accounts/profiles/me/` | first_name, last_name, phone_number, bio |
| **Mise à jour langue** | PATCH | `/api/v1/users/me/` | preferred_language |

## Architecture des URLs (résumé)

### Endpoints User
- `GET /api/v1/users/` - Liste des utilisateurs
- `GET /api/v1/users/me/` - Utilisateur actuel (GET)
- `PATCH /api/v1/users/me/` - Modifier utilisateur actuel (NOUVEAU)
- `POST /api/v1/users/{id}/reset_password/` - Réinitialiser mot de passe (admin)

### Endpoints Profile
- `GET /api/v1/accounts/profiles/` - Liste des profils
- `GET /api/v1/accounts/profiles/me/` - Profil actuel (GET)
- `PATCH /api/v1/accounts/profiles/me/` - Modifier profil actuel (PATCH)

### Endpoints Avatar & Stats
- `POST /api/v1/accounts/upload-avatar/` - Upload avatar
- `GET /api/v1/accounts/stats/` - Statistiques utilisateur

## Tests à effectuer

### Test 1 : Upload d'avatar ✅
1. Aller sur http://localhost:5173/profile
2. Cliquer sur l'icône caméra de l'avatar
3. Sélectionner une image (< 5MB)
4. Vérifier que l'avatar s'affiche
5. **Résultat attendu** : Avatar uploadé et affiché dans le header

### Test 2 : Modification des informations ✅
1. Cliquer sur "Modifier" dans la section profil
2. Modifier : prénom, nom, téléphone, bio, langue
3. Cliquer sur "Sauvegarder"
4. **Résultat attendu** : Message de succès + page rechargée avec nouvelles données

### Test 3 : Affichage des statistiques ✅
1. Vérifier le header de profil
2. **Résultat attendu** : 4 cartes affichant Stories, Favoris, Sauvegardés, Voyages

### Test 4 : Suppression d'avatar ✅
1. Cliquer sur "Supprimer" sous l'avatar
2. Confirmer la suppression
3. **Résultat attendu** : Avatar supprimé, affichage des initiales

## Vérification des logs

Pour monitorer les requêtes en temps réel :

```bash
docker-compose logs backend --tail=50 --follow
```

Requêtes attendues lors de la sauvegarde du profil :
```
[13/Nov/2025 08:XX:XX] "PATCH /api/v1/accounts/profiles/me/ HTTP/1.1" 200 XXX
[13/Nov/2025 08:XX:XX] "PATCH /api/v1/users/me/ HTTP/1.1" 200 XXX
```

## Statut

- ✅ Backend corrigé et redémarré
- ✅ Frontend corrigé
- ⏳ En attente de tests utilisateur

---

**Date de correction** : 13 novembre 2025, 08:45
**Fichiers modifiés** : 2
- `backend/apps/accounts/views.py`
- `frontend/src/pages/Profile.tsx`
