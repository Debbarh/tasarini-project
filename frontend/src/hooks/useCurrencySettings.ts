import { useCallback, useEffect, useMemo, useState } from "react";

type CurrencyCode = "EUR" | "USD" | "GBP" | "MAD";

export interface SupportedCurrency {
  code: CurrencyCode;
  label: string;
  symbol: string;
}

const STORAGE_KEY = "tasarini.currency";

const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "USD", label: "Dollar US", symbol: "$" },
  { code: "GBP", label: "Livre Sterling", symbol: "£" },
  { code: "MAD", label: "Dirham marocain", symbol: "MAD" },
];

const BASE_RATES: Record<CurrencyCode, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  MAD: 10.9,
};

const DEFAULT_CURRENCY: CurrencyCode = "EUR";

const isCurrencyCode = (value: string): value is CurrencyCode =>
  SUPPORTED_CURRENCIES.some((currency) => currency.code === value);

export const useCurrencySettings = () => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return DEFAULT_CURRENCY;
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    return stored && isCurrencyCode(stored) ? stored : DEFAULT_CURRENCY;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage?.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = useCallback((code: string) => {
    if (!isCurrencyCode(code)) return;
    setCurrencyState(code);
  }, []);

  const convertAmount = useCallback(
    (amount: number, fromCurrency: string | null | undefined, toCurrency: string | null | undefined) => {
      if (!Number.isFinite(amount)) return amount;
      const from = fromCurrency && isCurrencyCode(fromCurrency) ? fromCurrency : DEFAULT_CURRENCY;
      const to = toCurrency && isCurrencyCode(toCurrency) ? toCurrency : DEFAULT_CURRENCY;
      if (from === to) return amount;

      const fromRate = BASE_RATES[from] ?? 1;
      const toRate = BASE_RATES[to] ?? 1;
      if (!fromRate || !toRate) return amount;

      return (amount / fromRate) * toRate;
    },
    []
  );

  const formatCurrency = useCallback(
    (amount: number, code: string | null | undefined, locale = "fr-FR") => {
      const currencyCode = code && isCurrencyCode(code) ? code : DEFAULT_CURRENCY;
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currencyCode,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch (error) {
        return `${amount.toFixed(2)} ${currencyCode}`;
      }
    },
    []
  );

  const availableCurrencies = useMemo(() => SUPPORTED_CURRENCIES, []);

  return {
    currency,
    setCurrency,
    convertAmount,
    formatCurrency,
    availableCurrencies,
  } as const;
};

export type CurrencySettingsHook = ReturnType<typeof useCurrencySettings>;
export { SUPPORTED_CURRENCIES };
