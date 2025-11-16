"""
Permissions et décorateurs pour le système de rôles Tasarini.

Ce module fournit des décorateurs et des classes de permission pour gérer
l'accès aux vues en fonction des rôles utilisateur.
"""
from functools import wraps
from typing import List, Optional

from django.http import JsonResponse
from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView

from .models import User, UserRole


# ============================================================================
# REST Framework Permission Classes
# ============================================================================

class IsGuest(permissions.BasePermission):
    """Permission pour les invités (non authentifiés)."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return not request.user.is_authenticated or request.user.is_guest()


class IsUser(permissions.BasePermission):
    """Permission pour les utilisateurs standards."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.is_user()


class IsPartner(permissions.BasePermission):
    """Permission pour les partenaires."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.is_partner()


class IsPartnerActive(permissions.BasePermission):
    """Permission pour les partenaires avec abonnement actif."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return (
            request.user.is_authenticated
            and request.user.is_partner()
            and request.user.is_partner_subscription_active()
        )


class IsEditor(permissions.BasePermission):
    """Permission pour les éditeurs."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.is_editor()


class IsEditorApproved(permissions.BasePermission):
    """Permission pour les éditeurs approuvés."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return (
            request.user.is_authenticated
            and request.user.is_editor()
            and request.user.editor_content_approved
        )


class IsAdmin(permissions.BasePermission):
    """Permission pour les administrateurs."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.is_admin()


class IsSuperAdmin(permissions.BasePermission):
    """Permission pour les super administrateurs."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.is_super_admin()


class IsStaffOrAbove(permissions.BasePermission):
    """Permission pour Admin et Super Admin."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and (
            request.user.is_admin() or request.user.is_super_admin()
        )


class CanManageUsers(permissions.BasePermission):
    """Permission pour gérer les utilisateurs."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.can_manage_users()


class CanManagePartners(permissions.BasePermission):
    """Permission pour gérer les partenaires."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.can_manage_partners()


class CanModerateContent(permissions.BasePermission):
    """Permission pour modérer le contenu."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.can_moderate_content()


class CanManagePOIs(permissions.BasePermission):
    """Permission pour gérer tous les POIs."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.can_manage_pois()


class CanAccessAnalytics(permissions.BasePermission):
    """Permission pour accéder aux analytics."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.can_access_analytics()


class CanManageSystemSettings(permissions.BasePermission):
    """Permission pour gérer les paramètres système."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.can_manage_system_settings()


class HasRoleOrHigher(permissions.BasePermission):
    """
    Permission pour vérifier si l'utilisateur a un rôle spécifique ou supérieur.
    Utilisation: Définir self.required_role dans la vue.
    """

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not request.user.is_authenticated:
            return False

        required_role = getattr(view, 'required_role', UserRole.USER)
        return request.user.has_role_or_higher(required_role)


class IsEmailVerified(permissions.BasePermission):
    """Permission pour vérifier que l'email est vérifié."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.is_authenticated and request.user.email_verified


# ============================================================================
# Function-based View Decorators
# ============================================================================

def require_role(*roles: str):
    """
    Décorateur pour exiger un ou plusieurs rôles spécifiques.

    Usage:
        @require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'detail': 'Authentification requise.'},
                    status=401
                )

            if request.user.role not in roles:
                return JsonResponse(
                    {'detail': 'Permissions insuffisantes.'},
                    status=403
                )

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_role_or_higher(role: str):
    """
    Décorateur pour exiger un rôle minimum.

    Usage:
        @require_role_or_higher(UserRole.EDITOR)
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'detail': 'Authentification requise.'},
                    status=401
                )

            if not request.user.has_role_or_higher(role):
                return JsonResponse(
                    {'detail': 'Permissions insuffisantes.'},
                    status=403
                )

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_email_verified(view_func):
    """
    Décorateur pour exiger que l'email soit vérifié.

    Usage:
        @require_email_verified
        def my_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse(
                {'detail': 'Authentification requise.'},
                status=401
            )

        if not request.user.email_verified:
            return JsonResponse(
                {'detail': 'Veuillez vérifier votre email avant de continuer.'},
                status=403
            )

        return view_func(request, *args, **kwargs)
    return wrapper


def require_partner_active(view_func):
    """
    Décorateur pour exiger un abonnement partenaire actif.

    Usage:
        @require_partner_active
        def my_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse(
                {'detail': 'Authentification requise.'},
                status=401
            )

        if not request.user.is_partner():
            return JsonResponse(
                {'detail': 'Compte partenaire requis.'},
                status=403
            )

        if not request.user.is_partner_subscription_active():
            return JsonResponse(
                {'detail': 'Votre abonnement partenaire a expiré. Veuillez renouveler.'},
                status=403
            )

        return view_func(request, *args, **kwargs)
    return wrapper


