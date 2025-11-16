# 🔐 Plan d'Amélioration du Système d'Authentification

**Date:** 12 Novembre 2025
**Projet:** Tasarini - Application de voyage

---

## 📊 Analyse de l'État Actuel

### ✅ Ce qui fonctionne bien

1. **Architecture solide**
   - JWT avec SimpleJWT (access 60min, refresh 7 jours)
   - Custom User model avec rôles
   - Multi-role assignment (UserRoleAssignment)
   - Admin permissions granulaires (CRUD)
   - Audit logging complet
   - Session tracking pour admins

2. **Rôles existants**
   - ADMIN: Administrateur système complet
   - EDITOR: Éditeur de contenu (CRU, pas de D)
   - PARTNER: Partenaires business (POI, bookings)
   - TRAVELER: Utilisateurs voyageurs

3. **Features implémentées**
   - Authentification par email
   - Préférences utilisateur (JSON flexible)
   - Profil comportemental (behavior_profile)
   - Notifications avec préférences
   - Dashboard analytics admin

### ❌ Manques Critiques

1. **🚨 PAS de vérification email**
   - Inscription immédiate sans confirmation
   - Risque de spam/faux comptes
   - Pas de validation d'email réel

2. **🚨 PAS de reset password par email**
   - Uniquement reset admin manuel
   - Utilisateurs bloqués si mot de passe oublié

3. **🚨 PAS de 2FA**
   - Sécurité faible pour comptes sensibles
   - Pas de protection contre vol de credentials

4. **Workflow flou**
   - Pas de statut de compte (actif/inactif/pending)
   - Pas de process d'approbation pour partners
   - Rôles attribués sans validation

5. **Email non configuré**
   - Settings email vides
   - Pas de templates email
   - Pas de service d'envoi

---

## 🎯 Plan d'Amélioration (Phases)

### Phase 1: Configuration Email (URGENT - 1 jour)

**Objectif:** Configurer l'envoi d'emails avec votre serveur mail Tasarini

#### 1.1 Configuration Django Email

**Fichier:** `backend/tasarini_backend/settings.py`

```python
# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'mail.tasarini.com'
EMAIL_PORT = 465
EMAIL_USE_SSL = True
EMAIL_HOST_USER = 'no-reply@tasarini.com'
EMAIL_HOST_PASSWORD = 'Tsunami_one01'
DEFAULT_FROM_EMAIL = 'Tasarini <no-reply@tasarini.com>'
SERVER_EMAIL = 'no-reply@tasarini.com'

# Email settings
EMAIL_TIMEOUT = 10
EMAIL_USE_LOCALTIME = True
```

#### 1.2 Variables d'environnement

**Fichier:** `backend/.env`

```bash
# Email Configuration
EMAIL_HOST=mail.tasarini.com
EMAIL_PORT=465
EMAIL_USE_SSL=True
EMAIL_HOST_USER=no-reply@tasarini.com
EMAIL_HOST_PASSWORD=Tsunami_one01
DEFAULT_FROM_EMAIL=Tasarini <no-reply@tasarini.com>
FRONTEND_URL=http://localhost:5173
```

#### 1.3 Tester l'envoi d'email

```bash
docker-compose exec backend python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    'Test Email Tasarini',
    'Ceci est un test de configuration email.',
    'no-reply@tasarini.com',
    ['votre-email@example.com'],
    fail_silently=False,
)
```

---

### Phase 2: Vérification Email à l'Inscription (2-3 jours)

**Objectif:** Obliger les utilisateurs à confirmer leur email avant d'accéder

#### 2.1 Nouveau champ User

**Fichier:** `backend/apps/accounts/models.py`

```python
class User(AbstractUser):
    # ... champs existants ...
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)

    def generate_verification_token(self):
        """Génère un nouveau token de vérification."""
        self.email_verification_token = uuid.uuid4()
        self.email_verification_sent_at = timezone.now()
        self.save()
        return self.email_verification_token
```

#### 2.2 Migration

```bash
docker-compose exec backend python manage.py makemigrations accounts
docker-compose exec backend python manage.py migrate accounts
```

#### 2.3 Service d'envoi d'email

