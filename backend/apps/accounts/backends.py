"""
Backend d'authentification custom pour permettre la connexion par email.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Backend d'authentification permettant la connexion avec l'email au lieu du username.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authentifie un utilisateur en utilisant son email.

        Args:
            request: La requête HTTP
            username: L'email de l'utilisateur (même si le paramètre s'appelle username)
            password: Le mot de passe de l'utilisateur

        Returns:
            User: L'utilisateur authentifié ou None
        """
        # Le paramètre 'username' contient en fait l'email
        email = username or kwargs.get('email')

        if email is None or password is None:
            return None

        try:
            # Chercher l'utilisateur par email (insensible à la casse)
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Exécuter le hasheur de mot de passe par défaut une fois pour réduire
            # le temps nécessaire pour attaquer par force brute
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            # Plusieurs utilisateurs avec le même email (ne devrait pas arriver)
            # Prendre le premier trouvé
            user = User.objects.filter(email__iexact=email).first()

        # Vérifier le mot de passe et que l'utilisateur peut s'authentifier
        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None
