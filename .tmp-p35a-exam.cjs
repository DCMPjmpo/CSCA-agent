/* P3.5-A exam-path probe: does a normal exam write csca_error_records / csca_study_plan?
   Read-only w.r.t. the repo; it drives the app's own UI. Temp artifact. */
const { chromium } = require('@playwright/test');

const OUT = { steps: [], workerEvents: [], localStorage: {}, submissions: [] };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('csca_locale', 'zh');
      localStorage.setItem(
        'csca_learning_session',
        JSON.stringify({
          currentStep: 'exam',
          activeStep: 3,
          completedStages: [0, 1, 2],
          answerHistory: [],
          selectedSubjects: ['数学'],
          selectedCountryCode: 'TH',
          targetMajorId: 'medicine',
          hskLevel: 4,
          locale: 'zh',
          updatedAt: Date.now(),
        }),
      );
    } catch {}
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('request', (r) => {
    if (r.url().includes('mock-exam')) OUT.submissions.push(`REQ ${r.method()} ${r.url()}`);
  });
  page.on('response', (r) => {
    if (r.url().includes('mock-exam')) OUT.submissions.push(`RES ${r.status()} ${r.url()}`);
  });

  await page.goto('http://localhost:3000/csca/voyage', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);

  const dumpButtons = async (tag) => {
    const b = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map((x) => (x.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 70),
    );
    OUT.steps.push({ tag, buttons: b });
    return b;
  };

  await dumpButtons('on-load');

  // Try clicking a sidebar/step entry whose text mentions 试航
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const t = btns.find((x) => (x.textContent || '').includes('试航'));
    if (t) { t.click(); return (t.textContent || '').replace(/\s+/g, ' ').trim(); }
    return null;
  });
  OUT.steps.push({ tag: 'clicked-试航', clicked });
  await page.waitForTimeout(3000);
  await dumpButtons('after-试航');

  const body1 = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1200));
  OUT.steps.push({ tag: 'body-after-试航', body1 });

  // Look for a start button
  const startClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pats = [/开始/, /生成.*(试卷|题目)/, /正式/, /练习/, /出题/];
    for (const p of pats) {
      const t = btns.find((x) => p.test((x.textContent || '').trim()));
      if (t) { const txt = (t.textContent || '').replace(/\s+/g, ' ').trim(); t.click(); return txt; }
    }
    return null;
  });
  OUT.steps.push({ tag: 'clicked-start', startClicked });
  await page.waitForTimeout(12000);
  await dumpButtons('after-start');
  OUT.steps.push({
    tag: 'body-after-start',
    body: await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2000)),
  });

  OUT.localStorage = await page.evaluate(() => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || '';
      o[k] = v.length > 300 ? `${v.slice(0, 300)}...(len ${v.length})` : v;
    }
    return o;
  });
  OUT.logs = logs.filter((l) => /worker|score|grading|fallback/i.test(l)).slice(0, 40);
  OUT.allLogs = logs.slice(0, 60);

  console.log(JSON.stringify(OUT, null, 2));
  await browser.close();
})();
