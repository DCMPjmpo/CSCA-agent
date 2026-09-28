import { chromium } from '@playwright/test';
let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ channel: 'msedge' });
}
for (const route of ['/', '/csca', '/csca-multi-agent']) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const chunks = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
  });
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('/_next/static') && /\.js($|\?)/.test(u)) chunks.push(u.split('/').pop());
  });
  await page.goto('http://localhost:3099' + route, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const jsBytes = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((r) => r.name.includes('/_next/static') && /\.js($|\?)/.test(r.name))
      .reduce((s, r) => s + r.transferSize, 0),
  );
  console.log(`\n=== ${route} ===`);
  console.log('console errors:', errors.length ? errors : 'none');
  console.log(
    'js chunks loaded:',
    chunks.length,
    '| total js gzip KB:',
    Math.round(jsBytes / 1024),
  );
  console.log(
    'echarts chunk loaded:',
    chunks.some((c) => /^(b0ef93535421443a|8a045f941e8e1e70)\.js$/.test(c)),
  );
  await ctx.close();
}
await browser.close();
