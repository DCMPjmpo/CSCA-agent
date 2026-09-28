/**
 * CSCA真实题库加载模块
 * 从TXT文件解析的JSON数据加载题库，支持按科目、题型、难度查询
 */

import questionsFromTxt from '../../data/processed/questions_from_txt.json';
import cscaQuestionsV1 from '../../data/processed/csca_questions_v1.json';
import cscaEnrichmentV1 from '../../data/processed/csca_enrichment_v1.json';
// P4.2: 化学题答案恢复 adapter（loader 层 patch，不修改原始 JSON）
import { recoverChemAnswers } from './chem-answer-recovery';
// P4.2-B: 恢复的物理和数学题目（来自 PDF 原始题源 + 答案 Key）
import p42bRecovered from '../../data/processed/p4.2_recovered_questions.json';

export type QuestionSource =
  | 'real_exam'
  | 'basic_practice'
  | 'science_chinese'
  | 'arts_chinese'
  | 'legacy'
  | 'unknown';

export interface Question {
  id: string;
  subject: string;
  track: string;
  questionNumber: number;
  question: string;
  type: '选择题' | '问答题' | '填空题' | '阅读理解' | string;
  partTitle?: string;
  module?: string;
  sourceFile: string;
  lineNumber: number;
  uniqueId: string;
  options?: Array<{ key: string; value: string }>;
  answer?: string;
  score?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  /** 题目来源：真实试卷 / 基础练习题 / 理科中文专项 / 文科中文专项 / 旧数据 */
  source?: QuestionSource;
}

/**
 * QuestionEnrichment —— 学习增强数据，与 Question core 解耦。
 * 不修改 Question interface，通过 questionId 关联。
 */
