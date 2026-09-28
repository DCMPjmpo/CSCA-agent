/* P3.5-B0 verification: after the main-thread persistence hotfix, does a normal
   practice exam write csca_error_records + csca_study_plan? Same probe that FAILED
   in P3.5-A, re-run against the fixed build. Read-only w.r.t. the repo. Temp artifact. */
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => {
    try {
      // Seed only on the FIRST load — addInitScript re-runs on reload, and re-seeding
      // would wipe the very records this probe is trying to verify survive a reload.
      if (sessionStorage.getItem('p35b0-seeded')) return;
      sessionStorage.setItem('p35b0-seeded', '1');
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
  const net = [];
  page.on('response', (r) => {
    if (/\/api\/csca\//.test(r.url())) net.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });

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

  const out = { started: null, answered: 0 };
  out.started = await clickByText(/开始试航演练/);
  await page.waitForTimeout(30000);
  out.netAfterStart = net.slice();
  out.firstQuestionSeen = await page.evaluate(() => {
    const m = (document.body.innerText || '').match(/答题进度\s*([\d]+\s*\/\s*\d+)/);
    return m ? m[1] : null;
  });

  for (let i = 0; i < 60; i++) {
    const before = await progress();
    const opt = await clickByText(/^[A-D]{1,2}\.\s/);
    if (opt) out.answered++;
    await page.waitForTimeout(650);
    const after = await progress();
    if (after && after !== before) {
      if (/28\s*\/\s*28/.test(after)) break;
    } else {
      const nx = await clickByText(/下一题/);
      if (!nx) break;
      await page.waitForTimeout(500);
    }
  }

  out.finalProgress = await progress();
  out.submitted = await clickByText(/^提交试航/);
  await page.waitForTimeout(12000);

  out.errorRecords = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('csca_error_records');
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return {
        count: arr.length,
        withQuestionText: arr.filter((r) => typeof r.question === 'string' && r.question.length > 0).length,
        withUserAnswer: arr.filter((r) => r.userAnswer !== undefined).length,
        withCorrectAnswer: arr.filter((r) => r.correctAnswer !== undefined).length,
        sample: arr.slice(0, 2).map((r) => ({
          questionId: r.questionId, module: r.module,
          userAnswer: r.userAnswer, correctAnswer: r.correctAnswer,
        })),
      };
    } catch (e) { return { err: String(e) }; }
  });
  out.studyPlan = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('csca_study_plan');
      if (!raw) return null;
      const p = JSON.parse(raw);
      return {
        id: p.id, userId: p.userId, targetSubjects: p.targetSubjects,
        weakAreaCount: (p.weakAreas || []).length,
        dailyGoalCount: (p.dailyGoals || []).length,
        dailyGoalModules: (p.dailyGoals || []).slice(0, 3).map((g) => g.module),
        weeklyGoalCount: (p.weeklyGoals || []).length,
      };
    } catch (e) { return { err: String(e) }; }
  });
  out.answerHistoryLen = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('csca_learning_session') || '{}');
      return Array.isArray(s.answerHistory) ? s.answerHistory.length : null;
    } catch { return 'parse-error'; }
  });
  out.fallbackUsed = logs.filter((l) => /fallback to main-thread grading/.test(l));
  out.persistWarn = logs.filter((l) => /persist learning evidence failed/.test(l));
  out.resultScreenTail = await page.evaluate(() =>
    (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(-400));

  // ---- reload survival: the actual user-visible outcome of the hotfix ----
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.goto('http://localhost:3000/csca/voyage#error-review', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  out.afterReload = {
    errorRecordsStillPresent: await page.evaluate(() => {
      try {
        const a = JSON.parse(localStorage.getItem('csca_error_records') || '[]');
        return Array.isArray(a) ? a.length : null;
      } catch { return 'parse-error'; }
    }),
    studyPlanStillPresent: await page.evaluate(() => !!localStorage.getItem('csca_study_plan')),
    errorReviewScreen: await page.evaluate(() =>
      (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(700, 2400)),
  };

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
