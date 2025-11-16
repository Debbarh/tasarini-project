import { apiClient } from "@/integrations/api/client";
import { TravelGroup } from "@/types/trip";

export interface POI {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  price_range?: string;
  budget_level_id?: string;
  budget_level?: {
    id: string;
    code: string;
    label_fr: string;
    label_en: string;
    description_fr?: string;
    description_en?: string;
    icon_emoji?: string;
    min_daily_amount?: number;
    max_daily_amount?: number;
    default_daily_amount: number;
  };
  amenities?: string[];
  tags?: string[];
  media_images?: string[];
  rating?: number;
  review_count?: number;
  opening_hours?: any;
  is_active: boolean;
  owner_id?: string;
  distance?: number;
  difficulty_level_id?: string;
  is_wheelchair_accessible?: boolean;
  has_accessible_parking?: boolean;
  has_accessible_restrooms?: boolean;
  has_audio_guide?: boolean;
  has_sign_language_support?: boolean;
  difficulty_level?: {
    id: string;
    code: string;
    label_fr: string;
    label_en: string;
    level_value: number;
    is_child_friendly: boolean;
    is_senior_friendly: boolean;
  };
  // Culinary fields
  is_restaurant?: boolean;
  cuisine_types?: string[];
  dietary_restrictions_supported?: string[];
  restaurant_categories?: string[];
  culinary_adventure_level_id?: string;
  
  // Accommodation fields
  is_accommodation?: boolean;
  accommodation_types?: string[];
  accommodation_amenities?: string[];
  accommodation_locations?: string[];
  accommodation_accessibility?: string[];
  accommodation_security?: string[];
  accommodation_ambiance?: string[];
  accommodation_capacity?: number;
  accommodation_rooms?: number;
  
  // Activity fields
  is_activity?: boolean;
  activity_categories?: string[];
  activity_intensity_level_id?: string;
  activity_interests?: string[];
  activity_avoidances?: string[];
  activity_duration_minutes?: number;
  activity_difficulty_level_id?: string;
  metadata?: Record<string, any>;
}

export interface POIFilters {
  categories?: string[];
  tags?: string[];
  rating?: number;
  priceRange?: string;
  budgetLevel?: string;
  searchTerm?: string;
  accessibility?: boolean;
  maxDifficulty?: number;
  travelGroup?: TravelGroup;
  // Culinary filters
  cuisineTypes?: string[];
  dietaryRestrictions?: string[];
  restaurantCategories?: string[];
  isRestaurant?: boolean;
  
  // Accommodation filters
  accommodationTypes?: string[];
  accommodationAmenities?: string[];
  accommodationLocations?: string[];
  accommodationAccessibility?: string[];
  accommodationSecurity?: string[];
  accommodationAmbiance?: string[];
  isAccommodation?: boolean;
  
  // Activity filters
  activityCategories?: string[];
  activityIntensityLevel?: string;
  activityInterests?: string[];
  activityAvoidances?: string[];
  activityDuration?: {
    min?: number;
    max?: number;
  };
  activityDifficultyLevel?: string;
  isActivity?: boolean;
}

export interface TouristPointPayload {
  name: string;
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  price_range?: string;
  metadata?: Record<string, unknown>;
  amenities?: string[];
  is_restaurant?: boolean;
  is_accommodation?: boolean;
  is_activity?: boolean;
  is_active?: boolean;
  tag_ids?: string[];
  budget_level_id?: string | null;
  difficulty_level_id?: string | null;
  status_enum?: string;
}

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const buildSearchParams = (filters?: POIFilters) => {
  const params: Record<string, string | number | boolean> = { is_active: true };
  if (!filters) return params;

  if (filters.searchTerm) params.search = filters.searchTerm;
  if (filters.isRestaurant !== undefined) params.is_restaurant = filters.isRestaurant;
  if (filters.isAccommodation !== undefined) params.is_accommodation = filters.isAccommodation;
  if (filters.isActivity !== undefined) params.is_activity = filters.isActivity;
  if (filters.priceRange) params.price_range = filters.priceRange;
  if (filters.budgetLevel) params['budget_level__code'] = filters.budgetLevel;
  if (filters.accessibility) params.is_wheelchair_accessible = true;

  return params;
};

