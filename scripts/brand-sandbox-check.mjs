// 南洋海图沙盘检查（南洋出海局 · 批次 8）
// 用法：先起 dev server（localhost:3000），再 `node scripts/brand-sandbox-check.mjs`
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

const SANDWOOD = 'rgb(139, 90, 43)'; // #8B5A2B

console.log('========== 桌面端（1280×800）：新访客全雾态 ==========');
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
// 清空 localStorage 保证新访客状态
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 沙盘容器存在 + 木质雕刻边框
const sandbox = await page.locator('[data-testid="sea-sandbox"]').count();
check('沙盘容器存在', sandbox >= 1, `(count=${sandbox})`);
const frameStyle = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="sea-sandbox"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { borderColor: cs.borderColor, boxShadow: cs.boxShadow };
});
check(`木框 borderColor=${SANDWOOD}`, frameStyle?.borderColor === SANDWOOD, JSON.stringify(frameStyle));
check('木框内阴影（雕刻感）', (frameStyle?.boxShadow || '').includes('inset'), `(shadow=${(frameStyle?.boxShadow || '').slice(0, 60)}…)`);

// 8 个据点 + 海图背景
const outpostCount = await page.locator('[data-testid^="outpost-"]').count();
check(`8 个据点存在（实测 ${outpostCount}）`, outpostCount === 8, `(count=${outpostCount})`);
const seaBg = await page.evaluate(() => {
  const el = document.querySelector('.sandbox-grid');
  return el ? getComputedStyle(el).backgroundImage : '';
});
check('海图 data-URI 背景生效', (seaBg || '').includes('data:image/svg+xml'), `(bg=${seaBg.slice(0, 30)}…)`);

// 新访客：6 个航线据点全雾态
const fogCount = await page.locator('.sandbox-fog').count();
check(`新访客 6 据点迷雾（实测 ${fogCount}）`, fogCount === 6, `(count=${fogCount})`);

// 新访客：进度船停起点（16.67%, 16.67% —— 计算样式返回 px，改按中心点相对沙盘比率断言）
const shipPos = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="sandbox-ship"]');
  const box = document.querySelector('[data-testid="sea-sandbox"]');
  if (!el || !box) return null;
  const er = el.getBoundingClientRect();
  const br = box.getBoundingClientRect();
  return { ratioX: (er.x + er.width / 2 - br.x) / br.width, ratioY: (er.y + er.height / 2 - br.y) / br.height };
});
check(
  `进度船停起点（${shipPos?.ratioX.toFixed(3)},${shipPos?.ratioY.toFixed(3)}）`,
  Math.abs(shipPos.ratioX - 1 / 6) < 0.02 && Math.abs(shipPos.ratioY - 1 / 6) < 0.02,
  JSON.stringify(shipPos)
);

// 进度计数
const plaque = await page.locator('[data-testid="sea-sandbox"] span:has-text("航线")').count();
check('进度石碑显示探明计数', plaque >= 1);

// hover 据点 → 金箔脉冲 + 竖排 Tooltip
await page.locator('[data-testid="outpost-diagnosis"]').hover();
await page.waitForTimeout(250);
const hover = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="outpost-diagnosis"]');
  if (!btn) return null;
  const anim = getComputedStyle(btn).animationName;
  const tip = btn.querySelector('.sandbox-vertical-text');
  const wrap = tip?.parentElement;
  return {
    anim,
    writingMode: tip ? getComputedStyle(tip).writingMode : null,
    tipOpacity: wrap ? getComputedStyle(wrap).opacity : null,
  };
});
check(`hover 金箔脉冲（animation=${hover?.anim}）`, (hover?.anim || '').includes('sandbox-glow'), `(anim=${hover?.anim})`);
check(`竖排 Tooltip writing-mode: vertical-rl（实测 ${hover?.writingMode}）`, hover?.writingMode === 'vertical-rl', `(mode=${hover?.writingMode})`);
check(`Tooltip hover 显示（opacity=${hover?.tipOpacity}）`, Number(hover?.tipOpacity) > 0.9, `(opacity=${hover?.tipOpacity})`);

// 点击据点 → 画卷展开模态
await page.locator('[data-testid="outpost-diagnosis"]').click();
await page.waitForTimeout(400);
const modalTitle = await page.evaluate(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  return dlg ? dlg.textContent || '' : '';
});
check('点击据点展开模态（含模块名）', modalTitle.includes('探航风向标') || modalTitle.includes('风向标'), `(text=${modalTitle.slice(0, 40)}…)`);
check('模态含「进入」按钮', modalTitle.includes('进入'));
// 关闭模态
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

console.log('\n========== 桌面端：预置进度（activeStep=2）==========');
const seededCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await seededCtx.addInitScript(() => {
  localStorage.setItem('csca_learning_session', JSON.stringify({
    currentStep: 'adaptive_learning',
    activeStep: 2,
    selectedSubjects: ['数学'],
    selectedCountryCode: 'TH',
    targetMajorId: 'engineering',
    hskLevel: 4,
    locale: 'zh',
    updatedAt: Date.now(),
  }));
});
const seeded = await seededCtx.newPage();
const seededErrors = [];
seeded.on('console', (msg) => { if (msg.type() === 'error') seededErrors.push(msg.text()); });
seeded.on('pageerror', (err) => seededErrors.push('pageerror: ' + err.message));
seeded.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('favicon')) httpBad.push(`[seeded] ${res.status()} ${res.url().replace(BASE, '')}`);
});
await seeded.goto(BASE + '/', { waitUntil: 'networkidle' });
await seeded.waitForTimeout(600);

