#!/bin/bash

# 🧪 Script de test pour l'amélioration de l'inscription partenaires
# Usage: ./test-partner-registration.sh

echo "🚀 Test du nouveau système d'inscription partenaires"
echo "=================================================="
echo ""

# Vérifier que les services sont en cours d'exécution
echo "📋 1. Vérification des services Docker..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services Docker en cours d'exécution"
else
    echo "❌ Services Docker non démarrés"
    echo "💡 Lancement avec: docker-compose up -d"
    exit 1
fi

echo ""

# Vérifier les fichiers créés
echo "📋 2. Vérification des nouveaux fichiers..."

files=(
    "frontend/src/components/partner/PartnerRegistrationStepOne.tsx"
    "frontend/src/components/partner/CompletePartnerProfile.tsx"
    "frontend/src/pages/CompletePartnerProfilePage.tsx"
    "PARTNER_REGISTRATION_IMPROVEMENT.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (manquant)"
    fi
done

echo ""

# Vérifier les endpoints
echo "📋 3. Test des endpoints..."

# Test endpoint frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -q "200"; then
    echo "✅ Frontend accessible (http://localhost:5173)"
else
    echo "❌ Frontend inaccessible"
fi

# Test endpoint backend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/ | grep -q "200"; then
    echo "✅ Backend API accessible (http://localhost:8000)"
else
    echo "❌ Backend API inaccessible"
fi

echo ""

# URLs de test
echo "📋 4. URLs à tester manuellement:"
echo "🔗 Page d'inscription partenaire:"
echo "   http://localhost:5173/partner-application"
echo ""
echo "🔗 Page de complétion profil (après connexion):"
echo "   http://localhost:5173/complete-partner-profile"
echo ""
echo "🔗 Page de vérification email:"
echo "   http://localhost:5173/verify-email"

echo ""
echo "📋 5. Scénario de test recommandé:"
echo "1️⃣  Aller sur http://localhost:5173/partner-application"
echo "2️⃣  Remplir le formulaire simplifié (5 champs)"
echo "3️⃣  Vérifier l'email de confirmation reçu"
echo "4️⃣  Cliquer sur le lien de vérification"
echo "5️⃣  Compléter le profil en 4 étapes"
echo "6️⃣  Tester l'option 'Compléter plus tard'"

echo ""
echo "🎯 Tests de validation:"
echo "   ✅ Validation temps réel des champs"
echo "   ✅ Sauvegarde données temporaires"
echo "   ✅ Redirection intelligente après email"
echo "   ✅ Navigation fluide entre étapes"
echo "   ✅ Calcul pourcentage complétion"

echo ""
echo "📧 Pour tester l'email, vérifiez les logs Docker:"
echo "   docker-compose logs backend | grep -i email"
echo ""
echo "🏁 Fin du script de test"