// 南洋出海局 · 8 位像素幕僚透明 PNG / 雪碧图导出（批次 11）
// 用法：先起 dev server（localhost:3000），再 `node scripts/export-advisors.mjs`
// 输出到 brand/advisors/png/：<id>-32/64.png、<id>-breath-32/64.png、lineup-32/64.png
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const EXEC_PATH = 'C:/Users/33181/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3000';
const OUT = 'brand/advisors/png';
const IDS = ['zheng-he', 'ma-huan', 'wang-jinghong', 'fei-xin', 'hong-bao', 'hou-xian', 'zhang-da', 'li-bin'];
const KEY = [255, 0, 255]; // 导出页容器品红 #FF00FF（不在 13 色板内）

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC_PATH });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 2200 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(BASE + '/brand/advisors/export', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// 页面 body 有显式 opaque 背景（@apply bg-background），Playwright
// omitBackground 只覆盖默认白、穿不透显式底色；改走 chroma-key：
// 容器品红底 → 普通截图（RGB）→ 把纯 #FF00FF 像素抠成 alpha=0。
async function chromaKey(path) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error(`期望 3 通道 RGB，实测 ${info.channels}`);
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * 3;
    const p = i * 4;
    if (data[o] === KEY[0] && data[o + 1] === KEY[1] && data[o + 2] === KEY[2]) {
      out[p + 3] = 0; // 品红 → 全透明
    } else {
      out[p] = data[o];
      out[p + 1] = data[o + 1];
      out[p + 2] = data[o + 2];
      out[p + 3] = 255; // 角色像素全不透明（crispEdges 无色阶混色）
    }
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(path);
}

async function shot(locator, path) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`找不到定位锚：${locator}`);
  await page.screenshot({ clip: box, path });
  await chromaKey(path);
}

let count = 0;
for (const id of IDS) {
  for (const size of [32, 64]) {
    await shot(page.locator(`[data-advisor="${id}"][data-size="${size}"][data-frame="0"]`), join(OUT, `${id}-${size}.png`));
    await shot(page.locator(`[data-strip="${id}"][data-strip-size="${size}"]`), join(OUT, `${id}-breath-${size}.png`));
    count += 2;
  }
}
await shot(page.locator('[data-lineup="64"]'), join(OUT, 'lineup-64.png'));
await shot(page.locator('[data-lineup="32"]'), join(OUT, 'lineup-32.png'));
count += 2;

console.log(`✔ 导出 ${count} 张 PNG → ${OUT}/`);
await browser.close();
