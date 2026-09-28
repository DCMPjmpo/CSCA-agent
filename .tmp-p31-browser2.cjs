/* P3.1-R browser verification part 2 — classroom render, interactivity, real-job task page, retry, persistence */
const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const CLASSROOM = '8O9nkhSuJt'; // created through the real /csca UI path in part 1
const JOB = 'VQaQhOyLAM';
const TASK = 'task-real-job-8O9nkhSuJt';
const TOPIC =
  '高中生物：光合作用的基本原理。生成一个可以帮助学生探索光照、二氧化碳和光合作用关系的交互式学习页面，包含知识解释和至少一种真实交互。';

const out = { checkpoints: {}, consoleErrors: [], failedRequests: [] };
const cp = (id, name, pass, detail) => {
  out.checkpoints[id] = { name, pass, detail };
  console.log(`${pass ? 'PASS' : 'FAIL'} CP${id} ${name} :: ${detail}`);
};

async function readTasks(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('MAIC-Database');
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('pilarCoreTasks')) return resolve([]);
          const tx = db.transaction('pilarCoreTasks', 'readonly');
          const all = tx.objectStore('pilarCoreTasks').getAll();
          all.onsuccess = () => resolve(all.result || []);
          all.onerror = () => resolve([]);
        };
        req.onerror = () => resolve([]);
      }),
  );
}

