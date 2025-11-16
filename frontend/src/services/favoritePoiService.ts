import { apiClient } from '@/integrations/api/client';
import { POI } from '@/services/poiService';

export interface FavoritePOIEntry {
  id: string;
  tourist_point_id: string;
  tourist_point: Partial<POI> | null;
  created_at: string;
}

const BASE_ENDPOINT = 'poi/favorites/';

export const favoritePoiService = {
  list() {
    return apiClient.get<FavoritePOIEntry[]>(BASE_ENDPOINT);
  },

  add(tourist_point_id: string) {
    return apiClient.post<FavoritePOIEntry>(BASE_ENDPOINT, {
      tourist_point_input: tourist_point_id,
    });
  },

  remove(favoriteId: string) {
    return apiClient.delete<void>(`${BASE_ENDPOINT}${favoriteId}/`);
  },
};
