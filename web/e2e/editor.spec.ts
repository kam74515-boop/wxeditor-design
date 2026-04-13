import { test, expect } from '@playwright/test';

test.describe('编辑器页面', () => {
  test('未登录时访问 /editor 应重定向到 /login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('token'));

    await page.goto('/editor');

    await expect(page).toHaveURL(/\/login/);
  });

  test('编辑器页面包含核心 UI 骨架（侧栏标签页）', async ({ page }) => {
    // 注入伪造的登录态，使路由守卫放行
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'e2e-fake-token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, username: 'e2e', role: 'user' }),
      );
    });

    await page.goto('/editor');

    // 编辑器工作台容器
    await expect(page.locator('.editor-workbench')).toBeVisible();

    // 左侧栏标签页
    const tabs = page.locator('.tool-tabs .tab-item');
    await expect(tabs).toHaveCount(6);

    // 检查标签页文案
    await expect(tabs.nth(0)).toContainText('模版');
    await expect(tabs.nth(1)).toContainText('SVG');
    await expect(tabs.nth(2)).toContainText('素材');
    await expect(tabs.nth(3)).toContainText('上传');
    await expect(tabs.nth(4)).toContainText('项目');
    await expect(tabs.nth(5)).toContainText('AI');

    // 清理
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
  });

  test('编辑器侧栏标签页可切换', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'e2e-fake-token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, username: 'e2e', role: 'user' }),
      );
    });

    await page.goto('/editor');

    // 默认第一个标签高亮
    const tabs = page.locator('.tool-tabs .tab-item');
    await expect(tabs.nth(0)).toHaveClass(/active/);

    // 点击 AI 标签
    await tabs.nth(5).click();
    await expect(tabs.nth(5)).toHaveClass(/active/);

    // AI 面板应可见
    await expect(page.locator('.ai-prompts-panel')).toBeVisible();
    await expect(page.locator('.ai-label')).toContainText('AI 快捷操作');

    // 清理
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
  });
});
