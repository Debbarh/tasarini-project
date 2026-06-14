import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

// Seul le français (langue de repli) est embarqué statiquement → toujours
// disponible immédiatement. Les 10 autres langues sont chargées à la demande
// (chunk séparé par langue) pour alléger le bundle initial.
import frTranslations from './locales/fr.json';

i18n
  // Backend : charge dynamiquement ./locales/<lng>.json à la demande
  .use(
    resourcesToBackend(
      (language: string) => import(`./locales/${language}.json`)
    )
  )
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // fr embarqué d'emblée ; les autres viennent du backend (import dynamique)
    resources: {
      fr: { translation: frTranslations },
    },
    partialBundledLanguages: true,
    fallbackLng: 'fr', // French as fallback since the site is currently in French
    load: 'languageOnly', // 'en-US' -> 'en' (évite de charger un fichier de langue inexistant)
    supportedLngs: ['fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ar', 'hi'],
    debug: false,

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;

export const supportedLanguages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];