// P3.2 read-only UI/UX audit — browser evidence capture
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), '.tmp-p32-shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const results = {};

const ANCHORS = ['diagnosis','knowledge-map','adaptive-learning','mock-exam','score-analysis','error-analysis','study-plan','university-match','error_review','ai-tutor','classroom-generator'];

const SESSION_RETURNING = {
  currentStep: 'mock_exam',
  activeStep: 3,
  completedStages: [0,1,2],
  diagnosisResult: { requiredSubjects:['数学','物理'], recommendedSubjects:['化学'], subjectPriorities:{数学:1,物理:0.8}, estimatedDays: 90 },
  selectedSubjects: ['数学','物理'],
  selectedCountryCode: 'TH',
  targetMajorId: 'computer-science',
  hskLevel: 4,
  locale: 'zh-CN',
  examScore: 72,
  answerHistory: Array.from({length: 23}, (_, i) => ({
    questionId: 'q'+i, subject: i%3===0?'数学':'物理',
    knowledgePoint: ['函数','力学','电磁学','概率'][i%4],
    module: ['代数','运动学','电磁学','统计'][i%4],
    isCorrect: i%3!==0, difficulty:'medium',
    mode: i%5===0?'exam':'practice', timestamp: Date.now() - i*3600_000,
  })),
};
const ERRORS = Array.from({length: 5}, (_, i) => ({
  id: 'err'+i, subject: i%2?'物理':'数学', module: ['电磁学','函数','运动学'][i%3],
  knowledgePoint: ['电场','导数','牛顿定律'][i%3], timestamp: Date.now()-i*7200_000,
}));

