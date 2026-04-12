import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  skipErrorHandler?: boolean;
  _retry?: boolean;
}

let _appStoreInstance: any = null;
async function getAppStore() {
  if (!_appStoreInstance) {
    try {
      const mod = await import('@/stores/app');
      _appStoreInstance = mod.useAppStore();
    } catch {
      return null;
    }
  }
  return _appStoreInstance;
}

// 懒加载 userStore，用于 401 时同步清除响应式状态
let _userStoreInstance: any = null;
async function getUserStore() {
  if (!_userStoreInstance) {
    try {
      const mod = await import('@/stores/user');
      _userStoreInstance = mod.useUserStore();
    } catch {
      return null;
    }
  }
  return _userStoreInstance;
}

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  const res = await axios.post('/api/auth/refresh', { refreshToken });
  const { token, refreshToken: newRefreshToken } = res.data.data;
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', newRefreshToken);
  return token;
}

class HttpClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: '/api',
      timeout: 120000,
      headers: { 'Content-Type': 'application/json' },
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.instance.interceptors.response.use(
      async (response: AxiosResponse) => {
        const appStore = await getAppStore();
        if (appStore?.isNetworkError) appStore.setNetworkError(false);
        return response.data;
      },
      async (error) => {
        const originalConfig = error.config as CustomAxiosRequestConfig;

        if (error.response?.status === 401 && !originalConfig._retry && !originalConfig.skipErrorHandler) {
          if (isRefreshing) {
            return new Promise((resolve) => {
              pendingRequests.push((token: string) => {
                originalConfig.headers!.Authorization = `Bearer ${token}`;
                resolve(this.instance.request(originalConfig));
              });
            });
          }

          originalConfig._retry = true;
          isRefreshing = true;

          try {
            const newToken = await refreshAccessToken();
            pendingRequests.forEach(cb => cb(newToken));
            pendingRequests = [];
            originalConfig.headers!.Authorization = `Bearer ${newToken}`;
            return this.instance.request(originalConfig);
          } catch (refreshError) {
            pendingRequests = [];
            // 联动 userStore 清除响应式状态
            const userStore = await getUserStore();
            if (userStore) {
              userStore.logout();
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
            }
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        if (!originalConfig?.skipErrorHandler) {
          await this.handleError(error);
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleError(error: any) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const appStore = await getAppStore();

    // 纯网络错误（服务器完全无响应）
    if (!error.response) {
      if (appStore) appStore.setNetworkError(true);
      ElMessage.error('服务器连接异常，请检查网络');
      return;
    }

    // 有响应则清除网络错误标记
    if (appStore) appStore.setNetworkError(false);

    switch (status) {
      case 401: {
        ElMessage.error('登录已过期，请重新登录');
        // 联动 userStore 清除响应式状态
        const userStore = await getUserStore();
        if (userStore) {
          userStore.logout();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('user-store');
        }
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
        break;
      }
      case 403:
        if (appStore) appStore.setShowUpgradeModal(true);
        break;
      case 404:
        ElMessage.error('请求的资源不存在');
        break;
      case 500:
        ElMessage.error('服务器内部错误');
        break;
      default:
        ElMessage.error(message || '网络错误');
    }
  }

  get<T = any>(url: string, config?: CustomAxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config);
  }

  post<T = any>(url: string, data?: any, config?: CustomAxiosRequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: CustomAxiosRequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  delete<T = any>(url: string, config?: CustomAxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }

  upload<T = any>(url: string, formData: FormData, config?: CustomAxiosRequestConfig): Promise<T> {
    return this.instance.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

export const http = new HttpClient();
export default http;