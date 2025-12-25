// Service pour récupérer les noms de lieux en plusieurs langues via Nominatim
export interface MultilingualLocation {
  name: string; // Nom par défaut
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  name_it?: string;
  name_pt?: string;
  name_ru?: string;
  name_ja?: string;
  name_zh?: string;
  name_hi?: string;
  name_ar?: string;
  latitude?: number;
  longitude?: number;
}

export interface MultilingualGeocodingResult {
  country: MultilingualLocation;
  city: MultilingualLocation;
  success: boolean;
  error?: string;
}

// Langues supportées par le système (Amazigh retiré comme demandé)
const SUPPORTED_LANGUAGES = [
  'fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'hi', 'ar'
];

// Mapping des codes de langue vers les codes accept-language optimaux pour Nominatim
const LANGUAGE_CODES: Record<string, string> = {
  'fr': 'fr',
  'en': 'en',
  'es': 'es',
  'de': 'de',
  'it': 'it',
  'pt': 'pt',
  'ru': 'ru',
  'ja': 'ja',
  'zh': 'zh-CN,zh',
  'hi': 'hi',
  'ar': 'ar' // Arabe
};

// Cache pour éviter les requêtes répétées
const geocodingCache = new Map<string, MultilingualGeocodingResult>();

/**
 * Récupère le nom d'un lieu dans une langue spécifique via Nominatim
 * Avec support amélioré pour l'arabe et autres langues non-latines
 */
