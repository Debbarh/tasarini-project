import { apiClient } from '@/integrations/api/client';

export interface BeInspiredOverviewStats {
  totalPOIs: number;
  totalFavorites: number;
  totalReviews: number;
  totalItineraries: number;
  avgRating: number;
  activeUsers: number;
}

export interface BeInspiredPOIStat {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  favorite_count: number;
  view_count: number;
  created_at: string;
  is_active: boolean;
  is_verified: boolean;
  tags: string[];
}

export interface BeInspiredUserActivity {
  id: string;
  email: string;
  favorites_count: number;
  reviews_count: number;
  itineraries_count: number;
  last_activity: string;
}

export interface BeInspiredAIStats {
  total_requests: number;
  successful_requests: number;
  average_response_time: number;
  most_asked_topics: string[];
  usage_by_day: Array<{ date: string; count: number }>;
  popular_queries: Array<{ query: string; count: number; satisfaction: number }>;
  response_times: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

const buildParams = (params?: Record<string, number | string | undefined>) => {
  if (!params) return undefined;
  const cleaned: Record<string, number | string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  });
  return Object.keys(cleaned).length ? cleaned : undefined;
};

export const beInspiredAnalyticsService = {
  getOverview(days?: number) {
    return apiClient.get<BeInspiredOverviewStats>('analytics/be-inspired/overview/', buildParams({ days }));
  },

  getPoiStats(params?: { days?: number; limit?: number }) {
    return apiClient.get<BeInspiredPOIStat[]>('analytics/be-inspired/pois/', buildParams(params));
  },

  getUserActivity(params?: { limit?: number }) {
    return apiClient.get<BeInspiredUserActivity[]>('analytics/be-inspired/users/', buildParams(params));
  },

  getAIStats(days?: number) {
    return apiClient.get<BeInspiredAIStats>('analytics/be-inspired/ai/', buildParams({ days }));
  },
};
