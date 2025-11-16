# Plan d'implémentation RGPD - Tasarini
## Conformité RGPD avec support multilingue (FR/EN prioritaires)

---

## 📋 SYNTHÈSE EXÉCUTIVE

**Objectif:** Mettre en conformité le processus d'inscription avec le RGPD
**Langues:** FR (principal), EN (secondaire), extensible aux autres langues supportées
**Durée estimée:** 2 semaines (Phase 1 critique)
**Priorité:** HAUTE - Risque juridique sans conformité

---

## 🎯 PHASE 1 - CONFORMITÉ MINIMALE (Semaine 1)
**Objectif:** Respect des obligations RGPD essentielles

### Jour 1-2: Backend - Modèle et validation

#### 1.1 Ajouter les champs RGPD au modèle User

**Fichier:** `backend/apps/accounts/models.py`

```python
# Ajouter après les champs existants de la classe User

# === RGPD Compliance Fields ===
# Article 6 & 7: Consentement
terms_accepted = models.BooleanField(
    default=False,
    verbose_name="CGU acceptées",
    help_text="Acceptation des Conditions Générales d'Utilisation"
)
terms_accepted_at = models.DateTimeField(
    null=True, blank=True,
    verbose_name="Date d'acceptation des CGU"
)

privacy_policy_accepted = models.BooleanField(
    default=False,
    verbose_name="Politique de confidentialité acceptée"
)
privacy_policy_accepted_at = models.DateTimeField(
    null=True, blank=True,
    verbose_name="Date d'acceptation de la politique"
)
privacy_policy_version = models.CharField(
    max_length=10, blank=True,
    default="1.0",
    verbose_name="Version de la politique acceptée"
)

# Article 8: Age verification
date_of_birth = models.DateField(
    null=True, blank=True,
    verbose_name="Date de naissance",
    help_text="Vérification de l'âge minimum (13 ans RGPD)"
)
is_age_verified = models.BooleanField(
    default=False,
    verbose_name="Âge vérifié"
)

# Article 7: Marketing consent (OPT-IN)
marketing_consent = models.BooleanField(
    default=False,
    verbose_name="Consentement marketing",
    help_text="Accepte de recevoir des communications marketing"
)
marketing_consent_at = models.DateTimeField(
    null=True, blank=True,
    verbose_name="Date du consentement marketing"
)

# Article 17: Data deletion
account_deletion_requested = models.BooleanField(
    default=False,
    verbose_name="Suppression demandée"
)
account_deletion_requested_at = models.DateTimeField(
    null=True, blank=True,
    verbose_name="Date de la demande de suppression"
)
scheduled_deletion_date = models.DateTimeField(
    null=True, blank=True,
    verbose_name="Date de suppression programmée"
)
```

**Migration:**
```bash
docker-compose exec backend python manage.py makemigrations accounts
docker-compose exec backend python manage.py migrate accounts
```

---

#### 1.2 Créer le validateur de mot de passe fort

**Fichier:** `backend/apps/accounts/validators.py` (nouveau)

```python
"""
Validateurs custom pour la conformité RGPD et sécurité.
Conforme aux recommandations ANSSI.
"""
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import re


class StrongPasswordValidator:
    """
    Validateur de mot de passe fort conforme ANSSI (12 caractères minimum).
    Articles RGPD: 32 (Sécurité du traitement)
    """

    def __init__(self, min_length=12):
        self.min_length = min_length

    def validate(self, password, user=None):
        """Valide la force du mot de passe."""
        errors = []

        if len(password) < self.min_length:
            errors.append(
                ValidationError(
                    _('Le mot de passe doit contenir au moins %(min_length)d caractères.'),
                    code='password_too_short',
                    params={'min_length': self.min_length},
                )
            )

        if not re.search(r'[A-Z]', password):
            errors.append(
                ValidationError(
                    _('Le mot de passe doit contenir au moins une lettre majuscule.'),
                    code='password_no_upper',
                )
            )

        if not re.search(r'[a-z]', password):
            errors.append(
                ValidationError(
                    _('Le mot de passe doit contenir au moins une lettre minuscule.'),
                    code='password_no_lower',
                )
            )

        if not re.search(r'\d', password):
            errors.append(
                ValidationError(
                    _('Le mot de passe doit contenir au moins un chiffre.'),
                    code='password_no_digit',
                )
            )

        if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/]', password):
            errors.append(
                ValidationError(
                    _('Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...).'),
                    code='password_no_special',
                )
            )

        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            "Votre mot de passe doit contenir au moins %(min_length)d caractères, "
            "incluant des majuscules, minuscules, chiffres et caractères spéciaux."
        ) % {'min_length': self.min_length}
```

**Configuration:**
**Fichier:** `backend/tasarini_backend/settings.py`

