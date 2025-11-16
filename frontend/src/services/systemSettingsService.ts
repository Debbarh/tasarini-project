import { apiClient } from '@/integrations/api/client';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'boolean' | 'number';
  description: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const BASE_ENDPOINT = '/admin/system-settings/';

export const systemSettingsService = {
  list: () => apiClient.get<SystemSetting[]>(BASE_ENDPOINT),
  update: (settingKey: string, payload: Partial<Pick<SystemSetting, 'setting_value' | 'is_active'>>) =>
    apiClient.patch<SystemSetting>(`${BASE_ENDPOINT}${settingKey}/`, payload),
};
