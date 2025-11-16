import { apiClient } from '@/integrations/api/client';

export interface BudgetLevel {
  id: number;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
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
  description_fr?: string;
  description_en?: string;
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

export const budgetService = {
  listLevels: levelsCrud.list,
  createLevel: levelsCrud.create,
  updateLevel: levelsCrud.update,
  deleteLevel: levelsCrud.delete,

  listCurrencies: currenciesCrud.list,
  createCurrency: currenciesCrud.create,
  updateCurrency: currenciesCrud.update,
  deleteCurrency: currenciesCrud.delete,

  listFlexOptions: flexCrud.list,
  createFlexOption: flexCrud.create,
  updateFlexOption: flexCrud.update,
  deleteFlexOption: flexCrud.delete,
};
