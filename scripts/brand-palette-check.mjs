import { chromium } from '@playwright/test';

const EXEC_PATH = 'C:/Users/33181/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3000';

const RICEPAPER = 'rgb(245, 240, 230)'; // 宣纸白 #F5F0E6
const VERMILION = 'rgb(184, 34, 34)';   // 朱砂红 #B82222
const INK = 'rgb(26, 26, 26)';          // 墨黑 #1A1A1A

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

const browser = await chromium.launch({ executablePath: EXEC_PATH });
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

// 在页面内探针解析 brand-light 包裹层背景（body 背景仍是全局深色 token，真正渲染浅色的是该 div）
async function brandStats() {
  return page.evaluate(({ RICEPAPER, VERMILION, INK }) => {
    const out = { wrapperBg: null, indigoHits: 0, vermilionHits: 0, inkHits: 0 };
    const wrapper = document.querySelector('div[class*="brand-light"]');
    if (wrapper) out.wrapperBg = getComputedStyle(wrapper).backgroundColor;

    // 探针解析靛青蓝 solid 与 /NN 透明度（color-mix → oklab/lab 形式）
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    probe.style.backgroundColor = 'var(--color-indigo-deep)';
    const indigoSolid = getComputedStyle(probe).backgroundColor;
    probe.style.backgroundColor = 'color-mix(in oklab, var(--color-indigo-deep) 90%, transparent)';
    const indigoMixed = getComputedStyle(probe).backgroundColor;
    probe.remove();

    for (const el of document.querySelectorAll('header, aside, [class*="bg-indigo-deep"]')) {
      const c = getComputedStyle(el).backgroundColor;
      if (c === indigoSolid || c === indigoMixed) out.indigoHits++;
    }
    for (const el of document.querySelectorAll('[class*="bg-vermilion"]')) {
      if (getComputedStyle(el).backgroundColor === VERMILION) out.vermilionHits++;
    }
    for (const el of document.querySelectorAll('[class*="text-ink"]')) {
      if (getComputedStyle(el).color === INK) out.inkHits++;
    }
    return out;
  }, { RICEPAPER, VERMILION, INK });
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
  await page.waitForTimeout(600);
  const s = await brandStats();
  check('brand-light 包裹层背景 = 宣纸白', s.wrapperBg === RICEPAPER, `(got ${s.wrapperBg})`);
  check('顶部导航/侧边栏 = 靛青蓝', s.indigoHits > 0, `(found ${s.indigoHits})`);
  check('CTA/重点按钮 = 朱砂红', s.vermilionHits > 0, `(found ${s.vermilionHits})`);
  check('主文字 = 墨黑', s.inkHits > 0, `(found ${s.inkHits})`);
  const errs = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('ERR_ABORTED'));
  check('无 console 错误', errs.length === 0, `(got ${errs.join(' | ').slice(0, 200)})`);
}

// ---- 回归：课堂生成器保持深色 ----
console.log(`\n== 回归：/generation-preview（应保持深色）==`);
await page.goto(BASE + '/generation-preview', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const genBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const genHasLight = await page.evaluate(() => document.querySelector('div[class*="brand-light"]') !== null);
check('生成器 body 非宣纸白', genBg !== RICEPAPER, `(got ${genBg})`);
check('生成器无 brand-light 包裹层', !genHasLight, '(brand-light 不应出现在深色工作区)');
const errsGen = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('ERR_ABORTED'));
check('生成器无 console 错误', errsGen.length === 0, `(got ${errsGen.join(' | ').slice(0, 200)})`);

await browser.close();
console.log(`\n===== ${pass} passed, ${fail} failed =====`);
process.exit(fail === 0 ? 0 : 1);
