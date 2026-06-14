# Tasarini — Frontend

Application web de Tasarini : inspiration, planification et recommandations de voyage personnalisées par IA.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- react-i18next (11 langues)
- React Router, TanStack Query

## Démarrage en local

Prérequis : Node.js (LTS) et npm.

```sh
npm install
npm run dev      # serveur de dev (http://localhost:5173)
npm run build    # build de production (dossier dist/)
npm run preview  # prévisualiser le build
```

## Configuration

Le frontend consomme l'API backend Django. L'URL d'API se configure via les variables
d'environnement Vite (`VITE_*`). Voir le fichier `.env` / la configuration de déploiement.

## Déploiement

Le frontend est conteneurisé (voir `docker-compose.prod.yml` à la racine du projet) et
servi derrière nginx. Le build est intégré à l'image Docker.
