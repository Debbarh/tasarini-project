import { apiClient } from '@/integrations/api/client';

export interface DietaryRestriction {
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
  icon_emoji?: string;
  icon_name?: string;
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
  icon_name?: string;
  price_range_min?: number | null;
  price_range_max?: number | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

interface DietaryRestrictionTranslationResponse {
  message: string;
  languages: string[];
  dietary_restriction: DietaryRestriction;
}

interface CuisineTypeTranslationResponse {
  message: string;
  languages: string[];
  cuisine_type: CuisineType;
}

interface CulinaryAdventureLevelTranslationResponse {
  message: string;
  languages: string[];
  culinary_adventure_level: CulinaryAdventureLevel;
}

interface RestaurantCategoryTranslationResponse {
  message: string;
  languages: string[];
  restaurant_category: RestaurantCategory;
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
  translateDietaryRestriction: (id: string) =>
    apiClient.post<DietaryRestrictionTranslationResponse>(`culinary/dietary-restrictions/${id}/translate/`, {}),

  listCuisineTypes: cuisineCrud.list,
  createCuisineType: cuisineCrud.create,
  updateCuisineType: cuisineCrud.update,
  deleteCuisineType: cuisineCrud.delete,
  translateCuisineType: (id: string) =>
    apiClient.post<CuisineTypeTranslationResponse>(`culinary/cuisine-types/${id}/translate/`, {}),

  listAdventureLevels: adventureCrud.list,
  createAdventureLevel: adventureCrud.create,
  updateAdventureLevel: adventureCrud.update,
  deleteAdventureLevel: adventureCrud.delete,
  translateAdventureLevel: (id: string) =>
    apiClient.post<CulinaryAdventureLevelTranslationResponse>(`culinary/adventure-levels/${id}/translate/`, {}),

  listRestaurantCategories: restaurantCrud.list,
  createRestaurantCategory: restaurantCrud.create,
  updateRestaurantCategory: restaurantCrud.update,
  deleteRestaurantCategory: restaurantCrud.delete,
  translateRestaurantCategory: (id: string) =>
    apiClient.post<RestaurantCategoryTranslationResponse>(`culinary/restaurant-categories/${id}/translate/`, {}),
};
