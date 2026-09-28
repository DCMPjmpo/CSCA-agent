// 按钮/卡片/卷轴弹窗/竹简抽屉体系检查（南洋出海局 · 批次 10）
// 用法：先起 dev server（localhost:3000），再 `node scripts/brand-system-check.mjs`
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

const GEN_500_MSG =
  'Failed to load resource: the server responded with a status of 500 (Internal Server Error)';
const ignoreApi = (u) => u.includes('/api/') && !u.includes('favicon');

const browser = await chromium.launch({ executablePath: EXEC_PATH });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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

console.log('========== 首页 hero：主按钮（朱砂底 + 金箔 2px 边框 + 微浮雕投影） ==========');
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const hero = await page.evaluate(() => {
  const el = document.querySelector('a.btn-brand-primary');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    bg: cs.backgroundColor,
    borderColor: cs.borderColor,
    borderWidth: cs.borderTopWidth,
    radius: cs.borderTopLeftRadius,
    shadow: cs.boxShadow,
    color: cs.color,
  };
});
check(`主按钮存在`, !!hero, 'a.btn-brand-primary not found');
check(
  `朱砂红底 rgb(184,34,34)（实测 ${hero?.bg}）`,
  hero?.bg === 'rgb(184, 34, 34)',
  JSON.stringify(hero),
);
check(
  `金箔 2px 边框（实测 ${hero?.borderColor} / ${hero?.borderWidth}）`,
  hero?.borderColor === 'rgb(201, 162, 39)' && hero?.borderWidth === '2px',
  JSON.stringify(hero),
);
check(
  `微浮雕投影含 inset 高光 + 底部唇影`,
  /inset/.test(hero?.shadow || '') && /0px 2px 0px/.test(hero?.shadow || ''),
  `(shadow=${hero?.shadow?.slice(0, 80)}…)`,
);
check(`体系圆角 10px（实测 ${hero?.radius}）`, hero?.radius === '10px', `(radius=${hero?.radius})`);
check(
  `金箔文字色（实测 ${hero?.color}）`,
  hero?.color === 'rgb(245, 240, 230)',
  `(color=${hero?.color})`,
);

console.log('\n========== /csca 诊断页：标准卡 + 选中/未选瓦片 ==========');
await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const stdCard = await page.evaluate(() => {
  const el = document.querySelector('.card-brand');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    radius: cs.borderTopLeftRadius,
    borderWidth: cs.borderTopWidth,
    borderColor: cs.borderColor,
    bg: cs.backgroundColor,
  };
});
check(`标准卡存在`, !!stdCard, '.card-brand not found');
check(
  `标准卡 4px 圆角（实测 ${stdCard?.radius}）`,
  stdCard?.radius === '4px',
  JSON.stringify(stdCard),
);
check(
  `标准卡 1px 檀木棕边框（实测 ${stdCard?.borderWidth} / ${stdCard?.borderColor}）`,
  stdCard?.borderWidth === '1px' && (stdCard?.borderColor || '').startsWith('rgba(139, 90, 43'),
  JSON.stringify(stdCard),
);
check(
  `标准卡宣纸白底 rgb(245,240,230)（实测 ${stdCard?.bg}）`,
  stdCard?.bg === 'rgb(245, 240, 230)',
  JSON.stringify(stdCard),
);

// 主按钮（开始诊断）
const primaryBtn = await page.evaluate(() => {
  const el = document.querySelector('button.btn-brand-primary');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { bg: cs.backgroundColor, borderColor: cs.borderColor, borderWidth: cs.borderTopWidth };
});
check(
  `/csca 主按钮朱砂底 + 金箔边框（${primaryBtn?.bg} / ${primaryBtn?.borderColor}）`,
  primaryBtn?.bg === 'rgb(184, 34, 34)' && primaryBtn?.borderColor === 'rgb(201, 162, 39)',
  JSON.stringify(primaryBtn),
);

// 选中瓦片：金箔 2px 边框 + ::before 左侧 4px 朱砂竖条
const selTile = await page.evaluate(() => {
  const el = document.querySelector('.card-brand-selected');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const before = getComputedStyle(el, '::before');
  return {
    borderColor: cs.borderColor,
    borderWidth: cs.borderTopWidth,
    beforeW: before.width,
    beforeBg: before.backgroundColor,
    beforeLeft: before.left,
    beforeTop: before.top,
    beforeBottom: before.bottom,
  };
});
check(
  `选中瓦片金箔 2px 边框（实测 ${selTile?.borderColor} / ${selTile?.borderWidth}）`,
  selTile?.borderColor === 'rgb(201, 162, 39)' && selTile?.borderWidth === '2px',
  JSON.stringify(selTile),
);
check(
  `选中瓦片 ::before 4px 朱砂竖条（实测 ${selTile?.beforeW} / ${selTile?.beforeBg}）`,
  selTile?.beforeW === '4px' && selTile?.beforeBg === 'rgb(184, 34, 34)',
  JSON.stringify(selTile),
);
check(
  `竖条贴左且贯通顶底（${selTile?.beforeLeft} / ${selTile?.beforeTop} / ${selTile?.beforeBottom}）`,
  selTile?.beforeLeft === '0px' && selTile?.beforeTop === '0px' && selTile?.beforeBottom === '0px',
  JSON.stringify(selTile),
);

