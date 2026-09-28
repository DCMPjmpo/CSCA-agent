/**
 * lib/csca/learning-context-adapter.ts
 *
 * P3.4-1 Agent Read Layer —— 把浏览器上行的「原始学习数据」校验、归一化，
 * 再用既有纯函数重算，产出规范的 LearningContext。
 *
 * 设计原则：
 *   - 只读：本模块不做任何写操作，不碰 localStorage / IndexedDB / 网络。
 *   - 不重复实现计算：统计与薄弱点全部交给 learning-context.ts 的既有纯函数。
 *   - 不伪造：缺失数据标注「暂无数据」，不回落成看似真实的默认值。
 *   - 不信任客户端自述：客户端预计算的统计量结构性被忽略（见 buildLearningContext）。
 *
 * 依赖：仅 `import type` 引入类型 + 运行时引入 learning-context.ts（后者本身零依赖），
 * 不会把 voyage-progress 的 localStorage 或 enrichment JSON 拖进路由包。
 */

import {
  enrichContextWithHistory,
  type AnswerRecord,
  type LearningContext,
  type LearningMode,
} from './learning-context';
import type { KnowledgeTopic } from './knowledge-data';

/** 与 session.ts 的存储上限一致（appendAnswerRecords 只保留末 500 条）。纯属防御性截断。 */
const MAX_HISTORY = 500;

const LEARNING_MODES: readonly LearningMode[] = ['practice', 'exam', 'wrong_answer_practice'];
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const MASTERY_SOURCES = ['real_answers', 'ai_inferred', 'initial'] as const;

/** 与 ask-tutor 既有文案逐字一致（原 route.ts 内联的 stageNames）。 */
const STAGE_NAMES = [
  'S0 出发前准备',
  'S1 定位（专业诊断）',
  'S2 航海图（知识图谱）',
  'S3 演武（自适应训练）',
  'S4 观星（模拟考试）',
  'S5 纠错（错题修正）',
  'S6 测算（成绩分析）',
  'S7 修正航向（个性化计划）',
  'S8 抵达（最终评估）',
];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

/** 归一化一条原始答题记录；不合格返回 null（丢弃，不修补）。 */
function parseAnswerRecord(raw: unknown): AnswerRecord | null {
  const r = asRecord(raw);
  if (!r) return null;

  // 严格判定：拒绝 truthy/falsy 替身与非字符串键，避免污染知识点分桶。
  if (!isNonEmptyString(r.questionId)) return null;
  if (!isNonEmptyString(r.subject)) return null;
  if (typeof r.isCorrect !== 'boolean') return null;
  if (!isFiniteNumber(r.timestamp)) return null;

  const record: AnswerRecord = {
    questionId: r.questionId,
    subject: r.subject,
    isCorrect: r.isCorrect,
    timestamp: r.timestamp,
    // mode 在本链路中不被任何下游读取：computeAnswerStats 只读 isCorrect，
    // computeKnowledgePointMastery 只读 subject/knowledgePoint/module/isCorrect。
    // 因此把非法值归一化到 'practice' 不构成「伪造」——它的目的是满足类型、让
    // 记录仍能参与统计，而不是编造一个会影响结论的事实。
    mode: LEARNING_MODES.includes(r.mode as LearningMode) ? (r.mode as LearningMode) : 'practice',
  };

  if (isNonEmptyString(r.knowledgePoint)) record.knowledgePoint = r.knowledgePoint;
  if (isNonEmptyString(r.module)) record.module = r.module;
  if (DIFFICULTIES.includes(r.difficulty as (typeof DIFFICULTIES)[number])) {
    record.difficulty = r.difficulty as (typeof DIFFICULTIES)[number];
  }
  if (isNonEmptyString(r.targetMajor)) record.targetMajor = r.targetMajor;

  return record;
}

/** 校验并归一化原始答题历史。非数组 → 空数组。 */
export function parseAnswerHistory(raw: unknown): AnswerRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: AnswerRecord[] = [];
  for (const item of raw) {
    const parsed = parseAnswerRecord(item);
    if (parsed) out.push(parsed);
  }
  return out.slice(-MAX_HISTORY);
}

