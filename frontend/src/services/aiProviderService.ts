import { apiClient } from "@/integrations/api/client";

export interface AIProviderConfig {
  id: string;
  provider: string;
  display_name: string;
  is_enabled: boolean;
  model_name: string;
  temperature: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

const baseUrl = 'travel/ai-providers/';

export const aiProviderService = {
  list: () => apiClient.get<AIProviderConfig[]>(baseUrl),
  update: (id: string, payload: Partial<AIProviderConfig>) => apiClient.patch<AIProviderConfig>(`${baseUrl}${id}/`, payload),
};
