from __future__ import annotations

import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserRole(models.TextChoices):
    """
    Système de rôles Tasarini - 6 niveaux hiérarchiques

    GUEST: Visiteur non inscrit (lecture seule limitée)
    USER: Utilisateur standard (voyageur inscrit)
    PARTNER: Partenaire commercial (propriétaire de POI/business)
    EDITOR: Créateur de contenu (modérateur + revenue sharing)
    ADMIN: Administrateur opérationnel (gestion quotidienne)
    SUPER_ADMIN: Super administrateur (accès total système)
    """
    GUEST = 'guest', 'Invité'
    USER = 'user', 'Utilisateur'
    PARTNER = 'partner', 'Partenaire'
    EDITOR = 'editor', 'Éditeur'
    ADMIN = 'admin', 'Administrateur'
    SUPER_ADMIN = 'super_admin', 'Super Administrateur'


class PartnerTier(models.TextChoices):
    """
    Niveaux d'abonnement pour les partenaires

    TRIAL: Période d'essai gratuite (30 jours, 1 POI)
    STANDARD: Abonnement standard (10 POI, analytics basiques)
    PREMIUM: Abonnement premium (POI illimités, analytics avancées, priorité support)
    """
    TRIAL = 'trial', 'Essai Gratuit'
    STANDARD = 'standard', 'Standard'
    PREMIUM = 'premium', 'Premium'


