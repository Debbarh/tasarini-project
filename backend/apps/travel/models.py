from __future__ import annotations

import uuid

from django.db import models


class AIProviderConfig(models.Model):
    class Provider(models.TextChoices):
        OPENAI = 'openai', 'OpenAI'
        GEMINI = 'gemini', 'Gemini'
        PERPLEXITY = 'perplexity', 'Perplexity'
        OLLAMA = 'ollama', 'Ollama'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=50, choices=Provider.choices, unique=True)
    display_name = models.CharField(max_length=100)
    is_enabled = models.BooleanField(default=False)
    model_name = models.CharField(max_length=150, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=2, default=0.70)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_name']

    def __str__(self) -> str:
        return f"{self.get_provider_display()} ({'actif' if self.is_enabled else 'inactif'})"
