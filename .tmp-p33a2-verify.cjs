// P3.3-A2 验证：P0-2 AI PPT 真实创建链路 + P0-3 Classroom 返回入口（有/无 pilarTask）
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), '.tmp-p33a-shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const CLASSROOM_ID = 'lIdBoqxALI';
const DB = 'MAIC-Database';
const SEED_TASK_ID = 'p33a2-verify-task';

const url = (p) => p.evaluate(() => ({ pathname: location.pathname, hash: location.hash }));
const step = (p) => p.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('csca_learning_session') || '{}').currentStep ?? null; } catch { return null; }
});

// 从 IndexedDB 读回 pilarCoreTasks（证明 task 真的落库）
const readTasks = (p) => p.evaluate(async (DB) => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open(DB);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  if (!db.objectStoreNames.contains('pilarCoreTasks')) return [];
  return await new Promise((res, rej) => {
    const tx = db.transaction('pilarCoreTasks', 'readonly');
    const req = tx.objectStore('pilarCoreTasks').getAll();
    req.onsuccess = () => res(req.result.map((t) => ({
      taskId: t.taskId, capability: t.capability, status: t.status,
      returnUrl: t.returnUrl, classroomId: t.classroomId ?? null,
      openmaicJobId: t.openmaicJobId, requirement: (t.requirement || '').slice(0, 40),
    })));
    req.onerror = () => rej(req.error);
  });
}, DB);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const out = { p02: {}, p03a: {}, p03b: {} };

  // ================= P0-2：AI PPT → 创建表单 → 真实 task → 任务页 =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 160)); });

    await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.setItem('csca_locale', 'zh-CN'));
    await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const card = page.locator('[data-testid="ai-ppt-card"]');
    out.p02.cardFound = await card.count();
    out.p02.cardText = (await card.first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    // 旧死链必须已消失
    out.p02.oldErrorReviewLinkCount = await page.locator('a[href="/csca/voyage#error_review"]').count();

    await card.first().click();
    await page.waitForTimeout(700);

    const form = page.locator('[data-testid="ai-ppt-form"]');
    const ta = page.locator('[data-testid="ai-ppt-requirement"]');
    const submit = page.locator('[data-testid="ai-ppt-submit"]');
    out.p02.formVisible = await form.isVisible().catch(() => false);
    out.p02.textareaVisible = await ta.isVisible().catch(() => false);
    out.p02.submitVisible = await submit.isVisible().catch(() => false);
    out.p02.submitText = (await submit.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    out.p02.label = (await form.locator('label').first().innerText().catch(() => '')).trim();
    out.p02.urlBeforeSubmit = await url(page);
    await page.screenshot({ path: path.join(OUT, 'a2-ppt-form.png'), fullPage: false });

    const REQ = '为准备 CSCA 数学考试的高中生生成一套讲解「函数与导数」的教学 PPT，包含概念、例题与常见错误。';
    await ta.fill(REQ);
    await page.waitForTimeout(300);
    out.p02.submitEnabledAfterFill = await submit.isEnabled().catch(() => false);

    await submit.click();
    // 轮询等待跳转（createClassroomJob 是真实网络调用）
    let landed = false;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1000);
      const u = await url(page);
      if (u.pathname.startsWith('/csca/tasks/')) { landed = true; break; }
      // 若表单内出现错误文本，提前退出并记录
      const errText = await form.locator('p.text-destructive').innerText().catch(() => null);
      if (errText) { out.p02.formError = errText.replace(/\s+/g, ' ').trim(); break; }
    }
    out.p02.landed = landed;
    out.p02.urlAfterSubmit = await url(page);
    out.p02.taskIdFromUrl = out.p02.urlAfterSubmit.pathname.startsWith('/csca/tasks/')
      ? out.p02.urlAfterSubmit.pathname.split('/').pop() : null;
    out.p02.currentStep = await step(page);
    out.p02.wentToDiagnosis = out.p02.currentStep === 'diagnosis' || out.p02.urlAfterSubmit.hash.includes('diagnosis');

    const tasks = await readTasks(page).catch(() => []);
    out.p02.tasksInDb = tasks;
    const created = tasks.find((t) => t.taskId === out.p02.taskIdFromUrl) || null;
    out.p02.createdTask = created;
    out.p02.createdIsPpt = created ? created.capability === 'ppt' : false;
    out.p02.taskPageRendered = landed
      ? (await page.locator('body').innerText().catch(() => '')).length > 100 : false;

    out.p02.errors = [...new Set(errs)].slice(0, 10);
    await page.screenshot({ path: path.join(OUT, 'a2-ppt-taskpage.png'), fullPage: false });
    await ctx.close();
  }

  // ================= P0-3 A：无 pilarTask =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + `/classroom/${CLASSROOM_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const btn = page.locator('button.fixed').first();
    out.p03a = {
      url: await url(page),
      backCount: await page.locator('button.fixed').count(),
      label: (await btn.innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
      title: await btn.getAttribute('title').catch(() => null),
      tasksInDb: (await readTasks(page).catch(() => [])).length,
    };
    await page.screenshot({ path: path.join(OUT, 'a2-classroom-notask.png'), fullPage: false });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(3000);
      const u = await url(page);
      out.p03a.afterClickUrl = u;
      out.p03a.ok = u.pathname === '/csca' && u.hash === '';
    }
    await ctx.close();
  }

  // ================= P0-3 B：有 pilarTask =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/csca', { waitUntil: 'networkidle' }); // 让 App 建好 Dexie v11
    await page.waitForTimeout(5000);
    const seeded = await page.evaluate(async ({ DB, cid, tid }) => {
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open(DB); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      if (!db.objectStoreNames.contains('pilarCoreTasks')) return { ok: false, stores: [...db.objectStoreNames] };
      await new Promise((res, rej) => {
        const tx = db.transaction('pilarCoreTasks', 'readwrite');
        tx.objectStore('pilarCoreTasks').put({
          taskId: tid, openmaicJobId: 'p33a2-verify-job', classroomId: cid,
          capability: 'ppt', status: 'succeeded',
          returnUrl: '/csca/voyage#error-review', voyageStageId: 'error_review',
          requirement: 'P3.3-A2 返回入口验证用任务',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
      return { ok: true };
    }, { DB, cid: CLASSROOM_ID, tid: SEED_TASK_ID }).catch((e) => ({ ok: false, reason: String(e) }));

    await page.goto(BASE + `/classroom/${CLASSROOM_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);
    const btn = page.locator('button.fixed').first();
    out.p03b = {
      seeded,
      url: await url(page),
      backCount: await page.locator('button.fixed').count(),
      label: (await btn.innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
      title: await btn.getAttribute('title').catch(() => null),
    };
    await page.screenshot({ path: path.join(OUT, 'a2-classroom-withtask.png'), fullPage: false });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(5000);
      const u = await url(page);
      out.p03b.afterClickUrl = u;
      out.p03b.bodyLen = (await page.locator('body').innerText().catch(() => '')).length;
      out.p03b.ok = u.pathname === `/csca/tasks/${SEED_TASK_ID}` && u.hash === '';
      await page.screenshot({ path: path.join(OUT, 'a2-classroom-backtotask.png'), fullPage: false });
    }
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'results-a2.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
