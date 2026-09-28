import { chromium } from '@playwright/test';
let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ channel: 'msedge' });
}
const page = await browser.newPage();
const errors = [];
const sonnerUsed = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 160));
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 160)));
await page.goto('http://localhost:3099/csca', { waitUntil: 'load' });
await page.waitForTimeout(800);

// 1) click diagnosis button
const btn = page.getByRole('button', { name: /Start Diagnosis|开始诊断|เริ่มวินิจฉัย/i });
const btnCount = await btn.count();
console.log('diagnosis buttons found:', btnCount);
if (btnCount > 0) {
  await btn.first().click();
  // wait for knowledge-map step / fallback to complete
  await page.waitForTimeout(4000);
}
const url = page.url();
console.log(
  'step after diagnosis: knowledge map content visible =',
  await page
    .getByText('知识图谱', { exact: false })
    .first()
    .isVisible()
    .catch(() => false),
);
// 2) check echarts chunk loaded
const echartsLoaded = await page.evaluate(() =>
  performance
    .getEntriesByType('resource')
    .some(
      (r) =>
        r.name.includes('_next/static') &&
        /\.js$/.test(r.name) &&
        (r.name.includes('b0ef93535421443a') || r.name.includes('8a045f941e8e1e70')),
    ),
);
console.log('echarts chunk loaded after entering knowledge map:', echartsLoaded);
// 3) check canvas element rendered (echarts mounts a canvas)
const canvasCount = await page.locator('canvas').count();
console.log('canvas elements (echarts chart):', canvasCount);
// 4) step-fade animation class applied
const fadeCount = await page.locator('.csca-step-fade').count();
console.log('.csca-step-fade elements:', fadeCount);
// 5) language switcher present
const langCount = await page.locator('select, button').count();
console.log('interactive controls present:', langCount);
console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
