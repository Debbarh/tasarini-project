from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError, ProgrammingError

from apps.travel.models import AIProviderConfig


class Command(BaseCommand):
    help = "Vérifie que chaque fournisseur IA actif dispose des clés API nécessaires."

    def handle(self, *args, **options):
        try:
            providers = list(AIProviderConfig.objects.filter(is_enabled=True))
        except (OperationalError, ProgrammingError) as exc:  # pragma: no cover - defensive
            raise CommandError(
                "Impossible de vérifier les fournisseurs IA : base non migrée ou inaccessible."
            ) from exc

        if not providers:
            self.stdout.write(self.style.WARNING("Aucun fournisseur IA actif."))
            return

        missing = []
        for provider in providers:
            env_name, value = self._required_env(provider)
            if env_name and not value:
                missing.append((provider.display_name, env_name))

        if missing:
            for display_name, env_name in missing:
                self.stderr.write(
                    self.style.ERROR(
                        f"{display_name} est actif mais la variable {env_name} est absente."
                    )
                )
            raise CommandError(
                "Des fournisseurs IA sont actifs sans configuration API. "
                "Définissez les variables nécessaires puis relancez la commande."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(providers)} fournisseur(s) IA actif(s) correctement configuré(s)."
            )
        )

    def _required_env(self, provider: AIProviderConfig) -> tuple[str | None, str | None]:
        if provider.provider == AIProviderConfig.Provider.OPENAI:
            return "OPENAI_API_KEY", settings.OPENAI_API_KEY
        if provider.provider == AIProviderConfig.Provider.GEMINI:
            return "GEMINI_API_KEY", settings.GEMINI_API_KEY
        if provider.provider == AIProviderConfig.Provider.PERPLEXITY:
            return "PERPLEXITY_API_KEY", settings.PERPLEXITY_API_KEY
        return None, None
