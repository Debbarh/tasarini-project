import { apiClient } from '@/integrations/api/client';

export interface CountryDTO {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  // Multilingual fields
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  name_it?: string;
  name_pt?: string;
  name_ru?: string;
  name_ja?: string;
  name_zh?: string;
  name_hi?: string;
  name_ar?: string;
}

export interface CityDTO {
  id: string;
  name: string;
  country: string;
  country_detail?: {
    id: string;
    name: string;
    name_fr?: string;
    name_en?: string;
    name_es?: string;
    name_de?: string;
    name_it?: string;
    name_pt?: string;
    name_ru?: string;
    name_ja?: string;
    name_zh?: string;
    name_hi?: string;
    name_ar?: string;
  };
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  // Multilingual fields
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  name_it?: string;
  name_pt?: string;
  name_ru?: string;
  name_ja?: string;
  name_zh?: string;
  name_hi?: string;
  name_ar?: string;
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

  resolveLocation: (payload: {
    country_name: string;
    city_name: string;
    latitude?: number;
    longitude?: number;
    country_translations?: Record<string, string>;
    city_translations?: Record<string, string>;
  }) =>
    apiClient.post<{
      country_id: string;
      city_id: string;
      country_name: string;
      city_name: string;
    }>('locations/resolve/', payload),
};
