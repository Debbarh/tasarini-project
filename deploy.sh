#!/bin/bash

set -e

echo "🚀 Déploiement de Tasarini en production..."

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Variables
DEPLOY_DIR="/home/ubuntu/tasarini"
BACKUP_DIR="/home/ubuntu/backups"

# Vérifier si .env.production existe
if [ ! -f "$DEPLOY_DIR/backend/.env.production" ]; then
    echo -e "${RED}❌ Erreur: .env.production n'existe pas${NC}"
    echo "Créez le fichier avec vos secrets de production"
    exit 1
fi

# Pull latest code
echo -e "${YELLOW}📥 Récupération du code...${NC}"
cd $DEPLOY_DIR
git pull origin main

# Backup database
echo -e "${YELLOW}💾 Sauvegarde de la base de données...${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U tasarini_user tasarini_prod > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql" || echo "Pas de DB à sauvegarder (premier déploiement?)"

# Build and restart containers
echo -e "${YELLOW}🐳 Reconstruction des conteneurs...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}🔄 Redémarrage des services...${NC}"
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Attente du démarrage des services...${NC}"
sleep 15

# Run migrations
echo -e "${YELLOW}🗄️  Exécution des migrations...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate

# Collect static files
echo -e "${YELLOW}📦 Collection des fichiers statiques...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

# Health check
echo -e "${YELLOW}🏥 Vérification de santé...${NC}"
sleep 5
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Déploiement réussi !${NC}"
else
    echo -e "${RED}❌ Échec du health check${NC}"
    echo "Vérifiez les logs: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

echo -e "${GREEN}🎉 Tasarini est maintenant en production !${NC}"
