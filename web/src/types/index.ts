// 全局类型定义

export type DateValue = string | Date;

// UEditor 类型
export interface UEditorConfig {
  serverUrl: string;
  initialFrameWidth?: number | string;
  initialFrameHeight?: number;
  initialContent?: string;
  focus?: boolean;
  toolbars?: string[][];
}

export interface UEditorInstance {
  ready: (callback: () => void) => void;
  getContent: () => string;
  getContentTxt: () => string;
  setContent: (content: string, isAppend?: boolean) => void;
  getPlainTxt: () => string;
  hasContents: () => boolean;
  focus: () => void;
  blur: () => void;
  isFocus: () => boolean;
  execCommand: (cmd: string, ...args: any[]) => void;
  fireEvent: (eventName: string, ...args: any[]) => void;
  addListener: (event: string, callback: (...args: any[]) => void) => void;
  destroy: () => void;
  document?: Document;
  window?: Window;
  iframe?: HTMLIFrameElement;
  selection: {
    getRange: () => any;
    getStart: () => any;
  };
}

// 文章类型
export interface Article {
  id?: string;
  title: string;
  content: string;
  author?: string;
  digest?: string;
  summary?: string;
  coverImage?: string;
  tags?: string[];
  word_count?: number;
  contentSourceUrl?: string;
  showCoverPic?: number;
  needOpenComment?: number;
  onlyFansCanComment?: number;
  createTime?: string;
  updateTime?: string;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  code?: number;
}

// 用户会话
export interface UserSession {
  sessionId: string;
  loginTime: string;
  accountInfo?: {
    name: string;
    avatar: string;
  };
}

// 上传结果
export interface UploadResult {
  state: string;
  url: string;
  title: string;
  original: string;
  type: string;
  size: number;
}

// 微信 HTML 过滤选项
export interface WechatFilterOptions {
  allowTags?: string[];
  allowAttributes?: Record<string, string[]>;
  allowStyles?: Record<string, RegExp[]>;
}


// 用户类型
export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  role: 'user' | 'vip' | 'admin' | 'superadmin';
  bio?: string;
  phone?: string;
  membership?: {
    type: 'free' | 'basic' | 'pro' | 'enterprise';
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    daysLeft?: number;
  };
  limits?: {
    documents: number;
    storage: number;
    collaborators: number;
    apiCalls: number;
  };
  settings?: Record<string, any>;
}

// 项目类型
export interface Project {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived' | 'deleted';
  summary?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  visibility?: 'private' | 'public' | 'members_only' | 'vip_only';
  wordCount?: number;
  version?: number;
  author?: Pick<User, 'id' | 'username' | 'nickname' | 'avatar'>;
  createdAt: DateValue;
  updatedAt: DateValue;
  publishedAt?: DateValue;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: number;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: number;
  name: string;
  description?: string;
  category: string;
  content: string;
  previewImage?: string;
  tags?: string[];
  isPublic: boolean;
  useCount: number;
  authorId?: number;
  createdAt: string;
}

// 定时发布类型
export interface ScheduledPost {
  id: string;
  accountId: string;
  accountName?: string;
  documentId?: string;
  documentTitle?: string;
  title: string;
  content?: string;
  scheduledAt: string;
  status: 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled';
  errorMsg?: string;
  mediaId?: string;
  thumbMediaId?: string;
  digest?: string;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// 聊天消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;  // 思维链内容
  timestamp: Date;
  code?: string;
}
