from __future__ import annotations

from datetime import timedelta

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models
from django.db.models import Prefetch, Q
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.bookings.models import Booking
from apps.partners.models import PartnerProfile
from apps.poi.models import TouristPoint

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
)
from .serializers import (
    AchievementSerializer,
    AdminAuditLogSerializer,
    AdminPermissionSerializer,
    AdminSessionSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
    RegisterSerializer,
    UserAchievementSerializer,
    UserPreferencesSerializer,
    UserProfileSerializer,
    UserRoleAssignmentSerializer,
    UserSerializer,
)
from .services import EmailService
from .permissions import PermissionChecker


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(id=user.id)

    def perform_create(self, serializer):  # pragma: no cover - not exposed yet
        serializer.save()

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('new_password')
        generated = False
        if not new_password:
            new_password = get_random_string(12)
            generated = True
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({'detail': exc.messages}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response(
            {
                'detail': 'Mot de passe réinitialisé',
                'temporary_password': new_password if generated else None,
            }
        )


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.select_related('user')
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        profile = self.get_queryset().filter(user=request.user).first()
        if not profile:
            raise NotFound('Profil introuvable')
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


class UserRoleAssignmentViewSet(viewsets.ModelViewSet):
    queryset = UserRoleAssignment.objects.select_related('user')
    serializer_class = UserRoleAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):  # type: ignore[override]
        if not self.request.user.is_staff:
            raise PermissionDenied('Seul un administrateur peut créer un rôle.')
        serializer.save()

    def perform_update(self, serializer):  # type: ignore[override]
        if not self.request.user.is_staff:
            raise PermissionDenied('Seul un administrateur peut modifier un rôle.')
        serializer.save()

    def perform_destroy(self, instance):  # type: ignore[override]
        if not self.request.user.is_staff:
            raise PermissionDenied('Seul un administrateur peut supprimer un rôle.')
        instance.delete()

    @action(detail=False, methods=['get'], url_path='me')
    def my_roles(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Générer et envoyer l'email de vérification
        from django.conf import settings
        token = user.generate_verification_token()
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        EmailService.send_verification_email(user, verification_url)

        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data
        return Response(
            {
                'user': user_data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'message': 'Un email de vérification a été envoyé à votre adresse email.',
            },
            status=status.HTTP_201_CREATED,
        )


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class UserPreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserPreferencesSerializer

    def get(self, request):
        profile = request.user.profile
        data = {
            'user_id': request.user.public_id,
            'preferences': profile.preferences,
            'behavior_profile': profile.behavior_profile,
            'segments': profile.segments,
            'contextual_data': profile.metadata.get('contextual_data', {}),
        }
        return Response(data)

    def patch(self, request):
        profile = request.user.profile
        serializer = self.serializer_class(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        prefs = serializer.validated_data

        if 'preferences' in prefs:
            profile.preferences = prefs['preferences']
        if 'behavior_profile' in prefs:
            profile.behavior_profile = prefs['behavior_profile']
        if 'segments' in prefs:
            profile.segments = prefs['segments']
        if 'contextual_data' in prefs:
            metadata = profile.metadata or {}
            metadata['contextual_data'] = prefs['contextual_data']
            profile.metadata = metadata

        profile.save(update_fields=['preferences', 'behavior_profile', 'segments', 'metadata', 'updated_at'])
        return Response(self.serializer_class({
            'user_id': request.user.public_id,
            'preferences': profile.preferences,
            'behavior_profile': profile.behavior_profile,
            'segments': profile.segments,
            'contextual_data': profile.metadata.get('contextual_data', {}),
        }).data)


class UserBookingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        days = request.query_params.get('days', '90')
        try:
            days_int = int(days)
        except ValueError:
            days_int = 90
        cutoff = timezone.now() - timedelta(days=days_int)
        bookings = (
            Booking.objects.filter(user=request.user, created_at__gte=cutoff)
            .select_related('room')
            .order_by('-created_at')
        )
        data = [
            {
                'id': booking.id,
                'room': booking.room_id,
                'total_amount': booking.total_amount,
                'status': booking.status,
                'metadata': {
                    'destination': booking.room.tourist_point.name if booking.room else None,
                },
                'created_at': booking.created_at,
            }
            for booking in bookings
        ]
        return Response(data)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        qs = Notification.objects.filter(user=self.request.user).order_by('-scheduled_for', '-created_at')
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                limit_int = max(1, int(limit))
                return qs[:limit_int]
            except (ValueError, TypeError):
                pass
        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):  # type: ignore[override]
        notification = self.get_object()
        if notification.user != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('Accès refusé.')
        serializer.save()

    def perform_destroy(self, instance):  # type: ignore[override]
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('Accès refusé.')
        instance.delete()

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.user != request.user:
            raise PermissionDenied('Accès refusé.')
        notification.is_read = True
        notification.save(update_fields=['is_read', 'updated_at'])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True, updated_at=timezone.now())
        return Response({'updated': updated})


class NotificationPreferenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        preference, _ = NotificationPreference.objects.get_or_create(user=self.request.user)
        return preference

    def get(self, request):
        serializer = NotificationPreferenceSerializer(self.get_object())
        return Response(serializer.data)

    def patch(self, request):
        preference = self.get_object()
        serializer = NotificationPreferenceSerializer(preference, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminAuditLogViewSet(viewsets.ModelViewSet):
    serializer_class = AdminAuditLogSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = AdminAuditLog.objects.select_related('admin')

    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        if self.request.user.is_staff:
            return qs
        return qs.filter(admin=self.request.user)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(admin=self.request.user)


class AdminSessionViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        sessions = AdminSession.objects.filter(admin=request.user).order_by('-created_at')
        serializer = AdminSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    def create(self, request):
        hours = int(request.data.get('duration_hours', 2))
        expires_at = timezone.now() + timedelta(hours=hours)
        ip_address = request.data.get('ip_address') or request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
        if not ip_address:
            ip_address = request.META.get('REMOTE_ADDR')
        session = AdminSession.objects.create(
            admin=request.user,
            ip_address=ip_address,
            user_agent=request.data.get('user_agent', ''),
            expires_at=expires_at,
        )
        serializer = AdminSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def validate(self, request):
        token = request.data.get('session_token')
        if not token:
            return Response({'detail': 'session_token requis'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            session = AdminSession.objects.get(session_token=token, admin=request.user)
        except AdminSession.DoesNotExist:
            return Response({'valid': False})

        if not session.is_active or session.expires_at <= timezone.now():
            if session.is_active:
                session.is_active = False
                session.save(update_fields=['is_active'])
            return Response({'valid': False})

        session.last_activity = timezone.now()
        session.save(update_fields=['last_activity'])
        return Response({'valid': True, 'expires_at': session.expires_at})

    @action(detail=False, methods=['post'])
    def revoke(self, request):
        token = request.data.get('session_token')
        if not token:
            return Response({'detail': 'session_token requis'}, status=status.HTTP_400_BAD_REQUEST)
        updated = AdminSession.objects.filter(session_token=token, admin=request.user).update(is_active=False)
        return Response({'revoked': bool(updated)})

    @action(detail=False, methods=['post'])
    def cleanup(self, request):
        """
        Désactive toutes les sessions expirées (pour tous les administrateurs).
        """
        now = timezone.now()
        expired_qs = AdminSession.objects.filter(expires_at__lte=now, is_active=True)
        updated = expired_qs.update(is_active=False)
        return Response({'deactivated': updated})


class AdminPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = AdminPermissionSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = AdminPermission.objects.select_related('admin')

    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        admin_id = self.request.query_params.get('admin')
        if admin_id:
            qs = qs.filter(admin_id=admin_id)
        return qs


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 30))
        except (TypeError, ValueError):
            days = 30
        since = timezone.now() - timedelta(days=days)

        partner_qs = PartnerProfile.objects.all()
        partners_metadata = partner_qs.values_list('metadata', flat=True)
        incomplete_partners = sum(
            1
            for metadata in partners_metadata
            if isinstance(metadata, dict) and metadata.get('onboarding_complete') is False
        )
        partners_stats = {
            'total_partners': partner_qs.count(),
            'pending_partners': partner_qs.filter(status='pending').count(),
            'approved_partners': partner_qs.filter(status='approved').count(),
            'rejected_partners': partner_qs.filter(status='rejected').count(),
            'incomplete_partners': incomplete_partners,
            'recent_registrations': partner_qs.filter(created_at__gte=since).count(),
        }

        users_qs = User.objects.all()
        users_stats = {
            'total_users': users_qs.count(),
            'admin_users': users_qs.filter(role=UserRole.ADMIN).count(),
            'partner_users': users_qs.filter(role=UserRole.PARTNER).count(),
            'regular_users': users_qs.filter(role=UserRole.USER).count(),
            'recent_registrations': users_qs.filter(date_joined__gte=since).count(),
        }

        poi_qs = TouristPoint.objects.all()
        pois_stats = {
            'total_pois': poi_qs.count(),
            'pending_pois': poi_qs.filter(metadata__status='pending').count(),
            'approved_pois': poi_qs.filter(is_active=True).count(),
            'rejected_pois': poi_qs.filter(metadata__status='rejected').count(),
            'blocked_pois': poi_qs.filter(metadata__status='blocked').count(),
            'verified_pois': poi_qs.filter(metadata__verified=True).count(),
            'recent_submissions': poi_qs.filter(created_at__gte=since).count(),
        }

        bookings_qs = Booking.objects.all()
        bookings_stats = {
            'total_bookings': bookings_qs.count(),
            'recent_bookings': bookings_qs.filter(created_at__gte=since).count(),
        }

        data = {
            'partners': partners_stats,
            'users': users_stats,
            'pois': pois_stats,
            'bookings': bookings_stats,
            'generated_at': timezone.now(),
        }
        return Response(data)


class AdminPermissionCheckView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        permission_type = request.data.get('permission_type')
        action = request.data.get('action')
        if not permission_type or not action:
            return Response({'detail': 'permission_type et action sont requis'}, status=status.HTTP_400_BAD_REQUEST)

        action_field = f'can_{action}'
        if action_field not in {'can_create', 'can_read', 'can_update', 'can_delete'}:
            return Response({'detail': 'action invalide'}, status=status.HTTP_400_BAD_REQUEST)

        rule = AdminPermission.objects.filter(admin=request.user, permission_type=permission_type).first()
        if rule:
            has_permission = getattr(rule, action_field, False)
        else:
            has_permission = request.user.is_staff or request.user.role in {UserRole.ADMIN, UserRole.EDITOR}
        return Response({'permission_type': permission_type, 'action': action, 'has_permission': has_permission})


class AdminPermissionsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    ROLE_PERMISSIONS = {
        UserRole.ADMIN: {'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': True},
        UserRole.EDITOR: {'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': False},
    }

    def get(self, request):
        admin_users = (
            User.objects.filter(Q(is_staff=True) | Q(role__in=[UserRole.ADMIN, UserRole.EDITOR]))
            .prefetch_related(
                'role_assignments',
                Prefetch('admin_permissions', queryset=AdminPermission.objects.all()),
            )
            .order_by('email')
        )
        results = []
        for admin in admin_users:
            roles = list(admin.role_assignments.values_list('role', flat=True))
            rules = list(admin.admin_permissions.all())
            if rules:
                permissions = {
                    'can_create': any(rule.can_create for rule in rules),
                    'can_read': any(rule.can_read for rule in rules),
                    'can_update': any(rule.can_update for rule in rules),
                    'can_delete': any(rule.can_delete for rule in rules),
                }
            else:
                permissions = self._derive_permissions(admin.role, roles)
            results.append(
                {
                    'id': admin.id,
                    'public_id': str(admin.public_id),
                    'email': admin.email,
                    'display_name': admin.display_name or admin.username,
                    'roles': roles,
                    'primary_role': admin.role,
                    'permissions': permissions,
                    'last_login': admin.last_login,
                    'permission_rules': AdminPermissionSerializer(rules, many=True).data,
                }
            )
        return Response(results)

    def _derive_permissions(self, primary_role: str, extra_roles):
        roles = set(extra_roles or [])
        roles.add(primary_role)
        if UserRole.ADMIN in roles:
            return self.ROLE_PERMISSIONS[UserRole.ADMIN]
        if UserRole.EDITOR in roles:
            return self.ROLE_PERMISSIONS[UserRole.EDITOR]
        return {'can_create': False, 'can_read': True, 'can_update': False, 'can_delete': False}


class VerifyEmailView(APIView):
    """Vue pour vérifier l'email avec le token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response(
                {'detail': 'Token de vérification requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email_verification_token=token)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Token invalide ou expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.verify_email(token, clear_token=False):
            # Envoyer l'email de bienvenue
            EmailService.send_welcome_email(user)
            partner_profile = PartnerProfile.objects.filter(owner=user).first()
            profile_status = partner_profile.status if partner_profile else 'missing'
            return Response(
                {
                    'detail': 'Email vérifié avec succès!',
                    'user': UserSerializer(user).data,
                    'auto_login_available': True,
                    'partner_profile_status': profile_status,
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'detail': 'Token invalide ou expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ResendVerificationEmailView(APIView):
    """Vue pour renvoyer l'email de vérification."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.email_verified:
            return Response(
                {'detail': 'Votre email est déjà vérifié.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Renvoyer l'email de vérification
        if EmailService.resend_verification_email(user):
            return Response(
                {'detail': 'Un nouvel email de vérification a été envoyé.'},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'detail': 'Erreur lors de l\'envoi de l\'email.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RequestPasswordResetView(APIView):
    """Vue pour demander la réinitialisation du mot de passe."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response(
                {'detail': 'Email requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
            # Générer le token et envoyer l'email
            from django.conf import settings
            token = user.generate_password_reset_token()
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            EmailService.send_password_reset_email(user, reset_url)
        except User.DoesNotExist:
            # Ne pas révéler si l'email existe ou non pour des raisons de sécurité
            pass

        return Response(
            {'detail': 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.'},
            status=status.HTTP_200_OK
        )


class VerifyEmailCompleteView(APIView):
    """Compléter la vérification et retourner des tokens pour auto-login."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'detail': 'Token de vérification requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email_verification_token=token)
        except User.DoesNotExist:
            return Response({'detail': 'Token invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.email_verified:
            if not user.verify_email(token, clear_token=True):
                return Response({'detail': 'Token invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Nettoyer le token si déjà vérifié
            user.email_verification_token = None
            user.email_verification_sent_at = None
            user.save(update_fields=['email_verification_token', 'email_verification_sent_at'])

        refresh = RefreshToken.for_user(user)
        partner_profile = PartnerProfile.objects.filter(owner=user).first()
        profile_status = partner_profile.status if partner_profile else 'missing'

        return Response(
            {
                'detail': 'Connexion réussie.',
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'partner_profile_status': profile_status,
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """Vue pour réinitialiser le mot de passe avec le token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not token or not new_password:
            return Response(
                {'detail': 'Token et nouveau mot de passe requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(password_reset_token=token)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Token invalide ou expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Valider le mot de passe
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {'detail': exc.messages},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.reset_password(token, new_password):
            return Response(
                {'detail': 'Mot de passe réinitialisé avec succès!'},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'detail': 'Token invalide ou expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserPermissionsView(APIView):
    """Vue pour obtenir toutes les permissions de l'utilisateur connecté."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Retourne toutes les permissions de l'utilisateur pour le frontend."""
        user = request.user
        checker = PermissionChecker(user)

        # Récupérer toutes les permissions
        permissions_data = checker.get_dashboard_permissions()

        # Ajouter les informations de rôle
        role_info = {
            'role': user.role,
            'role_display': user.get_role_display(),
            'is_guest': user.is_guest(),
            'is_user': user.is_user(),
            'is_partner': user.is_partner(),
            'is_editor': user.is_editor(),
            'is_admin': user.is_admin(),
            'is_super_admin': user.is_super_admin(),
        }

        # Ajouter les informations spécifiques au rôle
        role_specific = {}

        if user.is_partner():
            role_specific['partner'] = {
                'tier': user.partner_tier,
                'tier_display': user.get_partner_tier_display() if user.partner_tier else None,
                'trial_ends_at': user.partner_trial_ends_at,
                'subscription_ends_at': user.partner_subscription_ends_at,
                'is_subscription_active': user.is_partner_subscription_active(),
                'max_pois': user.get_max_pois(),
            }

        if user.is_editor():
            role_specific['editor'] = {
                'content_approved': user.editor_content_approved,
                'revenue_share_percentage': float(user.editor_revenue_share_percentage),
            }

        if user.is_super_admin():
            role_specific['super_admin'] = {
                'requires_2fa': user.requires_2fa,
                'two_factor_enabled': user.two_factor_enabled,
            }

        # Email verification
        email_status = {
            'email': user.email,
            'email_verified': user.email_verified,
        }

        return Response({
            'role_info': role_info,
            'permissions': permissions_data,
            'role_specific': role_specific,
            'email_status': email_status,
        })


class RoleHierarchyView(APIView):
    """Vue pour obtenir la hiérarchie des rôles."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retourne la hiérarchie complète des rôles."""
        from .models import UserRole, PartnerTier

        hierarchy = {
            'roles': [
                {
                    'value': UserRole.GUEST,
                    'label': 'Invité',
                    'level': 0,
                    'description': 'Visiteur non inscrit avec accès limité en lecture seule',
                    'features': [
                        'Voir jusqu\'à 100 POIs',
                        'Lire jusqu\'à 10 avis',
                        'Consulter jusqu\'à 3 itinéraires publics'
                    ]
                },
                {
                    'value': UserRole.USER,
                    'label': 'Utilisateur',
                    'level': 1,
                    'description': 'Voyageur standard avec compte vérifié',
                    'features': [
                        'Créer jusqu\'à 10 itinéraires',
                        'Favoris illimités',
                        'Avis et photos illimités',
                        'Réservations complètes',
                        'Accès à l\'assistant IA'
                    ]
                },
                {
                    'value': UserRole.PARTNER,
                    'label': 'Partenaire',
                    'level': 2,
                    'description': 'Propriétaire de business (restaurant, hôtel, activité)',
                    'tiers': [
                        {
                            'value': PartnerTier.TRIAL,
                            'label': 'Essai Gratuit',
                            'duration': '30 jours',
                            'max_pois': 1,
                            'features': ['1 POI', 'Analytics basiques', 'Support email']
                        },
                        {
                            'value': PartnerTier.STANDARD,
                            'label': 'Standard',
                            'price': '29.99€/mois',
                            'max_pois': 10,
                            'features': ['10 POIs', 'Analytics basiques', 'Support prioritaire', 'Photos illimitées']
                        },
                        {
                            'value': PartnerTier.PREMIUM,
                            'label': 'Premium',
                            'price': '99.99€/mois',
                            'max_pois': -1,  # Illimité
                            'features': ['POIs illimités', 'Analytics avancées', 'Support 24/7', 'Badge vérifié', 'Placement prioritaire']
                        }
                    ]
                },
                {
                    'value': UserRole.EDITOR,
                    'label': 'Éditeur',
                    'level': 3,
                    'description': 'Créateur de contenu avec modération et revenue sharing',
                    'features': [
                        'Créer et éditer tous les POIs',
                        'Modérer les avis et le contenu',
                        'Revenue sharing 30% des publicités',
                        'Analytics du contenu créé',
                        'Badge Éditeur Vérifié'
                    ]
                },
                {
                    'value': UserRole.ADMIN,
                    'label': 'Administrateur',
                    'level': 4,
                    'description': 'Gestion opérationnelle quotidienne de la plateforme',
                    'features': [
                        'Gérer les utilisateurs',
                        'Gérer les partenaires',
                        'Approuver/Rejeter les POIs',
                        'Modération du contenu',
                        'Accès aux analytics',
                        'Gérer les réservations'
                    ]
                },
                {
                    'value': UserRole.SUPER_ADMIN,
                    'label': 'Super Administrateur',
                    'level': 5,
                    'description': 'Accès total au système (infrastructure, déploiement, configuration)',
                    'features': [
                        'Toutes les permissions Admin',
                        'Gérer les autres admins',
                        'Paramètres système',
                        'Déploiement',
                        'Gestion infrastructure',
                        '2FA obligatoire'
                    ]
                }
            ]
        }

        return Response(hierarchy)


class UploadAvatarView(APIView):
    """
    Upload avatar image for user profile.
    Supports JPG, PNG, GIF, WebP. Max 5MB.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response(
                {'error': 'No avatar file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        avatar_file = request.FILES['avatar']

        # Validate file size (max 5MB)
        if avatar_file.size > 5 * 1024 * 1024:
            return Response(
                {'error': 'File size exceeds 5MB limit'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if avatar_file.content_type not in allowed_types:
            return Response(
                {'error': 'Invalid file type. Allowed: JPG, PNG, GIF, WebP'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Import storage
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        import uuid
        import os

        # Generate unique filename
        ext = os.path.splitext(avatar_file.name)[1]
        filename = f"avatars/{request.user.public_id}/{uuid.uuid4()}{ext}"

        # Delete old avatar if exists
        try:
            profile = request.user.profile
            if profile.avatar_url:
                # Extract path from URL if it's a local file
                old_path = profile.avatar_url.replace('/media/', '')
                if default_storage.exists(old_path):
                    default_storage.delete(old_path)
        except Exception as e:
            # Continue even if deletion fails
            print(f"Warning: Could not delete old avatar: {e}")

        # Save new file
        try:
            path = default_storage.save(filename, ContentFile(avatar_file.read()))
            avatar_url = default_storage.url(path)

            # Build full URL if it's a relative path
            if avatar_url.startswith('/'):
                # Get the base URL from the request
                scheme = request.scheme
                host = request.get_host()
                avatar_url = f"{scheme}://{host}{avatar_url}"

            # Update user profile
            profile = request.user.profile
            profile.avatar_url = avatar_url
            profile.save(update_fields=['avatar_url'])

            return Response({
                'avatar_url': avatar_url,
                'message': 'Avatar uploaded successfully'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': f'Failed to save avatar: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserStatsView(APIView):
    """
    Get user statistics (stories, favorites, bookmarks, bookings).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Import models
        from apps.content.models import Story, StoryLike, StoryBookmark
        from apps.bookings.models import Booking

        stats = {
            'stories': Story.objects.filter(author=user).count(),
            'favorites': StoryLike.objects.filter(user=user).count(),
            'bookmarks': StoryBookmark.objects.filter(user=user).count(),
            'bookings': Booking.objects.filter(user=user).count(),
        }

        return Response(stats, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    Change user password.
    Requires current password and validates new password strength.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response(
                {'error': 'Les champs current_password et new_password sont requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify current password
        if not user.check_password(current_password):
            return Response(
                {'error': 'Le mot de passe actuel est incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if new password is different from current
        if current_password == new_password:
            return Response(
                {'error': 'Le nouveau mot de passe doit être différent de l\'ancien'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate new password strength
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response(
                {'error': list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Change password
        user.set_password(new_password)
        user.save()

        return Response(
            {'message': 'Mot de passe modifié avec succès'},
            status=status.HTTP_200_OK
        )


class UserSessionView(APIView):
    """
    Gère les sessions utilisateur.
    GET: Liste toutes les sessions actives
    DELETE: Révoque une session spécifique
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Récupère toutes les sessions actives de l'utilisateur."""
        from .models import UserSession
        from .serializers import UserSessionSerializer

        sessions = UserSession.objects.filter(
            user=request.user,
            is_active=True
        ).order_by('-last_activity')

        serializer = UserSessionSerializer(sessions, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, session_id=None):
        """Révoque une session spécifique."""
        from .models import UserSession

        if not session_id:
            return Response(
                {'error': 'session_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session = UserSession.objects.get(
                id=session_id,
                user=request.user,
                is_active=True
            )
            session.revoke()
            return Response(
                {'message': 'Session révoquée avec succès'},
                status=status.HTTP_200_OK
            )
        except UserSession.DoesNotExist:
            return Response(
                {'error': 'Session introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )


class RevokeAllOtherSessionsView(APIView):
    """
    Révoque toutes les sessions sauf la session actuelle.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .models import UserSession

        # Récupérer l'IP actuelle
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            current_ip = x_forwarded_for.split(',')[0]
        else:
            current_ip = request.META.get('REMOTE_ADDR')

        # Révoquer toutes les sessions sauf celle avec l'IP actuelle
        revoked_count = UserSession.objects.filter(
            user=request.user,
            is_active=True
        ).exclude(ip_address=current_ip).update(
            is_active=False
        )

        return Response(
            {'message': f'{revoked_count} session(s) révoquée(s)'},
            status=status.HTTP_200_OK
        )


class DownloadUserDataView(APIView):
    """
    Télécharger toutes les données utilisateur (RGPD Article 20).
    Export complet en JSON de toutes les données personnelles.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.http import JsonResponse
        import json

        user = request.user

        # Collecter toutes les données utilisateur
        user_data = {
            'user_info': {
                'email': user.email,
                'display_name': user.display_name,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'preferred_language': user.preferred_language,
            },
            'profile': {},
            'rgpd_info': {
                'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
                'terms_accepted': user.terms_accepted,
                'terms_accepted_at': user.terms_accepted_at.isoformat() if user.terms_accepted_at else None,
                'privacy_policy_accepted': user.privacy_policy_accepted,
                'privacy_policy_accepted_at': user.privacy_policy_accepted_at.isoformat() if user.privacy_policy_accepted_at else None,
                'privacy_policy_version': user.privacy_policy_version,
                'marketing_consent': user.marketing_consent,
                'marketing_consent_at': user.marketing_consent_at.isoformat() if user.marketing_consent_at else None,
            },
            'sessions': [],
            'stories': [],
            'bookings': [],
            'favorites': [],
        }

        # Profil
        try:
            profile = user.profile
            user_data['profile'] = {
                'phone_number': profile.phone_number,
                'bio': profile.bio,
                'avatar_url': profile.avatar_url,
                'preferences': profile.preferences,
                'behavior_profile': profile.behavior_profile,
                'segments': profile.segments,
            }
        except Exception:
            pass

        # Sessions
        from .models import UserSession
        sessions = UserSession.objects.filter(user=user)
        user_data['sessions'] = [
            {
                'device_type': s.device_type,
                'browser': s.browser,
                'os': s.os,
                'ip_address': s.ip_address,
                'location': s.location,
                'created_at': s.created_at.isoformat(),
                'last_activity': s.last_activity.isoformat(),
            }
            for s in sessions
        ]

        # Stories
        from apps.content.models import Story
        stories = Story.objects.filter(author=user)
        user_data['stories'] = [
            {
                'title': s.title,
                'content': s.content,
                'created_at': s.created_at.isoformat(),
                'is_public': s.is_public,
                'likes_count': s.likes_count,
                'views_count': s.views_count,
            }
            for s in stories
        ]

        # Bookings
        from apps.bookings.models import Booking
        bookings = Booking.objects.filter(user=user)
        user_data['bookings'] = [
            {
                'status': b.status,
                'created_at': b.created_at.isoformat(),
            }
            for b in bookings
        ]

        # Favoris
        from apps.content.models import StoryLike
        favorites = StoryLike.objects.filter(user=user)
        user_data['favorites'] = [
            {
                'story_id': str(f.story.id),
                'created_at': f.created_at.isoformat(),
            }
            for f in favorites
        ]

        # Retourner comme téléchargement JSON
        response = JsonResponse(user_data, json_dumps_params={'indent': 2, 'ensure_ascii': False})
        response['Content-Disposition'] = f'attachment; filename="tasarini_data_{user.public_id}.json"'
        return response


class DeleteAccountView(APIView):
    """
    Supprimer le compte utilisateur (RGPD Article 17).
    Nécessite la confirmation du mot de passe.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        password = request.data.get('password')
        confirm_text = request.data.get('confirm_text', '')

        # Vérifier le mot de passe
        if not password:
            return Response(
                {'error': 'Le mot de passe est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Mot de passe incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier la confirmation textuelle
        if confirm_text.upper() != 'SUPPRIMER':
            return Response(
                {'error': 'Vous devez taper "SUPPRIMER" pour confirmer'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Marquer le compte comme inactif (soft delete)
        user.is_active = False
        user.email = f"deleted_{user.public_id}@deleted.local"
        user.save()

        # Option : Hard delete (décommenter si nécessaire)
        # user.delete()

        return Response(
            {'message': 'Votre compte a été supprimé avec succès'},
            status=status.HTTP_200_OK
        )


class AdvancedUserStatsView(APIView):
    """
    Get advanced user statistics with monthly breakdown and achievements.
    Phase 3: Advanced Statistics
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        from datetime import datetime, timedelta
        from django.db.models import Count
        from django.db.models.functions import TruncMonth

        # Import models
        from apps.content.models import Story, StoryLike, StoryBookmark, SavedItinerary
        from apps.bookings.models import Booking

        # Basic stats
        total_stories = Story.objects.filter(author=user).count()
        total_favorites = StoryLike.objects.filter(user=user).count()
        total_bookmarks = StoryBookmark.objects.filter(user=user).count()
        total_bookings = Booking.objects.filter(user=user).count()
        total_itineraries = SavedItinerary.objects.filter(user=user).count()

        # Monthly activity for the last 6 months
        six_months_ago = datetime.now() - timedelta(days=180)

        monthly_stories = Story.objects.filter(
            author=user,
            created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        monthly_bookings = Booking.objects.filter(
            user=user,
            created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        monthly_itineraries = SavedItinerary.objects.filter(
            user=user,
            created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        # Format monthly data for charts
        def format_monthly_data(queryset):
            return [
                {
                    'month': item['month'].strftime('%Y-%m'),
                    'count': item['count']
                }
                for item in queryset
            ]

        # Phase 9: Get real badges from database
        user_achievements = UserAchievement.objects.filter(
            user=user,
            earned=True
        ).select_related('achievement').order_by('-earned_at')

        badges = []
        for ua in user_achievements:
            badges.append({
                'id': ua.id,
                'name': ua.achievement.name,
                'description': ua.achievement.description,
                'icon': ua.achievement.icon,
                'earned': True,
                'earned_at': ua.earned_at.isoformat() if ua.earned_at else None,
            })

        # Recent activity (last 10 actions)
        recent_activities = []

        # Get recent stories
        recent_stories = Story.objects.filter(author=user).order_by('-created_at')[:5]
        for story in recent_stories:
            recent_activities.append({
                'type': 'story',
                'action': 'Publié un récit',
                'title': story.title,
                'date': story.created_at.isoformat(),
                'icon': 'book'
            })

        # Get recent bookings
        recent_bookings = Booking.objects.filter(user=user).order_by('-created_at')[:3]
        for booking in recent_bookings:
            recent_activities.append({
                'type': 'booking',
                'action': 'Réservation effectuée',
                'title': f"Réservation #{booking.id}",
                'date': booking.created_at.isoformat(),
                'icon': 'plane'
            })

        # Get recent itineraries
        recent_itineraries = SavedItinerary.objects.filter(user=user).order_by('-created_at')[:3]
        for itinerary in recent_itineraries:
            recent_activities.append({
                'type': 'itinerary',
                'action': 'Itinéraire créé',
                'title': itinerary.title,
                'date': itinerary.created_at.isoformat(),
                'icon': 'map'
            })

        # Sort by date
        recent_activities.sort(key=lambda x: x['date'], reverse=True)
        recent_activities = recent_activities[:10]

        return Response({
            'totals': {
                'stories': total_stories,
                'favorites': total_favorites,
                'bookmarks': total_bookmarks,
                'bookings': total_bookings,
                'itineraries': total_itineraries,
            },
            'monthly_activity': {
                'stories': format_monthly_data(monthly_stories),
                'bookings': format_monthly_data(monthly_bookings),
                'itineraries': format_monthly_data(monthly_itineraries),
            },
            'badges': badges,
            'recent_activities': recent_activities,
        }, status=status.HTTP_200_OK)


# ====================================================================
# Phase 7: Follow/Followers System
# ====================================================================

class UserFollowViewSet(viewsets.ModelViewSet):
    """
    Phase 7: ViewSet pour le système de suivi.

    Endpoints:
    - GET /api/v1/accounts/follows/ - Liste des relations de suivi
    - POST /api/v1/accounts/follows/ - Suivre un utilisateur
    - DELETE /api/v1/accounts/follows/{id}/ - Ne plus suivre
    - GET /api/v1/accounts/follows/followers/ - Mes abonnés
    - GET /api/v1/accounts/follows/following/ - Mes abonnements
    - POST /api/v1/accounts/follows/follow/ - Suivre un utilisateur (par username)
    - POST /api/v1/accounts/follows/unfollow/ - Ne plus suivre (par username)
    - GET /api/v1/accounts/follows/is_following/ - Vérifier si je suis un utilisateur
    """

    from apps.accounts.serializers import UserFollowSerializer

    serializer_class = UserFollowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Retourne uniquement les relations actives de l'utilisateur connecté."""
        return UserFollow.objects.filter(
            models.Q(follower=self.request.user) | models.Q(following=self.request.user),
            is_active=True
        ).select_related('follower', 'following')

    @action(detail=False, methods=['get'])
    def followers(self, request):
        """Retourne la liste des abonnés de l'utilisateur connecté."""
        followers = UserFollow.objects.filter(
            following=request.user,
            is_active=True
        ).select_related('follower').order_by('-created_at')

        serializer = self.get_serializer(followers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def following(self, request):
        """Retourne la liste des utilisateurs suivis par l'utilisateur connecté."""
        following = UserFollow.objects.filter(
            follower=request.user,
            is_active=True
        ).select_related('following').order_by('-created_at')

        serializer = self.get_serializer(following, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def follow(self, request):
        """
        Suivre un utilisateur.
        Body: {"user_id": "uuid"} ou {"username": "username"}
        """
        from apps.accounts.models import User

        user_id = request.data.get('user_id')
        username = request.data.get('username')

        if not user_id and not username:
            return Response(
                {'error': 'user_id ou username requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if user_id:
                target_user = User.objects.get(public_id=user_id)
            else:
                target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'Utilisateur non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Vérifier qu'on ne se suit pas soi-même
        if target_user == request.user:
            return Response(
                {'error': 'Vous ne pouvez pas vous suivre vous-même'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Créer ou réactiver la relation de suivi
        follow, created = UserFollow.objects.get_or_create(
            follower=request.user,
            following=target_user,
            defaults={'is_active': True}
        )

        if not created and not follow.is_active:
            follow.is_active = True
            follow.save()
            message = f'Vous suivez à nouveau {target_user.display_name or target_user.username}'
        elif not created:
            return Response(
                {'message': f'Vous suivez déjà {target_user.display_name or target_user.username}'},
                status=status.HTTP_200_OK
            )
        else:
            message = f'Vous suivez maintenant {target_user.display_name or target_user.username}'

        serializer = self.get_serializer(follow)
        return Response({
            'message': message,
            'follow': serializer.data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def unfollow(self, request):
        """
        Ne plus suivre un utilisateur.
        Body: {"user_id": "uuid"} ou {"username": "username"}
        """
        from apps.accounts.models import User

        user_id = request.data.get('user_id')
        username = request.data.get('username')

        if not user_id and not username:
            return Response(
                {'error': 'user_id ou username requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if user_id:
                target_user = User.objects.get(public_id=user_id)
            else:
                target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'Utilisateur non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            follow = UserFollow.objects.get(
                follower=request.user,
                following=target_user
            )
            follow.is_active = False
            follow.save()

            return Response({
                'message': f'Vous ne suivez plus {target_user.display_name or target_user.username}'
            }, status=status.HTTP_200_OK)
        except UserFollow.DoesNotExist:
            return Response(
                {'error': 'Vous ne suivez pas cet utilisateur'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def is_following(self, request):
        """
        Vérifier si l'utilisateur connecté suit un autre utilisateur.
        Query params: ?user_id=uuid ou ?username=username
        """
        from apps.accounts.models import User

        user_id = request.query_params.get('user_id')
        username = request.query_params.get('username')

        if not user_id and not username:
            return Response(
                {'error': 'user_id ou username requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if user_id:
                target_user = User.objects.get(public_id=user_id)
            else:
                target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'Utilisateur non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

        is_following = UserFollow.objects.filter(
            follower=request.user,
            following=target_user,
            is_active=True
        ).exists()

        return Response({
            'is_following': is_following,
            'target_user': {
                'id': str(target_user.public_id),
                'username': target_user.username,
                'display_name': target_user.display_name,
            }
        })


# === Phase 9: Achievement/Badge System ViewSet ===

class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour les badges/réalisations (lecture seule).
    Les badges sont créés par les admins, les utilisateurs peuvent seulement les consulter.
    """
    queryset = Achievement.objects.filter(is_active=True)
    serializer_class = AchievementSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserAchievementViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les badges débloqués par l'utilisateur.
    Permet de voir la progression et de calculer automatiquement les badges.
    """
    serializer_class = UserAchievementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Retourne uniquement les badges de l'utilisateur connecté."""
        return UserAchievement.objects.filter(
            user=self.request.user
        ).select_related('achievement')

    @action(detail=False, methods=['post'])
    def calculate_and_award(self, request):
        """
        Calcule automatiquement la progression de tous les badges
        et débloque ceux qui atteignent le seuil.
        """
        from apps.content.models import Story

        user = request.user

        # Récupérer toutes les statistiques utilisateur
        stats = self._calculate_user_stats(user)

        # Map des critères vers les stats
        criteria_map = {
            'story_count': stats['story_count'],
            'like_count': stats['like_count'],
            'booking_count': stats['booking_count'],
            'itinerary_count': stats['itinerary_count'],
            'follower_count': stats['follower_count'],
            'following_count': stats['following_count'],
            'view_count': stats['view_count'],
            'comment_count': stats['comment_count'],
            'share_count': stats['share_count'],
        }

        # Récupérer tous les badges actifs
        achievements = Achievement.objects.filter(is_active=True)

        newly_earned = []

        for achievement in achievements:
            # Créer ou récupérer le UserAchievement
            user_achievement, created = UserAchievement.objects.get_or_create(
                user=user,
                achievement=achievement,
                defaults={'progress': 0, 'earned': False}
            )

            # Mettre à jour la progression
            progress_value = criteria_map.get(achievement.criteria_type, 0)
            user_achievement.progress = progress_value

            # Vérifier si le badge doit être débloqué
            if user_achievement.check_and_award():
                newly_earned.append(achievement.name)
            else:
                user_achievement.save()

        # Récupérer tous les badges de l'utilisateur
        user_achievements = UserAchievement.objects.filter(
            user=user
        ).select_related('achievement')

        serializer = self.get_serializer(user_achievements, many=True)

        return Response({
            'message': f'{len(newly_earned)} nouveau(x) badge(s) débloqué(s)' if newly_earned else 'Progression mise à jour',
            'newly_earned': newly_earned,
            'total_earned': user_achievements.filter(earned=True).count(),
            'total_available': achievements.count(),
            'achievements': serializer.data,
            'stats': stats,
        })

    def _calculate_user_stats(self, user):
        """Calcule toutes les statistiques de l'utilisateur."""
        from apps.content.models import Story
        from apps.travel.models import SavedItinerary

        # Récupérer les récits de l'utilisateur
        stories = Story.objects.filter(author=user)

        # Calculer les stats depuis les récits
        total_likes = sum(story.likes_count or 0 for story in stories)
        total_views = sum(story.views_count or 0 for story in stories)
        total_comments = sum(story.comments_count or 0 for story in stories)
        total_shares = sum(story.shares_count or 0 for story in stories)

        # Récupérer les itinéraires
        itineraries = SavedItinerary.objects.filter(user=user)

        # Récupérer les réservations
        bookings = Booking.objects.filter(user=user)

        # Récupérer les followers/following
        followers_count = UserFollow.objects.filter(following=user, is_active=True).count()
        following_count = UserFollow.objects.filter(follower=user, is_active=True).count()

        return {
            'story_count': stories.count(),
            'like_count': total_likes,
            'view_count': total_views,
            'comment_count': total_comments,
            'share_count': total_shares,
            'itinerary_count': itineraries.count(),
            'booking_count': bookings.count(),
            'follower_count': followers_count,
            'following_count': following_count,
        }
