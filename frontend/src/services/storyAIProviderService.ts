import { apiClient } from "@/integrations/api/client";

export interface StoryAIProviderConfig {
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

const baseUrl = 'content/story-ai-providers/';

export const storyAIProviderService = {
  list: () => apiClient.get<StoryAIProviderConfig[]>(baseUrl),
  update: (id: string, payload: Partial<StoryAIProviderConfig>) =>
    apiClient.patch<StoryAIProviderConfig>(`${baseUrl}${id}/`, payload),
};
