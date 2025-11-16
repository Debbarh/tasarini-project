# Guide de Migration Backend

## Situation Actuelle

✅ Le backend Django a été copié dans `tasarini-project/`
✅ Le frontend React reste dans `tasarini/`
✅ Le docker-compose.yml est prêt

## Étapes pour Basculer

### 1. Arrêter l'ancien backend (si en cours)

```bash
cd /Users/abdelazizdebbarh/Desktop/tasarini/tasarini
docker-compose down
```

### 2. Démarrer le nouveau backend

```bash
cd /Users/abdelazizdebbarh/Desktop/tasarini/tasarini-project
docker-compose up -d
```

### 3. Vérifier que le backend fonctionne

```bash
# Vérifier les conteneurs
docker-compose ps

# Vérifier les logs
docker-compose logs -f backend

# Tester l'API
curl http://localhost:8000/api/
```

### 4. Vérifier la configuration du frontend

Le frontend doit pointer vers `http://localhost:8000/api`

Fichier: `tasarini/.env`
```
VITE_API_BASE_URL=http://localhost:8000/api
```

### 5. Démarrer le frontend

```bash
cd /Users/abdelazizdebbarh/Desktop/tasarini/tasarini
npm run dev
```

### 6. Tester l'application complète

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- Admin Django: http://localhost:8000/admin

## Avantages de la Nouvelle Structure

✅ **Séparation claire** frontend/backend
✅ **Déploiement indépendant** possible
✅ **Git history** propre pour chaque partie
✅ **CI/CD** plus simple
✅ **Scaling** facilité

## Structure Finale

```
tasarini/
├── tasarini/           # FRONTEND React (inchangé)
│   ├── src/
│   ├── package.json
│   └── .env           → VITE_API_BASE_URL=http://localhost:8000/api
│
└── tasarini-project/   # BACKEND Django (nouveau)
    ├── backend/
    │   ├── apps/
    │   ├── manage.py
    │   └── .env       → DATABASE_URL, CORS_ALLOWED_ORIGINS, etc.
    └── docker-compose.yml
```

## Nettoyage (Optionnel - Après Tests)

Une fois que tout fonctionne pendant quelques jours:

```bash
# Supprimer l'ancien backend et docker-compose
cd /Users/abdelazizdebbarh/Desktop/tasarini/tasarini
rm -rf backend/
rm docker-compose.yml
```

## Troubleshooting

### Le backend ne démarre pas

```bash
# Vérifier les logs
docker-compose logs backend

# Reconstruire l'image
docker-compose build --no-cache backend
docker-compose up -d
```

### Erreur de connexion à la DB

```bash
# Vérifier que PostgreSQL est bien démarré
docker-compose ps db

# Vérifier les logs DB
docker-compose logs db
```

### Erreur CORS depuis le frontend

Vérifier dans `backend/.env`:
```
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Le frontend ne se connecte pas au backend

1. Vérifier `.env` dans le frontend:
   ```
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

2. Redémarrer le dev server frontend:
   ```bash
   npm run dev
   ```

## Prochaines Étapes

1. ✅ Tester complètement l'application
2. ✅ Valider toutes les fonctionnalités
3. ⏳ Après validation: supprimer l'ancien backend
4. ⏳ Optionnel: Créer un git repository séparé pour le backend
5. ⏳ Optionnel: Configurer CI/CD séparé pour frontend et backend