async function shot(page, name, full = true) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full });
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });

  // ---------- Desktop context ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,200)); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e).slice(0,200)));

  // ---- CP1: landing / fresh ----
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '01-landing-fresh');
  results.landing = {
    title: await page.title(),
    h1: await page.locator('h1').first().innerText().catch(()=>null),
    h2count: await page.locator('h2').count(),
    // count links on the landing page
    links: await page.locator('a').evaluateAll(as => as.map(a => ({ t: (a.innerText||'').replace(/\s+/g,' ').trim().slice(0,40), h: a.getAttribute('href') }))),
  };

  // ---- CP2: /csca fresh (new user) ----
  await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '02-csca-newuser');
  results.cscaNewUser = {
    bodyText: (await page.locator('body').innerText()).replace(/\s+/g,' ').slice(0, 1500),
    anchorHits: await page.evaluate(ids => ids.filter(id => !!document.getElementById(id)), ANCHORS),
  };

  // ---- CP3: dead-anchor test on /csca ----
  const sidebarStageLinks = await page.locator('[data-testid="voyage-nav-desktop"] a').evaluateAll(as =>
    as.map(a => ({ label: (a.innerText||'').replace(/\s+/g,' ').trim().slice(0,40), href: a.getAttribute('href') })));
  results.sidebarLinks = sidebarStageLinks;
  const beforeScroll = await page.evaluate(() => window.scrollY);
  const kmLink = page.locator('[data-testid="voyage-nav-desktop"] a[href="/csca#knowledge-map"]');
  if (await kmLink.count()) {
    await kmLink.first().click();
    await page.waitForTimeout(1200);
  }
  results.deadAnchorTest = {
    urlAfterClick: page.url(),
    scrollYBefore: beforeScroll,
    scrollYAfter: await page.evaluate(() => window.scrollY),
    anyAnchorPresent: await page.evaluate(ids => ids.filter(id => !!document.getElementById(id)), ANCHORS),
    h1After: await page.locator('h1').first().innerText().catch(()=>null),
  };
  await shot(page, '03-csca-after-stage-click');

  // ---- CP4: /csca returning user ----
  await page.evaluate(([s, e]) => {
    localStorage.setItem('csca_learning_session', JSON.stringify(s));
    localStorage.setItem('csca_error_records', JSON.stringify(e));
    localStorage.removeItem('settings-storage');
  }, [SESSION_RETURNING, ERRORS]);
  await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await shot(page, '04-csca-returning');
  results.cscaReturning = {
    heading: await page.locator('h1').first().innerText().catch(()=>null),
    sectionHeadings: await page.locator('h2,h3,h4').evaluateAll(hs => hs.map(h => (h.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean)),
  };

  // ---- CP5: AI PPT card -> where does it land? ----
  const pptCard = page.locator('a[href="/csca/voyage#error_review"]');
  results.aiPptCardCount = await pptCard.count();
  if (await pptCard.count()) {
    await pptCard.first().click();
    await page.waitForTimeout(2500);
    results.aiPptClick = {
      url: page.url(),
      hash: await page.evaluate(() => window.location.hash),
      headerTitle: await page.locator('h1').first().innerText().catch(()=>null),
      visibleHeadings: await page.locator('h2,h3').evaluateAll(hs => hs.map(h => (h.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,10)),
    };
    await shot(page, '05-after-ai-ppt-click');
  }

  // ---- CP6: /csca/voyage direct ----
  await page.goto(BASE + '/csca/voyage', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot(page, '06-csca-voyage', false);
  results.voyage = {
    headerTitle: await page.locator('h1').first().innerText().catch(()=>null),
    headings: await page.locator('h2,h3,h4').evaluateAll(hs => hs.map(h => (h.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,12)),
    buttons: await page.locator('button').evaluateAll(bs => bs.map(b => (b.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,25)),
    countdown: await page.evaluate(() => document.body.innerText.includes('诊断')),
  };

  // ---- CP7: from /csca/voyage, click sidebar stage 02 ----
  const km2 = page.locator('[data-testid="voyage-nav-desktop"] a[href="/csca#knowledge-map"]');
  if (await km2.count()) {
    const urlBefore = page.url();
    await km2.first().click();
    await page.waitForTimeout(2000);
    results.leaveVoyageBySidebar = {
      urlBefore, urlAfter: page.url(),
      headerAfter: await page.locator('h1').first().innerText().catch(()=>null),
    };
    await shot(page, '07-after-sidebar-stage-from-voyage');
  }

  // ---- CP8: seed PilarCore tasks in IndexedDB, screenshot task page ----
  await page.goto(BASE + '/csca', { waitUntil: 'networkidle' }); // ensure DB open
  await page.waitForTimeout(1500);
  const seeded = await page.evaluate(async () => {
    const open = () => new Promise((res, rej) => {
      const r = indexedDB.open('MAIC-Database');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const db = await open();
    const tx = db.transaction('pilarCoreTasks', 'readwrite');
    const t = tx.objectStore('pilarCoreTasks');
    const now = new Date().toISOString();
    const recs = [
      { taskId: 'p32-succeeded-html', openmaicJobId: 'sbfW6kenNM', capability: 'html',
        status: 'pending', returnUrl: '/csca', requirement: '高中生物：光合作用的基本原理。生成一个帮助学生探索光照、二氧化碳和光合作用关系的交互式学习页面，包含知识解释和至少一种真实交互。',
        createdAt: now, updatedAt: now },
      { taskId: 'p32-failed-ppt', openmaicJobId: '1aIjs60YXK', capability: 'ppt',
        status: 'pending', returnUrl: '/csca#error_review', voyageStageId: 'error_review',
        requirement: '根据以下错题记录生成针对性学习课堂：薄弱科目 数学、物理；错题数量 5 道。',
        createdAt: now, updatedAt: now },
      { taskId: 'p32-running-html', openmaicJobId: 'p32-no-such-job-xyz', capability: 'html',
        status: 'pending', returnUrl: '/csca', requirement: '探索性主题：光合作用与光强关系（用于观察生成中状态）。',
        createdAt: now, updatedAt: now },
    ];
    for (const r of recs) t.put(r);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    return recs.map(r => r.taskId);
  });
  results.seededTasks = seeded;

  for (const [tid, name] of [['p32-succeeded-html','08-task-succeeded-html'],['p32-failed-ppt','09-task-failed-ppt'],['p32-running-html','10-task-running-or-error']]) {
    await page.goto(`${BASE}/csca/tasks/${tid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(7000); // allow the poll to settle
    await shot(page, name);
    results['task_' + tid] = {
      text: (await page.locator('main').innerText()).replace(/\s+/g,' ').slice(0, 1200),
      links: await page.locator('main a').evaluateAll(as => as.map(a => ({ t:(a.innerText||'').trim().slice(0,30), h:a.getAttribute('href') }))),
      buttons: await page.locator('main button').evaluateAll(bs => bs.map(b => (b.innerText||'').trim()).filter(Boolean)),
      hasGlobalNav: await page.locator('[data-testid="voyage-nav-desktop"]').count(),
    };
  }

  // ---- CP9: classroom with a matching task record (back pill) ----
  await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('MAIC-Database'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
    const db = await open();
    const tx = db.transaction('pilarCoreTasks','readwrite');
    const now = new Date().toISOString();
    tx.objectStore('pilarCoreTasks').put({ taskId:'p32-classroom-linked', openmaicJobId:'sbfW6kenNM', capability:'html',
      status:'succeeded', classroomId:'8O9nkhSuJt', returnUrl:'/csca', requirement:'光合作用',
      createdAt: now, updatedAt: now });
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
  });
  await page.goto(BASE + '/classroom/8O9nkhSuJt', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  await shot(page, '11-classroom-linked', false);
  results.classroomLinked = {
    backPill: await page.locator('button:has-text("返回 PilarCore")').count(),
    globalNav: await page.locator('[data-testid="voyage-nav-desktop"]').count(),
    sceneItems: await page.locator('[data-testid="scene-item"]').count(),
    bodyHead: (await page.locator('body').innerText()).replace(/\s+/g,' ').slice(0,600),
  };

  // ---- CP10: classroom WITHOUT a matching task record (no back pill) ----
  await page.goto(BASE + '/classroom/B-wKH9rHN7', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  await shot(page, '12-classroom-unlinked', false);
  results.classroomUnlinked = {
    backPill: await page.locator('button:has-text("返回 PilarCore")').count(),
    globalNav: await page.locator('[data-testid="voyage-nav-desktop"]').count(),
    sceneItems: await page.locator('[data-testid="scene-item"]').count(),
    links: await page.locator('a').evaluateAll(as => as.map(a => ({t:(a.innerText||'').trim().slice(0,25), h:a.getAttribute('href')})).slice(0,15)),
  };

  // ---- CP11: other routes ----
  for (const [route, name] of [['/csca-multi-agent','13-multi-agent'],['/csca/case-study','14-case-study'],['/csca/wrong-answer','15-wrong-answer'],['/csca/onboarding','16-onboarding'],['/csca/audit','17-audit']]) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await shot(page, name);
    results['route_' + route] = {
      h1: await page.locator('h1').first().innerText().catch(()=>null),
      headings: await page.locator('h1,h2,h3').evaluateAll(hs => hs.map(h => (h.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,10)),
      hasGlobalNav: await page.locator('[data-testid="voyage-nav-desktop"]').count(),
    };
  }

  results.consoleErrors = [...new Set(errors)].slice(0, 20);

  // ---------- Mobile context ----------
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  await mp.evaluate(() => {}).catch(()=>{});
  await mp.addInitScript(([s,e]) => {
    localStorage.setItem('csca_learning_session', JSON.stringify(s));
    localStorage.setItem('csca_error_records', JSON.stringify(e));
  }, [SESSION_RETURNING, ERRORS]);
  await mp.goto(BASE + '/csca', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(2500);
  await mp.screenshot({ path: path.join(OUT, '18-mobile-csca.png'), fullPage: false });
  await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(2000);
  await mp.screenshot({ path: path.join(OUT, '19-mobile-landing.png'), fullPage: false });
  results.mobile = {
    bottomNav: await mp.locator('[data-testid="voyage-nav-mobile"]').count(),
    desktopNav: await mp.locator('[data-testid="voyage-nav-desktop"]').count(),
  };

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
