// P3.3-B2-3 补充验证：
//   (a) 用同一 persistent profile 重开浏览器 → 真·持久化 + 逐行核对「查看任务」href
//   (b) 再跑一个真实任务，若自然失败则验证 failed 分支（不伪造失败）
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), '.tmp-p33b2c-shots');
const PROFILE = path.join(process.cwd(), '.tmp-p33b2c-profile');
const BASE = 'http://localhost:3000';

const url = (p) => p.evaluate(() => ({ pathname: location.pathname, hash: location.hash }));

const readRecentRows = (p) => p.evaluate(() => [...document.querySelectorAll('[data-testid="recent-task-row"]')]
  .map((el) => ({
    taskId: el.getAttribute('data-task-id'),
    capability: el.getAttribute('data-capability'),
    status: el.getAttribute('data-status'),
    classroomId: el.getAttribute('data-classroom-id') || null,
    text: el.innerText.replace(/\s+/g, ' ').trim(),
    viewHref: el.querySelector('[data-testid="recent-task-view"]')?.closest('a')?.getAttribute('href') || null,
    openHref: el.querySelector('[data-testid="recent-task-open-classroom"]')?.closest('a')?.getAttribute('href') || null,
    errorLine: el.querySelector('[data-testid="recent-task-error"]')?.innerText?.trim() || null,
    badge: el.querySelector('span')?.innerText?.trim() || null,
    requirement: el.querySelector('[data-testid="recent-task-requirement"]')?.innerText?.trim() || null,
  })));

const readTask = (p, taskId) => p.evaluate(async (id) => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('MAIC-Database');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  if (!db.objectStoreNames.contains('pilarCoreTasks')) return null;
  return await new Promise((res, rej) => {
    const q = db.transaction('pilarCoreTasks', 'readonly').objectStore('pilarCoreTasks').get(id);
    q.onsuccess = () => res(q.result ? {
      taskId: q.result.taskId, capability: q.result.capability, status: q.result.status,
      classroomId: q.result.classroomId ?? null, error: (q.result.error || ''),
      lastProgress: q.result.lastProgress ?? null, scenesGenerated: q.result.scenesGenerated ?? null,
      requirement: q.result.requirement, returnUrl: q.result.returnUrl,
    } : null);
    q.onerror = () => rej(q.error);
  });
}, taskId);

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: 'msedge', viewport: { width: 1440, height: 900 },
  });
  const out = {};
  const errs = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 180)); });

  // ===== (a) 新浏览器进程读同一 profile → 持久化 + 逐行核对 =====
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const rows = await readRecentRows(page);
  out.persisted = {
    count: rows.length,
    taskIds: rows.map((r) => r.taskId),
    rows,
  };

  // 逐行点「查看任务」，核对落到该行自己的 viewHref
  out.viewTaskPerRow = [];
  for (let i = 0; i < rows.length; i++) {
    await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const live = await readRecentRows(page);
    const row = live[i];
    const expected = row.viewHref;
    await page.locator('[data-testid="recent-task-row"]').nth(i)
      .locator('[data-testid="recent-task-view"]').click();
    await page.waitForTimeout(3000);
    const after = await url(page);
    out.viewTaskPerRow.push({
      index: i, taskId: row.taskId, expected, after,
      ok: after.pathname === expected && after.hash === '',
      wentToDiagnosis: /diagnosis|error-review|error_review/.test(after.pathname + after.hash),
      bodyHasTaskId: (await page.locator('body').innerText().catch(() => '')).includes(row.taskId),
    });
    if (i === 0) await page.screenshot({ path: path.join(OUT, 'b2c2-view-task.png') });
  }

  // 逐行核对「打开课堂」
  out.openClassroomPerRow = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.classroomId || !row.openHref) continue;
    await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.locator('[data-testid="recent-task-row"]').nth(i)
      .locator('[data-testid="recent-task-open-classroom"]').click();
    await page.waitForTimeout(7000);
    const after = await url(page);
    out.openClassroomPerRow.push({
      index: i, taskId: row.taskId, classroomId: row.classroomId,
      expected: `/classroom/${row.classroomId}`, after,
      ok: after.pathname === `/classroom/${row.classroomId}` && after.hash === '',
    });
  }

  // ===== (b) 真实任务 → 若自然失败则验证 failed 分支 =====
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('[data-testid="ai-ppt-card"]').first().click();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="ai-ppt-requirement"]')
    .fill('P3.3-B2-3 failed 分支观察：CSCA 语文「赤壁赋」教学 PPT');
  await page.locator('[data-testid="ai-ppt-submit"]').click();
  let probeId = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const u = await url(page);
    if (u.pathname.startsWith('/csca/tasks/')) { probeId = u.pathname.split('/').pop(); break; }
  }
  out.probeTaskId = probeId;
  const deadline = Date.now() + 12 * 60 * 1000;
  let fin = null;
  while (probeId && Date.now() < deadline) {
    fin = await readTask(page, probeId).catch(() => null);
    console.log('  probe ->', fin && fin.status, fin && fin.lastProgress);
    if (fin && ['succeeded', 'failed'].includes(fin.status)) break;
    await page.waitForTimeout(5000);
  }
  out.probeFinal = fin;

  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const rowsAfter = await readRecentRows(page);
  out.afterProbe = {
    count: rowsAfter.length,
    statuses: rowsAfter.map((r) => `${r.capability}:${r.status}`),
    failedRows: rowsAfter.filter((r) => r.status === 'failed'),
    anyRowWithErrorLine: rowsAfter.some((r) => !!r.errorLine),
  };
  await page.screenshot({ path: path.join(OUT, 'b2c2-after-probe.png'), fullPage: true });

  out.consoleErrors = [...new Set(errs)].slice(0, 15);
  fs.writeFileSync(path.join(OUT, 'results2.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await ctx.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