def require_editor_approved(view_func):
    """
    Décorateur pour exiger un éditeur approuvé.

    Usage:
        @require_editor_approved
        def my_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse(
                {'detail': 'Authentification requise.'},
                status=401
            )

        if not request.user.is_editor():
            return JsonResponse(
                {'detail': 'Compte éditeur requis.'},
                status=403
            )

        if not request.user.editor_content_approved:
            return JsonResponse(
                {'detail': 'Votre compte éditeur est en attente d\'approbation.'},
                status=403
            )

        return view_func(request, *args, **kwargs)
    return wrapper


def require_2fa(view_func):
    """
    Décorateur pour exiger l'authentification à deux facteurs.

    Usage:
        @require_2fa
        def my_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse(
                {'detail': 'Authentification requise.'},
                status=401
            )

        if request.user.requires_2fa and not request.user.two_factor_enabled:
            return JsonResponse(
                {'detail': 'L\'authentification à deux facteurs est requise pour ce compte.'},
                status=403
            )

        return view_func(request, *args, **kwargs)
    return wrapper


# ============================================================================
# Permission Checker Helper
# ============================================================================

class PermissionChecker:
    """
    Classe utilitaire pour vérifier les permissions de manière programmatique.

    Usage:
        checker = PermissionChecker(request.user)
        if checker.can_create_poi():
            ...
    """

    def __init__(self, user: User):
        self.user = user

    def can_create_poi(self) -> bool:
        """Vérifie si l'utilisateur peut créer un POI."""
        if not self.user.is_authenticated:
            return False

        if self.user.role in [UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            return True

        if self.user.is_partner():
            if not self.user.is_partner_subscription_active():
                return False

            max_pois = self.user.get_max_pois()
            if max_pois == -1:  # Illimité
                return True

            # Compter les POIs existants
            from apps.poi.models import TouristPoint
            current_poi_count = TouristPoint.objects.filter(
                created_by=self.user
            ).count()

            return current_poi_count < max_pois

        return False

    def can_edit_poi(self, poi) -> bool:
        """Vérifie si l'utilisateur peut éditer un POI spécifique."""
        if not self.user.is_authenticated:
            return False

        # Admins et Super Admins peuvent tout éditer
        if self.user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            return True

        # Editors peuvent éditer tous les POIs
        if self.user.is_editor() and self.user.editor_content_approved:
            return True

        # Partners peuvent éditer leurs propres POIs
        if self.user.is_partner() and poi.created_by == self.user:
            return self.user.is_partner_subscription_active()

        return False

    def can_delete_poi(self, poi) -> bool:
        """Vérifie si l'utilisateur peut supprimer un POI."""
        if not self.user.is_authenticated:
            return False

        # Seuls Admins et Super Admins peuvent supprimer
        if self.user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            return True

        # Partners peuvent supprimer leurs propres POIs
        if self.user.is_partner() and poi.created_by == self.user:
            return True

        return False

    def can_approve_content(self) -> bool:
        """Vérifie si l'utilisateur peut approuver du contenu."""
        return self.user.is_authenticated and self.user.can_moderate_content()

    def can_view_analytics(self) -> bool:
        """Vérifie si l'utilisateur peut voir les analytics."""
        return self.user.is_authenticated and self.user.can_access_analytics()

    def can_manage_subscriptions(self) -> bool:
        """Vérifie si l'utilisateur peut gérer les abonnements."""
        return self.user.is_authenticated and self.user.role in [
            UserRole.ADMIN,
            UserRole.SUPER_ADMIN
        ]

    def can_assign_roles(self) -> bool:
        """Vérifie si l'utilisateur peut assigner des rôles."""
        return self.user.is_authenticated and self.user.is_super_admin()

    def get_dashboard_permissions(self) -> dict:
        """Retourne un dictionnaire de toutes les permissions pour le dashboard."""
        return {
            'can_create_poi': self.can_create_poi(),
            'can_approve_content': self.can_approve_content(),
            'can_view_analytics': self.can_view_analytics(),
            'can_manage_users': self.user.can_manage_users(),
            'can_manage_partners': self.user.can_manage_partners(),
            'can_manage_subscriptions': self.can_manage_subscriptions(),
            'can_assign_roles': self.can_assign_roles(),
            'can_manage_system_settings': self.user.can_manage_system_settings(),
            'max_pois': self.user.get_max_pois(),
            'is_partner_active': self.user.is_partner_subscription_active() if self.user.is_partner() else None,
            'is_editor_approved': self.user.editor_content_approved if self.user.is_editor() else None,
            'requires_2fa': self.user.requires_2fa,
            'two_factor_enabled': self.user.two_factor_enabled,
        }
