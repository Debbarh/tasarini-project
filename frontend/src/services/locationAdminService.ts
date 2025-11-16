import { apiClient } from '@/integrations/api/client';

export interface Country {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface City {
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

export const locationAdminService = {
  listCountries: countryCrud.list,
  createCountry: countryCrud.create,
  updateCountry: countryCrud.update,
  deleteCountry: countryCrud.delete,

  listCities: cityCrud.list,
  createCity: cityCrud.create,
  updateCity: cityCrud.update,
  deleteCity: cityCrud.delete,
};
