// 南洋出海局 · 议事圆桌交互冒烟（批次 13）
// 用法：先起 dev server（localhost:3000），再 `node scripts/advisor-hall-check.mjs`
// 覆盖：8 席渲染 / hover 姓名牌+Tooltip+转头+拱手 / 拖拽组队+贺词+持久化 /
//       点击领命鞠躬+欢迎 Toast+跳转功能面板 / university-match 深链 / 导出页回归
import { chromium } from '@playwright/test';

const EXEC_PATH =
  'C:/Users/33181/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3000';

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

const browser = await chromium.launch({ executablePath: EXEC_PATH });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
    errors.push(m.text());
  }
});

try {
  /* ---- 1. 圆桌渲染 8 席 ---- */
  console.log('========== 议事圆桌渲染 ==========');
  await page.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-advisor-seat]', { timeout: 15000 });
  const seats = await page.locator('[data-advisor-seat]').count();
  check('8 席渲染', seats === 8, `(count=${seats})`);
  check(
    'idle 呼吸（8 个 .advisor-breathe）',
    (await page.locator('.advisor-breathe').count()) === 8,
  );

  /* ---- 2. hover：姓名牌 + Tooltip + 转头 + 拱手 ---- */
  console.log('========== hover 交互 ==========');
  const seat = page.locator('[data-advisor-seat="zheng-he"]');
  await seat.hover();
  await page.waitForTimeout(450);
  check('姓名牌 scroll-unfold', (await seat.locator('.advisor-nameplate-unfold').count()) === 1);
  check('职能 Tooltip 宣纸底', (await seat.locator('.advisor-tooltip-in').count()) === 1);
  check('转头 .advisor-head-hover', (await seat.locator('.advisor-head-hover').count()) === 1);
  check('拱手手层 .advisor-hands', (await seat.locator('.advisor-hands').count()) === 1);
  await page.mouse.move(5, 5);

  /* ---- 3. 拖拽组队（清空持久化后重测） ---- */
  console.log('========== 拖拽组队 ==========');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-advisor-seat]', { timeout: 15000 });
  await page.dragAndDrop('[data-advisor-seat="ma-huan"]', '[data-advisor-seat="fei-xin"]');
  await page.waitForTimeout(500);
  const teamSeats = await page.locator('[data-team]').count();
  check('成队（≥2 席带 data-team）', teamSeats >= 2, `(count=${teamSeats})`);
  const stored = await page.evaluate(() => window.localStorage.getItem('csca_advisor_teams_v1'));
  check('localStorage 持久化', !!stored && stored.includes('ma-huan'));
  check('古风贺词弹窗', (await page.getByText('组队成功 · 报喜').count()) === 1);
  // 互动对话气泡（错峰 1s 首条于 ~1.7s 后）
  await page.waitForTimeout(1200);
  check('互动对话气泡', (await page.locator('.dialogue-bubble').count()) >= 1);

  /* ---- 4. 点击「领命」→ 鞠躬 + 欢迎 Toast + 跳转 ---- */
  console.log('========== 点击领命 ==========');
  await page.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-advisor-seat]', { timeout: 15000 });
  await page.locator('[data-advisor-seat="zheng-he"]').click();
  await page.waitForTimeout(250);
  check(
    '领命鞠躬 .advisor-bow',
    (await page.locator('[data-advisor-seat="zheng-he"] .advisor-bow').count()) === 1,
  );
  const toastCount = await page.locator('[data-sonner-toast]').count();
  check('欢迎语 Toast 出现', toastCount >= 1, `(count=${toastCount})`);
  await page.waitForURL(/\/csca$/, { timeout: 5000 });
  check('跳转功能面板 /csca', page.url().includes('/csca'));

  /* ---- 5. university-match 深链 ---- */
  console.log('========== 深链 university-match ==========');
  await page.goto(BASE + '/csca#university-match', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('院校匹配面板', (await page.getByText('点击获取院校匹配').count()) >= 1);

  /* ---- 6. 导出页回归（静态帧不受 motion 改造影响） ---- */
  console.log('========== 导出页回归 ==========');
  await page.goto(BASE + '/brand/advisors/export', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const advisorKinds = await page.locator('[data-advisor]').count();
  check('导出页网格渲染', advisorKinds >= 8, `(count=${advisorKinds})`);
  check('静态帧（无呼吸动画）', (await page.locator('.advisor-breathe').count()) === 0);

  console.log(`\n页面错误：${errors.length} 条`);
  if (errors.length) console.log(errors.slice(0, 10).join('\n'));
} catch (e) {
  fail++;
  console.log(`  ✗ 异常：${e.message}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
