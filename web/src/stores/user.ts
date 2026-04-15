import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types';

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<User | null>(null);
  const token = ref<string>('');
  const isLoggedIn = ref<boolean>(false);

  let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // 从 localStorage 恢复登录状态（页面刷新时调用）
  const initFromStorage = () => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken) {
      token.value = savedToken;
      isLoggedIn.value = true;
    }
    if (savedUser) {
      try {
        userInfo.value = JSON.parse(savedUser);
      } catch {
        userInfo.value = null;
      }
    }
  };

  // 用户信息计算属性
  const userInitial = computed(() => {
    const u = userInfo.value;
    return (u?.nickname || u?.username || 'U').charAt(0).toUpperCase();
  });

  const isAdmin = computed(() => {
    return ['admin', 'superadmin'].includes(userInfo.value?.role || '');
  });

  // 登录成功后调用
  const setLoginData = (user: any, newToken: string, newRefreshToken?: string) => {
    userInfo.value = user;
    token.value = newToken;
    isLoggedIn.value = true;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
  };

  const setUser = (user: User | null) => {
    userInfo.value = user;
    isLoggedIn.value = !!user;
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  };

  const setToken = (newToken: string) => {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem('token', newToken);
    }
  };

  const logout = () => {
    userInfo.value = null;
    token.value = '';
    isLoggedIn.value = false;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    stopSessionHeartbeat();
  };

  // ===== Session 校验与心跳 =====

  /**
   * 向后端验证当前 token 是否仍然有效，并更新 userInfo
   * 如果 token 过期或用户被禁用，自动执行 logout
   */
  const validateSession = async (): Promise<boolean> => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      logout();
      return false;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (!res.ok) {
        logout();
        return false;
      }
      const data = await res.json();
      if (data.success && data.data) {
        userInfo.value = data.data;
        isLoggedIn.value = true;
        token.value = savedToken;
        localStorage.setItem('user', JSON.stringify(data.data));
        return true;
      }
      logout();
      return false;
    } catch {
      // 网络错误时不登出，保留离线状态
      return false;
    }
  };

  /**
   * 启动会话心跳，每 5 分钟验证一次
   */
  const startSessionHeartbeat = () => {
    stopSessionHeartbeat();
    _heartbeatTimer = setInterval(validateSession, 5 * 60 * 1000);
  };

  /**
   * 停止会话心跳
   */
  const stopSessionHeartbeat = () => {
    if (_heartbeatTimer) {
      clearInterval(_heartbeatTimer);
      _heartbeatTimer = null;
    }
  };

  /**
   * 处理跨标签页 storage 变化
   * - token 被删除 → 自动登出
   * - token 被设置（另一个标签页登录了）→ 自动同步
   */
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'token') {
      if (!event.newValue) {
        // token 被清除 → 其他标签页已登出
        logout();
      } else if (event.newValue !== token.value) {
        // token 变更 → 其他标签页完成了登录/刷新
        initFromStorage();
        validateSession();
      }
    }
  };

  return {
    userInfo,
    token,
    isLoggedIn,
    userInitial,
    isAdmin,
    initFromStorage,
    setLoginData,
    setUser,
    setToken,
    logout,
    validateSession,
    startSessionHeartbeat,
    stopSessionHeartbeat,
    handleStorageChange,
  };
});