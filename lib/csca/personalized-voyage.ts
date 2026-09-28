/**
 * lib/csca/personalized-voyage.ts
 *
 * P3.5-B —— Personalized Voyage Decision Layer。
 *
 * 把「学生状态 → 下一学习行动」从硬编码变成动态决策。本模块**只做决策**：
 *   - 纯函数、确定性：无副作用、无 Date.now()、无 Math.random()、不碰 localStorage
 *   - 不重写 9 段 Voyage、不重写 Learning Engine、不重写 Question Selector
 *   - 不写进度：进度仍由 lib/voyage-progress.ts 的 completeStage() 独占写入
 *
 * 诚实性原则（沿用 lib/csca/learning-context.ts:6-10）：数据不足时 basis='no_data'，
 * 绝不把缺失数据回落成看似真实的默认值。
 *
 * 终止性保证（替换式推进的正确性核心）：
 *   阶梯每条规则都带「该阶段尚未完成」闸门，故返回的行动 stageIndex 必不在 completedStages 中。
 *   完成它 → completedCount 严格 +1 → 最多 9 轮必然收敛到 kind='done'，不会自循环。
 */

import {
  computeAnswerStats,
  extractWeakKnowledgePoints,
  type AnswerRecord,
} from '@/lib/csca/learning-context';
import { STAGE_TO_CANONICAL_STEP } from '@/lib/voyage-stages';

/* =======================================================================
 * 学生模型（输入）
 * ======================================================================= */

export interface StudentModel {
  /** 当前所在阶段索引 0-8 */
  currentStage: number;
  /** 已完成阶段索引列表 */
  completedStages: number[];
  /** 是否真的做过定位测评 */
  hasDiagnosis: boolean;
  /** 由 answerHistory 派生（computeAnswerStats） */
  completedQuestionCount: number;
  /** 由 answerHistory 派生（extractWeakKnowledgePoints），跨科目求和 */
  weakKnowledgePointCount: number;
  /** P3.5-B0 已可靠持久化的错题证据 */
  errorRecordCount: number;
  /** undefined / null 均表示「没有成绩」 */
  examScore?: number | null;
  hasStudyPlan: boolean;
}

export interface BuildStudentModelInput {
  completedStages?: number[];
  currentStage?: number;
  answerHistory?: AnswerRecord[];
  errorRecordCount?: number;
  examScore?: number | null;
  hasStudyPlan?: boolean;
  hasDiagnosis?: boolean;
}

/**
 * 把散落的存储/组件状态归一化成 StudentModel。
 * 派生一律走 learning-context.ts 的既有纯函数，不自己重算正确率或薄弱点。
 * 缺数据 → 0 / false / null，不伪造。
 */
export function buildStudentModel(input: BuildStudentModelInput): StudentModel {
  const stats = computeAnswerStats(input.answerHistory);
  const weak = extractWeakKnowledgePoints(input.answerHistory);
  const weakKnowledgePointCount = Object.values(weak).reduce((n, kps) => n + kps.length, 0);

  return {
    currentStage: typeof input.currentStage === 'number' ? input.currentStage : 0,
    completedStages: Array.isArray(input.completedStages)
      ? [...input.completedStages].sort((a, b) => a - b)
      : [],
    hasDiagnosis: input.hasDiagnosis === true,
    completedQuestionCount: stats.completedQuestionCount,
    weakKnowledgePointCount,
    errorRecordCount: typeof input.errorRecordCount === 'number' ? input.errorRecordCount : 0,
    examScore: typeof input.examScore === 'number' ? input.examScore : null,
    hasStudyPlan: input.hasStudyPlan === true,
  };
}

/* =======================================================================
 * 行动（输出）
 * ======================================================================= */

export type LearningActionKind =
  | 'diagnosis'
  | 'knowledge_map'
  | 'adaptive_learning'
  | 'mock_exam'
  | 'score_analysis'
  | 'error_review'
  | 'study_plan'
  | 'ai_tutor'
  | 'university_match'
  | 'done';

export interface Bilingual {
  zh: string;
  en: string;
}

export interface NextLearningAction {
  kind: LearningActionKind;
  /** 阶段索引 0-8；'done' 时指向收束落点 */
  stageIndex: number;
  /** 规范 step key（来自 STAGE_TO_CANONICAL_STEP），可直接喂给 setCurrentStep() */
  stepKey: string;
  /** 真实存在的落点，hash 逐字落在 CSCAVoyageApp 的 HASH_TO_STEP 白名单内 */
  href: string;
  title: Bilingual;
  /** 为什么推荐它 —— 决策专属理由，不是阶段简介 */
  reason: Bilingual;
  /** 'no_data' = 因缺少数据而推荐；'derived' = 由真实数据推出 */
  basis: 'no_data' | 'derived';
  /** 触发本决策的具体信号，供测试与 UI 审计 */
  signals: string[];
  /** 该行动是否推进一个尚未完成的阶段（'done' 为 false） */
  advancesProgress: boolean;
}

