import { apiClient } from '@/integrations/api/client';

export interface ActivityCategory {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  icon_emoji?: string;
  icon_name?: string;
  color_class?: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityIntensityLevel {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  icon_emoji?: string;
  level_value: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityInterest {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  category?: string | null;
  category_detail?: ActivityCategory | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityAvoidance extends ActivityInterest {}

const buildCrud = <T>(basePath: string) => ({
  list: () => apiClient.get<T[]>(basePath),
  create: (payload: Partial<T>) => apiClient.post<T>(basePath, payload),
  update: (id: string, payload: Partial<T>) => apiClient.patch<T>(`${basePath}${id}/`, payload),
  delete: (id: string) => apiClient.delete<void>(`${basePath}${id}/`),
});

const categoryCrud = buildCrud<ActivityCategory>('activities/categories/');
const intensityCrud = buildCrud<ActivityIntensityLevel>('activities/intensity-levels/');
const interestCrud = buildCrud<ActivityInterest>('activities/interests/');
const avoidanceCrud = buildCrud<ActivityAvoidance>('activities/avoidances/');

export const activityAdminService = {
  listCategories: categoryCrud.list,
  createCategory: categoryCrud.create,
  updateCategory: categoryCrud.update,
  deleteCategory: categoryCrud.delete,

  listIntensityLevels: intensityCrud.list,
  createIntensityLevel: intensityCrud.create,
  updateIntensityLevel: intensityCrud.update,
  deleteIntensityLevel: intensityCrud.delete,

  listInterests: interestCrud.list,
  createInterest: interestCrud.create,
  updateInterest: interestCrud.update,
  deleteInterest: interestCrud.delete,

  listAvoidances: avoidanceCrud.list,
  createAvoidance: avoidanceCrud.create,
  updateAvoidance: avoidanceCrud.update,
  deleteAvoidance: avoidanceCrud.delete,
};
