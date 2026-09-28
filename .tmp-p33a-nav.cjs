// P3.3-A verification: P0-1 navigation wiring
// 断言口径：以 App 自己持久化的 localStorage['csca_learning_session'].currentStep
// 作为"当前真实 step"的证据（saveCscaSession 在每次 step 变化时写入），
// 不依赖脆弱的 DOM class 选择器。
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), '.tmp-p33a-shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';

const STAGE_EXPECT = [
  { id: 'stage1', hash: 'diagnosis', step: 'diagnosis', index: 0 },
  { id: 'stage2', hash: 'knowledge-map', step: 'knowledge_map', index: 1 },
  { id: 'stage3', hash: 'adaptive-learning', step: 'adaptive_learning', index: 2 },
  { id: 'stage4', hash: 'mock-exam', step: 'exam_center', index: 3 },
  { id: 'stage5', hash: 'score-analysis', step: 'result', index: 5 },
  { id: 'stage6', hash: 'error-review', step: 'error_review', index: 6 },
  { id: 'stage7', hash: 'study-plan', step: 'study_plan', index: 7 },
  { id: 'stage9', hash: 'university-match', step: 'university_match', index: 8 },
];

const CARD_EXPECT = [
  { anchor: 'diagnosis', step: 'diagnosis' },
  { anchor: 'knowledge-map', step: 'knowledge_map' },
  { anchor: 'adaptive-learning', step: 'adaptive_learning' },
  { anchor: 'mock-exam', step: 'exam_center' },
  { anchor: 'score-analysis', step: 'result' },
  { anchor: 'error-review', step: 'error_review' },
  { anchor: 'study-plan', step: 'study_plan' },
  { anchor: 'university-match', step: 'university_match' },
];

const HIGH_SESSION = {
  currentStep: 'university_match',
  activeStep: 9,
  completedStages: [0, 1, 2, 3, 4, 5, 6, 7],
  diagnosisResult: {
    requiredSubjects: ['数学', '物理'], recommendedSubjects: ['化学'],
    subjectPriorities: { '数学': 1 }, estimatedDays: 90,
  },
  selectedSubjects: ['数学', '物理'], selectedCountryCode: 'TH',
  targetMajorId: 'computer-science', hskLevel: 4, locale: 'zh-CN', examScore: 72,
  answerHistory: Array.from({ length: 23 }, (_, i) => ({
    questionId: 'q' + i, subject: i % 3 ? '物理' : '数学',
    knowledgePoint: ['函数', '力学'][i % 2], module: ['代数', '运动学'][i % 2],
    isCorrect: i % 3 !== 0, difficulty: 'medium', mode: 'practice',
    timestamp: Date.now() - i * 3600000,
  })),
};

