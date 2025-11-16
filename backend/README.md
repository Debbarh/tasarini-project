# Tasarini Django backend

Backend Django + DRF servant d'alternative à Supabase.

## Installation locale (hors Docker)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

Visitez `http://localhost:8000/api/docs` pour la documentation Swagger.

## Lancer via Docker Compose

```bash
cp backend/.env.example backend/.env
docker compose up --build backend
```

Cela démarre Postgres (`db`) et le backend (`backend`). Le serveur est exposé sur `http://localhost:8000`.

## Bootstrap d'un compte admin

1. Définir au moins `INITIAL_ADMIN_EMAIL` (et éventuellement `INITIAL_ADMIN_PASSWORD`) dans `backend/.env`.
2. Exécuter une fois :

```bash
# Depuis la racine du repo
./scripts/bootstrap-admin.sh
```

La commande crée l'admin uniquement s'il n'en existe pas, et affiche un mot de passe généré si aucun n'est fourni.

## Endpoints d'auth principaux

- `POST /api/token/` : obtention d'un JWT via email + mot de passe.
- `POST /api/token/refresh/` : régénère un access token.
- `POST /api/auth/register/` : inscription d'un utilisateur (`role=user|partner`).
- `GET /api/v1/users/me/` + `/accounts/profiles/me/` : récupèrent l'utilisateur connecté et son profil.
- `POST /api/v1/partners/profiles/<id>/moderate/` : approuver / rejeter / suspendre un partenaire.
- `POST /api/v1/partners/profiles/<id>/send_message/` : envoyer une notification interne.
- `POST /api/v1/partners/profiles/<id>/update_subscription/` : modifier l'abonnement.
- `GET /api/v1/partners/<public_id>/analytics/` : statistiques rapides.
- `POST /api/v1/partners/bulk-poi-status/` : mise à jour en masse de POI (admin).
- `POST /api/v1/analytics/travel/` : collecte/MAJ des analytics frontend (accessible sans auth).
- `GET/PATCH /api/v1/user/preferences/` : récupérer / mettre à jour les préférences et segments de l'utilisateur courant.
- `GET /api/v1/user/bookings/?days=90` : récupérer l'historique de réservations de l'utilisateur.
- `POST /api/v1/media/upload/` : uploader une image/vidéo utilisateur (multipart).
- `POST /api/v1/media/delete/` : supprimer un média précédemment uploadé (en fournissant son URL).
- `GET /api/v1/stories/trending/?days=7` : récupérer les stories tendances (publiques).
- `POST/GET /api/v1/stories/<id>/like/` : liker/déliker une story ou connaître le statut actuel.
- `POST/GET /api/v1/stories/<id>/bookmark/` : gérer l'enregistrement d'une story.

## Structure

- `apps/accounts` : CustomUser + rôles
- `apps/poi` : POI, tags, niveaux de budget/difficulté, médias
- `apps/partners` : partenaires, applications, notifications
- `apps/content` : stories, commentaires
- `apps/bookings` : chambres, plans tarifaires, réservations

Ces apps couvrent les domaines utilisés par le frontend React (`src/services/*`).

## Env vars principales

| Nom | Description |
| --- | --- |
| `SECRET_KEY` | clé Django |
| `DATABASE_URL` | URL Postgres (voir docker-compose) |
| `CORS_ALLOWED_ORIGINS` | URLs du frontend |
| `CSRF_TRUSTED_ORIGINS` | Utilisé pour les requêtes authentifiées |

## Tests 

```
python manage.py test
```
