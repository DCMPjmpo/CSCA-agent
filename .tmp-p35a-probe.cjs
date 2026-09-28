/* P3.5-A recon probe — read-only recon of /csca/voyage. Temp artifact, not production code. */
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('csca_locale', 'zh'); } catch {}
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

  await page.goto('http://localhost:3000/csca/voyage', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(6000);

  // Q: can a dedicated Web Worker touch localStorage at all?
  const workerLs = await page.evaluate(async () => {
    return await new Promise((resolve) => {
      try {
        const src =
          "try{ localStorage.setItem('__p35a_probe','1');" +
          " const v=localStorage.getItem('__p35a_probe');" +
          " localStorage.removeItem('__p35a_probe');" +
          " self.postMessage('AVAILABLE:'+v); }" +
          "catch(e){ self.postMessage('THROWS:'+e.name+':'+e.message); }";
        const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
        const w = new Worker(url);
        w.onmessage = (ev) => { try { w.terminate(); } catch {} resolve(ev.data); };
        w.onerror = (ev) => { try { w.terminate(); } catch {} resolve('ONERROR:' + (ev.message || 'unknown')); };
        setTimeout(() => { try { w.terminate(); } catch {} resolve('TIMEOUT'); }, 8000);
      } catch (e) { resolve('CONSTRUCT_FAIL:' + e.message); }
    });
  });

  const ls = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || '';
      out[k] = v.length > 240 ? v.slice(0, 240) + `...(${v.length} chars)` : v;
    }
    return out;
  });

  const info = await page.evaluate(() => ({
    url: location.href,
    buttons: Array.from(document.querySelectorAll('button'))
      .map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 100),
    anchors: Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && (h.includes('#') || h.includes('/csca')))
      .slice(0, 60),
    bodyText: (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1800),
  }));

  console.log(JSON.stringify({ workerLs, ls, info, logs: logs.slice(0, 80) }, null, 2));
  await browser.close();
})();
