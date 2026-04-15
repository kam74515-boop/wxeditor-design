import { test, expect } from '@playwright/test';

test.describe('响应式布局', () => {
  test.describe('移动端视口 (375x812)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('首页 Hero 区域应可见', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.hero-section')).toBeVisible();
      await expect(page.locator('.hero-title')).toContainText('微信公众号');
    });

    test('首页导航栏应可见（可能折叠）', async ({ page }) => {
      await page.goto('/');
      const nav = page.locator('.topnav');
      await expect(nav).toBeVisible();
      await expect(nav.locator('.topnav__logo')).toContainText('WxEditor');
    });

    test('登录页在小屏下仍可正常显示', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('.auth-form')).toBeVisible();
      await expect(page.locator('.submit-btn')).toContainText('登录');
    });

    test('404 页面在小屏下正常显示', async ({ page }) => {
      await page.goto('/this-page-does-not-exist');
      await expect(page.locator('.title')).toContainText('404');
      await expect(page.locator('.home-btn')).toContainText('回到首页');
    });
  });

  test.describe('平板视口 (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('首页功能区域应正常显示', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#features')).toBeVisible();
      await expect(page.locator('#pricing')).toBeVisible();
    });

    test('注册页表单完整可见', async ({ page }) => {
      await page.goto('/register');
      const labels = page.locator('.input-group label');
      await expect(labels.nth(0)).toContainText('用户名');
      await expect(labels.nth(1)).toContainText('邮箱');
      await expect(labels.nth(2)).toContainText('密码');
      await expect(labels.nth(3)).toContainText('确认密码');
    });
  });
});
