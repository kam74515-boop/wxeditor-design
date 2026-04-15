import { test, expect } from '@playwright/test';

test.describe('认证流程', () => {
  test.describe('登录页', () => {
    test('页面应显示完整登录表单', async ({ page }) => {
      await page.goto('/login');

      // 品牌区
      await expect(page.locator('.auth-hero')).toBeVisible();
      await expect(page.locator('.brand h2')).toContainText('WeChat Editor');

      // 表单标题
      await expect(page.locator('.auth-title')).toContainText('欢迎回来');
      await expect(page.locator('.auth-subtitle')).toContainText('请登录');

      // 输入字段标签
      await expect(page.locator('.input-group label').nth(0)).toContainText('用户名或邮箱');
      await expect(page.locator('.input-group label').nth(1)).toContainText('密码');

      // 登录按钮
      const submitBtn = page.locator('.submit-btn');
      await expect(submitBtn).toBeVisible();
      await expect(submitBtn).toContainText('登录');

      // 微信登录按钮
      await expect(page.locator('.wechat-btn')).toContainText('微信扫码登录');

      // 切换到注册页链接
      await expect(page.locator('.switch-link a')).toHaveAttribute('href', '/register');
      await expect(page.locator('.switch-link')).toContainText('立即注册');
    });

    test('空表单提交应停留在登录页', async ({ page }) => {
      await page.goto('/login');

      // 直接点击登录按钮（不填写任何内容）
      await page.locator('.submit-btn').click();

      // 应仍在登录页（前端校验阻止提交）
      await expect(page).toHaveURL(/\/login/);
    });

    test('无效凭证应显示错误提示（后端不可用时）', async ({ page }) => {
      await page.goto('/login');

      // 填写无效凭证
      await page.locator('input').first().fill('invalid_user');
      await page.locator('input[type="password"]').fill('wrong_password');

      // 提交 —— 在无后端时会收到 network error
      await page.locator('.submit-btn').click();

      // 等待错误提示出现（后端不可用 → axios 抛错 → generalError）
      await expect(page.locator('.auth-error-hint')).toBeVisible({ timeout: 15_000 });
    });

    test('切换到注册页面', async ({ page }) => {
      await page.goto('/login');

      await page.locator('.switch-link a').click();
      await expect(page).toHaveURL(/\/register/);
      await expect(page.locator('.auth-title')).toContainText('创建账号');
    });
  });

  test.describe('注册页', () => {
    test('页面应显示完整注册表单', async ({ page }) => {
      await page.goto('/register');

      // 表单标题
      await expect(page.locator('.auth-title')).toContainText('创建账号');
      await expect(page.locator('.auth-subtitle')).toContainText('免费注册');

      // 输入字段
      const labels = page.locator('.input-group label');
      await expect(labels.nth(0)).toContainText('用户名');
      await expect(labels.nth(1)).toContainText('邮箱');
      await expect(labels.nth(2)).toContainText('密码');
      await expect(labels.nth(3)).toContainText('确认密码');

      // 注册按钮
      await expect(page.locator('.submit-btn')).toContainText('立即注册');

      // 切换到登录页链接
      await expect(page.locator('.switch-link a')).toHaveAttribute('href', '/login');
    });

    test('切换回登录页面', async ({ page }) => {
      await page.goto('/register');

      await page.locator('.switch-link a').click();
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('.auth-title')).toContainText('欢迎回来');
    });
  });
});
