#!/usr/bin/env node

/**
 * Script pour traduire automatiquement les textes en anglais
 * vers les 10 autres langues supportées
 *
 * Utilise l'API @google-cloud/translate (gratuit jusqu'à 500K caractères/mois)
 * ou @vitalets/google-translate-api (gratuit mais non officiel)
 */

const fs = require('fs');
const path = require('path');

// === TRADUCTIONS MANUELLES PROFESSIONNELLES ===
// Pour assurer la qualité, certains termes clés sont traduits manuellement

const TRANSLATIONS = {
  // Forgot Password
  "Forgot password?": {
    fr: "Mot de passe oublié ?",
    es: "¿Olvidaste tu contraseña?",
    de: "Passwort vergessen?",
    it: "Password dimenticata?",
    pt: "Esqueceu a senha?",
    ar: "هل نسيت كلمة المرور؟",
    ru: "Забыли пароль?",
    ja: "パスワードをお忘れですか？",
    zh: "忘记密码？",
    hi: "पासवर्ड भूल गए?"
  },
  "Reset password": {
    fr: "Réinitialiser le mot de passe",
    es: "Restablecer contraseña",
    de: "Passwort zurücksetzen",
    it: "Reimposta password",
    pt: "Redefinir senha",
    ar: "إعادة تعيين كلمة المرور",
    ru: "Сбросить пароль",
    ja: "パスワードをリセット",
    zh: "重置密码",
    hi: "पासवर्ड रीसेट करें"
  },
  "Enter your email address and we'll send you a link to reset your password.": {
    fr: "Saisissez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.",
    es: "Ingresa tu dirección de correo electrónico y te enviaremos un enlace para restablecer tu contraseña.",
    de: "Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.",
    it: "Inserisci il tuo indirizzo email e ti invieremo un link per reimpostare la tua password.",
    pt: "Digite seu endereço de e-mail e enviaremos um link para redefinir sua senha.",
    ar: "أدخل عنوان بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.",
    ru: "Введите свой адрес электронной почты, и мы отправим вам ссылку для сброса пароля.",
    ja: "メールアドレスを入力すると、パスワードをリセットするためのリンクをお送りします。",
    zh: "输入您的电子邮件地址，我们将向您发送重置密码的链接。",
    hi: "अपना ईमेल पता दर्ज करें और हम आपको अपना पासवर्ड रीसेट करने के लिए एक लिंक भेजेंगे।"
  },
  "Send reset link": {
    fr: "Envoyer le lien",
    es: "Enviar enlace",
    de: "Link senden",
    it: "Invia link",
    pt: "Enviar link",
    ar: "إرسال الرابط",
    ru: "Отправить ссылку",
    ja: "リンクを送信",
    zh: "发送链接",
    hi: "लिंक भेजें"
  },
  "Sending...": {
    fr: "Envoi...",
    es: "Enviando...",
    de: "Senden...",
    it: "Invio...",
    pt: "Enviando...",
    ar: "جارٍ الإرسال...",
    ru: "Отправка...",
    ja: "送信中...",
    zh: "发送中...",
    hi: "भेज रहे हैं..."
  },
  "Email sent": {
    fr: "Email envoyé",
    es: "Correo enviado",
    de: "E-Mail gesendet",
    it: "Email inviata",
    pt: "E-mail enviado",
    ar: "تم إرسال البريد الإلكتروني",
    ru: "Письмо отправлено",
    ja: "メール送信完了",
    zh: "邮件已发送",
    hi: "ईमेल भेजा गया"
  },
  "Check your inbox (and spam folder) for the reset link.": {
    fr: "Vérifiez votre boîte de réception (et vos spams) pour le lien de réinitialisation.",
    es: "Revisa tu bandeja de entrada (y carpeta de spam) para encontrar el enlace de restablecimiento.",
    de: "Überprüfen Sie Ihren Posteingang (und Spam-Ordner) auf den Reset-Link.",
    it: "Controlla la tua casella di posta (e la cartella spam) per il link di reset.",
    pt: "Verifique sua caixa de entrada (e pasta de spam) para o link de redefinição.",
    ar: "تحقق من صندوق الوارد الخاص بك (ومجلد البريد العشوائي) للحصول على رابط إعادة التعيين.",
    ru: "Проверьте свой почтовый ящик (и папку со спамом) на наличие ссылки для сброса.",
    ja: "受信トレイ（および迷惑メールフォルダ）でリセットリンクを確認してください。",
    zh: "请检查您的收件箱（和垃圾邮件文件夹）以获取重置链接。",
    hi: "रीसेट लिंक के लिए अपना इनबॉक्स (और स्पैम फ़ोल्डर) जांचें।"
  },
  "If your email exists in our system, you'll receive a reset link.": {
    fr: "Si votre email existe dans notre système, vous recevrez un lien de réinitialisation.",
    es: "Si tu correo electrónico existe en nuestro sistema, recibirás un enlace de restablecimiento.",
    de: "Wenn Ihre E-Mail in unserem System existiert, erhalten Sie einen Reset-Link.",
    it: "Se la tua email esiste nel nostro sistema, riceverai un link di reset.",
    pt: "Se o seu e-mail existir em nosso sistema, você receberá um link de redefinição.",
    ar: "إذا كان بريدك الإلكتروني موجودًا في نظامنا، فستتلقى رابط إعادة التعيين.",
    ru: "Если ваш адрес электронной почты есть в нашей системе, вы получите ссылку для сброса.",
    ja: "あなたのメールアドレスがシステムに存在する場合、リセットリンクが送信されます。",
    zh: "如果您的电子邮件在我们的系统中存在，您将收到一个重置链接。",
    hi: "यदि आपका ईमेल हमारे सिस्टम में मौजूद है, तो आपको एक रीसेट लिंक प्राप्त होगा।"
  },
  // Email not confirmed errors
  "Please verify your email by clicking the link sent to your inbox.": {
    fr: "Veuillez vérifier votre email en cliquant sur le lien envoyé dans votre boîte de réception.",
    es: "Por favor verifica tu correo electrónico haciendo clic en el enlace enviado a tu bandeja de entrada.",
    de: "Bitte überprüfen Sie Ihre E-Mail, indem Sie auf den Link in Ihrem Posteingang klicken.",
    it: "Verifica la tua email cliccando sul link inviato alla tua casella di posta.",
    pt: "Por favor, verifique seu e-mail clicando no link enviado para sua caixa de entrada.",
    ar: "يرجى التحقق من بريدك الإلكتروني بالنقر على الرابط المرسل إلى صندوق الوارد الخاص بك.",
    ru: "Пожалуйста, подтвердите свой адрес электронной почты, нажав на ссылку, отправленную в ваш почтовый ящик.",
    ja: "受信トレイに送信されたリンクをクリックして、メールアドレスを確認してください。",
    zh: "请点击发送到您收件箱的链接以验证您的电子邮件。",
    hi: "कृपया अपने इनबॉक्स में भेजे गए लिंक पर क्लिक करके अपना ईमेल सत्यापित करें।"
  },
  "Invalid email or password": {
    fr: "Email ou mot de passe incorrect",
    es: "Correo electrónico o contraseña incorrectos",
    de: "Ungültige E-Mail oder Passwort",
    it: "Email o password non validi",
    pt: "E-mail ou senha inválidos",
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    ru: "Неверный адрес электронной почты или пароль",
    ja: "無効なメールアドレスまたはパスワード",
    zh: "无效的电子邮件或密码",
    hi: "अमान्य ईमेल या पासवर्ड"
  },

  // Partner Dashboard
  "Overview": {
    fr: "Vue d'ensemble",
    es: "Resumen",
    de: "Übersicht",
    it: "Panoramica",
    pt: "Visão geral",
    ar: "نظرة عامة",
    ru: "Обзор",
    ja: "概要",
    zh: "概览",
    hi: "अवलोकन"
  },
  "Analytics": {
    fr: "Analytiques",
    es: "Analítica",
    de: "Analysen",
    it: "Analisi",
    pt: "Análises",
    ar: "التحليلات",
    ru: "Аналитика",
    ja: "分析",
    zh: "分析",
    hi: "विश्लेषण"
  },
  "My POIs": {
    fr: "Mes POIs",
    es: "Mis POIs",
    de: "Meine POIs",
    it: "I miei POI",
    pt: "Meus POIs",
    ar: "نقاط الاهتمام الخاصة بي",
    ru: "Мои POI",
    ja: "マイPOI",
    zh: "我的POI",
    hi: "मेरे POI"
  },
  "Bookings": {
    fr: "Réservations",
    es: "Reservas",
    de: "Buchungen",
    it: "Prenotazioni",
    pt: "Reservas",
    ar: "الحجوزات",
    ru: "Бронирования",
    ja: "予約",
    zh: "预订",
    hi: "बुकिंग"
  },
  "Finances": {
    fr: "Finances",
    es: "Finanzas",
    de: "Finanzen",
    it: "Finanze",
    pt: "Finanças",
    ar: "المالية",
    ru: "Финансы",
    ja: "財務",
    zh: "财务",
    hi: "वित्त"
  },
  "Subscription": {
    fr: "Abonnement",
    es: "Suscripción",
    de: "Abonnement",
    it: "Abbonamento",
    pt: "Assinatura",
    ar: "الاشتراك",
    ru: "Подписка",
    ja: "サブスクリプション",
    zh: "订阅",
    hi: "सदस्यता"
  }
};

