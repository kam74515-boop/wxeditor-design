import http from '@/utils/http';
import type { ApiResponse, Project, Article, UploadResult, User, Template, Team, ScheduledPost } from '@/types';

// ==================== Auth APIs ====================
export const authApi = {
  login: (data: { username: string; password: string }) =>
    http.post<ApiResponse<{ user: User; token: string; refreshToken?: string }>>('/auth/login', data),

  register: (data: { username: string; email: string; password: string; passwordConfirm: string }) =>
    http.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data),

  logout: () =>
    http.post<ApiResponse<null>>('/auth/logout'),

  getProfile: () =>
    http.get<ApiResponse<User>>('/auth/me'),

  updateProfile: (data: Partial<User>) =>
    http.put<ApiResponse<User>>('/auth/profile', data),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    http.post<ApiResponse<null>>('/auth/change-password', data),

  refreshToken: (refreshToken: string) =>
    http.post<ApiResponse<{ token: string; refreshToken: string }>>('/auth/refresh', { refreshToken }),
};

// ==================== Document / Project APIs ====================
export const documentApi = {
  getList: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    http.get<ApiResponse<{ list: any[]; total: number }>>('/collab/documents', { params }),

  getDetail: (id: string) =>
    http.get<ApiResponse<any>>(`/collab/documents/${id}`),

  create: (data: { title: string; content?: string }) =>
    http.post<ApiResponse<any>>('/collab/documents', data),

  update: (id: string, data: { title?: string; content?: string; summary?: string; cover_image?: string }) =>
    http.put<ApiResponse<any>>(`/collab/documents/${id}`, data),

  delete: (id: string) =>
    http.delete<ApiResponse<null>>(`/collab/documents/${id}`),

  getRecent: (limit: number = 5) =>
    http.get<ApiResponse<any[]>>('/collab/documents/recent', { params: { limit } }),

  getStats: () =>
    http.get<ApiResponse<{ totalDocs: number; totalWords: number; publishedCount: number; draftCount: number }>>('/collab/documents/stats'),
};

// Keep projectApi as alias for backward compatibility
export const projectApi = {
  getList: (params?: { status?: string; page?: number; size?: number }) =>
    http.get<ApiResponse<{ list: Project[]; total: number }>>('/projects', { params }),

  getDetail: (id: string) =>
    http.get<ApiResponse<Project>>(`/projects/${id}`),

  create: (data: Partial<Project>) =>
    http.post<ApiResponse<Project>>('/projects', data),

  update: (id: string, data: Partial<Project>) =>
    http.put<ApiResponse<Project>>(`/projects/${id}`, data),

  delete: (id: string) =>
    http.delete<ApiResponse<null>>(`/projects/${id}`),
};

// ==================== Article APIs ====================
export const articleApi = {
  getContent: (projectId: string) =>
    http.get<ApiResponse<Article>>(`/articles/${projectId}`),

  save: (projectId: string, data: Partial<Article>) =>
    http.post<ApiResponse<Article>>(`/articles/${projectId}`, data),

  publish: (projectId: string) =>
    http.post<ApiResponse<{ html: string; wechatHtml: string }>>(`/articles/${projectId}/publish`),

  preview: (projectId: string) =>
    http.get<ApiResponse<{ html: string }>>(`/articles/${projectId}/preview`),
};

// ==================== AI APIs ====================
export const aiApi = {
  chat: (message: string, context?: { projectId?: string }) =>
    http.post<ApiResponse<{ content: string; code?: string }>>('/ai/chat', { message, context }),

  generateComponent: (type: string, params: Record<string, any>) =>
    http.post<ApiResponse<{ html: string; preview: string }>>('/ai/generate-component', { type, params }),

  optimizeContent: (content: string, type: 'rewrite' | 'summarize' | 'expand') =>
    http.post<ApiResponse<{ content: string }>>('/ai/optimize', { content, type }),

  getHistory: (documentId: string, limit: number = 50) =>
    http.get<ApiResponse<any[]>>(`/ai/history/${documentId}`, { params: { limit } }),
};

