"""
AI providers for story generation
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any

import requests
from django.conf import settings

from .models import StoryAIProviderConfig

logger = logging.getLogger(__name__)


class AIProviderException(Exception):
    """Exception raised when an AI provider fails"""
    pass


def generate_story_with_provider(provider: StoryAIProviderConfig, prompt_data: dict) -> dict | None:
    """
    Generate a travel story using the configured AI provider.

    Args:
        provider: The AI provider configuration
        prompt_data: Data to include in the prompt (mode, prompt/itinerary data)

    Returns:
        dict with generated story data (title, content, tags, location)

    Raises:
        AIProviderException: If generation fails
    """
    prompt = _build_story_prompt(prompt_data)

    if provider.provider == StoryAIProviderConfig.Provider.OPENAI:
        return _call_openai(provider, prompt)
    elif provider.provider == StoryAIProviderConfig.Provider.GEMINI:
        return _call_gemini(provider, prompt)
    elif provider.provider == StoryAIProviderConfig.Provider.PERPLEXITY:
        return _call_perplexity(provider, prompt)
    else:
        raise AIProviderException(f"Provider {provider.provider} non supporté.")


def _build_story_prompt(prompt_data: dict) -> str:
    """Build the prompt for story generation based on mode"""
    mode = prompt_data.get('mode', 'prompt')

    if mode == 'itinerary':
        itinerary = prompt_data.get('itinerary', {})
        title = itinerary.get('title', 'Carnet de voyage')
        trip = itinerary.get('itinerary_data', itinerary)
        trip_obj = trip.get('trip') if isinstance(trip, dict) else {}
        destinations = trip_obj.get('destinations') if isinstance(trip_obj, dict) else trip.get('destinations', [])

        destination_names = []
        if isinstance(destinations, list):
            for dest in destinations:
                city = dest.get('city') or dest.get('country')
                if city:
                    destination_names.append(city)

        destinations_str = ', '.join(destination_names) if destination_names else 'cette destination'

        prompt = (
            f"Tu es un écrivain de voyage professionnel. Génère un récit de voyage captivant en JSON pour {destinations_str}.\n\n"
            "Le récit doit être PERSONNEL, ÉMOTIONNEL et NARRATIF - comme un vrai carnet de voyage.\n\n"
            "Format JSON requis:\n"
            "{\n"
            '  "title": "Titre accrocheur du récit (50-100 caractères)",\n'
            '  "content": "Récit narratif détaillé en 3-5 paragraphes. Utilise le présent pour l\'immersion. '
            'Décris des moments précis, des rencontres, des émotions, des découvertes culinaires, des anecdotes. '
            'Évite les listes, privilégie la narration. Minimum 800 mots.",\n'
            '  "tags": ["3-5 tags pertinents"],\n'
            '  "location": "Lieu principal"\n'
            "}\n\n"
            f"Contexte du voyage:\nTitre: {title}\nDestinations: {destinations_str}\n\n"
            "IMPORTANT: Réponds UNIQUEMENT avec du JSON valide, sans texte avant/après."
        )
    else:
        user_prompt = prompt_data.get('prompt', 'une escapade créative')
        prompt = (
            f"Tu es un écrivain de voyage professionnel. Génère un récit de voyage inspirant en JSON basé sur: {user_prompt}\n\n"
            "Le récit doit être INSPIRANT, DESCRIPTIF et IMMERSIF.\n\n"
            "Format JSON requis:\n"
            "{\n"
            '  "title": "Titre accrocheur du récit",\n'
            '  "content": "Récit narratif en 3-5 paragraphes décrivant l\'expérience, les sensations, les découvertes. Minimum 600 mots.",\n'
            '  "tags": ["3-5 tags pertinents comme destinations, types d\'activités"],\n'
            '  "location": "Destination suggérée ou \'À définir\'"\n'
            "}\n\n"
            "IMPORTANT: Réponds UNIQUEMENT avec du JSON valide, sans texte avant/après."
        )

    return prompt


def _call_openai(provider: StoryAIProviderConfig, prompt: str) -> dict | None:
    """Call OpenAI API to generate story"""
    from .analytics import AIMetrics

    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise AIProviderException("OPENAI_API_KEY manquant dans la configuration.")

    model = provider.model_name or "gpt-4o-mini"
    url = f"{settings.OPENAI_API_BASE.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Tu es un écrivain de voyage créatif et passionné."},
            {"role": "user", "content": prompt},
        ],
        "temperature": float(provider.temperature),
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    start_time = time.time()
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        result = _safe_json_loads(content)

        # Log successful generation
        response_time_ms = (time.time() - start_time) * 1000
        AIMetrics.log_generation_attempt('openai', model, True, response_time_ms)

        return result
    except requests.RequestException as e:
        response_time_ms = (time.time() - start_time) * 1000
        AIMetrics.log_generation_attempt('openai', model, False, response_time_ms, str(e))
        logger.error(f"OpenAI API error: {e}")
        raise AIProviderException(f"Erreur OpenAI: {str(e)}")


def _call_gemini(provider: StoryAIProviderConfig, prompt: str) -> dict | None:
    """Call Gemini API to generate story"""
    from .analytics import AIMetrics

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise AIProviderException("GEMINI_API_KEY manquant dans la configuration.")

    model = provider.model_name or "gemini-2.5-flash"
    url = f"{settings.GEMINI_API_BASE.rstrip('/')}/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": float(provider.temperature),
            "responseMimeType": "application/json",
        },
    }

    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        result = _safe_json_loads(content)

        # Log successful generation
        response_time_ms = (time.time() - start_time) * 1000
        AIMetrics.log_generation_attempt('gemini', model, True, response_time_ms)

        return result
    except (requests.RequestException, KeyError, IndexError) as e:
        response_time_ms = (time.time() - start_time) * 1000
        AIMetrics.log_generation_attempt('gemini', model, False, response_time_ms, str(e))
        logger.error(f"Gemini API error: {e}")
        raise AIProviderException(f"Erreur Gemini: {str(e)}")


def _call_perplexity(provider: StoryAIProviderConfig, prompt: str) -> dict | None:
    """Call Perplexity API to generate story"""
    from .analytics import AIMetrics

    api_key = settings.PERPLEXITY_API_KEY
    if not api_key:
        raise AIProviderException("PERPLEXITY_API_KEY manquant dans la configuration.")

    model = provider.model_name or "sonar"
    url = f"{settings.PERPLEXITY_API_BASE.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Tu es un écrivain de voyage créatif et passionné."},
            {"role": "user", "content": prompt},
        ],
        "temperature": float(provider.temperature),
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    start_time = time.time()
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        result = _safe_json_loads(content)

        # Log successful generation
        response_time_ms = (time.time() - start_time) * 1000
        AIMetrics.log_generation_attempt('perplexity', model, True, response_time_ms)

        return result
    except requests.RequestException as e:
        response_time_ms = (time.time() - start_time) * 1000
        AIMetrics.log_generation_attempt('perplexity', model, False, response_time_ms, str(e))
        logger.error(f"Perplexity API error: {e}")
        raise AIProviderException(f"Erreur Perplexity: {str(e)}")


def _safe_json_loads(content: str | None) -> dict | None:
    """Safely parse JSON content from AI response"""
    if not content:
        return None

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning(f"Réponse IA non JSON: {content[:200]}")
        # Try to extract JSON from text
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(content[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise AIProviderException("Impossible de parser la réponse IA en JSON.")
