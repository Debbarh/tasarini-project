from __future__ import annotations

import json
import logging
from typing import Any, Iterator, Generator

import requests
from django.conf import settings

from .models import AIProviderConfig

logger = logging.getLogger(__name__)


class AIProviderException(Exception):
    pass


def generate_itinerary_with_provider(provider: AIProviderConfig, trip_data: dict) -> dict | None:
    prompt = _build_prompt(trip_data)
    if provider.provider == AIProviderConfig.Provider.OPENAI:
        return _call_openai(provider, prompt)
    if provider.provider == AIProviderConfig.Provider.GEMINI:
        return _call_gemini(provider, prompt)
    if provider.provider == AIProviderConfig.Provider.PERPLEXITY:
        return _call_perplexity(provider, prompt)
    raise AIProviderException(f"Provider {provider.provider} non supporté.")


def _build_prompt(trip_data: dict) -> str:
    # Extract destination info for better context
    destinations_str = ", ".join([d.get('city', d.get('country', 'destination')) for d in trip_data.get('destinations', [])])

    return (
        f"Tu es un expert en voyage. Génère un itinéraire complet en JSON pour {destinations_str}. "
        "TOUTES les sections suivantes sont OBLIGATOIRES :\n\n"
        "{\n"
        '  "title": "string",\n'
        '  "description": "string",\n'
        '  "whyVisit": "string",\n'
        '  "totalBudget": number,\n'
        '  "budgetBreakdown": {"accommodation": number, "food": number, "activities": number, "transport": number, "shopping": number, "miscellaneous": number},\n'
        '  "bestTimeToVisit": {"overall": "string", "byDestination": {}, "seasons": {"spring": "string", "summer": "string", "autumn": "string", "winter": "string"}, "avoidPeriods": ["string"]},\n'
        '  "visaAndEntry": {"generalInfo": "string", "requirements": ["string"], "processingTime": "string", "cost": "string", "exemptions": ["string"], "entryRequirements": ["string"]},\n'
        '  "mustSee": ["string"],\n'
        '  "healthAndSafety": {"vaccinations": ["string"], "healthTips": ["string"], "insurance": "string", "emergencyNumbers": {"police": "string", "medical": "string", "embassy": "string"}, "safetyTips": ["string"], "waterQuality": "string", "foodSafety": "string"},\n'
        '  "mustTryDishes": [{"name": "string", "description": "string", "whereToFind": "string (noms précis restaurants/marchés)", "priceRange": "string", "dietaryInfo": "string"}],\n'
        '  "giftIdeas": [{"item": "string", "description": "string", "whereToBuy": "string (noms précis boutiques/marchés)", "priceRange": "string", "tips": "string"}],\n'
        '  "similarDestinations": [{"name": "string", "country": "string", "why": "string", "distance": "string", "bestFor": "string"}],\n'
        '  "culturalTips": ["Coutumes", "Pourboires", "Gestes à éviter", "Phrases utiles"],\n'
        '  "transportationAdvice": {"gettingThere": "string", "localTransport": {"metro": "string", "bus": "string", "taxi": "string", "bike": "string", "walking": "string"}, "transportCards": ["string"], "tips": ["string"]},\n'
        '  "packingList": ["string"],\n'
        '  "sustainabilityTips": ["string"],\n'
        '  "localEvents": [{"name": "string", "date": "string", "description": "string", "location": "string"}],\n'
        '  "days": [{"dayNumber": number, "date": "YYYY-MM-DD", "destination": "string", "theme": "string", "activities": [{"id": "string", "time": "HH:MM", "title": "string", "description": "string", "duration": "string", "type": "string", "cost": number, "location": "string", "tips": "string", "difficulty": "easy/moderate/hard"}], "dailyBudget": number, "transportation": "string", "meals": {"breakfast": {"title": "string", "location": "string", "cost": number}, "lunch": {"title": "string", "location": "string", "cost": number}, "dinner": {"title": "string", "location": "string", "cost": number}}, "totalCost": number, "walkingDistance": number}]\n'
        "}\n\n"
        "CRUCIAL : Génère TOUTES les sections ci-dessus (whyVisit, bestTimeToVisit, visaAndEntry, healthAndSafety, mustTryDishes, giftIdeas, etc). "
        "Réponds UNIQUEMENT avec du JSON valide, sans texte avant/après. "
        f"Utilise des vrais noms de lieux pour {destinations_str}. Prix réalistes en euros.\n\n"
        f"Données: {json.dumps(trip_data, ensure_ascii=False, indent=2)}"
    )


