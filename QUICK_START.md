# ⚡ Quick Start - Tasarini

Guide de démarrage rapide pour le projet Tasarini.

---

## 🚀 Premier Démarrage

### 1. Démarrer l'application
```bash
cd /Users/abdelazizdebbarh/Desktop/tasarini/tasarini-project
docker-compose up -d
```

### 2. Créer un superuser Django
```bash
docker-compose exec backend python manage.py createsuperuser
```

### 3. Accéder à l'application

- 🌐 **Frontend**: http://localhost:5173
- 🔌 **Backend API**: http://localhost:8000/api/v1/
- 👤 **Admin Django**: http://localhost:8000/admin

---

## 📋 Commandes Essentielles

### Voir les logs
```bash
docker-compose logs -f
```

### Arrêter l'application
```bash
docker-compose down
```

### Redémarrer
```bash
docker-compose restart
```

---

## 🗄️ Migrations Django (Les Plus Courantes)

### Créer des migrations après modification de models.py
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

---

## 🔧 Après Modification du Code

### Backend Python
```bash
# Django recharge automatiquement
# Mais si vous modifiez requirements.txt:
docker-compose build backend
docker-compose up -d backend
```

### Frontend React
```bash
# Vite HMR recharge automatiquement
# Mais si vous modifiez package.json:
docker-compose build frontend
docker-compose up -d frontend
```

---

## 🗃️ Base de Données

### Accéder à PostgreSQL
```bash
docker-compose exec db psql -U postgres -d tasarini
```

### Backup
```bash
docker-compose exec db pg_dump -U postgres tasarini > backup.sql
```

### Restore
```bash
docker-compose exec -T db psql -U postgres tasarini < backup.sql
```

---

## 🐛 Troubleshooting

### Problème au démarrage?
```bash
# Voir les logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild tout
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Reset complet de la DB? (⚠️ Perte de données)
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

---

## 📚 Documentation Complète

Voir [DOCKER_COMMANDS.md](./DOCKER_COMMANDS.md) pour toutes les commandes disponibles.

---

## 🎯 Workflow Quotidien

### Matin
```bash
docker-compose up -d
```

### Pendant le dev
- Les changements frontend sont **automatiques** (HMR)
- Les changements backend sont **automatiques** (Django runserver)
- Seules les dépendances nécessitent un rebuild

### Soir
```bash
docker-compose down
```

---

**Bon développement! 🚀**
