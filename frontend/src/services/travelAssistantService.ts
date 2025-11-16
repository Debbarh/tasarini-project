import { apiClient } from '@/integrations/api/client';

export interface AssistantResponse {
  response: string;
  hasUserContext: boolean;
}

export const travelAssistantService = {
  ask(prompt: string, userId?: string | number, userContext?: string) {
    return apiClient.post<AssistantResponse>('travel/assistant/', {
      prompt,
      userId,
      userContext,
    });
  },
};
