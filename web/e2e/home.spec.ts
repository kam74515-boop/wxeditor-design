import { test, expect } from '@playwright/test';

test.describe('首页渲染', () => {
  test('应正确渲染首页各区域', async ({ page }) => {
    await page.goto('/');

    // 页面标题
    await expect(page).toHaveTitle(/首页|微信文章编辑器/);

    // 导航栏
    const nav = page.locator('.topnav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('.topnav__logo')).toContainText('WxEditor');

    // 导航链接（未登录状态）
    await expect(nav.locator('a.topnav__item:has-text("登录")')).toBeVisible();
    await expect(nav.locator('a.topnav__badge:has-text("免费注册")')).toBeVisible();

    // Hero 区域
    await expect(page.locator('.hero-section')).toBeVisible();
    await expect(page.locator('.hero-title')).toContainText('微信公众号');
    await expect(page.locator('.hero-title')).toContainText('图文排版编辑器');

    // 功能特性区域
    await expect(page.locator('#features')).toBeVisible();
    await expect(page.locator('.features-section .section-title')).toContainText('为公众号创作者量身定制');

    // 定价区域
    await expect(page.locator('#pricing')).toBeVisible();
    await expect(page.locator('.pricing-section .section-title')).toContainText('选择适合你的方案');

    // 页脚
    await expect(page.locator('.home-footer')).toBeVisible();
    await expect(page.locator('.footer-logo')).toContainText('WxEditor');
  });
});
