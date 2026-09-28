// P3.3-B2-2 验证：/csca/studio Active Tasks（pending/running）
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), '.tmp-p33b2b-shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';

const url = (p) => p.evaluate(() => ({ pathname: location.pathname, hash: location.hash }));
const step = (p) => p.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('csca_learning_session') || '{}').currentStep ?? null; }
  catch { return null; }
});

const readTasks = (p) => p.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('MAIC-Database');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  if (!db.objectStoreNames.contains('pilarCoreTasks')) return [];
  return await new Promise((res, rej) => {
    const tx = db.transaction('pilarCoreTasks', 'readonly');
    const req = tx.objectStore('pilarCoreTasks').getAll();
    req.onsuccess = () => res(req.result.map((t) => ({
      taskId: t.taskId, capability: t.capability, status: t.status,
      returnUrl: t.returnUrl, lastProgress: t.lastProgress ?? null,
      requirement: (t.requirement || '').slice(0, 30),
    })));
    req.onerror = () => rej(req.error);
  });
});

// 读 Active 区的行（含 data-* 属性）
const readRows = (p) => p.evaluate(() => [...document.querySelectorAll('[data-testid="active-task-row"]')]
  .map((el) => ({
    taskId: el.getAttribute('data-task-id'),
    capability: el.getAttribute('data-capability'),
    status: el.getAttribute('data-status'),
    text: el.innerText.replace(/\s+/g, ' ').trim(),
    continueHref: el.querySelector('[data-testid="active-task-continue"]')?.closest('a')?.getAttribute('href') || null,
  })));

