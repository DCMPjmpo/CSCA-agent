/* P3.5-A probe 3: reach the exam centre via hash and dump its controls. Temp artifact. */
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
          currentStep: 'exam_center',
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
  const net = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('request', (r) => { if (/mock-exam/.test(r.url())) net.push(`REQ ${r.method()} ${r.url()}`); });
  page.on('response', async (r) => { if (/mock-exam/.test(r.url())) net.push(`RES ${r.status()} ${r.url()}`); });

  await page.goto('http://localhost:3000/csca/voyage#mock-exam', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);

  const snap = async (tag) => ({
    tag,
    buttons: await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map((x) => (x.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .filter((t) => t.length < 60)
        .slice(0, 60),
    ),
    body: await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 900)),
  });

  const out = { a: await snap('exam-center') };

  // click the most likely "start exam" control
  const started = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pats = [/开始.*(考试|试航|模拟)/, /正式考试/, /开始答题/, /生成.*试卷/, /进入考试/];
    for (const p of pats) {
      const t = btns.find((x) => p.test((x.textContent || '').trim()));
      if (t) { const s = (t.textContent || '').replace(/\s+/g, ' ').trim(); t.click(); return s; }
    }
    return null;
  });
  out.started = started;
  await page.waitForTimeout(15000);
  out.b = await snap('after-start');
  out.net = net;
  out.logs = logs.slice(0, 40);

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
