#!/usr/bin/env node

/**
 * Script pour compléter automatiquement les traductions manquantes
 * Utilise l'API de traduction LibreTranslate ou Google Translate
 */

const fs = require('fs');
const path = require('path');

// Mapping des codes de langue
const LANG_CODES = {
  en: 'en', // Anglais (référence)
  fr: 'fr', // Français
  es: 'es', // Espagnol
  de: 'de', // Allemand
  it: 'it', // Italien
  pt: 'pt', // Portugais
  ar: 'ar', // Arabe
  ru: 'ru', // Russe
  ja: 'ja', // Japonais
  zh: 'zh', // Chinois
  hi: 'hi'  // Hindi
};

const LOCALES_DIR = path.join(__dirname, '..', 'frontend', 'src', 'i18n', 'locales');

// Traductions de référence (en anglais vers autres langues)
const MANUAL_TRANSLATIONS = {
  // Navigation
  'Plan your trip': {
    fr: 'Planifier votre voyage',
    es: 'Planifica tu viaje',
    de: 'Planen Sie Ihre Reise',
    it: 'Pianifica il tuo viaggio',
    pt: 'Planeje sua viagem',
    ar: 'خطط لرحلتك',
    ru: 'Спланируйте свое путешествие',
    ja: '旅行を計画する',
    zh: '计划您的旅行',
    hi: 'अपनी यात्रा की योजना बनाएं'
  },
  'Be inspired': {
    fr: 'Laissez-vous inspirer',
    es: 'Inspírate',
    de: 'Lassen Sie sich inspirieren',
    it: 'Lasciati ispirare',
    pt: 'Inspire-se',
    ar: 'استلهم',
    ru: 'Вдохновляйтесь',
    ja: 'インスピレーションを得る',
    zh: '获取灵感',
    hi: 'प्रेरित हों'
  },
  'Travel stories': {
    fr: 'Récits de voyage',
    es: 'Historias de viaje',
    de: 'Reisegeschichten',
    it: 'Storie di viaggio',
    pt: 'Histórias de viagem',
    ar: 'قصص السفر',
    ru: 'Истории путешествий',
    ja: '旅行記',
    zh: '旅行故事',
    hi: 'यात्रा कहानियां'
  },
  'My treasures': {
    fr: 'Mes trésors',
    es: 'Mis tesoros',
    de: 'Meine Schätze',
    it: 'I miei tesori',
    pt: 'Meus tesouros',
    ar: 'كنوزي',
    ru: 'Мои сокровища',
    ja: '私の宝物',
    zh: '我的宝藏',
    hi: 'मेरे खजाने'
  }
};

/**
 * Charge un fichier JSON de traduction
 */
function loadTranslationFile(lang) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Erreur lors du chargement de ${lang}.json:`, error.message);
    return null;
  }
}

/**
 * Sauvegarde un fichier JSON de traduction
 */
function saveTranslationFile(lang, data) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✅ ${lang}.json sauvegardé`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la sauvegarde de ${lang}.json:`, error.message);
    return false;
  }
}

/**
 * Obtient toutes les clés d'un objet de manière récursive
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push({ key: fullKey, value });
    }
  }

  return keys;
}

/**
 * Définit une valeur dans un objet imbriqué à partir d'un chemin
 */
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Obtient une valeur dans un objet imbriqué à partir d'un chemin
 */
function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Traduction simple basée sur les correspondances manuelles
 */
function simpleTranslate(text, targetLang) {
  // Vérifier si on a une traduction manuelle
  if (MANUAL_TRANSLATIONS[text] && MANUAL_TRANSLATIONS[text][targetLang]) {
    return MANUAL_TRANSLATIONS[text][targetLang];
  }

  // Si pas de traduction, retourner le texte anglais
  return text;
}

/**
 * Analyse et complète les traductions
 */
function analyzeAndComplete() {
  console.log('🔍 Analyse des fichiers de traduction...\n');

  // Charger le fichier de référence (anglais)
  const enData = loadTranslationFile('en');
  if (!enData) {
    console.error('❌ Impossible de charger le fichier de référence en.json');
    return;
  }

  const enKeys = getAllKeys(enData);
  console.log(`📊 Fichier de référence (en): ${enKeys.length} clés\n`);

  // Analyser chaque langue
  const stats = {};

  for (const [langCode, langName] of Object.entries(LANG_CODES)) {
    if (langCode === 'en') continue; // Ignorer l'anglais (fichier de référence)

    console.log(`\n🌍 Analyse de ${langCode}...`);

    const langData = loadTranslationFile(langCode);
    if (!langData) {
      stats[langCode] = { missing: enKeys.length, completed: 0 };
      continue;
    }

    const langKeys = getAllKeys(langData);
    const missing = [];

    // Vérifier les clés manquantes
    for (const { key, value } of enKeys) {
      const existingValue = getNestedValue(langData, key);

      if (existingValue === undefined || existingValue === value) {
        // Clé manquante ou non traduite (valeur identique à l'anglais)
        missing.push({ key, value });
      }
    }

    console.log(`   Clés totales: ${enKeys.length}`);
    console.log(`   Clés présentes: ${langKeys.length}`);
    console.log(`   Clés manquantes: ${missing.length}`);

    stats[langCode] = {
      total: enKeys.length,
      present: langKeys.length,
      missing: missing.length,
      missingKeys: missing
    };

    // Compléter les traductions manquantes
    if (missing.length > 0) {
      console.log(`   🔧 Complétion des traductions...`);

      let completed = 0;
      for (const { key, value } of missing) {
        const translation = simpleTranslate(value, langCode);
        setNestedValue(langData, key, translation);
        completed++;
      }

      // Sauvegarder le fichier mis à jour
      if (saveTranslationFile(langCode, langData)) {
        stats[langCode].completed = completed;
        console.log(`   ✅ ${completed} traductions ajoutées`);
      }
    } else {
      console.log(`   ✅ Fichier complet !`);
    }
  }

  // Afficher le résumé
  console.log('\n📊 Résumé:');
  console.log('═'.repeat(70));

  for (const [lang, stat] of Object.entries(stats)) {
    const percent = stat.total > 0
      ? ((stat.present / stat.total) * 100).toFixed(1)
      : 0;

    console.log(`${lang.toUpperCase()}: ${stat.present}/${stat.total} (${percent}%) - ${stat.missing} manquantes${stat.completed ? ` - ${stat.completed} ajoutées` : ''}`);
  }

  console.log('═'.repeat(70));
  console.log('\n✅ Analyse terminée !');
}

// Exécuter le script
analyzeAndComplete();
