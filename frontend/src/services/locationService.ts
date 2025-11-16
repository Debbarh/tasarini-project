import { apiClient } from '@/integrations/api/client';

export interface CountryDTO {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface CityDTO {
  id: string;
  name: string;
  country: string;
  country_detail?: {
    id: string;
    name: string;
  };
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

const list = <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
  apiClient.get<T[]>(endpoint, params);

export const locationService = {
  listCountries: (search?: string) =>
    list<CountryDTO>('locations/countries/', search ? { search } : undefined),

  createCountry: (payload: { name: string; code: string; is_active?: boolean }) =>
    apiClient.post<CountryDTO>('locations/countries/', {
      is_active: true,
      ...payload,
    }),

  listCities: (params: { country?: string; search?: string } = {}) =>
    list<CityDTO>('locations/cities/', {
      country: params.country,
      search: params.search,
    }),

  createCity: (payload: {
    name: string;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
    is_active?: boolean;
  }) =>
    apiClient.post<CityDTO>('locations/cities/', {
      is_active: true,
      ...payload,
    }),
};