/**
 * 流式 SSE 聊天函数
 * 使用原生 fetch + ReadableStream 读取 SSE 事件流
 * @param url 请求地址
 * @param body 请求体
 * @param onEvent SSE 事件回调 (event, data)
 * @param signal AbortSignal 用于取消
 */
export function streamChat(
  url: string,
  body: Record<string, any>,
  onEvent: (event: string, data: any) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ') && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(currentEvent, data);
          } catch {
            // ignore parse errors for incomplete data
          }
          currentEvent = '';
        } else if (line.trim() === '' && currentEvent) {
          // empty line resets event
          currentEvent = '';
        }
      }
    }
  });
}

// ==================== Template APIs ====================
export const templateApi = {
  getList: (params?: { page?: number; limit?: number; category?: string; search?: string }) =>
    http.get<ApiResponse<{ list: Template[]; total: number }>>('/templates', { params }),

  getDetail: (id: number) =>
    http.get<ApiResponse<Template>>(`/templates/${id}`),

  create: (data: Partial<Template>) =>
    http.post<ApiResponse<Template>>('/templates', data),

  update: (id: number, data: Partial<Template>) =>
    http.put<ApiResponse<Template>>(`/templates/${id}`, data),

  delete: (id: number) =>
    http.delete<ApiResponse<null>>(`/templates/${id}`),

  getCategories: () =>
    http.get<ApiResponse<string[]>>('/templates/categories'),

  applyToProject: (templateId: number, projectId: string) =>
    http.post<ApiResponse<any>>(`/templates/${templateId}/apply`, { projectId }),
};

// ==================== Material / Upload APIs ====================
export const materialApi = {
  getList: (params?: { page?: number; limit?: number; type?: string }) =>
    http.get<ApiResponse<{ list: any[]; total: number }>>('/materials', { params }),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload<ApiResponse<UploadResult>>('/materials/upload', formData);
  },

  delete: (id: string) =>
    http.delete<ApiResponse<null>>(`/materials/${id}`),

  getCategories: () =>
    http.get<ApiResponse<string[]>>('/materials/categories'),
};

// Keep uploadApi for backward compatibility
export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload<ApiResponse<UploadResult>>('/upload/image', formData);
  },

  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload<ApiResponse<UploadResult>>('/upload/cover', formData);
  },
};

// ==================== Membership APIs ====================
export const membershipApi = {
  getPlans: () =>
    http.get<ApiResponse<any[]>>('/membership/plans'),

  getCurrentPlan: () =>
    http.get<ApiResponse<any>>('/membership/current'),

  subscribe: (planId: string) =>
    http.post<ApiResponse<any>>('/membership/subscribe', { planId }),

  cancelSubscription: () =>
    http.post<ApiResponse<null>>('/membership/cancel'),

  getOrders: (params?: { page?: number; limit?: number }) =>
    http.get<ApiResponse<any[]>>('/membership/orders', { params }),

  createCheckout: (data: { planId: string; paymentMethod?: string }) =>
    http.post<ApiResponse<{ checkoutUrl: string }>>('/membership/checkout', data),
};

