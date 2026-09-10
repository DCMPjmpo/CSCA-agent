/**
 * lib/csca/learning-context.ts
 *
 * Phase E+ 统一 LearningContext —— 所有 API/Selector 的唯一学生状态来源
 *
 * 设计原则：
 *   - 禁止任何字段默认伪造（mastery=0, answerHistory=[], completed=0）
 *   - 新用户所有数值字段为 0 或空数组
 *   - 所有 API 必须从同一个 LearningContext 读取状态
 *   - 不破坏现有 question-selection.ts 的 LearningContext 接口（向后兼容）
 */

import type { KnowledgeTopic } from './knowledge-data';

/** 学习模式（三态分离） */
export type LearningMode = 'practice' | 'exam' | 'wrong_answer_practice';

/** 题目级答题历史记录（保留题目级粒度，不只用 aggregate） */
export interface AnswerRecord {
  questionId: string;
  subject: string;
  /** 知识点（module / topic / knowledgePoint） */
  knowledgePoint?: string;
  module?: string;
  isCorrect: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  mode: LearningMode;
  targetMajor?: string;
  timestamp: number;
}

/**
 * 统一 LearningContext
 *
 * 所有选题 / Knowledge Map / AI Mate 都从此对象读取学生状态。
 * 新用户：mastery 全部 0，answerHistory=[], completedQuestionCount=0
 */
export interface LearningContext {
  // ===== 身份与目标 =====
  /** 目标专业（用户真实选择，禁止默认伪造） */
  targetMajor?: string;
  /** 国家代码（影响 ASEAN 偏移，但不伪造 mastery） */
  countryCode?: string;
  /** 目标院校 */
  targetUniversity?: string;
  /** 目标国家 */
  targetCountry?: string;

  // ===== 诊断结果 =====
  /** 所需 CSCA 科目（来自 S1/S2 诊断） */
  requiredSubjects: string[];
  /** 当前学习阶段 0-8 */
  currentStage: number;

  // ===== 答题统计（从 answerHistory 派生，但显式暴露方便使用） =====
  completedQuestionCount: number;
  correctQuestionCount: number;
  wrongQuestionCount: number;
  /** 最近正确率 0-1（无数据时为 undefined，不是 0.5） */
  recentAccuracy?: number;

  // ===== 能力画像 =====
  /** subject → mastery 0-1（无数据时不传，禁止默认 0.5） */
  currentAbility?: Record<string, number>;
  /** 知识点掌握度 subject → { knowledgePoint → mastery } */
  knowledgePointMastery?: Record<string, Record<string, number>>;
  /** 薄弱知识点 subject → knowledgePoints[]（mastery < 0.5 且有真实数据） */
  weakKnowledgePoints?: Record<string, string[]>;

  // ===== 知识图谱 =====
  knowledgeMap?: KnowledgeTopic[];

  // ===== 题目历史（驱动去重和错题循环） =====
  /** 最近做过的题目 ID（去重用，避免重复） */
  recentQuestionIds?: string[];
  /** 最近错题 ID（错题优先练） */
  recentWrongQuestionIds?: string[];
  /** 完整答题历史（题目级粒度，用于 Knowledge Map 计算） */
  answerHistory?: AnswerRecord[];

  // ===== 选题偏好 =====
  /** 偏好难度（如 'easy' | 'medium' | 'hard'），无数据时由 currentAbility 推导 */
  preferredDifficulty?: 'easy' | 'medium' | 'hard';
  /** 当前学习模式 */
  learningMode?: LearningMode;
}

/**
 * 空 LearningContext（新用户）
 * 所有数值为 0 或空，禁止伪造。
 */
export function emptyLearningContext(): LearningContext {
  return {
    targetMajor: undefined,
    countryCode: undefined,
    targetUniversity: undefined,
    requiredSubjects: [],
    currentStage: 0,
    completedQuestionCount: 0,
    correctQuestionCount: 0,
    wrongQuestionCount: 0,
    recentAccuracy: undefined,
    currentAbility: undefined,
    knowledgePointMastery: undefined,
    weakKnowledgePoints: undefined,
    knowledgeMap: undefined,
    recentQuestionIds: undefined,
    recentWrongQuestionIds: undefined,
    answerHistory: undefined,
    preferredDifficulty: undefined,
    learningMode: undefined,
  };
}

/**
 * 从答题历史计算统计字段
 *
 * 输入 answerHistory，输出 completed/correct/wrong/recentAccuracy
 */