def _call_openai(provider: AIProviderConfig, prompt: str) -> dict | None:
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise AIProviderException("OPENAI_API_KEY manquant.")
    url = f"{settings.OPENAI_API_BASE.rstrip('/')}/chat/completions"
    payload = {
        "model": provider.model_name or "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "Tu es un planificateur de voyage expert."},
            {"role": "user", "content": prompt},
        ],
        "temperature": float(provider.temperature),
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    response = requests.post(url, json=payload, headers=headers, timeout=90)
    if response.status_code >= 400:
        raise AIProviderException(f"OpenAI error: {response.status_code} - {response.text}")
    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    return _safe_json_loads(content)


def _call_gemini(provider: AIProviderConfig, prompt: str) -> dict | None:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise AIProviderException("GEMINI_API_KEY manquant.")
    model = provider.model_name or "gemini-1.5-pro"
    url = f"{settings.GEMINI_API_BASE.rstrip('/')}/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": float(provider.temperature),
            "responseMimeType": "application/json",
        },
    }
    response = requests.post(url, json=payload, timeout=90)
    if response.status_code >= 400:
        raise AIProviderException(f"Gemini error: {response.status_code} - {response.text}")
    data = response.json()
    try:
        content = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:  # pragma: no cover - defensive
        raise AIProviderException(f"Réponse Gemini invalide: {data}") from exc
    return _safe_json_loads(content)


