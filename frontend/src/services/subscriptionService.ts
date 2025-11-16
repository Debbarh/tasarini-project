import { apiClient } from '@/integrations/api/client';

export const subscriptionService = {
  createCheckoutSession(planId: string, billingCycle: 'monthly' | 'yearly') {
    return apiClient.post<{ url: string }>('partners/subscriptions/checkout/', {
      planId,
      billingCycle,
    });
  },
};
