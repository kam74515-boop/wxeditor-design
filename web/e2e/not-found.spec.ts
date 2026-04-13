import { test, expect } from '@playwright/test';

test.describe('404 页面', () => {
  test('访问不存在的路径应显示 404 页面', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-at-all');

    // 应该显示 404 标题
    await expect(page.locator('.title')).toContainText('404');

    // 描述文字
    await expect(page.locator('.description')).toContainText('不存在');

    // 操作按钮
    await expect(page.locator('.back-btn')).toContainText('返回上一页');
    await expect(page.locator('.home-btn')).toContainText('回到首页');
  });

  test('404 页面点击"回到首页"应导航到 /', async ({ page }) => {
    await page.goto('/nonexistent-route-xyz');

    await page.locator('.home-btn').click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.hero-section')).toBeVisible();
  });
});
