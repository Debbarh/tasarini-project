import { apiClient } from "@/integrations/api/client";

export interface APIProvider {
  id: string;
  provider_code: string;
  provider_code_display: string;
  provider_name: string;
  service_type: string;
  service_type_display: string;
  is_active: boolean;
  priority: number;
  description: string;
  api_endpoint: string;
  has_credentials: boolean;
  created_at: string;
  updated_at: string;
}

export interface APIProviderUpdate {
  is_active?: boolean;
  priority?: number;
  description?: string;
}

export interface APIProvidersByService {
  [serviceType: string]: APIProvider[];
}

const baseUrl = 'admin/api-providers/';

export const apiProviderService = {
  // List all API providers
  list: () => apiClient.get<APIProvider[]>(baseUrl),

  // Get single provider
  get: (id: string) => apiClient.get<APIProvider>(`${baseUrl}${id}/`),

  // Update provider
  update: (id: string, payload: APIProviderUpdate) =>
    apiClient.patch<APIProvider>(`${baseUrl}${id}/`, payload),

  // Get providers by service type
  byService: () => apiClient.get<APIProvidersByService>(`${baseUrl}by_service/`),

  // Get only active providers
  active: () => apiClient.get<APIProvider[]>(`${baseUrl}active/`),

  // Toggle active status
  toggleActive: (id: string) =>
    apiClient.post<APIProvider>(`${baseUrl}${id}/toggle_active/`),

  // Filter by service type
  filterByService: (serviceType: string) =>
    apiClient.get<APIProvider[]>(`${baseUrl}?service_type=${serviceType}`),

  // Filter by active status
  filterByActive: (isActive: boolean) =>
    apiClient.get<APIProvider[]>(`${baseUrl}?is_active=${isActive}`),
};
