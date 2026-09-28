// P3.3-A 观测：C. AI PPT 用户入口落点；D. Classroom 返回入口（有/无 pilarTask）
// 只读观测，不改任何产品代码。
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), '.tmp-p33a-shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const CLASSROOM_ID = process.argv[2] || 'lIdBoqxALI';
const DB = 'MAIC-Database';
const BACK_TEXT = '返回 PilarCore';

const url = (p) => p.evaluate(() => ({ pathname: location.pathname, hash: location.hash }));
const step = (p) => p.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('csca_learning_session') || '{}').currentStep ?? null; } catch { return null; }
});
const H1 = (p) => p.locator('h1').first().innerText().catch(() => null);

const countBack = async (p) => {
  const byText = await p.getByText(BACK_TEXT, { exact: false }).count();
  const byFixed = await p.locator('button.fixed').count();
  return { byText, byFixed };
};

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const out = { ppt: {}, classroom: {} };

  // ---------- C. AI PPT 从用户实际入口点击 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.setItem('csca_locale', 'zh-CN'));
    await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const card = page.locator('a[href="/csca/voyage#error_review"]');
    out.ppt.cardFound = await card.count();
    out.ppt.cardHref = await card.first().getAttribute('href').catch(() => null);
    if (out.ppt.cardFound) {
      await card.first().click();
      await page.waitForTimeout(3500);
      out.ppt.url = await url(page);
      out.ppt.currentStep = await step(page);
      out.ppt.h1 = await H1(page);
      out.ppt.isDiagnosis = out.ppt.currentStep === 'diagnosis';
      out.ppt.landedOnPptEntry = out.ppt.url?.hash === '#error_review'
        && out.ppt.currentStep === 'error_review';
      // 该 step 上是否真的存在发起 PPT 生成的动作（不点击，仅探测）
      out.ppt.allButtons = await page
        .locator('button')
        .evaluateAll((bs) => bs.map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
      out.ppt.generateCta = out.ppt.allButtons.filter((t) => /PPT|幻灯片|生成|课堂/.test(t));
    }
    out.ppt.errors = errs;
    await page.screenshot({ path: path.join(OUT, 'aippt-entry.png'), fullPage: false });
    await ctx.close();
  }

  // ---------- D1. Classroom 无 pilarTask ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + `/classroom/${CLASSROOM_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    out.classroom.noTask = {
      url: await url(page),
      back: await countBack(page),
      hasAnyBackLink: await page.locator('a,button').evaluateAll((els) =>
        els.map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim())
           .filter((t) => t && /返回|首页|Back|CSCA|PilarCore/.test(t)).slice(0, 10)),
    };
    await page.screenshot({ path: path.join(OUT, 'classroom-no-task.png'), fullPage: false });
    await ctx.close();
  }

  // ---------- D2. Classroom 有 pilarTask ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    // 先让 App 自己建好 DB（/csca 会 listTasksByCapability → 打开 Dexie v11）
    await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    const seeded = await page.evaluate(async ({ DB, cid }) => {
      const rec = {
        taskId: 'verify-task-1',
        openmaicJobId: 'verify-job-1',
        classroomId: cid,
        capability: 'ppt',
        status: 'succeeded',
        returnUrl: '/csca#error_review',
        voyageStageId: 'error_review',
        requirement: '三边验证用任务',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open(DB);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      if (!db.objectStoreNames.contains('pilarCoreTasks')) return { ok: false, reason: 'no store', stores: [...db.objectStoreNames] };
      await new Promise((res, rej) => {
        const tx = db.transaction('pilarCoreTasks', 'readwrite');
        tx.objectStore('pilarCoreTasks').put(rec);
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
      return { ok: true };
    }, { DB, cid: CLASSROOM_ID }).catch((e) => ({ ok: false, reason: String(e) }));

    await page.goto(BASE + `/classroom/${CLASSROOM_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);
    const btn = page.locator('button.fixed').first();
    out.classroom.withTask = {
      seeded,
      url: await url(page),
      back: await countBack(page),
      buttonTitle: await btn.getAttribute('title').catch(() => null),
      backText: await btn.innerText().catch(() => null),
    };
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(2600);
      out.classroom.withTask.afterClick = { url: await url(page), currentStep: await step(page) };
    }
    await page.screenshot({ path: path.join(OUT, 'classroom-with-task.png'), fullPage: false });
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'results-cd.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
