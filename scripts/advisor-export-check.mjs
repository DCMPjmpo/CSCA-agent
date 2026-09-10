// 南洋出海局 · 8 位像素幕僚验证（批次 11）
// 1) PNG/雪碧图：存在性 + 尺寸（sharp）+ 透明度（角透明 / 中心不透明）
// 2) 评审页：8 张角色卡、advisor-breathe 动画在位、64px 卡实测 64×64、
//    CSS 含 3 段 advisor-breathe keyframes、无 console/4xx-5xx（除 LLM 环境 API）
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const EXEC_PATH = 'C:/Users/33181/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3000';
const OUT = 'brand/advisors/png';
const IDS = ['zheng-he', 'ma-huan', 'wang-jinghong', 'fei-xin', 'hong-bao', 'hou-xian', 'zhang-da', 'li-bin'];

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

const GEN_500_MSG = 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)';
const ignoreApi = (u) => u.includes('/api/') && !u.includes('favicon');

/* =========================== 1. PNG 文件检查 =========================== */
const EXPECTED = {};
for (const id of IDS) {
  EXPECTED[`${id}-32.png`] = [32, 32];
  EXPECTED[`${id}-64.png`] = [64, 64];
  EXPECTED[`${id}-breath-32.png`] = [96, 32];
  EXPECTED[`${id}-breath-64.png`] = [192, 64];
}
EXPECTED['lineup-32.png'] = [8 * 32, 32];
EXPECTED['lineup-64.png'] = [8 * 64, 64];

console.log('========== PNG 文件：尺寸 + 透明度 ==========');
const alphaChecks = [];
for (const [file, [w, h]] of Object.entries(EXPECTED)) {
  const path = join(OUT, file);
  check(`${file} 存在`, existsSync(path), `(missing ${path})`);
  if (!existsSync(path)) continue;
  const meta = await sharp(path).metadata();
  check(`${file} 尺寸 ${w}×${h}`, meta.width === w && meta.height === h, `(实测 ${meta.width}×${meta.height})`);
  check(`${file} 含 alpha 通道`, meta.channels === 4, `(channels=${meta.channels})`);
  alphaChecks.push([file, path]);
}

// 透明度抽查：全透明 PNG 的左上角 alpha=0、人形中心不透明
// （lineup 中心是第 4/5 人之间的空隙，改用第 2 人（ma-huan）胸腹点）
function centerPoint(file, info) {
  if (file.startsWith('lineup-')) {
    return file.includes('lineup-32') ? { x: 48, y: 16 } : { x: 96, y: 32 };
  }
  return { x: Math.floor(info.width / 2), y: Math.floor(info.height / 2) };
}
for (const [file, path] of alphaChecks) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => info.channels * (y * info.width + x);
  const cornerA = data[at(0, 0) + 3];
  const pt = centerPoint(file, info);
  const centerA = data[at(pt.x, pt.y) + 3];
  check(`${file} 角透明(alpha=${cornerA})`, cornerA === 0, `(cornerA=${cornerA})`);
  check(`${file} 人形不透明(alpha=${centerA})`, centerA > 0, `(centerA=${centerA})`);
}

/* =========================== 2. 评审页检查 =========================== */
console.log('\n========== /brand/advisors 评审页 ==========');
const browser = await chromium.launch({ executablePath: EXEC_PATH });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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

await page.goto(BASE + '/brand/advisors', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

check('8 张角色卡', (await page.locator('[data-advisor-card]').count()) === 8);
const animated = await page.locator('.advisor-breathe').count();
check(`8 个呼吸动画身（实测 ${animated}）`, animated === 8);

const card = await page.evaluate(() => {
  const el = document.querySelector('[data-advisor-card] svg');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height };
});
check(`角色卡 64px 实测 ${card?.w}×${card?.h}`, card?.w === 64 && card?.h === 64, JSON.stringify(card));

const keyframes = await page.evaluate(() => {
  const out = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.name === 'advisor-breathe' && rule.cssRules) {
          for (const kf of rule.cssRules) out.push(kf.keyText);
        }
      }
    } catch {}
  }
  return out;
});
// Chromium 把 0% 与 100% 合并报告为 "0%, 100%"，需按子串匹配
const kfAll = keyframes.join(',');
check(
  `advisor-breathe 3 段 keyframes（实测 [${keyframes.join(',')}]）`,
  kfAll.includes('0%') && kfAll.includes('50%') && kfAll.includes('100%'),
  JSON.stringify(keyframes),
);

const reduced = await page.evaluate(() => {
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.media && rule.media.mediaText.includes('prefers-reduced-motion')) return true;
      }
    } catch {}
  }
  return false;
});
check('prefers-reduced-motion 降级', reduced);

/* =========================== 3. 汇总 =========================== */
const allErrors = consoleErrors.filter(
  (m) => !m.includes('scene-outlines-stream') && !m.startsWith(GEN_500_MSG) && !m.startsWith('Error sending message') && !m.startsWith('Error parsing SSE chunk') && !m.startsWith('Voice input error'),
);
const httpBadClean = httpBad.filter((b) => !ignoreApi(b));
check('无 console 错误 / 页面异常', allErrors.length === 0, `\n  → ${allErrors.slice(0, 6).join('\n  → ')}`);
check('无 4xx/5xx 资源（除 LLM API）', httpBadClean.length === 0, `\n  → ${httpBadClean.slice(0, 6).join('\n  → ')}`);

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
