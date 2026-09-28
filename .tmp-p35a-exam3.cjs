/* P3.5-A probe 4 (decisive): complete a practice exam, then check whether
   csca_error_records / csca_study_plan get written, and whether the score
   worker succeeded or fell back to main-thread grading. Temp artifact. */
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('csca_locale', 'zh');
      localStorage.removeItem('csca_error_records');
      localStorage.removeItem('csca_study_plan');
      localStorage.setItem(
        'csca_learning_session',
        JSON.stringify({
          currentStep: 'exam_center', activeStep: 3, completedStages: [0, 1, 2],
          answerHistory: [], selectedSubjects: ['数学'], selectedCountryCode: 'TH',
          targetMajorId: 'medicine', hskLevel: 4, locale: 'zh', updatedAt: Date.now(),
        }),
      );
    } catch {}
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

  const clickByText = (re) =>
    page.evaluate((rs) => {
      const rx = new RegExp(rs);
      const b = Array.from(document.querySelectorAll('button')).find((x) =>
        rx.test((x.textContent || '').replace(/\s+/g, ' ').trim()),
      );
      if (b) { b.click(); return (b.textContent || '').replace(/\s+/g, ' ').trim(); }
      return null;
    }, re.source);

  const progress = () =>
    page.evaluate(() => {
      const m = (document.body.innerText || '').match(/答题进度\s*([\d]+\s*\/\s*\d+)/);
      return m ? m[1] : null;
    });

  await page.goto('http://localhost:3000/csca/voyage#mock-exam', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  const started = await clickByText(/开始试航演练/);
  await page.waitForTimeout(12000);

  const out = { started, answered: 0, progressTrail: [] };

  for (let i = 0; i < 60; i++) {
    const before = await progress();
    const opt = await clickByText(/^[A-D]{1,2}\.\s/);
    if (opt) out.answered++;
    await page.waitForTimeout(650);
    const after = await progress();
    if (after && after !== before) {
      out.progressTrail.push(after);
      if (/28\s*\/\s*28/.test(after)) break;
    } else {
      const nx = await clickByText(/下一题/);
      if (!nx) break;
      await page.waitForTimeout(500);
    }
  }

  out.finalProgress = await progress();
  const submitted = await clickByText(/^提交试航/);
  out.submitted = submitted;
  await page.waitForTimeout(12000);

  out.localStorage = await page.evaluate(() => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || '';
      o[k] = v.length > 400 ? `${v.slice(0, 400)}...(len ${v.length})` : v;
    }
    return o;
  });
  out.hasErrorRecords = await page.evaluate(() => !!localStorage.getItem('csca_error_records'));
  out.hasStudyPlan = await page.evaluate(() => !!localStorage.getItem('csca_study_plan'));
  out.workerFallback = logs.filter((l) => /fallback to main-thread grading|score-worker/i.test(l));
  out.workerAny = logs.filter((l) => /worker/i.test(l));
  out.logsTail = logs.slice(-25);
  out.answerHistoryLen = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('csca_learning_session') || '{}');
      return Array.isArray(s.answerHistory) ? s.answerHistory.length : null;
    } catch { return 'parse-error'; }
  });
  out.resultScreen = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(-700));

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
