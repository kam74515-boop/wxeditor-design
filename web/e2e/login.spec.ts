import { test, expect } from '@playwright/test';

test.describe('登录页渲染', () => {
  test('应正确渲染登录表单和品牌区域', async ({ page }) => {
    await page.goto('/login');

    // 页面标题
    await expect(page).toHaveTitle(/登录|微信文章编辑器/);

    // 品牌区
    await expect(page.locator('.auth-hero')).toBeVisible();
    await expect(page.locator('.brand h2')).toContainText('WeChat Editor');

    // 表单区标题
    await expect(page.locator('.auth-title')).toContainText('欢迎回来');
    await expect(page.locator('.auth-subtitle')).toContainText('请登录');

    // 表单字段标签
    await expect(page.locator('.input-group label').nth(0)).toContainText('用户名或邮箱');
    await expect(page.locator('.input-group label').nth(1)).toContainText('密码');

    // 提交按钮
    const submitBtn = page.locator('.submit-btn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('登录');

    // 切换到注册页链接
    await expect(page.locator('.switch-link a')).toHaveAttribute('href', '/register');
    await expect(page.locator('.switch-link')).toContainText('立即注册');
  });
});
