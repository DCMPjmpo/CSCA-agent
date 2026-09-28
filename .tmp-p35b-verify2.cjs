/* P3.5-B probe 2: focused checks on the remaining decision branches —
   error_review navigation by hash, and the cross-page ai_tutor jump. */
const { chromium } = require('@playwright/test');

async function run(caseName, seed, expectLabel, expectHashRe, clickTextRe) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript((s) => {
    try {
      if (sessionStorage.getItem('p35b2-seeded')) return;
      sessionStorage.setItem('p35b2-seeded', '1');
      localStorage.setItem('csca_locale', 'zh');
      localStorage.setItem('csca_error_records', JSON.stringify(
        Array.from({ length: 5 }, (_, i) => ({
          id: `e${i}`, questionId: `q${i}`, question: 'stem', subject: '数学',
          module: '代数', userAnswer: 0, correctAnswer: 1, isCorrect: false, timestamp: i,
        })),
      ));
      localStorage.setItem('csca_learning_session', JSON.stringify({
        currentStep: 'result', activeStep: 5, completedStages: s.completedStages,
        answerHistory: s.answerHistory || [],
        examScore: 55, selectedSubjects: ['数学'], selectedCountryCode: 'TH',
        targetMajorId: 'medicine', hskLevel: 4, locale: 'zh', updatedAt: Date.now(),
      }));
    } catch {}
  }, seed);

  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  await page.goto('http://localhost:3000/csca/voyage#score-analysis', {
    waitUntil: 'domcontentloaded', timeout: 90000,
  });
  await page.waitForTimeout(7000);

  const label = await page.evaluate(() => {
    const m = (document.body.innerText || '').match(/下一步：[^\n]+/);
    return m ? m[0].trim() : null;
  });

  const clicked = await page.evaluate((rs) => {
    const rx = new RegExp(rs);
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      rx.test((x.textContent || '').replace(/\s+/g, ' ').trim()));
    if (b) { b.click(); return (b.textContent || '').replace(/\s+/g, ' ').trim(); }
    return null;
  }, clickTextRe.source);
  await page.waitForTimeout(4500);
  const result = {
    case: caseName,
    footerLabel: label,
    labelMatches: label === expectLabel,
    clicked,
    url: await page.evaluate(() => location.pathname + location.hash),
    urlMatches: await page.evaluate((re) => new RegExp(re).test(location.pathname + location.hash), expectHashRe.source),
    persistedStep: await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('csca_learning_session') || '{}').currentStep; }
      catch { return 'parse-error'; }
    }),
    pageErrors: errs,
  };
  await browser.close();
  return result;
}

(async () => {
  const results = [];

  // A: score-analysis done + errors present -> error_review, navigates by hash
  // (click the StageFooter next button — it is always rendered, unlike the
  //  result card which needs examResult React state that seeding cannot provide)
  results.push(await run(
    'error_review (stage4 done, 5 errors)',
    { completedStages: [0, 1, 2, 3, 4] },
    '下一步：错题修正',
    /#error-review$/,
    /^下一步：/,
  ));

  // B: everything done except ai_tutor -> cross-page jump to /csca-multi-agent
  results.push(await run(
    'ai_tutor (all but stage7 done)',
    {
      completedStages: [0, 1, 2, 3, 4, 5, 6, 8],
      answerHistory: [
        { questionId: 'a', subject: '数学', knowledgePoint: '代数', isCorrect: false, mode: 'practice', timestamp: 1 },
        { questionId: 'b', subject: '数学', knowledgePoint: '代数', isCorrect: false, mode: 'practice', timestamp: 2 },
        { questionId: 'c', subject: '数学', knowledgePoint: '代数', isCorrect: false, mode: 'practice', timestamp: 3 },
      ],
    },
    '下一步：AI 答疑',
    /^\/csca-multi-agent/,
    /^下一步：/,
  ));

  console.log(JSON.stringify(results, null, 2));
})();
