// P3.3-B2-3 验证：/csca/studio Recent Tasks（succeeded / failed，真实数据）
// 说明：生成需要真实 LLM 时间（此前实测 1–4 分钟）。脚本会保持任务页打开
// 让任务页的 5s 轮询把终态同步进 IndexedDB，然后回 Studio 验证 Recent。
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), '.tmp-p33b2c-shots');
const PROFILE = path.join(process.cwd(), '.tmp-p33b2c-profile');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';

const url = (p) => p.evaluate(() => ({ pathname: location.pathname, hash: location.hash }));

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
      classroomId: q.result.classroomId ?? null, error: (q.result.error || '').slice(0, 120),
      lastProgress: q.result.lastProgress ?? null, scenesGenerated: q.result.scenesGenerated ?? null,
      requirement: (q.result.requirement || '').slice(0, 40), returnUrl: q.result.returnUrl,
    } : null);
    q.onerror = () => rej(q.error);
  });
}, taskId);

// 在 studio 页读两个区的行
const readActiveRows = (p) => p.evaluate(() => [...document.querySelectorAll('[data-testid="active-task-row"]')]
  .map((el) => ({
    taskId: el.getAttribute('data-task-id'),
    capability: el.getAttribute('data-capability'),
    status: el.getAttribute('data-status'),
    text: el.innerText.replace(/\s+/g, ' ').trim(),
  })));

const readRecentRows = (p) => p.evaluate(() => [...document.querySelectorAll('[data-testid="recent-task-row"]')]
  .map((el) => ({
    taskId: el.getAttribute('data-task-id'),
    capability: el.getAttribute('data-capability'),
    status: el.getAttribute('data-status'),
    classroomId: el.getAttribute('data-classroom-id') || null,
    text: el.innerText.replace(/\s+/g, ' ').trim(),
    viewHref: el.querySelector('[data-testid="recent-task-view"]')?.closest('a')?.getAttribute('href') || null,
    openHref: el.querySelector('[data-testid="recent-task-open-classroom"]')?.closest('a')?.getAttribute('href') || null,
    hasErrorLine: !!el.querySelector('[data-testid="recent-task-error"]'),
  })));

async function createTask(page, cfg) {
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator(`[data-testid="${cfg.card}"]`).first().click();
  await page.waitForTimeout(500);
  await page.locator(`[data-testid="${cfg.textarea}"]`).fill(cfg.req);
  await page.locator(`[data-testid="${cfg.submit}"]`).click();
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const u = await url(page);
    if (u.pathname.startsWith('/csca/tasks/')) {
      return { landed: true, taskId: u.pathname.split('/').pop(), pathname: u.pathname, hash: u.hash };
    }
  }
  return { landed: false, pathname: (await url(page)).pathname };
}

