import { apiClient } from '@/integrations/api/client';

export type AdvertisementVideoType = 'link' | 'upload';

export interface AdvertisementSetting {
  id: number;
  video_type: AdvertisementVideoType;
  video_url: string | null;
  is_enabled: boolean;
  title?: string;
  description?: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface AdvertisementSettingPayload {
  video_type?: AdvertisementVideoType;
  video_url?: string | null;
  is_enabled?: boolean;
  title?: string;
  description?: string;
  duration_seconds?: number;
}

export const advertisementService = {
  async list(): Promise<AdvertisementSetting[]> {
    return apiClient.get<AdvertisementSetting[]>('content/advertisements/');
  },

  async getLatest(): Promise<AdvertisementSetting | null> {
    const settings = await this.list();
    return settings?.[0] ?? null;
  },

  create(payload: AdvertisementSettingPayload) {
    return apiClient.post<AdvertisementSetting>('content/advertisements/', payload);
  },

  update(id: number | string, payload: AdvertisementSettingPayload) {
    return apiClient.patch<AdvertisementSetting>(`content/advertisements/${id}/`, payload);
  },

  delete(id: number | string) {
    return apiClient.delete<void>(`content/advertisements/${id}/`);
  },
};
