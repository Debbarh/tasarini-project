import { apiClient } from "@/integrations/api/client";
import { ActivityPreferences } from "@/types/trip";
import { getPOIsInRadius } from "./poiService";

export interface ActivityPOI {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  is_activity: boolean;
  activity_categories: string[];
  activity_intensity_level_id?: string;
  activity_interests: string[];
  activity_avoidances: string[];
  activity_duration_minutes?: number;
  activity_difficulty_level_id?: string;
  difficulty_level?: {
    code: string;
    label_fr: string;
    level_value: number;
    is_child_friendly: boolean;
    is_senior_friendly: boolean;
  };
  intensity_level?: {
    code: string;
    label_fr: string;
    level_value: number;
  };
  tags: string[];
  price_range?: string;
}

export interface ActivityCompatibilityScore {
  poi: ActivityPOI;
  score: number;
  breakdown: {
    categoryMatch: number;
    intensityMatch: number;
    interestMatch: number;
    avoidanceCheck: number;
    difficultyMatch: number;
  };
  reasons: string[];
}

/**
 * Filtre les POIs selon les préférences d'activités
 */
export async function filterPOIsByActivityPreferences(
  pois: ActivityPOI[],
  preferences: ActivityPreferences
): Promise<ActivityCompatibilityScore[]> {
  const scoredPOIs: ActivityCompatibilityScore[] = [];

  for (const poi of pois) {
    // Ignorer les POIs qui ne sont pas des activités
    if (!poi.is_activity) continue;

    const score = await calculateActivityCompatibilityScore(poi, preferences);
    
    if (score.score > 0) {
      scoredPOIs.push(score);
    }
  }

  // Trier par score décroissant
  return scoredPOIs.sort((a, b) => b.score - a.score);
}

/**
 * Calcule un score de compatibilité entre un POI et les préférences d'activités
 */
export async function calculateActivityCompatibilityScore(
  poi: ActivityPOI,
  preferences: ActivityPreferences
): Promise<ActivityCompatibilityScore> {
  const breakdown = {
    categoryMatch: 0,
    intensityMatch: 0,
    interestMatch: 0,
    avoidanceCheck: 0,
    difficultyMatch: 0,
  };
  const reasons: string[] = [];

  // 1. Correspondance des catégories (40% du score)
  const categoryScore = matchActivityCategories(poi.activity_categories, preferences.categories);
  breakdown.categoryMatch = categoryScore * 0.4;
  if (categoryScore > 0) {
    reasons.push(`Catégories correspondantes: ${poi.activity_categories.filter(cat => preferences.categories.includes(cat)).join(', ')}`);
  }

  // 2. Correspondance du niveau d'intensité (25% du score)
  const intensityScore = await matchActivityIntensity(poi, preferences.intensity);
  breakdown.intensityMatch = intensityScore * 0.25;
  if (intensityScore > 0) {
    reasons.push(`Niveau d'intensité compatible: ${preferences.intensity}`);
  }

  // 3. Correspondance des centres d'intérêt (20% du score)
  const interestScore = matchActivityInterests(poi.activity_interests, preferences.interests);
  breakdown.interestMatch = interestScore * 0.2;
  if (interestScore > 0) {
    reasons.push(`Centres d'intérêt communs: ${poi.activity_interests.filter(int => preferences.interests.includes(int)).join(', ')}`);
  }

  // 4. Vérification des éléments à éviter (10% du score)
  const avoidanceScore = checkActivityAvoidances(poi.activity_avoidances, preferences.avoidances);
  breakdown.avoidanceCheck = avoidanceScore * 0.1;
  if (avoidanceScore === 1) {
    reasons.push("Aucun élément à éviter détecté");
  }

  // 5. Niveau de difficulté adapté (5% du score)
  const difficultyScore = await matchActivityDifficulty(poi, preferences);
  breakdown.difficultyMatch = difficultyScore * 0.05;
  if (difficultyScore > 0) {
    reasons.push("Niveau de difficulté adapté");
  }

  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

  return {
    poi,
    score: Math.round(totalScore * 100),
    breakdown,
    reasons,
  };
}

/**
 * Vérifie la correspondance des catégories d'activités
 */
function matchActivityCategories(poiCategories: string[], userCategories: string[]): number {
  if (!userCategories.length || !poiCategories.length) return 0;
  
  const matches = poiCategories.filter(cat => userCategories.includes(cat));
  return matches.length / userCategories.length;
}

/**
 * Vérifie la correspondance du niveau d'intensité
 */
