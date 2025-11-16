import { apiClient } from '@/integrations/api/client';
import { DetailedItinerary } from '@/types/trip';

export interface SavedItinerary {
  id: string;
  title: string;
  description?: string;
  itinerary_data: DetailedItinerary;
  destination_summary?: string;
  trip_duration?: number;
  travel_dates?: Record<string, unknown>;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveItineraryPayload {
  title: string;
  description?: string;
  itinerary_data: DetailedItinerary;
  destination_summary?: string;
  trip_duration?: number;
  travel_dates?: Record<string, unknown>;
  is_favorite?: boolean;
}

const ENDPOINT = 'travel/saved-itineraries/';

export const savedItineraryService = {
  list(params?: Record<string, string | number | boolean>) {
    return apiClient.get<SavedItinerary[]>(ENDPOINT, params);
  },

  create(payload: SaveItineraryPayload) {
    return apiClient.post<SavedItinerary>(ENDPOINT, payload);
  },

  update(id: string, payload: Partial<SaveItineraryPayload>) {
    return apiClient.patch<SavedItinerary>(`${ENDPOINT}${id}/`, payload);
  },

  delete(id: string) {
    return apiClient.delete<void>(`${ENDPOINT}${id}/`);
  },
};