class User(AbstractUser):
    """Custom user compatible avec les rôles Supabase existants."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    display_name = models.CharField(max_length=120, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.USER)
    preferred_language = models.CharField(max_length=5, default='fr')
    onboarding_completed = models.BooleanField(default=False)

    # Email verification fields
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=64, blank=True, null=True)
    email_verification_sent_at = models.DateTimeField(blank=True, null=True)

    # Password reset fields
    password_reset_token = models.CharField(max_length=64, blank=True, null=True)
    password_reset_sent_at = models.DateTimeField(blank=True, null=True)

    # Partner-specific fields
    partner_tier = models.CharField(
        max_length=20,
        choices=PartnerTier.choices,
        blank=True,
        null=True,
        help_text="Niveau d'abonnement pour les partenaires"
    )
    partner_trial_ends_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Date de fin de la période d'essai gratuite"
    )
    partner_subscription_ends_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Date de fin de l'abonnement actuel"
    )

    # Editor-specific fields
    editor_revenue_share_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=30.00,
        help_text="Pourcentage des revenus publicitaires pour les éditeurs (défaut: 30%)"
    )
    editor_content_approved = models.BooleanField(
        default=False,
        help_text="Indique si l'éditeur a été approuvé pour créer du contenu"
    )

    # Super Admin security
    requires_2fa = models.BooleanField(
        default=False,
        help_text="Exige l'authentification à deux facteurs (obligatoire pour SUPER_ADMIN)"
    )
    two_factor_enabled = models.BooleanField(
        default=False,
        help_text="Indique si l'authentification à deux facteurs est activée"
    )

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
        max_length=10, blank=True, default="1.0",
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

    def __str__(self) -> str:  # pragma: no cover - simple repr
        return self.display_name or self.username

    def generate_verification_token(self) -> str:
        """Génère un token de vérification unique."""
        import secrets
        self.email_verification_token = secrets.token_urlsafe(48)
        self.email_verification_sent_at = timezone.now()
        self.save(update_fields=['email_verification_token', 'email_verification_sent_at'])
        return self.email_verification_token

    def verify_email(self, token: str, clear_token: bool = True) -> bool:
        """Vérifie l'email avec le token fourni et active le compte."""
        if not self.email_verification_token or self.email_verified:
            return False

        # Check if token matches
        if self.email_verification_token != token:
            return False

        # Check if token is not expired (24 hours)
        if self.email_verification_sent_at:
            from datetime import timedelta
            expiry = self.email_verification_sent_at + timedelta(hours=24)
            if timezone.now() > expiry:
                return False

        # Verify email and activate account
        self.email_verified = True
        self.is_active = True  # Activer le compte
        update_fields = ['email_verified', 'is_active']
        if clear_token:
            self.email_verification_token = None
            self.email_verification_sent_at = None
            update_fields.extend(['email_verification_token', 'email_verification_sent_at'])
        self.save(update_fields=update_fields)
        return True

    def generate_password_reset_token(self) -> str:
        """Génère un token de réinitialisation de mot de passe."""
        import secrets
        self.password_reset_token = secrets.token_urlsafe(48)
        self.password_reset_sent_at = timezone.now()
        self.save(update_fields=['password_reset_token', 'password_reset_sent_at'])
        return self.password_reset_token

    def reset_password(self, token: str, new_password: str) -> bool:
        """Réinitialise le mot de passe avec le token fourni."""
        if not self.password_reset_token:
            return False

        # Check if token matches
        if self.password_reset_token != token:
            return False

        # Check if token is not expired (1 hour)
        if self.password_reset_sent_at:
            from datetime import timedelta
            expiry = self.password_reset_sent_at + timedelta(hours=1)
            if timezone.now() > expiry:
                return False

        # Reset password
        self.set_password(new_password)
        self.password_reset_token = None
        self.password_reset_sent_at = None
        self.save()
        return True

    # Role and permission helper methods
    def is_guest(self) -> bool:
        """Vérifie si l'utilisateur est un invité."""
        return self.role == UserRole.GUEST

    def is_user(self) -> bool:
        """Vérifie si l'utilisateur est un utilisateur standard."""
        return self.role == UserRole.USER

    def is_partner(self) -> bool:
        """Vérifie si l'utilisateur est un partenaire."""
        return self.role == UserRole.PARTNER

    def is_editor(self) -> bool:
        """Vérifie si l'utilisateur est un éditeur."""
        return self.role == UserRole.EDITOR

    def is_admin(self) -> bool:
        """Vérifie si l'utilisateur est un administrateur."""
        return self.role == UserRole.ADMIN

    def is_super_admin(self) -> bool:
        """Vérifie si l'utilisateur est un super administrateur."""
        return self.role == UserRole.SUPER_ADMIN

    def has_role_or_higher(self, role: str) -> bool:
        """
        Vérifie si l'utilisateur a le rôle spécifié ou un rôle supérieur.
        Hiérarchie: GUEST < USER < PARTNER < EDITOR < ADMIN < SUPER_ADMIN
        """
        hierarchy = {
            UserRole.GUEST: 0,
            UserRole.USER: 1,
            UserRole.PARTNER: 2,
            UserRole.EDITOR: 3,
            UserRole.ADMIN: 4,
            UserRole.SUPER_ADMIN: 5,
        }
        return hierarchy.get(self.role, 0) >= hierarchy.get(role, 0)

    def can_manage_users(self) -> bool:
        """Vérifie si l'utilisateur peut gérer d'autres utilisateurs."""
        return self.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]

    def can_manage_partners(self) -> bool:
        """Vérifie si l'utilisateur peut gérer les partenaires."""
        return self.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]

    def can_moderate_content(self) -> bool:
        """Vérifie si l'utilisateur peut modérer le contenu."""
        return self.role in [UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]

    def can_manage_pois(self) -> bool:
        """Vérifie si l'utilisateur peut gérer tous les POIs."""
        return self.role in [UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]

    def can_access_analytics(self) -> bool:
        """Vérifie si l'utilisateur peut accéder aux analytics."""
        return self.role in [UserRole.PARTNER, UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]

    def can_manage_system_settings(self) -> bool:
        """Vérifie si l'utilisateur peut gérer les paramètres système."""
        return self.role == UserRole.SUPER_ADMIN

    def get_max_pois(self) -> int:
        """Retourne le nombre maximum de POIs que l'utilisateur peut créer."""
        if self.role == UserRole.GUEST:
            return 0  # Les invités ne peuvent pas créer de POIs
        elif self.role == UserRole.USER:
            return 0  # Les utilisateurs standards ne peuvent pas créer de POIs
        elif self.role == UserRole.PARTNER:
            if self.partner_tier == PartnerTier.TRIAL:
                return 1
            elif self.partner_tier == PartnerTier.STANDARD:
                return 10
            elif self.partner_tier == PartnerTier.PREMIUM:
                return -1  # Illimité
            return 1  # Par défaut: 1 POI
        elif self.role in [UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            return -1  # Illimité
        return 0

    def is_partner_subscription_active(self) -> bool:
        """Vérifie si l'abonnement partenaire est actif."""
        if not self.is_partner():
            return False
        if self.partner_tier == PartnerTier.TRIAL:
            return self.partner_trial_ends_at and self.partner_trial_ends_at > timezone.now()
        return self.partner_subscription_ends_at and self.partner_subscription_ends_at > timezone.now()

    def save(self, *args, **kwargs):
        """Override save pour gérer les contraintes de rôles."""
        # Auto-activer 2FA pour les super admins
        if self.role == UserRole.SUPER_ADMIN:
            self.requires_2fa = True

        # Si changement vers Partner, initialiser le tier TRIAL
        if self.pk:
            old_user = User.objects.filter(pk=self.pk).first()
            if old_user and old_user.role != UserRole.PARTNER and self.role == UserRole.PARTNER:
                if not self.partner_tier:
                    from datetime import timedelta
                    self.partner_tier = PartnerTier.TRIAL
                    self.partner_trial_ends_at = timezone.now() + timedelta(days=30)

        super().save(*args, **kwargs)


class UserProfile(models.Model):
    """Représente les informations profil utilisées par le frontend."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=120, blank=True)
    last_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    avatar_url = models.URLField(blank=True)
    bio = models.TextField(blank=True)

    # === Phase 2: Extended Profile Information ===
    # Location information
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    country = models.CharField(max_length=100, blank=True, verbose_name="Pays")

    # Social media links
    facebook_url = models.URLField(blank=True, verbose_name="Facebook")
    instagram_url = models.URLField(blank=True, verbose_name="Instagram")
    twitter_url = models.URLField(blank=True, verbose_name="Twitter")
    linkedin_url = models.URLField(blank=True, verbose_name="LinkedIn")

    # Travel preferences
    travel_style = models.CharField(
        max_length=50,
        blank=True,
        choices=[
            ('adventure', 'Aventure'),
            ('luxury', 'Luxe'),
            ('budget', 'Budget'),
            ('cultural', 'Culturel'),
            ('relaxation', 'Détente'),
            ('family', 'Famille'),
            ('solo', 'Solo'),
            ('group', 'Groupe'),
        ],
        verbose_name="Style de voyage préféré"
    )
    favorite_destinations = models.TextField(blank=True, verbose_name="Destinations favorites", help_text="Séparées par des virgules")
    travel_interests = models.TextField(blank=True, verbose_name="Centres d'intérêt", help_text="Ex: plongée, randonnée, gastronomie")

    # Website and professional info
    website_url = models.URLField(blank=True, verbose_name="Site web")
    occupation = models.CharField(max_length=100, blank=True, verbose_name="Profession")

    # === Phase 7: Privacy Settings ===
    # Profile visibility
    is_public = models.BooleanField(default=True, verbose_name="Profil public")
    profile_visibility = models.CharField(
        max_length=20,
        default='public',
        choices=[
            ('public', 'Public'),
            ('friends_only', 'Amis uniquement'),
            ('private', 'Privé'),
        ],
        verbose_name="Visibilité du profil"
    )

    # Content visibility
    show_stories = models.BooleanField(default=True, verbose_name="Afficher mes récits")
    show_bookings = models.BooleanField(default=False, verbose_name="Afficher mes réservations")
    show_itineraries = models.BooleanField(default=True, verbose_name="Afficher mes itinéraires")
    show_followers = models.BooleanField(default=True, verbose_name="Afficher mes abonnés")

    # Communication
    allow_messages = models.BooleanField(default=True, verbose_name="Autoriser les messages")
    allow_profile_search = models.BooleanField(default=True, verbose_name="Visible dans la recherche")

    preferences = models.JSONField(default=dict, blank=True)
    behavior_profile = models.JSONField(default=dict, blank=True)
    segments = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['user__username']

    def __str__(self) -> str:  # pragma: no cover
        return f"Profil {self.user.username}"

    def get_followers_count(self):
        """Retourne le nombre d'abonnés."""
        return UserFollow.objects.filter(following=self.user, is_active=True).count()

    def get_following_count(self):
        """Retourne le nombre d'abonnements."""
        return UserFollow.objects.filter(follower=self.user, is_active=True).count()


class UserFollow(models.Model):
    """
    Phase 7: Système de suivi des utilisateurs.
    Permet à un utilisateur de suivre un autre utilisateur.
    """

    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='following_relationships',
        verbose_name="Abonné"
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='follower_relationships',
        verbose_name="Suivi"
    )
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de suivi")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created_at']
        verbose_name = "Abonnement"
        verbose_name_plural = "Abonnements"
        indexes = [
            models.Index(fields=['follower', 'is_active']),
            models.Index(fields=['following', 'is_active']),
        ]

    def __str__(self) -> str:
        return f"{self.follower.username} suit {self.following.username}"

    def clean(self):
        """Validation : un utilisateur ne peut pas se suivre lui-même."""
        from django.core.exceptions import ValidationError
        if self.follower == self.following:
            raise ValidationError("Un utilisateur ne peut pas se suivre lui-même.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class UserRoleAssignment(models.Model):
    """Permet d'associer plusieurs rôles à un utilisateur (équivalent table `user_roles`)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='role_assignments')
    role = models.CharField(max_length=32, choices=UserRole.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'role')
        ordering = ['user__username', 'role']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user.username} → {self.role}"


# === Phase 9: Achievement/Badge System ===

class Achievement(models.Model):
    """Badges/Réalisations que les utilisateurs peuvent débloquer."""

    ICON_CHOICES = [
        ('book', 'Livre'),
        ('trophy', 'Trophée'),
        ('plane', 'Avion'),
        ('star', 'Étoile'),
        ('heart', 'Coeur'),
        ('map', 'Carte'),
        ('camera', 'Caméra'),
        ('globe', 'Globe'),
        ('compass', 'Boussole'),
        ('medal', 'Médaille'),
    ]

    CRITERIA_TYPE_CHOICES = [
        ('story_count', 'Nombre de récits'),
        ('like_count', 'Nombre de likes reçus'),
        ('booking_count', 'Nombre de réservations'),
        ('itinerary_count', 'Nombre d\'itinéraires'),
        ('follower_count', 'Nombre d\'abonnés'),
        ('following_count', 'Nombre d\'abonnements'),
        ('view_count', 'Nombre de vues'),
        ('comment_count', 'Nombre de commentaires'),
        ('share_count', 'Nombre de partages'),
    ]

    name = models.CharField(max_length=100, verbose_name="Nom du badge")
    description = models.TextField(verbose_name="Description")
    icon = models.CharField(max_length=20, choices=ICON_CHOICES, default='trophy', verbose_name="Icône")
    criteria_type = models.CharField(max_length=30, choices=CRITERIA_TYPE_CHOICES, verbose_name="Type de critère")
    criteria_value = models.IntegerField(verbose_name="Valeur seuil")
    is_active = models.BooleanField(default=True, verbose_name="Badge actif")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['criteria_value', 'name']
        verbose_name = "Badge"
        verbose_name_plural = "Badges"
        indexes = [
            models.Index(fields=['criteria_type', 'criteria_value']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.criteria_type} >= {self.criteria_value})"


class UserAchievement(models.Model):
    """Badges débloqués par les utilisateurs."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name='user_achievements')
    earned = models.BooleanField(default=False, verbose_name="Badge débloqué")
    earned_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de déblocage")
    progress = models.IntegerField(default=0, verbose_name="Progression actuelle")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'achievement')
        ordering = ['-earned', '-earned_at', 'achievement__criteria_value']
        verbose_name = "Badge utilisateur"
        verbose_name_plural = "Badges utilisateurs"
        indexes = [
            models.Index(fields=['user', 'earned']),
            models.Index(fields=['earned_at']),
        ]

    def __str__(self):
        status = "✓" if self.earned else f"{self.progress}/{self.achievement.criteria_value}"
        return f"{self.user.username} - {self.achievement.name} ({status})"

    def check_and_award(self):
        """Vérifie si le badge doit être débloqué et le débloque si nécessaire."""
        if not self.earned and self.progress >= self.achievement.criteria_value:
            from django.utils import timezone
            self.earned = True
            self.earned_at = timezone.now()
            self.save()
            return True
        return False


