import { useState, useEffect, useCallback } from 'react';
import { apiClient, extractArrayFromResponse } from '@/integrations/api/client';

export interface TravelGroupType {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
}

export interface TravelGroupSubtype {
  id: string;
  travel_group_type_id?: string;
  travel_group_type?: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  is_active: boolean;
  display_order: number;
}

export interface TravelGroupConfiguration {
  id: string;
  travel_group_type_id?: string;
  travel_group_type?: string;
  fixed_size?: number;
  min_size?: number;
  max_size?: number;
  default_size: number;
  allows_children: boolean;
  min_child_age?: number;
  max_child_age?: number;
  requires_size_input: boolean;
  is_active: boolean;
}

export const useTravelGroupTypes = () => {
  const [types, setTypes] = useState<TravelGroupType[]>([]);
  const [subtypes, setSubtypes] = useState<TravelGroupSubtype[]>([]);
  const [configurations, setConfigurations] = useState<TravelGroupConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTravelGroupData();
  }, []);

  const fetchTravelGroupData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [typesData, subtypesData, configurationsData] = await Promise.all([
        apiClient.get<TravelGroupType[]>('travel-groups/types/'),
        apiClient.get<TravelGroupSubtype[]>('travel-groups/subtypes/'),
        apiClient.get<TravelGroupConfiguration[]>('travel-groups/configurations/'),
      ]);

      // Handle both array and paginated response formats
      const typesArray = extractArrayFromResponse<TravelGroupType>(typesData);
      const subtypesArray = extractArrayFromResponse<TravelGroupSubtype>(subtypesData);
      const configurationsArray = extractArrayFromResponse<TravelGroupConfiguration>(configurationsData);

      const normalizedTypes = typesArray.filter((type) => type.is_active !== false).sort((a, b) => a.display_order - b.display_order);
      const normalizedSubtypes = subtypesArray
        .filter((subtype) => subtype.is_active !== false)
        .map((subtype) => ({
          ...subtype,
          travel_group_type_id: subtype.travel_group_type_id ?? subtype.travel_group_type,
        }))
        .sort((a, b) => a.display_order - b.display_order);
      const normalizedConfigs = configurationsArray
        .filter((config) => config.is_active !== false)
        .map((config) => ({
          ...config,
          travel_group_type_id: config.travel_group_type_id ?? config.travel_group_type,
        }));

      setTypes(normalizedTypes);
      setSubtypes(normalizedSubtypes);
      setConfigurations(normalizedConfigs);

    } catch (err) {
      console.error('Error fetching travel group data:', err);
      setError('Erreur lors du chargement des types de voyageurs');
    } finally {
      setLoading(false);
    }
  };

  const getConfigurationForType = useCallback((typeId: string) => {
    return configurations.find((config) => (config.travel_group_type_id ?? config.travel_group_type) === typeId);
  }, [configurations]);

  const getSubtypesForType = useCallback((typeId: string) => {
    return subtypes.filter((subtype) => (subtype.travel_group_type_id ?? subtype.travel_group_type) === typeId);
  }, [subtypes]);

  return {
    types,
    subtypes,
    configurations,
    loading,
    error,
    getConfigurationForType,
    getSubtypesForType,
    refresh: fetchTravelGroupData
  };
};