```python
# Modifier AUTH_PASSWORD_VALIDATORS
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,  # ANSSI recommandation
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'apps.accounts.validators.StrongPasswordValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
]
```

---

### Jour 3-4: Backend - Serializer et validation

#### 1.3 Mettre à jour RegisterSerializer

**Fichier:** `backend/apps/accounts/serializers.py`

```python
# Modifier la classe RegisterSerializer

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=12)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    role = serializers.ChoiceField(
        choices=[('user', 'User'), ('partner', 'Partner')],
        default='user'
    )

    # === RGPD Required Fields ===
    date_of_birth = serializers.DateField(
        help_text="Date de naissance (âge minimum 13 ans)"
    )
    terms_accepted = serializers.BooleanField()
    privacy_policy_accepted = serializers.BooleanField()
    privacy_policy_version = serializers.CharField(
        max_length=10,
        default="1.0"
    )
    marketing_consent = serializers.BooleanField(
        default=False,
        required=False
    )

    def validate_email(self, value: str):
        normalized = value.lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError(
                _('Cet email est déjà utilisé.')
            )
        return normalized

    def validate_date_of_birth(self, value):
        """
        Validation âge minimum 13 ans (RGPD Article 8).
        Pour les 13-16 ans, consentement parental requis selon pays.
        """
        from datetime import date

        today = date.today()
        age = today.year - value.year - (
            (today.month, today.day) < (value.month, value.day)
        )

        if age < 13:
            raise serializers.ValidationError(
                _("Vous devez avoir au moins 13 ans pour créer un compte.")
            )

        if age < 16:
            # Pour les 13-16 ans, ajouter un warning
            # (à adapter selon la juridiction cible)
            pass  # TODO: Implémenter consentement parental si nécessaire

        return value

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError(
                _("Vous devez accepter les Conditions Générales d'Utilisation.")
            )
        return value

    def validate_privacy_policy_accepted(self, value):
        if not value:
            raise serializers.ValidationError(
                _("Vous devez accepter la Politique de Confidentialité.")
            )
        return value

    def create(self, validated_data):
        from django.utils import timezone

        role_input = validated_data.pop('role', 'user')
        role = UserRole.PARTNER if role_input == 'partner' else UserRole.USER
        password = validated_data.pop('password')
        email = validated_data.get('email')

        # RGPD fields
        date_of_birth = validated_data.pop('date_of_birth')
        terms_accepted = validated_data.pop('terms_accepted')
        privacy_policy_accepted = validated_data.pop('privacy_policy_accepted')
        privacy_policy_version = validated_data.pop('privacy_policy_version')
        marketing_consent = validated_data.pop('marketing_consent', False)

        user = User.objects.create_user(
            username=email,
            role=role,
            password=password,
            is_active=False,  # Compte désactivé jusqu'à vérification email
            date_of_birth=date_of_birth,
            terms_accepted=terms_accepted,
            terms_accepted_at=timezone.now() if terms_accepted else None,
            privacy_policy_accepted=privacy_policy_accepted,
            privacy_policy_accepted_at=timezone.now() if privacy_policy_accepted else None,
            privacy_policy_version=privacy_policy_version,
            marketing_consent=marketing_consent,
            marketing_consent_at=timezone.now() if marketing_consent else None,
            is_age_verified=True,  # Vérifié par validation du serializer
            **validated_data,
        )

        if not user.display_name:
            user.display_name = f"{user.first_name} {user.last_name}".strip() or user.username
        user.save()

        UserRoleAssignment.objects.get_or_create(user=user, role=role)
        return user
```

---

### Jour 5: Frontend - Traductions i18n

#### 1.4 Ajouter les traductions RGPD

**Fichier:** `frontend/src/i18n/locales/fr/auth.json`

```json
{
  "gdpr": {
    "dateOfBirth": "Date de naissance",
    "dateOfBirthPlaceholder": "JJ/MM/AAAA",
    "dateOfBirthHelp": "Vous devez avoir au moins 13 ans pour créer un compte.",
    "ageVerificationFailed": "Vous devez avoir au moins 13 ans pour vous inscrire.",

    "termsAccepted": "J'accepte les Conditions Générales d'Utilisation",
    "privacyAccepted": "J'accepte la Politique de Confidentialité et comprends comment mes données seront traitées",
    "marketingConsent": "Je souhaite recevoir des offres promotionnelles et actualités par email (optionnel)",

    "termsLink": "Conditions Générales d'Utilisation",
    "privacyLink": "Politique de Confidentialité",

    "gdprNotice": "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Vous pouvez retirer votre consentement à tout moment depuis votre profil.",

    "required": "obligatoire",
    "optional": "optionnel",

    "passwordRequirements": {
      "title": "Exigences du mot de passe :",
      "minLength": "Au moins 12 caractères",
      "uppercase": "Au moins une lettre majuscule",
      "lowercase": "Au moins une lettre minuscule",
      "number": "Au moins un chiffre",
      "special": "Au moins un caractère spécial",
      "strength": {
        "veryWeak": "Très faible",
        "weak": "Faible",
        "medium": "Moyen",
        "strong": "Fort",
        "veryStrong": "Très fort"
      }
    }
  }
}
```

