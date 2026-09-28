/**
 * lib/csca/question-selection.ts
 *
 * Phase E+ Question Selector —— 基于统一 LearningContext 的多维度动态选题
 *
 * 数据流：
 *   Question Bank → Metadata Normalization → candidateScore → Practice/Exam/Wrong-Answer
 *
 * 选题优先级（按权重，非硬编码）：
 *   1. targetMajor（通过 requiredSubjects 间接生效）
 *   2. subject（必填过滤）
 *   3. weakKnowledgePoints（practice/wrong-answer 模式优先）
 *   4. currentAbility / mastery（决定难度倾向）
 *   5. difficulty（蓝图分布）
 *   6. recentQuestionIds（去重，最近 N 题不重复）
 *   7. wrongQuestionIds（wrong-answer 模式优先同知识点新题）
 *   8. learningMode（practice/exam/wrong-answer 蓝图不同）
 *   9. question source（real_exam 优先于 basic_practice）
 *
 * 红线：
 *   - 不编造题目，只从真实题库取
 *   - 题库不足时诚实 fallback + fallbackReason
 *   - 随机只用于同等候选题之间的打散
 *   - 不破坏现有 question-bank.ts API
 */

import {
  getQuestionsWithFallback,
  getQuestionEnrichment,
  type Question,
  type QuestionSource,
  type QuestionEnrichment,
} from './question-bank';
import { getAllScienceChineseQuestions } from './science-chinese-questions';
import { getAllArtsChineseQuestions } from './arts-chinese-questions';
import { deriveKnowledgePoint, type MetadataSource } from './question-metadata';
import type { LearningContext, LearningMode } from './learning-context';

/** 将题库中的 difficulty（number 0-1 或 string）归一化为三级难度 */
function normalizeDifficulty(d: string | number | undefined): 'easy' | 'medium' | 'hard' {
  if (typeof d === 'string') {
    if (d === 'easy' || d === 'hard') return d;
    return 'medium';
  }
  if (typeof d === 'number') {
    if (d <= 0.4) return 'easy';
    if (d >= 0.6) return 'hard';
    return 'medium';
  }
  return 'medium';
}

// ===================== 类型定义 =====================

/** 选题模式（三态分离） */
export type SelectionMode = LearningMode | 'diagnostic';

/** 标准化题目（统一不同题库字段差异） */
export interface NormalizedQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctAnswer: number;
  module: string;
  /** 知识点（选题核心粒度，来自 metadata 层） */
  knowledgePoint: string;
  knowledgePointSource: MetadataSource;
  difficulty: 'easy' | 'medium' | 'hard';
  source: QuestionSource;
  type: string;
  answerExplanation?: string;
}

/** 题目蓝图（约束条件） */
export interface QuestionBlueprint {
  subject: string;
  total: number;
  difficulty: { easy: number; medium: number; hard: number };
  knowledgeAreas: string[];
  questionTypes: string[];
  preferredSources: QuestionSource[];
  /** 是否因学生能力调整（practice），还是固定考试分布（exam） */
  abilityAdaptive: boolean;
}

/** 选题结果 */
export interface SelectionResult {
  questions: NormalizedQuestion[];
  sourceStats: {
    real_exam: number;
    basic_practice: number;
    science_chinese: number;
    arts_chinese: number;
    fallback_mock: number;
  };
  usedFallback: boolean;
  fallbackReason?: string;
  blueprint: QuestionBlueprint;
  sourceLabel: 'real_exam' | 'mixed' | 'basic_practice';
  /** Phase F: 难度 fallback 标记。当 hard 配额被 medium/easy 填补时为 true。 */
  difficultyFallback?: boolean;
  /** Phase F: 实际取到的难度分布（便于 UI 与测试验证） */
  actualDifficulty?: { easy: number; medium: number; hard: number };
}

// ===================== 标准化层 =====================

/**
 * 标准化题目（兼容 question-bank / science-chinese / arts-chinese）
 */
