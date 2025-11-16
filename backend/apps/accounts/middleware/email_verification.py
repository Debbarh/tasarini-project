"""
Middleware pour vérifier que les utilisateurs ont vérifié leur email.

Ce middleware bloque l'accès à la plupart des endpoints API pour les utilisateurs
dont l'email n'a pas été vérifié, sauf pour les endpoints liés à l'authentification
et à la vérification d'email.
"""
from django.http import JsonResponse


class EmailVerificationMiddleware:
    """
    Middleware qui bloque les utilisateurs non vérifiés.

    Les utilisateurs doivent vérifier leur email avant d'accéder à la plupart
    des fonctionnalités de l'API.
    """

    # Chemins exemptés de la vérification email
    EXEMPTED_PATHS = [
        # Authentication
        '/api/auth/register/',
        '/api/auth/verify-email/',
        '/api/auth/resend-verification/',
        '/api/auth/request-password-reset/',
        '/api/auth/reset-password/',
        '/api/token/',
        '/api/token/refresh/',

        # Admin
        '/admin/',

        # API Documentation
        '/api/schema/',
        '/api/docs/',

        # Static files
        '/static/',
        '/media/',
    ]

    # Préfixes de chemins exemptés (pour les chemins qui commencent par...)
    EXEMPTED_PREFIXES = [
        '/admin/',
        '/static/',
        '/media/',
        '/api/schema/',
        '/api/docs/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Vérifier si l'utilisateur est authentifié
        if request.user.is_authenticated:
            # Vérifier si le chemin est exempté
            if not self._is_exempted_path(request.path):
                # Vérifier si l'email est vérifié
                if not request.user.email_verified:
                    # Exceptions pour certains rôles
                    # Les super admins peuvent bypasser la vérification email
                    if not request.user.is_super_admin():
                        return JsonResponse(
                            {
                                'detail': 'Veuillez vérifier votre email avant de continuer.',
                                'error_code': 'EMAIL_NOT_VERIFIED',
                                'email': request.user.email,
                                'resend_url': '/api/auth/resend-verification/'
                            },
                            status=403
                        )

        response = self.get_response(request)
        return response

    def _is_exempted_path(self, path: str) -> bool:
        """Vérifie si le chemin est exempté de la vérification email."""
        # Vérifier les chemins exacts
        if path in self.EXEMPTED_PATHS:
            return True

        # Vérifier les préfixes
        for prefix in self.EXEMPTED_PREFIXES:
            if path.startswith(prefix):
                return True

        return False


class RoleBasedAccessMiddleware:
    """
    Middleware pour restreindre l'accès en fonction du rôle utilisateur.

    Ce middleware peut être utilisé pour bloquer certains rôles d'accéder
    à certaines parties de l'API.
    """

    # Chemins qui nécessitent un rôle minimum
    ROLE_RESTRICTED_PATHS = {
        '/api/v1/admin/': ['admin', 'super_admin'],
        '/api/v1/partners/': ['partner', 'editor', 'admin', 'super_admin'],
        '/api/v1/content/': ['editor', 'admin', 'super_admin'],
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Vérifier si l'utilisateur est authentifié
        if request.user.is_authenticated:
            # Vérifier les restrictions de rôle
            for path_prefix, allowed_roles in self.ROLE_RESTRICTED_PATHS.items():
                if request.path.startswith(path_prefix):
                    if request.user.role not in allowed_roles:
                        return JsonResponse(
                            {
                                'detail': 'Vous n\'avez pas la permission d\'accéder à cette ressource.',
                                'error_code': 'INSUFFICIENT_ROLE',
                                'required_roles': allowed_roles,
                                'your_role': request.user.role
                            },
                            status=403
                        )

        response = self.get_response(request)
        return response


class PartnerSubscriptionMiddleware:
    """
    Middleware pour vérifier que les partenaires ont un abonnement actif.
    """

    # Chemins nécessitant un abonnement partenaire actif
    SUBSCRIPTION_REQUIRED_PATHS = [
        '/api/v1/poi/tourist-points/',  # Création/édition de POIs
        '/api/v1/partners/analytics/',
    ]

    # Chemins exemptés pour les partenaires
    EXEMPTED_PATHS = [
        '/api/v1/partners/subscriptions/checkout/',
        '/api/v1/partners/profiles/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Vérifier si l'utilisateur est un partenaire
        if request.user.is_authenticated and request.user.is_partner():
            # Vérifier si le chemin nécessite un abonnement actif
            if self._requires_active_subscription(request.path, request.method):
                # Vérifier si l'abonnement est actif
                if not request.user.is_partner_subscription_active():
                    return JsonResponse(
                        {
                            'detail': 'Votre abonnement partenaire a expiré. Veuillez renouveler votre abonnement.',
                            'error_code': 'SUBSCRIPTION_EXPIRED',
                            'partner_tier': request.user.partner_tier,
                            'trial_ends_at': request.user.partner_trial_ends_at,
                            'subscription_ends_at': request.user.partner_subscription_ends_at,
                            'checkout_url': '/api/v1/partners/subscriptions/checkout/'
                        },
                        status=403
                    )

        response = self.get_response(request)
        return response

    def _requires_active_subscription(self, path: str, method: str) -> bool:
        """Vérifie si le chemin nécessite un abonnement actif."""
        # Exemptions
        for exempted_path in self.EXEMPTED_PATHS:
            if path.startswith(exempted_path):
                return False

        # Vérifier si c'est une opération de création/modification
        # GET ne nécessite pas d'abonnement actif
        if method == 'GET':
            return False

        # Vérifier les chemins nécessitant un abonnement
        for required_path in self.SUBSCRIPTION_REQUIRED_PATHS:
            if path.startswith(required_path):
                return True

        return False


class TwoFactorAuthMiddleware:
    """
    Middleware pour exiger l'authentification à deux facteurs pour certains rôles.
    """

    # Rôles nécessitant 2FA
    ROLES_REQUIRING_2FA = ['super_admin']

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Vérifier si l'utilisateur est authentifié
        if request.user.is_authenticated:
            # Vérifier si le rôle nécessite 2FA
            if request.user.role in self.ROLES_REQUIRING_2FA:
                if request.user.requires_2fa and not request.user.two_factor_enabled:
                    # Exemption pour les chemins de configuration 2FA
                    if not request.path.startswith('/api/v1/accounts/2fa/'):
                        return JsonResponse(
                            {
                                'detail': 'L\'authentification à deux facteurs est requise pour ce compte.',
                                'error_code': '2FA_REQUIRED',
                                'setup_url': '/api/v1/accounts/2fa/setup/'
                            },
                            status=403
                        )

        response = self.get_response(request)
        return response