export function computeAnswerStats(history: AnswerRecord[] | undefined): {
  completedQuestionCount: number;
  correctQuestionCount: number;
  wrongQuestionCount: number;
  recentAccuracy?: number;
} {
  if (!history || history.length === 0) {
    return {
      completedQuestionCount: 0,
      correctQuestionCount: 0,
      wrongQuestionCount: 0,
      recentAccuracy: undefined,
    };
  }

  const correct = history.filter((a) => a.isCorrect).length;
  const wrong = history.length - correct;

  return {
    completedQuestionCount: history.length,
    correctQuestionCount: correct,
    wrongQuestionCount: wrong,
    recentAccuracy: Math.round((correct / history.length) * 100) / 100,
  };
}

/**
 * 从答题历史计算知识点掌握度
 *
 * 每个 knowledgePoint 至少需要 3 条记录才计算（避免偶然性），
 * 否则不返回该知识点的 mastery（诚实标注"数据不足"）。
 */
export function computeKnowledgePointMastery(
  history: AnswerRecord[] | undefined,
): Record<string, Record<string, number>> {
  if (!history || history.length === 0) return {};

  // subject → knowledgePoint → { correct, total }
  const buckets: Record<string, Record<string, { correct: number; total: number }>> = {};

  for (const a of history) {
    const subj = a.subject;
    const kp = a.knowledgePoint || a.module;
    if (!kp) continue;
    if (!buckets[subj]) buckets[subj] = {};
    if (!buckets[subj][kp]) buckets[subj][kp] = { correct: 0, total: 0 };
    buckets[subj][kp].total += 1;
    if (a.isCorrect) buckets[subj][kp].correct += 1;
  }

  const result: Record<string, Record<string, number>> = {};
  for (const [subj, kps] of Object.entries(buckets)) {
    result[subj] = {};
    for (const [kp, stats] of Object.entries(kps)) {
      if (stats.total >= 3) {
        result[subj][kp] = Math.round((stats.correct / stats.total) * 100) / 100;
      }
      // < 3 条不计算，不返回该 kp
    }
  }
  return result;
}

/**
 * 从答题历史提取薄弱知识点列表（mastery < 0.5）
 */
export function extractWeakKnowledgePoints(
  history: AnswerRecord[] | undefined,
): Record<string, string[]> {
  const mastery = computeKnowledgePointMastery(history);
  const weak: Record<string, string[]> = {};
  for (const [subj, kps] of Object.entries(mastery)) {
    const weakKps = Object.entries(kps)
      .filter(([, m]) => m < 0.5)
      .map(([kp]) => kp);
    if (weakKps.length > 0) weak[subj] = weakKps;
  }
  return weak;
}

/**
 * 从答题历史派生完整 LearningContext 的统计字段
 *
 * 注意：不覆盖 targetMajor / requiredSubjects / currentStage 等身份字段，
 * 调用方需先构造基础 ctx，再用此函数填充统计字段。
 */
export function enrichContextWithHistory(
  base: Pick<LearningContext, 'requiredSubjects' | 'currentStage'> & Partial<LearningContext>,
  history: AnswerRecord[] | undefined,
): LearningContext {
  const stats = computeAnswerStats(history);
  const kpMastery = computeKnowledgePointMastery(history);
  const weak = extractWeakKnowledgePoints(history);

  // subject 平均 mastery（从历史计算的覆盖传入值，历史未覆盖的科目保留传入值）
  const mergedAbility: Record<string, number> = { ...(base.currentAbility || {}) };
  for (const [subj, kps] of Object.entries(kpMastery)) {
    const values = Object.values(kps);
    if (values.length > 0) {
      mergedAbility[subj] = Math.round((values.reduce((s, m) => s + m, 0) / values.length) * 100) / 100;
    }
  }

  const recentIds = (history || []).slice(-30).map((a) => a.questionId);
  const wrongIds = (history || [])
    .filter((a) => !a.isCorrect)
    .slice(-30)
    .map((a) => a.questionId);

  return {
    ...base,
    ...stats,
    currentAbility: Object.keys(mergedAbility).length > 0 ? mergedAbility : undefined,
    knowledgePointMastery: Object.keys(kpMastery).length > 0 ? kpMastery : undefined,
    weakKnowledgePoints: Object.keys(weak).length > 0 ? weak : (base.weakKnowledgePoints),
    answerHistory: history,
    recentQuestionIds: recentIds.length > 0 ? recentIds : base.recentQuestionIds,
    recentWrongQuestionIds: wrongIds.length > 0 ? wrongIds : base.recentWrongQuestionIds,
  };
}
