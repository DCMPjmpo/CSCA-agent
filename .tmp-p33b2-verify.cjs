// P3.3-B2-1 验证：/csca/studio 基础页面 + Create 区（PPT / Interactive Lesson 真实创建）
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), '.tmp-p33b2-shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const DB = 'MAIC-Database';

const url = (p) => p.evaluate(() => ({
  pathname: location.pathname, hash: location.hash, search: location.search,
}));
const step = (p) => p.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('csca_learning_session') || '{}').currentStep ?? null; }
  catch { return null; }
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

/**
 * 通用：在 studio 页打开某张卡的表单 → 填需求 → 提交 → 等跳转到 /csca/tasks/*
 * 返回 { formOpened, submitVisible, landed, urlAfter, taskId, dbTask, formError }
 */
async function runCreateFlow(page, cfg) {
  const r = { capability: cfg.capability, req: cfg.req };
  const card = page.locator(`[data-testid="${cfg.card}"]`);
  r.cardFound = await card.count();
  if (!r.cardFound) return r;

  // 卡片是 toggle：仅在表单未展开时才点击，避免把已开的表单点关闭
  const formProbe = page.locator(`[data-testid="${cfg.form}"]`);
  if (!(await formProbe.isVisible().catch(() => false))) {
    await card.first().click();
    await page.waitForTimeout(600);
  }

  const form = page.locator(`[data-testid="${cfg.form}"]`);
  const ta = page.locator(`[data-testid="${cfg.textarea}"]`);
  const submit = page.locator(`[data-testid="${cfg.submit}"]`);
  r.formOpened = await form.isVisible().catch(() => false);
  r.textareaVisible = await ta.isVisible().catch(() => false);
  r.submitVisible = await submit.isVisible().catch(() => false);
  r.submitDisabledBeforeFill = await submit.isDisabled().catch(() => null);
  r.urlBeforeSubmit = await url(page);
  await page.screenshot({ path: path.join(OUT, `b2-${cfg.capability}-form.png`) });
  if (!r.formOpened) return r;

  await ta.fill(cfg.req);
  await page.waitForTimeout(250);
  r.submitEnabledAfterFill = await submit.isEnabled().catch(() => null);

  await submit.click();

  r.landed = false;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const u = await url(page);
    if (u.pathname.startsWith('/csca/tasks/')) { r.landed = true; break; }
    const errText = await form.locator('p.text-destructive').innerText().catch(() => null);
    if (errText) { r.formError = errText.replace(/\s+/g, ' ').trim(); break; }
  }
  r.urlAfter = await url(page);
  r.taskId = r.urlAfter.pathname.startsWith('/csca/tasks/')
    ? r.urlAfter.pathname.split('/').pop() : null;
  r.currentStep = await step(page);
  r.wentToDiagnosis = r.currentStep === 'diagnosis' || r.urlAfter.hash.includes('diagnosis');

  const tasks = await readTasks(page).catch(() => []);
  r.dbTask = tasks.find((t) => t.taskId === r.taskId) || null;
  await page.screenshot({ path: path.join(OUT, `b2-${cfg.capability}-task.png`) });
  return r;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const out = { page: {}, ppt: {}, html: {}, both: {} };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 180));
  });

  // 先固定中文，再进 studio
  await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('csca_locale', 'zh-CN'));

  // ============ 1. /csca/studio 可以打开 ============
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const shell = page.locator('[data-testid="brand-shell"]');
  const studioPage = page.locator('[data-testid="studio-page"]');
  out.page = {
    httpOk: true,
    url: await url(page),
    shellFound: await shell.count(),
    studioFound: await studioPage.count(),
    bodyLen: (await page.locator('body').innerText().catch(() => '')).length,
    h1: (await page.locator('h1').first().innerText().catch(() => '')).trim(),
    pptCard: await page.locator('[data-testid="ai-ppt-card"]').count(),
    htmlCard: await page.locator('[data-testid="ai-html-card"]').count(),
    // 不得复制 Dashboard：这些内容在 Studio 上不应出现
    hasVoyageProgressText: /学习航程进度|Learning Voyage Progress/.test(
      await page.locator('body').innerText().catch(() => '')),
  };
  await page.screenshot({ path: path.join(OUT, 'b2-studio.png'), fullPage: true });

  // ============ 2-4. AI PPT：表单可开 + 真实创建 ============
  out.ppt = await runCreateFlow(page, {
    card: 'ai-ppt-card',
    form: 'ai-ppt-form',
    textarea: 'ai-ppt-requirement',
    submit: 'ai-ppt-submit',
    capability: 'ppt',
    req: '为准备 CSCA 数学考试的高中生生成一套讲解「函数与导数」的教学 PPT，包含概念、例题与常见错误。',
  });

  // 回到 studio 再走 HTML（验证两卡互斥 + 第二次创建）
  await page.goto(BASE + '/csca/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // ============ 2b. 表单互斥 ============
  await page.locator('[data-testid="ai-ppt-card"]').first().click();
  await page.waitForTimeout(400);
  const pptOpen = await page.locator('[data-testid="ai-ppt-form"]').isVisible().catch(() => false);
  await page.locator('[data-testid="ai-html-card"]').first().click();
  await page.waitForTimeout(400);
  out.both = {
    pptOpenFirst: pptOpen,
    pptStillOpenAfterHtmlClick: await page.locator('[data-testid="ai-ppt-form"]').isVisible().catch(() => false),
    htmlOpenAfterHtmlClick: await page.locator('[data-testid="ai-html-form"]').isVisible().catch(() => false),
  };

  // ============ 5. Interactive Lesson：真实创建 ============
  out.html = await runCreateFlow(page, {
    card: 'ai-html-card',
    form: 'ai-html-form',
    textarea: 'ai-html-requirement',
    submit: 'ai-html-submit',
    capability: 'html',
    req: '高中生物：光合作用的基本原理。生成一个让学生探索光照、二氧化碳与光合作用关系的交互式学习页面，包含至少一种真实交互。',
  });

  out.errors = [...new Set(errs)].slice(0, 15);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));

  await ctx.close();
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
