import { test, expect } from '@playwright/test';

test.describe('认证保护', () => {
  test('未登录访问 /dashboard 应重定向到 /login', async ({ page }) => {
    // 确保没有 token
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('token'));

    // 访问受保护的路由
    await page.goto('/dashboard');

    // 应重定向到登录页，并携带 redirect 参数
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/redirect=\/dashboard/);

    // 登录页应该正常渲染
    await expect(page.locator('.auth-form')).toBeVisible();
  });

  test('未登录访问 /projects 应重定向到 /login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('token'));

    await page.goto('/projects');

    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/redirect=\/projects/);
  });

  test('未登录访问 /editor 应重定向到 /login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('token'));

    await page.goto('/editor');

    await expect(page).toHaveURL(/\/login/);
  });
});
