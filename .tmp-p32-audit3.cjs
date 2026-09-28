const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const OUT = path.join(process.cwd(), '.tmp-p32-shots');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const out = {};

  // Chinese locale voyage
  await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('csca_locale', 'zh-CN');
    localStorage.setItem('csca_learning_session', JSON.stringify({
      currentStep:'mock_exam', activeStep:3, completedStages:[0,1,2],
      diagnosisResult:{requiredSubjects:['数学','物理'],recommendedSubjects:['化学'],subjectPriorities:{数学:1},estimatedDays:90},
      selectedSubjects:['数学','物理'], selectedCountryCode:'TH', targetMajorId:'computer-science',
      hskLevel:4, locale:'zh-CN', examScore:72,
      answerHistory: Array.from({length:23},(_,i)=>({questionId:'q'+i,subject:i%3?'物理':'数学',knowledgePoint:['函数','力学'][i%2],module:['代数','运动学'][i%2],isCorrect:i%3!==0,difficulty:'medium',mode:'practice',timestamp:Date.now()-i*3600000})),
    }));
  });
  await page.goto(BASE + '/csca/voyage', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(OUT, '25-voyage-zh.png'), fullPage: false });
  out.voyageZh = {
    h1: await page.locator('h1').first().innerText().catch(()=>null),
    // measure ribbon cell text truncation
    ribbon: await page.evaluate(() => {
      const cells = [...document.querySelectorAll('button')].filter(b => b.querySelector('.voyage-eyebrow'));
      return cells.slice(0, 9).map(c => {
        const t = c.querySelector('span.font-semibold, .truncate, div');
        return { text: (c.innerText||'').replace(/\n/g,' | ').slice(0,60), w: Math.round(c.getBoundingClientRect().width), clipped: c.scrollWidth > c.clientWidth + 1 };
      });
    }),
  };

  // AI tutor step UI (where the inline assistant lives)
  await page.evaluate(() => { window.scrollTo(0,0); });
  const tutorBtn = page.locator('button:has-text("AI 航海助手"), button:has-text("AI Mate")').first();
  out.aiTutorEntry = {
    count: await page.locator('button:has-text("AI 航海助手"), button:has-text("AI Mate")').count(),
    label: await tutorBtn.innerText().catch(()=>null),
  };

  // multi-agent chat view: what does the assistant claim it can do
  await page.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  out.multiAgent = {
    placeholder: await page.locator('input,textarea').first().getAttribute('placeholder').catch(()=>null),
    quickChips: await page.locator('button').evaluateAll(bs => bs.map(b=>(b.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,30)),
    headings: await page.locator('h1,h2,h3').evaluateAll(hs => hs.map(h=>(h.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,10)),
  };

  // wrong-answer page
  await page.goto(BASE + '/csca/wrong-answer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  out.wrongAnswer = {
    headings: await page.locator('h1,h2,h3').evaluateAll(hs => hs.map(h=>(h.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,10)),
    links: await page.locator('a').evaluateAll(as=>as.map(a=>({t:(a.innerText||'').replace(/\s+/g,' ').trim().slice(0,30),h:a.getAttribute('href')})).slice(0,20)),
  };

  // heading-language census across key pages
  out.langCensus = {};
  for (const r of ['/', '/csca', '/csca/voyage', '/csca-multi-agent', '/csca/case-study', '/csca/wrong-answer', '/csca/onboarding']) {
    await page.goto(BASE + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    const heads = await page.locator('h1,h2,h3,h4').evaluateAll(hs => hs.map(h => (h.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,14));
    let han = 0, latin = 0;
    for (const h of heads) { if (/[一-鿿]/.test(h)) han++; if (/[A-Za-z]{3,}/.test(h)) latin++; }
    out.langCensus[r] = { total: heads.length, withHan: han, withLatin: latin, sample: heads.slice(0, 8) };
  }

  fs.writeFileSync(path.join(OUT, 'results3.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
