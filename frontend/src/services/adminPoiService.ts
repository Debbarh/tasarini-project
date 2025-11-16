import { apiClient } from '@/integrations/api/client';

export type POIStatus = 'draft' | 'pending_validation' | 'under_review' | 'approved' | 'rejected' | 'blocked';

export interface AdminPoiOwnerDetail {
  id: number;
  email: string;
  display_name?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  };
}

export interface AdminPoiPartnerDetail {
  id: number;
  company_name: string;
  status: string;
  website?: string;
}

export interface AdminPoi {
  id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  price_range?: string;
  rating?: number;
  review_count?: number;
  budget_level?: any;
  difficulty_level?: any;
  is_active: boolean;
  is_verified: boolean;
  backend: boolean;
  status_enum: POIStatus;
  rejection_reason?: string;
  blocked_reason?: string;
  validation_score?: string;
  submission_count?: number;
  is_restaurant?: boolean;
  is_accommodation?: boolean;
  is_activity?: boolean;
  amenities?: string[];
  metadata?: Record<string, any>;
  tags?: any[];
  media?: any[];
  owner_detail?: AdminPoiOwnerDetail | null;
  partner_detail?: AdminPoiPartnerDetail | null;
  created_at: string;
  updated_at: string;
  opening_hours?: string;
  opening_hours_structured?: any;
  conversation_id?: string;
  partner_featured?: boolean;
}

export interface UpdatePoiStatusPayload {
  status: POIStatus;
  reason?: string;
  admin_message?: string;
}

export interface ConversationMessage {
  id: string;
  sender_type: 'admin' | 'partner';
  message_type: 'comment' | 'status_change' | 'request_info' | 'justification';
  content: string;
  created_at: string;
  sender_detail?: AdminPoiOwnerDetail;
}

export const adminPoiService = {
  list(params: Record<string, string | number | boolean> = {}) {
    return apiClient.get<AdminPoi[]>('poi/tourist-points/', params);
  },

  get(id: string) {
    return apiClient.get<AdminPoi>(`poi/tourist-points/${id}/`);
  },

  update(id: string, payload: Partial<AdminPoi>) {
    return apiClient.patch<AdminPoi>(`poi/tourist-points/${id}/`, payload);
  },

  moderate(id: string, payload: UpdatePoiStatusPayload) {
    return apiClient.post<AdminPoi>(`poi/tourist-points/${id}/moderate/`, payload);
  },

  delete(id: string) {
    return apiClient.delete<void>(`poi/tourist-points/${id}/`);
  },

  getConversationMessages(conversationId: string) {
    return apiClient.get<ConversationMessage[]>(`poi/conversations/${conversationId}/messages/`);
  },

  sendConversationMessage(conversationId: string, payload: { content: string; message_type?: string }) {
    return apiClient.post<ConversationMessage>(`poi/conversations/${conversationId}/messages/`, payload);
  },
};
