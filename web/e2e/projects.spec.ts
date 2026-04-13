import { test, expect } from '@playwright/test';
import { injectAuth, clearAuth } from './fixtures/auth';

test.describe('项目管理页面', () => {
  test.afterEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('未登录时访问 /projects 应重定向到 /login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('token'));

    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);
  });

  test('已登录时应渲染项目管理布局', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/projects');

    // 页面容器
    await expect(page.locator('.projects-layout')).toBeVisible();

    // 左侧侧栏
    await expect(page.locator('.sidebar-card')).toBeVisible();
    await expect(page.locator('.sidebar-card .brand h2')).toContainText('项目管理');

    // 侧栏导航菜单
    const navItems = page.locator('.sidebar-card .nav-item');
    await expect(navItems).toHaveCount(3);
    await expect(navItems.nth(0)).toContainText('全部项目');
    await expect(navItems.nth(1)).toContainText('最近使用');
    await expect(navItems.nth(2)).toContainText('已归档');

    // "全部项目" 默认高亮
    await expect(navItems.nth(0)).toHaveClass(/active/);

    // 新建项目按钮（侧栏底部）
    await expect(page.locator('.new-project-btn')).toContainText('新建项目');

    // 右侧主内容区
    await expect(page.locator('.main-card')).toBeVisible();
  });

  test('搜索框应可见并接受输入', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/projects');

    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', '搜索项目标题...');

    await searchInput.fill('测试搜索');
    await expect(searchInput).toHaveValue('测试搜索');
  });

  test('侧栏导航筛选切换', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/projects');

    const navItems = page.locator('.sidebar-card .nav-item');

    // 点击"已归档"
    await navItems.nth(2).click();
    await expect(navItems.nth(2)).toHaveClass(/active/);
    // 标题应变化
    await expect(page.locator('.page-title')).toContainText('已归档');

    // 点击"最近使用"
    await navItems.nth(1).click();
    await expect(navItems.nth(1)).toHaveClass(/active/);
    await expect(page.locator('.page-title')).toContainText('最近使用');
  });

  test('后端不可用时应显示空状态或加载完毕', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/projects');

    // 等加载完毕（骨架屏消失）
    const emptyState = page.locator('.empty-state');
    const projectList = page.locator('.project-list:not(:has(.el-skeleton))');

    // 二者至少一个出现
    await expect(
      emptyState.or(projectList),
    ).toBeVisible({ timeout: 15_000 });
  });
});
