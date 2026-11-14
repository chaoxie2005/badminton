import pkg from '/home/chase/node_modules/playwright/index.js';
const { chromium } = pkg;

const BASE = 'http://localhost:3000';
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

// Owner context
const ownerCtx = await browser.newContext({ baseURL: BASE });
const owner = await ownerCtx.newPage();
owner.on('response', async (res) => {
  if (res.url().includes('/vision') && res.request().method() === 'GET') {
    try {
      const json = await res.json();
      const cams = json?.session?.cameras ?? [];
      console.log('[owner GET vision]', new Date().toISOString().slice(11,23),
        'cams=', cams.map((c) => `${c.name} last=${c.lastSeenAt?.slice(11,23)} created=${c.createdAt?.slice(11,23)}`).join(' | '));
    } catch {}
  }
});
owner.on('pageerror', (e) => console.log('[owner pageerror]', String(e).slice(0,200)));
owner.on('console', (m) => { if (m.type()==='error') console.log('[owner console err]', m.text().slice(0,200)); });

await owner.goto('/login');
await owner.getByRole('button', { name: '以游客身份先打一局' }).click();
await owner.waitForTimeout(1500);
await owner.goto('/boards/new');
await owner.fill('#name', 'DBG 局');
await owner.fill('#player-a', '甲');
await owner.fill('#player-b', '乙');
await owner.fill('#target-score', '11');
await owner.getByRole('button', { name: '开局，去计分' }).click();
await owner.waitForURL(/\/boards\/[0-9a-f-]+$/, { timeout: 10000 });
const boardId = owner.url().split('/').pop();
console.log('boardId', boardId);

await owner.goto(`/boards/${boardId}/vision`);
await owner.getByRole('button', { name: '开启会话' }).click();
await owner.waitForTimeout(1500);
// grab invite token from page text
const inviteText = await owner.locator('p.break-all').first().textContent();
const inviteToken = inviteText.split('invite=')[1];
console.log('inviteToken', inviteToken?.slice(0,12));

// Camera context
const camCtx = await browser.newContext({ baseURL: BASE, permissions: ['camera'] });
const cam = await camCtx.newPage();
cam.on('pageerror', (e) => console.log('[cam pageerror]', String(e).slice(0,200)));
cam.on('console', (m) => { if (m.type()==='error') console.log('[cam console err]', m.text().slice(0,200)); });
cam.on('response', async (res) => {
  if (res.url().includes('/vision/camera') && res.request().method()==='GET') {
    console.log('[cam poll]', new Date().toISOString().slice(11,23), res.status());
  }
});

await cam.goto(`/boards/${boardId}/vision/camera?invite=${inviteToken}`);
await cam.fill('#vision-camera-name', '左后场');
await cam.getByRole('button', { name: '加入比赛' }).click();
await cam.waitForTimeout(1500);
await cam.getByRole('button', { name: '开启摄像头' }).click();
await cam.waitForTimeout(6000);
console.log('camera status line:', (await cam.locator('p[role=status]').first().textContent())?.slice(0,60));

// now check owner's view of online count
await owner.waitForTimeout(1500);
const onlineText = await owner.locator('h2:has-text("摄像机")').textContent();
console.log('owner camera section:', onlineText?.replace(/\s+/g,' ').trim());

await browser.close();
