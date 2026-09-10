/**
 * P4.1 题库去重审计脚本
 * 只读分析：统计总题量、唯一 ID、唯一 fingerprint、完全重复、高度重复
 * 运行方式: node scripts/audit-question-bank.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

// ============ 加载题库 ============
const questionsFromTxt = JSON.parse(
  readFileSync(join(root, 'data/processed/questions_from_txt.json'), 'utf-8'),
);
const cscaQuestionsV1 = JSON.parse(
  readFileSync(join(root, 'data/processed/csca_questions_v1.json'), 'utf-8'),
);

// V1 subject 别名映射
const V1_SUBJECT_ALIAS = {
  '中文(理科)': '理科中文',
  '中文(文科)': '文科中文',
};

// 复刻 dedupQuestionIds 逻辑（仅用于审计统计）
function dedupQuestionIds(questions) {
  const seen = new Map();
  return questions.map((q) => {
    const count = seen.get(q.id) ?? 0;
    seen.set(q.id, count + 1);
    if (count === 0) return q;
    const runtimeId = `${q.id}#${count + 1}`;
    return { ...q, id: runtimeId, uniqueId: q.uniqueId || q.id };
  });
}

const ALL_QUESTIONS = dedupQuestionIds([
  ...(questionsFromTxt.questions || []),
  ...(cscaQuestionsV1.questions || []).map((q) => ({
    ...q,
    subject: V1_SUBJECT_ALIAS[q.subject] ?? q.subject,
  })),
]);

// ============ Fingerprint normalize ============
function normalizeText(s) {
  if (s == null) return '';
  let t = String(s);
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/[`*_~#>]/g, '');
  t = t.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  t = t.replace(/【/g, '(').replace(/】/g, ')').replace(/「/g, '(').replace(/」/g, ')');
  t = t.replace(/《/g, '(').replace(/》/g, ')').replace(/〈/g, '(').replace(/〉/g, ')');
  t = t.replace(/([A-Da-d])\s*[.．、)]\s*/g, '$1');
  t = t.replace(/(\d+)\s*[.．、)]\s*/g, '$1');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/，/g, ',').replace(/。/g, '.').replace(/：/g, ':').replace(/；/g, ';');
  t = t.replace(/？/g, '?').replace(/！/g, '!');
  t = t.toLowerCase();
  return t;
}

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length === 0) return '';
  return options.map((opt) => {
    if (opt == null) return '';
    if (typeof opt === 'object') return normalizeText(opt.value || '');
    return normalizeText(String(opt));
  }).join('|');
}

function makeFingerprint(q) {
  const subject = normalizeText(q.subject || '');
  const track = normalizeText(q.track || '');
  const stem = normalizeText(q.question || '');
  const options = normalizeOptions(q.options);
  return `${subject}::${track}::${stem}::${options}`;
}

function makeStemFingerprint(q) {
  const subject = normalizeText(q.subject || '');
  const stem = normalizeText(q.question || '');
  return `${subject}::${stem}`;
}

// ============ 统计 ============
const total = ALL_QUESTIONS.length;
const idSet = new Set(ALL_QUESTIONS.map((q) => q.id));
const uniqueIdCount = idSet.size;

const fpMap = new Map();
for (const q of ALL_QUESTIONS) {
  const fp = makeFingerprint(q);
  if (!fpMap.has(fp)) fpMap.set(fp, []);
  fpMap.get(fp).push(q);
}
const uniqueFingerprintCount = fpMap.size;
const exactDuplicates = Array.from(fpMap.values()).filter((arr) => arr.length > 1);

const stemMap = new Map();
for (const q of ALL_QUESTIONS) {
  const sfp = makeStemFingerprint(q);
  if (!stemMap.has(sfp)) stemMap.set(sfp, []);
  stemMap.get(sfp).push(q);
}
const stemDuplicates = Array.from(stemMap.values()).filter((arr) => arr.length > 1);

const bySubject = new Map();
for (const q of ALL_QUESTIONS) {
  const s = q.subject || '未知';
  if (!bySubject.has(s)) bySubject.set(s, { total: 0, uniqueId: new Set(), uniqueFp: new Set() });
  const entry = bySubject.get(s);
  entry.total++;
  entry.uniqueId.add(q.id);
  entry.uniqueFp.add(makeFingerprint(q));
}