// ==================== Team APIs ====================
export const teamApi = {
  getList: () =>
    http.get<ApiResponse<Team[]>>('/teams'),

  getDetail: (id: number) =>
    http.get<ApiResponse<Team>>(`/teams/${id}`),

  create: (data: { name: string; description?: string }) =>
    http.post<ApiResponse<Team>>('/teams', data),

  update: (id: number, data: Partial<Team>) =>
    http.put<ApiResponse<Team>>(`/teams/${id}`, data),

  delete: (id: number) =>
    http.delete<ApiResponse<null>>(`/teams/${id}`),

  getMembers: (teamId: number) =>
    http.get<ApiResponse<any[]>>(`/teams/${teamId}/members`),

  addMember: (teamId: number, data: { userId: string; role?: string }) =>
    http.post<ApiResponse<any>>(`/teams/${teamId}/members`, data),

  removeMember: (teamId: number, userId: string) =>
    http.delete<ApiResponse<null>>(`/teams/${teamId}/members/${userId}`),

  getInvitations: () =>
    http.get<ApiResponse<any[]>>('/teams/invitations'),

  acceptInvitation: (invitationId: string) =>
    http.post<ApiResponse<null>>(`/teams/invitations/${invitationId}/accept`),

  declineInvitation: (invitationId: string) =>
    http.post<ApiResponse<null>>(`/teams/invitations/${invitationId}/decline`),
};

