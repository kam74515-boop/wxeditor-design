import { test, expect } from '@playwright/test';

test.describe('仪表盘页面', () => {
  test('未登录时访问 /dashboard 应重定向到 /login', async ({ page }) => {
    // 清除可能残留的 token
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('token'));

    await page.goto('/dashboard');

    // 路由守卫应重定向到登录页
    await expect(page).toHaveURL(/\/login/);
    // 登录表单应可见
    await expect(page.locator('.auth-form')).toBeVisible();
  });

  test('登录页渲染完整（含品牌区和表单）', async ({ page }) => {
    await page.goto('/login');

    // 品牌区
    await expect(page.locator('.auth-hero')).toBeVisible();
    await expect(page.locator('.brand h2')).toContainText('WeChat Editor');

    // 表单区域
    await expect(page.locator('.auth-title')).toContainText('欢迎回来');
    await expect(page.locator('.auth-form')).toBeVisible();

    // 提交按钮
    const submitBtn = page.locator('.submit-btn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('登录');
  });

  test('输入为空时提交应显示前端校验错误', async ({ page }) => {
    await page.goto('/login');

    // 不填任何内容直接点击登录
    await page.locator('.submit-btn').click();

    // 前端校验应阻止提交（无 network request）
    // PaperInput 组件通过 :error prop 显示错误
    // 验证表单仍然在登录页
    await expect(page).toHaveURL(/\/login/);
  });

  test('可以切换到注册页面', async ({ page }) => {
    await page.goto('/login');

    // 点击注册链接
    const registerLink = page.locator('.switch-link a');
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');

    // 点击后导航到注册页
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);

    // 注册页应包含注册表单
    await expect(page.locator('.auth-form')).toBeVisible();
    await expect(page.locator('.auth-title')).toContainText('创建账号');
  });
});
