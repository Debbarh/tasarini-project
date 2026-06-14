import { ar, de, enUS, es, fr, hi, it, ja, pt, ru, zhCN, type Locale } from "date-fns/locale";

// Mappe le code de langue i18n vers la locale date-fns correspondante
const MAP: Record<string, Locale> = {
  ar,
  de,
  en: enUS,
  es,
  fr,
  hi,
  it,
  ja,
  pt,
  ru,
  zh: zhCN,
};

export const getDateFnsLocale = (lang?: string): Locale =>
  MAP[(lang || "fr").split("-")[0]] || fr;
