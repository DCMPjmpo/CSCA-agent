const { chromium } = require('@playwright/test');
const BASE = 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + '/csca', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('csca_learning_session', JSON.stringify({
      currentStep: 'diagnosis', activeStep: 0, completedStages: [], locale: 'zh-CN',
      selectedSubjects: ['数学'], selectedCountryCode: 'TH', hskLevel: 4,
    }));
    localStorage.setItem('csca_locale', 'zh-CN');
  });
  await page.goto(BASE + '/csca/voyage#diagnosis', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    window.__ev = [];
    window.addEventListener('hashchange', () => window.__ev.push('hashchange:' + location.hash));
    window.addEventListener('popstate', () => window.__ev.push('popstate:' + location.hash));
    const origPush = history.pushState.bind(history);
    history.pushState = function (...a) { window.__ev.push('pushState:' + a[2]); return origPush(...a); };
    const origRepl = history.replaceState.bind(history);
    history.replaceState = function (...a) { window.__ev.push('replaceState:' + a[2]); return origRepl(...a); };
  });
  await page.locator('[data-testid="voyage-nav-desktop"] a[href="/csca/voyage#knowledge-map"]').first().click();
  await page.waitForTimeout(2500);
  const ev = await page.evaluate(() => window.__ev);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('csca_learning_session') || '{}').currentStep);
  console.log('events:', JSON.stringify(ev));
  console.log('hash:', await page.evaluate(() => location.hash));
  console.log('currentStep after:', st);
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
