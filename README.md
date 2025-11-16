# Tasarini - Application Complète Dockerisée

Application de voyage complète avec backend Django REST API et frontend React + Vite.

## Structure

```
tasarini-project/
├── backend/              # Application Django REST API
│   ├── apps/            # Apps Django
│   ├── tasarini_backend/ # Configuration Django
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/             # Application React + Vite
│   ├── src/             # Code source React
│   ├── public/          # Assets statiques
│   ├── package.json
│   ├── Dockerfile       # Build production (Nginx)
│   ├── Dockerfile.dev   # Dev avec HMR
│   └── nginx.conf
└── docker-compose.yml    # Orchestration Docker
```

## Démarrage Rapide (Tout en Docker)

### Lancer toute l'application

```bash
# Dans tasarini-project/
docker-compose up -d
```

**Services disponibles:**
- 🌐 Frontend: `http://localhost:5173`
- 🔌 Backend API: `http://localhost:8000`
- 🐘 PostgreSQL: `localhost:5432`

### Arrêter l'application

```bash
docker-compose down
```

## Configuration

### Backend (.env)
```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://postgres:postgres@db:5432/tasarini
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000/api
```

## Commandes Utiles

### Backend

```bash
# Arrêter les conteneurs
docker-compose down

# Voir les logs
docker-compose logs -f backend

# Accéder au shell Django
docker-compose exec backend python manage.py shell

# Créer un superuser
docker-compose exec backend python manage.py createsuperuser

# Migrations
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### Base de données

```bash
# Accéder à PostgreSQL
docker-compose exec db psql -U postgres -d tasarini

# Backup
docker-compose exec db pg_dump -U postgres tasarini > backup.sql

# Restore
docker-compose exec -T db psql -U postgres tasarini < backup.sql
```

## API Documentation

L'API est accessible sur: `http://localhost:8000/api/`

Documentation disponible (si Django REST Swagger installé):
- Swagger UI: `http://localhost:8000/swagger/`
- ReDoc: `http://localhost:8000/redoc/`

## Développement

### Architecture

- **Django REST Framework** pour l'API
- **PostgreSQL** comme base de données
- **Docker** pour la conteneurisation
- **JWT** pour l'authentification

### Apps Principales

- `apps/poi/` - Points d'intérêt touristiques
- `apps/partners/` - Gestion partenaires
- `apps/analytics/` - Analytics et métriques
- `apps/bookings/` - Réservations
- `apps/content/` - Contenu (publicités, etc.)
- `apps/locations/` - Pays, villes, géolocalisation

## Migration depuis Supabase

Ce backend remplace complètement Supabase. Migration complétée à 93%.

Voir documentation détaillée dans `../tasarini/docs/archive/`
