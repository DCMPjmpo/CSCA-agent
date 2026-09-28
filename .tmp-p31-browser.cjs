/* P3.1-R browser verification — CSCA → OpenMAIC → DeepSeek → Classroom → Interactive Scene → Browser Render */
const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const TOPIC =
  '高中生物：光合作用的基本原理。生成一个可以帮助学生探索光照、二氧化碳和光合作用关系的交互式学习页面，包含知识解释和至少一种真实交互。';

const out = { checkpoints: {}, notes: [], consoleErrors: [], failedRequests: [] };
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

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', (e) => out.consoleErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') out.consoleErrors.push('console: ' + m.text().slice(0, 200));
  });
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (!u.includes('/_next/') && !u.includes('cdn.jsdelivr')) {
      out.failedRequests.push(r.method() + ' ' + u + ' :: ' + (r.failure()?.errorText || ''));
    }
  });

  try {
    /* ---------- CP1: /csca loads with Interactive Lesson entry ---------- */
    await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    const entry = page.getByRole('button', { name: /Interactive Lesson/ });
    await entry.first().waitFor({ state: 'visible', timeout: 30000 });
    cp(1, 'CSCA /csca 加载并出现 Interactive Lesson 入口', true, 'button visible');

    /* ---------- CP2: submit topic → createHtmlTask → navigate to task page ---------- */
    await entry.first().click();
    const ta = page.locator('textarea');
    await ta.first().waitFor({ state: 'visible', timeout: 15000 });
    await ta.first().fill(TOPIC);
    await page.getByRole('button', { name: '创建任务' }).click();
    await page.waitForURL(/\/csca\/tasks\/[^/]+$/, { timeout: 90000 });
    const taskId = page.url().split('/').pop();
    await page.waitForTimeout(2000);

    const tasksAfterCreate = await readTasks(page);
    const created = tasksAfterCreate.find((t) => t.taskId === taskId);
    cp(
      2,
      'createHtmlTask → IndexedDB pilarCoreTasks 落库并跳转任务工作台',
      !!created && created.capability === 'html' && !!created.openmaicJobId,
      `taskId=${taskId} capability=${created?.capability} jobId=${created?.openmaicJobId}`,
    );
    if (!created) throw new Error('task record not persisted');
    out.taskId = taskId;
    out.openmaicJobId = created.openmaicJobId;

    /* ---------- CP3: task page shows REAL progress (distinct steps observed) ---------- */
    const seenSteps = new Set();
    const t0 = Date.now();
    let done = false;
    while (Date.now() - t0 < 9 * 60 * 1000) {
      const body = await page.locator('body').innerText();
      const m = body.match(/进度\s*(\d+)%/);
      if (m) seenSteps.add('progress:' + m[1]);
      for (const s of [
        '正在准备',
        '正在分析材料',
        '正在生成大纲',
        '正在生成内容',
        '正在生成课堂场景',
        '正在保存',
      ])
        if (body.includes(s)) seenSteps.add(s);
      if (body.includes('已完成') && body.includes('打开交互式学习内容')) {
        done = true;
        break;
      }
      if (body.includes('生成失败')) break;
      await page.waitForTimeout(5000);
    }
    const runningSteps = [...seenSteps].filter((s) => !s.startsWith('progress:'));
    const progressVals = [...seenSteps].filter((s) => s.startsWith('progress:'));
    cp(
      3,
      '任务工作台展示真实进度（非伪造）',
      done && (runningSteps.length >= 2 || progressVals.length >= 2),
      `steps=${JSON.stringify(runningSteps)} progressSamples=${progressVals.length} elapsed=${Math.round((Date.now() - t0) / 1000)}s`,
    );

    /* ---------- CP4: succeeded + html CTA + no "absent" warning ---------- */
    const bodyDone = await page.locator('body').innerText();
    const hasCta = bodyDone.includes('打开交互式学习内容');
    const hasAbsent = bodyDone.includes('没有生成交互式场景');
    cp(
      4,
      '任务成功：显示「打开交互式学习内容」且无「未生成交互式场景」告警',
      done && hasCta && !hasAbsent,
      `cta=${hasCta} absentWarning=${hasAbsent}`,
    );
    await page.screenshot({ path: '.tmp-p31-shot-task.png', fullPage: true });

    const taskFinal = (await readTasks(page)).find((t) => t.taskId === taskId);
    out.classroomId = taskFinal?.classroomId;
    cp(
      5,
      '任务记录已同步 classroomId 且 status=succeeded',
      taskFinal?.status === 'succeeded' && !!taskFinal?.classroomId,
      `status=${taskFinal?.status} classroomId=${taskFinal?.classroomId}`,
    );

    /* ---------- CP6: open classroom via CTA ---------- */
    await page.getByRole('link', { name: /打开交互式学习内容/ }).click();
    await page.waitForURL(/\/classroom\/[^/]+$/, { timeout: 60000 });
    await page.waitForSelector('[data-testid="scene-item"]', { timeout: 60000 });
    await page.waitForTimeout(3000);
    const sceneCount = await page.locator('[data-testid="scene-item"]').count();
    cp(6, 'CSCA → Classroom 页面加载并渲染场景列表', sceneCount >= 1, `sceneCount=${sceneCount}`);
    out.sceneCount = sceneCount;

    /* ---------- CP7: interactive scene renders real HTML in iframe ---------- */
    const titles = await page.locator('[data-testid="scene-title"]').allInnerTexts();
    const interactiveIdx = titles.findIndex((t) => /光照强度|CO₂|CO2|浓度/.test(t));
    let interactiveDetail = 'no interactive scene title found';
    let interactiveOk = false;
    if (interactiveIdx >= 0) {
      await page.locator('[data-testid="scene-item"]').nth(interactiveIdx).click();
      await page.waitForTimeout(4000);
      const iframe = page.locator('iframe[srcdoc]').first();
      await iframe.waitFor({ state: 'attached', timeout: 30000 });
      const probe = await iframe.evaluate((el) => {
        const d = el.contentDocument;
        if (!d) return { ok: false, reason: 'contentDocument null' };
        const html = d.documentElement.outerHTML;
        return {
          ok: true,
          len: html.length,
          scripts: d.querySelectorAll('script').length,
          ranges: d.querySelectorAll('input[type=range]').length,
          canvas: d.querySelectorAll('canvas').length,
          title: d.title,
        };
      });
      interactiveDetail = JSON.stringify(probe);
      interactiveOk = probe.ok && probe.scripts > 0 && probe.ranges > 0;
    }
    cp(
      7,
      'Interactive Scene 在 iframe 中渲染真实 HTML（自包含脚本 + 交互控件）',
      interactiveOk,
      `title="${titles[interactiveIdx] ?? '-'}" ${interactiveDetail}`,
    );

    /* ---------- CP8: real interactivity — move slider, observe DOM change ---------- */
    let interactDetail = 'skipped';
    let interactOk = false;
    if (interactiveOk) {
      const iframe = page.locator('iframe[srcdoc]').first();
      const res = await iframe.evaluate(async (el) => {
        const d = el.contentDocument;
        const range = d.querySelector('input[type=range]');
        if (!range) return { ok: false, reason: 'no range input' };
        const before = d.body.innerText.slice(0, 4000);
        const set = Object.getOwnPropertyDescriptor(
          el.contentWindow.HTMLInputElement.prototype,
          'value',
        ).set;
        set.call(range, range.max || '100');
        range.dispatchEvent(new Event('input', { bubbles: true }));
        range.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 1200));
        const after = d.body.innerText.slice(0, 4000);
        return { ok: true, changed: before !== after, beforeLen: before.length, afterLen: after.length };
      });
      interactOk = !!res.ok && !!res.changed;
      interactDetail = JSON.stringify(res);
    }
    cp(
      8,
      '交互真实生效：拖动滑块后 iframe 内容发生真实变化',
      interactOk,
      interactDetail,
    );
    await page.screenshot({ path: '.tmp-p31-shot-classroom.png', fullPage: true });

    /* ---------- Retry: seed a FAILED html task → click 重新生成 ---------- */
    const beforeRetry = await readTasks(page);
    const beforeIds = beforeRetry.map((t) => t.taskId);
    await page.evaluate(
      (topic) =>
        new Promise((resolve) => {
          const req = indexedDB.open('MAIC-Database');
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('pilarCoreTasks', 'readwrite');
            const now = new Date().toISOString();
            tx.objectStore('pilarCoreTasks').put({
              taskId: 'SEEDED_FAILED_HTML',
              openmaicJobId: 'seeded-dead-job',
              capability: 'html',
              status: 'failed',
              returnUrl: '/csca',
              requirement: topic,
              lastStep: 'failed',
              lastMessage: 'seeded failure for retry verification',
              createdAt: now,
              updatedAt: now,
            });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          };
          req.onerror = () => resolve(false);
        }),
      TOPIC,
    );
    await page.goto(BASE + '/csca/tasks/SEEDED_FAILED_HTML', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const retryBtn = page.getByRole('button', { name: /重新生成/ });
    await retryBtn.waitFor({ state: 'visible', timeout: 30000 });
    await retryBtn.click();
    await page.waitForURL(/\/csca\/tasks\/(?!SEEDED_FAILED_HTML)[^/]+$/, { timeout: 90000 });
    const newTaskId = page.url().split('/').pop();
    await page.waitForTimeout(2500);
    const afterRetry = await readTasks(page);
    const newRec = afterRetry.find((t) => t.taskId === newTaskId);
    const oldRec = afterRetry.find((t) => t.taskId === 'SEEDED_FAILED_HTML');
    cp(
      'R',
      'Retry 创建新 task + 新 job，旧 task 未被覆盖',
      !!newRec &&
        newRec.taskId !== 'SEEDED_FAILED_HTML' &&
        !!newRec.openmaicJobId &&
        newRec.openmaicJobId !== 'seeded-dead-job' &&
        !!oldRec &&
        oldRec.status === 'failed' &&
        oldRec.openmaicJobId === 'seeded-dead-job' &&
        afterRetry.length === beforeRetry.length + 1,
      `old kept=${!!oldRec}(${oldRec?.status}/${oldRec?.openmaicJobId}) new=${newTaskId}/${newRec?.openmaicJobId} tasksBefore=${beforeIds.length} tasksAfter=${afterRetry.length}`,
    );
    out.retryNewTaskId = newTaskId;
    out.retryNewJobId = newRec?.openmaicJobId;

    /* ---------- Persistence: reload task page, then new context (tab-close) ---------- */
    await page.goto(BASE + '/csca/tasks/' + taskId, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const afterReloadBody = await page.locator('body').innerText();
    const reloadOk =
      afterReloadBody.includes('已完成') && afterReloadBody.includes('打开交互式学习内容');
    cp('P1', '刷新后任务仍可从 IndexedDB 恢复为成功态', reloadOk, `hasSucceeded=${reloadOk}`);

    const page2 = await context.newPage();
    await page2.goto(BASE + '/csca/tasks/' + taskId, { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(3000);
    const body2 = await page2.locator('body').innerText();
    const tabOk = body2.includes('已完成') && body2.includes('打开交互式学习内容');
    cp('P2', '新标签页打开同一任务仍恢复成功态（同一浏览器 profile）', tabOk, `ok=${tabOk}`);

    await page2.goto(BASE + '/classroom/' + out.classroomId, { waitUntil: 'domcontentloaded' });
    await page2.waitForSelector('[data-testid="scene-item"]', { timeout: 60000 });
    await page2.waitForTimeout(2500);
    const sceneCount2 = await page2.locator('[data-testid="scene-item"]').count();
    cp(
      'P3',
      '课堂页在新标签页重新加载（IndexedDB 命中或服务端回退）仍渲染场景',
      sceneCount2 >= 1,
      `sceneCount=${sceneCount2}`,
    );
  } catch (e) {
    out.notes.push('SCRIPT_ERROR: ' + (e && e.message ? e.message : String(e)));
    console.log('SCRIPT_ERROR: ' + (e && e.stack ? e.stack : e));
    try {
      await page.screenshot({ path: '.tmp-p31-shot-error.png', fullPage: true });
    } catch {}
  }

  out.sceneTitles = await (async () => {
    try {
      return await page.locator('[data-testid="scene-title"]').allInnerTexts();
    } catch {
      return [];
    }
  })();

  fs.writeFileSync('.tmp-p31-browser-result.json', JSON.stringify(out, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(out.checkpoints, null, 2));
  console.log('consoleErrors:', JSON.stringify(out.consoleErrors.slice(0, 10)));
  console.log('failedRequests:', JSON.stringify(out.failedRequests.slice(0, 10)));
  await browser.close();
})();
