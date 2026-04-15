/**
 * E2E 测试数据常量
 */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  EDITOR: '/editor',
  PROJECTS: '/projects',
  TEMPLATES: '/templates',
  MATERIALS: '/materials',
  AI_WRITING: '/ai-writing',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  TEAMS: '/teams',
  WECHAT_ACCOUNTS: '/wechat-accounts',
  PRICING: '/pricing',
  MEMBERSHIP: '/membership',
  ADMIN: '/admin',
} as const;

export const TEST_USER = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Test123456!',
  invalidUsername: 'nonexistent_user',
  invalidPassword: 'wrong_password_123',
} as const;

export const TIMEOUTS = {
  /** 导航超时（毫秒） */
  NAVIGATION: 10_000,
  /** 短等待（动画等） */
  SHORT: 300,
  /** 中等等待 */
  MEDIUM: 1_000,
} as const;
