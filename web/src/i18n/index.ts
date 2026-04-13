import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: localStorage.getItem('locale') || 'zh-CN',
  fallbackLocale: 'zh-CN',
  globalInjection: true, // Enable $t in templates
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
});

export default i18n;
