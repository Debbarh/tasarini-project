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
