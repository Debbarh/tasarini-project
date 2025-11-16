from __future__ import annotations

import math
import random
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.poi.models import FavoriteTouristPoint, TouristPoint


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

        itinerary = self._build_itinerary(trip_data)
        return Response(
            {
                'itinerary': itinerary,
                'hasUserContext': bool(
                    request.user and request.user.is_authenticated
                ),
                'hasLocalContext': True,
            }
        )

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
            'totalBudget': total_cost,
            'budgetBreakdown': {
                'accommodation': round(total_cost * 0.45, 2),
                'food': round(total_cost * 0.25, 2),
                'activities': round(total_cost * 0.25, 2),
                'transport': round(total_cost * 0.05, 2),
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
        if not prompt:
            return Response({'detail': 'prompt requis'}, status=status.HTTP_400_BAD_REQUEST)

        response = self._build_response(prompt, user_context)
        return Response(
            {
                'response': response,
                'hasUserContext': bool(user_context),
            }
        )

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


class AmadeusProxyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        endpoint = request.data.get('endpoint')
        params = request.data.get('params', {})

        if endpoint == 'hotel-search':
            return Response({'data': self._mock_hotel_search(params)})
        if endpoint == 'hotel-details':
            return Response({'data': self._mock_hotel_details(params)})
        if endpoint == 'city-search':
            return Response({'data': self._mock_city_search(params)})
        if endpoint == 'flight-search':
            return Response({'data': self._mock_flight_search(params)})

        return Response({'detail': 'Endpoint inconnu'}, status=status.HTTP_400_BAD_REQUEST)

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

        if endpoint == '/hotels' and service_type == 'hotels':
            return Response({'hotels': {'hotels': self._mock_hotels(params)}})
        if endpoint == '/activities' and service_type == 'activities':
            return Response({'activities': self._mock_activities(params)})

        return Response({'detail': 'Endpoint HotelBeds inconnu'}, status=status.HTTP_400_BAD_REQUEST)

    def _mock_hotels(self, params):
        hotels = []
        hotel_codes = ['HB101', 'HB202', 'HB303', 'HB404']
        destination = params.get('destination', {}).get('code') or 'PAR'
        for idx, code in enumerate(hotel_codes):
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
