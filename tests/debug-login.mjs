import pkg from '/home/chase/node_modules/playwright/index.js';
const { chromium } = pkg;

const BASE = 'http://localhost:3000';
const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 200)));
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
page.on('response', (r) => { if (r.url().includes('/api/') || r.url().includes('next')) console.log('[resp]', r.status(), r.url().slice(0, 120)); });

await page.goto('/login');
console.log('url after goto:', page.url());
const buttons = await page.locator('button').allTextContents();
console.log('buttons:', JSON.stringify(buttons));
await page.getByRole('button', { name: '以游客身份先打一局' }).click();
await page.waitForTimeout(3000);
console.log('url after guest:', page.url());
await page.goto('/boards/new');
await page.waitForTimeout(2000);
console.log('url after new:', page.url());
await browser.close();
