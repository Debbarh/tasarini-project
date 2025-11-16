"""
Middleware pour la gestion automatique des sessions utilisateur.
"""
from django.utils.deprecation import MiddlewareMixin
from .session_utils import update_session_activity


class UserSessionMiddleware(MiddlewareMixin):
    """
    Middleware qui crée ou met à jour automatiquement une UserSession
    lorsqu'un utilisateur authentifié fait une requête.
    """

    def process_request(self, request):
        """
        Appelé avant que la vue ne soit exécutée.
        """
        # Vérifier si l'utilisateur est authentifié
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Créer ou mettre à jour la session
            try:
                update_session_activity(request.user, request)
            except Exception as e:
                # En cas d'erreur, logger mais ne pas bloquer la requête
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error updating user session: {e}")

        return None
