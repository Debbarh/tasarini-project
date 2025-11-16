import { apiClient } from '@/integrations/api/client';

export interface AccommodationTaxonomyEntry {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  icon_emoji?: string;
  is_active: boolean;
  display_order: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

const buildCrud = <T>(base: string) => ({
  list: () => apiClient.get<T[]>(base),
  create: (payload: Partial<T>) => apiClient.post<T>(base, payload),
  update: (id: string, payload: Partial<T>) => apiClient.patch<T>(`${base}${id}/`, payload),
  delete: (id: string) => apiClient.delete<void>(`${base}${id}/`),
});

const typeCrud = buildCrud<AccommodationTaxonomyEntry>('accommodation/types/');
const amenityCrud = buildCrud<AccommodationTaxonomyEntry>('accommodation/amenities/');
const locationCrud = buildCrud<AccommodationTaxonomyEntry>('accommodation/locations/');
const accessibilityCrud = buildCrud<AccommodationTaxonomyEntry>('accommodation/accessibility/');
const securityCrud = buildCrud<AccommodationTaxonomyEntry>('accommodation/security/');
const ambianceCrud = buildCrud<AccommodationTaxonomyEntry>('accommodation/ambiance/');

export const accommodationSettingsService = {
  listTypes: typeCrud.list,
  createType: typeCrud.create,
  updateType: typeCrud.update,
  deleteType: typeCrud.delete,

  listAmenities: amenityCrud.list,
  createAmenity: amenityCrud.create,
  updateAmenity: amenityCrud.update,
  deleteAmenity: amenityCrud.delete,

  listLocations: locationCrud.list,
  createLocation: locationCrud.create,
  updateLocation: locationCrud.update,
  deleteLocation: locationCrud.delete,

  listAccessibility: accessibilityCrud.list,
  createAccessibility: accessibilityCrud.create,
  updateAccessibility: accessibilityCrud.update,
  deleteAccessibility: accessibilityCrud.delete,

  listSecurity: securityCrud.list,
  createSecurity: securityCrud.create,
  updateSecurity: securityCrud.update,
  deleteSecurity: securityCrud.delete,

  listAmbiance: ambianceCrud.list,
  createAmbiance: ambianceCrud.create,
  updateAmbiance: ambianceCrud.update,
  deleteAmbiance: ambianceCrud.delete,
};
