from __future__ import annotations

import hashlib
import json
import logging
import math
import random
import threading
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List

import requests
from django.core.cache import cache
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from django.http import StreamingHttpResponse

from apps.analytics.models import TravelAnalytics
from apps.poi.models import FavoriteTouristPoint, TouristPoint
from .ai_providers import (
    AIProviderException,
    generate_itinerary_with_provider,
    generate_itinerary_with_provider_streaming,
    _safe_json_loads,
    call_provider_with_prompt,
)
from .models import AIProviderConfig
from .serializers import AIProviderConfigSerializer
from .unsplash_service import fetch_all_destination_images
from .wikimedia_service import fetch_all_activity_images
from .amadeus_service import amadeus_api, find_airport_by_city
from .hotelbeds_service import hotelbeds_api
from .hotelbeds_activities_service import hotelbeds_activities_api
from .kayak_service import kayak_api

logger = logging.getLogger(__name__)


class EnhancedTripPlannerView(APIView):
    """
    Simplified replacement for the Supabase `enhanced-trip-planner` edge function.
    Generates a deterministic itinerary based on the provided trip data.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        trip_data = request.data.get('tripData')
        if not trip_data:
            return Response({'detail': 'tripData requis'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate cache key from trip parameters (exclude sessionId for cache sharing)
        cache_key_data = {
            'destinations': trip_data.get('destinations', []),
            'startDate': trip_data.get('startDate'),
            'budget': trip_data.get('budget'),
            'groupType': trip_data.get('groupType'),
            'preferences': trip_data.get('preferences', {}),
        }
        cache_key = f"itinerary_{hashlib.md5(json.dumps(cache_key_data, sort_keys=True).encode()).hexdigest()}"

        # Check cache first (5 minute TTL)
        cached_response = cache.get(cache_key)
        if cached_response:
            logger.info(f"Cache HIT for {cache_key[:16]}... - returning cached itinerary")
            # Still save analytics with new session (async, non-blocking)
            session_id = request.data.get('sessionId') or trip_data.get('sessionId')
            if session_id:
                self._save_ai_results(
                    session_id,
                    cached_response['itinerary'],
                    cached_response.get('ai_provider'),
                    cached_response.get('used_ai', False)
                )
            return Response(cached_response)

        logger.info(f"Cache MISS for {cache_key[:16]}... - generating new itinerary")

        # Get session_id for progress tracking
        session_id = request.data.get('sessionId') or trip_data.get('sessionId')

        # Set initial progress (10%)
        if session_id:
            cache.set(f"progress_{session_id}", {
                'step': 'ai_generation',
                'progress': 10,
                'message': "Génération de l'itinéraire avec l'IA..."
            }, timeout=300)

        # Generate itinerary with AI or fallback
        ai_result = self._generate_with_ai(trip_data)
        ai_itinerary = ai_result['itinerary'] if ai_result else None
        ai_provider_name = ai_result['provider'] if ai_result else None

        itinerary = ai_itinerary or self._build_itinerary(trip_data)
        used_ai = ai_itinerary is not None

        # Update progress after AI generation (60%)
        if session_id:
            cache.set(f"progress_{session_id}", {
                'step': 'finalizing',
                'progress': 60,
                'message': "Finalisation de votre itinéraire..."
            }, timeout=300)

        # Return itinerary WITHOUT images for faster response
        # Fetch images in background thread (lazy loading)
        itinerary['destinationImages'] = {}

        destinations = trip_data.get('destinations', [])
        if destinations and session_id:
            def fetch_images_async():
                """Background thread to fetch destination images"""
                try:
                    images = fetch_all_destination_images(destinations)
                    # Store in cache for frontend to fetch via DestinationImagesView
                    cache.set(f"dest_images_{session_id}", images, timeout=600)
                    logger.info(f"Fetched images for session {session_id} in background")
                except Exception as exc:
                    logger.error(f"Error fetching images in background: {exc}")

            # Start background thread (non-blocking)
            thread = threading.Thread(target=fetch_images_async, daemon=True)
            thread.start()

        # Update progress (90%)
        if session_id:
            cache.set(f"progress_{session_id}", {
                'step': 'complete',
                'progress': 90,
                'message': "Itinéraire prêt ! Chargement des images en cours..."
            }, timeout=300)

        # Save AI results to analytics if session_id is provided
        if session_id:
            self._save_ai_results(session_id, itinerary, ai_provider_name, used_ai)

        # Prepare response
        response_data = {
            'itinerary': itinerary,
            'hasUserContext': bool(request.user and request.user.is_authenticated),
            'hasLocalContext': True,
            'hasAIContext': used_ai,
            'ai_provider': ai_provider_name,
            'used_ai': used_ai,
        }

        # Cache the response (5 minutes = 300 seconds)
        cache.set(cache_key, response_data, timeout=300)
        logger.info(f"Cached itinerary with key {cache_key[:16]}... (TTL: 5 min)")

        # Set final progress (100%)
        if session_id:
            cache.set(f"progress_{session_id}", {
                'step': 'complete',
                'progress': 100,
                'message': "Terminé !"
            }, timeout=300)

        return Response(response_data)

    def _generate_with_ai(self, trip_data: Dict[str, Any]) -> Dict[str, Any] | None:
        """Generate itinerary with AI and return both itinerary and provider info"""
        provider = (
            AIProviderConfig.objects.filter(is_enabled=True)
            .order_by('display_name')
            .first()
        )
        if not provider:
            return None
        try:
            itinerary = generate_itinerary_with_provider(provider, trip_data)
            if itinerary:
                # CRITICAL FIX: Add 'trip' property to AI-generated itinerary
                # The frontend requires itinerary.trip to be present
                itinerary['trip'] = trip_data

                # Ensure practicalInfo and recommendations are present with defaults
                if 'practicalInfo' not in itinerary:
                    destinations = trip_data.get('destinations', [])
                    itinerary['practicalInfo'] = self._build_practical_info(destinations)
                if 'recommendations' not in itinerary:
                    destinations = trip_data.get('destinations', [])
                    itinerary['recommendations'] = self._build_recommendations(destinations)
                if 'totalCost' not in itinerary:
                    itinerary['totalCost'] = itinerary.get('totalBudget', 0)

                return {
                    'itinerary': itinerary,
                    'provider': provider.provider,
                }
            return None
        except AIProviderException as exc:
            logger.warning("AI provider error (%s): %s", provider.provider, exc)
            return None

    def _save_ai_results(self, session_id: str, itinerary: Dict[str, Any], provider_name: str | None, used_ai: bool):
        """Save AI-generated results to TravelAnalytics asynchronously (non-blocking)"""
        def _async_save():
            try:
                TravelAnalytics.objects.filter(session_id=session_id).update(
                    ai_generated_itinerary=itinerary,
                    ai_provider_used=provider_name,
                    used_ai=used_ai,
                )
                logger.info("Saved AI results for session %s (provider: %s, used_ai: %s)", session_id, provider_name, used_ai)
            except Exception as exc:
                logger.warning("Failed to save AI results for session %s: %s", session_id, exc)

        # Fire and forget - don't block response
        thread = threading.Thread(target=_async_save, daemon=True)
        thread.start()

    def _build_itinerary(self, trip_data: Dict[str, Any]) -> Dict[str, Any]:
        destinations = trip_data.get('destinations') or []
        start_date = self._parse_date(trip_data.get('startDate'))
        days: List[Dict[str, Any]] = []

        if not destinations:
            destinations = [
                {
                    'city': 'Destination Surprise',
                    'country': 'N/A',
                    'duration': 3,
                }
            ]

        total_cost = 0
        day_counter = 0

        for destination in destinations:
            duration = max(int(destination.get('duration') or 1), 1)
            city_name = destination.get('city') or destination.get('country') or 'Destination'
            country = destination.get('country') or ''
            full_destination = f"{city_name}, {country}".strip(', ')

            for _ in range(duration):
                day_counter += 1
                day_date = (
                    (start_date + timedelta(days=day_counter - 1)).date().isoformat()
                    if start_date
                    else (timezone.now().date() + timedelta(days=day_counter - 1)).isoformat()
                )
                activities = self._generate_activities(full_destination)
                day_cost = sum(activity.get('cost', 0) for activity in activities)
                total_cost += day_cost

                days.append(
                    {
                        'dayNumber': day_counter,
                        'date': day_date,
                        'destination': full_destination,
                        'theme': random.choice(
                            ['Découverte locale', 'Immersion culturelle', 'Nature & plein air']
                        ),
                        'activities': activities,
                        'dailyBudget': day_cost,
                        'transportation': random.choice(
                            [
                                'Transports en commun',
                                'Balade à pied',
                                'Vélo partagé',
                                'Taxi / VTC',
                            ]
                        ),
                        'meals': {
                            'breakfast': activities[0],
                            'lunch': activities[1],
                            'dinner': activities[2],
                        },
                        'totalCost': day_cost,
                        'walkingDistance': random.randint(3, 12),
                    }
                )

        itinerary_title = (
            f"Aventure à {destinations[0].get('city')}"
            if destinations and destinations[0].get('city')
            else "Votre aventure personnalisée"
        )

        return {
            'title': itinerary_title,
            'description': "Itinéraire généré automatiquement sur la base de vos préférences.",
            'whyVisit': f"{itinerary_title} combine incontournables culturels et expériences locales authentiques.",
            'totalBudget': total_cost,
            'budgetBreakdown': {
                'accommodation': round(total_cost * 0.45, 2),
                'food': round(total_cost * 0.25, 2),
                'activities': round(total_cost * 0.25, 2),
                'transport': round(total_cost * 0.05, 2),
                'shopping': round(total_cost * 0.03, 2),
                'miscellaneous': round(total_cost * 0.02, 2),
            },
            'practicalTips': [
                "Pensez à réserver vos activités populaires à l'avance.",
                "Gardez toujours une copie numérique de vos documents importants.",
                "Prévoyez des adaptateurs de prise si nécessaire.",
            ],
            'trip': trip_data,
            'days': days,
            'totalCost': total_cost,
            'practicalInfo': self._build_practical_info(destinations),
            'recommendations': self._build_recommendations(destinations),
            'destinationImages': {},
            'bestTimeToVisit': {
                'overall': "Printemps et début d'automne pour un climat doux et moins d'affluence.",
                'seasons': {
                    'spring': "Jours longs, températures agréables, floraisons.",
                    'summer': "Plus touristique, privilégier les visites tôt le matin.",
                    'autumn': "Temps stable, belles couleurs pour les parcs et randonnées.",
                    'winter': "Ambiance plus calme, idéal pour musées et gastronomie.",
                },
            },
            'visaAndEntry': {
                'generalInfo': "Vérifiez les exigences de visa selon votre nationalité avant le départ.",
                'requirements': [
                    "Passeport valide au moins 6 mois après la date de retour.",
                    "Preuve d'hébergement et de ressources suffisantes.",
                ],
                'entryRequirements': [
                    "Billet retour ou de continuation.",
                    "Assurance voyage recommandée couvrant les soins médicaux.",
                ],
            },
            'mustSee': [
                "Centre historique et ses ruelles piétonnes.",
                "Musée ou monument emblématique de la destination.",
                "Quartier vivant pour la street food et l'artisanat.",
            ],
            'mustTryDishes': [
                {
                    'name': "Spécialité locale",
                    'description': "Un plat emblématique à goûter sur place.",
                    'whereToFind': "Marché central ou restaurant familial.",
                    'priceRange': "€€",
                }
            ],
            'giftIdeas': [
                {
                    'item': "Artisanat local",
                    'description': "Pièce faite main qui reflète le savoir-faire régional.",
                    'whereToBuy': "Boutiques de créateurs ou marché artisanal.",
                    'priceRange': "€€",
                }
            ],
            'similarDestinations': [
                {
                    'name': destinations[0].get('city') if destinations else 'Alternative',
                    'country': destinations[0].get('country') if destinations else '',
                    'why': "Ambiance et patrimoine similaires, avec une scène culinaire reconnue.",
                    'bestFor': "Culture et gastronomie",
                }
            ],
            'transportationAdvice': {
                'gettingThere': "Arrivez la veille pour profiter dès le matin. Taxi/VTC ou train depuis l'aéroport.",
                'localTransport': {
                    'metro': "Idéal pour les trajets rapides intra-muros.",
                    'bus': "Bon marché et dense, pratique en journée.",
                    'taxi': "Préférez les apps locales pour des tarifs clairs.",
                    'bike': "Location facile pour explorer les quartiers proches.",
                    'walking': "Centres historiques majoritairement piétons.",
                },
                'tips': [
                    "Achetez une carte de transport 24/48h si vous enchaînez les visites.",
                    "Évitez les taxis non officiels autour des gares/aéroports.",
                ],
            },
            'culturalTips': [
                "Dire bonjour/merci dans la langue locale ouvre des portes.",
                "Respecter les files d'attente et les espaces communs.",
            ],
            'localEvents': [
                {
                    'name': "Marché ou festival local",
                    'date': timezone.now().date().isoformat(),
                    'description': "Découverte des producteurs, musique et artisanat.",
                    'location': destinations[0].get('city') if destinations else 'Centre-ville',
                }
            ],
            'sustainabilityTips': [
                "Privilégiez les transports en commun et la marche.",
                "Apportez une gourde réutilisable pour limiter le plastique.",
            ],
        }

    def _generate_activities(self, destination: str) -> List[Dict[str, Any]]:
        base_templates = [
            {
                'title': f'Exploration de {destination}',
                'description': 'Découverte des incontournables avec un guide local.',
                'type': 'culture',
            },
            {
                'title': 'Pause gourmande',
                'description': 'Dégustation de spécialités locales dans un marché typique.',
                'type': 'food',
            },
            {
                'title': 'Soirée immersive',
                'description': 'Activité thématique pour vivre la culture locale.',
                'type': 'experience',
            },
        ]
        activities = []
        for index, template in enumerate(base_templates):
            activities.append(
                {
                    'id': str(uuid.uuid4()),
                    'time': f"{9 + index * 4:02d}:00",
                    'title': template['title'],
                    'description': template['description'],
                    'duration': '2h',
                    'type': template['type'],
                    'cost': random.randint(30, 90),
                    'location': destination,
                    'tips': 'Prévoyez des chaussures confortables.',
                    'bookingAdvice': 'Réservez 24h à l’avance si possible.',
                }
            )
        return activities

    def _parse_date(self, value: Any):
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        except ValueError:
            return None

    def _build_practical_info(self, destinations: List[Dict[str, Any]]):
        info = {}
        for destination in destinations:
            city = destination.get('city') or destination.get('country') or 'Destination'
            info[city] = {
                'visa': 'Vérifiez les conditions auprès de votre ambassade.',
                'health': ['Pensez à une assurance voyage.', 'Gardez une trousse de secours basique.'],
                'currency': destination.get('currency', 'EUR'),
                'language': ['Langue locale', 'Anglais basique'],
                'emergency': 'Composez 112 pour les urgences.',
                'climate': 'Préparez-vous à un climat variable, emportez une veste légère.',
                'customs': [
                    'Respectez les coutumes locales.',
                    'Apprenez quelques mots de politesse locales.',
                ],
            }
        return {'destinations': info}

    def _build_recommendations(self, destinations: List[Dict[str, Any]]):
        must_try = {}
        gift_ideas = {}
        cultural_tips = {}
        transportation = {}

        for destination in destinations:
            city = destination.get('city') or destination.get('country') or 'Destination'
            must_try[city] = [
                'Cuisine locale artisanale',
                'Marché traditionnel',
                'Cocktail signature',
            ]
            gift_ideas[city] = ['Artisanat local', 'Produits gastronomiques', 'Souvenirs design']
            cultural_tips[city] = [
                'Respectez les files d’attente.',
                'Les pourboires sont appréciés mais non obligatoires.',
            ]
            transportation[city] = 'Utilisez les transports publics ou louez un vélo.'

        return {
            'mustTryDishes': must_try,
            'giftIdeas': gift_ideas,
            'similarDestinations': ['Suggestions personnalisées bientôt disponibles'],
            'packingList': [
                'Adaptateur universel',
                'Chaussures confortables',
                'Veste légère',
                'Bouteille réutilisable',
            ],
            'culturalTips': cultural_tips,
            'bestTimeToVisit': {city: 'Printemps et automne' for city in must_try.keys()},
            'localEvents': {city: ['Festival local', 'Marché nocturne'] for city in must_try.keys()},
            'transportation': transportation,
            'safety': {city: ['Gardez un œil sur vos effets personnels.'] for city in must_try.keys()},
            'budget': {city: 'Prévoyez un budget intermédiaire pour profiter pleinement.' for city in must_try.keys()},
        }


class TripPlanningProgressView(APIView):
    """
    Endpoint to check the progress of trip planning generation
    Used for real-time progress updates in the frontend
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        session_id = request.GET.get('sessionId')
        if not session_id:
            return Response(
                {'detail': 'sessionId required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get progress from cache with default fallback
        progress = cache.get(f"progress_{session_id}", {
            'step': 'initializing',
            'progress': 0,
            'message': 'Initialisation...'
        })

        return Response(progress)


class DestinationImagesView(APIView):
    """
    Endpoint to fetch destination images lazily after itinerary generation
    Images are fetched in background and stored in cache
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        session_id = request.GET.get('sessionId')
        if not session_id:
            return Response({'images': {}})

        # Get images from cache (populated by background thread)
        images = cache.get(f"dest_images_{session_id}", {})

        return Response({'images': images})


class ActivityImagesView(APIView):
    """
    Endpoint pour récupérer les images d'activités (Wikimedia) après génération.
    Les images sont récupérées en arrière-plan et stockées en cache, indexées
    par id d'activité (repli "dayNumber:index").
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        session_id = request.GET.get('sessionId')
        if not session_id:
            return Response({'images': {}})
        images = cache.get(f"activity_images_{session_id}", {})
        return Response({'images': images})


class StreamingTripPlannerView(APIView):
    """
    Server-Sent Events (SSE) endpoint for streaming itinerary generation
    Streams AI tokens in real-time for progressive rendering
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        trip_data = request.data.get('tripData')
        if not trip_data:
            return Response({'detail': 'tripData requis'}, status=status.HTTP_400_BAD_REQUEST)

        session_id = request.data.get('sessionId') or trip_data.get('sessionId')

        # Langue de génération = langue de navigation de l'utilisateur
        lang_code = (request.data.get('language') or trip_data.get('language') or 'fr')[:2].lower()
        LANG_NAMES = {
            'fr': 'français', 'en': 'anglais', 'es': 'espagnol', 'de': 'allemand',
            'it': 'italien', 'pt': 'portugais', 'ru': 'russe', 'ja': 'japonais',
            'zh': 'chinois', 'hi': 'hindi', 'ar': 'arabe',
        }
        lang_name = LANG_NAMES.get(lang_code, 'français')
        lang_instruction = (
            f"IMPORTANT : rédige TOUTES les valeurs textuelles (titres, descriptions, "
            f"thèmes, conseils, etc.) en {lang_name}. Les clés JSON restent en anglais. "
        )
        # Rappel placé en FIN de prompt : les LLM suivent mieux la dernière consigne.
        # Indispensable pour les sections enrichies (longue prose) qui, sinon, basculent
        # en anglais malgré l'instruction initiale.
        lang_reminder = (
            f" RAPPEL FINAL ET IMPÉRATIF : la TOTALITÉ des valeurs de chaîne du JSON "
            f"(y compris les longues descriptions, le titre, les conseils, les noms de "
            f"sections rédigés) doit être écrite en {lang_name}, même si le schéma, les "
            f"noms de lieux ou les données d'entrée sont en anglais. N'écris AUCUN texte "
            f"en anglais sauf si la langue demandée est l'anglais."
        )

        def event_stream():
            """Generator function that yields SSE-formatted events"""
            try:
                # Send initial event
                progress_data = json.dumps({'progress': 5, 'message': "Connexion à l'IA..."})
                yield f"event: progress\ndata: {progress_data}\n\n"

                # Get active AI provider
                active_provider = AIProviderConfig.objects.filter(is_enabled=True).first()
                if not active_provider:
                    error_data = json.dumps({'error': 'Aucun provider IA actif'})
                    yield f"event: error\ndata: {error_data}\n\n"
                    return

                destinations = trip_data.get('destinations', [])

                # Un seul modèle pour TOUT le programme : le provider actif.
                # (Ollama gardé uniquement comme repli si le provider principal tombe.)
                ollama_provider = AIProviderConfig.objects.filter(provider='ollama').first()
                enriched_provider = active_provider

                # Lancer le téléchargement des images TÔT (en parallèle de la
                # génération du texte) pour qu'elles soient prêtes au plus vite.
                if destinations and session_id:
                    def fetch_images_async():
                        try:
                            images = fetch_all_destination_images(destinations)
                            cache.set(f"dest_images_{session_id}", images, timeout=600)
                        except Exception as exc:
                            logger.error(f"Error fetching images in background: {exc}")
                    threading.Thread(target=fetch_images_async, daemon=True).start()

                # Intensité du programme : nb d'activités/jour selon le choix du
                # voyageur (codes réels : relaxed/moderate/active/intense, + legacy).
                import unicodedata as _ud
                _raw_intensity = ((trip_data.get('activityPreferences') or {}).get('intensity') or '').strip().lower()
                _norm_intensity = ''.join(c for c in _ud.normalize('NFD', _raw_intensity) if _ud.category(c) != 'Mn')
                _intensity_map = {
                    'relaxed': '2 à 3', 'relax': '2 à 3', 'light': '2 à 3', 'leger': '2 à 3', 'allege': '2 à 3', 'detendu': '2 à 3',
                    'moderate': '4 à 5', 'modere': '4 à 5', 'standard': '4 à 5',
                    'active': '5 à 7', 'actif': '5 à 7',
                    'intense': '6 à 8', 'charge': '6 à 8',
                }
                _activity_count = _intensity_map.get(_norm_intensity)
                intensity_instruction = (
                    f"Chaque jour doit contenir environ {_activity_count} activités principales (hors repas), réparties harmonieusement sur la journée. "
                    if _activity_count else ""
                )

                # Prompt 1: header + days (planning)
                prompt_days = (
                    lang_instruction +
                    intensity_instruction +
                    "Génère un JSON avec uniquement les clés suivantes : "
                    '{"title": string, "description": string, "days": [ ... ], "totalCost": number, "budgetBreakdown": {...}}. '
                    "Les days doivent contenir dayNumber, date, destination, theme, activities (id,time,title,description,duration,type,cost,location,tips,difficulty), "
                    "meals (breakfast/lunch/dinner), transportation, totalCost, walkingDistance. "
                    'Le champ "location" de chaque activité doit être un OBJET {"name": string, "address": string, "latitude": number|null, "longitude": number|null} : '
                    "renseigne latitude et longitude UNIQUEMENT si tu connais les coordonnées réelles du lieu, sinon mets-les à null (n'invente jamais de coordonnées). "
                    "Réponds STRICTEMENT en JSON valide, sans texte avant/après. "
                    f"Données: {json.dumps(trip_data, ensure_ascii=False)}"
                    + lang_reminder
                )
                progress_data = json.dumps({'progress': 15, 'message': "Planification des jours..."})
                yield f"event: progress\ndata: {progress_data}\n\n"
                # Devient True si le provider principal tombe et qu'on bascule sur
                # Ollama : dans ce cas TOUTES les sections suivantes (adéquation,
                # enrichies, budget) passent aussi par Ollama (parité du programme),
                # sans réessayer Gemini en vain (lent).
                used_ollama_fallback = False
                try:
                    days_resp = call_provider_with_prompt(active_provider, prompt_days) or {}
                except AIProviderException as e_days:
                    # Repli sur Ollama (local) si le provider principal échoue
                    # malgré les réessais (ex: Gemini 503 persistant). Plus lent
                    # mais garantit que le programme se génère quand même.
                    if ollama_provider and ollama_provider.id != active_provider.id:
                        logger.warning(f"Jours via {active_provider.provider} échoués, repli Ollama: {e_days}")
                        used_ollama_fallback = True
                        progress_data = json.dumps({'progress': 15, 'message': "Modèle principal indisponible, génération jour par jour (local)..."})
                        yield f"event: progress\ndata: {progress_data}\n\n"

                        # Repli Ollama JOUR PAR JOUR (CPU lent → petits prompts, rendu
                        # progressif). On accumule une liste anti-répétition pour que
                        # chaque jour propose des activités différentes.
                        day_plan = []
                        _n = 1
                        for _d in destinations:
                            _city = _d.get('city') or _d.get('country') or ''
                            for _ in range(max(1, int(_d.get('duration') or 1))):
                                day_plan.append((_n, _city))
                                _n += 1
                        if not day_plan:
                            day_plan = [(1, '')]
                        total_days = len(day_plan)
                        _all_days = []
                        _used = []
                        for (_day_num, _dest) in day_plan:
                            _avoid = " | ".join(_used[-40:])
                            prompt_one_day = (
                                lang_instruction + intensity_instruction +
                                f"Génère UNIQUEMENT le jour {_day_num} sur {total_days} d'un voyage à {_dest}. " +
                                (f"NE RÉPÈTE PAS ces activités/lieux déjà prévus les autres jours : {_avoid}. " if _avoid else "") +
                                "Propose des activités et des lieux DIFFÉRENTS et variés. " +
                                'Réponds STRICTEMENT en JSON pour CE SEUL jour : '
                                '{"dayNumber": number, "date": string, "destination": string, "theme": string, '
                                '"activities": [{"id": string, "time": string, "title": string, "description": string, "duration": string, "type": string, "cost": number, "location": {"name": string, "address": string, "latitude": number|null, "longitude": number|null}, "tips": string, "difficulty": string}], '
                                '"meals": {"breakfast": string, "lunch": string, "dinner": string}, "transportation": string, "totalCost": number, "walkingDistance": number}. '
                                "Pour location.latitude/longitude : seulement si tu connais les vraies coordonnées, sinon null (jamais inventées). "
                                "Sans texte avant/après. "
                                f"Données voyageur: {json.dumps(trip_data, ensure_ascii=False)}" + lang_reminder
                            )
                            # Heartbeat AVANT l'appel (lent sur CPU) : garde la
                            # connexion SSE active côté nginx pendant la génération.
                            yield f"event: progress\ndata: {json.dumps({'progress': 15 + int(((_day_num - 1) / total_days) * 20), 'message': f'Jour {_day_num}/{total_days} (local)...'}, ensure_ascii=False)}\n\n"
                            try:
                                # retries=1 : un jour lent ne doit pas multiplier le
                                # temps (3×300s) et faire dépasser le timeout global.
                                _resp = call_provider_with_prompt(ollama_provider, prompt_one_day, retries=1) or {}
                            except AIProviderException:
                                _resp = {}
                            _day = _resp.get('day') if isinstance(_resp, dict) and isinstance(_resp.get('day'), dict) else _resp
                            if isinstance(_day, dict) and (_day.get('activities') or _day.get('theme')):
                                _day.setdefault('dayNumber', _day_num)
                                if not _day.get('destination'):
                                    _day['destination'] = _dest
                                _all_days.append(_day)
                                for _a in (_day.get('activities') or []):
                                    _title = _a.get('title') if isinstance(_a, dict) else None
                                    if _title:
                                        _used.append(_title)
                                # Émission progressive : l'utilisateur voit chaque jour dès qu'il est prêt
                                _pct = 15 + int((_day_num / total_days) * 20)
                                yield f"event: section\ndata: {json.dumps({'key': 'days', 'value': _all_days, 'progress': _pct}, ensure_ascii=False)}\n\n"

                        _cities = [(_d.get('city') or _d.get('country') or '') for _d in destinations]
                        days_resp = {
                            'days': _all_days,
                            'title': trip_data.get('title') or ", ".join([c for c in _cities if c]) or "Votre voyage",
                            'totalCost': sum((d.get('totalCost') or 0) for d in _all_days),
                        }
                    else:
                        raise
                itinerary: dict = {
                    'trip': trip_data,
                    'destinationImages': {},
                    **days_resp,
                }
                # Emit days + header sections
                for key, val in [
                    ("header", {"title": itinerary.get("title"), "description": itinerary.get("description"), "trip": trip_data}),
                    ("days", itinerary.get("days")),
                    ("budget", {"totalCost": itinerary.get("totalCost") or itinerary.get("totalBudget"), "budgetBreakdown": itinerary.get("budgetBreakdown")}),
                ]:
                    if val:
                        section_data = json.dumps({'key': key, 'value': val, 'progress': 40})
                        yield f"event: section\ndata: {section_data}\n\n"

                # Images d'activités via Wikimedia (en parallèle, dès que les jours
                # sont connus) → cache, récupéré par le front via /activity-images/.
                if session_id and itinerary.get('days'):
                    _days_for_images = itinerary.get('days')
                    def fetch_activity_images_async():
                        try:
                            imgs = fetch_all_activity_images(_days_for_images)
                            cache.set(f"activity_images_{session_id}", imgs, timeout=600)
                        except Exception as exc:
                            logger.error(f"Error fetching activity images: {exc}")
                    threading.Thread(target=fetch_activity_images_async, daemon=True).start()

                trip_json = json.dumps(trip_data, ensure_ascii=False)

                # Provider pour TOUTES les sections texte restantes (adéquation,
                # enrichies, budget). Si Gemini est tombé, on enchaîne sur Ollama
                # pour que le programme local soit COMPLET (pas seulement les jours).
                text_provider = ollama_provider if (used_ollama_fallback and ollama_provider) else active_provider
                enriched_provider = text_provider
                # Sur Ollama (CPU lent) on limite les réessais pour borner le temps
                # total de la requête (sinon risque de dépasser le timeout serveur).
                _text_retries = 1 if used_ollama_fallback else 3

                # Score d'adaptation : à quel point ce programme correspond aux
                # préférences saisies dans le stepper + paragraphe explicatif.
                prompt_match = (
                    lang_instruction +
                    "Tu es un expert voyage. En te basant sur les préférences du voyageur, génère UNIQUEMENT ce JSON : "
                    '{"matchScore": number, "whyThisTrip": string, "destinationScores": [{"destination": string, "score": number, "reason": string}]}. '
                    "matchScore = entier 0-100 (adéquation globale du programme avec les préférences : type de voyageur, budget, cuisine, hébergement, activités). "
                    "whyThisTrip = un paragraphe de 2 à 4 phrases expliquant POURQUOI ce programme correspond aux attentes du voyageur. "
                    "Chaque destinationScores.score = entier 0-100. "
                    "Réponds STRICTEMENT en JSON valide, sans texte avant/après. "
                    f"Données voyageur: {trip_json}"
                    + lang_reminder
                )
                # En repli local (Ollama, CPU lent), on saute le score + les sections
                # enrichies + le budget IA : ils multiplieraient les appels lents et
                # figeraient l'écran. On garde l'essentiel (les jours, déjà émis).
                if not used_ollama_fallback:
                    progress_data = json.dumps({'progress': 48, 'message': "Analyse d'adéquation à vos préférences..."})
                    yield f"event: progress\ndata: {progress_data}\n\n"
                try:
                    match_resp = {} if used_ollama_fallback else (call_provider_with_prompt(text_provider, prompt_match, retries=_text_retries) or {})
                except AIProviderException:
                    match_resp = {}
                if match_resp:
                    itinerary.update(match_resp)
                    section_data = json.dumps({'key': 'enriched', 'value': match_resp, 'progress': 50})
                    yield f"event: section\ndata: {section_data}\n\n"

                # Prompt 2: sections enrichies — générées par petits groupes et
                # émises progressivement (rendu itératif, dans l'ordre de la page
                # résultat). Chaque groupe apparaît dès qu'il est prêt ; un échec
                # de groupe n'interrompt pas les suivants.
                trip_json = json.dumps(trip_data, ensure_ascii=False)
                enriched_groups = [
                    (60, "Points forts de la destination...",
                     '{"whyVisit": string, "mustSee": [string], "bestTimeToVisit": {"overall": string, "seasons": {"spring": string, "summer": string, "autumn": string, "winter": string}, "avoidPeriods": [string]}}'),
                    (68, "Infos pratiques (visa, santé, transport)...",
                     '{"visaAndEntry": {"generalInfo": string, "requirements": [string], "processingTime": string, "cost": string}, "healthAndSafety": {"vaccinations": [string], "healthTips": [string], "insurance": string, "emergencyNumbers": {"police": string, "medical": string, "embassy": string}, "safetyTips": [string]}, "transportationAdvice": {"gettingThere": string, "localTransport": {"metro": string, "bus": string, "taxi": string}, "tips": [string]}, "packingList": [string]}'),
                    (74, "Gastronomie & souvenirs...",
                     '{"mustTryDishes": [{"name": string, "description": string, "whereToFind": string, "priceRange": string}], "giftIdeas": [{"item": string, "description": string, "whereToBuy": string, "priceRange": string}]}'),
                    (78, "Culture, événements & alentours...",
                     '{"culturalTips": [string], "localEvents": [{"name": string, "date": string, "description": string, "location": string}], "similarDestinations": [{"name": string, "country": string, "why": string}], "sustainabilityTips": [string]}'),
                ]
                for prog, msg, schema in ([] if used_ollama_fallback else enriched_groups):
                    progress_data = json.dumps({'progress': prog, 'message': msg})
                    yield f"event: progress\ndata: {progress_data}\n\n"
                    prompt_part = (
                        lang_instruction +
                        "Tu es un expert voyage. Génère UNIQUEMENT ce JSON (rien d'autre) : "
                        + schema + ". "
                        "Réponds STRICTEMENT en JSON valide, sans texte avant/après. "
                        f"Données: {trip_json}"
                        + lang_reminder
                    )
                    try:
                        part_resp = call_provider_with_prompt(enriched_provider, prompt_part, retries=_text_retries) or {}
                    except AIProviderException as part_err:
                        logger.warning(f"Section enrichie échouée ({msg}) via {enriched_provider.provider}: {part_err}")
                        part_resp = {}
                    if part_resp:
                        itinerary.update(part_resp)
                        section_data = json.dumps({'key': 'enriched', 'value': part_resp, 'progress': prog})
                        yield f"event: section\ndata: {section_data}\n\n"

                # Prompt 3: budget (optionnel si déjà fourni ; sauté en repli local)
                if (not used_ollama_fallback) and not itinerary.get("budgetBreakdown"):
                    prompt_budget = (
                        "Génère un JSON avec uniquement les clés : "
                        '{"totalCost": number, "budgetBreakdown": {"accommodation": number, "food": number, "activities": number, "transport": number, "shopping": number, "miscellaneous": number}}. '
                        "Réponds STRICTEMENT en JSON valide, sans texte avant/après. "
                        f"Données: {json.dumps(trip_data, ensure_ascii=False)}"
                    )
                    progress_data = json.dumps({'progress': 80, 'message': "Budget détaillé..."})
                    yield f"event: progress\ndata: {progress_data}\n\n"
                    try:
                        budget_resp = call_provider_with_prompt(enriched_provider, prompt_budget, retries=_text_retries) or {}
                    except AIProviderException:
                        budget_resp = {}
                    if budget_resp:
                        itinerary.update(budget_resp)
                        section_data = json.dumps({'key': 'budget', 'value': budget_resp, 'progress': 85})
                        yield f"event: section\ndata: {section_data}\n\n"

                # (images déjà lancées au début, en parallèle)

                # Ensure defaults
                if 'totalCost' not in itinerary:
                    itinerary['totalCost'] = itinerary.get('totalBudget', 0)

                # Send complete itinerary
                response_data = {
                    'itinerary': itinerary,
                    'hasUserContext': bool(request.user and request.user.is_authenticated),
                    'hasLocalContext': True,
                    'hasAIContext': True,
                    'ai_provider': active_provider.display_name,
                    'used_ai': True,
                }
                complete_data = json.dumps(response_data)
                yield f"event: complete\ndata: {complete_data}\n\n"

                # Save analytics
                if session_id:
                    self._save_analytics_async(session_id, itinerary, active_provider.display_name)

            except AIProviderException as e:
                logger.error(f"AI provider streaming error: {e}")
                error_data = json.dumps({'error': str(e)})
                yield f"event: error\ndata: {error_data}\n\n"
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                error_data = json.dumps({'error': 'Erreur inattendue'})
                yield f"event: error\ndata: {error_data}\n\n"

        # Return StreamingHttpResponse with SSE headers
        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
        return response

    def _save_analytics_async(self, session_id, itinerary, provider_name):
        """Save analytics in background thread"""
        def _async_save():
            try:
                TravelAnalytics.objects.filter(session_id=session_id).update(
                    ai_results=itinerary,
                    ai_provider=provider_name,
                    ai_used=True,
                    updated_at=timezone.now()
                )
            except Exception as e:
                logger.warning(f"Failed to save analytics: {e}")

        threading.Thread(target=_async_save, daemon=True).start()


class TravelAIAssistantView(APIView):
    """
    Provides quick travel tips without relying on external AI services.
    Generates deterministic responses using prompt keywords.
    """

    permission_classes = [permissions.AllowAny]

    TIP_TEMPLATES = [
        "Prévoyez toujours un temps d'avance pour explorer les ruelles secondaires : c'est souvent là que se cachent les plus belles surprises.",
        "Notez trois restaurants locaux à tester et réservez une table avant votre départ pour éviter les files d'attente.",
        "Gardez une carte hors-ligne sur votre téléphone : pratique pour les quartiers historiques où le réseau se fait rare.",
        "Alternez journées d'exploration intense et journées plus reposantes afin de garder de l'énergie jusqu'à la fin du voyage.",
        "Prévoyez une enveloppe \"imprévus\" dans votre budget, afin de vous offrir une activité coup de cœur sur place.",
    ]

    KEYWORD_RESPONSES = {
        'restaurant': "Repérez les restaurants où les locaux font la queue : c'est généralement signe d'une bonne adresse.",
        'budget': "Fractionnez votre budget : 40% hébergement, 25% nourriture, 25% activités, 10% souvenirs et imprévus.",
        'famille': "Choisissez des expériences interactives (ateliers, visites guidées ludiques) pour capter l'attention des enfants.",
        'paris': "Variez les quartiers à Paris : combinez un classique (Louvre), un lieu tendance (Canal Saint-Martin) et un coin plus secret (passages couverts).",
        'montagne': "En montagne, partez tôt le matin pour avoir les sentiers presque pour vous et profiter d'une lumière magnifique.",
        'plage': "Sur les plages touristiques, arrivez avant 9h pour avoir de l'espace et profitez d'un petit-déjeuner vue mer.",
    }

    def post(self, request):
        prompt = request.data.get('prompt', '').strip()
        user_context = request.data.get('userContext')
        lang = (request.data.get('lang') or 'fr')[:5]
        if not prompt:
            return Response({'detail': 'prompt requis'}, status=status.HTTP_400_BAD_REQUEST)

        # 1) Vraie IA contextualisée (provider actif = Gemini) si dispo.
        ai = self._ai_answer(prompt, user_context, lang)
        if ai:
            return Response({'response': ai, 'hasUserContext': bool(user_context)})

        # 2) Repli déterministe (templates) si l'IA échoue/indispo.
        response = self._build_response(prompt, user_context)
        return Response(
            {
                'response': response,
                'hasUserContext': bool(user_context),
            }
        )

    def _ai_answer(self, prompt: str, user_context: str | None, lang: str = 'fr') -> str | None:
        """Réponse via le provider IA actif, en s'appuyant sur la zone/les lieux affichés."""
        try:
            provider = AIProviderConfig.objects.filter(is_enabled=True).order_by('display_name').first()
            if not provider:
                return None
            lang_name = {
                'fr': 'français', 'en': 'English', 'es': 'español', 'de': 'Deutsch',
                'it': 'italiano', 'pt': 'português', 'ru': 'русский', 'ja': '日本語',
                'zh': '中文', 'ar': 'العربية', 'hi': 'हिन्दी',
            }.get(lang, 'français')
            system = (
                f"Tu es l'assistant de voyage Tasarini. Réponds en {lang_name}, de façon concise, "
                "chaleureuse et ACTIONNABLE. Appuie-toi STRICTEMENT sur la zone affichée et les lieux "
                "listés ci-dessous quand c'est pertinent (cite leurs noms). Si on te demande un itinéraire "
                "ou une demi-journée/journée, propose un enchaînement réaliste de 3 à 6 lieux PARMI ceux "
                "listés, dans un ordre logique, avec une courte raison pour chacun. N'invente pas de lieux "
                "absents de la liste si une liste est fournie."
            )
            ctx = f"\n\n--- Contexte de la zone affichée ---\n{user_context}\n--- fin du contexte ---" if user_context else ""
            full = (
                f"{system}{ctx}\n\nQuestion de l'utilisateur : {prompt}\n\n"
                'Réponds en JSON STRICT, uniquement : {"answer": "ta réponse ici"} '
                "(les sauts de ligne \\n sont autorisés dans la valeur)."
            )
            resp = call_provider_with_prompt(provider, full, retries=2)
            if isinstance(resp, dict):
                ans = resp.get('answer') or resp.get('response') or resp.get('text')
                if ans and str(ans).strip():
                    return str(ans).strip()
            return None
        except Exception:  # noqa: BLE001 - on retombe sur les templates
            return None

    def _build_response(self, prompt: str, user_context: str | None) -> str:
        lowered = prompt.lower()
        for keyword, tip in self.KEYWORD_RESPONSES.items():
            if keyword in lowered:
                return f"{tip}\n\nAstuce bonus : {self._random_tip(user_context)}"

        return f"Voici une suggestion personnalisée : {self._random_tip(user_context)}"

    def _random_tip(self, context: str | None) -> str:
        base_tip = random.choice(self.TIP_TEMPLATES)
        if context:
            return f"{base_tip} Pensez aussi à {context.lower()} pour personnaliser davantage votre itinéraire."
        return base_tip


class SmartRecommendationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user_lat = request.data.get('userLat')
        user_lon = request.data.get('userLon')
        radius_km = float(request.data.get('radiusKm') or 30)

        try:
            recommendations = self._build_recommendations(user, user_lat, user_lon, radius_km)
            profile = self._build_user_profile(user)
        except Exception as exc:  # pragma: no cover - defensive
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'recommendations': recommendations, 'userProfile': profile})

    def _build_recommendations(self, user, user_lat, user_lon, radius_km):
        qs = (
            TouristPoint.objects.filter(is_active=True)
            .exclude(latitude__isnull=True)
            .exclude(longitude__isnull=True)
            .select_related('budget_level', 'difficulty_level')
            .prefetch_related('tags')
        )
        poi_entries = []
        for poi in qs[:100]:
            score = 60
            reason_parts = []

            if user_lat is not None and user_lon is not None:
                distance = self._distance_km(float(user_lat), float(user_lon), float(poi.latitude), float(poi.longitude))
                if distance <= radius_km:
                    score += 20
                    reason_parts.append(f"À {distance:.1f} km de vous")
                else:
                    continue

            if poi.rating:
                score += min(float(poi.rating) * 5, 15)
                reason_parts.append(f"Note {poi.rating}/5")

            tag_labels = list(poi.tags.values_list('label_fr', flat=True))
            favorite_tags = self._favorite_tags(user)
            if favorite_tags and tag_labels:
                overlap = len(set(t.lower() for t in tag_labels) & favorite_tags)
                score += overlap * 5
                if overlap:
                    reason_parts.append('Correspond à vos goûts')

            poi_entries.append(
                {
                    'id': str(poi.id),
                    'score': min(int(score), 99),
                    'reason': ' • '.join(reason_parts) or 'Suggestion personnalisée',
                    'poi': {
                        'id': str(poi.id),
                        'name': poi.name,
                        'description': poi.description or '',
                        'tags': tag_labels,
                        'rating': float(poi.rating or 0),
                        'price_range': poi.price_range or '',
                        'latitude': float(poi.latitude),
                        'longitude': float(poi.longitude),
                        'is_partner_point': bool(
                            getattr(getattr(poi, 'owner', None), 'partner_profile', None)
                            and poi.owner.partner_profile.status == 'approved'
                        ),
                    },
                }
            )

        poi_entries.sort(key=lambda entry: entry['score'], reverse=True)
        return poi_entries[:10]

    def _favorite_tags(self, user):
        tags = set()
        favorites = FavoriteTouristPoint.objects.filter(user=user).select_related('tourist_point').prefetch_related('tourist_point__tags')
        for favorite in favorites:
            tags.update(tag.label_fr.lower() for tag in favorite.tourist_point.tags.all())
        return tags

    def _build_user_profile(self, user):
        favorites = FavoriteTouristPoint.objects.filter(user=user).select_related('tourist_point')
        preferred_tags = []
        visited_ids = []
        for favorite in favorites:
            visited_ids.append(str(favorite.tourist_point_id))
            preferred_tags.extend([tag.label_fr for tag in favorite.tourist_point.tags.all()])

        return {
            'preferredTags': preferred_tags[:10],
            'preferredPriceRange': 'mid',
            'preferredDifficulty': 'medium',
            'avgDuration': 2,
            'visitedPOIs': visited_ids,
        }

    def _distance_km(self, lat1, lon1, lat2, lon2):
        R = 6371
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        d_phi = math.radians(lat2 - lat1)
        d_lambda = math.radians(lon2 - lon1)
        a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c


