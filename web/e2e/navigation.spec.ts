import { test, expect } from '@playwright/test';

test.describe('首页导航栏', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('导航栏包含 Logo 和关键链接', async ({ page }) => {
    const nav = page.locator('.topnav');

    // Logo
    await expect(nav.locator('.topnav__logo')).toBeVisible();
    await expect(nav.locator('.topnav__logo')).toContainText('WxEditor');

    // 功能 / 流程 / 定价锚点链接
    await expect(nav.locator('a:has-text("功能")')).toBeVisible();
    await expect(nav.locator('a:has-text("流程")')).toBeVisible();
    await expect(nav.locator('a:has-text("定价")')).toBeVisible();
  });

  test('未登录时显示登录和注册按钮', async ({ page }) => {
    const nav = page.locator('.topnav');

    // 登录链接
    const loginLink = nav.locator('a.topnav__item:has-text("登录")');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');

    // 注册按钮
    const registerBtn = nav.locator('a.topnav__badge:has-text("免费注册")');
    await expect(registerBtn).toBeVisible();
    await expect(registerBtn).toHaveAttribute('href', '/register');
  });

  test('导航栏滚动后出现阴影效果', async ({ page }) => {
    const nav = page.locator('.topnav');

    // 初始状态无阴影
    await expect(nav).not.toHaveClass(/topnav--scrolled/);

    // 先确保页面有足够高度（在 body 尾部追加空白占位），再滚动
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.height = '2000px';
      document.body.appendChild(spacer);
    });
    await page.evaluate(() => window.scrollTo(0, 100));
    // 等待 Vue 的 onMounted scroll listener 响应
    await page.waitForTimeout(500);

    await expect(nav).toHaveClass(/topnav--scrolled/);
  });
});
