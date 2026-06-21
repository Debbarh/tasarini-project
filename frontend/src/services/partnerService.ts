import { apiClient, extractArrayFromResponse } from '@/integrations/api/client';

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
  commission_rate?: string;
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

// Champs éditables du profil partenaire pendant l'assistant d'onboarding (taxonomie structurée).
export interface PartnerProfileDraft {
  company_name: string;
  business_category: string;
  description: string;
  website: string | null;
  country: string | null;       // UUID Country
  city: string | null;          // UUID City
  address: string;
  postal_code: string;
  contact_phone: string;
  metadata: Record<string, unknown>;
}

export type PartnerKYCDocType =
  | 'business_registration'
  | 'representative_id'
  | 'bank_rib'
  | 'proof_of_address';

export interface PartnerKYCDocument {
  id: number;
  doc_type: PartnerKYCDocType;
  doc_type_display: string;
  original_name: string;
  uploaded_at: string;
  download_url: string;
}

export interface PartnerKYCPayload {
  legal_name: string;
  legal_form: string;
  registration_number: string;
  vat_number: string;
  tax_id: string;
  registered_address: string;
  registration_country: string | null;
  rep_full_name: string;
  rep_date_of_birth: string | null;
  rep_nationality: string;
}

export interface PartnerKYC extends PartnerKYCPayload {
  id: number;
  profile: string | number;
  status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  rejection_reason: string;
  reviewed_at: string | null;
  documents: PartnerKYCDocument[];
  created_at: string;
  updated_at: string;
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
  payment_status: 'pending' | 'invoiced' | 'paid' | 'cancelled' | 'processing' | 'failed';
  invoice?: number | null;
  created_at: string;
}

export interface PartnerInvoice {
  id: number;
  number: string;
  partner: number;
  partner_name?: string;
  partner_email?: string;
  period_start: string;
  period_end: string;
  amount_due: string;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  issued_at: string;
  due_date?: string | null;
  paid_at?: string | null;
  payment_reference?: string;
  commissions_count?: number;
  notes?: string;
}

export interface PlatformBillingInfo {
  bank_holder: string;
  iban: string;
  bic: string;
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
    return extractArrayFromResponse<PartnerProfile>(await apiClient.get<any>('partners/profiles/', params));
  },

  async getMyProfile() {
    // Endpoint dédié : crée à la volée un profil 'draft' s'il n'existe pas (brouillon serveur).
    return apiClient.get<PartnerProfile>('partners/profiles/me/');
  },

  async createProfile(payload: PartnerProfilePayload) {
    return apiClient.post<PartnerProfile>('partners/profiles/', payload);
  },

  async updateProfile(id: string | number, payload: Partial<PartnerProfileDraft>) {
    return apiClient.patch<PartnerProfile>(`partners/profiles/${id}/`, payload);
  },

  async submitProfile(id: string | number) {
    return apiClient.post<{ status: string }>(`partners/profiles/${id}/submit/`, {});
  },

  // --- KYC / KYB (dossier d'identité légale du partenaire) ---
  async getMyKyc() {
    return apiClient.get<PartnerKYC>('partners/kyc/me/');
  },

  async updateMyKyc(payload: Partial<PartnerKYCPayload>) {
    return apiClient.patch<PartnerKYC>('partners/kyc/me/', payload);
  },

  async uploadKycDocument(docType: PartnerKYCDocType, file: File) {
    const fd = new FormData();
    fd.append('doc_type', docType);
    fd.append('file', file);
    return apiClient.upload<PartnerKYCDocument>('partners/kyc/upload-document/', fd);
  },

  // Admin : revue KYC d'un partenaire
  async getKycByProfile(profileId: string | number) {
    const data = await apiClient.get<any>('partners/kyc/', { profile: String(profileId) });
    return extractArrayFromResponse<PartnerKYC>(data)[0] ?? null;
  },

  async verifyKyc(kycId: number | string) {
    return apiClient.post<{ status: string }>(`partners/kyc/${kycId}/verify/`, {});
  },

  async rejectKyc(kycId: number | string, reason: string) {
    return apiClient.post<{ status: string }>(`partners/kyc/${kycId}/reject/`, { reason });
  },

  // Télécharge un document KYC (endpoint protégé) et l'ouvre dans un nouvel onglet.
  async openKycDocument(docId: number | string) {
    const blob = await apiClient.download(`partners/kyc/documents/${docId}/download/`);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  async submitApplication(motivation: string) {
    return apiClient.post('partners/applications/', { motivation });
  },

  async getAnalytics(partnerPublicId: string) {
    return apiClient.get<PartnerAnalyticsSummary>(`partners/${partnerPublicId}/analytics/`);
  },

  async listNotifications(params: { limit?: number } = {}) {
    const searchParams = params.limit ? { limit: params.limit } : undefined;
    return extractArrayFromResponse<PartnerNotificationDTO>(await apiClient.get<any>('partners/notifications/', searchParams));
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
    return extractArrayFromResponse<PartnerTouristPointSummary>(
      await apiClient.get<any>('poi/tourist-points/', { owner: 'me' }));
  },

  async getBookingConfigByPoint(touristPointId: string) {
    const configs = extractArrayFromResponse<PartnerBookingConfig>(
      await apiClient.get<any>('partners/booking-configs/', { tourist_point: touristPointId }));
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
    return extractArrayFromResponse<PartnerCommission>(await apiClient.get<any>('partners/commissions/', params));
  },

  async listWithdrawals() {
    return extractArrayFromResponse<PartnerWithdrawal>(await apiClient.get<any>('partners/withdrawals/'));
  },

  // --- Facturation (commission après-vente : le partenaire doit la commission à la plateforme) ---
  async listInvoices(params: { partner?: number | string; status?: string } = {}) {
    return extractArrayFromResponse<PartnerInvoice>(await apiClient.get<any>('partners/invoices/', params));
  },

  async generateInvoices(payload: { year?: number; month?: number } = {}) {
    return apiClient.post<{ created: number; invoices: PartnerInvoice[] }>('partners/invoices/generate/', payload);
  },

  async markInvoicePaid(id: number | string, payload: { payment_reference?: string } = {}) {
    return apiClient.post<PartnerInvoice>(`partners/invoices/${id}/mark-paid/`, payload);
  },

  async setCommissionRate(profileId: number | string, commission_rate: number) {
    return apiClient.post<PartnerProfile>(`partners/profiles/${profileId}/set-commission/`, { commission_rate });
  },

  async getPlatformBillingInfo() {
    return apiClient.get<PlatformBillingInfo>('partners/billing-info/');
  },

  async requestWithdrawal(payload: { amount: number; payment_method: number | string }) {
    return apiClient.post<PartnerWithdrawal>('partners/withdrawals/', payload);
  },

  async listPaymentMethods() {
    return extractArrayFromResponse<PartnerPaymentMethod>(await apiClient.get<any>('partners/payment-methods/'));
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
