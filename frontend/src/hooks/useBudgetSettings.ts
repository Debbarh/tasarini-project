import { useState, useEffect, useCallback } from 'react';
import { apiClient, extractArrayFromResponse } from '@/integrations/api/client';

export interface BudgetLevel {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  icon_emoji?: string;
  min_daily_amount?: number;
  max_daily_amount?: number;
  default_daily_amount: number;
  is_active: boolean;
  display_order: number;
}

export interface BudgetCurrency {
  id: string;
  code: string;
  name_fr: string;
  name_en: string;
  symbol: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

export interface BudgetFlexibility {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  percentage_variation: number;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

export const useBudgetSettings = () => {
  const [budgetLevels, setBudgetLevels] = useState<BudgetLevel[]>([]);
  const [currencies, setCurrencies] = useState<BudgetCurrency[]>([]);
  const [flexibilityOptions, setFlexibilityOptions] = useState<BudgetFlexibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBudgetSettings();
  }, []);

  const fetchBudgetSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const [levelsData, currenciesData, flexibilityData] = await Promise.all([
        apiClient.get<BudgetLevel[]>('poi/budget-levels/'),
        apiClient.get<BudgetCurrency[]>('poi/budget-currencies/'),
        apiClient.get<BudgetFlexibility[]>('poi/budget-flex-options/'),
      ]);

      // Handle both array and paginated response formats
      const levelsArray = extractArrayFromResponse<BudgetLevel>(levelsData);
      const currenciesArray = extractArrayFromResponse<BudgetCurrency>(currenciesData);
      const flexibilityArray = extractArrayFromResponse<BudgetFlexibility>(flexibilityData);

      setBudgetLevels(levelsArray.filter(level => level.is_active !== false).sort((a, b) => a.display_order - b.display_order));
      setCurrencies(currenciesArray.filter(currency => currency.is_active !== false).sort((a, b) => a.display_order - b.display_order));
      setFlexibilityOptions(flexibilityArray.filter(option => option.is_active !== false).sort((a, b) => a.display_order - b.display_order));

    } catch (err) {
      console.error('Error fetching budget settings:', err);
      setError('Erreur lors du chargement des paramètres de budget');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCurrency = useCallback(() => {
    return currencies.find((currency) => currency.is_default) || currencies[0];
  }, [currencies]);

  const getDefaultFlexibility = useCallback(() => {
    return flexibilityOptions.find((option) => option.is_default) || flexibilityOptions[0];
  }, [flexibilityOptions]);

  const getBudgetLevelByCode = useCallback(
    (code: string) => budgetLevels.find((level) => level.code === code),
    [budgetLevels],
  );

  const getCurrencyByCode = useCallback(
    (code: string) => currencies.find((currency) => currency.code === code),
    [currencies],
  );

  const getFlexibilityByCode = useCallback(
    (code: string) => flexibilityOptions.find((option) => option.code === code),
    [flexibilityOptions],
  );

  return {
    budgetLevels,
    currencies,
    flexibilityOptions,
    loading,
    error,
    getDefaultCurrency,
    getDefaultFlexibility,
    getBudgetLevelByCode,
    getCurrencyByCode,
    getFlexibilityByCode,
    refresh: fetchBudgetSettings
  };
};