const mapApiPoi = (item: any, centerLat: number, centerLon: number): POI | null => {
  if (item.latitude === null || item.longitude === null) return null;
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  const metadata = item.metadata ?? {};
  const poi: POI = {
    id: item.id,
    name: item.name || '',
    description: item.description ?? undefined,
    latitude,
    longitude,
    address: item.address ?? undefined,
    contact_phone: item.contact_phone ?? undefined,
    contact_email: item.contact_email ?? undefined,
    website_url: item.website_url ?? undefined,
    price_range: item.price_range ?? undefined,
    budget_level_id: item.budget_level_id ?? undefined,
    budget_level: item.budget_level ?? undefined,
    amenities: item.amenities ?? metadata.amenities ?? [],
    tags: item.tags ?? [],
    media_images: item.media_images ?? [],
    rating: item.rating ?? undefined,
    review_count: item.review_count ?? undefined,
    opening_hours: metadata.opening_hours ?? item.opening_hours ?? undefined,
    is_active: item.is_active,
    owner_id: item.owner ?? item.owner_id ?? '',
    distance: calculateDistance(centerLat, centerLon, latitude, longitude),
    difficulty_level_id: item.difficulty_level_id ?? undefined,
    is_wheelchair_accessible: item.is_wheelchair_accessible ?? metadata.is_wheelchair_accessible ?? false,
    has_accessible_parking: item.has_accessible_parking ?? metadata.has_accessible_parking ?? false,
    has_accessible_restrooms: item.has_accessible_restrooms ?? metadata.has_accessible_restrooms ?? false,
    has_audio_guide: item.has_audio_guide ?? metadata.has_audio_guide ?? false,
    has_sign_language_support: item.has_sign_language_support ?? metadata.has_sign_language_support ?? false,
    difficulty_level: item.difficulty_level ?? undefined,
    is_restaurant: item.is_restaurant ?? metadata.is_restaurant ?? false,
    cuisine_types: item.cuisine_types ?? metadata.cuisine_types ?? [],
    dietary_restrictions_supported:
      item.dietary_restrictions_supported ?? metadata.dietary_restrictions_supported ?? [],
    restaurant_categories: item.restaurant_categories ?? metadata.restaurant_categories ?? [],
    culinary_adventure_level_id:
      item.culinary_adventure_level_id ?? metadata.culinary_adventure_level_id ?? undefined,
    is_accommodation: item.is_accommodation ?? metadata.is_accommodation ?? false,
    accommodation_types: item.accommodation_types ?? metadata.accommodation_types ?? [],
    accommodation_amenities: item.accommodation_amenities ?? metadata.accommodation_amenities ?? [],
    accommodation_locations: item.accommodation_locations ?? metadata.accommodation_locations ?? [],
    accommodation_accessibility:
      item.accommodation_accessibility ?? metadata.accommodation_accessibility ?? [],
    accommodation_security: item.accommodation_security ?? metadata.accommodation_security ?? [],
    accommodation_ambiance: item.accommodation_ambiance ?? metadata.accommodation_ambiance ?? [],
    accommodation_capacity: item.accommodation_capacity ?? metadata.accommodation_capacity ?? undefined,
    accommodation_rooms: item.accommodation_rooms ?? metadata.accommodation_rooms ?? undefined,
    is_activity: item.is_activity ?? metadata.is_activity ?? false,
    activity_categories: item.activity_categories ?? metadata.activity_categories ?? [],
    activity_intensity_level_id:
      item.activity_intensity_level_id ?? metadata.activity_intensity_level_id ?? undefined,
    activity_interests: item.activity_interests ?? metadata.activity_interests ?? [],
    activity_avoidances: item.activity_avoidances ?? metadata.activity_avoidances ?? [],
    activity_duration_minutes:
      item.activity_duration_minutes ?? metadata.activity_duration_minutes ?? undefined,
    activity_difficulty_level_id:
      item.activity_difficulty_level_id ?? metadata.activity_difficulty_level_id ?? undefined,
    metadata,
  };

  return poi;
};

const applyArrayFilter = (source: string[] = [], values?: string[], matchAll?: boolean) => {
  if (!values || values.length === 0) return true;
  return matchAll
    ? values.every(value => source.includes(value))
    : source.some(value => values.includes(value));
};

