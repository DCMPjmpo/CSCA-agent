// CSCA Web Worker 冒烟测试：
// ① 知识图谱力导向布局 Worker（进入知识图谱步骤 → worker chunk 加载 + canvas 渲染 + Loading 消失）
// ② 诊断测试判分 Worker（#mock-exam → 开始模考 → 故意答错 1 题 → 提交 → worker chunk 加载 + 结果页 + 错题/计划写入）
//
// 注意：
// - 页面语言用 localStorage['csca_locale'] 持久化，此处统一固定为 'en'，保证按钮文本可断言。
// - Worker 脚本的 fetch 不会出现在 performance resource timing 里，改用 page.on('request') 采集 chunk 请求。
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3099';
// 与构建产物 hash 对应：worker entry chunk 文件名
const KG_WORKER_CHUNK = 'ea3bd75c21beb20a';
const SCORE_WORKER_CHUNK = '17532c836d319e24';
const errors = [];

function workerChunkLoaded(requests, chunk) {
  return requests.some((u) => u.includes('/_next/static/chunks/') && u.includes(chunk));
}

let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ channel: 'msedge' });
}
const page = await browser.newPage();
// 固定英文语言，避免上一会话残留的泰语/其他偏好导致按钮文本不可预测
await page.addInitScript(() => localStorage.setItem('csca_locale', 'en'));
const chunkRequests = [];
page.on('request', (r) => {
  const u = r.url();
  if (u.includes('/_next/static/chunks/')) chunkRequests.push(u);
});
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 160)));

// ---------- ① 知识图谱 Worker ----------
console.log('\n=== ① Knowledge graph force-layout worker ===');
await page.goto(BASE + '/csca', { waitUntil: 'load' });
await page.waitForTimeout(800);

const btn = page.getByRole('button', { name: /Start Diagnosis|开始诊断|เริ่มวินิจฉัย/i });
const btnCount = await btn.count();
console.log('diagnosis buttons found:', btnCount);
if (btnCount > 0) {
  await btn.first().click();
  await page.waitForTimeout(4000);
}
console.log('canvas elements (echarts):', await page.locator('canvas').count());
console.log('kg worker chunk loaded:', await workerChunkLoaded(chunkRequests, KG_WORKER_CHUNK));
console.log('layout Loading overlay gone:', (await page.getByText('Loading…', { exact: true }).count()) === 0);
console.log('knowledge map section visible:', await page.getByText('Knowledge Map', { exact: false }).first().isVisible().catch(() => false));

// ---------- ② 判分 Worker ----------
console.log('\n=== ② Score-exam worker ===');
// 上一部分已停留在 /csca；到 /csca#mock-exam 属于同文档 hash 跳转，不会重跑 mount 时的 hash 初始化 effect，
// 必须 reload 一次强制重新挂载页面，才能进入 exam_center。
await page.goto(BASE + '/csca#mock-exam', { waitUntil: 'load' });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1200);

// 默认已选中「数学」；点“开始模考”按钮（文本形如 "Start Exam (数学)"）
const startBtn = page.getByRole('button', { name: /Start Exam|开始模考|เริ่มการสอบ/i });
console.log('start exam buttons:', await startBtn.count());
if (await startBtn.count() > 0) {
  await startBtn.last().click();
  await page.waitForTimeout(5000);
}

// 确认已进入 exam 步骤：头部"Submit Exam"按钮只在该步骤存在
const submitBtn = page.getByRole('button', { name: /Submit Exam|提交|ส่งคำตอบ/i });
console.log('exam question rendered (Submit button found):', await submitBtn.count());

// 故意答错当前第 1 题：点第 2 个选项（B），再点头部"Submit Exam"
const optionBadge = page.locator('span.w-8.h-8.rounded-lg');
if (await optionBadge.count() > 0) {
  await optionBadge.nth(1).locator('..').click();
  await page.waitForTimeout(300);
}
if (await submitBtn.count() > 0) {
  await submitBtn.first().click();
  await page.waitForTimeout(4000);
}

const resultVisible = await page.getByText('Exam Score', { exact: false }).count();
console.log('result step visible:', resultVisible);
console.log('score worker chunk loaded:', await workerChunkLoaded(chunkRequests, SCORE_WORKER_CHUNK));
const storage = await page.evaluate(() => {
  let records = -1;
  let plan = null;
  try {
    records = JSON.parse(localStorage.getItem('csca_error_records') || '[]').length;
  } catch {}
  try {
    plan = localStorage.getItem('csca_study_plan');
  } catch {}
  return { records, hasPlan: !!plan };
});
console.log('csca_error_records entries:', storage.records);
console.log('csca_study_plan written:', storage.hasPlan);

console.log('\nconsole errors:', errors.length ? errors : 'none');
await browser.close();