class AIProviderConfigViewSet(viewsets.ModelViewSet):
    queryset = AIProviderConfig.objects.all().order_by('display_name')
    serializer_class = AIProviderConfigSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'head', 'options']


class AmadeusProxyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        endpoint = request.data.get('endpoint')
        params = request.data.get('params', {})

        try:
            if endpoint == 'hotel-search':
                # Use mock data as fallback if API fails
                try:
                    data = self._real_hotel_search(params)
                except Exception as e:
                    logger.warning(f"Amadeus hotel search failed, using mock: {e}")
                    data = self._mock_hotel_search(params)
                return Response({'data': data})

            if endpoint == 'hotel-details':
                try:
                    data = self._real_hotel_details(params)
                except Exception as e:
                    logger.warning(f"Amadeus hotel details failed, using mock: {e}")
                    data = self._mock_hotel_details(params)
                return Response({'data': data})

            if endpoint == 'city-search':
                try:
                    data = self._real_city_search(params)
                except Exception as e:
                    logger.warning(f"Amadeus city search failed, using mock: {e}")
                    data = self._mock_city_search(params)
                return Response({'data': data})

            if endpoint == 'flight-search':
                try:
                    data = self._real_flight_search(params)
                except Exception as e:
                    logger.warning(f"Amadeus flight search failed, using mock: {e}")
                    data = self._mock_flight_search(params)
                return Response({'data': data})

            return Response({'detail': 'Endpoint inconnu'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Amadeus proxy error: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _real_city_search(self, params):
        """Real Amadeus city search"""
        city_name = params.get('cityName', '')

        # Find airport for the city
        iata_code = find_airport_by_city(city_name)

        if iata_code:
            return {'cityCode': iata_code}

        # Fallback to mock
        return self._mock_city_search(params)

    def _real_flight_search(self, params):
        """Real Amadeus flight search"""
        origin = params.get('origin')
        destination = params.get('destination')
        departure_date = params.get('departureDate')
        return_date = params.get('returnDate')
        adults = params.get('adults', 1)

        if not all([origin, destination, departure_date]):
            raise ValueError("Missing required parameters for flight search")

        # Search flights using Amadeus API
        flights = amadeus_api.search_flights(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            return_date=return_date,
            adults=adults,
            max_results=5
        )

        # Transform to expected format
        transformed_flights = []
        for flight in flights:
            transformed_flight = {
                'id': flight.get('id'),
                'type': 'flight-offer',
                'source': 'GDS',
                'instantTicketingRequired': False,
                'nonHomogeneous': False,
                'oneWay': not return_date,
                'paymentCardRequired': False,
                'lastTicketingDate': (timezone.now().date() + timedelta(days=5)).isoformat(),
                'itineraries': [],
                'price': flight.get('price', {}),
                'validatingAirlineCodes': flight.get('validatingAirlineCodes', []),
                'testBookingUrl': f'https://booking.tasarini.ai/flights/{origin}-{destination}'
            }

            # Add outbound itinerary
            if flight.get('outbound'):
                transformed_flight['itineraries'].append(flight['outbound'])

            # Add inbound itinerary if exists
            if flight.get('inbound'):
                transformed_flight['itineraries'].append(flight['inbound'])

            transformed_flights.append(transformed_flight)

        return {'flights': transformed_flights}

    def _real_hotel_search(self, params):
        """Real Amadeus/Hotelbeds hotel search - Not fully implemented yet"""
        # For now, fallback to mock as hotel API requires more complex integration
        return self._mock_hotel_search(params)

    def _real_hotel_details(self, params):
        """Real Amadeus/Hotelbeds hotel details - Not fully implemented yet"""
        # For now, fallback to mock
        return self._mock_hotel_details(params)

    def _mock_hotel_search(self, params):
        city = params.get('cityCode') or 'CDG'
        check_in = params.get('checkInDate') or timezone.now().date().isoformat()
        check_out = params.get('checkOutDate') or (timezone.now().date() + timedelta(days=3)).isoformat()
        adults = params.get('adults') or 2

        hotels = []
        for idx in range(5):
            hotels.append(
                {
                    'id': f'hotel_{city}_{idx}',
                    'name': f'Hôtel {city}-{idx + 1}',
                    'location': {
                        'address': f'{10 + idx} Rue Imaginaire',
                        'city': city,
                        'country': 'FR',
                        'latitude': 48.85 + idx * 0.01,
                        'longitude': 2.35 + idx * 0.01,
                    },
                    'rating': round(3 + random.random() * 2, 1),
                    'price': {
                        'amount': 80 + idx * 25,
                        'currency': params.get('currency', 'EUR'),
                        'period': 'night',
                    },
                    'amenities': ['WiFi', 'Petit-déjeuner', 'Concierge', 'Spa'][: 2 + (idx % 3)],
                    'images': [f'https://images.unsplash.com/photo-15{idx}'],
                    'description': 'Séjour confortable à deux pas des principaux sites.',
                    'hotelId': f'amadeus-{idx}',
                    'checkInDate': check_in,
                    'checkOutDate': check_out,
                    'roomType': 'Chambre supérieure',
                    'bookingUrl': f'https://booking.tasarini.ai/hotels/{city}/{idx}',
                }
            )
        return {'hotels': hotels, 'meta': {'adults': adults, 'nights': 3}}

    def _mock_hotel_details(self, params):
        hotel_id = params.get('hotelId', 'hotel_demo')
        return {
            'hotel': {
                'id': hotel_id,
                'name': f'Hôtel {hotel_id}',
                'description': 'Adresse iconique combinant confort moderne et charme local.',
                'location': {
                    'address': '123 Avenue des Voyageurs',
                    'city': 'Paris',
                    'country': 'FR',
                    'latitude': 48.8566,
                    'longitude': 2.3522,
                },
                'rating': 4.5,
                'amenities': ['WiFi', 'Spa', 'Rooftop', 'Concierge'],
                'images': [
                    'https://images.unsplash.com/photo-1501117716987-c8e1ecb210cc',
                    'https://images.unsplash.com/photo-1507679799987-c73779587ccf',
                ],
                'rooms': [
                    {
                        'type': 'Deluxe',
                        'description': 'Vue sur la ville, lit king size',
                        'amenities': ['Mini-bar', 'Room service', 'Machine espresso'],
                        'price': {'amount': 185, 'currency': 'EUR'},
                        'availability': True,
                    },
                    {
                        'type': 'Suite Signature',
                        'description': 'Salon séparé, terrasse privée',
                        'amenities': ['Jacuzzi', 'Butler', 'Transfert aéroport'],
                        'price': {'amount': 320, 'currency': 'EUR'},
                        'availability': False,
                    },
                ],
                'policies': {
                    'checkIn': '15h',
                    'checkOut': '12h',
                    'cancellation': 'Annulation gratuite jusqu’à 48h avant l’arrivée',
                },
                'contact': {
                    'phone': '+33 1 00 00 00 00',
                    'email': 'reservation@hotel-demo.fr',
                    'website': 'https://hotel-demo.fr',
                },
            }
        }

    def _mock_city_search(self, params):
        city_name = params.get('cityName', 'Paris').upper()
        code = (city_name[:3] if len(city_name) >= 3 else f'{city_name}X').upper()
        return {'cityCode': code}

    def _mock_flight_search(self, params):
        origin = params.get('origin') or 'CDG'
        destination = params.get('destination') or 'JFK'
        currency = params.get('currencyCode', 'EUR')
        flights = []
        for idx in range(3):
            price_total = 350 + idx * 120
            flights.append(
                {
                    'id': f'flight_{origin}_{destination}_{idx}',
                    'type': 'flight-offer',
                    'source': 'GDS',
                    'instantTicketingRequired': False,
                    'nonHomogeneous': False,
                    'oneWay': params.get('returnDate') is None,
                    'paymentCardRequired': False,
                    'lastTicketingDate': (timezone.now().date() + timedelta(days=5)).isoformat(),
                    'itineraries': [
                        {
                            'duration': 'PT7H30M',
                            'segments': [
                                {
                                    'departure': {'iataCode': origin, 'at': f"{params.get('departureDate')}T09:00:00"},
                                    'arrival': {'iataCode': destination, 'at': f"{params.get('departureDate')}T16:30:00"},
                                    'carrierCode': 'TS',
                                    'number': f'{100 + idx}',
                                    'duration': 'PT7H30M',
                                    'stops': 0,
                                }
                            ],
                        }
                    ],
                    'price': {
                        'currency': currency,
                        'total': price_total,
                        'base': price_total - 45,
                        'fees': [{'amount': 20, 'type': 'SUPPLIER'}],
                        'grandTotal': price_total + 20,
                        'billingCurrency': currency,
                    },
                    'validatingAirlineCodes': ['TS'],
                    'testBookingUrl': f'https://booking.tasarini.ai/flights/{origin}-{destination}/{idx}',
                }
            )
        return {'flights': flights}


class HotelBedsProxyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        endpoint = request.data.get('endpoint')
        params = request.data.get('params', {})
        service_type = request.data.get('serviceType', 'hotels')

        try:
            if endpoint == '/hotels' and service_type == 'hotels':
                # Log received parameters for debugging
                logger.info(f"🏨 HotelBeds hotel search request received:")
                logger.info(f"   - Destination: {params.get('destination', {}).get('code')}")
                logger.info(f"   - Check-in: {params.get('stay', {}).get('checkIn')}")
                logger.info(f"   - Check-out: {params.get('stay', {}).get('checkOut')}")
                logger.info(f"   - Occupancies: {params.get('occupancies')}")
                logger.info(f"   - Hotel codes (detail mode): {params.get('hotels', {}).get('hotel')}")

                # Call real Hotelbeds API; if it fails, fall back to mock so the UI can still display results in dev
                try:
                    hotels = self._real_hotels(params)
                    logger.info(f"✅ Found {len(hotels)} hotels from real API")
                    return Response({'hotels': {'hotels': hotels}})
                except Exception as e:
                    logger.error(f"❌ Hotelbeds hotel search failed: {e}")
                    logger.exception("Full error details:")
                    fallback = self._mock_hotels(params)
                    logger.warning(f"Returning {len(fallback)} mock hotels as fallback")
                    return Response({'hotels': {'hotels': fallback}, 'usedMock': True})

            if endpoint == '/activities' and service_type == 'activities':
                # Try real Hotelbeds Activities API first, fallback to mock
                try:
                    activities = self._real_activities(params)
                except Exception as e:
                    logger.warning(f"Hotelbeds activities search failed, using mock: {e}")
                    activities = self._mock_activities(params)
                return Response({'activities': activities})

            return Response({'detail': 'Endpoint HotelBeds inconnu'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"HotelBeds proxy error: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _real_hotels(self, params):
        """Real Hotelbeds hotel search"""
        stay = params.get('stay', {})
        check_in = stay.get('checkIn')
        check_out = stay.get('checkOut')
        destination = params.get('destination', {})
        destination_code = destination.get('code')
        hotel_codes = params.get('hotels', {}).get('hotel') or []
        occupancies = params.get('occupancies', [{}])
        adults = occupancies[0].get('adults', 2) if occupancies else 2
        rooms = occupancies[0].get('rooms', 1) if occupancies else 1

        if not all([check_in, check_out]):
            logger.error(f"❌ Missing required parameters: check_in={check_in}, check_out={check_out}")
            raise ValueError("Missing required parameters for hotel search")

        # Detail mode: when a hotel code is provided, allow missing destination_code
        if hotel_codes and not destination_code:
            logger.info(f"🔍 Detail mode for hotels {hotel_codes} (no destination code provided)")
            detailed_hotels = []
            for code in hotel_codes:
                try:
                    details = hotelbeds_api.get_hotel_details(code, check_in, check_out)
                    if not details:
                        continue
                    images = []
                    for img in details.get('images', []):
                        images.append(
                            {
                                'imageTypeCode': img.get('type') or img.get('imageTypeCode'),
                                'path': img.get('path'),
                            }
                        )
                    detailed_hotels.append(
                        {
                            'code': details.get('code'),
                            'name': details.get('name'),
                            'description': details.get('description'),
                            'categoryCode': details.get('categoryCode'),
                            'categoryName': details.get('categoryName'),
                            'destinationCode': destination_code,
                            'destinationName': details.get('address', {}).get('city'),
                            'zoneCode': None,
                            'zoneName': None,
                            'coordinates': details.get('coordinates', {}),
                            'minRate': None,
                            'currency': 'EUR',
                            'rooms': details.get('rooms', 0),
                            'address': details.get('address', {}),
                            'city': {'content': details.get('address', {}).get('city')},
                            'ranking': 4.0,
                            'images': images,
                            'facilities': details.get('facilities', []),
                        }
                    )
                except Exception as exc:  # pragma: no cover - detail fetch is best-effort
                    logger.warning("Detail fetch failed for %s: %s", code, exc)
            if detailed_hotels:
                return detailed_hotels
            # If nothing returned, do not mock; bubble up to caller
            raise ValueError("No details returned for requested hotel codes")

        if not destination_code:
            logger.error(f"❌ Missing destination code and no hotel codes provided")
            raise ValueError("Missing required destination code for hotel search")

        logger.info(f"📞 Calling HotelBeds API with: destination={destination_code}, check_in={check_in}, check_out={check_out}, adults={adults}, rooms={rooms}")

        # Search hotels using Hotelbeds API
        hotels = hotelbeds_api.search_hotels(
            destination_code=destination_code,
            check_in=check_in,
            check_out=check_out,
            adults=adults,
            rooms=rooms,
            max_results=10
        )

        logger.info(f"📥 HotelBeds API returned {len(hotels)} hotels")

        # Transform to expected format
        transformed_hotels = []
        for hotel in hotels:
            transformed_hotel = {
                'code': hotel.get('code'),
                'name': hotel.get('name'),
                'categoryCode': hotel.get('categoryCode'),
                'categoryName': hotel.get('categoryName'),
                'destinationCode': hotel.get('destinationCode'),
                'destinationName': hotel.get('destinationName'),
                'zoneCode': hotel.get('zoneCode'),
                'zoneName': hotel.get('zoneName'),
                'coordinates': {
                    'latitude': hotel.get('latitude'),
                    'longitude': hotel.get('longitude')
                },
                'minRate': hotel.get('minRate'),
                'currency': hotel.get('currency', 'EUR'),
                'rooms': hotel.get('rooms', 0),
                'address': {
                    'content': f"{hotel.get('destinationName', '')}",
                },
                'city': {'content': hotel.get('destinationName', '')},
                'ranking': 4.0,  # Default ranking
                'images': [],
                'facilities': [],
                'description': hotel.get('description', ''),
            }

            # Enrichir avec le contenu détaillé (images, facilities, description)
            try:
                details = hotelbeds_api.get_hotel_details(
                    hotel.get('code'),
                    check_in,
                    check_out,
                )
                if details:
                    transformed_hotel['description'] = details.get('description') or transformed_hotel['description']
                    transformed_hotel['facilities'] = details.get('facilities', [])
                    transformed_hotel['images'] = details.get('images', [])
            except Exception as exc:  # best-effort
                logger.warning("Hotel details enrichment failed for %s: %s", hotel.get('code'), exc)

            transformed_hotels.append(transformed_hotel)

        return transformed_hotels

    def _mock_hotels(self, params):
        """Mock hotel data for fallback (enough items to fill the list)"""
        hotels = []
        destination = params.get('destination', {}).get('code') or 'PAR'
        for idx in range(10):
            code = f'HB{(idx + 1):03d}'
            hotels.append(
                {
                    'code': code,
                    'name': f'Hôtel HB {idx + 1}',
                    'description': f'Établissement confortable au cœur de {destination}.',
                    'categoryCode': '4*',
                    'destinationCode': destination,
                    'zoneCode': f'Z{idx + 1}',
                    'coordinates': {'latitude': 48.85 + idx * 0.005, 'longitude': 2.34 + idx * 0.005},
                    'images': [
                        {
                            'imageTypeCode': 'GEN',
                            'path': f'https://images.unsplash.com/photo-hb-{idx}',
                        }
                    ],
                    'facilities': [
                        {
                            'facilityCode': 'WI',
                            'facilityGroupCode': 'INT',
                            'order': 1,
                            'indYesOrNo': True,
                        }
                    ],
                    'address': {
                        'content': f'{12 + idx} Rue Imaginaire',
                        'street': 'Rue Imaginaire',
                        'number': str(12 + idx),
                    },
                    'postalCode': '75000',
                    'city': {'content': 'Paris'},
                    'email': 'contact@hotelhb.fr',
                    'web': 'https://hotelhb.fr',
                    'ranking': 4.2,
                }
            )
        return hotels

    def _real_activities(self, params):
        """Real Hotelbeds Activities search"""
        # Extract destination - support both nested and flat structure
        if isinstance(params.get('destination'), dict):
            destination_code = params.get('destination', {}).get('code', 'PAR')
        else:
            # Fallback: check filters structure (HotelBeds API format)
            filters = params.get('filters', [])
            if filters and len(filters) > 0:
                search_items = filters[0].get('searchFilterItems', [])
                if search_items and len(search_items) > 0:
                    destination_code = search_items[0].get('value', 'PAR')
                else:
                    destination_code = 'PAR'
            else:
                destination_code = 'PAR'

        # Handle dates - support both dateFrom/dateTo and from/to (pagination numbers)
        from_date = params.get('dateFrom') or params.get('from')
        to_date = params.get('dateTo') or params.get('to')

        # If from/to are numbers (pagination), ignore them and use None for dates
        if isinstance(from_date, (int, float)):
            from_date = None
        if isinstance(to_date, (int, float)):
            to_date = None

        pax = params.get('pax', 2)
        language = params.get('language', 'fr')

        logger.info(f"Searching activities for destination: {destination_code}, dates: {from_date} to {to_date}")

        # Call Hotelbeds Activities API
        activities = hotelbeds_activities_api.search_activities_by_destination(
            destination_code=destination_code,
            from_date=from_date,
            to_date=to_date,
            pax=pax,
            language=language,
            max_results=10
        )

        logger.info(f"Found {len(activities)} activities for destination {destination_code}")

        # Transform to expected format (already simplified by the service)
        return activities

    def _mock_activities(self, params):
        destination = params.get('destination', {}).get('code') or 'PAR'
        activities = []
        categories = ['culture', 'gastronomie', 'aventure']
        for idx in range(3):
            activities.append(
                {
                    'code': f'ACT{destination}{idx}',
                    'name': f'Expérience {categories[idx]} #{idx + 1}',
                    'type': 'experience',
                    'country': {'code': 'FR', 'name': 'France'},
                    'destination': {'code': destination, 'name': destination},
                    'category': {'code': categories[idx][:3].upper(), 'name': categories[idx]},
                    'modalities': [
                        {
                            'code': 'STD',
                            'name': 'Visite guidée',
                            'duration': {'value': 2 + idx, 'metric': 'HOURS'},
                        }
                    ],
                    'geoLocation': {'latitude': 48.85 + idx * 0.01, 'longitude': 2.34 + idx * 0.01},
                    'images': [f'https://images.unsplash.com/photo-act-{idx}'],
                    'content': {'description': 'Activité inoubliable encadrée par des guides locaux.'},
                }
            )
        return activities


class KayakProxyView(APIView):
    """Proxy view for Kayak API requests"""
    permission_classes = [permissions.AllowAny]

    def post(self, request, endpoint=None):
        # Get parameters directly from request.data (not nested in 'params')
        params = request.data

        try:
            if endpoint == 'hotels':
                destination = params.get('destination')
                check_in = params.get('checkIn')
                check_out = params.get('checkOut')
                adults = params.get('adults', 2)
                rooms = params.get('rooms', 1)

                if not all([destination, check_in, check_out]):
                    return Response(
                        {'detail': 'Missing required parameters'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                try:
                    hotels = kayak_api.search_hotels(
                        destination=destination,
                        check_in=check_in,
                        check_out=check_out,
                        adults=adults,
                        rooms=rooms,
                        max_results=10
                    )
                    logger.info(f"✅ Found {len(hotels)} hotels from Kayak")
                    return Response({'hotels': hotels})
                except Exception as e:
                    if self._is_kayak_auth_error(e):
                        logger.error(f"❌ Kayak auth error (hotels), letting fallback handle it: {e}")
                        raise
                    logger.error(f"❌ Kayak hotel search failed: {e}")
                    # Return mock data as fallback
                    mock_hotels = self._mock_hotels(destination)
                    return Response({'hotels': mock_hotels, 'usedMock': True})

            if endpoint == 'flights':
                origin = params.get('origin')
                destination = params.get('destination')
                departure_date = params.get('departureDate')
                return_date = params.get('returnDate')
                passengers = params.get('passengers', 1)

                if not all([origin, destination, departure_date]):
                    return Response(
                        {'detail': 'Missing required parameters'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                try:
                    flights = kayak_api.search_flights(
                        origin=origin,
                        destination=destination,
                        departure_date=departure_date,
                        return_date=return_date,
                        adults=passengers,
                        max_results=5
                    )
                    logger.info(f"✅ Found {len(flights)} flights from Kayak")
                    return Response({'flights': flights})
                except Exception as e:
                    if self._is_kayak_auth_error(e):
                        logger.error(f"❌ Kayak auth error (flights), letting fallback handle it: {e}")
                        raise
                    logger.error(f"❌ Kayak flight search failed: {e}")
                    mock_flights = self._mock_flights(origin, destination)
                    return Response({'flights': mock_flights, 'usedMock': True})

            if endpoint == 'cars':
                location = params.get('location')
                pickup_date = params.get('pickupDate')
                dropoff_date = params.get('dropoffDate')
                pickup_time = params.get('pickupTime', '10:00')
                dropoff_time = params.get('dropoffTime', '10:00')

                if not all([location, pickup_date, dropoff_date]):
                    return Response(
                        {'detail': 'Missing required parameters'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                try:
                    cars = kayak_api.search_car_rentals(
                        location=location,
                        pickup_date=pickup_date,
                        dropoff_date=dropoff_date,
                        pickup_time=pickup_time,
                        dropoff_time=dropoff_time
                    )
                    logger.info(f"✅ Found {len(cars)} car rentals from Kayak")
                    return Response({'cars': cars})
                except Exception as e:
                    logger.error(f"❌ Kayak car rental search failed: {e}")
                    mock_cars = self._mock_cars(location)
                    return Response({'cars': mock_cars, 'usedMock': True})

            return Response(
                {'detail': 'Unknown endpoint'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            logger.error(f"Kayak proxy error: {e}")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _mock_hotels(self, destination):
        """Mock hotel data for fallback"""
        return [
            {
                'code': f'KAY{i}',
                'name': f'Kayak Hotel {i}',
                'address': f'{i} Main Street',
                'city': destination,
                'rating': 4,
                'minRate': 100 + (i * 20),
                'currency': 'EUR',
                'provider': 'kayak'
            }
            for i in range(1, 5)
        ]

    def _mock_flights(self, origin, destination):
        """Mock flight data for fallback"""
        return [
            {
                'id': f'KAY-FL-{i}',
                'airline': 'Mock Airlines',
                'departure': origin,
                'arrival': destination,
                'duration': '2h30',
                'stops': 0,
                'price': {'amount': 150 + (i * 25), 'currency': 'EUR'},
                'provider': 'kayak'
            }
            for i in range(1, 4)
        ]

    def _is_kayak_auth_error(self, error: Exception) -> bool:
        """Detect auth errors to avoid masking them with mocks"""
        if isinstance(error, requests.exceptions.HTTPError):
            status_code = error.response.status_code if error.response is not None else None
            if status_code in (401, 403):
                return True
        message = str(error).lower()
        return 'invalid apikey' in message or 'invalid api key' in message

    def _mock_cars(self, location):
        """Mock car rental data for fallback"""
        return [
            {
                'id': f'KAY-CAR-{i}',
                'vehicle': f'Compact Car {i}',
                'company': 'Mock Rentals',
                'price': {'amount': 50 + (i * 10), 'currency': 'EUR'},
                'provider': 'kayak'
            }
            for i in range(1, 4)
        ]
