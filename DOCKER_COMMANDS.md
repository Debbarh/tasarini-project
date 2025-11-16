# 🐳 Commandes Docker - Guide Complet

Guide des commandes Docker les plus utilisées pour gérer votre projet Tasarini.

---

## 🚀 Démarrage & Arrêt

### Démarrer toute l'application
```bash
docker-compose up -d
```
- `-d` : Mode détaché (background)
- Démarre les 3 services : db, backend, frontend

### Démarrer avec logs visibles
```bash
docker-compose up
```
- Affiche les logs en temps réel
- `Ctrl+C` pour arrêter

### Démarrer un service spécifique
```bash
docker-compose up -d backend
docker-compose up -d frontend
docker-compose up -d db
```

### Arrêter l'application
```bash
docker-compose down
```
- Arrête et supprime les conteneurs
- **Conserve** les volumes (données DB)

### Arrêter ET supprimer les volumes (⚠️ DANGER)
```bash
docker-compose down -v
```
- ⚠️ **SUPPRIME TOUTES LES DONNÉES DE LA DB**
- À utiliser uniquement pour reset complet

---

## 🔄 Redémarrage

### Redémarrer tous les services
```bash
docker-compose restart
```

### Redémarrer un service spécifique
```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart db
```

---

## 📊 État & Monitoring

### Voir les conteneurs actifs
```bash
docker-compose ps
```

### Voir les logs en temps réel
```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend

# Dernières 50 lignes
docker-compose logs --tail=50 backend
```

### Voir l'utilisation des ressources
```bash
docker stats
```

---

## 🗄️ Migrations Django

### Créer de nouvelles migrations
```bash
docker-compose exec backend python manage.py makemigrations
```

### Appliquer les migrations
```bash
docker-compose exec backend python manage.py migrate
```

### Voir l'état des migrations
```bash
docker-compose exec backend python manage.py showmigrations
```

### Créer migration pour une app spécifique
```bash
docker-compose exec backend python manage.py makemigrations poi
docker-compose exec backend python manage.py makemigrations partners
docker-compose exec backend python manage.py makemigrations accounts
```

### Créer migration vide (pour data migration)
```bash
docker-compose exec backend python manage.py makemigrations --empty poi --name populate_initial_data
```

### Rollback d'une migration
```bash
# Revenir à la migration précédente
docker-compose exec backend python manage.py migrate poi 0001

# Annuler toutes les migrations d'une app
docker-compose exec backend python manage.py migrate poi zero
```

---

## 👤 Administration Django

### Créer un superuser
```bash
docker-compose exec backend python manage.py createsuperuser
```

### Créer un superuser en mode non-interactif
```bash
docker-compose exec backend python manage.py createsuperuser \
  --username admin \
  --email admin@example.com \
  --noinput
```

### Changer le mot de passe d'un user
```bash
docker-compose exec backend python manage.py changepassword admin
```

---

## 🐚 Shell & Debug

### Ouvrir le shell Django
```bash
docker-compose exec backend python manage.py shell
```

### Ouvrir le shell Python du conteneur
```bash
docker-compose exec backend python
```

### Ouvrir un terminal bash dans le conteneur
```bash
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Exécuter une commande Django custom
```bash
docker-compose exec backend python manage.py <votre_commande>
```

---

## 🗃️ Base de Données

### Accéder à PostgreSQL
```bash
docker-compose exec db psql -U postgres -d tasarini
```

### Commandes PostgreSQL utiles
```sql
-- Lister les tables
\dt

-- Décrire une table
\d poi_touristpoint

-- Lister les bases de données
\l

-- Quitter
\q
```

### Backup de la base de données
```bash
docker-compose exec db pg_dump -U postgres tasarini > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore de la base de données
```bash
docker-compose exec -T db psql -U postgres tasarini < backup.sql
```

### Reset complet de la DB
```bash
# 1. Arrêter et supprimer les volumes
docker-compose down -v

# 2. Redémarrer (DB vide)
docker-compose up -d

# 3. Appliquer les migrations
docker-compose exec backend python manage.py migrate

# 4. Créer un superuser
docker-compose exec backend python manage.py createsuperuser
```

---

## 🔨 Build & Rebuild

### Rebuild tous les conteneurs
```bash
docker-compose build
```

### Rebuild sans cache (clean build)
```bash
docker-compose build --no-cache
```

### Rebuild un service spécifique
```bash
docker-compose build backend
docker-compose build frontend
```

### Rebuild et redémarrer
```bash
docker-compose up -d --build
```

---

## 📦 Gestion des Dépendances