const fetchLocationNameInLanguage = async (
  lat: number,
  lng: number,
  language: string
): Promise<{ city?: string; country?: string; osm_id?: number; osm_type?: string }> => {
  try {
    const acceptLanguage = LANGUAGE_CODES[language] || language;

    // Pour l'arabe, on essaie plusieurs variations
    const languageParam = language === 'ar'
      ? 'ar,en' // Fallback vers l'anglais si l'arabe n'est pas disponible
      : acceptLanguage;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${languageParam}&addressdetails=1&extratags=1&namedetails=1&zoom=10`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Tasarini/1.0',
        },
      }
    );

    if (!response.ok) {
      return {};
    }

    const data = await response.json();

    if (data && data.address) {
      // Essayer d'abord les noms spécifiques à la langue dans namedetails
      let cityName = data.address.city ||
                     data.address.town ||
                     data.address.village ||
                     data.address.municipality ||
                     data.address.hamlet ||
                     data.address.suburb;

      let countryName = data.address.country;

      // Pour l'arabe, vérifier les namedetails si disponibles
      if (language === 'ar' && data.namedetails) {
        // OpenStreetMap stocke parfois les noms arabes sous 'name:ar'
        if (data.namedetails['name:ar']) {
          const parts = data.namedetails['name:ar'].split(',');
          if (parts.length > 0) cityName = parts[0].trim();
        }
        // Chercher le nom du pays en arabe
        if (data.address.country_code) {
          countryName = getArabicCountryName(data.address.country_code) || countryName;
        }
      }

      return {
        city: cityName,
        country: countryName,
        osm_id: data.osm_id,
        osm_type: data.osm_type
      };
    }

    return {};
  } catch (error) {
    console.error(`Error fetching location name in ${language}:`, error);
    return {};
  }
};

/**
 * Récupère les noms arabes des pays depuis les codes ISO
 * Fallback pour les pays majeurs si Nominatim ne retourne pas le nom arabe
 */
const getArabicCountryName = (countryCode: string): string | undefined => {
  const arabicCountries: Record<string, string> = {
    'fr': 'فرنسا',
    'es': 'إسبانيا',
    'it': 'إيطاليا',
    'de': 'ألمانيا',
    'gb': 'المملكة المتحدة',
    'us': 'الولايات المتحدة',
    'ma': 'المغرب',
    'dz': 'الجزائر',
    'tn': 'تونس',
    'eg': 'مصر',
    'sa': 'السعودية',
    'ae': 'الإمارات',
    'jo': 'الأردن',
    'lb': 'لبنان',
    'sy': 'سوريا',
    'iq': 'العراق',
    'ye': 'اليمن',
    'om': 'عمان',
    'kw': 'الكويت',
    'qa': 'قطر',
    'bh': 'البحرين',
    'ps': 'فلسطين',
    'jp': 'اليابان',
    'cn': 'الصين',
    'in': 'الهند',
    'ru': 'روسيا',
    'tr': 'تركيا',
    'br': 'البرازيل',
    'mx': 'المكسيك',
    'ca': 'كندا',
    'au': 'أستراليا',
    'pt': 'البرتغال',
    'gr': 'اليونان',
    'ch': 'سويسرا',
    'nl': 'هولندا',
    'be': 'بلجيكا',
    'at': 'النمسا',
    'se': 'السويد',
    'no': 'النرويج',
    'dk': 'الدنمارك',
    'fi': 'فنلندا',
    'pl': 'بولندا',
    'cz': 'التشيك',
    'th': 'تايلاند',
    'id': 'إندونيسيا',
    'my': 'ماليزيا',
    'sg': 'سنغافورة',
    'kr': 'كوريا الجنوبية',
    'za': 'جنوب أفريقيا'
  };

  return arabicCountries[countryCode.toLowerCase()];
};

/**
 * Récupère les noms de villes arabes depuis Overpass API (OpenStreetMap)
 * Utilisé en fallback quand Nominatim ne retourne pas de nom arabe
 */
const getArabicCityNameFromOSM = async (
  lat: number,
  lng: number
): Promise<string | undefined> => {
  try {
    // Rechercher dans un rayon de 5km autour du point
    const radius = 5000; // 5km en mètres

    const query = `
      [out:json];
      (
        node(around:${radius},${lat},${lng})["place"~"city|town|village"]["name:ar"];
        way(around:${radius},${lat},${lng})["place"~"city|town|village"]["name:ar"];
        relation(around:${radius},${lat},${lng})["place"~"city|town|village"]["name:ar"];
      );
      out body;
    `;

    const response = await fetch(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`
      }
    );

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();

    // Trouver l'élément le plus proche avec un nom arabe
    if (data.elements && data.elements.length > 0) {
      const elementWithArabic = data.elements.find((el: any) => el.tags && el.tags['name:ar']);
      if (elementWithArabic && elementWithArabic.tags['name:ar']) {
        console.log('Found Arabic name from OSM:', elementWithArabic.tags['name:ar']);
        return elementWithArabic.tags['name:ar'];
      }
    }

    return undefined;
  } catch (error) {
    console.error('Error fetching Arabic name from OSM:', error);
    return undefined;
  }
};

/**
 * Pause pour respecter la politique d'utilisation de Nominatim (max 1 req/sec)
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Traduit les noms manquants via LibreTranslate
 */
const fillMissingTranslationsWithLibreTranslate = async (
  translations: Record<string, string>,
  sourceName: string,
  sourceLang: string = 'en',
  targetLanguages: string[]
): Promise<void> => {
  try {
    const { translateText, checkLibreTranslateAvailability } = await import('./translationService');

    // Vérifier si LibreTranslate est disponible
    const isAvailable = await checkLibreTranslateAvailability();
    if (!isAvailable) {
      console.warn('LibreTranslate not available, skipping automatic translation');
      return;
    }

    console.log('Using LibreTranslate to fill missing translations for:', sourceName);

    for (const lang of targetLanguages) {
      const key = `name_${lang}`;

      // Ne traduire que si la traduction n'existe pas déjà
      if (!translations[key] && lang !== sourceLang) {
        const translated = await translateText(sourceName, sourceLang, lang);
        if (translated) {
          translations[key] = translated;
          console.log(`Translated "${sourceName}" to ${lang}: "${translated}"`);
        }
        // Petit délai pour ne pas surcharger LibreTranslate (50ms est suffisant)
        await delay(50);
      }
    }
  } catch (error) {
    console.error('Error filling translations with LibreTranslate:', error);
  }
};

