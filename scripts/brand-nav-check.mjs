// 竹简卷轴导航检查（南洋出海局 · 批次 7）
// 用法：先起 dev server（localhost:3000），再 `node scripts/brand-nav-check.mjs`
import { chromium } from '@playwright/test';

const EXEC_PATH = 'C:/Users/33181/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3000';

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

const browser = await chromium.launch({ executablePath: EXEC_PATH });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const consoleErrors = [];
const httpBad = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
page.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('favicon')) {
    httpBad.push(`${res.status()} ${res.url().replace(BASE, '')}`);
  }
});

const ROUTES = [
  { name: '首页', path: '/' },
  { name: '备考中心', path: '/csca' },
  { name: '幕僚厅', path: '/csca-multi-agent' },
  { name: '案例页', path: '/csca/case-study' },
];
const VERMILION = 'rgb(184, 34, 34)';   // #B82222
const GOLD = 'rgb(201, 162, 39)';       // #C9A227

// 等待导航动画结束后取宽度（transition-[width] 300ms）
async function navWidth() {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="bamboo-nav-desktop"]');
    return el ? el.getBoundingClientRect().width : -1;
  });
}
async function navComputed(elSel, prop) {
  return page.evaluate(({ elSel, prop }) => {
    const el = document.querySelector(elSel);
    if (!el) return null;
    return getComputedStyle(el)[prop];
  }, { elSel, prop });
}

console.log('========== 桌面端（1280×800）==========');
for (const r of ROUTES) {
  console.log(`\n== ${r.name} ${r.path} ==`);
  await page.goto(BASE + r.path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 侧栏可见，宽度 240px
  const w = await navWidth();
  check(`桌面侧栏可见且宽 240px（实测 ${w}px）`, w === 240, `(width=${w})`);

  // 竹简背景存在（内联 backgroundImage）
  const bg = await navComputed('[data-testid="bamboo-nav-desktop"]', 'backgroundImage');
  check('竹简背景 data-URI 生效', (bg || '').includes('data:image/svg+xml'), `(bg=${(bg || '').slice(0, 30)}…)`);

  // 4 个像素 SVG 菜单图标（viewBox 0 0 32 32）
  const pxCount = await page.locator('[data-testid="bamboo-nav-desktop"] svg[viewBox="0 0 32 32"]').count();
  check(`4 个像素 SVG 图标存在（实测 ${pxCount}）`, pxCount >= 4, `(count=${pxCount})`);

  // 选中项 = 当前路由（限定菜单 nav 内，避开 logo 行）
  const activeSel = `[data-testid="bamboo-nav-desktop"] nav a[href="${r.path}"]`;
  const activeBg = await navComputed(activeSel, 'backgroundColor');
  check(`选中项朱砂底（${r.path}）`, activeBg === VERMILION, `(bg=${activeBg})`);

  // 选中标签金箔文字
  const labelSel = `${activeSel} span`;
  const labelColor = await page.evaluate((sel) => {
    const spans = [...document.querySelectorAll(sel)];
    return spans.map((s) => getComputedStyle(s).color);
  }, `${activeSel} > span`);
  check(`选中文字金箔色`, labelColor.some((c) => c === GOLD), `(colors=${[...new Set(labelColor)]})`);

  // 左侧 4px 金箔竖条（朱批）
  const barCount = await page.locator(`${activeSel} span.bg-gold-leaf`).count();
  check(`朱批金箔竖条存在`, barCount > 0, `(count=${barCount})`);

  // 品牌 logo 行 + 折叠按钮
  const logoCount = await page.locator('[data-testid="bamboo-nav-desktop"] a[href="/"]').count();
  check(`logo 行指向首页`, logoCount >= 1);
  const rollBtn = await page.locator('[data-testid="nav-collapse-btn"]').count();
  check(`折叠按钮存在`, rollBtn >= 1);
}

// 折叠交互
console.log(`\n== 折叠 / 展开 ==`);
await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.locator('[data-testid="nav-collapse-btn"]').click();
await page.waitForTimeout(450);
const wCollapsed = await navWidth();
check(`折叠后宽度 ~80px（实测 ${wCollapsed}px）`, Math.abs(wCollapsed - 80) <= 2, `(width=${wCollapsed})`);
// 折叠后 label 隐藏：选中项不再有文字 span（只有图标 + 竖条）
const hiddenLabels = await page.evaluate(() => {
  const aside = document.querySelector('[data-testid="bamboo-nav-desktop"]');
  return aside ? aside.querySelectorAll('nav a span[class*="truncate"]').length : -1;
});
check('折叠后文字标签隐藏', hiddenLabels === 0, `(labels=${hiddenLabels})`);
// 悬停第一项出 Tooltip
await page.locator('[data-testid="bamboo-nav-desktop"] nav a').first().hover();
await page.waitForTimeout(250);
const tooltipVisible = await page.evaluate(() => {
  const aside = document.querySelector('[data-testid="bamboo-nav-desktop"]');
  if (!aside) return false;
  const tip = aside.querySelector('nav a span[class*="opacity-100"]');
  return !!tip;
});
check('折叠悬停显示毛笔字 Tooltip', tooltipVisible);
// 复位折叠态
await page.evaluate(() => localStorage.removeItem('csca_nav_collapsed'));
await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// 内容区避让：桌面 pl = 240px
const shellPad = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="brand-shell"]');
  return el ? { pl: getComputedStyle(el).paddingLeft, pb: getComputedStyle(el).paddingBottom } : null;
});
check(`桌面内容区左偏 240px（实测 ${shellPad?.pl}）`, shellPad?.pl === '240px', JSON.stringify(shellPad));
check(`桌面内容区无底部避让`, shellPad?.pb === '0px', JSON.stringify(shellPad));

