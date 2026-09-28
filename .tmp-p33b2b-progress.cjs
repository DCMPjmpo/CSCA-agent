// 核对 progress bar 填充宽度是否等于 lastProgress%
const { chromium } = require('@playwright/test');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('csca_locale', 'zh-CN'));

  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('[data-testid="ai-html-card"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="ai-html-requirement"]').fill('B2-2 进度条核对：CSCA 生物「细胞呼吸」交互式页面');
  await page.locator('[data-testid="ai-html-submit"]').click();
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    if ((await page.evaluate(() => location.pathname)).startsWith('/csca/tasks/')) break;
  }

  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.locator('[data-testid="active-tasks-refresh"]').click();
  await page.waitForTimeout(1000);

  const probe = await page.evaluate(async () => {
    const row = document.querySelector('[data-testid="active-task-row"]');
    if (!row) return { found: false };
    const rail = row.querySelector('div.overflow-hidden.rounded-full');
    const fill = rail?.firstElementChild;
    const taskId = row.getAttribute('data-task-id');
    const db = await new Promise((res) => { const r = indexedDB.open('MAIC-Database'); r.onsuccess = () => res(r.result); });
    const rec = await new Promise((res) => {
      const q = db.transaction('pilarCoreTasks', 'readonly').objectStore('pilarCoreTasks').get(taskId);
      q.onsuccess = () => res(q.result);
    });
    return {
      found: true,
      text: row.innerText.replace(/\s+/g, ' ').trim(),
      lastProgressInDb: rec?.lastProgress ?? null,
      railPx: rail ? +rail.getBoundingClientRect().width.toFixed(1) : null,
      fillPx: fill ? +fill.getBoundingClientRect().width.toFixed(1) : null,
      fillInlineStyle: fill ? fill.getAttribute('style') : null,
      ratioPct: rail && fill ? +((fill.getBoundingClientRect().width / rail.getBoundingClientRect().width) * 100).toFixed(1) : null,
    };
  });
  console.log(JSON.stringify(probe, null, 2));
  await ctx.close();
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