// Récupère les POI dans un rayon donné
export const getPOIsInRadius = async (
  centerLat: number,
  centerLon: number,
  radiusKm: number = 30,
  filters?: POIFilters
): Promise<POI[]> => {
  try {
    const params = buildSearchParams(filters);
    const data = await apiClient.get<any[]>('poi/tourist-points/', params);

    let filteredPOIs = (data ?? [])
      .map(item => mapApiPoi(item, centerLat, centerLon))
      .filter((poi): poi is POI => !!poi && poi.distance !== undefined && poi.distance <= radiusKm);

    // Filtres numériques et booléens
    if (filters?.rating) {
      filteredPOIs = filteredPOIs.filter(poi => (poi.rating ?? 0) >= filters.rating!);
    }

    if (filters?.maxDifficulty) {
      filteredPOIs = filteredPOIs.filter(
        poi => (poi.difficulty_level?.level_value ?? Infinity) <= filters.maxDifficulty!
      );
    }

    // Filtres culinaires
    if (filters?.cuisineTypes?.length) {
      filteredPOIs = filteredPOIs.filter(poi => applyArrayFilter(poi.cuisine_types, filters.cuisineTypes));
    }

    if (filters?.dietaryRestrictions?.length) {
      filteredPOIs = filteredPOIs.filter(poi =>
        applyArrayFilter(poi.dietary_restrictions_supported, filters.dietaryRestrictions, true)
      );
    }

    if (filters?.restaurantCategories?.length) {
      filteredPOIs = filteredPOIs.filter(poi => applyArrayFilter(poi.restaurant_categories, filters.restaurantCategories));
    }

    // Filtres hébergements
    if (filters?.accommodationTypes?.length) {
      filteredPOIs = filteredPOIs.filter(poi => applyArrayFilter(poi.accommodation_types, filters.accommodationTypes));
    }

    if (filters?.accommodationAmenities?.length) {
      filteredPOIs = filteredPOIs.filter(poi =>
        applyArrayFilter(poi.accommodation_amenities, filters.accommodationAmenities, true)
      );
    }

    if (filters?.accommodationLocations?.length) {
      filteredPOIs = filteredPOIs.filter(poi => applyArrayFilter(poi.accommodation_locations, filters.accommodationLocations));
    }

    if (filters?.accommodationAccessibility?.length) {
      filteredPOIs = filteredPOIs.filter(poi =>
        applyArrayFilter(poi.accommodation_accessibility, filters.accommodationAccessibility, true)
      );
    }

    if (filters?.accommodationSecurity?.length) {
      filteredPOIs = filteredPOIs.filter(poi =>
        applyArrayFilter(poi.accommodation_security, filters.accommodationSecurity, true)
      );
    }

    if (filters?.accommodationAmbiance?.length) {
      filteredPOIs = filteredPOIs.filter(poi => applyArrayFilter(poi.accommodation_ambiance, filters.accommodationAmbiance));
    }

    // Filtres activités
    if (filters?.activityCategories?.length) {
      filteredPOIs = filteredPOIs.filter(poi => applyArrayFilter(poi.activity_categories, filters.activityCategories));
    }

    if (filters?.activityInterests?.length) {
      filteredPOIs = filteredPOIs.filter(poi => applyArrayFilter(poi.activity_interests, filters.activityInterests));
    }

    if (filters?.activityAvoidances?.length) {
      filteredPOIs = filteredPOIs.filter(
        poi => !applyArrayFilter(poi.activity_avoidances, filters.activityAvoidances)
      );
    }

    if (filters?.activityDuration) {
      filteredPOIs = filteredPOIs.filter(poi => {
        const duration = poi.activity_duration_minutes ?? 0;
        const minOk = filters.activityDuration?.min ? duration >= filters.activityDuration.min : true;
        const maxOk = filters.activityDuration?.max ? duration <= filters.activityDuration.max : true;
        return minOk && maxOk;
      });
    }

    // Filtres tags & catégories (logique existante)
    if (filters?.tags?.length) {
      filteredPOIs = filteredPOIs.filter(poi =>
        (poi.tags || []).some(tag => filters.tags!.includes(tag))
      );
    }

    if (filters?.categories?.length) {
      filteredPOIs = filteredPOIs.filter(poi => filters.categories!.includes(categorizePOI(poi)));
    }

    if (filters?.travelGroup) {
      const { filterPOIsForGroup } = await import('./poiTargetMatchingService');
      filteredPOIs = filterPOIsForGroup(filteredPOIs, filters.travelGroup);
    }

    return filteredPOIs.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    console.error('Erreur lors de la récupération des POI:', error);
    return [];
  }
};

export const createTouristPoint = async (payload: TouristPointPayload) => {
  return apiClient.post('poi/tourist-points/', payload);
};

