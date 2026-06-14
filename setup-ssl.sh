#!/bin/bash

# Script pour configurer SSL sur le VPS Tasarini
# Ce script doit être exécuté sur le VPS

set -e  # Arrêter en cas d'erreur

echo "=== Configuration SSL pour Tasarini ==="
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Erreur: docker-compose.prod.yml introuvable"
    echo "   Veuillez exécuter ce script depuis /root/tasarini ou /home/ubuntu/tasarini"
    exit 1
fi

# Étape 1: Sauvegarder la configuration SSL actuelle
echo "📝 Étape 1: Sauvegarde de la configuration SSL..."
if [ -f "nginx/conf.d/tasarini.conf" ]; then
    cp nginx/conf.d/tasarini.conf nginx/conf.d/tasarini.conf.ssl-backup
    echo "✅ Configuration SSL sauvegardée"
fi

# Étape 2: Activer la configuration HTTP-only
echo ""
echo "📝 Étape 2: Activation de la configuration HTTP temporaire..."
if [ -f "nginx/conf.d/tasarini.conf.http-only" ]; then
    cp nginx/conf.d/tasarini.conf.http-only nginx/conf.d/tasarini.conf
    echo "✅ Configuration HTTP activée"
else
    echo "❌ Erreur: tasarini.conf.http-only introuvable"
    exit 1
fi

# Étape 3: Redémarrer NGINX
echo ""
echo "📝 Étape 3: Redémarrage de NGINX..."
docker-compose -f docker-compose.prod.yml restart nginx
sleep 5

# Vérifier que NGINX fonctionne
if docker-compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    echo "✅ NGINX démarré avec succès"
else
    echo "❌ Erreur: NGINX n'a pas démarré correctement"
    echo "   Restauration de la configuration SSL..."
    cp nginx/conf.d/tasarini.conf.ssl-backup nginx/conf.d/tasarini.conf
    exit 1
fi

# Étape 4: Générer les certificats SSL
echo ""
echo "📝 Étape 4: Génération des certificats SSL avec Let's Encrypt..."
echo "   Domaine: tasarini.com"
echo "   Email: admin@tasarini.com"
echo ""

# Arrêter certbot s'il tourne déjà
docker-compose -f docker-compose.prod.yml stop certbot

# Générer les certificats
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@tasarini.com \
    --agree-tos \
    --no-eff-email \
    -d tasarini.com \
    -d www.tasarini.com

# Vérifier que les certificats ont été créés
if [ -d "certbot/conf/live/tasarini.com" ]; then
    echo ""
    echo "✅ Certificats SSL générés avec succès!"

    # Étape 5: Restaurer la configuration SSL
    echo ""
    echo "📝 Étape 5: Activation de la configuration SSL complète..."
    cp nginx/conf.d/tasarini.conf.ssl-backup nginx/conf.d/tasarini.conf

    # Redémarrer NGINX avec SSL
    echo ""
    echo "📝 Étape 6: Redémarrage de NGINX avec SSL..."
    docker-compose -f docker-compose.prod.yml restart nginx
    sleep 5

    # Redémarrer certbot pour le renouvellement automatique
    docker-compose -f docker-compose.prod.yml start certbot

    echo ""
    echo "✅ Configuration SSL terminée avec succès!"
    echo ""
    echo "🎉 Votre site est maintenant accessible en HTTPS:"
    echo "   https://tasarini.com"
    echo "   https://www.tasarini.com"
    echo ""
    echo "Les certificats seront automatiquement renouvelés tous les 12h."
else
    echo ""
    echo "❌ Erreur: Les certificats n'ont pas été générés"
    echo "   Veuillez vérifier les logs ci-dessus"
    echo "   La configuration HTTP reste active"
    exit 1
fi
