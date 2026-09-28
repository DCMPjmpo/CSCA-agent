import { selectQuestionsForSubjects } from '../lib/csca/question-selection';
import { enrichContextWithHistory, type LearningContext } from '../lib/csca/learning-context';

function ctx(
  ability: Record<string, number> | undefined,
  major: string,
  subjects: string[],
): LearningContext {
  return enrichContextWithHistory(
    {
      targetMajor: major,
      requiredSubjects: subjects,
      currentStage: 2,
      currentAbility: ability,
      learningMode: 'practice',
    } as any,
    [],
  );
}

const SUBS = ['基础汉语', '数学', '物理'];

console.log('=== 单轮难度配额验证 (count=5/科) ===');

// 低能力
const lowCtx = ctx({ 基础汉语: 0.2, 数学: 0.2, 物理: 0.2 }, 'Medicine', SUBS);
const { results: lowRes } = selectQuestionsForSubjects(lowCtx, 'practice', SUBS, 5);
for (const r of lowRes) {
  const diffs = r.questions.reduce((acc: any, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});
  console.log(
    `  低能力 ${r.blueprint.subject}: blueprint=${JSON.stringify(r.blueprint.difficulty)}, actual=${JSON.stringify(diffs)}`,
  );
}

// 高能力
const highCtx = ctx({ 基础汉语: 0.85, 数学: 0.85, 物理: 0.85 }, 'Medicine', SUBS);
const { results: highRes } = selectQuestionsForSubjects(highCtx, 'practice', SUBS, 5);
for (const r of highRes) {
  const diffs = r.questions.reduce((acc: any, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});
  console.log(
    `  高能力 ${r.blueprint.subject}: blueprint=${JSON.stringify(r.blueprint.difficulty)}, actual=${JSON.stringify(diffs)}`,
  );
}

console.log('\n=== Exam 模式单轮 (count=20/科, 固定 25/55/20) ===');
const examCtx = ctx(undefined, 'Medicine', SUBS);
const { results: examRes } = selectQuestionsForSubjects(examCtx, 'exam', SUBS, 20);
for (const r of examRes) {
  const diffs = r.questions.reduce((acc: any, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});
  console.log(
    `  Exam ${r.blueprint.subject}: blueprint=${JSON.stringify(r.blueprint.difficulty)}, actual=${JSON.stringify(diffs)}, fallback=${r.fallbackReason || 'none'}`,
  );
}
