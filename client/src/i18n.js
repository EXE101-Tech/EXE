import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en.json';
import translationVI from './locales/vi.json';

const resources = {
  en: {
    translation: translationEN
  },
  vi: {
    translation: translationVI
  }
};

// Đảm bảo ngôn ngữ mặc định lưu trong localStorage luôn là 'vi'
localStorage.setItem('i18nextLng', 'vi');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'vi', // Mặc định hiển thị tiếng Việt
    fallbackLng: 'vi', // Mặc định là tiếng Việt
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });

export default i18n;
