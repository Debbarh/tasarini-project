// Service de traduction utilisant LibreTranslate local (Docker)

const LIBRETRANSLATE_URL = import.meta.env.VITE_LIBRETRANSLATE_URL || 'http://localhost:5050';

// Mapping des codes de langue
const LANGUAGE_MAP: Record<string, string> = {
  'fr': 'fr',
  'en': 'en',
  'es': 'es',
  'de': 'de',
  'it': 'it',
  'pt': 'pt',
  'ru': 'ru',
  'ja': 'ja',
  'zh': 'zh',
  'hi': 'hi',
  'ar': 'ar'
};

// Cache des traductions
const translationCache = new Map<string, string>();

/**
 * Traduit un texte d'une langue source vers une langue cible via LibreTranslate
 */
export const translateText = async (
  text: string,
  sourceLang: string = 'en',
  targetLang: string
): Promise<string | null> => {
  // Vérifier le cache
  const cacheKey = `${text}_${sourceLang}_${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Ne pas traduire si la langue source est la même que la cible
  if (sourceLang === targetLang) {
    return text;
  }

  try {
    const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: LANGUAGE_MAP[sourceLang] || sourceLang,
        target: LANGUAGE_MAP[targetLang] || targetLang,
        format: 'text'
      })
    });

    if (!response.ok) {
      console.error(`LibreTranslate error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (data && data.translatedText) {
      const translated = data.translatedText;
      // Mettre en cache
      translationCache.set(cacheKey, translated);
      return translated;
    }

    return null;
  } catch (error) {
    console.error('Error translating text:', error);
    return null;
  }
};

/**
 * Traduit un nom de lieu dans toutes les langues supportées
 * Utilise l'anglais comme langue source par défaut
 */
export const translateLocationName = async (
  locationName: string,
  targetLanguages: string[],
  sourceLang: string = 'en'
): Promise<Record<string, string>> => {
  const translations: Record<string, string> = {};

  // Ajouter le nom source
  translations[`name_${sourceLang}`] = locationName;

  // Traduire dans chaque langue cible
  for (const targetLang of targetLanguages) {
    if (targetLang === sourceLang) {
      translations[`name_${targetLang}`] = locationName;
      continue;
    }

    const translated = await translateText(locationName, sourceLang, targetLang);
    if (translated) {
      translations[`name_${targetLang}`] = translated;
    }
  }

  return translations;
};

/**
 * Vérifie si le service LibreTranslate est disponible
 */
export const checkLibreTranslateAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${LIBRETRANSLATE_URL}/languages`, {
      method: 'GET'
    });
    return response.ok;
  } catch (error) {
    console.warn('LibreTranslate not available:', error);
    return false;
  }
};

/**
 * Obtient la liste des langues supportées par LibreTranslate
 */
export const getSupportedLanguages = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${LIBRETRANSLATE_URL}/languages`, {
      method: 'GET'
    });

    if (!response.ok) {
      return [];
    }

    const languages = await response.json();
    return languages.map((lang: any) => lang.code);
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    return [];
  }
};
