import { useState, useEffect } from 'react';
import {
  activityAdminService,
  ActivityCategory,
  ActivityIntensityLevel,
  ActivityInterest,
  ActivityAvoidance,
} from '@/services/activityAdminService';
import { extractArrayFromResponse } from '@/integrations/api/client';

// Re-export types for convenience
export type {
  ActivityCategory,
  ActivityIntensityLevel,
  ActivityInterest,
  ActivityAvoidance,
} from '@/services/activityAdminService';

export const useActivitySettings = () => {
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [intensityLevels, setIntensityLevels] = useState<ActivityIntensityLevel[]>([]);
  const [interests, setInterests] = useState<ActivityInterest[]>([]);
  const [avoidances, setAvoidances] = useState<ActivityAvoidance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoryData, intensityData, interestData, avoidanceData] = await Promise.all([
        activityAdminService.listCategories(),
        activityAdminService.listIntensityLevels(),
        activityAdminService.listInterests(),
        activityAdminService.listAvoidances(),
      ]);

      // Handle both array and paginated response formats
      setCategories(extractArrayFromResponse(categoryData));
      setIntensityLevels(extractArrayFromResponse(intensityData));
      setInterests(extractArrayFromResponse(interestData));
      setAvoidances(extractArrayFromResponse(avoidanceData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    categories,
    intensityLevels,
    interests,
    avoidances,
    loading,
    error,
    refetch: fetchData
  };
};
