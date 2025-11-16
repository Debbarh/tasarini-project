import { apiClient } from '@/integrations/api/client';

export type NotificationType =
  | 'activity_reminder'
  | 'trip_start'
  | 'trip_end'
  | 'general'
  | 'new_partner'
  | 'new_poi';

export interface NotificationDTO {
  id: string;
  user: number;
  itinerary_id: string | null;
  activity_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  scheduled_for: string;
  is_read: boolean;
  is_sent: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferenceDTO {
  id: string;
  user: number;
  activity_reminders: boolean;
  trip_start_reminders: boolean;
  trip_end_reminders: boolean;
  reminder_hours_before: number;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  list(params?: { limit?: number }) {
    return apiClient.get<NotificationDTO[]>('accounts/notifications/', params);
  },

  create(payload: Partial<Omit<NotificationDTO, 'id' | 'user' | 'created_at' | 'updated_at'>>) {
    return apiClient.post<NotificationDTO>('accounts/notifications/', payload);
  },

  markRead(id: string) {
    return apiClient.post<NotificationDTO>(`accounts/notifications/${id}/mark-read/`);
  },

  markAllRead() {
    return apiClient.post<{ updated: number }>('accounts/notifications/mark-all-read/');
  },

  delete(id: string) {
    return apiClient.delete<void>(`accounts/notifications/${id}/`);
  },

  getPreferences() {
    return apiClient.get<NotificationPreferenceDTO>('accounts/notification-preferences/me/');
  },

  updatePreferences(payload: Partial<NotificationPreferenceDTO>) {
    return apiClient.patch<NotificationPreferenceDTO>('accounts/notification-preferences/me/', payload);
  },
};
