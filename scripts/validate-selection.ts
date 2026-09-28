/**
 * Phase E+ 选题验证脚本
 * 测试 8 个场景的 questionId overlap / subject / difficulty / knowledgePoint 分布
 * 用法: npx tsx scripts/validate-selection.ts
 */
import { selectQuestionsForSubjects } from '../lib/csca/question-selection';
import {
  enrichContextWithHistory,
  type LearningContext,
  type AnswerRecord,
} from '../lib/csca/learning-context';

type Subject = string;

const MEDICINE_SUBJECTS = ['基础汉语', '数学', '物理'];
const ENGINEERING_SUBJECTS = ['基础汉语', '数学', '物理'];
const BUSINESS_SUBJECTS = ['基础汉语', '数学'];

function makeCtx(opts: {
  targetMajor: string;
  subjects: Subject[];
  currentAbility?: Record<string, number>;
  weakKnowledgePoints?: Record<string, string[]>;
  answerHistory?: AnswerRecord[];
  recentQuestionIds?: string[];
}): LearningContext {
  const base: any = {
    targetMajor: opts.targetMajor,
    requiredSubjects: opts.subjects,
    currentStage: 2,
    currentAbility: opts.currentAbility,
    weakKnowledgePoints: opts.weakKnowledgePoints,
    recentQuestionIds: opts.recentQuestionIds,
    learningMode: 'practice',
  };
  return enrichContextWithHistory(base, opts.answerHistory || []);
}

