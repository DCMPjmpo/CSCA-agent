const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const OUT = path.join(process.cwd(), '.tmp-p32-shots');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const log = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) log.push('NAV ' + f.url()); });

  // --- T1: landing -> click stage card 02 (href /csca#knowledge-map) ---
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const card02 = page.locator('a[href="/csca#knowledge-map"]');
  const t1 = { cardCount: await card02.count() };
  if (await card02.count()) {
    await card02.last().click();          // last = the big stage card (sidebar one is #-locked)
    await page.waitForTimeout(3000);
    t1.url = page.url();
    t1.hash = await page.evaluate(() => location.hash);
    t1.h1 = await page.locator('h1').first().innerText().catch(()=>null);
    t1.anchorExists = await page.evaluate(() => !!document.getElementById('knowledge-map'));
    t1.scrollY = await page.evaluate(() => window.scrollY);
  }
  await page.screenshot({ path: path.join(OUT, '20-landing-card02-click.png'), fullPage: false });

  // --- T2: /csca -> click AI PPT card ---
  await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const ppt = page.locator('a[href="/csca/voyage#error_review"]');
  const t2 = { count: await ppt.count(), href: await ppt.first().getAttribute('href').catch(()=>null) };
  if (await ppt.count()) {
    await ppt.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await ppt.first().click();
    await page.waitForTimeout(6000);
    t2.url = page.url();
    t2.hash = await page.evaluate(() => location.hash);
    t2.h1 = await page.locator('h1').first().innerText().catch(()=>null);
    t2.headings = await page.locator('h1,h2,h3').evaluateAll(hs => hs.map(h=>(h.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,10));
    t2.hasDiagnosisForm = await page.evaluate(() => document.body.innerText.includes('诊断') || document.body.innerText.includes('Diagnosis'));
    t2.mentionsErrorReview = await page.evaluate(() => /错题|触礁/.test(document.body.innerText));
  }
  await page.screenshot({ path: path.join(OUT, '21-ai-ppt-card-click.png'), fullPage: false });

  // --- T3: /csca/voyage#error_review direct, and #diagnosis ---
  const t3 = {};
  for (const h of ['error_review', 'diagnosis', 'error-analysis', 'ai-tutor']) {
    await page.goto(`${BASE}/csca/voyage#${h}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    t3[h] = {
      headerTitle: await page.locator('h1').first().innerText().catch(()=>null),
      firstHeading: await page.locator('h2,h3').first().innerText().catch(()=>null),
      hasDiagnosisUI: await page.evaluate(() => /东盟|ASEAN|目标专业|HSK/.test(document.body.innerText)),
    };
    await page.screenshot({ path: path.join(OUT, `22-voyage-hash-${h}.png`), fullPage: false });
  }

  // --- T4: task page back-link target ---
  await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('MAIC-Database'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
    const db = await open();
    const tx = db.transaction('pilarCoreTasks','readwrite');
    const now = new Date().toISOString();
    tx.objectStore('pilarCoreTasks').put({ taskId:'p32-clean-ppt', openmaicJobId:'1aIjs60YXK', capability:'ppt',
      status:'pending', returnUrl:'/csca#error_review', voyageStageId:'error_review', requirement:'错题针对性学习课堂',
      createdAt: now, updatedAt: now });
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
  });
  await page.goto(BASE + '/csca/tasks/p32-clean-ppt', { waitUntil: 'networkidle' });
  await page.waitForTimeout(9000);
  const t4 = {
    body: (await page.locator('main').innerText()).replace(/\s+/g,' ').slice(0,900),
    backHref: await page.locator('main a').evaluateAll(as => as.map(a=>a.getAttribute('href'))),
    jsonLdAnchor: await page.evaluate(() => !!document.getElementById('error_review')),
  };
  await page.screenshot({ path: path.join(OUT, '23-task-failed-clean.png'), fullPage: true });

  // --- T5: classroom with NO pilar task record (cleared DB) ---
  await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const cleared = await page.evaluate(async () => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('MAIC-Database'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
    const db = await open();
    const tx = db.transaction('pilarCoreTasks','readwrite');
    tx.objectStore('pilarCoreTasks').clear();
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
    return 'cleared';
  });
  await page.goto(BASE + '/classroom/B-wKH9rHN7', { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);
  const t5 = {
    cleared, url: page.url(),
    backPill: await page.locator('button:has-text("返回 PilarCore")').count(),
    globalNav: await page.locator('[data-testid="voyage-nav-desktop"]').count(),
    anyLink: await page.locator('a').evaluateAll(as=>as.map(a=>({t:(a.innerText||'').trim().slice(0,30),h:a.getAttribute('href')})))
  };
  await page.screenshot({ path: path.join(OUT, '24-classroom-no-task-record.png'), fullPage: false });

  fs.writeFileSync(path.join(OUT, 'results2.json'), JSON.stringify({ t1, t2, t3, t4, t5, navLog: log }, null, 2));
  console.log(JSON.stringify({ t1, t2, t3, t4, t5 }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