export function normalizeQuestion(
  q:
    | Question
    | ReturnType<typeof getAllScienceChineseQuestions>[0]
    | ReturnType<typeof getAllArtsChineseQuestions>[0],
  fallbackSubject?: string,
): NormalizedQuestion | null {
  // 理科中文 / 文科中文
  if (
    'options' in q &&
    Array.isArray(q.options) &&
    q.options.length > 0 &&
    typeof q.options[0] === 'string' &&
    'correctAnswer' in q &&
    typeof q.correctAnswer === 'number'
  ) {
    const sci = q as {
      id?: string;
      subject?: string;
      question: string;
      options: string[];
      correctAnswer: number;
      module?: string;
      difficulty?: string | number;
      source?: string;
      answerExplanation?: string;
      explanation?: string;
    };
    return {
      id: sci.id || `sci_${Math.random().toString(36).slice(2, 8)}`,
      subject: sci.subject || fallbackSubject || '理科中文',
      question: sci.question,
      options: sci.options.map(
        (opt: string, i: number) => `${String.fromCharCode(65 + i)}. ${opt}`,
      ),
      correctAnswer: sci.correctAnswer,
      module: sci.module || '其他',
      knowledgePoint: sci.module || '其他',
      knowledgePointSource: 'native',
      difficulty: normalizeDifficulty(sci.difficulty),
      source: sci.subject === '文科中文' ? 'arts_chinese' : 'science_chinese',
      type: '选择题',
      answerExplanation: sci.answerExplanation || sci.explanation,
    };
  }

  // question-bank 题目
  const bankQ = q as Question;
  if (!bankQ.options || bankQ.options.length === 0) return null;
  if (bankQ.type !== '选择题') return null;

  const options = bankQ.options.map((opt) => `${opt.key}. ${opt.value}`);
  const correctAnswer = bankQ.answer
    ? bankQ.options.findIndex((opt) => opt.key === bankQ.answer)
    : -1;
  if (correctAnswer < 0) return null;

  const { knowledgePoint: derivedKP, metadataSource } = deriveKnowledgePoint(bankQ);

  // Q3.0.1: 若题目有 V1 enrichment，以 enrichment 的 knowledgePoint / explanation 为准（不修改 Question 接口）
  const enrichment: QuestionEnrichment | undefined = getQuestionEnrichment(bankQ.id);
  const knowledgePoint = enrichment?.knowledgePoint || derivedKP;
  const kpSource = enrichment
    ? (enrichment.knowledgePointSource as MetadataSource)
    : metadataSource;
  const answerExplanation = enrichment?.explanation || undefined;

  return {
    id: bankQ.id,
    subject: bankQ.subject,
    question: bankQ.question,
    options,
    correctAnswer,
    module: bankQ.module || bankQ.partTitle || '其他',
    knowledgePoint,
    knowledgePointSource: kpSource,
    difficulty:
      (bankQ.difficulty as 'easy' | 'medium' | 'hard') ||
      (enrichment?.difficulty as 'easy' | 'medium' | 'hard') ||
      'medium',
    source: (bankQ.source as QuestionSource) || 'unknown',
    type: bankQ.type,
    answerExplanation,
  };
}

// ===================== 蓝图生成 =====================

/**
 * 考试标准难度分布（CSCA 对标，不随学生能力变化）
 */
const EXAM_DIFFICULTY_DISTRIBUTION = { easy: 0.25, medium: 0.55, hard: 0.2 };

/**
 * 根据学习上下文 + 模式生成题目蓝图
 */
