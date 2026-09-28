/* P3.5-A probe 5: which ids does a practice exam actually serve, and do they survive
   into answerHistory? Captures the /api/csca/mock-exam response body. Temp artifact. */
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('csca_locale', 'zh');
      localStorage.removeItem('csca_error_records');
      localStorage.removeItem('csca_study_plan');
      localStorage.setItem('csca_learning_session', JSON.stringify({
        currentStep: 'exam_center', activeStep: 3, completedStages: [0, 1, 2],
        answerHistory: [], selectedSubjects: ['数学'], selectedCountryCode: 'TH',
        targetMajorId: 'medicine', hskLevel: 4, locale: 'zh', updatedAt: Date.now(),
      }));
    } catch {}
  });
  const page = await ctx.newPage();
  let apiBody = null;
  page.on('response', async (r) => {
    if (/\/api\/csca\/mock-exam/.test(r.url()) && r.request().method() === 'POST') {
      try { apiBody = await r.json(); } catch (e) { apiBody = { parseError: String(e) }; }
    }
  });

  const clickByText = (re) =>
    page.evaluate((rs) => {
      const rx = new RegExp(rs);
      const b = Array.from(document.querySelectorAll('button')).find((x) => rx.test((x.textContent || '').replace(/\s+/g, ' ').trim()));
      if (b) { b.click(); return (b.textContent || '').replace(/\s+/g, ' ').trim(); }
      return null;
    }, re.source);

  const progress = () => page.evaluate(() => {
    const m = (document.body.innerText || '').match(/答题进度\s*([\d]+\s*\/\s*\d+)/);
    return m ? m[1].replace(/\s/g, '') : null;
  });

  await page.goto('http://localhost:3000/csca/voyage#mock-exam', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  await clickByText(/开始试航演练/);
  await page.waitForTimeout(12000);

  const out = {};
  const qs = apiBody && (apiBody.questions || apiBody.data?.questions);
  out.apiTopKeys = apiBody ? Object.keys(apiBody) : null;
  out.sourceStats = apiBody && (apiBody.sourceStats || apiBody.data?.sourceStats);
  out.servedIds = Array.isArray(qs) ? qs.map((q) => q.id) : null;
  out.servedCount = Array.isArray(qs) ? qs.length : null;

  for (let i = 0; i < 60; i++) {
    const before = await progress();
    await clickByText(/^[A-D]{1,2}\.\s/);
    await page.waitForTimeout(600);
    const after = await progress();
    if (after && after !== before) {
      if (after === '28/28' || /\/28$/.test(after) && after.split('/')[0] === after.split('/')[1]) break;
    } else {
      const nx = await clickByText(/下一题/);
      if (!nx) break;
      await page.waitForTimeout(400);
    }
  }
  await clickByText(/^提交试航/);
  await page.waitForTimeout(10000);

  const hist = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('csca_learning_session') || '{}');
      const h = s.answerHistory || [];
      return { len: h.length, ids: h.map((r) => r.questionId), sample: h.slice(0, 4) };
    } catch (e) { return { err: String(e) }; }
  });
  out.answerHistory = hist;
  out.mockStyleIds = hist.ids ? hist.ids.filter((x) => /-mock-/.test(x)).length : null;
  out.bankStyleIds = hist.ids ? hist.ids.filter((x) => !/-mock-/.test(x)).slice(0, 12) : null;
  out.hasErrorRecords = await page.evaluate(() => !!localStorage.getItem('csca_error_records'));

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
