import { apiClient } from '@/integrations/api/client';

export interface TravelGroupType {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
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
  icon?: string;
  color?: string;
  is_active: boolean;
  display_order: number;
  configuration?: TravelGroupConfiguration;
}

export interface TravelGroupSubtype {
  id: string;
  travel_group_type: string;
  travel_group_type_detail?: string;
  code: string;
  label_fr: string;
  label_en: string;
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
  icon?: string;
  is_active: boolean;
  display_order: number;
}

export interface TravelGroupConfiguration {
  id: string;
  travel_group_type: string;
  has_fixed_size: boolean;
  fixed_size?: number | null;
  min_size?: number | null;
  max_size?: number | null;
  default_size?: number | null;
  allows_children: boolean;
  min_child_age?: number | null;
  max_child_age?: number | null;
  requires_size_input: boolean;
}

const crud = <T>(base: string) => ({
  list: () => apiClient.get<T[]>(base),
  create: (payload: Partial<T>) => apiClient.post<T>(base, payload),
  update: (id: string, payload: Partial<T>) => apiClient.patch<T>(`${base}${id}/`, payload),
  delete: (id: string) => apiClient.delete<void>(`${base}${id}/`),
});

const typeCrud = crud<TravelGroupType>('travel-groups/types/');
const subtypeCrud = crud<TravelGroupSubtype>('travel-groups/subtypes/');
const configCrud = crud<TravelGroupConfiguration>('travel-groups/configurations/');

interface TypeTranslationResponse {
  message: string;
  languages: string[];
  travel_group_type: TravelGroupType;
}

interface SubtypeTranslationResponse {
  message: string;
  languages: string[];
  travel_group_subtype: TravelGroupSubtype;
}

export const travelGroupService = {
  listTypes: typeCrud.list,
  createType: typeCrud.create,
  updateType: typeCrud.update,
  deleteType: typeCrud.delete,
  translateType: (id: string) =>
    apiClient.post<TypeTranslationResponse>(`travel-groups/types/${id}/translate/`, {}),

  listSubtypes: subtypeCrud.list,
  createSubtype: subtypeCrud.create,
  updateSubtype: subtypeCrud.update,
  deleteSubtype: subtypeCrud.delete,
  translateSubtype: (id: string) =>
    apiClient.post<SubtypeTranslationResponse>(`travel-groups/subtypes/${id}/translate/`, {}),

  listConfigs: configCrud.list,
  createConfig: configCrud.create,
  updateConfig: configCrud.update,
  deleteConfig: configCrud.delete,
};
