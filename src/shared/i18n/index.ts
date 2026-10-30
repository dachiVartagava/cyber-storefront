import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ka from './locales/ka.json';
import en from './locales/en.json';
import { APP_CONFIG } from '../config/constants';

const savedLang = localStorage.getItem(APP_CONFIG.LANG_STORAGE_KEY);
const initialLang = savedLang === 'en' || savedLang === 'ka' ? savedLang : 'ka';

document.documentElement.lang = initialLang;

i18n.use(initReactI18next).init({
  resources: {
    ka: { translation: ka },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: 'ka',
  interpolation: {
    escapeValue: false,
  },
});

export function changeAppLanguage(lang: 'ka' | 'en') {
  localStorage.setItem(APP_CONFIG.LANG_STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  i18n.changeLanguage(lang);
}

export default i18n;
