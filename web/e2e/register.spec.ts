import { test, expect } from '@playwright/test';

test.describe('注册页渲染', () => {
  test('应正确渲染注册表单和品牌区域', async ({ page }) => {
    await page.goto('/register');

    // 页面标题
    await expect(page).toHaveTitle(/注册|微信文章编辑器/);

    // 品牌区
    await expect(page.locator('.auth-hero')).toBeVisible();
    await expect(page.locator('.brand h2')).toContainText('WeChat Editor');

    // 表单区标题
    await expect(page.locator('.auth-title')).toContainText('创建账号');
    await expect(page.locator('.auth-subtitle')).toContainText('免费注册');

    // 表单字段标签
    const labels = page.locator('.input-group label');
    await expect(labels.nth(0)).toContainText('用户名');
    await expect(labels.nth(1)).toContainText('邮箱');
    await expect(labels.nth(2)).toContainText('密码');
    await expect(labels.nth(3)).toContainText('确认密码');

    // 提交按钮
    const submitBtn = page.locator('.submit-btn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('立即注册');

    // 切换到登录页链接
    await expect(page.locator('.switch-link a')).toHaveAttribute('href', '/login');
    await expect(page.locator('.switch-link')).toContainText('直接登录');
  });
});