/** 校验并归一化知识图谱条目。全部非法 → undefined（不是空数组，避免伪造「有数据」）。 */
export function parseKnowledgeMap(raw: unknown): KnowledgeTopic[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: KnowledgeTopic[] = [];
  for (const item of raw) {
    const t = asRecord(item);
    if (!t) continue;
    if (!isNonEmptyString(t.id) || !isNonEmptyString(t.name) || !isNonEmptyString(t.subject))
      continue;
    if (!isFiniteNumber(t.mastery)) continue;

    const topic: KnowledgeTopic = {
      id: t.id,
      name: t.name,
      description: typeof t.description === 'string' ? t.description : '',
      mastery: Math.min(1, Math.max(0, t.mastery)),
      subject: t.subject,
    };
    if (MASTERY_SOURCES.includes(t.masterySource as (typeof MASTERY_SOURCES)[number])) {
      topic.masterySource = t.masterySource as (typeof MASTERY_SOURCES)[number];
    }
    out.push(topic);
  }
  return out.length > 0 ? out : undefined;
}

/** 校验 `Record<string, string[]>` 形状的薄弱知识点（旧契约字段）。非法 → undefined。 */
export function parseWeakKnowledgePoints(raw: unknown): Record<string, string[]> | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const out: Record<string, string[]> = {};
  for (const [subj, pts] of Object.entries(r)) {
    if (!isNonEmptyString(subj) || !Array.isArray(pts)) continue;
    const list = pts.filter(isNonEmptyString);
    if (list.length > 0) out[subj] = list;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export interface ParsedVoyageProgress {
  completed: number;
  total: number;
  percentage: number;
  /** 航段索引 0-8；缺失则不设（不回落 0）。 */
  currentStage?: number;
}

/** 校验客户端上行的 VoyageProgressState（只取需要的字段）。非法 → undefined。 */
export function parseProgress(raw: unknown): ParsedVoyageProgress | undefined {
  const p = asRecord(raw);
  if (!p) return undefined;
  if (
    !isFiniteNumber(p.completedCount) ||
    !isFiniteNumber(p.totalStages) ||
    !isFiniteNumber(p.progressPercent)
  ) {
    return undefined;
  }
  const result: ParsedVoyageProgress = {
    completed: p.completedCount,
    total: p.totalStages,
    percentage: p.progressPercent,
  };
  if (isFiniteNumber(p.currentStage) && p.currentStage >= 0) {
    result.currentStage = Math.floor(p.currentStage);
  }
  return result;
}

function parseSubjects(body: Record<string, unknown>): string[] {
  const direct = body.subjects;
  if (Array.isArray(direct)) {
    const arr = direct.filter(isNonEmptyString);
    if (arr.length > 0) return arr;
  }
  const diag = asRecord(body.diagnosis);
  if (diag && Array.isArray(diag.requiredSubjects)) {
    return diag.requiredSubjects.filter(isNonEmptyString);
  }
  return [];
}

/**
 * 解析真实学习阶段。
 * 优先级：progress.currentStage（由 getVoyageProgress 派生，见 D7）→ 客户端 currentStage。
 * 都缺失 → undefined，交由渲染层标注「暂无数据」（不回落成 S0）。
 */
export function resolveCurrentStage(raw: unknown): number | undefined {
  const body = asRecord(raw);
  if (!body) return undefined;
  const progress = parseProgress(body.progress);
  if (progress?.currentStage != null) return progress.currentStage;
  if (isFiniteNumber(body.currentStage) && body.currentStage >= 0)
    return Math.floor(body.currentStage);
  return undefined;
}

/**
 * 把不可信的原始请求体构建成规范的 LearningContext。
 *
 * ⚠️ 关键约束：`base` **只**由服务端认可的字段构成，绝不 spread 整个请求体。
 * 原因：enrichContextWithHistory 在派生为空时会**回落到 base**
 *   - weakKnowledgePoints  ← base（learning-context.ts:234）
 *   - recentQuestionIds / recentWrongQuestionIds ← base（:236-237）
 *   - currentAbility ← 以 base 为起点（:215）
 * 若把客户端预计算的统计量放进 base，它们在「历史样本不足」时会原样透传，
 * 等于服务端采信客户端自述 —— 本适配层要消除的正是这一点。
 *
 * 身份字段：服务端无法验证用户身份（本仓库无账号体系），因此这里只接受
 * 非敏感的展示字段（targetMajor / countryCode），并**忽略**任何自称身份的字段
 * （userId / studentId / name / role），不采信、不传递。
 */
export function buildLearningContext(raw: unknown): LearningContext {
  const body = asRecord(raw) ?? {};

  const stage = resolveCurrentStage(body);

  const base: Pick<LearningContext, 'requiredSubjects' | 'currentStage'> &
    Partial<LearningContext> = {
    requiredSubjects: parseSubjects(body),
    // enrichContextWithHistory 的入参类型要求 number；缺失时传 0 仅为满足类型，
    // 是否「真实存在」由渲染层用 resolveCurrentStage 的结果判定。
    currentStage: stage ?? 0,
    targetMajor: isNonEmptyString(body.targetMajor) ? body.targetMajor : undefined,
    countryCode: isNonEmptyString(body.countryCode) ? body.countryCode : undefined,
  };

  const ctx = enrichContextWithHistory(base, parseAnswerHistory(body.answerHistory));

  // knowledgeMap 只做结构校验与夹取，不参与派生。
  const knowledgeMap = parseKnowledgeMap(body.knowledgeMap);
  if (knowledgeMap) ctx.knowledgeMap = knowledgeMap;

  return ctx;
}

export interface RenderExtras {
  /** 解析后的真实阶段；undefined 表示未提供 → 渲染「暂无数据」。 */
  stage?: number;
  progress?: ParsedVoyageProgress;
  /** 品牌叙事摘要（客户端的 voyageContext），非空时附加在末尾。 */
  voyageContext?: string;
}

/**
 * 把 LearningContext 渲染成 AI 可读的诚实文本。
 *
 * 规则与既有 ask-tutor 内联实现一致：无数据一律标注「暂无数据」，不编造掌握度；
 * 知识图谱概要只统计 masterySource === 'real_answers' 的条目。
 */
export function renderLearningContext(ctx: LearningContext, extras: RenderExtras = {}): string {
  const lines: string[] = [];

  // 当前阶段 —— 缺失时如实标注，不回落成 S0
  if (typeof extras.stage === 'number' && extras.stage >= 0) {
    lines.push(`- 当前学习阶段：${STAGE_NAMES[extras.stage] ?? `S${extras.stage}`}`);
  } else {
    lines.push('- 当前学习阶段：暂无数据');
  }

  // 学习进度（客户端上行，已校验）
  if (extras.progress) {
    lines.push(
      `- 学习进度：已完成 ${extras.progress.completed}/${extras.progress.total} 个航段（${extras.progress.percentage}%）`,
    );
  }

  // 答题统计（服务端从原始历史重算，非客户端自述）
  const completed = ctx.completedQuestionCount;
  const wrong = ctx.wrongQuestionCount;
  if (completed > 0) {
    const accuracy =
      ctx.recentAccuracy != null ? `${Math.round(ctx.recentAccuracy * 100)}%` : '暂无数据';
    lines.push(`- 已完成题目数：${completed}，错题数：${wrong}，最近正确率：${accuracy}`);
  } else {
    lines.push('- 已完成题目数：0（学生尚未开始练习/考试）');
  }

  // 薄弱知识点（来自真实答题历史）
  if (ctx.weakKnowledgePoints && Object.keys(ctx.weakKnowledgePoints).length > 0) {
    const weakList = Object.entries(ctx.weakKnowledgePoints)
      .map(([subj, pts]) => `${subj}: ${pts.join('、')}`)
      .join('；');
    lines.push(`- 薄弱知识点（来自答题数据）：${weakList}`);
  } else {
    lines.push('- 薄弱知识点：暂无数据（学生尚未答题或全部掌握）');
  }

  // 知识图谱 mastery 概要（只统计真实数据，不展示伪造值）
  if (Array.isArray(ctx.knowledgeMap) && ctx.knowledgeMap.length > 0) {
    const realTopics = ctx.knowledgeMap.filter((t) => t.masterySource === 'real_answers');
    if (realTopics.length > 0) {
      const avgMastery = realTopics.reduce((s, t) => s + t.mastery, 0) / realTopics.length;
      lines.push(
        `- 知识图谱（基于 ${realTopics.length} 个真实答题知识点）：平均掌握度 ${Math.round(avgMastery * 100)}%`,
      );
    } else {
      lines.push('- 知识图谱：暂无真实答题数据，无法评估掌握度');
    }
  }

  let text = lines.join('\n');

  // 品牌叙事附加（与既有行为逐字一致）
  if (typeof extras.voyageContext === 'string' && extras.voyageContext.trim().length > 0) {
    text += `\n\n[品牌叙事摘要]\n${extras.voyageContext}`;
  }

  return text;
}