/**
 * Récupère les noms de pays et ville dans toutes les langues supportées
 */
export const getMultilingualLocationNames = async (
  lat: number,
  lng: number,
  defaultCityName?: string,
  defaultCountryName?: string
): Promise<MultilingualGeocodingResult> => {
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;

  // Vérifier le cache
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  try {
    const cityTranslations: Record<string, string> = {};
    const countryTranslations: Record<string, string> = {};

    // Récupérer les traductions pour chaque langue
    for (let i = 0; i < SUPPORTED_LANGUAGES.length; i++) {
      const lang = SUPPORTED_LANGUAGES[i];

      // Respecter la limite de 1 req/sec de Nominatim (sauf pour la première requête)
      if (i > 0) {
        await delay(1000);
      }

      const locationData = await fetchLocationNameInLanguage(lat, lng, lang);

      if (locationData.city) {
        cityTranslations[`name_${lang}`] = locationData.city;
      }

      if (locationData.country) {
        countryTranslations[`name_${lang}`] = locationData.country;
      }
    }

    // Fallback spécial pour l'arabe si non trouvé via Nominatim
    if (!cityTranslations.name_ar) {
      console.log('Arabic name not found via Nominatim, trying OSM Overpass...');
      await delay(1000); // Respecter les limites de taux
      const arabicCityName = await getArabicCityNameFromOSM(lat, lng);
      if (arabicCityName) {
        cityTranslations.name_ar = arabicCityName;
      }
    }

    // Utiliser les noms anglais comme nom par défaut, sinon français, sinon le premier disponible
    const defaultCityNameFinal =
      cityTranslations.name_en ||
      cityTranslations.name_fr ||
      defaultCityName ||
      Object.values(cityTranslations)[0] ||
      'Unknown City';

    const defaultCountryNameFinal =
      countryTranslations.name_en ||
      countryTranslations.name_fr ||
      defaultCountryName ||
      Object.values(countryTranslations)[0] ||
      'Unknown Country';

    // Combler les traductions manquantes avec LibreTranslate
    const missingCityLanguages = SUPPORTED_LANGUAGES.filter(lang => !cityTranslations[`name_${lang}`]);
    const missingCountryLanguages = SUPPORTED_LANGUAGES.filter(lang => !countryTranslations[`name_${lang}`]);

    if (missingCityLanguages.length > 0 && defaultCityNameFinal !== 'Unknown City') {
      console.log(`Filling ${missingCityLanguages.length} missing city translations with LibreTranslate...`);
      await fillMissingTranslationsWithLibreTranslate(
        cityTranslations,
        defaultCityNameFinal,
        'en',
        missingCityLanguages
      );
    }

    if (missingCountryLanguages.length > 0 && defaultCountryNameFinal !== 'Unknown Country') {
      console.log(`Filling ${missingCountryLanguages.length} missing country translations with LibreTranslate...`);
      await fillMissingTranslationsWithLibreTranslate(
        countryTranslations,
        defaultCountryNameFinal,
        'en',
        missingCountryLanguages
      );
    }

    const result: MultilingualGeocodingResult = {
      country: {
        name: defaultCountryNameFinal,
        ...countryTranslations
      },
      city: {
        name: defaultCityNameFinal,
        latitude: lat,
        longitude: lng,
        ...cityTranslations
      },
      success: true
    };

    // Mettre en cache
    geocodingCache.set(cacheKey, result);

    return result;

  } catch (error) {
    console.error('Error fetching multilingual location names:', error);

    const fallbackResult: MultilingualGeocodingResult = {
      country: {
        name: defaultCountryName || 'Unknown Country'
      },
      city: {
        name: defaultCityName || 'Unknown City',
        latitude: lat,
        longitude: lng
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return fallbackResult;
  }
};

/**
 * Version optimisée qui récupère seulement quelques langues principales
 * Plus rapide car fait moins de requêtes
 */
export const getMultilingualLocationNamesQuick = async (
  lat: number,
  lng: number,
  defaultCityName?: string,
  defaultCountryName?: string
): Promise<MultilingualGeocodingResult> => {
  const cacheKey = `quick_${lat.toFixed(6)},${lng.toFixed(6)}`;

  // Vérifier le cache
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  // Récupérer seulement les langues principales : fr, en, es, de, ar (arabe ajouté)
  const mainLanguages = ['fr', 'en', 'es', 'de', 'ar'];

  try {
    const cityTranslations: Record<string, string> = {};
    const countryTranslations: Record<string, string> = {};

    for (let i = 0; i < mainLanguages.length; i++) {
      const lang = mainLanguages[i];

      if (i > 0) {
        await delay(1000);
      }

      const locationData = await fetchLocationNameInLanguage(lat, lng, lang);

      if (locationData.city) {
        cityTranslations[`name_${lang}`] = locationData.city;
      }

      if (locationData.country) {
        countryTranslations[`name_${lang}`] = locationData.country;
      }
    }

    // Fallback spécial pour l'arabe si non trouvé via Nominatim
    if (!cityTranslations.name_ar) {
      console.log('Arabic name not found via Nominatim (Quick), trying OSM Overpass...');
      await delay(1000); // Respecter les limites de taux
      const arabicCityName = await getArabicCityNameFromOSM(lat, lng);
      if (arabicCityName) {
        cityTranslations.name_ar = arabicCityName;
      }
    }

    const defaultCityNameFinal =
      cityTranslations.name_en ||
      cityTranslations.name_fr ||
      defaultCityName ||
      Object.values(cityTranslations)[0] ||
      'Unknown City';

    const defaultCountryNameFinal =
      countryTranslations.name_en ||
      countryTranslations.name_fr ||
      defaultCountryName ||
      Object.values(countryTranslations)[0] ||
      'Unknown Country';

    // Combler les traductions manquantes avec LibreTranslate (version Quick)
    // Important : Traduire TOUTES les langues supportées, pas seulement les 5 principales
    const missingCityLanguages = SUPPORTED_LANGUAGES.filter(lang => !cityTranslations[`name_${lang}`]);
    const missingCountryLanguages = SUPPORTED_LANGUAGES.filter(lang => !countryTranslations[`name_${lang}`]);

    if (missingCityLanguages.length > 0 && defaultCityNameFinal !== 'Unknown City') {
      console.log(`[Quick] Filling ${missingCityLanguages.length} missing city translations with LibreTranslate...`);
      await fillMissingTranslationsWithLibreTranslate(
        cityTranslations,
        defaultCityNameFinal,
        'en',
        missingCityLanguages
      );
    }

    if (missingCountryLanguages.length > 0 && defaultCountryNameFinal !== 'Unknown Country') {
      console.log(`[Quick] Filling ${missingCountryLanguages.length} missing country translations with LibreTranslate...`);
      await fillMissingTranslationsWithLibreTranslate(
        countryTranslations,
        defaultCountryNameFinal,
        'en',
        missingCountryLanguages
      );
    }

    const result: MultilingualGeocodingResult = {
      country: {
        name: defaultCountryNameFinal,
        ...countryTranslations
      },
      city: {
        name: defaultCityNameFinal,
        latitude: lat,
        longitude: lng,
        ...cityTranslations
      },
      success: true
    };

    geocodingCache.set(cacheKey, result);

    return result;

  } catch (error) {
    console.error('Error fetching quick multilingual location names:', error);

    const fallbackResult: MultilingualGeocodingResult = {
      country: {
        name: defaultCountryName || 'Unknown Country'
      },
      city: {
        name: defaultCityName || 'Unknown City',
        latitude: lat,
        longitude: lng
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return fallbackResult;
  }
};
