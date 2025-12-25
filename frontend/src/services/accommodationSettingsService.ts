import { apiClient } from '@/integrations/api/client';

export interface AccommodationTaxonomyEntry {
  id: string;
  code: string;
  label_fr: string;
  label_en?: string;
  label_es?: string;
  label_de?: string;
  label_it?: string;
  label_pt?: string;
  label_ru?: string;
  label_ja?: string;
  label_zh?: string;
  label_hi?: string;
  label_ar?: string;
  description_fr?: string;
  description_en?: string;
  description_es?: string;
  description_de?: string;
  description_it?: string;
  description_pt?: string;
  description_ru?: string;
  description_ja?: string;
  description_zh?: string;
  description_hi?: string;
  description_ar?: string;
  icon_emoji?: string;
  is_active: boolean;
  display_order: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

interface AccommodationTypeTranslationResponse {
  message: string;
  languages: string[];
  accommodation_type: AccommodationTaxonomyEntry;
}

interface AccommodationAmenityTranslationResponse {
  message: string;
  languages: string[];
  accommodation_amenity: AccommodationTaxonomyEntry;
}

interface AccommodationLocationTranslationResponse {
  message: string;
  languages: string[];
  accommodation_location: AccommodationTaxonomyEntry;
}

interface AccommodationAccessibilityTranslationResponse {
  message: string;
  languages: string[];
  accommodation_accessibility: AccommodationTaxonomyEntry;
}

interface AccommodationSecurityTranslationResponse {
  message: string;
  languages: string[];
  accommodation_security: AccommodationTaxonomyEntry;
}

interface AccommodationAmbianceTranslationResponse {
  message: string;
  languages: string[];
  accommodation_ambiance: AccommodationTaxonomyEntry;
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
  translateType: (id: string) =>
    apiClient.post<AccommodationTypeTranslationResponse>(`accommodation/types/${id}/translate/`, {}),

  listAmenities: amenityCrud.list,
  createAmenity: amenityCrud.create,
  updateAmenity: amenityCrud.update,
  deleteAmenity: amenityCrud.delete,
  translateAmenity: (id: string) =>
    apiClient.post<AccommodationAmenityTranslationResponse>(`accommodation/amenities/${id}/translate/`, {}),

  listLocations: locationCrud.list,
  createLocation: locationCrud.create,
  updateLocation: locationCrud.update,
  deleteLocation: locationCrud.delete,
  translateLocation: (id: string) =>
    apiClient.post<AccommodationLocationTranslationResponse>(`accommodation/locations/${id}/translate/`, {}),

  listAccessibility: accessibilityCrud.list,
  createAccessibility: accessibilityCrud.create,
  updateAccessibility: accessibilityCrud.update,
  deleteAccessibility: accessibilityCrud.delete,
  translateAccessibility: (id: string) =>
    apiClient.post<AccommodationAccessibilityTranslationResponse>(`accommodation/accessibility/${id}/translate/`, {}),

  listSecurity: securityCrud.list,
  createSecurity: securityCrud.create,
  updateSecurity: securityCrud.update,
  deleteSecurity: securityCrud.delete,
  translateSecurity: (id: string) =>
    apiClient.post<AccommodationSecurityTranslationResponse>(`accommodation/security/${id}/translate/`, {}),

  listAmbiance: ambianceCrud.list,
  createAmbiance: ambianceCrud.create,
  updateAmbiance: ambianceCrud.update,
  deleteAmbiance: ambianceCrud.delete,
  translateAmbiance: (id: string) =>
    apiClient.post<AccommodationAmbianceTranslationResponse>(`accommodation/ambiance/${id}/translate/`, {}),
};
