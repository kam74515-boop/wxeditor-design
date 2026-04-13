import type { Page } from '@playwright/test';

/**
 * 注入伪造的登录态，并拦截后端 session 校验 API。
 * 必须在 page.goto() 之前调用。
 */
export async function injectAuth(page: Page, opts?: { role?: string }) {
  const role = opts?.role ?? 'user';

  // 拦截 /api/auth/me，返回成功（防止 App.vue validateSession -> logout）
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 1,
          username: 'e2e_tester',
          nickname: 'E2E 测试用户',
          role,
          avatar: '',
        },
      }),
    }),
  );

  // 拦截其他 API 返回空数据，避免组件报错
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    // 已有 /api/auth/me 处理
    if (url.includes('/api/auth/me')) return;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null }),
    });
  });

  await page.goto('/');
  await page.evaluate((r) => {
    localStorage.setItem('token', 'e2e-fake-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: 'e2e_tester',
        nickname: 'E2E 测试用户',
        role: r,
        avatar: '',
      }),
    );
  }, role);
}

/** 清除伪造登录态 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
  });
}