@receiver(post_save, sender=User)
def ensure_user_profile(sender, instance: User, created: bool, **kwargs):
    """Crée/met à jour le profil et le rôle principal à chaque sauvegarde d'utilisateur."""
    profile, profile_created = UserProfile.objects.get_or_create(
        user=instance,
        defaults={
            'email': instance.email or instance.username,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
        },
    )

    # Synchroniser les champs du User vers le UserProfile
    update_fields = []

    if profile.email != instance.email:
        profile.email = instance.email
        update_fields.append('email')

    if profile.first_name != instance.first_name:
        profile.first_name = instance.first_name
        update_fields.append('first_name')

    if profile.last_name != instance.last_name:
        profile.last_name = instance.last_name
        update_fields.append('last_name')

    if update_fields:
        update_fields.append('updated_at')
        profile.save(update_fields=update_fields)

    UserRoleAssignment.objects.get_or_create(user=instance, role=instance.role)


class AdminAuditLog(models.Model):
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='admin_audit_logs')
    action = models.CharField(max_length=120)
    target_type = models.CharField(max_length=120)
    target_id = models.CharField(max_length=255, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.admin} → {self.action}"


class AdminSession(models.Model):
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='admin_sessions')
    session_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField()
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.admin} [{self.session_token}]"


class AdminPermission(models.Model):
    class PermissionType(models.TextChoices):
        USER_MANAGEMENT = 'user_management', 'Gestion utilisateurs'
        PARTNER_MANAGEMENT = 'partner_management', 'Gestion partenaires'
        POI_MANAGEMENT = 'poi_management', 'Gestion POI'
        SYSTEM_ADMINISTRATION = 'system_administration', 'Administration système'
        ANALYTICS_ACCESS = 'analytics_access', 'Accès analytics'
        CONTENT_MODERATION = 'content_moderation', 'Modération contenu'

    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='admin_permissions')
    permission_type = models.CharField(max_length=64, choices=PermissionType.choices)
    can_create = models.BooleanField(default=False)
    can_read = models.BooleanField(default=True)
    can_update = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('admin', 'permission_type')
        ordering = ['admin__username', 'permission_type']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.admin} → {self.permission_type}"


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('activity_reminder', 'Rappel activité'),
        ('trip_start', 'Début de voyage'),
        ('trip_end', 'Fin de voyage'),
        ('general', 'Général'),
        ('new_partner', 'Nouveau partenaire'),
        ('new_poi', 'Nouveau POI'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    itinerary_id = models.UUIDField(blank=True, null=True)
    activity_id = models.UUIDField(blank=True, null=True)
    type = models.CharField(max_length=64, choices=NOTIFICATION_TYPES, default='general')
    title = models.CharField(max_length=255)
    message = models.TextField()
    scheduled_for = models.DateTimeField(default=timezone.now)
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-scheduled_for', '-created_at']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user} - {self.title}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preferences')
    activity_reminders = models.BooleanField(default=True)
    trip_start_reminders = models.BooleanField(default=True)
    trip_end_reminders = models.BooleanField(default=True)
    reminder_hours_before = models.PositiveIntegerField(default=24)
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['user_id']

    def __str__(self) -> str:  # pragma: no cover
        return f"Preferences {self.user}"


@receiver(post_save, sender=User)
def ensure_notification_preferences(sender, instance: User, created: bool, **kwargs):
    NotificationPreference.objects.get_or_create(user=instance)


class UserSession(models.Model):
    """
    Enregistre les sessions de connexion des utilisateurs.
    Permet de voir les appareils connectés et de révoquer des sessions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')

    # Informations sur l'appareil et le navigateur
    device_type = models.CharField(max_length=20, default='desktop')  # desktop, mobile, tablet
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    user_agent = models.TextField(blank=True)

    # Informations de connexion
    ip_address = models.GenericIPAddressField()
    location = models.CharField(max_length=255, blank=True)  # Ville, Pays

    # Gestion de la session
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()  # Expiration du token

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.device_type} - {self.ip_address}"

    def is_expired(self) -> bool:
        """Vérifie si la session est expirée."""
        return timezone.now() > self.expires_at

    def revoke(self):
        """Révoque la session."""
        self.is_active = False
        self.save(update_fields=['is_active', 'updated_at'])
