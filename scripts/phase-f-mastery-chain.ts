import { getQuestionsBySubject } from '../lib/csca/question-bank';
import { computeMasteryFromAnswers } from '../lib/csca/knowledge-data';
import { extractWeakKnowledgePoints } from '../lib/csca/learning-context';
import type { AnswerRecord } from '../lib/csca/learning-context';

const mathIds = getQuestionsBySubject('数学').slice(0, 12).map(q => ({ id: q.uniqueId || q.id, kp: '代数' }));
const ts = Date.now();

const initial: AnswerRecord[] = mathIds.map((m, i) => ({
  questionId: m.id, subject: '数学', knowledgePoint: '代数', module: '代数',
  isCorrect: i >= 9, difficulty: 'medium', mode: 'practice', targetMajor: 'Engineering', timestamp: ts + i,
}));

const m1 = computeMasteryFromAnswers(initial, '数学', '代数');
console.log('错题修正前 数学/代数 mastery:', m1);

const correction: AnswerRecord[] = mathIds.slice(0, 5).map((m, i) => ({
  questionId: 'wa-' + m.id, subject: '数学', knowledgePoint: '代数', module: '代数',
  isCorrect: true, difficulty: 'medium', mode: 'wrong_answer_practice', targetMajor: 'Engineering', timestamp: ts + 1000 + i,
}));
const updated = [...initial, ...correction];
const m2 = computeMasteryFromAnswers(updated, '数学', '代数');
console.log('错题修正后 数学/代数 mastery:', m2);
console.log('mastery 提升链路:', m2 > m1 ? 'PASS' : 'FAIL');

const weakBefore = extractWeakKnowledgePoints(initial);
const weakAfter = extractWeakKnowledgePoints(updated);
console.log('修正前薄弱点:', JSON.stringify(weakBefore));
console.log('修正后薄弱点:', JSON.stringify(weakAfter));