const readStep = (page) => page.evaluate(() => {
  try {
    const raw = localStorage.getItem('csca_learning_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    return { currentStep: s.currentStep ?? null, activeStep: s.activeStep ?? null };
  } catch { return null; }
});
const url = (page) => page.evaluate(() => ({ pathname: location.pathname, hash: location.hash }));

async function seed(page, session) {
  await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => {
    localStorage.setItem('csca_learning_session', JSON.stringify(s));
    localStorage.setItem('csca_locale', 'zh-CN');
  }, session);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 180)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 180)));

  const out = { sidebar: [], sidebarHrefs: [], inAppHash: {}, newUserSidebar: {}, landingCards: [], landingCta: {}, multiAgent: {}, consoleErrors: [] };

  // ============ A. 侧栏逐项点击 ============
  await seed(page, HIGH_SESSION);
  await page.goto(BASE + '/csca/voyage#university-match', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  out.sidebarHrefs = await page
    .locator('[data-testid="voyage-nav-desktop"] a')
    .evaluateAll((as) => as.map((a) => ({ t: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 26), href: a.getAttribute('href') })));

  for (const exp of STAGE_EXPECT) {
    // 每次点击前把 session 重置到高进度（university-match => idx 8 => 9 段全部非 locked）；
    // university-match 自身改从 diagnosis 重置，避免"目标 == 当前"的空验证。
    const reset = exp.hash === 'university-match' ? 'diagnosis' : 'university-match';
    await page.goto(`${BASE}/csca/voyage#${reset}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2400);
    const link = page.locator(`[data-testid="voyage-nav-desktop"] a[href="/csca/voyage#${exp.hash}"]`);
    const cnt = await link.count();
    const rec = { ...exp, linkFound: cnt, resetFrom: reset };
    if (cnt) {
      await link.first().click();
      await page.waitForTimeout(2600);
      rec.url = await url(page);
      rec.state = await readStep(page);
      rec.stepOk = rec.state?.currentStep === exp.step;
      rec.indexOk = rec.state?.activeStep === exp.index;
      rec.stayedInApp = rec.url.pathname === '/csca/voyage';
      rec.h1 = await page.locator('h1').first().innerText().catch(() => null);
    }
    await page.screenshot({ path: path.join(OUT, `nav-${exp.id}.png`), fullPage: false });
    out.sidebar.push(rec);
  }

  // ============ A2. 已在 /csca/voyage 内点击侧栏（同文档 hash 变化） ============
  await seed(page, HIGH_SESSION);
  await page.goto(BASE + '/csca/voyage#diagnosis', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const before = await readStep(page);
  await page.locator('[data-testid="voyage-nav-desktop"] a[href="/csca/voyage#knowledge-map"]').first().click();
  await page.waitForTimeout(2600);
  out.inAppHash = {
    before, after: await readStep(page), url: await url(page),
    h1: await page.locator('h1').first().innerText().catch(() => null),
  };
  out.inAppHash.ok = out.inAppHash.after?.currentStep === 'knowledge_map' && out.inAppHash.url.pathname === '/csca/voyage';
  await page.screenshot({ path: path.join(OUT, 'nav-inapp-hash.png'), fullPage: false });

  // ============ A3. 新用户（无 session）侧栏门控观测 ============
  await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('csca_learning_session');
    localStorage.setItem('csca_locale', 'zh-CN');
  });
  await page.goto(BASE + '/csca/voyage', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  out.newUserSidebar = {
    state: await readStep(page),
    hrefs: await page.locator('[data-testid="voyage-nav-desktop"] a').evaluateAll((as) =>
      as.map((a) => ({ t: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 20), href: a.getAttribute('href') }))),
  };
  await page.screenshot({ path: path.join(OUT, 'nav-newuser-sidebar.png'), fullPage: false });

  // ============ B. 首页 8 段卡片 + header CTA ============
  await seed(page, HIGH_SESSION);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  out.landingCta = {
    href: await page.locator('a[href="/csca/voyage#knowledge-map"]').first().getAttribute('href').catch(() => null),
    oldDeadHrefCount: await page.locator('a[href="/csca#knowledge-map"]').count(),
  };

  for (const exp of CARD_EXPECT) {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    const link = page.locator(`a[href="/csca/voyage#${exp.anchor}"]`);
    const cnt = await link.count();
    const rec = { ...exp, linkFound: cnt };
    if (cnt) {
      await link.last().click();
      await page.waitForTimeout(3200);
      rec.url = await url(page);
      rec.state = await readStep(page);
      rec.stepOk = rec.state?.currentStep === exp.step;
    }
    out.landingCards.push(rec);
  }
  await page.screenshot({ path: path.join(OUT, 'landing-after-card.png'), fullPage: false });

  // ============ C. AI Mate 快捷 chip（chat 视图） ============
  await seed(page, HIGH_SESSION);
  await page.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2800);
  await page.locator('[data-testid="view-chat"]').first().click();
  await page.waitForTimeout(1200);
  const toggle = page.locator('[data-testid="flags-toggle"]');
  out.multiAgent = { chatView: true, toggleFound: await toggle.count(), chips: [] };
  if (out.multiAgent.toggleFound) {
    await toggle.first().click();
    await page.waitForTimeout(900);
    out.multiAgent.chips = await page.locator('[data-testid="flag-chip"]').evaluateAll((bs) =>
      bs.map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim()));
    await page.screenshot({ path: path.join(OUT, 'multagent-chips.png'), fullPage: false });

    const clickChip = async (nth, expectHash) => {
      await page.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2400);
      await page.locator('[data-testid="view-chat"]').first().click();
      await page.waitForTimeout(900);
      await page.locator('[data-testid="flags-toggle"]').first().click();
      await page.waitForTimeout(800);
      const n = await page.locator('[data-testid="flag-chip"]').count();
      if (n <= nth) return { nth, skipped: true, count: n };
      await page.locator('[data-testid="flag-chip"]').nth(nth).click();
      await page.waitForTimeout(3200);
      const u = await url(page);
      return { nth, label: out.multiAgent.chips[nth], url: u, state: await readStep(page), ok: u.pathname === '/csca/voyage' && u.hash === expectHash };
    };
    out.multiAgent.chipProgress = await clickChip(2, '#study-plan');
    out.multiAgent.chipMockExam = await clickChip(4, '#mock-exam');
  }

  out.consoleErrors = [...new Set(errors)].slice(0, 15);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(out, null, 2));

  // ---- verdict summary ----
  const sidebarFail = out.sidebar.filter((s) => !s.stepOk || !s.indexOk || !s.stayedInApp);
  const cardFail = out.landingCards.filter((c) => !c.stepOk);
  console.log('SIDEBAR :', out.sidebar.map((s) => `${s.id}=${s.stepOk && s.indexOk ? 'OK' : 'FAIL'}`).join(' '));
  console.log('CARDS   :', out.landingCards.map((c) => `${c.anchor}=${c.stepOk ? 'OK' : 'FAIL'}`).join(' '));
  console.log('CTA     :', JSON.stringify(out.landingCta));
  console.log('INAPP   :', out.inAppHash.ok, JSON.stringify(out.inAppHash.after), out.inAppHash.url.hash);
  console.log('MULTIAGT:', JSON.stringify(out.multiAgent.chipProgress), JSON.stringify(out.multiAgent.chipMockExam));
  console.log('NEWUSER :', out.newUserSidebar.hrefs.filter((h) => h.href && h.href.includes('/csca/voyage')).map((h) => h.href).join(' '));
  console.log('FAILS   : sidebar=' + sidebarFail.length + ' cards=' + cardFail.length);
  console.log('CONSOLE :', JSON.stringify(out.consoleErrors));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