/**
 * 每个行动固定的静态元数据。stageIndex 是唯一真源，
 * stepKey 从 STAGE_TO_CANONICAL_STEP 派生（不另造第二张映射表）。
 */
const ACTION_STAGE: Record<Exclude<LearningActionKind, 'done'>, number> = {
  diagnosis: 0,
  knowledge_map: 1,
  adaptive_learning: 2,
  mock_exam: 3,
  score_analysis: 4,
  error_review: 5,
  study_plan: 6,
  ai_tutor: 7,
  university_match: 8,
};

/**
 * 行动落点（hash 白名单）。与 step key 是**不同**的关注点：
 * step key 是内部 Step 联合类型成员，href 是 URL hash —— 两套命名历史不同
 * （如 stage3 stepKey='exam_center' 但 hash='mock-exam'）。
 * 测试会逐条断言这些 href 落在 CSCAVoyageApp 的 HASH_TO_STEP 白名单内。
 */
const ACTION_HREF: Record<Exclude<LearningActionKind, 'done'>, string> = {
  diagnosis: '/csca/voyage#diagnosis',
  knowledge_map: '/csca/voyage#knowledge-map',
  adaptive_learning: '/csca/voyage#adaptive-learning',
  mock_exam: '/csca/voyage#mock-exam',
  score_analysis: '/csca/voyage#score-analysis',
  error_review: '/csca/voyage#error-review',
  study_plan: '/csca/voyage#study-plan',
  ai_tutor: '/csca-multi-agent',
  university_match: '/csca/voyage#university-match',
};

const ACTION_TITLE: Record<Exclude<LearningActionKind, 'done'>, Bilingual> = {
  diagnosis: { zh: '起点定位', en: 'Placement Test' },
  knowledge_map: { zh: '知识图谱', en: 'Knowledge Map' },
  adaptive_learning: { zh: '适应性练习', en: 'Adaptive Practice' },
  mock_exam: { zh: '试航演练', en: 'Mock Exam' },
  score_analysis: { zh: '成绩分析', en: 'Score Analysis' },
  error_review: { zh: '错题修正', en: 'Error Review' },
  study_plan: { zh: '学习计划', en: 'Study Plan' },
  ai_tutor: { zh: 'AI 答疑', en: 'AI Tutor' },
  university_match: { zh: '院校匹配', en: 'University Match' },
};

function stageStepKey(kind: Exclude<LearningActionKind, 'done'>): string {
  return STAGE_TO_CANONICAL_STEP[ACTION_STAGE[kind]];
}

function makeAction(
  kind: Exclude<LearningActionKind, 'done'>,
  reason: Bilingual,
  basis: 'no_data' | 'derived',
  signals: string[],
): NextLearningAction {
  return {
    kind,
    stageIndex: ACTION_STAGE[kind],
    stepKey: stageStepKey(kind),
    href: ACTION_HREF[kind],
    title: ACTION_TITLE[kind],
    reason: { zh: reason.zh, en: reason.en },
    basis,
    signals,
    advancesProgress: true,
  };
}

/* =======================================================================
 * 决策阶梯
 * ======================================================================= */

/**
 * 学生状态 → 下一学习行动。
 *
 * 阶梯：优先级从高到低，**第一条命中即返回**。顺序即教学优先级：
 * 先补定位 → 练薄弱点 → 考试 → 看分析 → 修错题 → 定计划 → 择校 → 问 AI。
 * 每条规则都带 `!completed.has(stage)` 闸门 —— 见文件头「终止性保证」。
 *
 * 不接收 locale：输出同时携带 zh/en，由 UI 决定渲染哪一种（避免把语言分支埋进决策逻辑）。
 */
