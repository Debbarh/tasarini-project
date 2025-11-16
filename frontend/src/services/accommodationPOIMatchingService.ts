import { AccommodationPreferences } from '@/types/trip';
import { getPOIsInRadius, POI } from '@/services/poiService';

export interface AccommodationPOI {
  id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  accommodationTypes: string[];
  accommodationAmenities: string[];
  accommodationLocations: string[];
  accommodationAccessibility: string[];
  accommodationSecurity: string[];
  accommodationAmbiance: string[];
  priceRange?: string;
  rating?: number;
  distance?: number;
}

export interface AccommodationMatchResult {
  poi: AccommodationPOI;
  matchScore: number;
  matchReasons: string[];
  missingCriteria: string[];
}

/**
 * Calculate match score between accommodation preferences and POI
 */
export function calculateAccommodationMatchScore(
  preferences: AccommodationPreferences,
  poi: AccommodationPOI
): { score: number; reasons: string[]; missing: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const missing: string[] = [];
  const maxScore = 100;

  // Type matching (30% weight)
  const typeMatches = preferences.type.filter(prefType => 
    poi.accommodationTypes.includes(prefType)
  ).length;
  if (typeMatches > 0) {
    const typeScore = (typeMatches / preferences.type.length) * 30;
    score += typeScore;
    reasons.push(`Corresponds à ${typeMatches} type(s) d'hébergement souhaité(s)`);
  } else if (preferences.type.length > 0) {
    missing.push("Types d'hébergement souhaités");
  }

  // Amenities matching (25% weight)
  const amenityMatches = preferences.amenities.filter(prefAmenity => 
    poi.accommodationAmenities.includes(prefAmenity)
  ).length;
  if (amenityMatches > 0) {
    const amenityScore = Math.min((amenityMatches / preferences.amenities.length) * 25, 25);
    score += amenityScore;
    reasons.push(`Dispose de ${amenityMatches} équipement(s) souhaité(s)`);
  } else if (preferences.amenities.length > 0) {
    missing.push("Équipements souhaités");
  }

  // Location preferences matching (20% weight)
  const locationMatches = preferences.location.filter(prefLocation => 
    poi.accommodationLocations.includes(prefLocation)
  ).length;
  if (locationMatches > 0) {
    const locationScore = (locationMatches / preferences.location.length) * 20;
    score += locationScore;
    reasons.push(`Situé dans ${locationMatches} zone(s) préférée(s)`);
  } else if (preferences.location.length > 0) {
    missing.push("Emplacement préféré");
  }

  // Accessibility matching (10% weight)
  const accessibilityMatches = preferences.accessibility.filter(prefAccess => 
    poi.accommodationAccessibility.includes(prefAccess)
  ).length;
  if (accessibilityMatches > 0) {
    const accessScore = (accessibilityMatches / preferences.accessibility.length) * 10;
    score += accessScore;
    reasons.push(`${accessibilityMatches} option(s) d'accessibilité disponible(s)`);
  } else if (preferences.accessibility.length > 0) {
    missing.push("Options d'accessibilité");
  }

  // Security features matching (10% weight)
  const securityMatches = preferences.security.filter(prefSecurity => 
    poi.accommodationSecurity.includes(prefSecurity)
  ).length;
  if (securityMatches > 0) {
    const securityScore = (securityMatches / preferences.security.length) * 10;
    score += securityScore;
    reasons.push(`${securityMatches} mesure(s) de sécurité présente(s)`);
  } else if (preferences.security.length > 0) {
    missing.push("Mesures de sécurité");
  }

  // Ambiance matching (5% weight)
  const ambianceMatches = preferences.ambiance.filter(prefAmbiance => 
    poi.accommodationAmbiance.includes(prefAmbiance)
  ).length;
  if (ambianceMatches > 0) {
    const ambianceScore = (ambianceMatches / preferences.ambiance.length) * 5;
    score += ambianceScore;
    reasons.push(`Ambiance ${ambianceMatches > 1 ? 'correspondante' : 'correspondante'}`);
  } else if (preferences.ambiance.length > 0) {
    missing.push("Ambiance souhaitée");
  }

  return {
    score: Math.min(score, maxScore),
    reasons,
    missing
  };
}