def _call_perplexity(provider: AIProviderConfig, prompt: str) -> dict | None:
    api_key = settings.PERPLEXITY_API_KEY
    if not api_key:
        raise AIProviderException("PERPLEXITY_API_KEY manquant.")
    url = f"{settings.PERPLEXITY_API_BASE.rstrip('/')}/chat/completions"
    payload = {
        "model": provider.model_name or "sonar",
        "messages": [
            {"role": "system", "content": "Tu es un planificateur de voyage expert."},
            {"role": "user", "content": prompt},
        ],
        "temperature": float(provider.temperature),
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    response = requests.post(url, json=payload, headers=headers, timeout=90)
    if response.status_code >= 400:
        raise AIProviderException(f"Perplexity error: {response.status_code} - {response.text}")
    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    return _safe_json_loads(content)


def _safe_json_loads(content: str | None) -> dict | None:
    if not content:
        return None
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning("Réponse IA non JSON: %s", content)
        # Essayer de récupérer JSON dans texte
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(content[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise AIProviderException("Impossible de parser la réponse IA en JSON.")


# ============================================================================
# STREAMING FUNCTIONS - Token-by-token generation
# ============================================================================

def generate_itinerary_with_provider_streaming(provider: AIProviderConfig, trip_data: dict) -> Generator[str, None, None]:
    """
    Stream itinerary generation token by token.
    Yields text chunks as they arrive from the AI provider.
    """
    prompt = _build_prompt(trip_data)
    if provider.provider == AIProviderConfig.Provider.OPENAI:
        yield from _stream_openai(provider, prompt)
    elif provider.provider == AIProviderConfig.Provider.GEMINI:
        yield from _stream_gemini(provider, prompt)
    elif provider.provider == AIProviderConfig.Provider.PERPLEXITY:
        yield from _stream_perplexity(provider, prompt)
    else:
        raise AIProviderException(f"Provider {provider.provider} non supporté pour le streaming.")


def _stream_openai(provider: AIProviderConfig, prompt: str) -> Generator[str, None, None]:
    """Stream tokens from OpenAI API"""
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise AIProviderException("OPENAI_API_KEY manquant.")

    url = f"{settings.OPENAI_API_BASE.rstrip('/')}/chat/completions"
    payload = {
        "model": provider.model_name or "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "Tu es un planificateur de voyage expert."},
            {"role": "user", "content": prompt},
        ],
        "temperature": float(provider.temperature),
        "response_format": {"type": "json_object"},
        "stream": True,  # Enable streaming
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        with requests.post(url, json=payload, headers=headers, timeout=120, stream=True) as response:
            if response.status_code >= 400:
                raise AIProviderException(f"OpenAI error: {response.status_code} - {response.text}")

            for line in response.iter_lines():
                if not line:
                    continue

                line = line.decode('utf-8')

                # OpenAI SSE format: "data: {json}"
                if line.startswith('data: '):
                    data_str = line[6:]  # Remove "data: " prefix

                    # Check for end of stream
                    if data_str == '[DONE]':
                        break

                    try:
                        data = json.loads(data_str)
                        delta = data.get('choices', [{}])[0].get('delta', {})
                        content = delta.get('content', '')

                        if content:
                            yield content
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse OpenAI streaming chunk: {data_str}")
                        continue

    except requests.exceptions.RequestException as e:
        raise AIProviderException(f"OpenAI streaming error: {str(e)}")


def _stream_gemini(provider: AIProviderConfig, prompt: str) -> Generator[str, None, None]:
    """Stream tokens from Gemini API"""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise AIProviderException("GEMINI_API_KEY manquant.")

    model = provider.model_name or "gemini-1.5-pro"
    url = f"{settings.GEMINI_API_BASE.rstrip('/')}/models/{model}:streamGenerateContent?key={api_key}&alt=sse"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": float(provider.temperature),
            "responseMimeType": "application/json",
        },
    }

    try:
        with requests.post(url, json=payload, timeout=120, stream=True) as response:
            if response.status_code >= 400:
                raise AIProviderException(f"Gemini error: {response.status_code} - {response.text}")

            for line in response.iter_lines():
                if not line:
                    continue

                line = line.decode('utf-8')

                # Gemini SSE format: "data: {json}"
                if line.startswith('data: '):
                    data_str = line[6:]

                    try:
                        data = json.loads(data_str)
                        candidates = data.get('candidates', [])
                        if candidates:
                            content = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                            if content:
                                yield content
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse Gemini streaming chunk: {data_str}")
                        continue

    except requests.exceptions.RequestException as e:
        raise AIProviderException(f"Gemini streaming error: {str(e)}")


def _stream_perplexity(provider: AIProviderConfig, prompt: str) -> Generator[str, None, None]:
    """Stream tokens from Perplexity API"""
    api_key = settings.PERPLEXITY_API_KEY
    if not api_key:
        raise AIProviderException("PERPLEXITY_API_KEY manquant.")

    url = f"{settings.PERPLEXITY_API_BASE.rstrip('/')}/chat/completions"
    payload = {
        "model": provider.model_name or "sonar",
        "messages": [
            {"role": "system", "content": "Tu es un planificateur de voyage expert."},
            {"role": "user", "content": prompt},
        ],
        "temperature": float(provider.temperature),
        "stream": True,  # Enable streaming
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        with requests.post(url, json=payload, headers=headers, timeout=120, stream=True) as response:
            if response.status_code >= 400:
                raise AIProviderException(f"Perplexity error: {response.status_code} - {response.text}")

            for line in response.iter_lines():
                if not line:
                    continue

                line = line.decode('utf-8')

                # Perplexity uses OpenAI-compatible format
                if line.startswith('data: '):
                    data_str = line[6:]

                    if data_str == '[DONE]':
                        break

                    try:
                        data = json.loads(data_str)
                        delta = data.get('choices', [{}])[0].get('delta', {})
                        content = delta.get('content', '')

                        if content:
                            yield content
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse Perplexity streaming chunk: {data_str}")
                        continue

    except requests.exceptions.RequestException as e:
        raise AIProviderException(f"Perplexity streaming error: {str(e)}")


# ============================================================================
# PARTIAL / SECTION GENERATION HELPERS
# ============================================================================

def call_provider_with_prompt(provider: AIProviderConfig, prompt: str) -> dict | None:
    """
    Generic call to the provider with a custom prompt (non-streaming).
    Returns parsed JSON or raises AIProviderException on failure.
    """
    if provider.provider == AIProviderConfig.Provider.OPENAI:
        return _call_openai(provider, prompt)
    if provider.provider == AIProviderConfig.Provider.GEMINI:
        return _call_gemini(provider, prompt)
    if provider.provider == AIProviderConfig.Provider.PERPLEXITY:
        return _call_perplexity(provider, prompt)
    raise AIProviderException(f"Provider {provider.provider} non supporté.")