export function buildBlueprint(
  ctx: LearningContext,
  mode: SelectionMode,
  subject: string,
  count: number,
): QuestionBlueprint {
  let difficulty: { easy: number; medium: number; hard: number };
  let abilityAdaptive = false;

  switch (mode) {
    case 'diagnostic':
      difficulty = {
        easy: Math.round(count * 0.3),
        medium: Math.round(count * 0.5),
        hard: Math.round(count * 0.2),
      };
      break;
    case 'practice':
      abilityAdaptive = true;
      const ability = ctx.currentAbility?.[subject];
      // 无真实能力数据 → 均衡分布（不伪造）
      if (ability === undefined) {
        difficulty = {
          easy: Math.round(count * 0.33),
          medium: Math.round(count * 0.34),
          hard: count - Math.round(count * 0.33) - Math.round(count * 0.34),
        };
      } else if (ability < 0.4) {
        difficulty = {
          easy: Math.round(count * 0.5),
          medium: Math.round(count * 0.35),
          hard: Math.round(count * 0.15),
        };
      } else if (ability < 0.7) {
        difficulty = {
          easy: Math.round(count * 0.3),
          medium: Math.round(count * 0.5),
          hard: Math.round(count * 0.2),
        };
      } else {
        difficulty = {
          easy: Math.round(count * 0.15),
          medium: Math.round(count * 0.45),
          hard: Math.round(count * 0.4),
        };
      }
      break;
    case 'exam':
      // 考试：固定标准分布，不因学生能力改变
      abilityAdaptive = false;
      difficulty = {
        easy: Math.round(count * EXAM_DIFFICULTY_DISTRIBUTION.easy),
        medium: Math.round(count * EXAM_DIFFICULTY_DISTRIBUTION.medium),
        hard: Math.round(count * EXAM_DIFFICULTY_DISTRIBUTION.hard),
      };
      break;
    case 'wrong_answer_practice':
      abilityAdaptive = true;
      // 错题修正：难度略低，便于消化
      difficulty = {
        easy: Math.round(count * 0.4),
        medium: Math.round(count * 0.4),
        hard: Math.round(count * 0.2),
      };
      break;
  }

  const diffSum = difficulty.easy + difficulty.medium + difficulty.hard;
  if (diffSum !== count) difficulty.medium += count - diffSum;

  const weakPoints = ctx.weakKnowledgePoints?.[subject] ?? [];
  const knowledgeAreas = weakPoints.length > 0 ? weakPoints : [];

  return {
    subject,
    total: count,
    difficulty,
    knowledgeAreas,
    questionTypes: ['选择题'],
    preferredSources: ['real_exam', 'basic_practice'],
    abilityAdaptive,
  };
}

// ===================== candidateScore 评分 =====================

/**
 * 候选题评分（权重透明，不可解释的权重不加）
 *
 * candidateScore = knowledgeNeedScore + difficultyFitScore + weakPointScore
 *                + freshnessScore + sourceQualityScore
 *
 * 每项 0-10 分，总 0-50 分。分数越高越优先。
 */
function scoreCandidate(
  q: NormalizedQuestion,
  ctx: LearningContext,
  blueprint: QuestionBlueprint,
): number {
  let score = 0;

  // 1. knowledgeNeedScore (0-10): practice/wrong-answer 模式优先薄弱知识点
  if (blueprint.knowledgeAreas.length > 0 && (blueprint.abilityAdaptive || false)) {
    const isWeak = blueprint.knowledgeAreas.includes(q.knowledgePoint);
    score += isWeak ? 10 : 0;
  } else {
    score += 5; // 无薄弱点时中立
  }

  // 2. difficultyFitScore (0-10): 符合蓝图难度分布
  // 用蓝图难度比例的得分（匹配则高分）
  const diffRatio = blueprint.difficulty[q.difficulty] / blueprint.total;
  score += Math.round(diffRatio * 10);

  // 3. weakPointScore (0-10): wrong-answer 模式优先同知识点（但排除原题）
  // 已在 knowledgeNeedScore 中覆盖，此处避免重复加分
  score += 0;

  // 4. freshnessScore (0-10): 最近做过的题减分
  const recentIds = ctx.recentQuestionIds ?? [];
  const wrongIds = ctx.recentWrongQuestionIds ?? [];
  if (recentIds.includes(q.id)) {
    score -= 8; // 最近做过的大幅减分
  } else if (wrongIds.includes(q.id)) {
    // 错题本身：wrong-answer 模式需要找同知识点新题，原题减分
    score -= 5;
  } else {
    score += 8; // 新题高分
  }

  // 5. sourceQualityScore (0-10): real_exam 优先
  if (q.source === 'real_exam' || q.source === 'science_chinese' || q.source === 'arts_chinese') {
    score += 10;
  } else if (q.source === 'basic_practice') {
    score += 5;
  } else {
    score += 2;
  }

  return score;
}

// ===================== 选题核心 =====================

/**
 * 从题库选取题目（核心函数）
 *
 * @param ctx 统一 LearningContext
 * @param mode 选题模式
 * @param subject 科目
 * @param count 题数
 */
