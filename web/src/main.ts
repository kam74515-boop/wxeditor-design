import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { ElMessage } from 'element-plus';
import router from './router';
import App from './App.vue';
import '@/styles/index.scss';
import '@/styles/ueditor-flat.css';
import '@/styles/ueditor-icons.css';

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

app.use(router);

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