// 未选瓦片：card-brand-tint + bg-white
const unselTile = await page.evaluate(() => {
  const el = document.querySelector('.card-brand-tint.bg-white');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { bg: cs.backgroundColor, borderWidth: cs.borderTopWidth };
});
check(
  `未选瓦片白底 + 1px 边框（实测 ${unselTile?.bg} / ${unselTile?.borderWidth}）`,
  unselTile?.bg === 'rgb(255, 255, 255)' && unselTile?.borderWidth === '1px',
  JSON.stringify(unselTile),
);

// 幽灵/危险按钮：深链步骤不可达（需 LLM API），改为校验编译后 CSS 规则
const cssRules = await page.evaluate(() => {
  // 精确匹配基类（.btn-brand-ghost 无伪类），避免先命中 :hover/:disabled 规则
  const find = (sheet, sel) => {
    for (const rule of sheet.cssRules || []) {
      if (rule.selectorText && rule.selectorText.trim() === sel) return rule.cssText;
      if (rule.cssRules) {
        const hit = find(rule, sel);
        if (hit) return hit;
      }
    }
    return '';
  };
  const out = {};
  for (const sheet of document.styleSheets) {
    try {
      if (!out.ghost) out.ghost = find(sheet, '.btn-brand-ghost');
      if (!out.danger) out.danger = find(sheet, '.btn-brand-danger');
      if (!out.secondary) out.secondary = find(sheet, '.btn-brand-secondary');
    } catch {}
  }
  return out;
});
check(
  `幽灵按钮 CSS 规则（透明底 + 边框）`,
  /(?:background\s*:\s*none|transparent)/.test(cssRules.ghost || '') &&
    /border/.test(cssRules.ghost || ''),
  `(css=${(cssRules.ghost || '').slice(0, 90)}…)`,
);
check(
  `危险按钮 CSS 规则（告警橙底）`,
  /230, 126, 34/.test(cssRules.danger || ''),
  `(css=${(cssRules.danger || '').slice(0, 90)}…)`,
);
check(
  `次按钮 CSS 规则（宣纸底 + 靛青边框）`,
  /245, 240, 230/.test(cssRules.secondary || '') && /30, 58, 95/.test(cssRules.secondary || ''),
  `(css=${(cssRules.secondary || '').slice(0, 90)}…)`,
);

console.log('\n========== 首页深链 #classroom-generator：卷轴弹窗 ScrollDialog ==========');
await page.goto(BASE + '/#classroom-generator', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const scrollDlg = await page.evaluate(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  if (!dlg) return null;
  const cs = getComputedStyle(dlg);
  const titlebar = dlg.querySelector('.scroll-titlebar');
  const tb = titlebar ? getComputedStyle(titlebar) : null;
  return {
    rollers: dlg.querySelectorAll('.scroll-roller').length,
    titlebarBg: tb?.backgroundColor,
    seal: dlg.querySelector('.scroll-seal')?.textContent,
    hasClose: !!dlg.querySelector('.scroll-close'),
    hasTextarea: !!dlg.querySelector('textarea'),
    hasGenerateBtn: !!dlg.querySelector('button.btn-brand-primary'),
    dialogBg: cs.backgroundColor,
  };
});
check(`弹窗出现`, !!scrollDlg, 'dialog-content not found');
check(
  `上下轴头各一（${scrollDlg?.rollers} 个）`,
  scrollDlg?.rollers === 2,
  JSON.stringify(scrollDlg),
);
check(
  `标题栏朱砂底 rgb(184,34,34)（实测 ${scrollDlg?.titlebarBg}）`,
  scrollDlg?.titlebarBg === 'rgb(184, 34, 34)',
  JSON.stringify(scrollDlg),
);
check(`「令」字印章`, scrollDlg?.seal === '令', `(seal=${scrollDlg?.seal})`);
check(`合卷关闭按钮`, !!scrollDlg?.hasClose);
check(
  `宣纸弹窗底 rgb(245,240,230)（实测 ${scrollDlg?.dialogBg}）`,
  scrollDlg?.dialogBg === 'rgb(245, 240, 230)',
  JSON.stringify(scrollDlg),
);
check(
  `讲学堂 textarea + 主按钮生成`,
  scrollDlg?.hasTextarea && scrollDlg?.hasGenerateBtn,
  JSON.stringify(scrollDlg),
);

