// 木质案几输入栏检查（南洋出海局 · 批次 9）
// 用法：先起 dev server（localhost:3000），再 `node scripts/brand-desk-check.mjs`
import { chromium } from '@playwright/test';

const EXEC_PATH =
  'C:/Users/33181/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3000';

let pass = 0,
  fail = 0;
function check(name, cond, detail = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

// 浏览器原生语音 mock：start() 后 500ms 返回转写并结束（绕开无权限 headless）
const ASR_MOCK = () => {
  const SR = class {
    constructor() {
      this.onstart = null;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.lang = '';
      this.continuous = false;
      this.interimResults = false;
    }
    start() {
      this.onstart?.();
      setTimeout(() => {
        this.onresult?.({ results: [[{ transcript: '测试转写' }]] });
        this.onend?.();
      }, 500);
    }
    stop() {}
  };
  window.SpeechRecognition = SR;
  window.webkitSpeechRecognition = SR;
};

const GEN_500_MSG =
  'Failed to load resource: the server responded with a status of 500 (Internal Server Error)';
const ignoreApi = (u) =>
  u.includes('/api/generate/scene-outlines-stream') || u.includes('/api/csca/multi-agent');

const browser = await chromium.launch({ executablePath: EXEC_PATH });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(ASR_MOCK);
const page = await ctx.newPage();
const consoleErrors = [];
const httpBad = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
page.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('favicon')) {
    httpBad.push(`${res.status()} ${res.url().replace(BASE, '')}`);
  }
});

console.log('========== 桌面端（1280×800）：案几输入栏 ==========');
await page.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 木质案几：存在 + 高度 64px + 木纹 data-URI 背景
const desk = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="desk-bar"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { height: cs.height, bg: cs.backgroundImage };
});
check(`案几存在且高度 64px（实测 ${desk?.height}）`, desk?.height === '64px', JSON.stringify(desk));
check(
  '案几木纹 data-URI 背景',
  (desk?.bg || '').includes('data:image/svg+xml'),
  `(bg=${(desk?.bg || '').slice(0, 30)}…)`,
);

// 宣纸输入框：#F5F0E6 / 1px 檀木棕 / 圆角 8px
const inputStyle = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="desk-input"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    bg: cs.backgroundColor,
    border: cs.borderColor,
    borderWidth: cs.borderTopWidth,
    radius: cs.borderTopLeftRadius,
  };
});
check(
  `宣纸底 #F5F0E6（实测 ${inputStyle?.bg}）`,
  inputStyle?.bg === 'rgb(245, 240, 230)',
  JSON.stringify(inputStyle),
);
check(
  `檀木棕 1px 边框（实测 ${inputStyle?.border} / ${inputStyle?.borderWidth}）`,
  inputStyle?.border === 'rgb(139, 90, 43)' && inputStyle?.borderWidth === '1px',
  JSON.stringify(inputStyle),
);
check(
  `圆角 8px（实测 ${inputStyle?.radius}）`,
  inputStyle?.radius === '8px',
  JSON.stringify(inputStyle),
);

// 传令印章：文字 + 空输入禁用 → 输入后启用
const seal = page.locator('[data-testid="seal-send"]');
check(
  '印章按钮文字「传令」',
  (await seal.textContent()) === '传令',
  `(text=${await seal.textContent()})`,
);
check('空输入印章禁用', await seal.isDisabled());
await page.locator('[data-testid="desk-input"]').fill('启航');
await page.waitForTimeout(120);
check('输入后印章启用', await seal.isEnabled());

// 印章 hover 下压盖章
const sealBoxBefore = await seal.boundingBox();
await seal.hover();
await page.waitForTimeout(250);
const sealBoxAfter = await seal.boundingBox();
check(
  `hover 下压 ≥1px（${(sealBoxAfter?.y ?? 0) - (sealBoxBefore?.y ?? 0)}px）`,
  (sealBoxAfter?.y ?? 0) - (sealBoxBefore?.y ?? 0) >= 1,
  `(before=${sealBoxBefore?.y}, after=${sealBoxAfter?.y})`,
);

// 印章点击震动（:active → seal-shake）；mouse.up 完成点击即真实发送
await page.mouse.down();
await page.waitForTimeout(60);
const shakeAnim = await seal.evaluate((el) => getComputedStyle(el).animationName);
await page.mouse.up();
check(
  `点击震动 seal-shake（实测 ${shakeAnim}）`,
  shakeAnim === 'seal-shake',
  `(anim=${shakeAnim})`,
);

// 发送流程：mousedown/up 已触发点击 → 用户气泡 + 输入清空 + 印章回禁用
await page.waitForTimeout(800);
const sentBubble = await page.locator('text=启航').count();
check('发送后用户气泡出现', sentBubble >= 1, `(count=${sentBubble})`);
check('发送后输入清空', (await page.locator('[data-testid="desk-input"]').inputValue()) === '');
check('发送后印章回禁用', await seal.isDisabled());

