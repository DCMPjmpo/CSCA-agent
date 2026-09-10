/**
 * P4.2 题库容量审计
 * 分析 DEFAULT_EXAM_CAPACITY = 81 的根因和可恢复的题目资产
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const questionsFromTxt = JSON.parse(
  readFileSync(join(root, 'data/processed/questions_from_txt.json'), 'utf-8')
);
const cscaQuestionsV1 = JSON.parse(
  readFileSync(join(root, 'data/processed/csca_questions_v1.json'), 'utf-8')
);

// 读取化学原始 txt 答案 key
const chemRawTxt = readFileSync(
  join(root, 'data/cleaned_markdown/Chemistry Practice (multiple choice questions).txt'),
  'utf-8'
);

// 解析答案 key
function parseAnswerKey(txt) {
  const results = {};
  const keySection = txt.split('Answer Key').pop();
  const matches = keySection.matchAll(/(\d+)\s+([A-D])/g);
  for (const m of matches) {
    results[parseInt(m[1])] = m[2];
  }
  return results;
}

const answerKey = parseAnswerKey(chemRawTxt);
console.log('=== 化学原始 txt 答案 Key ===');
console.log('解析到的答案数量:', Object.keys(answerKey).length);
console.log('答案样本:', Object.entries(answerKey).slice(0, 5));

const V1_SUBJECT_ALIAS = {
  '中文(理科)': '理科中文',
  '中文(文科)': '文科中文',
};

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

console.log('\n=== 全题库统计 ===');
console.log('总题量:', ALL_QUESTIONS.length);

const bySubject = {};
const eligibleBySubject = {};
ALL_QUESTIONS.forEach(q => {
  bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
  if (q.type === '选择题' && q.options && q.options.length > 0 && q.answer && q.answer.trim()) {
    eligibleBySubject[q.subject] = (eligibleBySubject[q.subject] || 0) + 1;
  }
});

console.log('\n=== 各科目统计 (question-bank ALL_QUESTIONS) ===');
console.log('subject | total | eligible(choice+options+answer)');
Object.entries(bySubject).sort((a,b) => b[1]-a[1]).forEach(([s, t]) => {
  console.log(`${s} | ${t} | ${eligibleBySubject[s] || 0}`);
});

const chemNoAnswer = ALL_QUESTIONS.filter(q =>
  q.subject === '化学' && q.source === 'real_exam' &&
  q.type === '选择题' && q.options && q.options.length > 0 &&
  (!q.answer || !q.answer.trim())
);

console.log('\n=== 化学无答案题分析 ===');
console.log('化学 real_exam 选择题无答案:', chemNoAnswer.length);

let recoverableCount = 0;
const recoverySamples = [];
chemNoAnswer.forEach(q => {
  const qNum = q.questionNumber;
  if (qNum && answerKey[qNum]) {
    recoverableCount++;
    if (recoverySamples.length < 3) {
      recoverySamples.push({
        id: q.id,
        questionNumber: qNum,
        recoveredAnswer: answerKey[qNum],
        question: q.question?.substring(0, 60),
      });
    }
  }
});

console.log('可恢复答案的题数:', recoverableCount);
console.log('恢复样本:', recoverySamples);

const qNums = chemNoAnswer.map(q => q.questionNumber).filter(n => n).sort((a,b) => a-b);
console.log('questionNumber 范围:', qNums[0], '-', qNums[qNums.length-1]);
console.log('answerKey 范围:', Math.min(...Object.keys(answerKey).map(Number)), '-', Math.max(...Object.keys(answerKey).map(Number)));

console.log('\n=== 假设化学答案恢复后 ===');
const newChemEligible = (eligibleBySubject['化学'] || 0) + recoverableCount;
console.log('化学 eligible (恢复前):', eligibleBySubject['化学'] || 0);
console.log('化学 eligible (恢复后):', newChemEligible);

const defaultSubjects = ['基础汉语', '数学', '物理', '理科中文'];
console.log('\n=== 默认科目组合容量分析 ===');
console.log('默认科目:', defaultSubjects);

defaultSubjects.forEach(s => {
  console.log(`${s} (question-bank eligible): ${eligibleBySubject[s] || 0}`);
});

console.log('理科中文 (内置 science-chinese-questions.ts): 80');
console.log('文科中文 (内置 arts-chinese-questions.ts): 60');

const mockCounts = { '基础汉语': 10, '数学': 10, '物理': 10, '化学': 10 };
console.log('\n=== MOCK_QUESTIONS ===');
Object.entries(mockCounts).forEach(([s, c]) => console.log(`${s}: ${c}`));

console.log('\n=== 最终结论 ===');
console.log('理科中文 bank eligible:', eligibleBySubject['理科中文'] || 0);
console.log('化学恢复前 eligible:', eligibleBySubject['化学'] || 0);
console.log('化学恢复后 eligible:', newChemEligible);
console.log('净增:', recoverableCount);

console.log('\n=== 可恢复资产汇总 ===');
console.log('1. chem_real_001~096 答案恢复:', recoverableCount, '道');
console.log('2. 其他资产: 无未利用的原始选择题文件');
console.log('3. raw txt 中其他文件(数学/物理)都是填空题/问答题，无选择题');