function runMany(
  ctx: LearningContext,
  subjects: Subject[],
  count: number,
  rounds: number,
  mode: 'practice' | 'exam' | 'wrong_answer_practice' = 'practice',
) {
  const allIds: string[] = [];
  const subjectDist: Record<string, number> = {};
  const diffDist: Record<string, number> = {};
  const kpDist: Record<string, number> = {};
  let fallbackCount = 0;

  for (let r = 0; r < rounds; r++) {
    const { results, totalQuestions } = selectQuestionsForSubjects(ctx, mode, subjects, count);
    for (const q of totalQuestions) {
      allIds.push(q.id);
      subjectDist[q.subject] = (subjectDist[q.subject] || 0) + 1;
      const d = String(q.difficulty || 'medium');
      diffDist[d] = (diffDist[d] || 0) + 1;
      const kp = q.knowledgePoint || q.module || 'unknown';
      kpDist[kp] = (kpDist[kp] || 0) + 1;
    }
    for (const r2 of results) {
      if (r2.fallbackReason) fallbackCount++;
    }
    // 模拟 recentQuestionIds 累积
    ctx.recentQuestionIds = [
      ...(ctx.recentQuestionIds || []),
      ...totalQuestions.map((q) => q.id),
    ].slice(-50);
  }

  const unique = new Set(allIds);
  const overlapRate = allIds.length > 0 ? 1 - unique.size / allIds.length : 0;

  return {
    total: allIds.length,
    unique: unique.size,
    overlapRate: Math.round(overlapRate * 100) / 100,
    subjectDist,
    diffDist,
    kpDist: Object.entries(kpDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    fallbackCount,
  };
}

function printReport(name: string, r: ReturnType<typeof runMany>) {
  console.log(`\n=== ${name} ===`);
  console.log(
    `  total questions: ${r.total}, unique: ${r.unique}, overlap rate: ${(r.overlapRate * 100).toFixed(1)}%`,
  );
  console.log(`  subject: ${JSON.stringify(r.subjectDist)}`);
  console.log(`  difficulty: ${JSON.stringify(r.diffDist)}`);
  console.log(`  top kp: ${JSON.stringify(r.kpDist)}`);
  console.log(`  fallback hits: ${r.fallbackCount}`);
}

// ============ 8 个测试场景 ============

// T1: 新用户（无答题历史）
const t1Ctx = makeCtx({
  targetMajor: 'Medicine',
  subjects: MEDICINE_SUBJECTS,
});
const t1 = runMany(t1Ctx, MEDICINE_SUBJECTS, 5, 10);
printReport('T1 新用户 (Medicine)', t1);

// T2: 低 mastery 用户（所有科目 0.2）
const t2Ctx = makeCtx({
  targetMajor: 'Medicine',
  subjects: MEDICINE_SUBJECTS,
  currentAbility: { 基础汉语: 0.2, 数学: 0.2, 物理: 0.2 },
});
const t2 = runMany(t2Ctx, MEDICINE_SUBJECTS, 5, 10);
printReport('T2 低 mastery 用户', t2);

// T3: 高 mastery 用户（所有科目 0.85）
const t3Ctx = makeCtx({
  targetMajor: 'Medicine',
  subjects: MEDICINE_SUBJECTS,
  currentAbility: { 基础汉语: 0.85, 数学: 0.85, 物理: 0.85 },
});
const t3 = runMany(t3Ctx, MEDICINE_SUBJECTS, 5, 10);
printReport('T3 高 mastery 用户', t3);

// T4: 数学薄弱用户
const t4Ctx = makeCtx({
  targetMajor: 'Engineering',
  subjects: ENGINEERING_SUBJECTS,
  currentAbility: { 基础汉语: 0.7, 数学: 0.25, 物理: 0.7 },
  weakKnowledgePoints: { 数学: ['函数与方程', '概率'] },
});
const t4 = runMany(t4Ctx, ENGINEERING_SUBJECTS, 5, 10);
printReport('T4 数学薄弱用户', t4);

// T5: 物理薄弱用户
const t5Ctx = makeCtx({
  targetMajor: 'Engineering',
  subjects: ENGINEERING_SUBJECTS,
  currentAbility: { 基础汉语: 0.7, 数学: 0.7, 物理: 0.25 },
  weakKnowledgePoints: { 物理: ['力学', '电磁学'] },
});
const t5 = runMany(t5Ctx, ENGINEERING_SUBJECTS, 5, 10);
printReport('T5 物理薄弱用户', t5);

// T6: Medicine
const t6Ctx = makeCtx({ targetMajor: 'Medicine', subjects: MEDICINE_SUBJECTS });
const t6 = runMany(t6Ctx, MEDICINE_SUBJECTS, 5, 10);
printReport('T6 Medicine', t6);

// T7: Engineering
const t7Ctx = makeCtx({ targetMajor: 'Engineering', subjects: ENGINEERING_SUBJECTS });
const t7 = runMany(t7Ctx, ENGINEERING_SUBJECTS, 5, 10);
printReport('T7 Engineering', t7);

// T8: Business Administration
const t8Ctx = makeCtx({ targetMajor: 'Business Administration', subjects: BUSINESS_SUBJECTS });
const t8 = runMany(t8Ctx, BUSINESS_SUBJECTS, 5, 10);
printReport('T8 Business', t8);

// ============ 专业差异化对照 ============
console.log('\n=== 专业差异化对照 (Medicine vs Engineering vs Business) ===');
const medIds = new Set<string>();
const engIds = new Set<string>();
const bizIds = new Set<string>();
for (let r = 0; r < 10; r++) {
  const { totalQuestions: mq } = selectQuestionsForSubjects(
    makeCtx({ targetMajor: 'Medicine', subjects: MEDICINE_SUBJECTS }),
    'practice',
    MEDICINE_SUBJECTS,
    5,
  );
  mq.forEach((q) => medIds.add(q.id));
  const { totalQuestions: eq } = selectQuestionsForSubjects(
    makeCtx({ targetMajor: 'Engineering', subjects: ENGINEERING_SUBJECTS }),
    'practice',
    ENGINEERING_SUBJECTS,
    5,
  );
  eq.forEach((q) => engIds.add(q.id));
  const { totalQuestions: bq } = selectQuestionsForSubjects(
    makeCtx({ targetMajor: 'Business Administration', subjects: BUSINESS_SUBJECTS }),
    'practice',
    BUSINESS_SUBJECTS,
    5,
  );
  bq.forEach((q) => bizIds.add(q.id));
}
const medEng = [...medIds].filter((id) => engIds.has(id)).length;
const medBiz = [...medIds].filter((id) => bizIds.has(id)).length;
const engBiz = [...engIds].filter((id) => bizIds.has(id)).length;
console.log(
  `  Medicine unique: ${medIds.size}, Engineering unique: ${engIds.size}, Business unique: ${bizIds.size}`,
);
console.log(`  Med∩Eng overlap: ${medEng}, Med∩Biz: ${medBiz}, Eng∩Biz: ${engBiz}`);
console.log(
  `  Medicine≠Engineering : ${medIds.size + engIds.size - 2 * medEng > 0 ? 'YES (different subject set)' : 'NO'}`,
);
console.log(`  Business 无物理科目 (只有 ${BUSINESS_SUBJECTS.join(',')})`);

// ============ 连续 10 次请求 questionId 变化测试 ============
console.log('\n=== 连续 10 次请求 (practice, 新用户) ===');
const seqCtx = makeCtx({ targetMajor: 'Medicine', subjects: MEDICINE_SUBJECTS });
const seqIds: string[] = [];
for (let r = 0; r < 10; r++) {
  const { totalQuestions } = selectQuestionsForSubjects(seqCtx, 'practice', MEDICINE_SUBJECTS, 5);
  const roundIds = totalQuestions.map((q) => q.id);
  seqCtx.recentQuestionIds = [...(seqCtx.recentQuestionIds || []), ...roundIds].slice(-50);
  seqIds.push(...roundIds);
}
const seqUnique = new Set(seqIds);
console.log(
  `  10 轮共 ${seqIds.length} 题, 唯一 ${seqUnique.size} 题, 重复率 ${((1 - seqUnique.size / seqIds.length) * 100).toFixed(1)}%`,
);

// ============ 模式分离测试 ============
console.log('\n=== Practice vs Exam 模式对比 ===');
const practiceCtx = makeCtx({
  targetMajor: 'Medicine',
  subjects: MEDICINE_SUBJECTS,
  currentAbility: { 基础汉语: 0.2, 数学: 0.2, 物理: 0.2 },
});
const { totalQuestions: pq } = selectQuestionsForSubjects(
  practiceCtx,
  'practice',
  MEDICINE_SUBJECTS,
  30,
);
const pDiff: Record<string, number> = {};
pq.forEach((q) => {
  const d = String(q.difficulty);
  pDiff[d] = (pDiff[d] || 0) + 1;
});
console.log(`  Practice 难度分布 (低能力): ${JSON.stringify(pDiff)}`);

const { totalQuestions: eq2 } = selectQuestionsForSubjects(
  practiceCtx,
  'exam',
  MEDICINE_SUBJECTS,
  30,
);
const eDiff: Record<string, number> = {};
eq2.forEach((q) => {
  const d = String(q.difficulty);
  eDiff[d] = (eDiff[d] || 0) + 1;
});
console.log(`  Exam 难度分布 (低能力, 应保持 25/55/20): ${JSON.stringify(eDiff)}`);

// ============ 错题修正模式测试 ============
console.log('\n=== Wrong Answer Practice 模式测试 ===');
const wrongHistory: AnswerRecord[] = [
  {
    questionId: 'math-test-1',
    subject: '数学',
    knowledgePoint: '概率',
    module: '概率',
    isCorrect: false,
    difficulty: 'medium',
    mode: 'practice',
    targetMajor: 'Engineering',
    timestamp: Date.now(),
  },
  {
    questionId: 'math-test-2',
    subject: '数学',
    knowledgePoint: '概率',
    module: '概率',
    isCorrect: false,
    difficulty: 'medium',
    mode: 'practice',
    targetMajor: 'Engineering',
    timestamp: Date.now(),
  },
];
const wapCtx = makeCtx({
  targetMajor: 'Engineering',
  subjects: ['数学'],
  answerHistory: wrongHistory,
  recentQuestionIds: ['math-test-1', 'math-test-2'],
});
const { results: wapResults, totalQuestions: wapQs } = selectQuestionsForSubjects(
  wapCtx,
  'wrong_answer_practice',
  ['数学'],
  5,
);
const wapKp: Record<string, number> = {};
wapQs.forEach((q) => {
  const k = q.knowledgePoint || q.module || 'unknown';
  wapKp[k] = (wapKp[k] || 0) + 1;
});
console.log(`  Wrong Answer Practice 知识点分布: ${JSON.stringify(wapKp)}`);
console.log(
  `  错题原题是否被排除 (math-test-1/2 不在结果中): ${!wapQs.some((q) => q.id === 'math-test-1' || q.id === 'math-test-2') ? 'YES' : 'NO'}`,
);
console.log(`  fallbackReason: ${wapResults.map((r) => r.fallbackReason || 'none').join(', ')}`);

console.log('\n✅ 验证完成');
