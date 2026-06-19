import { TravelGroup } from "@/types/trip";

export interface AccessibilityFeature {
  key: string;
  label: string;
  icon: string;
  description: string;
}

export const ACCESSIBILITY_FEATURES: AccessibilityFeature[] = [
  {
    key: 'is_wheelchair_accessible',
    label: 'Accès fauteuil roulant',
    icon: 'Accessibility',
    description: 'Lieu accessible aux personnes en fauteuil roulant'
  },
  {
    key: 'has_accessible_parking',
    label: 'Parking accessible',
    icon: 'SquareParking',
    description: 'Places de parking réservées aux personnes handicapées'
  },
  {
    key: 'has_accessible_restrooms',
    label: 'Toilettes accessibles',
    icon: 'Bath',
    description: 'Toilettes adaptées aux personnes à mobilité réduite'
  },
  {
    key: 'has_audio_guide',
    label: 'Guide audio',
    icon: 'Headphones',
    description: 'Guide audio disponible pour les personnes malvoyantes'
  },
  {
    key: 'has_sign_language_support',
    label: 'Langue des signes',
    icon: 'Hand',
    description: 'Support en langue des signes disponible'
  }
];

/**
 * Vérifie si un lieu répond aux besoins d'accessibilité d'un groupe
 */
export const checkAccessibilityRequirements = (
  poiFeatures: Record<string, boolean>,
  travelGroupType: string
): boolean => {
  if (travelGroupType === 'accessible') {
    // Pour les groupes accessibles, exiger au minimum l'accès fauteuil roulant
    return poiFeatures.is_wheelchair_accessible === true;
  }
  
  return true; // Pas d'exigences spéciales pour les autres groupes
};

/**
 * Calcule un score d'accessibilité pour un POI
 */
export const calculateAccessibilityScore = (features: Record<string, boolean>): number => {
  const totalFeatures = ACCESSIBILITY_FEATURES.length;
  const enabledFeatures = ACCESSIBILITY_FEATURES.filter(
    feature => features[feature.key] === true
  ).length;
  
  return Math.round((enabledFeatures / totalFeatures) * 100);
};

/**
 * Obtient les fonctionnalités d'accessibilité manquantes pour un groupe
 */
export const getMissingAccessibilityFeatures = (
  poiFeatures: Record<string, boolean>,
  travelGroup: TravelGroup
): AccessibilityFeature[] => {
  const missing: AccessibilityFeature[] = [];
  
  if (travelGroup.type === 'accessible') {
    // Vérifier les fonctionnalités critiques pour l'accessibilité
    const criticalFeatures = ['is_wheelchair_accessible', 'has_accessible_parking', 'has_accessible_restrooms'];
    
    criticalFeatures.forEach(featureKey => {
      if (!poiFeatures[featureKey]) {
        const feature = ACCESSIBILITY_FEATURES.find(f => f.key === featureKey);
        if (feature) missing.push(feature);
      }
    });
  }
  
  return missing;
};

/**
 * Génère des recommandations d'accessibilité pour un POI
 */
export const generateAccessibilityRecommendations = (
  features: Record<string, boolean>
): string[] => {
  const recommendations: string[] = [];
  
  if (!features.is_wheelchair_accessible) {
    recommendations.push('Ajouter un accès pour fauteuils roulants améliorerait grandement l\'accessibilité');
  }
  
  if (!features.has_accessible_parking) {
    recommendations.push('Des places de parking accessibles faciliteraient l\'accès');
  }
  
  if (!features.has_accessible_restrooms) {
    recommendations.push('Des toilettes accessibles sont essentielles pour les visiteurs à mobilité réduite');
  }
  
  if (!features.has_audio_guide) {
    recommendations.push('Un guide audio aiderait les visiteurs malvoyants');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Excellent niveau d\'accessibilité ! Ce lieu est bien équipé pour tous les visiteurs.');
  }
  
  return recommendations;
};

/**
 * Formate les fonctionnalités d'accessibilité pour l'affichage
 */
export const formatAccessibilityFeatures = (
  features: Record<string, boolean>
): { enabled: AccessibilityFeature[]; disabled: AccessibilityFeature[] } => {
  const enabled: AccessibilityFeature[] = [];
  const disabled: AccessibilityFeature[] = [];
  
  ACCESSIBILITY_FEATURES.forEach(feature => {
    if (features[feature.key]) {
      enabled.push(feature);
    } else {
      disabled.push(feature);
    }
  });
  
  return { enabled, disabled };
};