/** 保持任务页打开（轮询 5s 把终态写回 IndexedDB），轮询 IndexedDB 直到终态 */
async function waitTerminal(page, taskId, maxMs, onTick) {
  const deadline = Date.now() + maxMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await readTask(page, taskId).catch(() => null);
    if (onTick) onTick(last);
    if (last && ['succeeded', 'failed'].includes(last.status)) return last;
    await page.waitForTimeout(5000);
  }
  return last;
}

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: 'msedge',
    viewport: { width: 1440, height: 900 },
  });
  const out = { run: new Date().toISOString() };
  const errs = [];
  const attach = (p, tag) => {
    p.on('pageerror', (e) => errs.push(`[${tag}] PAGEERROR: ` + String(e).slice(0, 200)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(`[${tag}] CONSOLE: ` + m.text().slice(0, 180)); });
  };

  const studio = await ctx.newPage();
  attach(studio, 'studio');
  await studio.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
  await studio.evaluate(() => localStorage.setItem('csca_locale', 'zh-CN'));

  // ===== 1/2/6. Studio 打开 + Active 不受影响 + Recent 空状态 =====
  await studio.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await studio.waitForTimeout(3000);
  out.initial = {
    url: await url(studio),
    activeSectionFound: await studio.locator('[data-testid="active-tasks"]').count(),
    recentSectionFound: await studio.locator('[data-testid="recent-tasks"]').count(),
    activeRows: (await readActiveRows(studio)).length,
    recentRows: (await readRecentRows(studio)).length,
    activeEmptyVisible: await studio.locator('[data-testid="active-tasks-empty"]').isVisible().catch(() => false),
    recentEmptyVisible: await studio.locator('[data-testid="recent-tasks-empty"]').isVisible().catch(() => false),
    recentEmptyText: (await studio.locator('[data-testid="recent-tasks-empty"]').innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
    refreshFound: await studio.locator('[data-testid="active-tasks-refresh"]').count(),
  };
  await studio.screenshot({ path: path.join(OUT, 'b2c-initial.png'), fullPage: true });

  // ===== 创建两个真实 task（PPT + HTML），并行等待终态 =====
  const pptPage = await ctx.newPage(); attach(pptPage, 'pptTask');
  const htmlPage = await ctx.newPage(); attach(htmlPage, 'htmlTask');

  out.createPpt = await createTask(pptPage, {
    card: 'ai-ppt-card', form: 'ai-ppt-form',
    textarea: 'ai-ppt-requirement', submit: 'ai-ppt-submit',
    req: 'P3.3-B2-3 Recent 验证：CSCA 数学「三角函数图像与性质」教学 PPT',
  });
  out.createHtml = await createTask(htmlPage, {
    card: 'ai-html-card', form: 'ai-html-form',
    textarea: 'ai-html-requirement', submit: 'ai-html-submit',
    req: 'P3.3-B2-3 Recent 验证：高中物理「电磁感应」交互式学习页面',
  });

  // 创建后立刻看 Active：应能捕获到 pending/running
  await studio.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await studio.waitForTimeout(2500);
  out.activeWhileRunning = {
    rows: await readActiveRows(studio),
    recentRowsDuringRun: (await readRecentRows(studio)).length,
  };
  await studio.screenshot({ path: path.join(OUT, 'b2c-active-while-running.png'), fullPage: true });

  // 等待两个任务进入终态（最多 14 分钟）
  const MAX = 14 * 60 * 1000;
  const pptFinal = await waitTerminal(pptPage, out.createPpt.taskId, MAX,
    (t) => console.log('  ppt ->', t && t.status, t && t.lastProgress));
  const htmlFinal = await waitTerminal(htmlPage, out.createHtml.taskId, MAX,
    (t) => console.log('  html ->', t && t.status, t && t.lastProgress));
  out.pptFinal = pptFinal;
  out.htmlFinal = htmlFinal;

  // ===== 3/4/5/6. 回 Studio 验证 Recent =====
  await studio.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await studio.waitForTimeout(3000);
  const recent = await readRecentRows(studio);
  out.recent = {
    rows: recent,
    rowCount: recent.length,
    emptyGone: !(await studio.locator('[data-testid="recent-tasks-empty"]').isVisible().catch(() => false)),
    activeRowsNow: (await readActiveRows(studio)).length,
    pptPresent: recent.some((r) => r.taskId === out.createPpt.taskId),
    htmlPresent: recent.some((r) => r.taskId === out.createHtml.taskId),
    pptRow: recent.find((r) => r.taskId === out.createPpt.taskId) || null,
    htmlRow: recent.find((r) => r.taskId === out.createHtml.taskId) || null,
  };
  await studio.screenshot({ path: path.join(OUT, 'b2c-recent.png'), fullPage: true });

  // ===== 7. 「查看任务」→ /csca/tasks/[taskId] =====
  const target = out.recent.pptRow || out.recent.htmlRow || recent[0];
  out.viewTask = { taskId: target.taskId, expected: `/csca/tasks/${target.taskId}`, href: target.viewHref };
  await studio.locator('[data-testid="recent-task-row"]').first().locator('[data-testid="recent-task-view"]').click();
  await studio.waitForTimeout(2500);
  const afterView = await url(studio);
  out.viewTask.afterClick = afterView;
  out.viewTask.ok = afterView.pathname === `/csca/tasks/${target.taskId}` && afterView.hash === '';
  out.viewTask.wentToDiagnosis = afterView.pathname.includes('diagnosis') || afterView.hash.includes('diagnosis')
    || afterView.hash.includes('error-review') || afterView.hash.includes('error_review');
  out.viewTask.bodyLen = (await studio.locator('body').innerText().catch(() => '')).length;
  await studio.screenshot({ path: path.join(OUT, 'b2c-view-task.png') });

  // ===== 8. 「打开课堂」→ /classroom/[classroomId] =====
  await studio.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await studio.waitForTimeout(3000);
  const rows2 = await readRecentRows(studio);
  const withClassroom = rows2.find((r) => r.classroomId && r.openHref);
  out.openClassroom = {
    candidateRow: withClassroom || null,
    anyRowHasClassroom: rows2.some((r) => !!r.classroomId),
  };
  if (withClassroom) {
    const idx = rows2.findIndex((r) => r.taskId === withClassroom.taskId);
    await studio.locator('[data-testid="recent-task-row"]').nth(idx)
      .locator('[data-testid="recent-task-open-classroom"]').click();
    await studio.waitForTimeout(6000);
    const afterOpen = await url(studio);
    out.openClassroom.expected = `/classroom/${withClassroom.classroomId}`;
    out.openClassroom.href = withClassroom.openHref;
    out.openClassroom.afterClick = afterOpen;
    out.openClassroom.ok = afterOpen.pathname === `/classroom/${withClassroom.classroomId}`
      && afterOpen.hash === '';
    out.openClassroom.bodyLen = (await studio.locator('body').innerText().catch(() => '')).length;
    await studio.screenshot({ path: path.join(OUT, 'b2c-open-classroom.png') });
  }

  // ===== 11. reload 后 Recent 仍在 =====
  await studio.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await studio.waitForTimeout(3000);
  const rowsReload = await readRecentRows(studio);
  out.persistence = {
    afterReloadCount: rowsReload.length,
    ids: rowsReload.map((r) => r.taskId),
    sameAsBefore: rows2.length === rowsReload.length,
  };

  out.consoleErrors = [...new Set(errs)].slice(0, 15);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));

  await ctx.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
