import { apiClient } from "@/integrations/api/client";
import type { CulinaryPreferences } from "@/types/trip";

export interface CulinaryPOI {
  id: string;
  name: string;
  is_restaurant: boolean;
  cuisine_types: string[];
  dietary_restrictions_supported: string[];
  restaurant_categories: string[];
  culinary_adventure_level_id?: string;
  rating?: number;
  price_range?: string;
}

export interface CulinaryCompatibility {
  score: number;
  matches: {
    cuisine: boolean;
    dietary: boolean;
    category: boolean;
    adventure: boolean;
  };
  reasons: string[];
}

export class CulinaryPOIMatchingService {
  /**
   * Check if a POI is compatible with culinary preferences
   */
  static getPOICulinaireCOmpatibility(
    poi: CulinaryPOI, 
    preferences: CulinaryPreferences
  ): CulinaryCompatibility {
    if (!poi.is_restaurant) {
      return {
        score: 0,
        matches: { cuisine: false, dietary: false, category: false, adventure: false },
        reasons: ['Not a restaurant']
      };
    }

    const matches = {
      cuisine: this.checkCuisineMatch(poi.cuisine_types, preferences.cuisineTypes),
      dietary: this.checkDietaryMatch(poi.dietary_restrictions_supported, preferences.dietaryRestrictions),
      category: this.checkCategoryMatch(poi.restaurant_categories, preferences.restaurantCategories),
      adventure: this.checkAdventureMatch(poi.culinary_adventure_level_id, preferences.foodAdventure)
    };

    const score = this.calculateCompatibilityScore(matches, poi);
    const reasons = this.generateReasons(matches, poi, preferences);

    return { score, matches, reasons };
  }

  /**
   * Filter POIs based on culinary preferences
   */
  static filterPOIsByCulinaryPreferences(
    pois: CulinaryPOI[], 
    preferences: CulinaryPreferences
  ): CulinaryPOI[] {
    return pois.filter(poi => {
      if (!poi.is_restaurant) return true; // Non-restaurants pass through
      
      const compatibility = this.getPOICulinaireCOmpatibility(poi, preferences);
      return compatibility.score > 0.3; // Minimum 30% compatibility
    });
  }

  /**
   * Get culinary match score for sorting
   */
  static getCulinaryMatchScore(poi: CulinaryPOI, preferences: CulinaryPreferences): number {
    const compatibility = this.getPOICulinaireCOmpatibility(poi, preferences);
    return compatibility.score;
  }

  /**
   * Suggest culinary POIs based on preferences
   */
  static suggestCulinaryPOIs(
    pois: CulinaryPOI[], 
    preferences: CulinaryPreferences
  ): CulinaryPOI[] {
    return pois
      .filter(poi => poi.is_restaurant)
      .map(poi => ({
        ...poi,
        culinaryScore: this.getCulinaryMatchScore(poi, preferences)
      }))
      .sort((a, b) => (b as any).culinaryScore - (a as any).culinaryScore)
      .slice(0, 10); // Top 10 suggestions
  }

  private static checkCuisineMatch(poiCuisines: string[], preferredCuisines: string[]): boolean {
    if (preferredCuisines.length === 0) return true;
    return poiCuisines.some(cuisine => preferredCuisines.includes(cuisine));
  }

  private static checkDietaryMatch(poiDietary: string[], requiredDietary: string[]): boolean {
    if (requiredDietary.length === 0) return true;
    return requiredDietary.every(restriction => poiDietary.includes(restriction));
  }

  private static checkCategoryMatch(poiCategories: string[], preferredCategories: string[]): boolean {
    if (preferredCategories.length === 0) return true;
    return poiCategories.some(category => preferredCategories.includes(category));
  }

  private static checkAdventureMatch(poiAdventureId?: string, preferredAdventure?: string): boolean {
    if (!preferredAdventure || !poiAdventureId) return true;
    
    // Map adventure levels to values for comparison
    const adventureMap: Record<string, number> = {
      'conservative': 1,
      'moderate': 2,
      'adventurous': 3
    };

    // For now, return true - would need to query adventure level details
    return true;
  }

  private static calculateCompatibilityScore(
    matches: Record<string, boolean>,
    poi: CulinaryPOI
  ): number {
    let score = 0;
    
    // Base score for being a restaurant
    score += 0.2;
    
    // Cuisine match (30%)
    if (matches.cuisine) score += 0.3;
    
    // Dietary restrictions (25%)
    if (matches.dietary) score += 0.25;
    
    // Category match (15%)
    if (matches.category) score += 0.15;
    
    // Adventure level (10%)
    if (matches.adventure) score += 0.1;
    
    // Rating bonus (up to 20%)
    if (poi.rating) {
      score += (poi.rating / 5) * 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  private static generateReasons(
    matches: Record<string, boolean>,
    poi: CulinaryPOI,
    preferences: CulinaryPreferences
  ): string[] {
    const reasons: string[] = [];
    
    if (matches.cuisine) {
      const matchingCuisines = poi.cuisine_types.filter(c => preferences.cuisineTypes.includes(c));
      reasons.push(`Serves ${matchingCuisines.join(', ')} cuisine`);
    }
    
    if (matches.dietary) {
      const supportedRestrictions = poi.dietary_restrictions_supported
        .filter(r => preferences.dietaryRestrictions.includes(r));
      reasons.push(`Accommodates ${supportedRestrictions.join(', ')}`);
    }
    
    if (matches.category) {
      const matchingCategories = poi.restaurant_categories
        .filter(c => preferences.restaurantCategories.includes(c));
      reasons.push(`Matches preferred dining: ${matchingCategories.join(', ')}`);
    }
    
    if (poi.rating && poi.rating >= 4) {
      reasons.push(`Highly rated (${poi.rating}/5)`);
    }
    
    return reasons;
  }

  /**
   * Fetch culinary settings for form population
   */
  static async fetchCulinarySettings() {
    const [cuisineTypes, dietaryRestrictions, restaurantCategories, adventureLevels] = await Promise.all([
      apiClient.get('culinary/cuisine-types/'),
      apiClient.get('culinary/dietary-restrictions/'),
      apiClient.get('culinary/restaurant-categories/'),
      apiClient.get('culinary/adventure-levels/'),
    ]);

    return {
      cuisineTypes: cuisineTypes ?? [],
      dietaryRestrictions: dietaryRestrictions ?? [],
      restaurantCategories: restaurantCategories ?? [],
      adventureLevels: adventureLevels ?? [],
    };
  }
}
