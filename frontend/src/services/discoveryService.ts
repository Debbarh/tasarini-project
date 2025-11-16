import { apiClient } from '@/integrations/api/client';

export interface DiscoveryItinerary {
  id: string;
  user: number;
  user_display_name?: string;
  title: string;
  description?: string;
  poi_ids: string[];
  estimated_duration_hours: number;
  total_distance_km: number;
  difficulty_level: 'easy' | 'medium' | 'hard';
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscoveryItineraryPayload {
  title: string;
  description?: string;
  poi_ids?: string[];
  estimated_duration_hours?: number;
  total_distance_km?: number;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  is_public?: boolean;
}

const BASE_ENDPOINT = 'discovery/itineraries/';

export const discoveryService = {
  list(params?: Record<string, string | number | boolean>) {
    return apiClient.get<DiscoveryItinerary[]>(BASE_ENDPOINT, params);
  },

  create(payload: DiscoveryItineraryPayload) {
    return apiClient.post<DiscoveryItinerary>(BASE_ENDPOINT, payload);
  },

  update(id: string, payload: Partial<DiscoveryItineraryPayload>) {
    return apiClient.patch<DiscoveryItinerary>(`${BASE_ENDPOINT}${id}/`, payload);
  },

  delete(id: string) {
    return apiClient.delete<void>(`${BASE_ENDPOINT}${id}/`);
  },
};