export interface QuestionEnrichment {
  questionId: string;
  rawQuestionId?: string;
  knowledgePoint: string;
  knowledgePointSource:
    | 'NATIVE'
    | 'SYLLABUS_DERIVED'
    | 'SECTION_DERIVED'
    | 'PART_DERIVED'
    | 'SET_LEVEL'
    | 'UNKNOWN';
  knowledgePointHierarchy: {
    subject: string;
    module: string;
    knowledgePoint: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  difficultySource: 'SOURCE' | 'DEFAULT';
  explanation: string;
  provenance: {
    sourceFile: string;
    questionNumber: number;
    questionSetId: string;
    sourcePage: number | null;
  };
  optionGroupId: string | null;
  sourceConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/** V1 subject 别名映射：ETL 命名 → selector/前端命名 */
const V1_SUBJECT_ALIAS: Record<string, string> = {
  '中文(理科)': '理科中文',
  '中文(文科)': '文科中文',
};

/**
 * Q3.0.1: Generate stable unique runtime IDs for pre-existing duplicate IDs
 * (chem_real_001-048 each appear twice with different content).
 * - First occurrence keeps original ID (backward compat with old answerHistory/enrichment)
 * - Nth occurrence appends `#N` suffix
 * - Does NOT modify original question content, only loader-layer adaptation
 */
function dedupQuestionIds(questions: Question[]): Question[] {
  const seen = new Map<string, number>();
  return questions.map((q) => {
    const count = seen.get(q.id) ?? 0;
    seen.set(q.id, count + 1);
    if (count === 0) return q;
    const runtimeId = `${q.id}#${count + 1}`;
    return { ...q, id: runtimeId, uniqueId: q.uniqueId || q.id };
  });
}

/** Merge existing bank + CSCA V1 bank (225 FINAL_VERIFIED), normalize V1 subject names
 * P4.2-B: Also includes recovered questions from PDF sources (Math Mock 2019, Sustech 2025 Physics, SJTU 2022 Physics)
 */
const ALL_QUESTIONS: Question[] = recoverChemAnswers(
  dedupQuestionIds([
    ...(questionsFromTxt.questions as Question[]),
    ...(cscaQuestionsV1.questions as Question[]).map((q) => ({
      ...q,
      subject: V1_SUBJECT_ALIAS[q.subject] ?? q.subject,
    })),
    // P4.2-B: Recovered questions from existing PDF sources with verified answer keys
    ...(p42bRecovered.questions as Question[]),
  ]),
);

const ENRICHMENT_MAP: Record<string, QuestionEnrichment> = cscaEnrichmentV1 as Record<
  string,
  QuestionEnrichment
>;

// 获取所有题目（现有 + V1）
export function getAllQuestions(): Question[] {
  return ALL_QUESTIONS;
}

/**
 * 查询题目增强数据（knowledgePoint / explanation / provenance 等）。
 * 仅 V1 题目有 enrichment；旧题库返回 undefined。
 */
export function getQuestionEnrichment(questionId: string): QuestionEnrichment | undefined {
  return ENRICHMENT_MAP[questionId];
}

// 根据科目获取题目
export function getQuestionsBySubject(subject: string): Question[] {
  return getAllQuestions().filter((q: Question) => q.subject === subject);
}

// 根据题型获取题目
export function getQuestionsByType(type: string): Question[] {
  return getAllQuestions().filter((q: Question) => q.type === type);
}

// 根据难度获取题目
export function getQuestionsByDifficulty(difficulty: string): Question[] {
  return getAllQuestions().filter((q: Question) => q.difficulty === difficulty);
}

// 根据ID获取题目
export function getQuestionById(id: string): Question | undefined {
  return getAllQuestions().find((q: Question) => q.uniqueId === id || q.id === id);
}

// 搜索题目（根据题目内容）
export function searchQuestions(keyword: string): Question[] {
  const lowerKeyword = keyword.toLowerCase();
  return getAllQuestions().filter((q: Question) => q.question.toLowerCase().includes(lowerKeyword));
}

// 获取所有科目
export function getAllSubjects(): string[] {
  const subjects = new Set(getAllQuestions().map((q: Question) => q.subject));
  return Array.from(subjects).filter((s) => s !== '未知');
}

// 获取所有文理科类型
export function getAllTracks(): string[] {
  const tracks = new Set(getAllQuestions().map((q: Question) => q.track));
  return Array.from(tracks);
}

// 获取所有题型
export function getAllTypes(): string[] {
  const types = new Set(getAllQuestions().map((q: Question) => q.type));
  return Array.from(types);
}

// 统计某个科目的题目数量
export function countQuestionsBySubject(subject: string): number {
  return getQuestionsBySubject(subject).length;
}

// 获取题目的选项数组（用于前端展示）
export function getOptionsArray(question: Question): { key: string; value: string }[] {
  return question.options || [];
}

// 判断题目是否为选择题
export function isChoiceQuestion(question: Question): boolean {
  return question.type === '选择题';
}

// 判断题目是否有选项
export function hasOptions(question: Question): boolean {
  return !!(question.options && question.options.length > 0);
}

// 判断题目是否有答案
export function hasAnswer(question: Question): boolean {
  return !!(question.answer && question.answer.trim() !== '');
}

// 获取格式化的答案（用于展示）
export function getFormattedAnswer(question: Question): string {
  if (!hasAnswer(question)) return '暂无答案';
  return question.answer || '';
}

// 获取题目难度描述
export function getDifficultyLabel(difficulty: string | undefined): string {
  if (!difficulty) return '未知';
  const labelMap: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };
  return labelMap[difficulty] || difficulty;
}

// 获取题型描述
export function getTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    选择题: '选择题',
    问答题: '问答题',
    填空题: '填空题',
    阅读理解: '阅读理解',
  };
  return typeMap[type] || type;
}

// 获取某个科目的难度分布
export function getDifficultyDistribution(subject: string): Record<string, number> {
  const distribution: Record<string, number> = {};
  const questions = getQuestionsBySubject(subject);

  questions.forEach((q) => {
    if (q.difficulty) {
      distribution[q.difficulty] = (distribution[q.difficulty] || 0) + 1;
    }
  });

  return distribution;
}

// 获取某个科目的题型分布
export function getTypeDistribution(subject: string): Record<string, number> {
  const distribution: Record<string, number> = {};
  const questions = getQuestionsBySubject(subject);

  questions.forEach((q) => {
    distribution[q.type] = (distribution[q.type] || 0) + 1;
  });

  return distribution;
}

// 获取某个科目的文理科分布
export function getTrackDistribution(subject: string): Record<string, number> {
  const distribution: Record<string, number> = {};
  const questions = getQuestionsBySubject(subject);

  questions.forEach((q) => {
    distribution[q.track] = (distribution[q.track] || 0) + 1;
  });

  return distribution;
}