export function selectQuestions(
  ctx: LearningContext,
  mode: SelectionMode,
  subject: string,
  count: number,
): SelectionResult {
  const blueprint = buildBlueprint(ctx, mode, subject, count);
  const sourceStats = {
    real_exam: 0,
    basic_practice: 0,
    science_chinese: 0,
    arts_chinese: 0,
    fallback_mock: 0,
  };

  let rawQuestions: NormalizedQuestion[] = [];

  // 1. 获取候选池
  // Q3.0 修复：理科中文/文科中文同时从独立 loader 和 question-bank（V1）取题，合并候选池
  if (subject === '理科中文') {
    const all = getAllScienceChineseQuestions();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const fromLoader = shuffled
      .map((q) => normalizeQuestion(q, subject))
      .filter((q): q is NormalizedQuestion => q !== null);
    // 合并 question-bank 中的 V1 理科中文题
    const {
      questions: bankPicked,
      realCount,
      basicCount,
    } = getQuestionsWithFallback(subject, Math.max(count * 3, 20));
    const fromBank = bankPicked
      .map((q) => normalizeQuestion(q, subject))
      .filter((q): q is NormalizedQuestion => q !== null);
    rawQuestions = [...fromLoader, ...fromBank];
    sourceStats.science_chinese = fromLoader.length;
    sourceStats.real_exam += realCount;
    sourceStats.basic_practice += basicCount;
  } else if (subject === '文科中文') {
    const all = getAllArtsChineseQuestions();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const fromLoader = shuffled
      .map((q) => normalizeQuestion(q, subject))
      .filter((q): q is NormalizedQuestion => q !== null);
    // 合并 question-bank 中的 V1 文科中文题
    const {
      questions: bankPicked,
      realCount,
      basicCount,
    } = getQuestionsWithFallback(subject, Math.max(count * 3, 20));
    const fromBank = bankPicked
      .map((q) => normalizeQuestion(q, subject))
      .filter((q): q is NormalizedQuestion => q !== null);
    rawQuestions = [...fromLoader, ...fromBank];
    sourceStats.arts_chinese = fromLoader.length;
    sourceStats.real_exam += realCount;
    sourceStats.basic_practice += basicCount;
  } else {
    const {
      questions: picked,
      realCount,
      basicCount,
    } = getQuestionsWithFallback(subject, Math.max(count * 3, 20));
    sourceStats.real_exam = realCount;
    sourceStats.basic_practice = basicCount;

    rawQuestions = picked
      .map((q) => normalizeQuestion(q, subject))
      .filter((q): q is NormalizedQuestion => q !== null);
  }

  let fallbackReason: string | undefined;

  // 2. 错题修正模式：优先同知识点新题
  if (mode === 'wrong_answer_practice' && blueprint.knowledgeAreas.length > 0) {
    const weakSet = new Set(blueprint.knowledgeAreas);
    const sameKp = rawQuestions.filter((q) => weakSet.has(q.knowledgePoint));
    if (sameKp.length >= count) {
      rawQuestions = sameKp;
    } else if (sameKp.length > 0) {
      // 同知识点不足，放宽到同科目（诚实 fallback）
      fallbackReason = 'knowledge_point_insufficient';
      rawQuestions = sameKp;
    }
  }

  // 3. 难度配额填充（按蓝图比例，题库不足时按 medium→easy→hard 顺序填补缺口）
  // Phase F: 跟踪 hard 配额是否被 fallback 填补（不把 medium 改名为 hard，仅标注）
  let difficultyFallback = false;
  let filtered = rawQuestions;
  if (rawQuestions.length >= count) {
    const byDifficulty = {
      easy: shuffle(rawQuestions.filter((q) => q.difficulty === 'easy')),
      medium: shuffle(rawQuestions.filter((q) => q.difficulty === 'medium')),
      hard: shuffle(rawQuestions.filter((q) => q.difficulty === 'hard')),
    };
    const quota = { ...blueprint.difficulty };
    const picked: NormalizedQuestion[] = [];
    // 按配额取题
    picked.push(...byDifficulty.easy.splice(0, Math.max(0, quota.easy)));
    picked.push(...byDifficulty.medium.splice(0, Math.max(0, quota.medium)));
    picked.push(...byDifficulty.hard.splice(0, Math.max(0, quota.hard)));

    // Phase F: 若 hard 配额 > 0 但实际取到 0 道，标记 difficultyFallback
    if (quota.hard > 0 && byDifficulty.hard.length === 0) {
      difficultyFallback = true;
      fallbackReason = fallbackReason || 'hard_unavailable_in_bank';
    }

    // 缺口填补：优先 medium → easy → hard
    if (picked.length < count) {
      const remaining = count - picked.length;
      const fillOrder: NormalizedQuestion[] = [
        ...byDifficulty.medium,
        ...byDifficulty.easy,
        ...byDifficulty.hard,
      ];
      picked.push(...fillOrder.slice(0, remaining));
      fallbackReason = fallbackReason || 'difficulty_quota_unfilled';
    }
    filtered = picked;
  } else if (rawQuestions.length > 0 && rawQuestions.length < count) {
    fallbackReason = fallbackReason || 'subject_insufficient';
  }

  // 4. candidateScore 评分排序
  const scored = filtered.map((q) => ({
    q,
    score: scoreCandidate(q, ctx, blueprint),
  }));
  scored.sort((a, b) => b.score - a.score);

  // 5. 去重：排除最近做过的题（如果题库充足）
  const recentIds = new Set(ctx.recentQuestionIds ?? []);
  const wrongIds = new Set(ctx.recentWrongQuestionIds ?? []);
  const notRecent = scored.filter((s) => !recentIds.has(s.q.id) && !wrongIds.has(s.q.id));

  let finalScored = notRecent;
  if (notRecent.length < count) {
    // 新题不足，混入部分老题（诚实标注）
    fallbackReason = fallbackReason || 'recent_dedup_insufficient';
    const withRecent = scored.filter((s) => recentIds.has(s.q.id) || wrongIds.has(s.q.id));
    finalScored = [...notRecent, ...withRecent];
  }

  // 6. 截取目标数量
  const finalQuestions = finalScored.slice(0, count).map((s) => s.q);

  // 7. 诚实标注来源
  const realTotal = sourceStats.real_exam + sourceStats.science_chinese + sourceStats.arts_chinese;
  const basicTotal = sourceStats.basic_practice + sourceStats.fallback_mock;
  const usedFallback = sourceStats.fallback_mock > 0 || basicTotal > 0 || !!fallbackReason;
  const sourceLabel: 'real_exam' | 'mixed' | 'basic_practice' =
    realTotal > 0 && basicTotal === 0
      ? 'real_exam'
      : realTotal > 0 && basicTotal > 0
        ? 'mixed'
        : 'basic_practice';

  // Phase F: 计算实际取到的难度分布
  const actualDifficulty = {
    easy: finalQuestions.filter((q) => q.difficulty === 'easy').length,
    medium: finalQuestions.filter((q) => q.difficulty === 'medium').length,
    hard: finalQuestions.filter((q) => q.difficulty === 'hard').length,
  };

  return {
    questions: finalQuestions,
    sourceStats,
    usedFallback,
    fallbackReason,
    blueprint,
    sourceLabel,
    difficultyFallback,
    actualDifficulty,
  };
}