**Nouveau fichier:** `backend/apps/accounts/services/email_service.py`

```python
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags

class EmailService:
    @staticmethod
    def send_verification_email(user):
        """Envoie l'email de vérification."""
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={user.email_verification_token}&email={user.email}"

        context = {
            'user': user,
            'verification_url': verification_url,
            'site_name': 'Tasarini',
        }

        html_message = render_to_string('emails/verify_email.html', context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject='Confirmez votre adresse email - Tasarini',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

    @staticmethod
    def send_welcome_email(user):
        """Envoie l'email de bienvenue après vérification."""
        context = {
            'user': user,
            'login_url': f"{settings.FRONTEND_URL}/login",
            'site_name': 'Tasarini',
        }

        html_message = render_to_string('emails/welcome.html', context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject='Bienvenue sur Tasarini !',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

    @staticmethod
    def send_password_reset_email(user, reset_token):
        """Envoie l'email de réinitialisation de mot de passe."""
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}&email={user.email}"

        context = {
            'user': user,
            'reset_url': reset_url,
            'site_name': 'Tasarini',
        }

        html_message = render_to_string('emails/password_reset.html', context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject='Réinitialisation de votre mot de passe - Tasarini',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
```

#### 2.4 Templates Email

**Créer:** `backend/templates/emails/verify_email.html`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Vérifiez votre email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Bienvenue sur Tasarini !</h1>

        <p>Bonjour {{ user.first_name|default:"Voyageur" }},</p>

        <p>Merci de vous être inscrit sur Tasarini. Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ verification_url }}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Vérifier mon email
            </a>
        </div>

        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #666;">{{ verification_url }}</p>

        <p><strong>Ce lien est valide pendant 24 heures.</strong></p>

        <p>Si vous n'avez pas créé de compte sur Tasarini, vous pouvez ignorer cet email.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #666; font-size: 12px;">
            © 2025 Tasarini. Tous droits réservés.<br>
            Cet email a été envoyé à {{ user.email }}.
        </p>
    </div>