export function resolveNextLearningAction(model: StudentModel): NextLearningAction {
  const completed = new Set(model.completedStages);
  const hasScore = typeof model.examScore === 'number';

  // 1. 定位 —— 没有起点就无法个性化任何东西
  if (!model.hasDiagnosis && !completed.has(ACTION_STAGE.diagnosis)) {
    return makeAction(
      'diagnosis',
      { zh: '还没有完成起点定位，先测出你的真实水平。', en: 'You have not taken the placement test yet — measure your real starting level first.' },
      'no_data',
      ['hasDiagnosis=false'],
    );
  }

  // 2. 薄弱点 —— 有可靠的薄弱信号（连续 3 题以上且掌握度 < 0.5）就直接练
  if (model.weakKnowledgePointCount > 0 && !completed.has(ACTION_STAGE.adaptive_learning)) {
    return makeAction(
      'adaptive_learning',
      { zh: `检测到 ${model.weakKnowledgePointCount} 个薄弱知识点，先针对性练习。`, en: `${model.weakKnowledgePointCount} weak knowledge point(s) detected — practice those first.` },
      'derived',
      [`weakKnowledgePointCount=${model.weakKnowledgePointCount}`],
    );
  }

  // 3. 考试 —— 还没有成绩
  if (!hasScore && !completed.has(ACTION_STAGE.mock_exam)) {
    return makeAction(
      'mock_exam',
      { zh: '还没有考试成绩，先跑一次试航演练定位真实水平。', en: 'No exam score yet — take a mock exam to establish your level.' },
      'no_data',
      ['examScore=none'],
    );
  }

  // 4. 看分析 —— 有成绩但还没看过成绩分析（先看分再看错题，符合自然顺序）
  if (hasScore && !completed.has(ACTION_STAGE.score_analysis)) {
    return makeAction(
      'score_analysis',
      { zh: '考试成绩已就绪，先看成绩分析了解失分结构。', en: 'Your score is in — review the score analysis to see where you lost points.' },
      'derived',
      [`examScore=${model.examScore}`],
    );
  }

  // 5. 错题修正 —— 有错题就修（闸门保证 stage5 完成后不会重复推荐）
  if (model.errorRecordCount > 0 && !completed.has(ACTION_STAGE.error_review)) {
    return makeAction(
      'error_review',
      { zh: `错题本还有 ${model.errorRecordCount} 道题待修正，逐一攻克。`, en: `${model.errorRecordCount} question(s) still unresolved in your error log.` },
      'derived',
      [`errorRecordCount=${model.errorRecordCount}`],
    );
  }

  // 6. 学习计划 —— 有薄弱点或已有计划待执行
  if (
    (model.weakKnowledgePointCount > 0 || model.hasStudyPlan) &&
    !completed.has(ACTION_STAGE.study_plan)
  ) {
    return makeAction(
      'study_plan',
      model.hasStudyPlan
        ? { zh: '按学习计划推进今日目标。', en: 'Work through today’s goals in your study plan.' }
        : { zh: '薄弱点尚未形成计划，先生成学习计划。', en: 'Your weak areas have no plan yet — generate a study plan.' },
      'derived',
      [
        `weakKnowledgePointCount=${model.weakKnowledgePointCount}`,
        `hasStudyPlan=${model.hasStudyPlan}`,
      ],
    );
  }

  // 7. 院校匹配
  if (!completed.has(ACTION_STAGE.university_match)) {
    return makeAction(
      'university_match',
      { zh: '学习数据已就绪，可以开始匹配目标院校。', en: 'Your learning data is ready — start matching target universities.' },
      'derived',
      [`completedCount=${completed.size}`],
    );
  }

  // 8. AI 答疑
  if (!completed.has(ACTION_STAGE.ai_tutor)) {
    return makeAction(
      'ai_tutor',
      { zh: '还有疑问？向 AI 助教追问。', en: 'Still unsure about something? Ask the AI tutor.' },
      'derived',
      [`completedCount=${completed.size}`],
    );
  }

  // 9. 终态兜底：补上未完成的阶段（保持单调推进）；全完成 → done。
  // 优先从 currentStage 起向前扫（顺着学生所在位置继续），尾部补完再回头填前面的缺口。
  // 无论从哪边命中，返回的 stageIndex 都不在 completed 中 —— 终止性由此成立。
  const gap =
    firstIncompleteFrom(completed, model.currentStage) ?? firstIncompleteFrom(completed, 0);
  if (gap !== null) {
    const kind = canonicalKindForStage(gap);
    return makeAction(
      kind,
      { zh: '航程中还有未完成的阶段，先补上它。', en: 'A stage is still open — finish it to keep your voyage complete.' },
      'derived',
      [`firstIncompleteStage=${gap}`],
    );
  }

  return {
    kind: 'done',
    stageIndex: ACTION_STAGE.study_plan,
    stepKey: stageStepKey('study_plan'),
    href: ACTION_HREF.study_plan,
    title: { zh: '九段航程已完成', en: 'Voyage Complete' },
    reason: {
      zh: '九个阶段全部完成，回到学习计划复习巩固。',
      en: 'All nine stages are complete — return to your study plan to review and consolidate.',
    },
    basis: 'derived',
    signals: ['allStagesComplete=true'],
    advancesProgress: false,
  };
}

/** 阶段索引 → 行动种类（反向查 ACTION_STAGE） */
function canonicalKindForStage(stageIndex: number): Exclude<LearningActionKind, 'done'> {
  for (const [kind, stage] of Object.entries(ACTION_STAGE)) {
    if (stage === stageIndex) return kind as Exclude<LearningActionKind, 'done'>;
  }
  return 'study_plan';
}

/** 从 from 起（含）找第一个未完成阶段；找不到返回 null */
function firstIncompleteFrom(completed: Set<number>, from: number): number | null {
  const start = Math.max(0, Math.min(from, STAGE_TO_CANONICAL_STEP.length - 1));
  for (let i = start; i < STAGE_TO_CANONICAL_STEP.length; i++) {
    if (!completed.has(i)) return i;
  }
  return null;
}
