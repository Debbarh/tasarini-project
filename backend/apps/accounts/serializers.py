from __future__ import annotations

from rest_framework import serializers

from .models import (
    Achievement,
    AdminAuditLog,
    AdminPermission,
    AdminSession,
    Notification,
    NotificationPreference,
    User,
    UserAchievement,
    UserFollow,
    UserProfile,
    UserRole,
    UserRoleAssignment,
    UserSession,
)


class UserProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.public_id', read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'user',
            'user_id',
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'avatar_url',
            'bio',
            # Phase 2: Extended Profile Information
            'city',
            'country',
            'facebook_url',
            'instagram_url',
            'twitter_url',
            'linkedin_url',
            'travel_style',
            'favorite_destinations',
            'travel_interests',
            'website_url',
            'occupation',
            # Phase 7: Privacy Settings
            'is_public',
            'profile_visibility',
            'show_stories',
            'show_bookings',
            'show_itineraries',
            'show_followers',
            'allow_messages',
            'allow_profile_search',
            # Social counts
            'followers_count',
            'following_count',
            # Original fields
            'preferences',
            'behavior_profile',
            'segments',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'user', 'user_id', 'followers_count', 'following_count', 'created_at', 'updated_at')

    def get_followers_count(self, obj):
        """Retourne le nombre d'abonnés."""
        return obj.get_followers_count()

    def get_following_count(self, obj):
        """Retourne le nombre d'abonnements."""
        return obj.get_following_count()


class UserRoleAssignmentSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.public_id', read_only=True)

    class Meta:
        model = UserRoleAssignment
        fields = ['id', 'user', 'user_id', 'role', 'created_at']
        read_only_fields = ('id', 'created_at', 'user_id')


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    role = serializers.ChoiceField(choices=[('user', 'User'), ('partner', 'Partner')], default='user')

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
            raise serializers.ValidationError('Cet email est déjà utilisé.')
        return normalized

    def validate_date_of_birth(self, value):
        """
        Validation âge minimum 13 ans (RGPD Article 8).
        """
        from datetime import date

        today = date.today()
        age = today.year - value.year - (
            (today.month, today.day) < (value.month, value.day)
        )

        if age < 13:
            raise serializers.ValidationError(
                "Vous devez avoir au moins 13 ans pour créer un compte."
            )

        return value

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError(
                "Vous devez accepter les Conditions Générales d'Utilisation."
            )
        return value

    def validate_privacy_policy_accepted(self, value):
        if not value:
            raise serializers.ValidationError(
                "Vous devez accepter la Politique de Confidentialité."
            )
        return value

    def validate_password(self, value):
        """
        Validation de la force du mot de passe (RGPD Article 32 - Sécurité).
        Exigences:
        - Au moins 8 caractères
        - Au moins une majuscule
        - Au moins une minuscule
        - Au moins un chiffre
        - Au moins un caractère spécial
        """
        import re

        errors = []

        # La longueur est déjà validée par min_length=8 du champ
        # Mais on peut ajouter un message plus explicite
        if len(value) < 8:
            errors.append("Le mot de passe doit contenir au moins 8 caractères.")

        if not re.search(r'[A-Z]', value):
            errors.append("Le mot de passe doit contenir au moins une lettre majuscule.")

        if not re.search(r'[a-z]', value):
            errors.append("Le mot de passe doit contenir au moins une lettre minuscule.")

        if not re.search(r'\d', value):
            errors.append("Le mot de passe doit contenir au moins un chiffre.")

        if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/]', value):
            errors.append(
                "Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...)."
            )

        if errors:
            raise serializers.ValidationError(errors)

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


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    roles = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        source='role_assignments',
        slug_field='role',
    )
    role_assignments_detail = UserRoleAssignmentSerializer(source='role_assignments', many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'public_id',
            'username',
            'email',
            'display_name',
            'role',
            'roles',
            'preferred_language',
            'onboarding_completed',
            'profile',
            'role_assignments_detail',
        ]
        read_only_fields = (
            'id',
            'public_id',
            'username',
            'email',
            'roles',
            'profile',
            'role_assignments_detail',
        )


class UserPreferencesSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(read_only=True)
    preferences = serializers.JSONField(required=False)
    behavior_profile = serializers.JSONField(required=False)
    segments = serializers.ListField(child=serializers.CharField(), required=False)
    contextual_data = serializers.JSONField(required=False)


class AdminAuditLogSerializer(serializers.ModelSerializer):
    admin_detail = UserSerializer(source='admin', read_only=True)

    class Meta:
        model = AdminAuditLog
        fields = [
            'id',
            'admin',
            'admin_detail',
            'action',
            'target_type',
            'target_id',
            'details',
            'ip_address',
            'user_agent',
            'created_at',
        ]
        read_only_fields = ('id', 'admin', 'admin_detail', 'created_at')


class AdminSessionSerializer(serializers.ModelSerializer):
    admin_detail = UserSerializer(source='admin', read_only=True)

    class Meta:
        model = AdminSession
        fields = [
            'id',
            'admin',
            'admin_detail',
            'session_token',
            'ip_address',
            'user_agent',
            'expires_at',
            'last_activity',
            'is_active',
            'created_at',
        ]
        read_only_fields = (
            'id',
            'admin',
            'admin_detail',
            'session_token',
            'last_activity',
            'is_active',
                'created_at',
        )


class AdminPermissionSerializer(serializers.ModelSerializer):
    admin_detail = UserSerializer(source='admin', read_only=True)

    class Meta:
        model = AdminPermission
        fields = [
            'id',
            'admin',
            'admin_detail',
            'permission_type',
            'can_create',
            'can_read',
            'can_update',
            'can_delete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'admin_detail', 'created_at', 'updated_at')


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'itinerary_id',
            'activity_id',
            'type',
            'title',
            'message',
            'scheduled_for',
            'is_read',
            'is_sent',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'user',
            'activity_reminders',
            'trip_start_reminders',
            'trip_end_reminders',
            'reminder_hours_before',
            'email_notifications',
            'push_notifications',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class UserSessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            'id',
            'device_type',
            'browser',
            'os',
            'ip_address',
            'location',
            'is_current',
            'is_active',
            'last_activity',
            'created_at',
        ]
        read_only_fields = ('id', 'created_at')

    def get_is_current(self, obj):
        """Détermine si c'est la session actuelle basée sur l'IP."""
        request = self.context.get('request')
        if not request:
            return False
        # Comparer l'IP de la requête avec l'IP de la session
        client_ip = self.get_client_ip(request)
        return obj.ip_address == client_ip

    def get_client_ip(self, request):
        """Récupère l'IP du client."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserFollowSerializer(serializers.ModelSerializer):
    """Phase 7: Serializer pour le système de suivi."""

    follower_detail = UserSerializer(source='follower', read_only=True)
    following_detail = UserSerializer(source='following', read_only=True)
    follower_username = serializers.CharField(source='follower.username', read_only=True)
    following_username = serializers.CharField(source='following.username', read_only=True)
    follower_display_name = serializers.CharField(source='follower.display_name', read_only=True)
    following_display_name = serializers.CharField(source='following.display_name', read_only=True)

    class Meta:
        model = UserFollow
        fields = [
            'id',
            'follower',
            'following',
            'follower_detail',
            'following_detail',
            'follower_username',
            'following_username',
            'follower_display_name',
            'following_display_name',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'follower_detail', 'following_detail',
                           'follower_username', 'following_username', 'follower_display_name', 'following_display_name')


# === Phase 9: Achievement/Badge System Serializers ===

class AchievementSerializer(serializers.ModelSerializer):
    """Serializer pour les badges/réalisations."""

    class Meta:
        model = Achievement
        fields = [
            'id',
            'name',
            'description',
            'icon',
            'criteria_type',
            'criteria_value',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')


class UserAchievementSerializer(serializers.ModelSerializer):
    """Serializer pour les badges débloqués par les utilisateurs."""

    achievement = AchievementSerializer(read_only=True)
    achievement_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = UserAchievement
        fields = [
            'id',
            'user',
            'achievement',
            'achievement_id',
            'earned',
            'earned_at',
            'progress',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'user', 'achievement', 'earned', 'earned_at', 'created_at', 'updated_at')