const byTrack = new Map();
for (const q of ALL_QUESTIONS) {
  const t = q.track || '未知';
  if (!byTrack.has(t)) byTrack.set(t, { total: 0, uniqueId: new Set(), uniqueFp: new Set() });
  const entry = byTrack.get(t);
  entry.total++;
  entry.uniqueId.add(q.id);
  entry.uniqueFp.add(makeFingerprint(q));
}

const bySource = new Map();
for (const q of ALL_QUESTIONS) {
  const s = q.source || 'unknown';
  if (!bySource.has(s)) bySource.set(s, 0);
  bySource.set(s, bySource.get(s) + 1);
}

const byFile = new Map();
for (const q of ALL_QUESTIONS) {
  const f = q.sourceFile || 'unknown';
  if (!byFile.has(f)) byFile.set(f, 0);
  byFile.set(f, byFile.get(f) + 1);
}

const choiceQuestions = ALL_QUESTIONS.filter(
  (q) => q.type === '选择题' && Array.isArray(q.options) && q.options.length > 0 && q.answer,
);
const choiceBySubject = new Map();
for (const q of choiceQuestions) {
  const s = q.subject || '未知';
  if (!choiceBySubject.has(s)) choiceBySubject.set(s, { total: 0, uniqueId: new Set(), uniqueFp: new Set() });
  const entry = choiceBySubject.get(s);
  entry.total++;
  entry.uniqueId.add(q.id);
  entry.uniqueFp.add(makeFingerprint(q));
}

const CSCA_SUBJECTS_BLUEPRINT = [
  { id: 'chinese', name: '基础汉语（综合）', totalQuestions: 100 },
  { id: 'math', name: '数学', totalQuestions: 60 },
  { id: 'physics', name: '物理', totalQuestions: 50 },
  { id: 'chemistry', name: '化学', totalQuestions: 50 },
  { id: 'science-chinese', name: '理科中文', totalQuestions: 80 },
  { id: 'arts-chinese', name: '文科中文', totalQuestions: 60 },
];

console.log('========== P4.1 题库去重审计 ==========\n');

console.log('【1. 总量统计】');
console.log(`  总题量（ALL_QUESTIONS，含 dedupQuestionIds 处理后）: ${total}`);
console.log(`  unique question ID 数: ${uniqueIdCount}`);
console.log(`  unique fingerprint 数（含 subject+track+stem+options）: ${uniqueFingerprintCount}`);
console.log(`  unique stem fingerprint 数（仅 subject+stem）: ${stemMap.size}`);
console.log(`  完全重复（fingerprint 相同）组数: ${exactDuplicates.length}`);
console.log(`  完全重复涉及的题目总数: ${exactDuplicates.reduce((s, arr) => s + arr.length, 0)}`);
console.log(`  高度重复（仅题干相同）组数: ${stemDuplicates.length}`);
console.log(`  高度重复涉及的题目总数: ${stemDuplicates.reduce((s, arr) => s + arr.length, 0)}`);

console.log('\n【2. 完全重复示例（前 10 组）】');
exactDuplicates.slice(0, 10).forEach((arr, i) => {
  console.log(`  组${i + 1}: ${arr.length} 道重复`);
  arr.forEach((q) => {
    console.log(`    - id=${q.id} | subject=${q.subject} | source=${q.source || 'unknown'} | sourceFile=${q.sourceFile}`);
    console.log(`      stem="${(q.question || '').slice(0, 60)}..."`);
  });
});

console.log('\n【3. 高度重复示例（仅题干相同，前 10 组）】');
stemDuplicates.slice(0, 10).forEach((arr, i) => {
  console.log(`  组${i + 1}: ${arr.length} 道题干相同`);
  arr.forEach((q) => {
    console.log(`    - id=${q.id} | subject=${q.subject} | track=${q.track} | source=${q.source || 'unknown'}`);
    console.log(`      stem="${(q.question || '').slice(0, 60)}..."`);
  });
});

console.log('\n【4. 各科目数量】');
console.log('  subject | total | uniqueId | uniqueFp');
const subjectRows = Array.from(bySubject.entries()).sort((a, b) => b[1].total - a[1].total);
for (const [subject, entry] of subjectRows) {
  console.log(`  ${subject} | ${entry.total} | ${entry.uniqueId.size} | ${entry.uniqueFp.size}`);
}

