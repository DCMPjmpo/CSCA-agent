import { getAllQuestions, getQuestionsBySubject } from '../lib/csca/question-bank';
import { deriveKnowledgePoint } from '../lib/csca/question-metadata';
import { buildKnowledgeMap } from '../lib/csca/knowledge-data';
import { selectQuestionsForSubjects } from '../lib/csca/question-selection';
import {
  enrichContextWithHistory,
  extractWeakKnowledgePoints,
  type AnswerRecord,
} from '../lib/csca/learning-context';

const allQuestions = getAllQuestions();
console.log('题库总量:', allQuestions.length);
const subjects = ['基础汉语', '数学', '物理'];
for (const s of subjects) {
  console.log('  ' + s + ': ' + getQuestionsBySubject(s).length + ' 题');
}

function pickRealQuestionIds(subject: string, count: number) {
  return getQuestionsBySubject(subject).slice(0, count).map((q) => ({
    id: q.uniqueId || q.id,
    kp: deriveKnowledgePoint(q).knowledgePoint,
  }));
}

const mathIds = pickRealQuestionIds('数学', 12);
const chineseIds = pickRealQuestionIds('基础汉语', 10);
const physicsIds = pickRealQuestionIds('物理', 8);

// User B: Engineering, 数学薄弱（代数 12 题错 9 题，正确率 25%）
// 同一知识点多次作答，模拟真实反复练习场景
function buildUserBHistory(): AnswerRecord[] {
  const history: AnswerRecord[] = [];
  const ts = Date.now();
  const mathKp = '代数';
  mathIds.forEach((m, i) => {
    history.push({ questionId: m.id, subject: '数学', knowledgePoint: mathKp, module: mathKp, isCorrect: i >= 9, difficulty: 'medium', mode: 'practice', targetMajor: 'Engineering', timestamp: ts + i });
  });
  const phyKp = '力学';
  physicsIds.forEach((p, i) => {
    history.push({ questionId: p.id, subject: '物理', knowledgePoint: phyKp, module: phyKp, isCorrect: i < 6, difficulty: 'medium', mode: 'practice', targetMajor: 'Engineering', timestamp: ts + 100 + i });
  });
  return history;
}

// User C: Business, 汉语薄弱（语法运用 10 题错 8 题，正确率 20%）
function buildUserCHistory(): AnswerRecord[] {
  const history: AnswerRecord[] = [];
  const ts = Date.now();
  const chiKp = '语法运用';
  chineseIds.forEach((c, i) => {
    history.push({ questionId: c.id, subject: '基础汉语', knowledgePoint: chiKp, module: chiKp, isCorrect: i >= 8, difficulty: 'medium', mode: 'practice', targetMajor: 'Business', timestamp: ts + i });
  });
  const mathKp = '代数';
  mathIds.slice(0, 10).forEach((m, i) => {
    history.push({ questionId: m.id, subject: '数学', knowledgePoint: mathKp, module: mathKp, isCorrect: i < 7, difficulty: 'medium', mode: 'practice', targetMajor: 'Business', timestamp: ts + 100 + i });
  });
  return history;
}

function validateUser(label: string, major: string, history: AnswerRecord[], testSubjects: string[]) {
  console.log('\n' + '='.repeat(60));
  console.log('用户: ' + label + ' (' + major + ')  答题数: ' + history.length);
  console.log('='.repeat(60));

  const km = buildKnowledgeMap(testSubjects, undefined, history);
  console.log('\n[Knowledge Map - 非零 mastery]');
  for (const t of km) {
    if (t.mastery > 0) console.log('  ' + t.subject + ' / ' + t.name + ': ' + t.mastery + ' (' + t.masterySource + ')');
  }
  if (history.length === 0) {
    const nz = km.filter((t) => t.mastery > 0).length;
    console.log('  新用户非零 mastery: ' + nz + ' (期望 0)');
  }

  const weakPoints = extractWeakKnowledgePoints(history);
  console.log('\n[Weak Points]');
  for (const [sub, kps] of Object.entries(weakPoints)) {
    console.log('  ' + sub + ': ' + (kps.join(', ') || '(无)'));
  }

  const wrongIds = history.filter((a) => !a.isCorrect).map((a) => a.questionId);
  const baseCtx = {
    targetMajor: major,
    requiredSubjects: testSubjects,
    currentStage: 2,
    learningMode: 'practice' as const,
    weakKnowledgePoints: weakPoints,
    recentWrongQuestionIds: wrongIds,
    recentQuestionIds: history.slice(-30).map((a) => a.questionId),
  };
  const ctx = enrichContextWithHistory(baseCtx, history);

  const { totalQuestions, difficultyFallback, actualDifficulty } = selectQuestionsForSubjects(ctx, 'practice', testSubjects, 5);
  console.log('\n[Practice 选题]');
  console.log('  题数: ' + totalQuestions.length + ', difficultyFallback: ' + difficultyFallback);
  console.log('  难度: easy=' + actualDifficulty.easy + ' medium=' + actualDifficulty.medium + ' hard=' + actualDifficulty.hard);
  const subjDist: Record<string, number> = {};
  for (const q of totalQuestions) subjDist[q.subject] = (subjDist[q.subject] || 0) + 1;
  console.log('  学科分布: ' + JSON.stringify(subjDist));

  const weakKpSet = new Set(Object.values(weakPoints).flat());
  const weakHit = totalQuestions.filter((q) => weakKpSet.has(q.knowledgePoint)).length;
  console.log('  命中薄弱知识点: ' + weakHit + '/' + totalQuestions.length);

  if (wrongIds.length > 0) {
    const waCtx = enrichContextWithHistory({ ...baseCtx, learningMode: 'wrong_answer_practice' as const, currentStage: 5 }, history);
    const { totalQuestions: waQ } = selectQuestionsForSubjects(waCtx, 'wrong_answer_practice', testSubjects, 5);
    const repeated = waQ.filter((q) => new Set(wrongIds).has(q.id));
    console.log('\n[Wrong Answer Practice]');
    console.log('  题数: ' + waQ.length + ', 重复原题: ' + repeated.length + ' (期望 0)');
  }

  return { km, weakPoints, totalQuestions };
}

const subs = ['基础汉语', '数学', '物理'];
const a = validateUser('User A', 'Medicine', [], subs);
const b = validateUser('User B', 'Engineering', buildUserBHistory(), subs);
const c = validateUser('User C', 'Business', buildUserCHistory(), subs);

console.log('\n' + '='.repeat(60));
console.log('验证总结');
console.log('='.repeat(60));
const aNz = a.km.filter((t) => t.mastery > 0).length;
console.log('User A 新用户非零 mastery: ' + aNz + ' -> ' + (aNz === 0 ? 'PASS' : 'FAIL'));
const bMathWeak = Object.entries(b.weakPoints).filter(([s]) => s === '数学').flatMap(([, k]) => k).length;
console.log('User B 数学薄弱知识点: ' + bMathWeak + ' -> ' + (bMathWeak > 0 ? 'PASS' : 'FAIL'));
const cChiWeak = Object.entries(c.weakPoints).filter(([s]) => s === '基础汉语').flatMap(([, k]) => k).length;
console.log('User C 汉语薄弱知识点: ' + cChiWeak + ' -> ' + (cChiWeak > 0 ? 'PASS' : 'FAIL'));
console.log('\n完成。');