const seededState = await seeded.evaluate(() => {
  const fog = document.querySelectorAll('.sandbox-fog').length;
  const flag = document.querySelectorAll('[data-testid^="outpost-"] .sandbox-flag-plant').length;
  const box = document.querySelector('[data-testid="sea-sandbox"]');
  const ship = document.querySelector('[data-testid="sandbox-ship"]');
  let ratio = null;
  if (ship && box) {
    const er = ship.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    ratio = { x: (er.x + er.width / 2 - br.x) / br.width, y: (er.y + er.height / 2 - br.y) / br.height };
  }
  const activeBtn = document.querySelector('[data-testid="outpost-adaptive-learning"]');
  const doneBtn = document.querySelector('[data-testid="outpost-diagnosis"]');
  const activeBorder = activeBtn ? getComputedStyle(activeBtn).borderColor : null;
  const doneBorder = doneBtn ? getComputedStyle(doneBtn).borderColor : null;
  return { fog, flag, ratio, activeBorder, doneBorder };
});
check(`预置后迷雾减少（fog=${seededState.fog}）`, seededState.fog === 3, `(fog=${seededState.fog})`);
check(`已完成据点插旗（flag=${seededState.flag}）`, seededState.flag === 2, `(flag=${seededState.flag})`);
check(
  `进度船前进至演武场（${seededState.ratio?.x.toFixed(3)},${seededState.ratio?.y.toFixed(3)}）`,
  Math.abs(seededState.ratio.x - 5 / 6) < 0.02 && Math.abs(seededState.ratio.y - 1 / 6) < 0.02,
  JSON.stringify(seededState.ratio)
);
check('当前据点金边高亮（与已完成据点边框不同）', seededState.activeBorder !== seededState.doneBorder, `(current=${seededState.activeBorder}, done=${seededState.doneBorder})`);

// 讲学堂模态：生成 → 落 /generation-preview
await seeded.locator('[data-testid="outpost-classroom"]').click();
await seeded.waitForTimeout(400);
await seeded.locator('[data-slot="dialog-content"] textarea').fill('给我一个 C 语言入门课程');
await seeded.locator('[data-slot="dialog-content"] button:has-text("挥毫成课")').click();
await seeded.waitForURL('**/generation-preview', { timeout: 8000 });
await seeded.waitForTimeout(500);
const previewHasSandbox = await seeded.locator('[data-testid="sea-sandbox"]').count();
check('讲学堂生成 → 落到 /generation-preview', previewHasSandbox === 0, `(count=${previewHasSandbox})`);
await seededCtx.close();

console.log('\n========== 深链：幕僚厅 → 先生授课 ==========');
const deepCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const deep = await deepCtx.newPage();
await deep.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
await deep.waitForTimeout(500);
await deep.getByRole('button', { name: /先生授课/ }).click();
await deep.waitForTimeout(900);
const deepModal = await deep.evaluate(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  return dlg ? dlg.textContent || '' : '';
});
check('幕僚厅点「先生授课」→ 首页讲学堂模态展开', deepModal.includes('讲学堂'), `(text=${deepModal.slice(0, 30)}…)`);
await deepCtx.close();

console.log('\n========== 移动端（390×844）==========');
const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mPage = await mCtx.newPage();
mPage.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push('mobile: ' + msg.text()); });
mPage.on('pageerror', (err) => consoleErrors.push('mobile pageerror: ' + err.message));
mPage.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('favicon')) httpBad.push(`[mobile] ${res.status()} ${res.url().replace(BASE, '')}`);
});
await mPage.goto(BASE + '/', { waitUntil: 'networkidle' });
await mPage.evaluate(() => localStorage.clear());
await mPage.reload({ waitUntil: 'networkidle' });
await mPage.waitForTimeout(500);

const mOutposts = await mPage.locator('[data-testid^="outpost-"]').count();
check(`移动端 8 据点可见（实测 ${mOutposts}）`, mOutposts === 8, `(count=${mOutposts})`);
const mOverflow = await mPage.evaluate(() => {
  const el = document.querySelector('[data-testid="sea-sandbox"]');
  if (!el) return { scroll: -1, client: -1 };
  return { scroll: el.scrollWidth, client: el.clientWidth };
});
check(`移动端无横向溢出（${mOverflow.scroll} <= ${mOverflow.client}）`, mOverflow.scroll <= mOverflow.client, JSON.stringify(mOverflow));
await mPage.locator('[data-testid="outpost-mock-exam"]').click();
await mPage.waitForTimeout(400);
const mModal = await mPage.evaluate(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  return dlg ? dlg.textContent || '' : '';
});
check('移动端点击据点开模态', mModal.includes('试航演练') || mModal.includes('Mock'), `(text=${mModal.slice(0, 30)}…)`);
await mCtx.close();

console.log('\n========== 汇总 ==========');
// scene-outlines-stream 500 为本环境既有的 LLM 生成后端问题（route/preview/llm.ts 均未被批次 8 改动，
// 直连 POST 返回 SSE error "LLM returned empty response"，系模型/提供商配置），非沙盘回归，排除出闸。
const ignoreApi = (u) => u.includes('/api/generate/scene-outlines-stream');
// 生成 API 的 500 会在 console 里表现为无 URL 的通用资源错误，一并排除（已证实唯一坏资源即该 API）
const GEN_500_MSG = 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)';
const allErrors = [...consoleErrors, ...seededErrors].filter(
  (m) => !m.includes('scene-outlines-stream') && !m.startsWith(GEN_500_MSG)
);
const httpBadClean = httpBad.filter((b) => !ignoreApi(b));
check('无 console 错误 / 页面异常', allErrors.length === 0, `\n  → ${allErrors.slice(0, 6).join('\n  → ')}`);
check('无 4xx/5xx 资源（除生成 API）', httpBadClean.length === 0, `\n  → ${httpBadClean.slice(0, 6).join('\n  → ')}`);
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
