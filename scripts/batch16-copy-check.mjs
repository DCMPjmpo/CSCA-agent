// 南洋出海局 · 航海闯关文案冒烟（批次 16）
// 用法：先起 dev server（localhost:3000），再 `node scripts/batch16-copy-check.mjs`
// 覆盖：3 天未登录回访横幅 / 演武操练游戏层（判分·命中·触礁·战功飘字·三连击破·横扫千军·此战大捷）
import { chromium } from '@playwright/test';

const EXEC_PATH = 'C:/Users/33181/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3000';

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

const browser = await chromium.launch({ executablePath: EXEC_PATH });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

/** /csca 流程 API mock（本地不依赖真实模型） */
async function mockCscaApis(exercises) {
  await page.route('**/api/csca/diagnosis', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          requiredSubjects: ['数学'], recommendedSubjects: ['物理'],
          subjectPriorities: { 数学: 1 }, estimatedDays: 90,
        },
      }),
    }));
  await page.route('**/api/csca/knowledge-map', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{ id: 't1', name: '函数', description: '函数基础', mastery: 40, subject: '数学' }],
      }),
    }));
  await page.route('**/api/csca/adaptive-learning', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: exercises }),
    }));
}

/** 进入演武操练：诊断 → 知识图谱 → 点「开始操练」 */
async function enterAdaptiveLearning(exercises) {
  await mockCscaApis(exercises);
  await page.goto(BASE + '/csca', { waitUntil: 'networkidle' });
  // 探明风向 → knowledge_map
  await page.locator('button:has-text("探明风向")').click();
  await page.waitForSelector('button:has-text("开始操练")', { timeout: 10000 });
  await page.locator('button:has-text("开始操练")').click();
  await page.waitForSelector('button:has-text("呈报")', { timeout: 10000 });
}

try {
  /* ---- 1. 3 天未登录回访横幅 ---- */
  console.log('========== 3 天未登录回访横幅 ==========');
  await ctx.addInitScript(() => window.localStorage.setItem('csca_locale', 'zh'));
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  check('首次访问不弹横幅', (await page.locator('text=舰队已闲置多日').count()) === 0);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  check('当日回访仍不弹横幅', (await page.locator('text=舰队已闲置多日').count()) === 0);
  await page.evaluate(() => window.localStorage.setItem('csca_last_visit', String(Date.now() - 4 * 24 * 3600 * 1000)));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('text=舰队已闲置多日', { timeout: 5000 });
  check('4 天未登录 → 横幅弹出', true);
  const bannerText = await page.locator('text=舰队已闲置多日').innerText();
  check('横幅文案完整', bannerText.includes('提督，舰队已闲置多日，今日风向正好'), `(got=${bannerText})`);
  // 关闭按钮
  await page.locator('button[aria-label="关闭"]').click();
  await page.waitForTimeout(200);
  check('横幅可关闭', (await page.locator('text=舰队已闲置多日').count()) === 0);

  /* ---- 2. 演武操练游戏层：全对 → 命中/战功/三连击破/横扫千军/大捷 ---- */
  console.log('========== 演武操练 · 全对通关 ==========');
  // 5 题全对通关：answers=[0,1,2,3,3]，连击 1→2→3(三连击破)→4→5(横扫千军)
  const exercises = [0, 1, 2, 3, 3].map((ans, i) => ({
    id: `e${i}`, question: `演武第${i + 1}题`, options: ['Option A', 'Option B', 'Option C', 'Option D'],
    answer: ans, difficulty: 1, topic: 't1', subject: '数学',
  }));
  await enterAdaptiveLearning(exercises);

  const pickCorrect = async (letter) => {
    await page.locator(`button:has-text("Option ${letter}")`).click();
    await page.locator('button:has-text("呈报")').click();
  };
  const next = () => page.locator('button:has-text("下一题")').click();

  // 第 1 题：选 A（answer=0）→ 呈报
  await pickCorrect('A');
  await page.waitForSelector('text=命中！', { timeout: 3000 });
  check('答对 → 命中！反馈', true);
  const float1 = await page.locator('.merit-float').first().innerText().catch(() => '');
  check('战功飘字 +10 战功', float1.includes('+10 战功'), `(got=${float1})`);
  check('战功徽章更新', (await page.locator('text=+10 战功').count()) >= 1);

  // 第 2 题：选 B → 连击 2
  await next();
  await pickCorrect('B');
  await page.waitForSelector('text=🔥 2 连击', { timeout: 3000 });
  check('连对 2 题 → 连击徽章 🔥 2 连击', true);

  // 第 3 题：选 C → 三连击破横幅
  await next();
  await pickCorrect('C');
  await page.waitForSelector('text=三连击破！', { timeout: 3000 });
  check('连对 3 题 → 三连击破！横幅', true);
  // 等横幅自动消失（1.5s），再进第 4 题，避免残留节点干扰断言
  await page.waitForSelector('text=三连击破！', { state: 'detached', timeout: 4000 });

  // 第 4 题：选 D
  await next();
  await pickCorrect('D');
  await page.waitForTimeout(200);
  check('第 4 题命中无新横幅', (await page.locator('text=三连击破！').count()) === 0);

  // 第 5 题：选 D（answer=3）→ 横扫千军 + 大捷
  await next();
  await pickCorrect('D');
  await page.waitForSelector('text=横扫千军！', { timeout: 3000 });
  check('连对 5 题 → 横扫千军！全屏横幅', true);
  await page.waitForSelector('text=此战大捷！斩获 50 战功', { timeout: 5000 });
  check('完成练习 → 此战大捷！斩获 50 战功', true);
  check('战功徽章终值 +50 战功', (await page.locator('text=+50 战功').count()) >= 1);

  /* ---- 3. 演武操练 · 答错触礁 + 连击重置 ---- */
  console.log('========== 演武操练 · 触礁 ==========');
  const ex2 = [
    { id: 'w1', question: '错题演武', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 2, difficulty: 1, topic: 't1', subject: '数学' },
    { id: 'w2', question: '后一题', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 1, difficulty: 1, topic: 't1', subject: '数学' },
  ];
  await enterAdaptiveLearning(ex2);
  await page.locator('button:has-text("Option A")').click();
  await page.locator('button:has-text("呈报")').click();
  await page.waitForSelector('text=触礁！正确答案是C', { timeout: 3000 });
  check('答错 → 触礁！正确答案是C', true);
  check('答错无连击徽章', (await page.locator('text=连击').count()) === 0);
  // 下一题仍答对 → 战功从 10 起（连击重置）
  await page.locator('button:has-text("下一题")').click();
  await page.locator('button:has-text("Option B")').click();
  await page.locator('button:has-text("呈报")').click();
  await page.waitForSelector('text=命中！', { timeout: 3000 });
  await page.waitForTimeout(200);
  const meritAfterWrong = await page.locator('text=+10 战功').count();
  check('触礁后重答 → 战功归零从 +10 起', meritAfterWrong >= 1);

  console.log(`\n页面错误：${errors.length} 条`);
  if (errors.length) console.log(errors.slice(0, 10).join('\n'));
} catch (e) {
  fail++;
  console.log(`  ✗ 异常：${e.message}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
