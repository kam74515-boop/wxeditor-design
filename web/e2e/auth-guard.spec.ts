import { test, expect } from '@playwright/test';

test.describe('认证路由守卫', () => {
  // 所有受保护路由均应重定向到 /login
  const protectedRoutes = [
    { path: '/dashboard', name: '仪表盘' },
    { path: '/projects', name: '项目管理' },
    { path: '/editor', name: '编辑器' },
    { path: '/templates', name: '模板库' },
    { path: '/materials', name: '素材库' },
    { path: '/ai-writing', name: 'AI 写作' },
    { path: '/profile', name: '个人中心' },
    { path: '/settings', name: '设置' },
    { path: '/teams', name: '团队' },
    { path: '/wechat-accounts', name: '公众号管理' },
    { path: '/membership', name: '会员' },
    { path: '/scheduled-posts', name: '定时发布' },
  ];

  // 确保无 token 再测试
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
  });

  for (const route of protectedRoutes) {
    test(`未登录访问 ${route.path}（${route.name}）应重定向到 /login`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  }

  test('重定向时应携带 redirect 参数', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/redirect=\/dashboard/);
  });

  test('重定向到 /projects 时也应携带 redirect 参数', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/redirect=\/projects/);
  });
});

test.describe('公开路由（无需登录）', () => {
  const publicRoutes = [
    { path: '/', title: /首页|微信文章编辑器/ },
    { path: '/login', title: /登录|微信文章编辑器/ },
    { path: '/register', title: /注册|微信文章编辑器/ },
    { path: '/pricing', title: /定价|微信文章编辑器/ },
  ];

  for (const route of publicRoutes) {
    test(`${route.path} 可直接访问`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveTitle(route.title);
    });
  }
});
