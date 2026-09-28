// 确认 task 页返回链接的 href 真的是 /csca/studio（returnUrl 被消费）
const { chromium } = require('@playwright/test');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('csca_locale', 'zh-CN'));

  // 在 studio 上真实创建一个 PPT task（同一 context 才有同一 IndexedDB）
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[data-testid="ai-ppt-card"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="ai-ppt-requirement"]').fill('P3.3-B2-1 returnUrl 验证用 PPT 需求');
  await page.locator('[data-testid="ai-ppt-submit"]').click();
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    if ((await page.evaluate(() => location.pathname)).startsWith('/csca/tasks/')) break;
  }

  const t = await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open('MAIC-Database'); r.onsuccess = () => res(r.result); });
    if (!db.objectStoreNames.contains('pilarCoreTasks')) return null;
    const all = await new Promise((res) => {
      const q = db.transaction('pilarCoreTasks', 'readonly').objectStore('pilarCoreTasks').getAll();
      q.onsuccess = () => res(q.result);
    });
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  });

  const backLinks = await page.evaluate(() => [...document.querySelectorAll('a')]
    .map((a) => ({ text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') }))
    .filter((a) => a.text.includes('返回') || (a.href || '').includes('studio')));

  console.log(JSON.stringify({
    taskPagePath: await page.evaluate(() => location.pathname),
    dbRecord: t && { taskId: t.taskId, capability: t.capability, status: t.status, returnUrl: t.returnUrl },
    backLinks,
  }, null, 2));

  await ctx.close();
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
