import http from './http';
import type { ApiResponse, Project, Article, UploadResult } from '@/types';

// Project APIs
export const projectApi = {
  // 获取项目列表
  getList: (params?: { status?: string; page?: number; size?: number }) => {
    return http.get<ApiResponse<{ list: Project[]; total: number }>>('/projects', { params });
  },

  // 获取项目详情
  getDetail: (id: string) => {
    return http.get<ApiResponse<Project>>(`/projects/${id}`);
  },

  // 创建项目
  create: (data: Partial<Project>) => {
    return http.post<ApiResponse<Project>>('/projects', data);
  },

  // 更新项目
  update: (id: string, data: Partial<Project>) => {
    return http.put<ApiResponse<Project>>(`/projects/${id}`, data);
  },

  // 删除项目
  delete: (id: string) => {
    return http.delete<ApiResponse<null>>(`/projects/${id}`);
  },
};

// Article APIs
export const articleApi = {
  // 获取文章内容
  getContent: (projectId: string) => {
    return http.get<ApiResponse<Article>>(`/articles/${projectId}`);
  },

  // 保存文章
  save: (projectId: string, data: Partial<Article>) => {
    return http.post<ApiResponse<Article>>(`/articles/${projectId}`, data);
  },

  // 发布文章（生成微信适配版本）
  publish: (projectId: string) => {
    return http.post<ApiResponse<{ html: string; wechatHtml: string }>>(`/articles/${projectId}/publish`);
  },

  // 预览微信文章
  preview: (projectId: string) => {
    return http.get<ApiResponse<{ html: string }>>(`/articles/${projectId}/preview`);
  },
};

// Upload APIs
export const uploadApi = {
  // 上传图片
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload<ApiResponse<UploadResult>>('/upload/image', formData);
  },

  // 上传图文封面
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload<ApiResponse<UploadResult>>('/upload/cover', formData);
  },
};

// AI APIs
export const aiApi = {
  // 发送聊天消息
  chat: (message: string, context?: { projectId?: string }) => {
    return http.post<ApiResponse<{ content: string; code?: string }>>('/ai/chat', { message, context });
  },

  // 生成组件
  generateComponent: (type: string, params: Record<string, any>) => {
    return http.post<ApiResponse<{ html: string; preview: string }>>('/ai/generate-component', { type, params });
  },

  // 优化内容
  optimizeContent: (content: string, type: 'rewrite' | 'summarize' | 'expand') => {
    return http.post<ApiResponse<{ content: string }>>('/ai/optimize', { content, type });
  },
};