</body>
</html>
```

**Créer:** `backend/templates/emails/welcome.html`
**Créer:** `backend/templates/emails/password_reset.html`

#### 2.5 Vue de vérification email

**Fichier:** `backend/apps/accounts/views.py`

```python
class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        token = request.data.get('token')

        if not email or not token:
            return Response(
                {'error': 'Email et token requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                email__iexact=email,
                email_verification_token=token
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Token de vérification invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier l'expiration (24h)
        if user.email_verification_sent_at:
            expiration = user.email_verification_sent_at + timezone.timedelta(hours=24)
            if timezone.now() > expiration:
                return Response(
                    {'error': 'Le lien de vérification a expiré.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Marquer l'email comme vérifié
        user.email_verified = True
        user.save()

        # Envoyer l'email de bienvenue
        EmailService.send_welcome_email(user)

        return Response({
            'message': 'Email vérifié avec succès !',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)

class ResendVerificationEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')

        if not email:
            return Response(
                {'error': 'Email requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Ne pas révéler si l'email existe
            return Response(
                {'message': 'Si cet email existe, un nouveau lien de vérification a été envoyé.'},
                status=status.HTTP_200_OK
            )

        if user.email_verified:
            return Response(
                {'error': 'Cet email est déjà vérifié.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Générer nouveau token et envoyer
        user.generate_verification_token()
        EmailService.send_verification_email(user)

        return Response(
            {'message': 'Un nouveau lien de vérification a été envoyé.'},
            status=status.HTTP_200_OK
        )
```

#### 2.6 Modifier RegisterView

**Fichier:** `backend/apps/accounts/views.py`

```python
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Générer token de vérification
        user.generate_verification_token()

        # Envoyer email de vérification
        try:
            EmailService.send_verification_email(user)
        except Exception as e:
            # Logger l'erreur mais ne pas bloquer l'inscription
            logger.error(f"Erreur envoi email vérification: {e}")

        return Response({
            'message': 'Inscription réussie ! Vérifiez votre email pour activer votre compte.',
            'user': UserSerializer(user).data,
            'email_sent': True,
        }, status=status.HTTP_201_CREATED)
```

#### 2.7 Middleware de vérification email

**Nouveau fichier:** `backend/apps/accounts/middleware.py`

```python
from django.utils.deprecation import MiddlewareMixin
from rest_framework.response import Response
from rest_framework import status

class EmailVerificationMiddleware(MiddlewareMixin):
    """Middleware pour bloquer les utilisateurs non vérifiés."""

    EXEMPT_PATHS = [
        '/api/auth/register/',
        '/api/auth/verify-email/',
        '/api/auth/resend-verification/',
        '/api/token/',
        '/api/token/refresh/',
        '/api/docs/',
        '/api/schema/',
        '/admin/',
    ]

    def process_request(self, request):
        # Skip pour les chemins exemptés
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None

        # Skip pour les requêtes non authentifiées
        if not request.user.is_authenticated:
            return None

        # Skip pour les admins/staff
        if request.user.is_staff or request.user.is_superuser:
            return None

        # Bloquer si email non vérifié
        if not request.user.email_verified:
            return Response(
                {
                    'error': 'Email non vérifié',
                    'detail': 'Vous devez vérifier votre adresse email avant d\'accéder à cette ressource.',
                    'email': request.user.email
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return None
```

**Activer dans settings.py:**

```python
MIDDLEWARE = [
    # ... middlewares existants ...
    'apps.accounts.middleware.EmailVerificationMiddleware',
]
```

#### 2.8 URLs

**Fichier:** `backend/tasarini_backend/urls.py`

```python
urlpatterns = [
    # ... URLs existantes ...
    path('api/auth/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('api/auth/resend-verification/', ResendVerificationEmailView.as_view(), name='resend_verification'),
]
```

---

### Phase 3: Reset Password par Email (1-2 jours)

**Objectif:** Permettre aux utilisateurs de réinitialiser leur mot de passe par email

#### 3.1 Nouveau champ User

```python
class User(AbstractUser):
    # ... champs existants ...
    password_reset_token = models.UUIDField(null=True, blank=True)
    password_reset_sent_at = models.DateTimeField(null=True, blank=True)

    def generate_password_reset_token(self):
        """Génère un token de reset de mot de passe."""
        self.password_reset_token = uuid.uuid4()
        self.password_reset_sent_at = timezone.now()
        self.save()
        return self.password_reset_token
```

#### 3.2 Vues Reset Password

```python
class RequestPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')

        if not email:
            return Response({'error': 'Email requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)

            # Générer token et envoyer email
            reset_token = user.generate_password_reset_token()
            EmailService.send_password_reset_email(user, reset_token)
        except User.DoesNotExist:
            pass  # Ne pas révéler si l'email existe

        return Response(
            {'message': 'Si cet email existe, un lien de réinitialisation a été envoyé.'},
            status=status.HTTP_200_OK
        )

class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        token = request.data.get('token')
        new_password = request.data.get('password')

        if not all([email, token, new_password]):
            return Response(
                {'error': 'Email, token et nouveau mot de passe requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                email__iexact=email,
                password_reset_token=token
            )
        except User.DoesNotExist:
            return Response({'error': 'Token invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        # Vérifier l'expiration (1h)
        if user.password_reset_sent_at:
            expiration = user.password_reset_sent_at + timezone.timedelta(hours=1)
            if timezone.now() > expiration:
                return Response({'error': 'Le lien a expiré.'}, status=status.HTTP_400_BAD_REQUEST)

        # Réinitialiser le mot de passe
        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_sent_at = None
        user.save()

        return Response({'message': 'Mot de passe réinitialisé avec succès.'}, status=status.HTTP_200_OK)
```

---

### Phase 4: Amélioration des Rôles et Workflow (3-4 jours)

**Objectif:** Clarifier les rôles et ajouter des statuts de compte

#### 4.1 Nouveaux rôles proposés

```python
class UserRole(models.TextChoices):
    # Administrateurs
    SUPER_ADMIN = 'super_admin', 'Super Administrateur'
    ADMIN = 'admin', 'Administrateur'
    MODERATOR = 'moderator', 'Modérateur'

    # Partenaires
    PARTNER_PREMIUM = 'partner_premium', 'Partenaire Premium'
    PARTNER_STANDARD = 'partner_standard', 'Partenaire Standard'
    PARTNER_TRIAL = 'partner_trial', 'Partenaire Essai'

    # Utilisateurs
    TRAVELER_PRO = 'traveler_pro', 'Voyageur Pro'
    TRAVELER = 'traveler', 'Voyageur'
    TRAVELER_FREE = 'traveler_free', 'Voyageur Gratuit'

    # Autres
    CONTENT_CREATOR = 'content_creator', 'Créateur de contenu'
    GUIDE = 'guide', 'Guide local'
```

**Hiérarchie des rôles:**

```
SUPER_ADMIN (tout)
├── ADMIN (gestion utilisateurs, partenaires, POI, système)
│   └── MODERATOR (modération contenu uniquement)
│
PARTNER_PREMIUM (all features + API access)
├── PARTNER_STANDARD (standard features)
│   └── PARTNER_TRIAL (limited features, 30 days)
│
TRAVELER_PRO (itinéraires illimités + features avancées)
├── TRAVELER (features standard)
│   └── TRAVELER_FREE (features limitées)
│
CONTENT_CREATOR (création contenu, articles, stories)
GUIDE (gestion POI locaux, recommandations)
```

#### 4.2 Statut de compte

```python
class AccountStatus(models.TextChoices):
    PENDING_VERIFICATION = 'pending_verification', 'En attente de vérification'
    ACTIVE = 'active', 'Actif'
    SUSPENDED = 'suspended', 'Suspendu'
    BANNED = 'banned', 'Banni'
    DELETED = 'deleted', 'Supprimé'

class User(AbstractUser):
    # ... champs existants ...
    account_status = models.CharField(
        max_length=30,
        choices=AccountStatus.choices,
        default=AccountStatus.PENDING_VERIFICATION
    )
    status_reason = models.TextField(blank=True)
    suspended_until = models.DateTimeField(null=True, blank=True)
```

#### 4.3 Workflow d'inscription par rôle

**TRAVELER (Voyageur):**
1. Inscription → email verification requis
2. Email vérifié → compte ACTIVE automatiquement
3. Accès immédiat aux fonctionnalités

**PARTNER (Partenaire):**
1. Inscription → email verification requis
2. Email vérifié → statut PENDING_VERIFICATION
3. Soumission dossier partenaire (info entreprise, documents)
4. Review admin → APPROVED ou REJECTED
5. Si APPROVED → compte ACTIVE + accès dashboard partenaire

**GUIDE (Guide local):**
1. Inscription → email verification requis
2. Email vérifié → statut PENDING_VERIFICATION
3. Validation identité + localisation
4. Review admin → APPROVED ou REJECTED
5. Si APPROVED → compte ACTIVE + accès POI locaux

**CONTENT_CREATOR:**
1. Candidature depuis compte TRAVELER actif
2. Portfolio + échantillons requis
3. Review admin
4. Si approuvé → rôle additionnel CONTENT_CREATOR

#### 4.4 Permissions par rôle

**SUPER_ADMIN:**
- Tout (CRUD sur tous les modèles)
- Gestion des admins
- Configuration système
- Accès logs et audit

**ADMIN:**
- CRUD utilisateurs (sauf admins)
- CRUD partenaires
- CRUD POI
- Analytics complet
- Modération contenu

**MODERATOR:**
- Read utilisateurs
- Read partenaires
- CRUD contenu (articles, reviews, stories)
- Modération commentaires

**PARTNER_PREMIUM:**
- CRUD POI illimités
- Analytics avancé
- API access
- Support prioritaire
- Multi-utilisateurs

**PARTNER_STANDARD:**
- CRUD POI (max 10)
- Analytics basique
- Dashboard standard

**PARTNER_TRIAL:**
- CRUD POI (max 3)
- Analytics basique
- 30 jours d'essai

**TRAVELER_PRO:**
- Itinéraires illimités
- Favoris illimités
- Mode hors-ligne
- Export PDF
- Sans publicité

**TRAVELER:**
- 10 itinéraires max
- Favoris illimités
- Features standard

**TRAVELER_FREE:**
- 3 itinéraires max
- 20 favoris max
- Publicités

**CONTENT_CREATOR:**
- Création articles/stories
- Upload média illimité
- Analytics contenu

**GUIDE:**
- CRUD POI locaux (zone géographique)
- Recommandations
- Réponse aux questions voyageurs

---

### Phase 5: 2FA (Optionnel - 2-3 jours)

**Objectif:** Sécurité accrue pour comptes sensibles

#### 5.1 Installation

```bash
pip install django-otp pyotp qrcode
```

#### 5.2 Configuration

```python
# settings.py
INSTALLED_APPS += [
    'django_otp',
    'django_otp.plugins.otp_totp',
]

MIDDLEWARE += [
    'django_otp.middleware.OTPMiddleware',
]
```

#### 5.3 Nouveau champ User

```python
class User(AbstractUser):
    # ... champs existants ...
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True)
```

---

## 📋 Checklist d'Implémentation

### ✅ Phase 1: Email Configuration (Jour 1)
- [ ] Ajouter EMAIL_* settings dans settings.py
- [ ] Ajouter variables d'environnement dans .env
- [ ] Tester envoi email basique
- [ ] Créer dossier templates/emails/
- [ ] Documenter configuration email

### ✅ Phase 2: Email Verification (Jours 2-4)
- [ ] Ajouter champs email_verified, email_verification_token
- [ ] Créer migration
- [ ] Créer EmailService avec méthodes d'envoi
- [ ] Créer templates email (HTML + plain text)
- [ ] Créer VerifyEmailView et ResendVerificationEmailView
- [ ] Modifier RegisterView pour envoyer email
- [ ] Créer EmailVerificationMiddleware
- [ ] Ajouter URLs
- [ ] Tester workflow complet
- [ ] Documenter API endpoints

### ✅ Phase 3: Password Reset (Jours 5-6)
- [ ] Ajouter champs password_reset_token, password_reset_sent_at
- [ ] Créer migration
- [ ] Ajouter méthodes email reset dans EmailService
- [ ] Créer template email password reset
- [ ] Créer RequestPasswordResetView
- [ ] Créer ResetPasswordView
- [ ] Ajouter URLs
- [ ] Tester workflow reset
- [ ] Documenter API endpoints

### ✅ Phase 4: Rôles & Workflow (Jours 7-10)
- [ ] Définir nouveaux rôles (UserRole)
- [ ] Ajouter AccountStatus enum
- [ ] Ajouter champs account_status, status_reason, suspended_until
- [ ] Créer migration
- [ ] Créer modèle PartnerApplication (dossier candidature)
- [ ] Créer workflow approbation partner
- [ ] Créer permissions granulaires par rôle
- [ ] Créer decorators @require_role()
- [ ] Mettre à jour AdminPermission avec nouveaux rôles
- [ ] Créer dashboard approbation partenaires
- [ ] Tester tous les workflows
- [ ] Documenter matrice de permissions

### ✅ Phase 5: 2FA (Optionnel - Jours 11-13)
- [ ] Installer django-otp
- [ ] Ajouter champs 2FA dans User
- [ ] Créer endpoints enable/disable 2FA
- [ ] Créer endpoint verify 2FA code
- [ ] Modifier login pour supporter 2FA
- [ ] Créer QR code pour setup TOTP
- [ ] Tester avec Google Authenticator
- [ ] Documenter setup 2FA

---

## 🔒 Matrice de Permissions Complète

| Resource | SUPER_ADMIN | ADMIN | MODERATOR | PARTNER_PREMIUM | PARTNER_STD | TRAVELER_PRO | TRAVELER | GUIDE | CREATOR |
|----------|-------------|-------|-----------|-----------------|-------------|--------------|----------|-------|---------|
| Users | CRUD | CRUD* | R | - | - | - | - | - | - |
| Admins | CRUD | R | - | - | - | - | - | - | - |
| Partners | CRUD | CRUD | R | - | - | - | - | - | - |
| POI | CRUD | CRUD | CRUD | CRUD (∞) | CRUD (10) | - | - | CRUD (local) | - |
| Analytics | Full | Full | Own | Advanced | Basic | - | - | Own | Own |
| Content | CRUD | CRUD | CRUD | - | - | - | - | - | CRUD |
| Bookings | CRUD | CRUD | R | CRUD | CRUD | CRUD | CRUD | - | - |
| Settings | CRUD | CRUD | - | R | R | R | R | R | R |
| Logs | R | R | - | - | - | - | - | - | - |

**Légende:**
- CRUD: Create, Read, Update, Delete
- R: Read only
- Own: Propres ressources uniquement
- (∞): Illimité
- (N): Limité à N éléments
- *: Sauf admins

---

## 📝 Documentation API Endpoints

### Authentication

```
POST   /api/auth/register/                    - Inscription (AllowAny)
POST   /api/auth/verify-email/                - Vérifier email (AllowAny)
POST   /api/auth/resend-verification/         - Renvoyer email vérification (AllowAny)
POST   /api/auth/request-password-reset/      - Demander reset password (AllowAny)
POST   /api/auth/reset-password/              - Réinitialiser password (AllowAny)
POST   /api/token/                            - Login (AllowAny)
POST   /api/token/refresh/                    - Refresh token (AllowAny)

POST   /api/auth/2fa/enable/                  - Activer 2FA (Authenticated)
POST   /api/auth/2fa/disable/                 - Désactiver 2FA (Authenticated)
POST   /api/auth/2fa/verify/                  - Vérifier code 2FA (Authenticated)
GET    /api/auth/2fa/qrcode/                  - QR code setup 2FA (Authenticated)
```

### Account Management

```
GET    /api/v1/users/me/                      - Profil utilisateur
PATCH  /api/v1/users/me/                      - Mettre à jour profil
POST   /api/v1/users/me/change-password/      - Changer mot de passe
DELETE /api/v1/users/me/                      - Supprimer compte

GET    /api/v1/accounts/status/               - Statut du compte
GET    /api/v1/accounts/roles/                - Rôles de l'utilisateur
```

### Partner Application (Nouveau)

```
POST   /api/v1/partners/apply/                - Candidature partenaire
GET    /api/v1/partners/application/          - Statut candidature
PATCH  /api/v1/partners/application/          - Mettre à jour candidature

GET    /api/v1/admin/partners/applications/   - Liste candidatures (Admin)
POST   /api/v1/admin/partners/approve/<id>/   - Approuver (Admin)
POST   /api/v1/admin/partners/reject/<id>/    - Rejeter (Admin)
```

---

## 🎯 Recommandations Finales

### Priorités Immédiates

1. **Phase 1 (Configuration Email)** - CRITIQUE
   - Sans email, impossible de sécuriser l'inscription
   - Risque de spam et faux comptes

2. **Phase 2 (Email Verification)** - TRÈS IMPORTANT
   - Sécurise votre base utilisateurs
   - Évite les comptes fantômes
   - Permet la communication avec utilisateurs

3. **Phase 3 (Password Reset)** - IMPORTANT
   - Améliore l'expérience utilisateur
   - Réduit le support client
   - Standard de l'industrie

### Optionnel mais Recommandé

4. **Phase 4 (Rôles & Workflow)** - RECOMMANDÉ
   - Améliore la gestion des partenaires
   - Clarifie les permissions
   - Permet la monétisation (tiers gratuit/payant)

5. **Phase 5 (2FA)** - OPTIONNEL
   - Sécurité accrue pour comptes sensibles
   - Requis pour certifications (ISO, PCI-DSS)
   - Marketing positif (sécurité)

### Ordre d'Implémentation

```
Semaine 1: Phases 1 + 2 (Email config + verification)
Semaine 2: Phase 3 (Password reset)
Semaine 3: Phase 4 (Rôles, workflow, permissions)
Semaine 4: Tests, documentation, optimisation
Semaine 5: Phase 5 si nécessaire (2FA)
```

---

## 📚 Ressources

- Django Email: https://docs.djangoproject.com/en/5.0/topics/email/
- SimpleJWT: https://django-rest-framework-simplejwt.readthedocs.io/
- Django OTP: https://django-otp-official.readthedocs.io/
- OWASP Auth: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

**Document maintenu par:** Équipe Tasarini
**Dernière mise à jour:** 12 Novembre 2025