console.log('\n【5. 各 track 数量】');
console.log('  track | total | uniqueId | uniqueFp');
const trackRows = Array.from(byTrack.entries()).sort((a, b) => b[1].total - a[1].total);
for (const [track, entry] of trackRows) {
  console.log(`  ${track} | ${entry.total} | ${entry.uniqueId.size} | ${entry.uniqueFp.size}`);
}

console.log('\n【6. 各来源数量】');
for (const [source, count] of Array.from(bySource.entries()).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${source}: ${count}`);
}

console.log('\n【7. 各 sourceFile 数量（前 20）】');
const fileEntries = Array.from(byFile.entries()).sort((a, b) => b[1] - a[1]);
for (const [file, count] of fileEntries.slice(0, 20)) {
  console.log(`  ${file}: ${count}`);
}
console.log(`  ... 共 ${fileEntries.length} 个 sourceFile`);

console.log('\n【8. 可用于正式考试的选择题统计（type=选择题 & 有 options & 有 answer）】');
console.log('  subject | choiceTotal | uniqueId | uniqueFp');
const choiceRows = Array.from(choiceBySubject.entries()).sort((a, b) => b[1].total - a[1].total);
let totalChoice = 0;
let totalChoiceUniqueFp = 0;
for (const [subject, entry] of choiceRows) {
  console.log(`  ${subject} | ${entry.total} | ${entry.uniqueId.size} | ${entry.uniqueFp.size}`);
  totalChoice += entry.total;
  totalChoiceUniqueFp += entry.uniqueFp.size;
}
console.log(`  ---- 合计选择题: ${totalChoice} | uniqueFp: ${totalChoiceUniqueFp}`);

console.log('\n【9. Blueprint 配额 vs 真实唯一选择题池】');
console.log('  subject | blueprint | realChoiceUniqueFp | gap');
let totalBlueprint = 0;
let totalRealUnique = 0;
for (const subj of CSCA_SUBJECTS_BLUEPRINT) {
  const entry = choiceBySubject.get(subj.name);
  const realUnique = entry ? entry.uniqueFp.size : 0;
  const gap = realUnique - subj.totalQuestions;
  totalBlueprint += subj.totalQuestions;
  totalRealUnique += Math.min(realUnique, subj.totalQuestions);
  console.log(`  ${subj.name} (${subj.id}) | ${subj.totalQuestions} | ${realUnique} | ${gap >= 0 ? 'OK' : gap}`);
}
console.log(`  ---- blueprint 合计需求: ${totalBlueprint}`);
console.log(`  ---- 实际可组卷上限（各科目取 min(blueprint, realUnique) 之和）: ${totalRealUnique}`);

console.log('\n【10. 默认考试组卷链路分析】');
console.log('  默认请求科目: 基础汉语, 数学, 物理, 理科中文');
console.log('  默认目标题量: 100 + 60 + 50 + 80 = 290（不是 115）');
console.log('  若前端请求 115 题 / 4 科 → perSubject = ceil(115/4) = 29');
console.log('  115 出现的可能场景：前端硬编码或默认 questionCount=115');

console.log('\n【11. 重复类型判定】');
console.log(`  A. Question ID 重复（dedupQuestionIds 处理前的原始重复）:`);
const rawIdCounts = new Map();
for (const q of [...(questionsFromTxt.questions || []), ...(cscaQuestionsV1.questions || [])]) {
  rawIdCounts.set(q.id, (rawIdCounts.get(q.id) || 0) + 1);
}
const rawDupIds = Array.from(rawIdCounts.entries()).filter(([, c]) => c > 1);
console.log(`    原始题库中 ID 重复的 ID 数: ${rawDupIds.length}`);
rawDupIds.slice(0, 10).forEach(([id, c]) => {
  console.log(`    - ${id}: ${c} 次`);
});

console.log(`\n  B. 不同 ID 但题干完全相同（高度重复）: ${stemDuplicates.length} 组`);
console.log(`  C. 题干略有差异但实际同一题（fingerprint 相同）: ${exactDuplicates.length} 组（含 normalize 后归一）`);
console.log(`  D. 同一题不同来源文件重复: 见上面完全重复示例`);

console.log('\n========== 审计结束 ==========');
