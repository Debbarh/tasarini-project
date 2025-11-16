"""
Service de gestion des emails pour l'authentification.
Gère l'envoi des emails de vérification, bienvenue et réinitialisation de mot de passe.
"""
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags


class EmailService:
    """Service centralisé pour l'envoi d'emails."""

    @staticmethod
    def send_verification_email(user, verification_url: str) -> bool:
        """
        Envoie un email de vérification à l'utilisateur.

        Args:
            user: L'utilisateur à qui envoyer l'email
            verification_url: URL complète de vérification avec token

        Returns:
            bool: True si l'email a été envoyé avec succès
        """
        try:
            html_message = render_to_string('emails/verify_email.html', {
                'user': user,
                'verification_url': verification_url,
                'frontend_url': settings.FRONTEND_URL,
            })
            plain_message = strip_tags(html_message)

            send_mail(
                subject='Vérifiez votre adresse email - Tasarini',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email de vérification: {e}")
            return False

    @staticmethod
    def send_welcome_email(user) -> bool:
        """
        Envoie un email de bienvenue après vérification réussie.

        Args:
            user: L'utilisateur qui vient de vérifier son email

        Returns:
            bool: True si l'email a été envoyé avec succès
        """
        try:
            html_message = render_to_string('emails/welcome.html', {
                'user': user,
                'frontend_url': settings.FRONTEND_URL,
            })
            plain_message = strip_tags(html_message)

            send_mail(
                subject='Bienvenue sur Tasarini!',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email de bienvenue: {e}")
            return False

    @staticmethod
    def send_password_reset_email(user, reset_url: str) -> bool:
        """
        Envoie un email de réinitialisation de mot de passe.

        Args:
            user: L'utilisateur qui demande la réinitialisation
            reset_url: URL complète de réinitialisation avec token

        Returns:
            bool: True si l'email a été envoyé avec succès
        """
        try:
            html_message = render_to_string('emails/password_reset.html', {
                'user': user,
                'reset_url': reset_url,
                'frontend_url': settings.FRONTEND_URL,
            })
            plain_message = strip_tags(html_message)

            send_mail(
                subject='Réinitialisation de votre mot de passe - Tasarini',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email de réinitialisation: {e}")
            return False

    @staticmethod
    def resend_verification_email(user) -> bool:
        """
        Renvoie l'email de vérification à l'utilisateur.
        Génère un nouveau token et envoie l'email.

        Args:
            user: L'utilisateur à qui renvoyer l'email

        Returns:
            bool: True si l'email a été renvoyé avec succès
        """
        if user.email_verified:
            return False  # Ne pas renvoyer si déjà vérifié

        # Générer un nouveau token
        token = user.generate_verification_token()
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

        return EmailService.send_verification_email(user, verification_url)