/**
 * Find accommodation POIs matching the given preferences within a radius
 */
export async function findMatchingAccommodationPOIs(
  preferences: AccommodationPreferences,
  centerLat: number,
  centerLng: number,
  radiusKm: number = 10,
  limit: number = 20
): Promise<AccommodationMatchResult[]> {
  try {
    const poiResults = await getPOIsInRadius(centerLat, centerLng, radiusKm, {
      isAccommodation: true,
    });

    if (!poiResults || poiResults.length === 0) {
      return [];
    }

    const accommodationPOIs: AccommodationPOI[] = poiResults.map(mapPOIToAccommodation).filter(
      (poi): poi is AccommodationPOI => !!poi && typeof poi.latitude === 'number' && typeof poi.longitude === 'number',
    );

    // Calculate match scores
    const matchResults: AccommodationMatchResult[] = accommodationPOIs.map((poi) => {
      const matchResult = calculateAccommodationMatchScore(preferences, poi);
      return {
        poi,
        matchScore: matchResult.score,
        matchReasons: matchResult.reasons,
        missingCriteria: matchResult.missing
      };
    });

    return matchResults
      .sort((a, b) => {
        if (Math.abs(a.matchScore - b.matchScore) > 5) {
          return b.matchScore - a.matchScore;
        }
        return (a.poi.distance || 0) - (b.poi.distance || 0);
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Error in accommodation POI matching:', error);
    return [];
  }
}

/**
 * Get accommodation suggestions for a specific POI based on proximity and compatibility
 */
export async function getAccommodationSuggestions(
  targetPOI: { latitude: number; longitude: number },
  preferences: AccommodationPreferences,
  radiusKm: number = 5,
  limit: number = 10
): Promise<AccommodationMatchResult[]> {
  return findMatchingAccommodationPOIs(
    preferences,
    targetPOI.latitude,
    targetPOI.longitude,
    radiusKm,
    limit
  );
}

const mapPOIToAccommodation = (poi: POI): AccommodationPOI | null => {
  if (poi.latitude == null || poi.longitude == null) {
    return null;
  }

  return {
    id: poi.id,
    name: poi.name,
    description: poi.description,
    latitude: poi.latitude,
    longitude: poi.longitude,
    accommodationTypes: poi.accommodation_types ?? [],
    accommodationAmenities: poi.accommodation_amenities ?? [],
    accommodationLocations: poi.accommodation_locations ?? [],
    accommodationAccessibility: poi.accommodation_accessibility ?? [],
    accommodationSecurity: poi.accommodation_security ?? [],
    accommodationAmbiance: poi.accommodation_ambiance ?? [],
    priceRange: poi.price_range,
    rating: poi.rating,
    distance: poi.distance,
  };
};

/**
 * Analyze accommodation preferences compatibility
 */
export function analyzeAccommodationCompatibility(
  preferences: AccommodationPreferences
): {
  score: number;
  recommendations: string[];
  warnings: string[];
} {
  const recommendations: string[] = [];
  const warnings: string[] = [];
  let score = 75; // Base score

  // Check for conflicting preferences
  if (preferences.type.includes('camping') && preferences.amenities.includes('spa')) {
    warnings.push("Le camping et les services de spa sont rarement compatibles");
    score -= 10;
  }

  if (preferences.location.includes('centre_ville') && preferences.ambiance.includes('nature')) {
    warnings.push("Centre-ville et ambiance nature peuvent être difficiles à concilier");
    score -= 5;
  }

  // Provide recommendations
  if (preferences.accessibility.length > 0) {
    recommendations.push("Vérifiez les certifications d'accessibilité des établissements");
  }

  if (preferences.type.includes('hotel') && preferences.amenities.includes('cuisine_equipee')) {
    recommendations.push("Considérez les apart-hôtels pour combiner confort hôtelier et cuisine équipée");
  }

  if (preferences.security.length > 2) {
    recommendations.push("Les hôtels de chaîne offrent généralement plus de garanties sécuritaires");
  }

  return {
    score: Math.max(score, 0),
    recommendations,
    warnings
  };
}
