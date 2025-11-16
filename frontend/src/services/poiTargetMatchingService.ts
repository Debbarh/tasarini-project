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
}

export interface TargetAudience {
  segment: string;
  label: string;
  icon: string;
  suitable: boolean;
  reason?: string;
}

/**
 * Détermine les segments cibles d'un POI basé sur sa difficulté et ses caractéristiques d'accessibilité
 */
export const getPOITargetAudience = (poi: POI): TargetAudience[] => {
  const audiences: TargetAudience[] = [];
  
  // Obtenir le niveau de difficulté
  const difficultyLevel = poi.difficulty_level?.level_value || 3; // Modéré par défaut
  const isChildFriendly = poi.difficulty_level?.is_child_friendly ?? true;
  const isSeniorFriendly = poi.difficulty_level?.is_senior_friendly ?? true;
  const isWheelchairAccessible = poi.is_wheelchair_accessible ?? false;

  // Enfants (0-12 ans)
  const childrenSuitable = difficultyLevel <= 2 && isChildFriendly;
  audiences.push({
    segment: 'children',
    label: 'Enfants',
    icon: '👶',
    suitable: childrenSuitable,
    reason: !childrenSuitable ? 'Niveau de difficulté trop élevé pour les enfants' : undefined
  });

  // Seniors (65+ ans)
  const seniorsSuitable = difficultyLevel <= 3 && isSeniorFriendly;
  audiences.push({
    segment: 'seniors',
    label: 'Seniors',
    icon: '👴',
    suitable: seniorsSuitable,
    reason: !seniorsSuitable ? 'Niveau de difficulté élevé, non recommandé pour les seniors' : undefined
  });

  // Personnes à mobilité réduite
  audiences.push({
    segment: 'accessibility',
    label: 'Mobilité réduite',
    icon: '♿',
    suitable: isWheelchairAccessible,
    reason: !isWheelchairAccessible ? 'Lieu non accessible aux fauteuils roulants' : undefined
  });

  // Familles
  const familySuitable = difficultyLevel <= 3 && isChildFriendly;
  audiences.push({
    segment: 'families',
    label: 'Familles',
    icon: '👨‍👩‍👧‍👦',
    suitable: familySuitable,
    reason: !familySuitable ? 'Activité non adaptée aux familles avec enfants' : undefined
  });

  return audiences;
};

/**
 * Détermine le niveau de difficulté maximum approprié pour un groupe de voyage
 */
export const getMaxDifficultyForGroup = (travelGroup: TravelGroup): number => {
  // Vérifier s'il y a des enfants
  if (travelGroup.children?.count && travelGroup.children.count > 0) {
    const youngestAge = Math.min(...(travelGroup.children.ages || []));
    
    if (youngestAge <= 3) return 1; // Très facile seulement
    if (youngestAge <= 8) return 2; // Facile maximum
    if (youngestAge <= 12) return 3; // Modéré maximum
    return 4; // Difficile maximum pour ados
  }

  // Vérifier le type de groupe
  if (travelGroup.type === 'accessible') return 2; // Facile maximum pour accessibilité
  if (travelGroup.subtype === 'senior') return 3; // Modéré maximum pour seniors
  
  return 5; // Tous niveaux pour adultes
};

/**
 * Vérifie si un POI est adapté à un groupe de voyage spécifique
 */
export const isPOISuitableForGroup = (poi: POI, travelGroup: TravelGroup): boolean => {
  const maxDifficulty = getMaxDifficultyForGroup(travelGroup);
  const poiDifficulty = poi.difficulty_level?.level_value || 3;
  
  // Vérifier le niveau de difficulté
  if (poiDifficulty > maxDifficulty) return false;
  
  // Vérifier l'accessibilité si nécessaire
  if (travelGroup.type === 'accessible' && !poi.is_wheelchair_accessible) return false;
  
  // Vérifier la compatibilité enfants
  if (travelGroup.children?.count && travelGroup.children.count > 0) {
    if (!poi.difficulty_level?.is_child_friendly) return false;
  }
  
  // Vérifier la compatibilité seniors
  if (travelGroup.subtype === 'senior') {
    if (!poi.difficulty_level?.is_senior_friendly) return false;
  }
  
  return true;
};

/**
 * Filtre une liste de POIs selon les critères d'un groupe de voyage
 */
export const filterPOIsForGroup = (pois: POI[], travelGroup: TravelGroup): POI[] => {
  return pois.filter(poi => isPOISuitableForGroup(poi, travelGroup));
};

/**
 * Obtient des statistiques de compatibilité pour un groupe
 */
export const getGroupCompatibilityStats = (pois: POI[], travelGroup: TravelGroup) => {
  const totalPOIs = pois.length;
  const suitablePOIs = filterPOIsForGroup(pois, travelGroup);
  const compatibilityRate = totalPOIs > 0 ? (suitablePOIs.length / totalPOIs) * 100 : 0;
  
  return {
    total: totalPOIs,
    suitable: suitablePOIs.length,
    rate: Math.round(compatibilityRate),
    recommendations: suitablePOIs.slice(0, 5) // Top 5 recommandations
  };
};

/**
 * Génère des messages d'explication pour les filtres appliqués
 */
export const getFilterExplanation = (travelGroup: TravelGroup): string[] => {
  const explanations: string[] = [];
  
  if (travelGroup.children?.count && travelGroup.children.count > 0) {
    const youngestAge = Math.min(...(travelGroup.children.ages || []));
    explanations.push(`Filtrage selon l'âge du plus jeune enfant (${youngestAge} ans)`);
  }
  
  if (travelGroup.type === 'accessible') {
    explanations.push('Sélection des lieux accessibles aux fauteuils roulants uniquement');
  }
  
  if (travelGroup.subtype === 'senior') {
    explanations.push('Priorité aux activités adaptées aux seniors');
  }
  
  const maxDifficulty = getMaxDifficultyForGroup(travelGroup);
  const difficultyLabels = ['', 'Très facile', 'Facile', 'Modéré', 'Difficile', 'Très difficile'];
  explanations.push(`Niveau de difficulté maximum: ${difficultyLabels[maxDifficulty]}`);
  
  return explanations;
};