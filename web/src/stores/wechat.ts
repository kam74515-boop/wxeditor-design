import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { wechatAccountApi } from '@/api';

export interface WechatAccount {
  id: string;
  name: string;
  wechatId: string;
  type: string;
  appId: string;
  appSecret: string;
  token: string;
  encodingAesKey: string;
  avatar: string;
  status: string;
  isDefault: boolean;
  lastSyncedAt: string;
  createdAt: string;
  /** API 调用量统计 */
  apiUsage?: {
    totalCalls: number;
    remainingCalls: number;
    resetAt: string;
  };
  /** 连接验证状态 */
  verifyStatus?: 'idle' | 'verifying' | 'success' | 'error';
  verifyMessage?: string;
}

export const useWechatStore = defineStore('wechat', () => {
  // ---------- state ----------
  const accounts = ref<WechatAccount[]>([]);
  const loading = ref(false);
  const currentAccountId = ref<string>('');
  const verifyLoadingMap = ref<Record<string, boolean>>({});

  // ---------- getters ----------
  const activeAccounts = computed(() =>
    accounts.value.filter((a) => a.status === 'active'),
  );

  const currentAccount = computed(() =>
    accounts.value.find((a) => a.id === currentAccountId.value) || null,
  );

  const accountById = computed(() => {
    const map: Record<string, WechatAccount> = {};
    for (const a of accounts.value) {
      map[a.id] = a;
    }
    return map;
  });

  // ---------- actions ----------
  async function fetchAccounts() {
    loading.value = true;
    try {
      const res: any = await wechatAccountApi.getList();
      if (res.success) {
        accounts.value = (res.data?.list || res.data || []).map(
          (a: WechatAccount) => ({
            ...a,
            verifyStatus: 'idle' as const,
            verifyMessage: '',
          }),
        );
      }
    } catch {
      // fallback mock
      accounts.value = [
        {
          id: '1',
          name: '科技前沿资讯',
          wechatId: 'tech_frontier',
          type: 'subscription',
          appId: 'wx1234567890abcdef',
          appSecret: '',
          token: '',
          encodingAesKey: '',
          avatar: '',
          status: 'active',
          isDefault: true,
          lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
          createdAt: '2026-01-15T10:00:00Z',
          apiUsage: { totalCalls: 500, remainingCalls: 340, resetAt: '' },
          verifyStatus: 'idle',
          verifyMessage: '',
        },
        {
          id: '2',
          name: '产品发布助手',
          wechatId: 'product_helper',
          type: 'service',
          appId: 'wxabcdef1234567890',
          appSecret: '',
          token: '',
          encodingAesKey: '',
          avatar: '',
          status: 'active',
          isDefault: false,
          lastSyncedAt: new Date(Date.now() - 7200000).toISOString(),
          createdAt: '2026-02-20T08:30:00Z',
          apiUsage: { totalCalls: 1000, remainingCalls: 890, resetAt: '' },
          verifyStatus: 'idle',
          verifyMessage: '',
        },
        {
          id: '3',
          name: '测试公众号',
          wechatId: 'test_account',
          type: 'subscription',
          appId: 'wx9999999999999999',
          appSecret: '',
          token: '',
          encodingAesKey: '',
          avatar: '',
          status: 'error',
          isDefault: false,
          lastSyncedAt: '',
          createdAt: '2026-03-01T14:20:00Z',
          verifyStatus: 'idle',
          verifyMessage: '',
        },
      ];
    } finally {
      loading.value = false;
    }
  }

  async function addAccount(data: Record<string, any>) {
    const res: any = await wechatAccountApi.create(data as any);
    if (res.success) {
      await fetchAccounts();
    }
    return res;
  }

  async function updateAccount(id: string, data: Record<string, any>) {
    const res: any = await wechatAccountApi.update(id, data);
    if (res.success) {
      await fetchAccounts();
    }
    return res;
  }

  async function removeAccount(id: string) {
    await wechatAccountApi.delete(id);
    await fetchAccounts();
  }

  async function syncAccount(id: string) {
    const res: any = await wechatAccountApi.sync(id);
    await fetchAccounts();
    return res;
  }

  async function verifyAccount(id: string) {
    verifyLoadingMap.value = { ...verifyLoadingMap.value, [id]: true };
    const target = accounts.value.find((a) => a.id === id);
    if (target) {
      target.verifyStatus = 'verifying';
      target.verifyMessage = '验证中...';
    }

    try {
      const res: any = await wechatAccountApi.testConnection(id);
      if (target) {
        target.verifyStatus = 'success';
        target.verifyMessage = '连接正常';
      }
      return res;
    } catch {
      if (target) {
        target.verifyStatus = 'error';
        target.verifyMessage = '连接失败';
      }
      throw new Error('连接验证失败');
    } finally {
      verifyLoadingMap.value = { ...verifyLoadingMap.value, [id]: false };
    }
  }

  function setCurrentAccountId(id: string) {
    currentAccountId.value = id;
  }

  return {
    accounts,
    loading,
    currentAccountId,
    verifyLoadingMap,
    activeAccounts,
    currentAccount,
    accountById,
    fetchAccounts,
    addAccount,
    updateAccount,
    removeAccount,
    syncAccount,
    verifyAccount,
    setCurrentAccountId,
  };
});