console.log(`\n========== 移动端（390×844）==========`);
const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mPage = await mCtx.newPage();
mPage.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push('mobile: ' + msg.text()); });
mPage.on('pageerror', (err) => consoleErrors.push('mobile pageerror: ' + err.message));
mPage.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('favicon')) httpBad.push(`[mobile] ${res.status()} ${res.url().replace(BASE, '')}`);
});

for (const r of ROUTES) {
  await mPage.goto(BASE + r.path, { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(400);

  const desktopVisible = await mPage.locator('[data-testid="bamboo-nav-desktop"]').isVisible();
  check(`移动端隐藏桌面侧栏（${r.path}）`, !desktopVisible);
  const mobileVisible = await mPage.locator('[data-testid="bamboo-nav-mobile"]').isVisible();
  check(`移动端底部 Tab 可见（${r.path}）`, mobileVisible);

  const tabs = await mPage.locator('[data-testid="bamboo-nav-mobile"] a').count();
  check(`Tab 含 4 个菜单项（实测 ${tabs}）`, tabs === 4, `(count=${tabs})`);

  // 语言入口按钮
  const langBtn = await mPage.locator('[data-testid="bamboo-nav-mobile"] button').count();
  check(`Tab 含语言切换入口（实测 ${langBtn}）`, langBtn >= 1, `(count=${langBtn})`);

  // 选中 Tab 朱砂底
  const mActive = await mPage.evaluate((path) => {
    const el = document.querySelector(`[data-testid="bamboo-nav-mobile"] a[href="${path}"]`);
    return el ? getComputedStyle(el).backgroundColor : null;
  }, r.path);
  check(`选中 Tab 朱砂底（${r.path}）`, mActive === VERMILION, `(bg=${mActive})`);

  // 内容区底部避让 ≥ 64px（抬升至 Tab 上方）
  const mPad = await mPage.evaluate(() => {
    const el = document.querySelector('[data-testid="brand-shell"]');
    return el ? getComputedStyle(el).paddingBottom : null;
  });
  check(`移动端内容区底部避让 64px（实测 ${mPad}）`, mPad === '64px', `(pb=${mPad})`);
}

console.log(`\n========== 回归：生成器系不接入 ==========`);
await page.goto(BASE + '/generation-preview', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const genNav = await page.locator('[data-testid="bamboo-nav-desktop"]').count();
check(`/generation-preview 无竹简导航`, genNav === 0, `(count=${genNav})`);

console.log(`\n========== 汇总 ==========`);
check('无 console 错误 / 页面异常', consoleErrors.length === 0, `\n  → ${consoleErrors.slice(0, 6).join('\n  → ')}`);
check('无 4xx/5xx 资源', httpBad.length === 0, `\n  → ${httpBad.slice(0, 6).join('\n  → ')}`);
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