async function createTask(page, cfg) {
  const form = page.locator(`[data-testid="${cfg.form}"]`);
  if (!(await form.isVisible().catch(() => false))) {
    await page.locator(`[data-testid="${cfg.card}"]`).first().click();
    await page.waitForTimeout(500);
  }
  await page.locator(`[data-testid="${cfg.textarea}"]`).fill(cfg.req);
  await page.locator(`[data-testid="${cfg.submit}"]`).click();
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const u = await url(page);
    if (u.pathname.startsWith('/csca/tasks/')) {
      return { landed: true, pathname: u.pathname, taskId: u.pathname.split('/').pop(), hash: u.hash };
    }
    if (await form.locator('p.text-destructive').innerText().catch(() => null)) break;
  }
  return { landed: false, pathname: (await url(page)).pathname };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  // 全新 context = 空 IndexedDB → 可以验证空状态（不伪造、不清理）
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 180)); });

  const out = {};

  await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('csca_locale', 'zh-CN'));

  // ===== 1. /csca/studio 打开 + 2. 空状态 =====
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  out.open = {
    url: await url(page),
    studioFound: await page.locator('[data-testid="studio-page"]').count(),
    activeSectionFound: await page.locator('[data-testid="active-tasks"]').count(),
    rowsBefore: (await readRows(page)).length,
    emptyVisible: await page.locator('[data-testid="active-tasks-empty"]').isVisible().catch(() => false),
    emptyText: (await page.locator('[data-testid="active-tasks-empty"]').innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
    refreshFound: await page.locator('[data-testid="active-tasks-refresh"]').count(),
  };
  await page.screenshot({ path: path.join(OUT, 'b2b-empty.png'), fullPage: true });

  // ===== 3. 创建真实 PPT task =====
  out.createPpt = await createTask(page, {
    card: 'ai-ppt-card', form: 'ai-ppt-form',
    textarea: 'ai-ppt-requirement', submit: 'ai-ppt-submit',
    req: 'P3.3-B2-2 Active 验证：CSCA 物理「牛顿运动定律」教学 PPT',
  });

  // ===== 4/5. 回 /csca/studio，Active 区出现该 task =====
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const rows1 = await readRows(page);
  out.afterPpt = {
    rows: rows1,
    rowCount: rows1.length,
    emptyGone: !(await page.locator('[data-testid="active-tasks-empty"]').isVisible().catch(() => false)),
    targetPresent: rows1.some((r) => r.taskId === out.createPpt.taskId),
    dbTasks: await readTasks(page),
  };
  await page.screenshot({ path: path.join(OUT, 'b2b-active-ppt.png'), fullPage: true });

  // ===== 3b. 再创建一个真实 HTML task（验证两种 capability 都能显示）=====
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  out.createHtml = await createTask(page, {
    card: 'ai-html-card', form: 'ai-html-form',
    textarea: 'ai-html-requirement', submit: 'ai-html-submit',
    req: 'P3.3-B2-2 Active 验证：高中化学「化学平衡」交互式学习页面',
  });

  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const rows2 = await readRows(page);
  out.afterBoth = {
    rowCount: rows2.length,
    capabilities: rows2.map((r) => r.capability),
    statuses: rows2.map((r) => r.status),
    rows: rows2,
  };
  await page.screenshot({ path: path.join(OUT, 'b2b-active-both.png'), fullPage: true });

  // ===== 8/9. 点「继续任务」→ /csca/tasks/[taskId]，无 hash =====
  const firstTaskId = rows2[0].taskId;
  const firstBtn = page.locator('[data-testid="active-task-row"]').first().locator('[data-testid="active-task-continue"]');
  out.continueBtnVisible = await firstBtn.isVisible().catch(() => false);
  out.continueHref = await firstBtn.evaluate((el) => el.closest('a')?.getAttribute('href') || null).catch(() => null);
  await firstBtn.click();
  await page.waitForTimeout(2500);
  const afterClick = await url(page);
  out.continue = {
    expectedPath: `/csca/tasks/${firstTaskId}`,
    afterClickUrl: afterClick,
    ok: afterClick.pathname === `/csca/tasks/${firstTaskId}` && afterClick.hash === '',
    currentStep: await step(page),
    wentToDiagnosisOrErrorReview: afterClick.pathname.includes('diagnosis')
      || afterClick.hash.includes('diagnosis') || afterClick.hash.includes('error_review')
      || afterClick.hash.includes('error-review'),
    taskPageBodyLen: (await page.locator('body').innerText().catch(() => '')).length,
  };
  await page.screenshot({ path: path.join(OUT, 'b2b-continue.png') });

  // ===== 10. 刷新后仍在 =====
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const rowsReload = await readRows(page);
  // 再点一次「刷新」按钮
  await page.locator('[data-testid="active-tasks-refresh"]').click();
  await page.waitForTimeout(1500);
  const rowsAfterRefreshBtn = await readRows(page);
  out.persistence = {
    afterReloadCount: rowsReload.length,
    afterRefreshBtnCount: rowsAfterRefreshBtn.length,
    afterReloadIds: rowsReload.map((r) => r.taskId),
    stillHasTarget: rowsReload.some((r) => r.taskId === out.createPpt.taskId),
  };

  // ===== 12. B2-1 两个创建入口未受影响 =====
  const pptCard = page.locator('[data-testid="ai-ppt-card"]');
  const htmlCard = page.locator('[data-testid="ai-html-card"]');
  out.b21Regression = {
    pptCardFound: await pptCard.count(),
    htmlCardFound: await htmlCard.count(),
    pptFormInitiallyHidden: !(await page.locator('[data-testid="ai-ppt-form"]').isVisible().catch(() => false)),
    htmlFormInitiallyHidden: !(await page.locator('[data-testid="ai-html-form"]').isVisible().catch(() => false)),
  };
  await pptCard.first().click();
  await page.waitForTimeout(400);
  out.b21Regression.pptFormOpens = await page.locator('[data-testid="ai-ppt-form"]').isVisible().catch(() => false);
  await htmlCard.first().click();
  await page.waitForTimeout(400);
  out.b21Regression.htmlFormOpens = await page.locator('[data-testid="ai-html-form"]').isVisible().catch(() => false);
  out.b21Regression.pptClosedByMutualExclusion = !(await page.locator('[data-testid="ai-ppt-form"]').isVisible().catch(() => false));
  // 关闭表单，避免影响后续
  await htmlCard.first().click();
  await page.waitForTimeout(300);

  out.consoleErrors = [...new Set(errs)].slice(0, 15);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));

  await ctx.close();
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
