import { test, expect } from '@playwright/test';
import { injectAuth, clearAuth } from './fixtures/auth';

test.describe('仪表盘布局（DashboardLayout）', () => {
  test.afterEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('顶部导航栏应显示 Logo 和已登录用户信息', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');

    // 等待 DashboardLayout 异步加载完成
    const nav = page.locator('.dashboard-layout .topnav');
    await expect(nav).toBeVisible({ timeout: 15_000 });

    // Logo
    await expect(nav.locator('.topnav__logo')).toContainText('WxEditor');

    // 用户名（来自注入的 localStorage user）
    await expect(nav.locator('.topnav__username')).toContainText('E2E 测试用户');
  });

  test('顶部导航栏包含关键链接', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');

    await page.waitForSelector('.dashboard-layout .topnav', { timeout: 15_000 });

    const navItems = page.locator('.dashboard-layout .topnav .topnav__item');
    const labels = await navItems.allTextContents();
    expect(labels.some((l) => l.includes('项目'))).toBeTruthy();
    expect(labels.some((l) => l.includes('编辑器'))).toBeTruthy();
  });

  test('侧边栏应显示分组导航', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');

    await page.waitForSelector('.dashboard-layout .sidebar', { timeout: 15_000 });

    const sidebar = page.locator('.dashboard-layout .sidebar');
    await expect(sidebar).toBeVisible();

    // 侧边栏项 — 验证关键链接存在
    await expect(sidebar.locator('.sidebar__item:has-text("文档管理")')).toBeVisible();
    await expect(sidebar.locator('.sidebar__item:has-text("素材库")')).toBeVisible();
    await expect(sidebar.locator('.sidebar__item:has-text("团队")')).toBeVisible();
    await expect(sidebar.locator('.sidebar__item:has-text("设置")')).toBeVisible();
  });

  test('侧边栏底部应有新建文档按钮', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');

    await page.waitForSelector('.dashboard-layout', { timeout: 15_000 });

    const btn = page.locator('.dashboard-layout .sidebar__action:has-text("新建文档")');
    await expect(btn).toBeVisible();
  });

  test('用户下拉菜单可打开并显示操作项', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');

    await page.waitForSelector('.dashboard-layout .topnav__avatar-wrap', { timeout: 15_000 });

    // 点击头像区域展开下拉菜单
    const avatarWrap = page.locator('.dashboard-layout .topnav__avatar-wrap');
    await avatarWrap.click();

    // 下拉菜单项
    const dropdown = page.locator('.el-dropdown-menu:visible');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('li:has-text("个人中心")')).toBeVisible();
    await expect(dropdown.locator('li:has-text("设置")')).toBeVisible();
    await expect(dropdown.locator('li:has-text("退出登录")')).toBeVisible();
  });

  test('已登录访问 /login 应重定向到 /projects', async ({ page }) => {
    await injectAuth(page);
    // guestOnly 路由 — 已登录用户应被重定向
    await page.goto('/login');
    await expect(page).toHaveURL(/\/projects/, { timeout: 15_000 });
  });

  test('已登录访问 /register 应重定向到 /projects', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/register');
    await expect(page).toHaveURL(/\/projects/, { timeout: 15_000 });
  });
});

test.describe('仪表盘首页（DashboardHomeView）', () => {
  test.afterEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('应显示欢迎横幅', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');

    await page.waitForSelector('.dashboard-layout .welcome-banner', { timeout: 15_000 });

    await expect(page.locator('.welcome-title')).toContainText('你好');
    await expect(page.locator('.welcome-desc')).toContainText('创作');
  });

  test('欢迎横幅包含"新建文档"和"AI 生成"按钮', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');

    await page.waitForSelector('.dashboard-layout .welcome-banner', { timeout: 15_000 });

    await expect(page.locator('.dashboard-layout .action-btn.primary:has-text("新建文档")')).toBeVisible();
    await expect(page.locator('.dashboard-layout .action-btn.secondary:has-text("AI 生成")')).toBeVisible();
  });

  test('应显示统计卡片行', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');

    await page.waitForSelector('.dashboard-layout .stats-row', { timeout: 15_000 });

    const cards = page.locator('.dashboard-layout .stat-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('最近文档区域应显示（空状态或列表）', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');

    await page.waitForSelector('.dashboard-layout', { timeout: 15_000 });

    // 等加载完毕（骨架屏消失后空状态或列表出现）
    const emptyState = page.locator('.dashboard-layout .doc-empty');
    const docList = page.locator('.dashboard-layout .doc-list');
    await expect(
      emptyState.or(docList),
    ).toBeVisible({ timeout: 15_000 });
  });
});