console.log('\n========== 桌面端：快捷令箭栏 ==========');
const toggle = page.locator('[data-testid="flags-toggle"]');
check(
  `令箭栏默认折叠（aria-expanded=${await toggle.getAttribute('aria-expanded')}）`,
  (await toggle.getAttribute('aria-expanded')) === 'false',
);
check('折叠态无令箭旗', (await page.locator('[data-testid="flag-chip"]').count()) === 0);
await toggle.click();
await page.waitForTimeout(200);
check(
  '点击展开后 5 支令箭',
  (await page.locator('[data-testid="flag-chip"]').count()) === 5,
  `(count=${await page.locator('[data-testid="flag-chip"]').count()})`,
);
check(
  '令箭含「先生授课」',
  (await page.locator('[data-testid="flag-chip"]:has-text("先生授课")').count()) >= 1,
);

console.log('\n========== 桌面端：传声海螺录音 ==========');
const conch = page.locator('[data-testid="conch-btn"]');
check('海螺按钮存在', (await conch.count()) === 1);
await conch.click();
await page.waitForTimeout(200);
const recState = await conch.evaluate((el) => ({
  recording: el.hasAttribute('data-recording'),
  waves: el.querySelectorAll('.conch-wave').length,
}));
check(`录音中发光（data-recording）`, recState.recording, JSON.stringify(recState));
check(`录音音波条渲染（${recState.waves} 根）`, recState.waves === 4, JSON.stringify(recState));
await page.waitForTimeout(900);
const inputVal = await page.locator('[data-testid="desk-input"]').inputValue();
check(`转写填入输入框（实测「${inputVal}」）`, inputVal.includes('测试转写'), `(val=${inputVal})`);
check('录音结束后发光熄灭', !(await conch.evaluate((el) => el.hasAttribute('data-recording'))));

console.log('\n========== 深链：令箭「先生授课」→ 首页讲学堂 ==========');
await page.locator('[data-testid="flag-chip"]:has-text("先生授课")').click();
await page.waitForURL(/#classroom-generator/, { timeout: 8000 });
await page.waitForTimeout(900);
const deepModal = await page.evaluate(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  return dlg ? dlg.textContent || '' : '';
});
check(
  '令箭「先生授课」→ 首页讲学堂模态',
  deepModal.includes('讲学堂'),
  `(text=${deepModal.slice(0, 30)}…)`,
);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

console.log('\n========== 移动端（390×844）==========');
const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await mCtx.addInitScript(ASR_MOCK);
const mPage = await mCtx.newPage();
mPage.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push('mobile: ' + msg.text());
});
mPage.on('pageerror', (err) => consoleErrors.push('mobile pageerror: ' + err.message));
mPage.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('favicon'))
    httpBad.push(`[mobile] ${res.status()} ${res.url().replace(BASE, '')}`);
});
await mPage.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
await mPage.waitForTimeout(500);

const mDesk = await mPage.evaluate(() => {
  const el = document.querySelector('[data-testid="desk-bar"]');
  return el ? getComputedStyle(el).height : null;
});
check(`移动端案几高度 56px（实测 ${mDesk}）`, mDesk === '56px', `(h=${mDesk})`);
const mOverflow = await mPage.evaluate(() => {
  const el = document.querySelector('[data-testid="desk-bar"]');
  if (!el) return { scroll: -1, client: -1 };
  return { scroll: el.scrollWidth, client: el.clientWidth };
});
check(
  `移动端无横向溢出（${mOverflow.scroll} <= ${mOverflow.client}）`,
  mOverflow.scroll <= mOverflow.client,
  JSON.stringify(mOverflow),
);
const mParts = await mPage.evaluate(() => ({
  conch: !!document.querySelector('[data-testid="conch-btn"]'),
  input: !!document.querySelector('[data-testid="desk-input"]'),
  seal: !!document.querySelector('[data-testid="seal-send"]'),
}));
check(
  '移动端海螺/输入框/印章均可见',
  mParts.conch && mParts.input && mParts.seal,
  JSON.stringify(mParts),
);
await mCtx.close();

console.log('\n========== 汇总 ==========');
const allErrors = [...consoleErrors].filter(
  (m) =>
    !m.includes('scene-outlines-stream') &&
    !m.includes('/api/csca/multi-agent') &&
    !m.startsWith(GEN_500_MSG) &&
    !m.startsWith('Error sending message') &&
    !m.startsWith('Error parsing SSE chunk') &&
    !m.startsWith('Voice input error'),
);
const httpBadClean = httpBad.filter((b) => !ignoreApi(b));
check(
  '无 console 错误 / 页面异常',
  allErrors.length === 0,
  `\n  → ${allErrors.slice(0, 6).join('\n  → ')}`,
);
check(
  '无 4xx/5xx 资源（除生成/多智能体 LLM API）',
  httpBadClean.length === 0,
  `\n  → ${httpBadClean.slice(0, 6).join('\n  → ')}`,
);
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