### Installer une nouvelle dépendance Python
```bash
# 1. Ajouter dans backend/requirements.txt
echo "nouvelle-librairie==1.0.0" >> backend/requirements.txt

# 2. Rebuild le backend
docker-compose build backend

# 3. Redémarrer
docker-compose up -d backend
```

### Installer une nouvelle dépendance npm
```bash
# 1. Entrer dans le conteneur
docker-compose exec frontend sh

# 2. Installer
npm install nouvelle-librairie

# 3. Sortir et rebuild
exit
docker-compose build frontend
docker-compose up -d frontend
```

---

## 🧹 Nettoyage

### Arrêter et supprimer les conteneurs
```bash
docker-compose down
```

### Supprimer les images non utilisées
```bash
docker image prune -a
```

### Nettoyer tout Docker (⚠️ global)
```bash
# Supprimer conteneurs arrêtés
docker container prune

# Supprimer images non utilisées
docker image prune -a

# Supprimer volumes non utilisés
docker volume prune

# Tout nettoyer en une commande
docker system prune -a --volumes
```

### Supprimer uniquement ce projet
```bash
docker-compose down -v --rmi all
```

---

## 🔍 Debug & Troubleshooting

### Voir les logs d'erreur
```bash
# Backend
docker-compose logs backend | grep -i error

# Frontend
docker-compose logs frontend | grep -i error
```

### Vérifier la configuration
```bash
docker-compose config
```

### Inspecter un conteneur
```bash
docker inspect tasarini-project-backend-1
```

### Voir les processus dans un conteneur
```bash
docker-compose exec backend ps aux
```

### Tester la connexion DB depuis backend
```bash
docker-compose exec backend python manage.py dbshell
```

---

## 📝 Collectstatic (Production)

### Collecter les fichiers statiques Django
```bash
docker-compose exec backend python manage.py collectstatic --noinput
```

---

## 🧪 Tests

### Lancer les tests Django
```bash
# Tous les tests
docker-compose exec backend python manage.py test

# Tests d'une app spécifique
docker-compose exec backend python manage.py test poi

# Tests avec verbose
docker-compose exec backend python manage.py test --verbosity=2

# Tests avec coverage
docker-compose exec backend coverage run --source='.' manage.py test
docker-compose exec backend coverage report
```

---

## 🔐 Variables d'Environnement

### Modifier les variables d'env
```bash
# 1. Éditer le fichier
nano backend/.env

# 2. Redémarrer pour appliquer
docker-compose restart backend
```

### Voir les variables d'env d'un conteneur
```bash
docker-compose exec backend env
```

---

## 📊 Monitoring Avancé

### Suivre les logs de plusieurs services
```bash
docker-compose logs -f backend frontend
```

### Logs depuis un moment précis
```bash
docker-compose logs --since 30m backend
docker-compose logs --since 2h frontend
```

### Exporter les logs
```bash
docker-compose logs backend > backend_logs.txt
```

---

## 🚀 Workflow de Développement Quotidien

### Matinée - Démarrer le projet
```bash
cd /Users/abdelazizdebbarh/Desktop/tasarini/tasarini-project
docker-compose up -d
docker-compose logs -f
```

### Après modifications backend
```bash
# Si models.py modifié
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Si requirements.txt modifié
docker-compose build backend
docker-compose up -d backend
```

### Après modifications frontend
```bash
# HMR se charge automatiquement!
# Si package.json modifié:
docker-compose build frontend
docker-compose up -d frontend
```

### Fin de journée - Arrêter
```bash
docker-compose down
```

---

## ⚠️ Commandes d'Urgence

### Le backend ne démarre pas
```bash
# 1. Voir les logs
docker-compose logs backend

# 2. Rebuild complet
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### La DB est corrompue
```bash
# Reset complet (⚠️ perte de données)
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

### Port déjà utilisé
```bash
# Trouver le process
lsof -i :8000
lsof -i :5173

# Tuer le process
kill -9 <PID>
```

### Conteneur en erreur constant
```bash
# Supprimer et recréer
docker-compose rm -f backend
docker-compose up -d backend
```

---

## 📚 Ressources

- Documentation Docker: https://docs.docker.com
- Documentation Django: https://docs.djangoproject.com
- Documentation Vite: https://vitejs.dev

---

## 💡 Tips & Best Practices

1. **Toujours utiliser `-d`** pour le mode détaché en développement
2. **Faire des backups réguliers** de la DB avant migrations importantes
3. **Rebuild après changement de dépendances** (requirements.txt, package.json)
4. **Vérifier les logs** en cas d'erreur: `docker-compose logs -f`
5. **Ne jamais commit** les fichiers `.env` avec des secrets
6. **Utiliser `--no-cache`** si le build semble utiliser d'anciennes versions

---

**Dernière mise à jour:** 12 Novembre 2025
