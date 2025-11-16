import { apiClient } from '@/integrations/api/client';

export interface DietaryRestriction {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  icon_emoji?: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CuisineType {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  region?: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CulinaryAdventureLevel {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  level_value: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface RestaurantCategory {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  icon_emoji?: string;
  price_range_min?: number | null;
  price_range_max?: number | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

const crud = <T>(base: string) => ({
  list: () => apiClient.get<T[]>(base),
  create: (payload: Partial<T>) => apiClient.post<T>(base, payload),
  update: (id: string, payload: Partial<T>) => apiClient.patch<T>(`${base}${id}/`, payload),
  delete: (id: string) => apiClient.delete<void>(`${base}${id}/`),
});

const dietaryCrud = crud<DietaryRestriction>('culinary/dietary-restrictions/');
const cuisineCrud = crud<CuisineType>('culinary/cuisine-types/');
const adventureCrud = crud<CulinaryAdventureLevel>('culinary/adventure-levels/');
const restaurantCrud = crud<RestaurantCategory>('culinary/restaurant-categories/');

export const culinaryAdminService = {
  listDietaryRestrictions: dietaryCrud.list,
  createDietaryRestriction: dietaryCrud.create,
  updateDietaryRestriction: dietaryCrud.update,
  deleteDietaryRestriction: dietaryCrud.delete,

  listCuisineTypes: cuisineCrud.list,
  createCuisineType: cuisineCrud.create,
  updateCuisineType: cuisineCrud.update,
  deleteCuisineType: cuisineCrud.delete,

  listAdventureLevels: adventureCrud.list,
  createAdventureLevel: adventureCrud.create,
  updateAdventureLevel: adventureCrud.update,
  deleteAdventureLevel: adventureCrud.delete,

  listRestaurantCategories: restaurantCrud.list,
  createRestaurantCategory: restaurantCrud.create,
  updateRestaurantCategory: restaurantCrud.update,
  deleteRestaurantCategory: restaurantCrud.delete,
};