/**
 * 批量选题（多科目）
 */
export function selectQuestionsForSubjects(
  ctx: LearningContext,
  mode: SelectionMode,
  subjects: string[],
  perSubject: number,
): {
  results: SelectionResult[];
  totalQuestions: NormalizedQuestion[];
  aggregatedStats: SelectionResult['sourceStats'];
  /** Phase F: 任一科目触发 difficultyFallback 即为 true */
  difficultyFallback: boolean;
  /** Phase F: 聚合后的实际难度分布 */
  actualDifficulty: { easy: number; medium: number; hard: number };
} {
  const results = subjects.map((subject) => selectQuestions(ctx, mode, subject, perSubject));
  const totalQuestions = results.flatMap((r) => r.questions);
  const aggregatedStats = {
    real_exam: results.reduce((s, r) => s + r.sourceStats.real_exam, 0),
    basic_practice: results.reduce((s, r) => s + r.sourceStats.basic_practice, 0),
    science_chinese: results.reduce((s, r) => s + r.sourceStats.science_chinese, 0),
    arts_chinese: results.reduce((s, r) => s + r.sourceStats.arts_chinese, 0),
    fallback_mock: results.reduce((s, r) => s + r.sourceStats.fallback_mock, 0),
  };
  const difficultyFallback = results.some((r) => r.difficultyFallback === true);
  const actualDifficulty = {
    easy: results.reduce((s, r) => s + (r.actualDifficulty?.easy ?? 0), 0),
    medium: results.reduce((s, r) => s + (r.actualDifficulty?.medium ?? 0), 0),
    hard: results.reduce((s, r) => s + (r.actualDifficulty?.hard ?? 0), 0),
  };
  return { results, totalQuestions, aggregatedStats, difficultyFallback, actualDifficulty };
}

// ===================== 工具函数 =====================

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
