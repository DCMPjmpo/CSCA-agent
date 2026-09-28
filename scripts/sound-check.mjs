// 南洋出海局 · 全局音效冒烟（批次 15）
// 用法：先起 dev server（localhost:3000），再 `node scripts/sound-check.mjs`
// 覆盖：16 资产可达 / 环境音挂载即拉取 / 双开关存在+持久化 / 交互接线
//       （卷轴弹窗→scroll-unroll、传令→seal、竹简抽屉→scroll-open、
//         领命→bow、去办差→ship）/ 音效关态不请求
import { chromium } from '@playwright/test';

const EXEC_PATH =
  'C:/Users/33181/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3000';
const SFX = ['bow', 'gong', 'hall', 'scroll-open', 'scroll-unroll', 'seal', 'ship', 'woodfish'];

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

/** 收集 /sfx/ 请求路径 */
const sfxRequests = new Set();
page.on('request', (r) => {
  const u = r.url();
  if (u.includes('/sfx/')) sfxRequests.add(new URL(u).pathname);
});

/** SSE mock：规避本地 multi-agent API 不稳（传令测试会触发） */
await page.route('**/api/csca/multi-agent', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    headers: { 'Cache-Control': 'no-cache' },
    body:
      'data: {"type":"chunk","data":{"fullContent":"风自东南来，宜出行。","agentId":"system"}}\n\n' +
      'data: {"type":"complete","data":{"content":"风自东南来，宜出行。","agentId":"system"}}\n\n',
  });
});

async function freshHall() {
  await page.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.removeItem('csca_sound_v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="hud-bar"]', { timeout: 15000 });
  await page.waitForSelector('[data-advisor-seat]', { timeout: 15000 });
}

