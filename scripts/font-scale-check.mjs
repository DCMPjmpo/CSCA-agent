// 品牌页字体层级冒烟（批次 16·重构）
// 验证：正文 16px/1.6（移动端 15px）· 页面标题 28-36px+像素硬阴影 · 数字 Press Start 2P 20-24px
//       · 导师名/功能名 楷体 18-20px · 深色生成器不受影响
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
const px = (s) => Math.round(parseFloat(s) * (s.includes('rem') ? 16 : 1));

const browser = await chromium.launch({ executablePath: EXEC_PATH });

// 桌面视口
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 120));
});

try {
  console.log('========== 桌面 1440px · 首页 ==========');
  await ctx.addInitScript(() => localStorage.setItem('csca_locale', 'zh'));
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  const body = await page.evaluate(() => {
    const el = document.querySelector('.brand-light');
    const cs = getComputedStyle(el);
    return { fs: cs.fontSize, lh: cs.lineHeight };
  });
  check('正文基线 16px', px(body.fs) === 16, `(got=${body.fs})`);
  check(
    '正文行高 1.6',
    (parseFloat(body.lh) / px(body.fs)).toFixed(1) === '1.6',
    `(got=${body.lh})`,
  );

  const title = await page.evaluate(() => {
    const el = document.querySelector('h1.font-page-title');
    const cs = getComputedStyle(el);
    return { fs: cs.fontSize, shadow: cs.textShadow };
  });
  check('页面标题 28-36px', px(title.fs) >= 28 && px(title.fs) <= 36, `(got=${title.fs})`);
  check(
    '页面标题 像素硬阴影 #020b10',
    title.shadow.includes('rgb(2, 11, 16)'),
    `(got=${title.shadow})`,
  );

  const navLabel = await page.evaluate(() => {
    const el = document.querySelector('a[href="/csca"] span.font-brand-body');
    return el ? getComputedStyle(el).fontSize : 'n/a';
  });
  check('功能名（导航）19px', px(navLabel) === 19, `(got=${navLabel})`);

  // 注入探针元素验证数字 / 姓名工具类
  const num = await page.evaluate(() => {
    const el = document.createElement('span');
    el.className = 'font-num';
    document.querySelector('.brand-light').appendChild(el);
    const cs = getComputedStyle(el);
    const fs = cs.fontSize,
      fam = cs.fontFamily;
    el.remove();
    return { fs, fam };
  });
  check('数字 .font-num 20-24px', px(num.fs) >= 20 && px(num.fs) <= 24, `(got=${num.fs})`);
  check('数字 Press Start 2P', /Press Start 2P/i.test(num.fam), `(got=${num.fam.slice(0, 40)})`);

  const kai = await page.evaluate(() => {
    const el = document.createElement('span');
    el.className = 'font-kai-name';
    document.querySelector('.brand-light').appendChild(el);
    const cs = getComputedStyle(el);
    const fs = cs.fontSize,
      fam = cs.fontFamily;
    el.remove();
    return { fs, fam };
  });
  check('姓名 .font-kai-name 18-20px', px(kai.fs) >= 18 && px(kai.fs) <= 20, `(got=${kai.fs})`);
  check('姓名楷体（霞鹜文楷）', /WenKai|LXGW/i.test(kai.fam), `(got=${kai.fam.slice(0, 40)})`);

  console.log('========== 移动端 375px · 首页 ==========');
  const mctx = await browser.newContext({ viewport: { width: 375, height: 740 } });
  await mctx.addInitScript(() => localStorage.setItem('csca_locale', 'zh'));
  const mp = await mctx.newPage();
  await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  const mBody = await mp.evaluate(() => {
    const el = document.querySelector('.brand-light');
    return getComputedStyle(el).fontSize;
  });
  check('移动端正文 15px', px(mBody) === 15, `(got=${mBody})`);
  await mctx.close();

  console.log('========== 深色课堂生成器不变 ==========');
  await page.goto(BASE + '/generation-preview', { waitUntil: 'networkidle' });
  const darkVar = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="brand-shell"], .brand-light');
    return el
      ? 'FOUND-BRAND-SCOPE'
      : getComputedStyle(document.documentElement).getPropertyValue('--text-sm');
  });
  check('深色生成器 --text-sm 14px', px(darkVar) === 14, `(got=${darkVar})`);

  console.log(`\n页面错误：${errors.length} 条`);
  if (errors.length) console.log(errors.slice(0, 10).join('\n'));
} catch (e) {
  fail++;
  console.log(`  ✗ 异常：${e.message}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