export const updateTouristPoint = async (id: string, payload: Partial<TouristPointPayload>) => {
  return apiClient.patch(`poi/tourist-points/${id}/`, payload);
};

export interface POIAnalytics {
  poi_id: string;
  views: number;
  favorites: number;
  reviews: number;
  rating: number;
}

export const getPOIAnalytics = async (poiId: string): Promise<POIAnalytics> => {
  return apiClient.get(`poi/tourist-points/${poiId}/analytics/`);
};

// Catégorise les POI par type
export const categorizePOI = (poi: POI): string => {
  // Check explicit flags first
  if (poi.is_activity) {
    return 'activity';
  }
  
  if (poi.is_restaurant) {
    return 'restaurant';
  }
  
  if (poi.is_accommodation) {
    return 'accommodation';
  }
  
  const tags = poi.tags || [];
  const name = poi.name.toLowerCase();
  const description = (poi.description || '').toLowerCase();
  
  // Combiner toutes les sources de texte pour la catégorisation
  const allText = [...tags.map(t => t.toLowerCase()), name, description].join(' ');
  
  // Catégories pour restaurants
  const restaurantKeywords = [
    'restaurant', 'café', 'bar', 'boulangerie', 'patisserie',
    'bistro', 'brasserie', 'pizzeria', 'traiteur', 'fastfood',
    'fast-food', 'cuisine', 'gastronomie', 'repas', 'manger',
    'dîner', 'déjeuner', 'petit-déjeuner', 'snack', 'sandwicherie',
    'crêperie', 'glacier', 'tea', 'thé', 'coffee', 'boire',
    'boisson', 'menu', 'plat', 'nourriture', 'food'
  ];
  
  if (restaurantKeywords.some(keyword => allText.includes(keyword))) {
    return 'restaurant';
  }

  // Catégories pour hébergements
  const accommodationKeywords = [
    'hotel', 'hôtel', 'auberge', 'gîte', 'camping', 'motel', 'resort', 'hostel', 
    'bed & breakfast', 'b&b', 'chambre d\'hôtes', 'hébergement', 'logement',
    'appartement', 'villa', 'chalet', 'maison d\'hôtes', 'pension'
  ];
  
  if (accommodationKeywords.some(keyword => allText.includes(keyword))) {
    return 'accommodation';
  }
  
  // Catégories pour activités
  const activityKeywords = [
    'musée', 'museum', 'parc', 'park', 'cinéma', 'cinema', 'théâtre', 'theater',
    'sport', 'galerie', 'gallery', 'exposition', 'spectacle', 'concert',
    'animation', 'activité', 'activity', 'loisir', 'divertissement',
    'jeu', 'game', 'bowling', 'piscine', 'spa', 'fitness', 'gym',
    'plage', 'beach', 'randonnée', 'hiking', 'vélo', 'bike',
    'karting', 'escape', 'laser', 'paintball', 'aventure'
  ];
  
  if (activityKeywords.some(keyword => allText.includes(keyword))) {
    return 'activity';
  }
  
  // Catégories pour points d'intérêt touristiques
  const touristKeywords = [
    'monument', 'historique', 'historic', 'château', 'castle', 'église', 'church',
    'cathédrale', 'basilique', 'abbaye', 'patrimoine', 'heritage',
    'naturel', 'natural', 'emblématique', 'iconic', 'vue', 'view',
    'panorama', 'belvédère', 'observatoire', 'tour', 'tower',
    'pont', 'bridge', 'fontaine', 'fountain', 'statue', 'jardin',
    'garden', 'place', 'square', 'marché', 'market', 'site'
  ];
  
  if (touristKeywords.some(keyword => allText.includes(keyword))) {
    return 'tourist';
  }
  
  return 'other';
};

// Obtient l'icône appropriée pour le type de POI
export const getPOIIcon = (category: string): string => {
  switch (category) {
    case 'restaurant':
      return '🍽️';
    case 'accommodation':
      return '🏨';
    case 'activity':
      return '🎯';
    case 'tourist':
      return '🏛️';
    default:
      return '📍';
  }
};

// Obtient la couleur appropriée pour le type de POI
export const getPOIColor = (category: string): string => {
  switch (category) {
    case 'restaurant':
      return '#ef4444'; // red-500
    case 'accommodation':
      return '#10b981'; // emerald-500
    case 'activity':
      return '#3b82f6'; // blue-500
    case 'tourist':
      return '#8b5cf6'; // violet-500
    default:
      return '#6b7280'; // gray-500
  }
};
