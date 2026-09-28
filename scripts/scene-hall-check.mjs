// 南洋出海局 · 5 层纵深府邸场景冒烟（批次 14）
// 用法：先起 dev server（localhost:3000），再 `node scripts/scene-hall-check.mjs`
// 覆盖：5 层 DOM / 毛玻璃 UI 层 / 港口据点点击弹窗+去办差跳转 / 传令→chat 发送（SSE mock）/
//       批次 13 关键回归（hover 姓名牌+Tooltip、点击领命跳转）/ 深链港 / reduced-motion / <1024px
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

/** SSE mock：拦截 multi-agent API，返回确定性回复（本地环境 API 不稳） */
function mockMultiAgent(page) {
  return page.route('**/api/csca/multi-agent', (route) => {
    const body =
      'data: {"type":"chunk","data":{"fullContent":"风自东南来，宜出行。","agentId":"system"}}\n\n' +
      'data: {"type":"complete","data":{"content":"风自东南来，宜出行。","agentId":"system"}}\n\n';
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      body,
    });
  });
}

async function gotoHall() {
  await page.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="hud-bar"]', { timeout: 15000 });
  await page.waitForSelector('[data-advisor-seat]', { timeout: 15000 });
}

try {
  /* ---- 1. 5 层 DOM + UI 层 ---- */
  console.log('========== 5 层场景渲染 ==========');
  await gotoHall();
  check('远景层 scene-far', (await page.locator('[data-testid="scene-far"]').count()) === 1);
  check('中景层 scene-mid', (await page.locator('[data-testid="scene-mid"]').count()) === 1);
  check(
    '近景沙盘 scene-sandbox',
    (await page.locator('[data-testid="scene-sandbox"]').count()) === 1,
  );
  check('牌匾「南洋出海局」', (await page.getByText('南洋出海局', { exact: false }).count()) >= 1);
  check('窗棂 6 格', (await page.locator('.scene-window > span').count()) === 6);
  check('烛台 ×2', (await page.locator('.scene-candle').count()) === 2);
  check('海鸥 ×3', (await page.locator('.scene-gull').count()) === 3);
  check('落日', (await page.locator('.scene-sun').count()) === 1);
  const portCount = await page.locator('[data-port]').count();
  check('8 港口据点标记', portCount === 8, `(count=${portCount})`);
  const routePts = await page.locator('.scene-table-route polyline').count();
  check('金箔航线 polyline', routePts === 1, `(count=${routePts})`);
  const farOpacity = await page
    .locator('[data-testid="scene-far"]')
    .evaluate((el) => getComputedStyle(el).opacity);
  check(
    '远景透明度 0.10–0.15',
    +farOpacity >= 0.1 && +farOpacity <= 0.15,
    `(opacity=${farOpacity})`,
  );

  /* ---- 2. UI 层毛玻璃 ---- */
  console.log('========== UI 层毛玻璃 ==========');
  for (const [name, sel] of [
    ['顶部 HUD 栏', '.hud-bar'],
    ['底部竹简传令栏', '.hall-input-bar'],
  ]) {
    const bf = await page.locator(sel).evaluate((el) => getComputedStyle(el).backdropFilter);
    check(`${name} backdrop-filter 生效`, !!bf && bf.includes('blur'), `(bf=${bf})`);
  }
  check('罗盘图标', (await page.locator('[data-testid="hud-bar"] svg').count()) >= 1);
  check('风向文案「风向东南 · 宜出行」', (await page.getByText('风向东南 · 宜出行').count()) >= 1);
  check('传令输入栏存在', (await page.locator('[data-testid="hall-input"]').count()) === 1);
  check('传令按钮存在', (await page.locator('[data-testid="hall-send"]').count()) === 1);

  /* ---- 3. 港口据点 → 卷轴弹窗 → 去办差跳转 ---- */
  console.log('========== 港口据点交互 ===========');
  await page.locator('[data-port="melaka"]').click();
  await page.waitForSelector('[data-testid="port-dispatch"]', { timeout: 5000 });
  check('弹窗含古地名「满剌加」', (await page.getByText('满剌加', { exact: false }).count()) >= 1);
  check('弹窗含关联幕僚', (await page.getByText('郑和', { exact: false }).count()) >= 1);
  await page.locator('[data-testid="port-dispatch"]').click();
  await page.waitForURL(/\/csca$/, { timeout: 6000 });
  check(
    '去办差跳 /csca',
    page.url().endsWith('/csca') || page.url().includes('/csca'),
    `(url=${page.url()})`,
  );

  // 深链港：三宝垄 → /csca#mock-exam
  await gotoHall();
  await page.locator('[data-port="semarang"]').click();
  await page.waitForSelector('[data-testid="port-dispatch"]', { timeout: 5000 });
  check('深链港三宝垄弹窗', (await page.getByText('三宝垄', { exact: false }).count()) >= 1);
  await page.locator('[data-testid="port-dispatch"]').click();
  await page.waitForURL(/#mock-exam$/, { timeout: 6000 });
  check('去办差跳 /csca#mock-exam', page.url().includes('#mock-exam'), `(url=${page.url()})`);

  /* ---- 4. 传令 → 切 chat 并发送（SSE mock） ---- */
  console.log('========== 传令 → 议事对话 ==========');
  await gotoHall();
  await mockMultiAgent(page);
  await page.locator('[data-testid="hall-input"]').fill('传令：筹备南洋回程补给');
  await page.locator('[data-testid="hall-send"]').click();
  await page.waitForURL(/\/csca-multi-agent$/, { timeout: 5000 });
  check(
    'view 切到 chat（对话视图可见）',
    await page.locator('[data-testid="view-chat"]').isVisible(),
  );
  // 用户消息入列 + SSE mock 回复到达
  await page.waitForSelector('[data-testid="desk-input"]', { timeout: 5000 });
  await page.waitForFunction(() => document.body.innerText.includes('风自东南来，宜出行。'), {
    timeout: 8000,
  });
  check('SSE 回复到达', (await page.getByText('风自东南来，宜出行。').count()) >= 1);
  check(
    '传令后输入框清空',
    ((await page.locator('[data-testid="desk-input"]').inputValue()) ?? '') === '',
  );

  /* ---- 5. 批次 13 关键回归：hover + 点击领命 ---- */
  console.log('========== 批次 13 回归 ==========');
  await gotoHall();
  await page.locator('[data-advisor-seat="zheng-he"]').hover();
  await page.waitForTimeout(450);
  check(
    'hover 姓名牌',
    (await page.locator('[data-advisor-seat="zheng-he"] .advisor-nameplate-unfold').count()) === 1,
  );
  check(
    'hover 职能 Tooltip',
    (await page.locator('[data-advisor-seat="zheng-he"] .advisor-tooltip-in').count()) === 1,
  );
  check(
    'idle 呼吸（8 个 .advisor-breathe）',
    (await page.locator('.advisor-breathe').count()) === 8,
  );
  await page.locator('[data-advisor-seat="ma-huan"]').click();
  await page.waitForTimeout(250);
  check(
    '点击领命鞠躬 .advisor-bow',
    (await page.locator('[data-advisor-seat="ma-huan"] .advisor-bow').count()) === 1,
  );
  const toastCount = await page.locator('[data-sonner-toast]').count();
  check('欢迎 Toast', toastCount >= 1, `(count=${toastCount})`);
  await page.waitForURL(/#classroom-generator$/, { timeout: 6000 });
  check(
    '领命跳 /#classroom-generator',
    page.url().includes('#classroom-generator'),
    `(url=${page.url()})`,
  );

  /* ---- 6. prefers-reduced-motion 抽查 ---- */
  console.log('========== prefers-reduced-motion ==========');
  const rmCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const rmPage = await rmCtx.newPage();
  await rmPage.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
  await rmPage.waitForSelector('[data-advisor-seat]', { timeout: 15000 });
  const flameAnim = await rmPage
    .locator('.candle-flame')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  check('reduced-motion 烛火静止', flameAnim === 'none', `(anim=${flameAnim})`);
  await rmCtx.close();

  /* ---- 7. <1024px 视口抽查：沙盘转静态、远景/中景隐藏 ---- */
  console.log('========== <1024px 响应式 ==========');
  const mobileCtx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const mbPage = await mobileCtx.newPage();
  await mbPage.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
  await mbPage.waitForSelector('[data-advisor-seat]', { timeout: 15000 });
  check(
    '移动端远景隐藏',
    (await mbPage.locator('[data-testid="scene-far"]').isVisible()) === false,
  );
  check(
    '移动端中景隐藏',
    (await mbPage.locator('[data-testid="scene-mid"]').isVisible()) === false,
  );
  const tablePos = await mbPage
    .locator('[data-testid="scene-sandbox"]')
    .evaluate((el) => getComputedStyle(el).position);
  check('移动端沙盘转 static', tablePos === 'static', `(pos=${tablePos})`);
  await mobileCtx.close();

  /* ---- 8. 导出页回归 ---- */
  console.log('========== 导出页回归 ==========');
  await page.goto(BASE + '/brand/advisors/export', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const advisorKinds = await page.locator('[data-advisor]').count();
  check('导出页网格渲染', advisorKinds >= 8, `(count=${advisorKinds})`);

  console.log(`\n页面错误：${errors.length} 条`);
  if (errors.length) console.log(errors.slice(0, 10).join('\n'));
} catch (e) {
  fail++;
  console.log(`  ✗ 异常：${e.message}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
