import { apiClient } from '@/integrations/api/client';

type LanguageFields = {
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

export interface Country extends LanguageFields {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface City extends LanguageFields {
  id: string;
  name: string;
  country: string;
  country_detail?: Country;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const buildCrud = <T>(base: string) => ({
  list: () => apiClient.get<T[]>(base),
  create: (payload: Partial<T>) => apiClient.post<T>(base, payload),
  update: (id: string, payload: Partial<T>) => apiClient.patch<T>(`${base}${id}/`, payload),
  delete: (id: string) => apiClient.delete<void>(`${base}${id}/`),
});

const countryCrud = buildCrud<Country>('locations/countries/');
const cityCrud = buildCrud<City>('locations/cities/');

interface CountryTranslationResponse {
  message: string;
  languages: string[];
  country: Country;
}

interface CityTranslationResponse {
  message: string;
  languages: string[];
  city: City;
}

export const locationAdminService = {
  listCountries: countryCrud.list,
  createCountry: countryCrud.create,
  updateCountry: countryCrud.update,
  deleteCountry: countryCrud.delete,
  translateCountry: (id: string) =>
    apiClient.post<CountryTranslationResponse>(`locations/countries/${id}/translate/`, {}),

  listCities: cityCrud.list,
  createCity: cityCrud.create,
  updateCity: cityCrud.update,
  deleteCity: cityCrud.delete,
  translateCity: (id: string) =>
    apiClient.post<CityTranslationResponse>(`locations/cities/${id}/translate/`, {}),
};
