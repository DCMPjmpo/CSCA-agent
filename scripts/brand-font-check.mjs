import { chromium } from '@playwright/test';

const EXEC_PATH = 'C:/Users/33181/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3000';

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

const browser = await chromium.launch({ executablePath: EXEC_PATH });
const page = await browser.newPage();
const consoleErrors = [];
const httpBad = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
page.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('favicon')) {
    httpBad.push(`${res.status()} ${res.url().replace(BASE, '')}`);
  }
});

// 断言某类元素全部解析到对应字体（遍历所有匹配元素，任一不符即失败）
async function assertClassFont(selector, family) {
  return page.evaluate(({ selector, family }) => {
    const els = document.querySelectorAll(selector);
    const bad = [];
    for (const el of els) {
      if (!getComputedStyle(el).fontFamily.includes(family)) bad.push(getComputedStyle(el).fontFamily);
    }
    return { count: els.length, bad };
  }, { selector, family });
}

// 显式加载 4 个字体家族，消除 load 竞态后检查可用性
async function ensureFontsLoaded() {
  return page.evaluate(async () => {
    const families = ['LXGW WenKai', 'ZCOOL QingKe HuangYou', 'Press Start 2P', 'Zpix'];
    for (const f of families) {
      try { await document.fonts.load(`16px "${f}"`); } catch (e) {}
    }
    await document.fonts.ready;
    return Object.fromEntries(families.map((f) => [f, document.fonts.check(`16px "${f}"`)]));
  });
}

const pages = [
  { name: '首页 /', path: '/' },
  { name: '备考中心 /csca', path: '/csca' },
  { name: '幕僚厅 /csca-multi-agent', path: '/csca-multi-agent' },
  { name: '案例页 /csca/case-study', path: '/csca/case-study' },
];

for (const p of pages) {
  console.log(`\n== ${p.name} ==`);
  await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const fonts = await ensureFontsLoaded();

  const t = await assertClassFont('[class*="font-brand-title"]', 'ZCOOL QingKe HuangYou');
  if (t.count > 0) check(`模块标题含 ZCOOL（${t.count} 个元素全匹配）`, t.bad.length === 0, `(bad: ${t.bad[0]})`);
  else check('模块标题含 ZCOOL（本页无标题元素，按设计跳过）', true, '(font-brand-title count=0)');

  const e = await assertClassFont('[class*="font-brand-eng"]', 'Press Start 2P');
  check(`英文/数字含 Press Start 2P（${e.count} 个元素全匹配）`, e.count > 0 && e.bad.length === 0, `(count=${e.count} bad=${e.bad[0]})`);

  const px = await assertClassFont('[class*="font-brand-pixel"]', 'Zpix');
  if (px.count > 0) check(`像素标签含 Zpix（${px.count} 个元素全匹配）`, px.bad.length === 0, `(bad: ${px.bad[0]})`);
  else check('像素标签含 Zpix（本页初始视图无像素元素，wizard 步骤由 source 断言覆盖）', true, '(font-brand-pixel count=0)');

  const body = await page.evaluate(() => {
    const w = document.querySelector('div[class*="brand-light"]');
    return w ? getComputedStyle(w).fontFamily : null;
  });
  check('正文含 LXGW WenKai', body?.includes('LXGW WenKai') ?? false, `(got ${body})`);

  check('font: LXGW 已加载', fonts['LXGW WenKai'] === true);
  check('font: ZCOOL 已加载', fonts['ZCOOL QingKe HuangYou'] === true);
  check('font: Press Start 2P 已加载', fonts['Press Start 2P'] === true);
  check('font: Zpix 已加载', fonts['Zpix'] === true);

  const errs = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('ERR_ABORTED'));
  check('无 console 错误', errs.length === 0, `(got ${errs.join(' | ').slice(0, 200)})`);
}

console.log(`\n== 字体文件 HTTP 200 ==`);
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
for (const url of [
  '/fonts/lxgw/lxgwwenkai-regular-subset-4.woff2',
  '/fonts/lxgw/lxgwwenkai-regular-subset-50.woff2',
  '/fonts/lxgw/lxgwwenkai-regular-subset-119.woff2',
  '/fonts/zpix.woff2',
]) {
  const res = await page.request.get(BASE + url);
  check(`GET ${url} → 200`, res.status() === 200, `(got ${res.status()})`);
}
const font404 = httpBad.filter((u) => u.includes('/fonts/'));
check('无字体文件 404（页面加载期间）', font404.length === 0, `(got ${font404.join(', ').slice(0, 300)})`);

console.log(`\n== 回归：/generation-preview（应保持 Geist，无品牌字体）==`);
await page.goto(BASE + '/generation-preview', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const genFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
const genHasLight = await page.evaluate(() => document.querySelector('div[class*="brand-light"]') !== null);
check('生成器 body 不含 LXGW WenKai', !genFont.includes('LXGW WenKai'), `(got ${genFont})`);
check('生成器无 brand-light 包裹层', !genHasLight, '(brand-light 不应出现在生成器工作区)');
const errsGen = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('ERR_ABORTED'));
check('生成器无 console 错误', errsGen.length === 0, `(got ${errsGen.join(' | ').slice(0, 200)})`);

await browser.close();
console.log(`\n===== ${pass} passed, ${fail} failed =====`);
process.exit(fail === 0 ? 0 : 1);
