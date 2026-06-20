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
  // Normalise la réponse : tableau OU objet paginé {results:[...]} → toujours un tableau.
  list: async (): Promise<StoryAIProviderConfig[]> => {
    const d = await apiClient.get<any>(baseUrl);
    return Array.isArray(d) ? d : (d?.results ?? []);
  },
  update: (id: string, payload: Partial<StoryAIProviderConfig>) =>
    apiClient.patch<StoryAIProviderConfig>(`${baseUrl}${id}/`, payload),
};
