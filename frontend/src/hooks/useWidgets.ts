import { useEffect, useState } from "react";
import { widgetService, Widget } from "@/services/widgetService";
import { extractArrayFromResponse } from "@/integrations/api/client";

interface UseWidgetsOptions {
  placement?: string;
  serviceType?: string;
  activeOnly?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseWidgetsReturn {
  widgets: Widget[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage widgets
 * @param options - Configuration options for filtering widgets
 * @returns Object containing widgets, loading state, error, and refetch function
 */
export const useWidgets = (options: UseWidgetsOptions = {}): UseWidgetsReturn => {
  const {
    placement,
    serviceType,
    activeOnly = true,
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute
  } = options;

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWidgets = async () => {
    try {
      setLoading(true);
      setError(null);

      let data: Widget[];

      // Prioritize using public endpoints when activeOnly is true
      if (activeOnly) {
        // Use public endpoint that doesn't require authentication
        const response = await widgetService.active();
        data = extractArrayFromResponse<Widget>(response);
      } else if (placement) {
        // Admin-only endpoint for all widgets by placement
        const response = await widgetService.filterByPlacement(placement);
        data = extractArrayFromResponse<Widget>(response);
      } else if (serviceType) {
        // Admin-only endpoint for all widgets by service
        const response = await widgetService.filterByService(serviceType);
        data = extractArrayFromResponse<Widget>(response);
      } else {
        // Admin-only endpoint for all widgets
        const response = await widgetService.list();
        data = extractArrayFromResponse<Widget>(response);
      }

      // Additional client-side filtering if needed
      let filteredData = data;

      // Filter by placement if specified
      if (placement) {
        filteredData = filteredData.filter(w => w.placement === placement);
      }

      // Filter by service type if specified
      if (serviceType) {
        filteredData = filteredData.filter(w =>
          w.service_type === serviceType || w.service_type === 'all'
        );
      }

      // Sort by priority
      filteredData.sort((a, b) => a.priority - b.priority);

      setWidgets(filteredData);
    } catch (err: any) {
      console.error("Error fetching widgets:", err);
      setError(err?.message || "Erreur lors du chargement des widgets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, [placement, serviceType, activeOnly]);

  // Listen for widget updates from admin panel
  useEffect(() => {
    const handleWidgetUpdate = () => {
      fetchWidgets();
    };

    window.addEventListener('widgets-updated', handleWidgetUpdate);
    return () => window.removeEventListener('widgets-updated', handleWidgetUpdate);
  }, [placement, serviceType, activeOnly]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchWidgets();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, placement, serviceType, activeOnly]);

  return {
    widgets,
    loading,
    error,
    refetch: fetchWidgets,
  };
};

/**
 * Hook to fetch widgets grouped by placement
 */
export const useWidgetsByPlacement = () => {
  const [widgetsByPlacement, setWidgetsByPlacement] = useState<Record<string, Widget[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWidgets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await widgetService.byPlacement();
      setWidgetsByPlacement(data);
    } catch (err: any) {
      console.error("Error fetching widgets by placement:", err);
      setError(err?.message || "Erreur lors du chargement des widgets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  return {
    widgetsByPlacement,
    loading,
    error,
    refetch: fetchWidgets,
  };
};

/**
 * Hook to fetch widgets grouped by service type
 */
export const useWidgetsByService = () => {
  const [widgetsByService, setWidgetsByService] = useState<Record<string, Widget[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWidgets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await widgetService.byService();
      setWidgetsByService(data);
    } catch (err: any) {
      console.error("Error fetching widgets by service:", err);
      setError(err?.message || "Erreur lors du chargement des widgets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  return {
    widgetsByService,
    loading,
    error,
    refetch: fetchWidgets,
  };
};