async function matchActivityIntensity(poi: ActivityPOI, userIntensity: string): Promise<number> {
  if (!poi.activity_intensity_level_id || !userIntensity) return 0.5; // Score neutre si pas d'info

  try {
    const intensityLevels = await fetchIntensityLevels();
    if (!intensityLevels.length) return 0.5;

    const poiIntensity = intensityLevels.find(level => level.code === (poi.intensity_level?.code ?? poi.activity_intensity_level_id));
    const userIntensityLevel = intensityLevels.find(level => level.code === userIntensity);

    if (!poiIntensity || !userIntensityLevel) return 0.5;

    // Plus la différence est petite, meilleur est le score
    const difference = Math.abs(poiIntensity.level_value - userIntensityLevel.level_value);
    const maxDifference = Math.max(...intensityLevels.map(l => l.level_value)) - Math.min(...intensityLevels.map(l => l.level_value));
    
    return Math.max(0, 1 - (difference / maxDifference));
  } catch (error) {
    console.error('Erreur lors de la vérification du niveau d\'intensité:', error);
    return 0.5;
  }
}

/**
 * Vérifie la correspondance des centres d'intérêt
 */
function matchActivityInterests(poiInterests: string[], userInterests: string[]): number {
  if (!userInterests.length) return 1; // Si pas de préférence, score maximum
  if (!poiInterests.length) return 0.5; // Score neutre si le POI n'a pas d'intérêts définis
  
  const matches = poiInterests.filter(interest => userInterests.includes(interest));
  return Math.min(1, matches.length / Math.min(poiInterests.length, userInterests.length));
}

/**
 * Vérifie l'absence d'éléments à éviter
 */
function checkActivityAvoidances(poiAvoidances: string[], userAvoidances: string[]): number {
  if (!userAvoidances.length) return 1; // Si rien à éviter, score maximum
  if (!poiAvoidances.length) return 1; // Si le POI n'a pas d'éléments définis, on assume qu'il est OK
  
  const conflicts = poiAvoidances.filter(avoidance => userAvoidances.includes(avoidance));
  return conflicts.length === 0 ? 1 : 0; // Tout ou rien pour les éléments à éviter
}

/**
 * Vérifie l'adaptation du niveau de difficulté
 */
async function matchActivityDifficulty(poi: ActivityPOI, preferences: ActivityPreferences): Promise<number> {
  if (!poi.activity_difficulty_level_id) return 1; // Score maximum si pas de difficulté définie

  try {
    // Pour l'instant, on considère que toutes les difficultés sont acceptables
    // Cette logique pourrait être étendue avec des préférences utilisateur plus détaillées
    return 1;
  } catch (error) {
    console.error('Erreur lors de la vérification du niveau de difficulté:', error);
    return 0.5;
  }
}

/**
 * Suggère des activités alternatives basées sur les préférences
 */
export async function suggestAlternativeActivities(
  centerLat: number,
  centerLon: number,
  preferences: ActivityPreferences,
  radiusKm: number = 10
): Promise<ActivityCompatibilityScore[]> {
  try {
    const poiFilters = { isActivity: true };
    const pois = await getPOIsInRadius(centerLat, centerLon, radiusKm, poiFilters);

    const activityPOIs: ActivityPOI[] = pois
      .filter(poi => poi.is_activity)
      .map(poi => ({
        id: poi.id,
        name: poi.name,
        description: poi.description,
        latitude: poi.latitude,
        longitude: poi.longitude,
        rating: poi.rating,
        is_activity: poi.is_activity || false,
        activity_categories: poi.activity_categories || [],
        activity_intensity_level_id: poi.activity_intensity_level_id,
        activity_interests: poi.activity_interests || [],
        activity_avoidances: poi.activity_avoidances || [],
        activity_duration_minutes: poi.activity_duration_minutes,
        activity_difficulty_level_id: poi.activity_difficulty_level_id,
        difficulty_level: poi.difficulty_level,
        intensity_level: poi.metadata?.intensity_level ?? undefined,
        tags: poi.tags || [],
        price_range: poi.price_range,
      }));

    return filterPOIsByActivityPreferences(activityPOIs, preferences);
  } catch (error) {
    console.error('Erreur lors de la suggestion d\'activités alternatives:', error);
    return [];
  }
}

type ActivityIntensityLevel = { code: string; level_value: number };
let intensityCache: ActivityIntensityLevel[] | null = null;

async function fetchIntensityLevels(): Promise<ActivityIntensityLevel[]> {
  if (intensityCache) {
    return intensityCache;
  }
  try {
    const levels = await apiClient.get<ActivityIntensityLevel[]>('activities/intensity-levels/');
    intensityCache = levels ?? [];
    return intensityCache;
  } catch (error) {
    console.error('Erreur lors du chargement des niveaux d’intensité', error);
    return [];
  }
}