async function seed(page, rec) {
  return page.evaluate(
    (r) =>
      new Promise((resolve) => {
        const req = indexedDB.open('MAIC-Database');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('pilarCoreTasks', 'readwrite');
          tx.objectStore('pilarCoreTasks').put(r);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        };
        req.onerror = () => resolve(false);
      }),
    rec,
  );
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Scene sidebar defaults to collapsed (sidebarCollapsed: true). Expand it so
  // scene items are actually visible/clickable.
  await context.addInitScript(() => {
    try {
      const raw = localStorage.getItem('settings-storage');
      const j = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      j.state = j.state || {};
      j.state.sidebarCollapsed = false;
      localStorage.setItem('settings-storage', JSON.stringify(j));
    } catch {}
  });

  const page = await context.newPage();
  page.on('pageerror', (e) => out.consoleErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') out.consoleErrors.push('console: ' + m.text().slice(0, 200));
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('/_next/')) {
      out.http4xx5xx = out.http4xx5xx || [];
      if (out.http4xx5xx.length < 20) out.http4xx5xx.push(r.status() + ' ' + r.url());
    }
  });
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (!u.includes('/_next/') && !u.includes('cdn.jsdelivr'))
      out.failedRequests.push(r.method() + ' ' + u + ' :: ' + (r.failure()?.errorText || ''));
  });

  try {
    /* ---------- CP6: classroom renders (empty IndexedDB → server fallback) ---------- */
    await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.goto(BASE + '/classroom/' + CLASSROOM, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="scene-item"]').length > 0,
      { timeout: 60000 },
    );
    await page.waitForTimeout(2500);
    const sceneCount = await page.locator('[data-testid="scene-item"]').count();
    const titles = await page.locator('[data-testid="scene-title"]').allInnerTexts();
    cp(
      6,
      'CSCA → Classroom 页面加载并渲染真实场景列表',
      sceneCount >= 1,
      `sceneCount=${sceneCount} titles=${JSON.stringify(titles)}`,
    );
    out.sceneCount = sceneCount;
    out.sceneTitles = titles;

    /* ---------- CP7: interactive scene renders real HTML in the MAIN canvas ---------- */
    // The sidebar renders live iframe thumbnails too, so pick the LARGEST
    // iframe[srcdoc] on the page — that is the main canvas renderer.
    const probeMain = async () => {
      return page.evaluate(() => {
        const frames = [...document.querySelectorAll('iframe[srcdoc]')];
        if (!frames.length) return null;
        frames.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return rb.width * rb.height - ra.width * ra.height;
        });
        const el = frames[0];
        const r = el.getBoundingClientRect();
        const d = el.contentDocument;
        if (!d) return { ok: false, reason: 'contentDocument null' };
        const html = d.documentElement.outerHTML;
        return {
          ok: true,
          box: Math.round(r.width) + 'x' + Math.round(r.height),
          len: html.length,
          scripts: d.querySelectorAll('script').length,
          ranges: d.querySelectorAll('input[type=range]').length,
          canvas: d.querySelectorAll('canvas').length,
          title: d.title,
        };
      });
    };

    let interactiveOk = false;
    let detail7 = 'no scene rendered an iframe[srcdoc]';
    let interactiveSceneTitle = null;
    let interactiveSceneIndex = -1;
    for (let i = 0; i < sceneCount; i++) {
      await page.locator('[data-testid="scene-item"]').nth(i).click();
      await page.waitForTimeout(3000);
      const p = await probeMain();
      if (p && p.ok && p.ranges > 0) {
        interactiveSceneIndex = i;
        interactiveSceneTitle = titles[i];
        detail7 = `sceneIndex=${i} ${JSON.stringify(p)}`;
        interactiveOk = p.scripts > 0;
        break;
      }
      if (p && p.ok && p.scripts > 0 && !interactiveSceneTitle) {
        interactiveSceneIndex = i;
        interactiveSceneTitle = titles[i];
        detail7 = `sceneIndex=${i} (no range inputs) ${JSON.stringify(p)}`;
      }
    }
    out.interactiveSceneTitle = interactiveSceneTitle;
    out.interactiveSceneIndex = interactiveSceneIndex;
    cp(
      7,
      'Interactive Scene 在主画布 iframe 中渲染真实 HTML（自包含脚本 + 交互控件）',
      interactiveOk,
      `scene="${interactiveSceneTitle ?? '-'}" ${detail7}`,
    );

    /* ---------- CP8: real interactivity ---------- */
    let interactOk = false;
    let detail8 = 'skipped';
    if (interactiveOk) {
      const res = await page.evaluate(async () => {
        const frames = [...document.querySelectorAll('iframe[srcdoc]')];
        frames.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return rb.width * rb.height - ra.width * ra.height;
        });
        const el = frames[0];
        const d = el.contentDocument;
        if (!d) return { ok: false, reason: 'no contentDocument' };
        const range = d.querySelector('input[type=range]');
        if (!range) return { ok: false, reason: 'no range input' };
        const before = d.body.innerText;
        const set = Object.getOwnPropertyDescriptor(
          el.contentWindow.HTMLInputElement.prototype,
          'value',
        ).set;
        set.call(range, range.max || '100');
        range.dispatchEvent(new Event('input', { bubbles: true }));
        range.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 1500));
        const after = d.body.innerText;
        return {
          ok: true,
          changed: before !== after,
          rangeId: range.id || range.name || '(none)',
          value: range.value,
          beforeLen: before.length,
          afterLen: after.length,
        };
      });
      interactOk = !!res.ok && !!res.changed;
      detail8 = JSON.stringify(res);
    }
    cp('8', '交互真实生效：操作滑块后 iframe 内容发生真实变化', interactOk, detail8);
    await page.screenshot({ path: '.tmp-p31-shot-classroom.png', fullPage: true });

    /* ---------- Real-job task page: seeded record pointing at the REAL succeeded job ---------- */
    const now = new Date().toISOString();
    await seed(page, {
      taskId: TASK,
      openmaicJobId: JOB,
      classroomId: CLASSROOM,
      capability: 'html',
      status: 'running',
      returnUrl: '/csca',
      requirement: TOPIC,
      lastStep: 'generating_scenes',
      lastProgress: 40,
      lastMessage: 'seeded mid-flight for polling verification',
      createdAt: now,
      updatedAt: now,
    });
    await page.goto(BASE + '/csca/tasks/' + TASK, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    const body = await page.locator('body').innerText();
    const converged = body.includes('已完成') && body.includes('打开交互式学习内容');
    cp(
      9,
      '任务工作台对真实 job 轮询并收敛到 succeeded（真实 API，非伪造）',
      converged,
      `converged=${converged} hasCta=${body.includes('打开交互式学习内容')}`,
    );
    await page.screenshot({ path: '.tmp-p31-shot-task.png', fullPage: true });

    /* ---------- Persistence 1: reload ---------- */
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const b1 = await page.locator('body').innerText();
    cp(
      'P1',
      '浏览器刷新后任务仍从 IndexedDB 恢复为成功态',
      b1.includes('已完成') && b1.includes('打开交互式学习内容'),
      `ok=${b1.includes('已完成') && b1.includes('打开交互式学习内容')}`,
    );

    /* ---------- Persistence 2: new tab (tab-close/reopen) ---------- */
    const p2 = await context.newPage();
    await p2.goto(BASE + '/csca/tasks/' + TASK, { waitUntil: 'domcontentloaded' });
    await p2.waitForTimeout(6000);
    const b2 = await p2.locator('body').innerText();
    cp(
      'P2',
      '新标签页打开同一任务仍恢复成功态（关闭标签页后恢复）',
      b2.includes('已完成') && b2.includes('打开交互式学习内容'),
      `ok=${b2.includes('已完成') && b2.includes('打开交互式学习内容')}`,
    );

    /* ---------- Persistence 3: classroom reloads in a fresh tab ---------- */
    await p2.goto(BASE + '/classroom/' + CLASSROOM, { waitUntil: 'domcontentloaded' });
    await p2.waitForFunction(() => document.querySelectorAll('[data-testid="scene-item"]').length > 0, {
      timeout: 60000,
    });
    await p2.waitForTimeout(2000);
    const sc2 = await p2.locator('[data-testid="scene-item"]').count();
    cp('P3', '课堂页在新标签页重新加载仍渲染场景', sc2 >= 1, `sceneCount=${sc2}`);

    /* ---------- Retry: seeded FAILED html task → 重新生成 ---------- */
    const before = await readTasks(page);
    await seed(page, {
      taskId: 'SEEDED_FAILED_HTML',
      openmaicJobId: 'seeded-dead-job',
      capability: 'html',
      status: 'failed',
      returnUrl: '/csca',
      requirement: TOPIC,
      lastStep: 'failed',
      lastMessage: 'seeded failure for retry verification',
      error: 'seeded',
      createdAt: now,
      updatedAt: now,
    });
    await page.goto(BASE + '/csca/tasks/SEEDED_FAILED_HTML', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const retry = page.getByRole('button', { name: /重新生成/ });
    await retry.waitFor({ state: 'visible', timeout: 30000 });
    await retry.click();
    await page.waitForURL(/\/csca\/tasks\/(?!SEEDED_FAILED_HTML)[^/]+$/, { timeout: 90000 });
    const newTaskId = page.url().split('/').pop();
    await page.waitForTimeout(3000);
    const after = await readTasks(page);
    const newRec = after.find((t) => t.taskId === newTaskId);
    const oldRec = after.find((t) => t.taskId === 'SEEDED_FAILED_HTML');
    cp(
      'R',
      'Retry 创建新 task + 新 job，旧 task 未被覆盖',
      !!newRec &&
        !!newRec.openmaicJobId &&
        newRec.openmaicJobId !== 'seeded-dead-job' &&
        newRec.taskId !== 'SEEDED_FAILED_HTML' &&
        !!oldRec &&
        oldRec.status === 'failed' &&
        oldRec.openmaicJobId === 'seeded-dead-job' &&
        after.length === before.length + 2, // +1 seeded failed, +1 retry-created
      `oldKept=${!!oldRec}(${oldRec?.status}/${oldRec?.openmaicJobId}) new=${newTaskId}/${newRec?.openmaicJobId} count ${before.length}→${after.length}`,
    );
    out.retryNewTaskId = newTaskId;
    out.retryNewJobId = newRec?.openmaicJobId;
    out.retryOldPreserved = !!oldRec && oldRec.status === 'failed';
  } catch (e) {
    out.fatal = e && e.stack ? e.stack : String(e);
    console.log('SCRIPT_ERROR: ' + (e && e.stack ? e.stack : e));
    try {
      await page.screenshot({ path: '.tmp-p31-shot-error.png', fullPage: true });
    } catch {}
  }

  fs.writeFileSync('.tmp-p31-browser2-result.json', JSON.stringify(out, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(out.checkpoints, null, 2));
  console.log('consoleErrors:', JSON.stringify(out.consoleErrors.slice(0, 10)));
  console.log('failedRequests:', JSON.stringify(out.failedRequests.slice(0, 10)));
  await browser.close();
})();