// 随机获取指定数量的题目
export function getRandomQuestions(count: number, subject?: string): Question[] {
  const questions = subject ? getQuestionsBySubject(subject) : getAllQuestions();
  const shuffled = questions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// 获取某个科目的选择题
export function getChoiceQuestions(subject: string): Question[] {
  return getQuestionsBySubject(subject).filter((q) => isChoiceQuestion(q) && hasOptions(q));
}

// 获取某个科目的问答题
export function getSubjectiveQuestions(subject: string): Question[] {
  return getQuestionsBySubject(subject).filter((q) => q.type === '问答题');
}

// 验证答案（适用于选择题）
export function checkAnswer(question: Question, userAnswer: string): boolean {
  if (!hasAnswer(question)) return false;
  return (question.answer || '').trim().toLowerCase() === userAnswer.trim().toLowerCase();
}

// 获取题库统计信息
export function getQuestionBankStats() {
  const allQuestions = getAllQuestions();
  const subjects = getAllSubjects();

  const stats = {
    totalQuestions: allQuestions.length,
    subjects: subjects.length,
    subjectsDetails: subjects.map((subject) => ({
      name: subject,
      count: countQuestionsBySubject(subject),
      types: getTypeDistribution(subject),
      difficulties: getDifficultyDistribution(subject),
      tracks: getTrackDistribution(subject),
    })),
  };

  return stats;
}

// 导出适合模拟考试使用的题目格式（返回所有类型的题目）
export function getExamQuestions(subjects: string[], questionCount: number): Question[] {
  let allQuestions: Question[] = [];

  subjects.forEach((subject) => {
    const questions = getQuestionsBySubject(subject);
    allQuestions = [...allQuestions, ...questions];
  });

  // 返回所有题目（包括选择题和问答题）
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, questionCount);
}

// 获取元数据
export function getMetadata() {
  return questionsFromTxt.metadata;
}

// ===================== Phase 4: 按来源筛选（新增，非破坏性） =====================

/**
 * 按来源筛选题目
 * @param source real_exam | basic_practice | legacy | ...
 */
export function getQuestionsBySource(source: QuestionSource): Question[] {
  return getAllQuestions().filter((q) => (q.source ?? 'unknown') === source);
}

/**
 * 获取真实试卷题目（优先级最高）
 */
export function getRealExamQuestions(subject?: string): Question[] {
  const real = getQuestionsBySource('real_exam');
  return subject ? real.filter((q) => q.subject === subject) : real;
}

/**
 * 获取基础练习题（真实题库不足时的 fallback）
 */
export function getBasicPracticeQuestions(subject?: string): Question[] {
  const basic = getQuestionsBySource('basic_practice');
  return subject ? basic.filter((q) => q.subject === subject) : basic;
}

/**
 * 优先真实试卷，不足时补充基础练习题（诚实 fallback）
 * 返回 { questions, sources } 标注每题来源
 */
export function getQuestionsWithFallback(
  subject: string,
  count: number,
): { questions: Question[]; usedFallback: boolean; realCount: number; basicCount: number } {
  // Q3.0 修复：仅保留有答案的题目，否则 normalizeQuestion 会全部过滤导致 V1 不可达
  const real = getRealExamQuestions(subject).filter(
    (q) => q.type === '选择题' && q.options && q.options.length > 0 && hasAnswer(q),
  );
  const basic = getBasicPracticeQuestions(subject).filter(
    (q) => q.type === '选择题' && q.options && q.options.length > 0 && hasAnswer(q),
  );

  // 打乱
  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const shuffledReal = shuffle(real);
  const shuffledBasic = shuffle(basic);

  const realSelected = shuffledReal.slice(0, Math.min(count, shuffledReal.length));
  const remaining = count - realSelected.length;

  let basicSelected: Question[] = [];
  if (remaining > 0) {
    basicSelected = shuffledBasic.slice(0, Math.min(remaining, shuffledBasic.length));
  }

  const questions = [...realSelected, ...basicSelected].sort(() => Math.random() - 0.5);

  return {
    questions,
    usedFallback: basicSelected.length > 0,
    realCount: realSelected.length,
    basicCount: basicSelected.length,
  };
}

/**
 * 获取题库来源统计（用于 UI 诚实标注）
 */
export function getSourceStats(subject?: string): Record<QuestionSource, number> {
  const questions = subject ? getQuestionsBySubject(subject) : getAllQuestions();
  const stats: Record<QuestionSource, number> = {
    real_exam: 0,
    basic_practice: 0,
    science_chinese: 0,
    arts_chinese: 0,
    legacy: 0,
    unknown: 0,
  };
  for (const q of questions) {
    const src = (q.source ?? 'unknown') as QuestionSource;
    stats[src] = (stats[src] || 0) + 1;
  }
  return stats;
}
