import { apiClient } from '@/integrations/api/client';

export interface PartnerOwnerDetail {
  id: number;
  public_id?: string;
  email: string;
  display_name?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  };
}

export interface PartnerProfile {
  id: string;
  owner: number;
  owner_detail?: PartnerOwnerDetail;
  company_name: string;
  website?: string | null;
  status: string;
  api_key: string;
  metadata: Record<string, any>;
  managed_pois: PartnerTouristPointSummary[];
  created_at: string;
  updated_at: string;
}

export interface PartnerProfilePayload {
  company_name: string;
  website?: string | null;
  metadata?: Record<string, unknown>;
  managed_poi_ids?: string[];
}

export interface PartnerTouristPointSummary {
  id: string;
  name: string;
  metadata?: Record<string, any>;
  status_enum?: string;
  is_verified?: boolean;
  created_at?: string;
}

export type BookingSystemType = 'internal' | 'external' | 'api' | 'webhook';

export interface PartnerBookingConfig {
  id: number;
  tourist_point: string;
  system_type: BookingSystemType;
  endpoint_url?: string;
  webhook_url?: string;
  api_credentials: Record<string, any>;
  custom_fields: Record<string, any>;
  is_active: boolean;
  test_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerCommission {
  id: number;
  tourist_point: string;
  tourist_point_detail?: PartnerTouristPointSummary;
  amount: string;
  commission_rate: string;
  booking_reference?: string;
  customer_name?: string;
  booking_date: string;
  payment_status: 'pending' | 'processing' | 'paid' | 'failed';
  created_at: string;
}

export interface PartnerPaymentMethod {
  id: number;
  method_type: 'bank' | 'paypal' | 'stripe';
  label?: string;
  details: Record<string, any>;
  is_default: boolean;
  created_at: string;
}

export interface PartnerWithdrawal {
  id: number;
  amount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method: number;
  payment_method_detail?: PartnerPaymentMethod;
  requested_at: string;
  processed_at?: string | null;
}

export interface PartnerEndpointHealth {
  id: number;
  endpoint_url: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  uptime_percentage: string;
  success_rate_24h: string;
  last_checked?: string;
  error_message?: string;
}

export interface PartnerAnalyticsSummary {
  totalPOIs: number;
  approvedPOIs: number;
  pendingPOIs: number;
  rejectedPOIs: number;
  totalViews: number;
  totalBookings: number;
  monthlyRevenue: number;
  performanceScore: number;
}

export interface PartnerNotificationDTO {
  id: number;
  title: string;
  body: string;
  category: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface PartnerDashboardMetrics {
  total_pois: number;
  pending_pois: number;
  total_views: number;
  total_clicks: number;
  total_bookings: number;
  total_revenue: number;
  avg_rating: number;
  pending_payments: number;
  this_month: {
    views: number;
    bookings: number;
    revenue: number;
  };
  top_poi: {
    name: string;
    revenue: number;
  };
}

export interface PartnerAnalyticsSeriesPoint {
  date: string;
  views: number;
  clicks: number;
  bookings: number;
  revenue: number;
}

export const partnerService = {
  async listProfiles(params?: { search?: string; status?: string; subscription_type?: string }) {
    return apiClient.get<PartnerProfile[]>('partners/profiles/', params);
  },

  async getMyProfile() {
    const profiles = await this.listProfiles();
    return profiles[0] ?? null;
  },

  async createProfile(payload: PartnerProfilePayload) {
    return apiClient.post<PartnerProfile>('partners/profiles/', payload);
  },

  async updateProfile(id: string | number, payload: Partial<PartnerProfilePayload>) {
    return apiClient.patch<PartnerProfile>(`partners/profiles/${id}/`, payload);
  },

  async submitApplication(motivation: string) {
    return apiClient.post('partners/applications/', { motivation });
  },

  async getAnalytics(partnerPublicId: string) {
    return apiClient.get<PartnerAnalyticsSummary>(`partners/${partnerPublicId}/analytics/`);
  },

  async listNotifications(params: { limit?: number } = {}) {
    const searchParams = params.limit ? { limit: params.limit } : undefined;
    return apiClient.get<PartnerNotificationDTO[]>('partners/notifications/', searchParams);
  },

  async markNotificationRead(id: number | string) {
    return apiClient.patch<PartnerNotificationDTO>(`partners/notifications/${id}/`, { is_read: true });
  },

  async updateSubscription(profileId: number | string, subscriptionType: string) {
    return apiClient.post(`partners/profiles/${profileId}/update_subscription/`, {
      subscription_type: subscriptionType,
    });
  },

  async moderateProfile(
    profileId: number | string,
    payload: { action: 'approve' | 'reject' | 'suspend'; admin_message?: string; reason?: string },
  ) {
    return apiClient.post(`partners/profiles/${profileId}/moderate/`, payload);
  },

  async sendAdminMessage(
    profileId: number | string,
    payload: { message: string; type?: string },
  ) {
    return apiClient.post(`partners/profiles/${profileId}/send_message/`, payload);
  },

  async listManagedTouristPoints() {
    return apiClient.get<PartnerTouristPointSummary[]>('poi/tourist-points/', { owner: 'me' });
  },

  async getBookingConfigByPoint(touristPointId: string) {
    const configs = await apiClient.get<PartnerBookingConfig[]>('partners/booking-configs/', {
      tourist_point: touristPointId,
    });
    return configs[0] ?? null;
  },

  async createBookingConfig(payload: Partial<PartnerBookingConfig>) {
    return apiClient.post<PartnerBookingConfig>('partners/booking-configs/', payload);
  },

  async updateBookingConfig(id: number | string, payload: Partial<PartnerBookingConfig>) {
    return apiClient.patch<PartnerBookingConfig>(`partners/booking-configs/${id}/`, payload);
  },

  async deleteBookingConfig(id: number | string) {
    return apiClient.delete<void>(`partners/booking-configs/${id}/`);
  },

  async listCommissions(params: { payment_status?: string } = {}) {
    return apiClient.get<PartnerCommission[]>('partners/commissions/', params);
  },

  async listWithdrawals() {
    return apiClient.get<PartnerWithdrawal[]>('partners/withdrawals/');
  },

  async requestWithdrawal(payload: { amount: number; payment_method: number | string }) {
    return apiClient.post<PartnerWithdrawal>('partners/withdrawals/', payload);
  },

  async listPaymentMethods() {
    return apiClient.get<PartnerPaymentMethod[]>('partners/payment-methods/');
  },

  async addPaymentMethod(payload: { method_type: string; label?: string; details: Record<string, any>; is_default?: boolean }) {
    return apiClient.post<PartnerPaymentMethod>('partners/payment-methods/', payload);
  },

  async setDefaultPaymentMethod(id: number | string) {
    return apiClient.post<PartnerPaymentMethod>(`partners/payment-methods/${id}/set_default/`);
  },

  async listEndpointHealth() {
    return apiClient.get<PartnerEndpointHealth[]>('partners/endpoints/');
  },

  async runEndpointHealthCheck() {
    return apiClient.post<{ checked: number; timestamp: string }>('partners/endpoints/run_checks/', {});
  },

  async getDashboardMetrics() {
    return apiClient.get<PartnerDashboardMetrics>('partners/dashboard/metrics/');
  },

  async getAnalyticsSeries(params: { days?: number } = {}) {
    const response = await apiClient.get<{ series: PartnerAnalyticsSeriesPoint[] }>('partners/analytics/series/', params);
    return response.series;
  },
};
