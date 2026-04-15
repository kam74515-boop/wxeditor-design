import { test, expect } from '@playwright/test';

test('debug: console errors during dashboard load', async ({ page }) => {
  const errors: string[] = [];
  const logs: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') logs.push('[WARN] ' + msg.text());
    else logs.push('[' + msg.type() + '] ' + msg.text());
  });
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));

  // Setup mocks
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { id: 1, username: 'e2e_tester', nickname: 'E2E 测试用户', role: 'user', avatar: '' },
      }),
    }),
  );
  await page.route('**/api/**', (route) => {
    if (route.request().url().includes('/api/auth/me')) return;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null, items: [] }),
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'e2e-fake-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'e2e_tester', nickname: 'E2E', role: 'user', avatar: '' }));
  });

  await page.goto('/dashboard');
  await page.waitForTimeout(3000); // Wait for async components

  console.log('\n=== URL ===');
  console.log(page.url());
  
  console.log('\n=== Console Logs (last 20) ===');
  logs.slice(-20).forEach(l => console.log(l));
  
  console.log('\n=== Console Errors ===');
  errors.forEach(e => console.log(e));
  
  console.log('\n=== HTML (first 3000 chars) ===');
  const html = await page.evaluate(() => document.body.innerHTML.substring(0, 3000));
  console.log(html);
});