// ==================== Admin APIs ====================
export const adminApi = {
  getDashboardStats: () =>
    http.get<ApiResponse<any>>('/admin/dashboard'),

  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    http.get<ApiResponse<{ list: any[]; total: number }>>('/admin/users', { params }),

  updateUser: (id: string, data: Partial<User>) =>
    http.put<ApiResponse<User>>(`/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    http.delete<ApiResponse<null>>(`/admin/users/${id}`),

  getMembershipStats: () =>
    http.get<ApiResponse<any>>('/admin/membership'),

  getProducts: (params?: { page?: number; limit?: number }) =>
    http.get<ApiResponse<{ list: any[]; total: number }>>('/admin/products', { params }),

  createProduct: (data: any) =>
    http.post<ApiResponse<any>>('/admin/products', data),

  updateProduct: (id: string, data: any) =>
    http.put<ApiResponse<any>>(`/admin/products/${id}`, data),

  deleteProduct: (id: string) =>
    http.delete<ApiResponse<null>>(`/admin/products/${id}`),

  getContentReviews: (params?: { page?: number; limit?: number; status?: string }) =>
    http.get<ApiResponse<{ list: any[]; total: number }>>('/admin/content', { params }),

  reviewContent: (id: string, data: { action: 'approve' | 'reject'; reason?: string }) =>
    http.post<ApiResponse<null>>(`/admin/content/${id}/review`, data),

  getAIConfig: () =>
    http.get<ApiResponse<any>>('/admin/ai-config'),

  updateAIConfig: (data: any) =>
    http.put<ApiResponse<null>>('/admin/ai-config', data),

  getAnalytics: (params?: { range?: string }) =>
    http.get<ApiResponse<any>>('/admin/analytics', { params }),

  getSettings: () =>
    http.get<ApiResponse<any>>('/admin/settings'),

  updateSettings: (data: any) =>
    http.put<ApiResponse<null>>('/admin/settings', data),
};

// ==================== Wechat Account APIs ====================
export const wechatAccountApi = {
  getList: () =>
    http.get<ApiResponse<{ list: any[] }>>('/wechat-accounts'),

  getDetail: (id: string) =>
    http.get<ApiResponse<any>>(`/wechat-accounts/${id}`),

  create: (data: {
    name: string;
    wechatId?: string;
    type?: string;
    appId: string;
    appSecret: string;
    token?: string;
    encodingAesKey?: string;
    avatar?: string;
    isDefault?: boolean;
  }) =>
    http.post<ApiResponse<any>>('/wechat-accounts', data),

  update: (id: string, data: Record<string, any>) =>
    http.put<ApiResponse<any>>(`/wechat-accounts/${id}`, data),

  delete: (id: string) =>
    http.delete<ApiResponse<null>>(`/wechat-accounts/${id}`),

  sync: (id: string) =>
    http.post<ApiResponse<any>>(`/wechat-accounts/${id}/sync`),

  testConnection: (id: string) =>
    http.post<ApiResponse<any>>(`/wechat-accounts/${id}/test`),

  verify: (id: string) =>
    http.post<ApiResponse<any>>(`/wechat-accounts/${id}/verify`),

  getApiUsage: (id: string) =>
    http.get<ApiResponse<{ totalCalls: number; remainingCalls: number; resetAt: string }>>(`/wechat-accounts/${id}/api-usage`),
};

// ==================== Settings APIs ====================
export const settingsApi = {
  getSettings: () =>
    http.get<ApiResponse<any>>('/settings'),

  updateSettings: (data: any) =>
    http.put<ApiResponse<null>>('/settings', data),

  getNotificationPreferences: () =>
    http.get<ApiResponse<any>>('/settings/notifications'),

  updateNotificationPreferences: (data: any) =>
    http.put<ApiResponse<null>>('/settings/notifications', data),
};

// ==================== Scheduled Post APIs ====================
export const scheduledPostApi = {
  getList: (params?: { page?: number; limit?: number; status?: string }) =>
    http.get<ApiResponse<{ list: ScheduledPost[]; total: number }>>('/scheduled-posts', { params }),

  getDetail: (id: string) =>
    http.get<ApiResponse<ScheduledPost>>(`/scheduled-posts/${id}`),

  create: (data: {
    accountId: string;
    documentId?: string;
    title: string;
    content?: string;
    scheduledAt: string;
    digest?: string;
    coverUrl?: string;
    thumbMediaId?: string;
  }) => http.post<ApiResponse<ScheduledPost>>('/scheduled-posts', data),

  update: (id: string, data: Partial<ScheduledPost>) =>
    http.put<ApiResponse<ScheduledPost>>(`/scheduled-posts/${id}`, data),

  delete: (id: string) =>
    http.delete<ApiResponse<null>>(`/scheduled-posts/${id}`),

  cancel: (id: string) =>
    http.post<ApiResponse<null>>(`/scheduled-posts/${id}/cancel`),
};

// ==================== Comment APIs ====================
export const commentApi = {
  getByDocument: (docId: string) =>
    http.get<ApiResponse<any[]>>(`/comments/document/${docId}`),
  create: (data: { document_id: string; content: string; parent_id?: number }) =>
    http.post<ApiResponse<any>>('/comments', data),
  update: (id: number, data: { content?: string; status?: string }) =>
    http.put<ApiResponse<any>>(`/comments/${id}`, data),
  delete: (id: number) =>
    http.delete<ApiResponse<null>>(`/comments/${id}`),
};

// ==================== Article Batch APIs ====================
export const articleBatchApi = {
  getList: (params?: { page?: number; limit?: number; status?: string }) =>
    http.get<ApiResponse<{ list: any[]; total: number }>>('/article-batches', { params }),
  getDetail: (id: string) =>
    http.get<ApiResponse<any>>(`/article-batches/${id}`),
  create: (data: { title: string; account_id?: number; articles?: any[] }) =>
    http.post<ApiResponse<any>>('/article-batches', data),
  update: (id: string, data: { title?: string; status?: string; account_id?: number }) =>
    http.put<ApiResponse<any>>(`/article-batches/${id}`, data),
  delete: (id: string) =>
    http.delete<ApiResponse<null>>(`/article-batches/${id}`),
  addArticle: (batchId: string, data: { title: string; content?: string; cover_image?: string; digest?: string; author?: string }) =>
    http.post<ApiResponse<any>>(`/article-batches/${batchId}/articles`, data),
  updateArticle: (batchId: string, articleId: string, data: any) =>
    http.put<ApiResponse<any>>(`/article-batches/${batchId}/articles/${articleId}`, data),
  deleteArticle: (batchId: string, articleId: string) =>
    http.delete<ApiResponse<null>>(`/article-batches/${batchId}/articles/${articleId}`),
  reorder: (batchId: string, orderedIds: number[]) =>
    http.put<ApiResponse<any>>(`/article-batches/${batchId}/reorder`, { orderedIds }),
  publish: (id: string) =>
    http.post<ApiResponse<any>>(`/article-batches/${id}/publish`),
};
