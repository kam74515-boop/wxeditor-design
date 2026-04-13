import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import ElementPlus, { ElMessage } from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import en from 'element-plus/dist/locale/en.mjs';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import router from './router';
import i18n from './i18n';
import App from './App.vue';
import '@/styles/index.scss';
import '@/styles/ueditor-flat.css';
import '@/styles/ueditor-icons.css';

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

app.use(i18n);
app.use(router);

// Element Plus locale syncs with vue-i18n
const elementLocaleMap: Record<string, any> = {
  'zh-CN': zhCn,
  'en-US': en,
};
app.use(ElementPlus, { locale: elementLocaleMap[i18n.global.locale.value] || zhCn });

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.config.errorHandler = (err: any) => {
  console.error('Vue error:', err);
  const msg = err?.message || '页面渲染出错，请刷新重试';
  ElMessage.error(msg);
};

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  event.preventDefault();
});

app.mount('#app');