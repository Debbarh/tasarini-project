import { apiClient } from '@/integrations/api/client';

export interface BudgetLevel {
  id: number;
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
  min_daily_amount?: number | null;
  max_daily_amount?: number | null;
  default_daily_amount: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetCurrency {
  id: number;
  code: string;
  name_fr: string;
  name_en: string;
  name_es?: string;
  name_de?: string;
  name_it?: string;
  name_pt?: string;
  name_ru?: string;
  name_ja?: string;
  name_zh?: string;
  name_hi?: string;
  name_ar?: string;
  symbol: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetFlexibilityOption {
  id: number;
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
  percentage_variation: number;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

const buildCrud = <T>(basePath: string) => ({
  list: () => apiClient.get<T[]>(basePath),
  create: (payload: Partial<T>) => apiClient.post<T>(basePath, payload),
  update: (id: number, payload: Partial<T>) => apiClient.patch<T>(`${basePath}${id}/`, payload),
  delete: (id: number) => apiClient.delete<void>(`${basePath}${id}/`),
});

const levelsCrud = buildCrud<BudgetLevel>('poi/budget-levels/');
const currenciesCrud = buildCrud<BudgetCurrency>('poi/budget-currencies/');
const flexCrud = buildCrud<BudgetFlexibilityOption>('poi/budget-flex-options/');

interface BudgetLevelTranslationResponse {
  message: string;
  languages: string[];
  budget_level: BudgetLevel;
}

interface BudgetCurrencyTranslationResponse {
  message: string;
  languages: string[];
  budget_currency: BudgetCurrency;
}

interface BudgetFlexibilityTranslationResponse {
  message: string;
  languages: string[];
  budget_flexibility_option: BudgetFlexibilityOption;
}

export const budgetService = {
  listLevels: levelsCrud.list,
  createLevel: levelsCrud.create,
  updateLevel: levelsCrud.update,
  deleteLevel: levelsCrud.delete,
  translateLevel: (id: number) =>
    apiClient.post<BudgetLevelTranslationResponse>(`poi/budget-levels/${id}/translate/`, {}),

  listCurrencies: currenciesCrud.list,
  createCurrency: currenciesCrud.create,
  updateCurrency: currenciesCrud.update,
  deleteCurrency: currenciesCrud.delete,
  translateCurrency: (id: number) =>
    apiClient.post<BudgetCurrencyTranslationResponse>(`poi/budget-currencies/${id}/translate/`, {}),

  listFlexOptions: flexCrud.list,
  createFlexOption: flexCrud.create,
  updateFlexOption: flexCrud.update,
  deleteFlexOption: flexCrud.delete,
  translateFlexOption: (id: number) =>
    apiClient.post<BudgetFlexibilityTranslationResponse>(`poi/budget-flex-options/${id}/translate/`, {}),
};
