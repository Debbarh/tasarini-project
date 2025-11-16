import { apiClient } from '@/integrations/api/client';

export interface GeneratedStoryPayload {
  title: string;
  content: string;
  tags: string[];
  location: string;
}

export const storyGenerationService = {
  generateFromItinerary(itinerary: Record<string, any>) {
    return apiClient.post<GeneratedStoryPayload>('stories/generate/', {
      mode: 'itinerary',
      itinerary,
    });
  },

  generateFromPrompt(prompt: string) {
    return apiClient.post<GeneratedStoryPayload>('stories/generate/', {
      mode: 'prompt',
      prompt,
    });
  },
};