try {
  /* ---- 1. 资产可达 ---- */
  console.log('========== 音频资产可达 ==========');
  let reachable = 0;
  for (const n of SFX) {
    for (const ext of ['ogg', 'mp3']) {
      const res = await page.request.get(`${BASE}/sfx/${n}.${ext}`);
      if (res.status() === 200) reachable++;
      else console.log(`  ✗ /sfx/${n}.${ext} → ${res.status()}`);
    }
  }
  check('16 个 mp3/ogg 均 200', reachable === 16, `(ok=${reachable})`);

  /* ---- 2. 环境音：hall 视图挂载即拉取 ambient ---- */
  console.log('========== 环境音 ==========');
  sfxRequests.clear();
  await freshHall();
  await page.waitForFunction(() => [...document.querySelectorAll('script')].length >= 0, {
    timeout: 1000,
  });
  // 等待 hall 资产请求（startAmbient 异步解码链路）
  await page
    .waitForRequest((r) => /\/sfx\/hall\.(ogg|mp3)$/.test(new URL(r.url()).pathname), {
      timeout: 10000,
    })
    .catch(() => {});
  check(
    'hall 视图挂载后拉取环境音资产',
    [...sfxRequests].some((p) => p.includes('/sfx/hall.')),
    `(requests=${[...sfxRequests].join(',')})`,
  );

  /* ---- 3. 双开关存在 + 持久化 ---- */
  console.log('========== 双开关 ==========');
  check('环境音开关', (await page.locator('[data-testid="sound-ambient"]').count()) === 1);
  check('音效开关', (await page.locator('[data-testid="sound-sfx"]').count()) === 1);
  await page.locator('[data-testid="sound-ambient"]').click();
  await page.waitForTimeout(200);
  const storedAmbient = await page.evaluate(() => {
    const s = JSON.parse(window.localStorage.getItem('csca_sound_v1') || '{}');
    return s.ambient;
  });
  const pressedAmbient = await page
    .locator('[data-testid="sound-ambient"]')
    .getAttribute('aria-pressed');
  check('点环境音 → 持久化 ambient=false', storedAmbient === false, `(stored=${storedAmbient})`);
  check('aria-pressed=false', pressedAmbient === 'false', `(pressed=${pressedAmbient})`);
  // 刷新后仍为关
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="hud-bar"]', { timeout: 15000 });
  check(
    '刷新后环境音仍关',
    (await page.locator('[data-testid="sound-ambient"]').getAttribute('aria-pressed')) === 'false',
  );
  // 恢复开
  await page.locator('[data-testid="sound-ambient"]').click();
  // 音效开关持久化
  await page.locator('[data-testid="sound-sfx"]').click();
  await page.waitForTimeout(200);
  const storedSfx = await page.evaluate(() => {
    const s = JSON.parse(window.localStorage.getItem('csca_sound_v1') || '{}');
    return s.sfx;
  });
  check('点音效 → 持久化 sfx=false', storedSfx === false, `(stored=${storedSfx})`);
  await page.locator('[data-testid="sound-sfx"]').click(); // 恢复开

  /* ---- 4. 交互接线 ---- */
  console.log('========== 交互接线 ==========');
  // 4a. 卷轴弹窗 → scroll-unroll
  const unrollReq = page
    .waitForRequest((r) => r.url().includes('/sfx/scroll-unroll.'))
    .catch(() => null);
  await page.locator('[data-port="melaka"]').click();
  await page.waitForSelector('[data-testid="port-dispatch"]', { timeout: 5000 });
  const unroll = await unrollReq;
  check('港口弹窗 → scroll-unroll', !!unroll);
  // 4b. 去办差 → ship（并跳转）
  const shipReq = page.waitForRequest((r) => r.url().includes('/sfx/ship.')).catch(() => null);
  await page.locator('[data-testid="port-dispatch"]').click();
  await page.waitForURL(/\/csca$/, { timeout: 6000 }).catch(() => {});
  const ship = await shipReq;
  check('去办差 → ship 起航声', !!ship);

  // 4c. 传令 → seal
  await freshHall();
  const sealReq = page.waitForRequest((r) => r.url().includes('/sfx/seal.')).catch(() => null);
  await page.locator('[data-testid="hall-input"]').fill('传令：检修航路');
  await page.locator('[data-testid="hall-send"]').click();
  await page.waitForSelector('[data-testid="desk-input"]', { timeout: 5000 });
  const seal = await sealReq;
  check('传令 → seal 印章声', !!seal);

  // 4d. 竹简抽屉 → scroll-open（chat 视图 roster）
  const openReq = page
    .waitForRequest((r) => r.url().includes('/sfx/scroll-open.'))
    .catch(() => null);
  await page.locator('[data-testid="roster-btn"]').click();
  await page.waitForTimeout(800);
  const scrollOpen = await openReq;
  check('花名册竹简 → scroll-open', !!scrollOpen);
  // 收起抽屉（点关闭按钮）
  await page
    .locator('.scroll-close')
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(300);

  // 4e. 领命 → bow（hall 视图点幕僚）
  await page.locator('[data-testid="view-hall"]').click();
  await page.waitForSelector('[data-advisor-seat]', { timeout: 15000 });
  const bowReq = page.waitForRequest((r) => r.url().includes('/sfx/bow.')).catch(() => null);
  await page.locator('[data-advisor-seat="zheng-he"]').click();
  const bow = await bowReq;
  check('领命 → bow 抱拳声', !!bow);

  /* ---- 5. 音效关态：不请求 ---- */
  console.log('========== 音效关态 ==========');
  await freshHall();
  await page.locator('[data-testid="sound-sfx"]').click(); // 关
  await page.waitForTimeout(150);
  const before = sfxRequests.size;
  await page.locator('[data-port="champa"]').click();
  await page.waitForSelector('[data-testid="port-dispatch"]', { timeout: 5000 });
  await page.waitForTimeout(800);
  const after = sfxRequests.size;
  const newReqs = [...sfxRequests].slice(before);
  check(
    '音效关态点港口不请求音效',
    newReqs.filter((p) => p.includes('/sfx/')).length === 0,
    `(new=${newReqs.join(',')})`,
  );
  // 收起港口卷轴弹窗（其遮罩会拦截后续点击），再恢复开关
  await page
    .locator('.scroll-close')
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(400); // 关闭动画 300ms
  await page.locator('[data-testid="sound-sfx"]').click();
  await page.evaluate(() => window.localStorage.removeItem('csca_sound_v1'));

  console.log(`\n页面错误：${errors.length} 条`);
  if (errors.length) console.log(errors.slice(0, 10).join('\n'));
} catch (e) {
  fail++;
  console.log(`  ✗ 异常：${e.message}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