**Fichier:** `frontend/src/i18n/locales/en/auth.json`

```json
{
  "gdpr": {
    "dateOfBirth": "Date of birth",
    "dateOfBirthPlaceholder": "DD/MM/YYYY",
    "dateOfBirthHelp": "You must be at least 13 years old to create an account.",
    "ageVerificationFailed": "You must be at least 13 years old to register.",

    "termsAccepted": "I accept the Terms and Conditions",
    "privacyAccepted": "I accept the Privacy Policy and understand how my data will be processed",
    "marketingConsent": "I would like to receive promotional offers and news by email (optional)",

    "termsLink": "Terms and Conditions",
    "privacyLink": "Privacy Policy",

    "gdprNotice": "In accordance with GDPR, you have the right to access, rectify, delete and port your data. You can withdraw your consent at any time from your profile.",

    "required": "required",
    "optional": "optional",

    "passwordRequirements": {
      "title": "Password requirements:",
      "minLength": "At least 12 characters",
      "uppercase": "At least one uppercase letter",
      "lowercase": "At least one lowercase letter",
      "number": "At least one number",
      "special": "At least one special character",
      "strength": {
        "veryWeak": "Very Weak",
        "weak": "Weak",
        "medium": "Medium",
        "strong": "Strong",
        "veryStrong": "Very Strong"
      }
    }
  }
}
```

---

### Jour 6-7: Frontend - Formulaire d'inscription

#### 1.5 Mettre à jour le formulaire d'inscription

**Fichier:** `frontend/src/pages/Auth.tsx`

Ajouter ces états et la logique du formulaire:

```tsx
// Nouveaux états RGPD
const [dateOfBirth, setDateOfBirth] = useState("");
const [termsAccepted, setTermsAccepted] = useState(false);
const [privacyAccepted, setPrivacyAccepted] = useState(false);
const [marketingConsent, setMarketingConsent] = useState(false);
const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState("");
```

Ajouter au formulaire d'inscription (après les champs existants):

```tsx
{/* Date de naissance - RGPD Article 8 */}
<div className="space-y-2">
  <Label htmlFor="signup-dob">
    {t('auth.gdpr.dateOfBirth')} <span className="text-red-500">*</span>
  </Label>
  <Input
    id="signup-dob"
    type="date"
    value={dateOfBirth}
    onChange={(e) => setDateOfBirth(e.target.value)}
    max={new Date(new Date().setFullYear(new Date().getFullYear() - 13))
      .toISOString().split('T')[0]}
    required
  />
  <p className="text-xs text-muted-foreground">
    {t('auth.gdpr.dateOfBirthHelp')}
  </p>
</div>

{/* Confirmation mot de passe */}
<div className="space-y-2">
  <Label htmlFor="signup-password-confirm">
    {t('auth.confirmPassword')} <span className="text-red-500">*</span>
  </Label>
  <div className="relative">
    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    <Input
      id="signup-password-confirm"
      type="password"
      placeholder={t('auth.confirmPasswordPlaceholder')}
      value={signUpPasswordConfirm}
      onChange={(e) => setSignUpPasswordConfirm(e.target.value)}
      className={`pl-10 ${
        signUpPassword && signUpPasswordConfirm &&
        signUpPassword !== signUpPasswordConfirm
          ? 'border-red-500'
          : ''
      }`}
      required
    />
  </div>
  {signUpPassword && signUpPasswordConfirm &&
   signUpPassword !== signUpPasswordConfirm && (
    <p className="text-xs text-red-500">
      {t('auth.passwordsDontMatch')}
    </p>
  )}
</div>

{/* Consentements RGPD */}
<div className="space-y-3 border-t pt-4 mt-4">
  <p className="text-sm font-medium">{t('auth.gdpr.consents')}</p>

  {/* CGU */}
  <div className="flex items-start space-x-2">
    <Checkbox
      id="terms"
      checked={termsAccepted}
      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
      required
    />
    <label htmlFor="terms" className="text-sm leading-tight cursor-pointer flex-1">
      {t('auth.gdpr.termsAccepted')}{' '}
      <a
        href="/legal/terms"
        target="_blank"
        className="text-primary underline hover:text-primary/80"
      >
        {t('auth.gdpr.termsLink')}
      </a>{' '}
      <span className="text-red-500">*</span>
    </label>
  </div>

  {/* Politique de confidentialité */}
  <div className="flex items-start space-x-2">
    <Checkbox
      id="privacy"
      checked={privacyAccepted}
      onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
      required
    />
    <label htmlFor="privacy" className="text-sm leading-tight cursor-pointer flex-1">
      {t('auth.gdpr.privacyAccepted')}{' '}
      <a
        href="/legal/privacy"
        target="_blank"
        className="text-primary underline hover:text-primary/80"
      >
        {t('auth.gdpr.privacyLink')}
      </a>{' '}
      <span className="text-red-500">*</span>
    </label>
  </div>

  {/* Marketing (opt-in) */}
  <div className="flex items-start space-x-2">
    <Checkbox
      id="marketing"
      checked={marketingConsent}
      onCheckedChange={(checked) => setMarketingConsent(checked === true)}
    />
    <label htmlFor="marketing" className="text-sm leading-tight cursor-pointer flex-1">
      {t('auth.gdpr.marketingConsent')}
    </label>
  </div>

  {/* Notice RGPD */}
  <Alert className="mt-4">
    <Info className="h-4 w-4" />
    <AlertDescription className="text-xs">
      {t('auth.gdpr.gdprNotice')}
    </AlertDescription>
  </Alert>
</div>
```

