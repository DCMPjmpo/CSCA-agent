/* P3.5-B verification: is the next learning action actually decision-driven and
   actually navigable? Walks a real practice voyage on the real dev server.
   Read-only w.r.t. the repo. Temp artifact. */
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  // seed only on first load — addInitScript re-runs on reload and would wipe the
  // very records we are verifying survive (P3.5-B0 trap).
  await ctx.addInitScript(() => {
    try {
      if (sessionStorage.getItem('p35b-seeded')) return;
      sessionStorage.setItem('p35b-seeded', '1');
      localStorage.setItem('csca_locale', 'zh');
      localStorage.removeItem('csca_error_records');
      localStorage.removeItem('csca_study_plan');
      localStorage.setItem(
        'csca_learning_session',
        JSON.stringify({
          currentStep: 'mock-exam', activeStep: 3, completedStages: [0, 1, 2],
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

  const persisted = () =>
    page.evaluate(() => {
      try {
        const s = JSON.parse(localStorage.getItem('csca_learning_session') || '{}');
        return { currentStep: s.currentStep, completedStages: s.completedStages };
      } catch { return { err: 'parse' }; }
    });

  const out = {};

  // ---- 1. clean-ish state: footer label should be the decision's target ----
  await page.goto('http://localhost:3000/csca/voyage#mock-exam', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  out.footerLabelBeforeExam = await page.evaluate(() => {
    const m = (document.body.innerText || '').match(/下一步：[^\n]+/);
    return m ? m[0].trim() : null;
  });

  // ---- 2. take the exam so an exam result exists ----
  out.started = await clickByText(/开始试航演练/);
  await page.waitForTimeout(30000); // cold-compile slack (P3.5-B0 trap)

  for (let i = 0; i < 60; i++) {
    const before = await progress();
    await clickByText(/^[A-D]{1,2}\.\s/);
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
  await page.waitForTimeout(15000);

  out.afterExam = await persisted();
  // REGRESSION LOCK: the dead key must never be written again.
  out.deadKeyWritten = out.afterExam.currentStep === 'exam-analysis';

  // ---- 3. the result card is now a REAL clickable button ----
  out.resultStep = await page.evaluate(() => {
    const t = (document.body.innerText || '').replace(/\n{2,}/g, '\n');
    const i = t.indexOf('下一步');
    return i === -1 ? null : t.slice(i, i + 220);
  });
  out.nextActionCard = await page.evaluate(() => {
    // the recommended-next block lives under the ability panel
    const nodes = Array.from(document.querySelectorAll('button'));
    const b = nodes.find((x) => /前往/.test(x.textContent || ''));
    if (!b) return null;
    return {
      tag: b.tagName,
      text: (b.textContent || '').replace(/\s+/g, ' ').trim(),
      hrefBefore: location.href,
    };
  });

  // ---- 4. clicking it actually navigates ----
  out.clickedCard = await clickByText(/前往/);
  await page.waitForTimeout(4000);
  out.hashAfterCardClick = await page.evaluate(() => location.hash);
  out.afterCardClick = await persisted();

  // ---- 5. reload: decision is stable because evidence is persisted ----
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  out.afterReload = await persisted();
  out.errorRecordsAfterReload = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('csca_error_records') || '[]').length; }
    catch { return 'parse-error'; }
  });

  // ---- 6. anti-loop: stage 5 already complete + errors still present ----
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('csca_learning_session') || '{}');
    s.completedStages = [0, 1, 2, 3, 4, 5];
    localStorage.setItem('csca_learning_session', JSON.stringify(s));
  });
  await page.goto('http://localhost:3000/csca/voyage#study-plan', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  out.antiLoop = await page.evaluate(() => {
    const t = (document.body.innerText || '').replace(/\n{2,}/g, '\n');
    const m = t.match(/下一步：[^\n]+/);
    return { footerLabel: m ? m[0].trim() : null, recommendsErrorReview: /下一步：错题修正/.test(t) };
  });

  out.pageErrors = logs.filter((l) => /pageerror/.test(l));

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