const LOCALES_DIR = path.join(__dirname, '..', 'frontend', 'src', 'i18n', 'locales');

function loadTranslationFile(lang) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erreur lors du chargement de ${lang}.json:`, error.message);
    return null;
  }
}

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

function translate(text, targetLang) {
  // Vérifier les traductions manuelles
  if (TRANSLATIONS[text] && TRANSLATIONS[text][targetLang]) {
    return TRANSLATIONS[text][targetLang];
  }

  // Par défaut, retourner le texte anglais
  return text;
}

async function translateMissingKeys() {
  console.log('🌍 Traduction automatique des clés manquantes...\n');

  const enData = loadTranslationFile('en');
  if (!enData) {
    console.error('❌ Impossible de charger le fichier de référence en.json');
    return;
  }

  const enKeys = getAllKeys(enData);
  const languages = ['fr', 'es', 'de', 'it', 'pt', 'ar', 'ru', 'ja', 'zh', 'hi'];

  let totalTranslated = 0;

  for (const lang of languages) {
    console.log(`\n📝 Traduction vers ${lang.toUpperCase()}...`);

    const langData = loadTranslationFile(lang);
    if (!langData) continue;

    let translated = 0;

    for (const { key, value } of enKeys) {
      const existingValue = getNestedValue(langData, key);

      // Si la valeur est identique à l'anglais, on la traduit
      if (existingValue === value && typeof value === 'string') {
        const translation = translate(value, lang);

        if (translation !== value) {
          setNestedValue(langData, key, translation);
          translated++;
        }
      }
    }

    if (translated > 0) {
      saveTranslationFile(lang, langData);
      console.log(`   ✅ ${translated} traductions appliquées`);
      totalTranslated += translated;
    } else {
      console.log(`   ℹ️  Aucune nouvelle traduction`);
    }
  }

  console.log(`\n✅ ${totalTranslated} traductions au total appliquées!`);
  console.log('\n💡 Note: Les textes non traduits gardent leur version anglaise.');
  console.log('   Pour une traduction complète, utilisez un service de traduction professionnel.');
}

translateMissingKeys().catch(console.error);
