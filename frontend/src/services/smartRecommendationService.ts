import { apiClient } from '@/integrations/api/client';

export interface SmartRecommendationResponse {
  recommendations: Array<{
    id: string;
    score: number;
    reason: string;
    poi: {
      id: string;
      name: string;
      description: string;
      tags: string[];
      rating: number;
      price_range: string;
      latitude: number;
      longitude: number;
    };
  }>;
  userProfile: {
    preferredTags: string[];
    preferredPriceRange: string;
    preferredDifficulty: string;
    avgDuration: number;
    visitedPOIs: string[];
  } | null;
}

export const smartRecommendationService = {
  fetch(payload: { userLat?: number; userLon?: number; radiusKm?: number }) {
    return apiClient.post<SmartRecommendationResponse>('travel/smart-recommendations/', payload);
  },
};