Mettre à jour la fonction `handleSignUp`:

```tsx
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validation frontend
  if (signUpPassword !== signUpPasswordConfirm) {
    toast.error(t('auth.passwordsDontMatch'));
    return;
  }

  if (!termsAccepted || !privacyAccepted) {
    toast.error(t('auth.gdpr.mustAcceptTerms'));
    return;
  }

  setIsLoading(true);

  try {
    await signUp(
      signUpEmail,
      signUpPassword,
      signUpFirstName,
      signUpLastName,
      'user',  // role
      dateOfBirth,
      termsAccepted,
      privacyAccepted,
      '1.0',  // privacy_policy_version
      marketingConsent
    );
  } finally {
    setIsLoading(false);
  }
};
```

---

## 📄 DOCUMENTS LÉGAUX (À créer)

### CGU (Conditions Générales d'Utilisation)
**Fichier:** `frontend/src/pages/legal/Terms.tsx`

Sections minimales requises:
1. Objet et champ d'application
2. Définitions
3. Acceptation des CGU
4. Services proposés
5. Inscription et compte utilisateur
6. Propriété intellectuelle
7. Responsabilités
8. Données personnelles (lien vers Politique de Confidentialité)
9. Résiliation
10. Droit applicable et juridiction compétente

### Politique de Confidentialité
**Fichier:** `frontend/src/pages/legal/Privacy.tsx`

Sections obligatoires RGPD:
1. Identité du responsable de traitement
2. Données collectées
3. Finalités du traitement
4. Base légale (Article 6 RGPD)
5. Destinataires des données
6. Durée de conservation
7. Droits des utilisateurs (Article 15-22)
8. Sécurité des données
9. Cookies et traceurs
10. Modifications de la politique
11. Contact DPO

---

## ✅ CHECKLIST DE DÉPLOIEMENT

### Backend
- [ ] Migration base de données exécutée
- [ ] Validateur de mot de passe activé
- [ ] Tests unitaires passent
- [ ] Settings.py configuré

### Frontend
- [ ] Traductions FR/EN ajoutées
- [ ] Formulaire mis à jour
- [ ] Pages légales créées
- [ ] Routes configurées

### Documentation
- [ ] Documents légaux rédigés (avec juriste)
- [ ] Notice RGPD affichée
- [ ] Aide utilisateur mise à jour

### Tests
- [ ] Inscription avec consentements fonctionne
- [ ] Validation d'âge fonctionne
- [ ] Mot de passe fort validé
- [ ] Multilingue testé (FR/EN)

---

## 🚀 COMMANDES DE DÉPLOIEMENT

```bash
# Backend
cd backend
docker-compose exec backend python manage.py makemigrations accounts
docker-compose exec backend python manage.py migrate accounts
docker-compose restart backend

# Frontend
cd frontend
npm run build  # Si nécessaire

# Test
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "StrongP@ss123!",
    "first_name": "Test",
    "last_name": "User",
    "date_of_birth": "2000-01-01",
    "terms_accepted": true,
    "privacy_policy_accepted": true,
    "privacy_policy_version": "1.0",
    "marketing_consent": false
  }'
```

---

## 📚 RESSOURCES

- **CNIL:** https://www.cnil.fr/fr/reglement-europeen-protection-donnees
- **ANSSI:** https://www.ssi.gouv.fr (recommandations sécurité)
- **Template CGU:** https://www.cnil.fr/fr/modele/cgu
- **Template Politique:** https://www.cnil.fr/fr/modele/politique-confidentialite

---

**Date de création:** 2025-11-12
**Version:** 1.0
**Prochaine révision:** Après consultation juriste