// 合卷关闭
await page.locator('[data-slot="dialog-content"] .scroll-close').click();
await page.waitForTimeout(350);
check('合卷后弹窗关闭', (await page.locator('[data-slot="dialog-content"]').count()) === 0);

console.log('\n========== /csca-multi-agent：次按钮 + 花名册竹简抽屉 ==========');
await page.goto(BASE + '/csca-multi-agent', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const rosterBtn = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="roster-btn"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    bg: cs.backgroundColor,
    borderColor: cs.borderColor,
    borderWidth: cs.borderTopWidth,
    text: el.textContent,
  };
});
check(`花名册按钮存在`, !!rosterBtn, 'roster-btn not found');
check(
  `次按钮宣纸底 rgb(245,240,230)（实测 ${rosterBtn?.bg}）`,
  rosterBtn?.bg === 'rgb(245, 240, 230)',
  JSON.stringify(rosterBtn),
);
check(
  `次按钮靛青蓝 1px 边框（实测 ${rosterBtn?.borderColor} / ${rosterBtn?.borderWidth}）`,
  rosterBtn?.borderColor === 'rgb(30, 58, 95)' && rosterBtn?.borderWidth === '1px',
  JSON.stringify(rosterBtn),
);
check(`花名册按钮文字`, (rosterBtn?.text || '').includes('花名册'), `(text=${rosterBtn?.text})`);

await page.locator('[data-testid="roster-btn"]').click();
await page.waitForTimeout(450);
const drawer = await page.evaluate(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  if (!dlg) return null;
  const r = dlg.getBoundingClientRect();
  const cs = getComputedStyle(dlg);
  return {
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
    usedWidth: document.documentElement.scrollWidth,
    bg: cs.backgroundImage,
    buttons: dlg.querySelectorAll('button').length,
    title: dlg.querySelector('.scroll-title')?.textContent,
    rows: dlg.querySelectorAll('.scroll-titlebar ~ * button').length,
  };
});
check(`抽屉出现`, !!drawer, 'drawer not opened');
check(
  `右侧贴边（right=${drawer?.right} ≈ 可用区 ${drawer?.usedWidth}，滚动条 15px 外置）`,
  Math.abs((drawer?.right ?? 0) - (drawer?.usedWidth ?? 0)) <= 1,
  JSON.stringify(drawer),
);
check(
  `全高（top=${drawer?.top} / bottom=${drawer?.bottom}）`,
  drawer?.top === 0 && drawer?.bottom === 800,
  JSON.stringify(drawer),
);
check(
  `竹简纹理背景（data:image/svg+xml）`,
  (drawer?.bg || '').includes('data:image/svg+xml'),
  `(bg=${(drawer?.bg || '').slice(0, 30)}…)`,
);
check(`标题「花名册」`, drawer?.title === '花名册', `(title=${drawer?.title})`);
check(
  `8 幕僚行 + 合卷关闭（${drawer?.buttons} 钮）`,
  drawer?.buttons === 9,
  JSON.stringify(drawer),
);

// 点击某幕僚 → 合卷 + @提及
const firstRow = await page
  .locator('[data-slot="dialog-content"] .scroll-titlebar ~ * button')
  .first();
await firstRow.click();
await page.waitForTimeout(450);
check('点幕僚后抽屉关闭', (await page.locator('[data-slot="dialog-content"]').count()) === 0);

console.log('\n========== 移动端（390×844）：竹简抽屉 ==========');
const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
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
await mPage.locator('[data-testid="roster-btn"]').click();
await mPage.waitForTimeout(450);
const mDrawer = await mPage.evaluate(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  if (!dlg) return null;
  const r = dlg.getBoundingClientRect();
  return {
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
    usedWidth: document.documentElement.scrollWidth,
  };
});
check(
  `移动端右侧贴边（right=${mDrawer?.right} ≈ 可用区 ${mDrawer?.usedWidth}）`,
  Math.abs((mDrawer?.right ?? 0) - (mDrawer?.usedWidth ?? 0)) <= 1,
  JSON.stringify(mDrawer),
);
check(
  `移动端全高（top=${mDrawer?.top} / bottom=${mDrawer?.bottom}）`,
  mDrawer?.top === 0 && mDrawer?.bottom === 844,
  JSON.stringify(mDrawer),
);
check(
  `移动端无横向溢出（width=${mDrawer?.width} <= 390）`,
  (mDrawer?.width ?? 999) <= 390,
  JSON.stringify(mDrawer),
);
await mCtx.close();

console.log('\n========== 汇总 ==========');
const allErrors = [...consoleErrors].filter(
  (m) =>
    !m.includes('scene-outlines-stream') &&
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
  '无 4xx/5xx 资源（除 LLM API）',
  httpBadClean.length === 0,
  `\n  → ${httpBadClean.slice(0, 6).join('\n  → ')}`,
);
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
