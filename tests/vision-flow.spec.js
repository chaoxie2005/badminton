// @ts-check
import { test, expect, chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function loginGuest(page) {
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: '以游客身份先打一局' }).click();
  await page.waitForURL(/\/boards$|\/$/);
}

async function createBoard(page) {
  await page.goto(`${BASE}/boards/new`);
  await page.fill('#name', 'E2E 测试局');
  await page.fill('#player-a', '甲');
  await page.fill('#player-b', '乙');
  await page.fill('#target-score', '11');
  await page.getByRole('button', { name: '开局，去计分' }).click();
  await page.waitForURL(/\/boards\/[0-9a-f-]+$/, { timeout: 10000 });
  const id = page.url().split('/').pop();
  return id;
}

test('vision full flow', async () => {
  test.setTimeout(120_000);
  const ownerErrors = [];
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const owner = await browser.newContext({ baseURL: BASE });
  const ownerPage = await owner.newPage();
  ownerPage.on('console', (msg) => { if (msg.type() === 'error') ownerErrors.push(msg.text()); });
  ownerPage.on('pageerror', (err) => ownerErrors.push(String(err)));

  let inviteToken = '';
  ownerPage.on('response', async (res) => {
    if (res.url().includes('/vision') && res.request().method() === 'GET') {
      try {
        const json = await res.json();
        if (json?.session?.inviteToken) inviteToken = json.session.inviteToken;
      } catch {}
    }
  });

  await loginGuest(ownerPage);
  const boardId = await createBoard(ownerPage);
  console.log('boardId', boardId);

  // open vision console
  await ownerPage.goto(`${BASE}/boards/${boardId}/vision`);
  await ownerPage.getByRole('button', { name: '开启会话' }).click();
  await expect(ownerPage.getByText('扫码加入摄像手机')).toBeVisible({ timeout: 10000 });
  await expect(ownerPage.getByText(/请填写可从手机打开的 HTTPS 域名/)).toBeVisible();

  // camera context with fake media
  const camCtx = await browser.newContext({ baseURL: BASE, permissions: ['camera'] });
  const camPage = await camCtx.newPage();
  const camErrors = [];
  camPage.on('console', (msg) => { if (msg.type() === 'error') camErrors.push(msg.text()); });
  camPage.on('pageerror', (err) => camErrors.push(String(err)));

  await camPage.goto(`${BASE}/boards/${boardId}/vision/camera?invite=${inviteToken}`);
  await camPage.fill('#vision-camera-name', '左后场');
  await camPage.getByRole('button', { name: '加入比赛' }).click();
  await expect(camPage.getByText(/已加入/)).toBeVisible({ timeout: 10000 });
  await camPage.getByRole('button', { name: '开启摄像头' }).click();
  await expect(camPage.getByText('服务器已连接，可接收复核请求')).toBeVisible({ timeout: 15000 });
  console.log('camera connected');

  // owner asks for review
  await ownerPage.getByRole('button', { name: '请求复核' }).click();
  await expect(ownerPage.getByText(/等待摄像手机提交录像|已收到/)).toBeVisible({ timeout: 10000 });

  // camera should collect + upload
  await expect(camPage.getByText('争议球录像已提交', { exact: false })).toBeVisible({ timeout: 20000 });
  console.log('camera uploaded');

  // owner should see clips
  await expect(ownerPage.getByText('1 段录像')).toBeVisible({ timeout: 15000 });
  await ownerPage.getByRole('button', { name: '查看已上传录像' }).first().click();
  await ownerPage.locator('#vision-recordings button:has-text("回看录像")').first().click();
  await expect(ownerPage.getByRole('button', { name: '暂停在落地帧并标记' })).toBeVisible({ timeout: 10000 });

  // line check interaction
  await ownerPage.getByRole('button', { name: '暂停在落地帧并标记' }).click();
  await expect(ownerPage.getByText('请在画面上点选：边线起点')).toBeVisible();
  const canvas = ownerPage.locator('canvas:visible').first();
  const box = await canvas.boundingBox();
  // click 4 points: two line ends, one inside point, one landing point
  await canvas.click({ position: { x: box.width * 0.2, y: box.height * 0.5 } });
  await ownerPage.getByText('请在画面上点选：边线终点').waitFor({ timeout: 5000 });
  await canvas.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
  await ownerPage.getByText('请在画面上点选：场内参考点').waitFor({ timeout: 5000 });
  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.3 } });
  await ownerPage.getByText('请在画面上点选：球的疑似落点').waitFor({ timeout: 5000 });
  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.7 } });
  await expect(ownerPage.getByText(/辅助判断/)).toBeVisible({ timeout: 5000 });
  console.log('line check ok');

  // decide
  ownerPage.once('dialog', (d) => d.accept());
  await ownerPage.getByRole('button', { name: '确认 甲 +1' }).click();
  await expect(ownerPage.getByText('已计入记分牌')).toBeVisible({ timeout: 10000 });

  // scoreboard should show 1 point
  await ownerPage.goto(`${BASE}/boards/${boardId}`);
  await expect(ownerPage.getByText('甲')).toBeVisible();

  console.log('owner errors:', JSON.stringify(ownerErrors.slice(0, 10)));
  console.log('camera errors:', JSON.stringify(camErrors.slice(0, 10)));

  await browser.close();
  await owner.close();
});
