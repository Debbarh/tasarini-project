import { apiClient } from "@/integrations/api/client";

export interface Widget {
  id: string;
  widget_code: string;
  widget_name: string;
  widget_type: string;
  widget_type_display: string;
  placement: string;
  placement_display: string;
  service_type: string;
  service_type_display: string;
  is_active: boolean;
  priority: number;
  description: string;
  configuration: Record<string, any>;
  content: Record<string, any>;
  script_url: string;
  css_url: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetUpdate {
  widget_name?: string;
  widget_type?: string;
  placement?: string;
  service_type?: string;
  is_active?: boolean;
  priority?: number;
  description?: string;
  configuration?: Record<string, any>;
  content?: Record<string, any>;
  script_url?: string;
  css_url?: string;
}

export interface WidgetCreate extends WidgetUpdate {
  widget_code: string;
  widget_name: string;
  widget_type: string;
  placement: string;
}

export interface WidgetsByPlacement {
  [placement: string]: Widget[];
}

export interface WidgetsByService {
  [serviceType: string]: Widget[];
}

const baseUrl = 'admin/widgets/';

export const widgetService = {
  // List all widgets
  list: () => apiClient.get<Widget[]>(baseUrl),

  // Get single widget
  get: (id: string) => apiClient.get<Widget>(`${baseUrl}${id}/`),

  // Create widget
  create: (payload: WidgetCreate) =>
    apiClient.post<Widget>(baseUrl, payload),

  // Update widget
  update: (id: string, payload: WidgetUpdate) =>
    apiClient.patch<Widget>(`${baseUrl}${id}/`, payload),

  // Delete widget
  delete: (id: string) => apiClient.delete(`${baseUrl}${id}/`),

  // Get widgets by placement
  byPlacement: () => apiClient.get<WidgetsByPlacement>(`${baseUrl}by_placement/`),

  // Get widgets by service type
  byService: () => apiClient.get<WidgetsByService>(`${baseUrl}by_service/`),

  // Get only active widgets
  active: () => apiClient.get<Widget[]>(`${baseUrl}active/`),

  // Toggle active status
  toggleActive: (id: string) =>
    apiClient.post<Widget>(`${baseUrl}${id}/toggle_active/`),

  // Filter by widget type
  filterByType: (widgetType: string) =>
    apiClient.get<Widget[]>(`${baseUrl}?widget_type=${widgetType}`),

  // Filter by placement
  filterByPlacement: (placement: string) =>
    apiClient.get<Widget[]>(`${baseUrl}?placement=${placement}`),

  // Filter by service type
  filterByService: (serviceType: string) =>
    apiClient.get<Widget[]>(`${baseUrl}?service_type=${serviceType}`),

  // Filter by active status
  filterByActive: (isActive: boolean) =>
    apiClient.get<Widget[]>(`${baseUrl}?is_active=${isActive}`),
};
