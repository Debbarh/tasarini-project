import { apiClient } from '@/integrations/api/client';
import type { BudgetLevel } from '@/hooks/useBudgetSettings';
import type { Budget } from '@/types/trip';
import type { POI } from './poiService';

export interface POIBudgetMatch {
  isAffordable: boolean;
  budgetLevel: BudgetLevel | null;
  priceIndicator: string;
  recommendations: string[];
}

/**
 * Détermine si un POI correspond au niveau de budget d'un groupe de voyage
 */
export const isPOIAffordableForBudget = (poi: POI, budget: Budget): boolean => {
  if (!poi.budget_level_id || !budget.dailyBudget) return true;
  
  // Logique simple : si le budget quotidien est supérieur au montant minimum du niveau de budget du POI
  // Cette logique peut être affinée selon les besoins
  return budget.dailyBudget >= (poi.budget_level?.min_daily_amount || 0);
};

/**
 * Filtre les POIs selon le budget du groupe de voyage
 */
export const filterPOIsByBudget = (pois: POI[], budget: Budget): POI[] => {
  return pois.filter(poi => isPOIAffordableForBudget(poi, budget));
};

/**
 * Obtient les niveaux de budget compatibles avec un budget quotidien donné
 */
export const getCompatibleBudgetLevels = async (dailyBudget: number): Promise<BudgetLevel[]> => {
  try {
    const budgetLevels = await apiClient.get<BudgetLevel[]>('poi/budget-levels/');
    return (budgetLevels || []).filter((level) => {
      if (level.is_active === false) {
        return false;
      }
      if (!dailyBudget) {
        return true;
      }
      const minAmount = typeof level.min_daily_amount === 'number' ? Number(level.min_daily_amount) : 0;
      return minAmount <= dailyBudget;
    });
  } catch (error) {
    console.error('Error fetching compatible budget levels:', error);
    return [];
  }
};

/**
 * Analyse la correspondance budget-POI et fournit des recommandations
 */
export const analyzePOIBudgetMatch = async (poi: POI, budget: Budget): Promise<POIBudgetMatch> => {
  const isAffordable = isPOIAffordableForBudget(poi, budget);
  
  let budgetLevel: BudgetLevel | null = null;
  if (poi.budget_level) {
    budgetLevel = poi.budget_level as BudgetLevel;
  } else if (poi.budget_level_id) {
    try {
      budgetLevel = await apiClient.get<BudgetLevel>(`poi/budget-levels/${poi.budget_level_id}/`);
    } catch (error) {
      console.warn('Unable to fetch budget level', error);
    }
  }

  const priceIndicator = budgetLevel?.icon_emoji || '💰';
  
  const recommendations: string[] = [];
  if (!isAffordable && budgetLevel) {
    recommendations.push(`Ce POI nécessite un budget ${budgetLevel.label_fr.toLowerCase()}`);
    recommendations.push(`Montant minimum suggéré: ${budgetLevel.min_daily_amount}€/jour`);
  }

  return {
    isAffordable,
    budgetLevel,
    priceIndicator,
    recommendations
  };
};

/**
 * Obtient les POIs dans une gamme de budget spécifique
 */
export const getPOIsByBudgetLevel = async (budgetLevelCode: string, radius?: number, latitude?: number, longitude?: number): Promise<POI[]> => {
  try {
    const params: Record<string, string> = {
      'budget_level__code': budgetLevelCode,
      status: 'approved',
    };
    const pois = await apiClient.get<POI[]>('poi/tourist-points/', params);
    if (radius && latitude && longitude) {
      return (pois || []).filter((poi) => {
        if (poi.latitude === undefined || poi.longitude === undefined) {
          return false;
        }
        const dLat = (poi.latitude - latitude) * Math.PI / 180;
        const dLon = (poi.longitude - longitude) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(latitude * Math.PI / 180) *
            Math.cos(poi.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = 6371 * c;
        return distance <= radius;
      });
    }
    return pois || [];
  } catch (error) {
    console.error('Error fetching POIs by budget level:', error);
    return [];
  }
};

/**
 * Mappe automatiquement un ancien price_range vers un niveau de budget
 */
export const mapPriceRangeToBudgetLevel = (priceRange: string): string => {
  const mapping: { [key: string]: string } = {
    '€': 'economique',
    '€€': 'standard', 
    '€€€': 'premium',
    '€€€€': 'luxe'
  };
  
  return mapping[priceRange] || 'standard';
};

/**
 * Calcule le nombre de POIs abordables dans une liste pour un budget donné
 */
export const countAffordablePOIs = (pois: POI[], budget: Budget): number => {
  return pois.filter(poi => isPOIAffordableForBudget(poi, budget)).length;
};
