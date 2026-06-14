/**
 * Utilitaires pour gérer les champs multilingues dynamiques
 * 
 * Ces fonctions permettent d'extraire le label/nom dans la langue active
 * depuis les objets qui ont des champs multilingues (name_fr, name_en, etc.)
 */

export interface MultilingualField {
  name?: string;
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
}

export interface MultilingualLabelField {
  label_fr?: string;
  label_en?: string;
  label_es?: string;
  label_de?: string;
  label_it?: string;
  label_pt?: string;
  label_ru?: string;
  label_ja?: string;
  label_zh?: string;
  label_hi?: string;
  label_ar?: string;
}

export interface MultilingualDescriptionField {
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
}

/**
 * Décode les entités HTML courantes (&amp; -> &, etc.) qui peuvent se retrouver
 * dans les données de taxonomie (ex: "Bed &amp; Breakfast").
 */
export const decodeEntities = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

/**
 * Extrait le nom localisé d'un objet avec des champs name_XX
 *
 * @param item - Objet contenant les champs multilingues
 * @param language - Code de langue (ex: 'fr', 'en', 'es')
 * @returns Le nom dans la langue demandée, ou fallback sur français puis 'name'
 * 
 * @example
 * const country = { name: "France", name_fr: "France", name_en: "France", name_es: "Francia" };
 * getLocalizedName(country, 'es') // => "Francia"
 * getLocalizedName(country, 'de') // => "France" (fallback)
 */
export const getLocalizedName = (
  item: MultilingualField | null | undefined,
  language: string
): string => {
  if (!item) return '';
  
  // Nettoyer le code de langue (enlever variantes régionales)
  const langCode = language.split('-')[0].toLowerCase();
  
  // Essayer la langue demandée
  const nameField = `name_${langCode}` as keyof MultilingualField;
  const localizedName = item[nameField];
  
  const raw =
    (typeof localizedName === 'string' && localizedName) ||
    item.name_fr ||
    item.name ||
    item.name_en ||
    '';
  return decodeEntities(raw);
};

/**
 * Extrait le label localisé d'un objet avec des champs label_XX
 * 
 * @param item - Objet contenant les champs multilingues
 * @param language - Code de langue (ex: 'fr', 'en', 'es')
 * @returns Le label dans la langue demandée, ou fallback sur français
 * 
 * @example
 * const category = { label_fr: "Aventure", label_en: "Adventure", label_es: "Aventura" };
 * getLocalizedLabel(category, 'en') // => "Adventure"
 */
export const getLocalizedLabel = (
  item: MultilingualLabelField | null | undefined,
  language: string
): string => {
  if (!item) return '';
  
  // Nettoyer le code de langue
  const langCode = language.split('-')[0].toLowerCase();
  
  // Essayer la langue demandée
  const labelField = `label_${langCode}` as keyof MultilingualLabelField;
  const localizedLabel = item[labelField];
  
  const raw =
    (typeof localizedLabel === 'string' && localizedLabel) ||
    item.label_fr ||
    item.label_en ||
    '';
  return decodeEntities(raw);
};

/**
 * Extrait la description localisée d'un objet avec des champs description_XX
 * 
 * @param item - Objet contenant les champs multilingues
 * @param language - Code de langue (ex: 'fr', 'en', 'es')
 * @returns La description dans la langue demandée, ou fallback sur français
 */
export const getLocalizedDescription = (
  item: MultilingualDescriptionField | null | undefined,
  language: string
): string => {
  if (!item) return '';
  
  // Nettoyer le code de langue
  const langCode = language.split('-')[0].toLowerCase();
  
  // Essayer la langue demandée
  const descField = `description_${langCode}` as keyof MultilingualDescriptionField;
  const localizedDesc = item[descField];
  
  if (localizedDesc && typeof localizedDesc === 'string') {
    return localizedDesc;
  }
  
  // Fallback 1: Français
  if (item.description_fr) {
    return item.description_fr;
  }
  
  // Fallback 2: Anglais
  if (item.description_en) {
    return item.description_en;
  }
  
  return '';
};

/**
 * Retourne un objet complet avec nom, label et description localisés
 * 
 * @param item - Objet avec champs multilingues
 * @param language - Code de langue
 * @returns Objet avec les champs localisés
 */
export const getLocalizedFields = <
  T extends MultilingualField & MultilingualLabelField & MultilingualDescriptionField
>(
  item: T | null | undefined,
  language: string
): { name: string; label: string; description: string } => {
  return {
    name: getLocalizedName(item, language),
    label: getLocalizedLabel(item, language),
    description: getLocalizedDescription(item, language),
  };
};
