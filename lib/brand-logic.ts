/**
 * lib/brand-logic.ts
 *
 * Stage 3 — Brand Logic 核心：「郑和下西洋 × CSCA 学习航程」隐喻层。
 * 只做信息架构映射 / 文案合成 / 闭环辅助视图合成，**不改**：
 *   - VOYAGE_STAGE_ORDER / STEP_TO_STAGE 顺序 (D7 红线)
 *   - session / storage schema (D3/D4 红线)
 *   - API 合约 (D1 红线)
 *
 * 所有导出应保持纯函数、易于单元测试。
 */
import type { KnowledgeMapItem } from '@/components/csca/KnowledgeGraphView';
import type { StudyPlan } from '@/lib/csca/error-analysis-core';
import type { ExamGradeResult as ExamResult, ExamQuestionLike as ExamQuestion } from '@/lib/csca/exam-scoring';
import {
  getCurrentStageIndex,
  STEP_TO_STAGE,
  VOYAGE_STAGE_ORDER,
  type VoyageStageId,
} from './voyage-stages';

/* =======================================================================
 * 轻量内部类型别名（不依赖 @/types/csca 抽象路径，避免 path alias 抽象层漂移）
 * 仅在 brand-logic 内部使用，足以支撑表 / 闭环 / 上下文视图的形状推导。
 * ======================================================================= */
export type ScoreAnalysisResult = {
  totalScore?: number | null;
  moduleScores?: Record<string, number> | null;
  rankingPercentile?: number | null;
  weakPoints?: string[] | null;
  improvementPlan?: string | null;
  subjectScores?: Record<string, number> | null;
  errorCauses?: Array<{ name: string; nameEn?: string; count?: number; percent?: number }> | null;
  recommendedTopics?: Array<{ subject?: string; topic?: string }> | null;
};

export type DiagnosisResult = {
  requiredSubjects?: string[] | null;
  recommendedSubjects?: string[] | null;
  subjectPriorities?: Record<string, number> | null;
  estimatedDays?: number | null;
};

/* =======================================================================
 * 1) LEARNING_VOYAGE_8_STOPS — 首页品牌区展示的 8 段航程
 *    (AI Mate 并入「抵达」作为全局智能层说明，不独立成段)
 * ======================================================================= */
export type LearningVoyageStop = {
  code: string; // 01..08
  eyebrow: string; // 中文 eyebrow（短）
  eyebrowEN: string; // EN uppercase eyebrow
  title: string; // 中文主标题
  titleEN: string; // EN title
  subtitle: string; // 中文一句话解释
  subtitleEN: string; // EN explanation
  internalStageIndex: number; // 内部 9 段阶段的对应索引（点击跳转落点）
  anchor: string; // 跳到 /csca#<anchor>
};

export const LEARNING_VOYAGE_8_STOPS: LearningVoyageStop[] = [
  {
    code: '01',
    eyebrow: '定位',
    eyebrowEN: 'DEPARTURE',
    title: '定位',
    titleEN: 'Departure Point',
    subtitle: '明确目标，完成学习诊断，确定你的出发点。',
    subtitleEN: 'Set goal, run assessment, confirm departure.',
    internalStageIndex: 0,
    anchor: 'diagnosis',
  },
  {
    code: '02',
    eyebrow: '航海图',
    eyebrowEN: 'VOYAGE CHART',
    title: '航海图',
    titleEN: 'Voyage Chart',
    subtitle: '知识地图展开，看清需要掌握 / 正在学习 / 已经掌握。',
    subtitleEN: 'Map knowledge: to learn / learning / mastered.',
    internalStageIndex: 1,
    anchor: 'knowledge-map',
  },
  {
    code: '03',
    eyebrow: '演武',
    eyebrowEN: 'TRAINING',
    title: '演武操练',
    titleEN: 'Training Ground',
    subtitle: '日常训练：目标、题目、即时反馈、训练进度。',
    subtitleEN: 'Daily drills: goal, questions, feedback, progress.',
    internalStageIndex: 2,
    anchor: 'adaptive-learning',
  },
  {
    code: '04',
    eyebrow: '试航',
    eyebrowEN: 'TRIAL',
    title: '试航',
    titleEN: 'Trial Voyage',
    subtitle: '低压模拟练习 → 正式模拟考试，还原 CSCA 环境。',
    subtitleEN: 'Low-pressure practice, then full mock exam fidelity.',
    internalStageIndex: 3,
    anchor: 'mock-exam',
  },
  {
    code: '05',
    eyebrow: '观星',
    eyebrowEN: 'OBSERVATION',
    title: '观星测运',
    titleEN: 'Observation',
    subtitle: '能力评估：当前水平 / 目标水平 / 差距 / 下一步。',
    subtitleEN: 'Performance: current / target / gap / next step.',
    internalStageIndex: 4,
    anchor: 'score-analysis',
  },
  {
    code: '06',
    eyebrow: '修正',
    eyebrowEN: 'CORRECTION',
    title: '错题修正',
    titleEN: 'Correction Route',
    subtitle: '找错 → 原因 → 训练 → 再测，形成闭环。',
    subtitleEN: 'Close the loop: find → why → train → retest.',
    internalStageIndex: 5,
    anchor: 'error-review',
  },
  {
    code: '07',
    eyebrow: '日程',
    eyebrowEN: 'ROUTE',
    title: '学习航程',
    titleEN: 'Voyage Route',
    subtitle: '由时间、能力、弱项生成每日到每周的个性化航程。',
    subtitleEN: 'Personalized route from hours, ability & weaknesses.',
    internalStageIndex: 6,
    anchor: 'study-plan',
  },
  {
    code: '08',
    eyebrow: '抵达',
    eyebrowEN: 'DESTINATION',
    title: '目标院校',
    titleEN: 'Destination',
    subtitle: 'AI 航海助手全程伴随；到达港口，匹配院校与专业。',
    subtitleEN: 'AI Mate guides all the way; match universities.',
    internalStageIndex: 8,
    anchor: 'university-match',
  },
];

/* =======================================================================
 * 2) REAL_VOYAGE_TO_CSCA — 10 段真实航海 ↔ CSCA 一一对应
 * ======================================================================= */
export const REAL_VOYAGE_TO_CSCA: ReadonlyArray<{
  voyage: string;
  voyageEN: string;
  csca: string;
  cscaEN: string;
}> = Object.freeze([
  { voyage: '出发', voyageEN: 'Depart', csca: '明确目标', cscaEN: 'Clarify goal' },
  { voyage: '定位', voyageEN: 'Fix Position', csca: '学习诊断', cscaEN: 'Diagnosis' },
  { voyage: '绘制航图', voyageEN: 'Chart Route', csca: '知识地图', cscaEN: 'Knowledge map' },
  { voyage: '航行', voyageEN: 'Set Sail', csca: '学习训练', cscaEN: 'Learning drills' },
  { voyage: '演练', voyageEN: 'Exercise', csca: '模拟训练', cscaEN: 'Practice drills' },
  { voyage: '试航', voyageEN: 'Trial Voyage', csca: '模拟考试', cscaEN: 'Mock exam' },
  { voyage: '观测', voyageEN: 'Observe', csca: '能力评估', cscaEN: 'Performance analysis' },
  { voyage: '修正', voyageEN: 'Correct', csca: '错题分析', cscaEN: 'Error analysis' },
  { voyage: '再航', voyageEN: 'Re-Sail', csca: '个性化计划', cscaEN: 'Personalized plan' },
  { voyage: '抵达', voyageEN: 'Arrive', csca: '达成目标', cscaEN: 'Reach destination' },
]);

/* =======================================================================
 * 3) VOYAGE_WORD_LIST — 统一术语 + 禁止词
 * ======================================================================= */
export const VOYAGE_APPROVED_TERMS = {
  en: ['Voyage', 'Departure', 'Chart', 'Training', 'Trial', 'Observation', 'Correction', 'Route', 'Destination'],
  zh: ['出发', '航图', '训练', '试航', '测评', '修正', '航程', '目标'],
} as const;

export const VOYAGE_BLACKLISTED_WORDS = Object.freeze([
  // 游戏化
  '宝藏',
  '船长',
  '海盗',
  '金币',
  '等级',
  '经验值',
  '闯关',
  'Boss',
  '任务奖励',
  // 官职 / 战争感
  '提督',
  '幕僚',
  '大捷',
  '横扫千军',
  '战功',
  '连击',
  '勋章',
  '官职',
  '令箭',
  // 本项目旧语
  '横扫千军',
  '南海提督',
  '破浪先锋',
  '此战大捷',
]);

/* =======================================================================
 * 4) AI 航海助手 Contextual 能力：9 阶段的默认意图
 * ======================================================================= */
export type VoyageAIMateContextHint = {
  stageId: VoyageStageId;
  internalIndex: number;
  contextHint: string;
  contextHintEN: string;
};

const _DEFAULT_AI_HINTS: Record<VoyageStageId, Omit<VoyageAIMateContextHint, 'stageId'>> = {
  stage1: {
    internalIndex: 0,
    contextHint: '学生正处于「定位」阶段。默认帮他/她判断目标是否合理、解释国家与学制对应关系、说明为什么需要这些科目组合。',
    contextHintEN: 'Student is at departure stage. Help validate goal suitability, explain country-system mapping & subject reasoning.',
  },
  stage2: {
    internalIndex: 1,
    contextHint: '学生正处于「航海图」阶段。默认解释当前知识节点与其前置知识的关系：「我为什么要学这个」。',
    contextHintEN: 'Student is on the chart stage. Explain nodes and their prerequisites — answer "why do I need to learn this".',
  },
  stage3: {
    internalIndex: 2,
    contextHint: '学生正处于「演武操练」阶段。默认帮做错题讲解、一步一步推导答案、同类题推荐，但不要直接给答案。',
    contextHintEN: 'Student is in training. Explain wrong answers step by step, recommend similar practice; do not just give the final answer.',
  },
  stage4: {
    internalIndex: 3,
    contextHint: '学生正处于「试航」阶段。默认进行考试复盘、时间分配建议、答题策略、心态提示；不要在考试进行中泄露答案。',
    contextHintEN: 'Student is in trial. Default: post-exam review, pacing tips, strategy; never leak an answer mid-exam.',
  },
  stage5: {
    internalIndex: 4,
    contextHint: '学生正处于「观星测运」阶段。默认把成绩翻译成「能力差距」并给出具体的下一阶段学习建议，而不是只给分数。',
    contextHintEN: 'Student is in observation. Translate scores into ability gaps + concrete next-step learning advice, not just numbers.',
  },
  stage6: {
    internalIndex: 5,
    contextHint: '学生正处于「错题修正」阶段。默认对每一道错题做原因归因（概念 / 公式 / 计算 / 审题）并推荐对应的训练题。',
    contextHintEN: 'Student is in correction. Classify error cause (concept/formula/computation/reading) and recommend targeted drills.',
  },
  stage7: {
    internalIndex: 6,
    contextHint: '学生正处于「学习航程」阶段。默认帮调整计划：压缩/增加题量、换科目顺序、保留休息日，调整后仍能在目标考试日期前完成。',
    contextHintEN: 'Student is in route planning. Adjust load, reorder subjects, keep rest days, and still meet the target exam date.',
  },
  stage8: {
    internalIndex: 7,
    contextHint: '学生正处于「AI 航海助手」大厅。默认根据最新的诊断 / 航海图 / 试航数据主动推荐下一步行动。',
    contextHintEN: 'Student is in the AI Mate hall. Proactively recommend next action using the latest diagnosis / chart / trial data.',
  },
  stage9: {
    internalIndex: 8,
    contextHint: '学生正处于「院校港口」阶段。默认对比不同院校的专业要求、录取难度、HSK 门槛，帮助其决策申请志愿顺序。',
    contextHintEN: 'Student is at destination stage. Compare university major requirements, HSK bar, admission difficulty, suggest application order.',
  },
};

export function getAIMateContextHint(
  currentStepKey: string | null | undefined,
  locale?: string | null,
): VoyageAIMateContextHint & { contextualTitle: string; contextualTitleEN: string } {
  const idx = getCurrentStageIndex(currentStepKey);
  const sid = VOYAGE_STAGE_ORDER[idx] ?? 'stage1';
  const h = _DEFAULT_AI_HINTS[sid];
  const stageName = LEARNING_VOYAGE_8_STOPS.find((s) => s.internalStageIndex === idx)?.title ?? '学习航程';
  const stageNameEN = LEARNING_VOYAGE_8_STOPS.find((s) => s.internalStageIndex === idx)?.titleEN ?? 'Learning Voyage';
  return {
    stageId: sid,
    internalIndex: h.internalIndex,
    contextHint: h.contextHint,
    contextHintEN: h.contextHintEN,
    contextualTitle: `你正在「${stageName}」阶段，AI 航海助手默认理解你当前的学习意图。`,
    contextualTitleEN: `You are in the ${stageNameEN} stage. AI Mate already understands your current learning intent.`,
    ...(locale?.startsWith('zh') || locale === undefined
      ? {}
      : { contextHint: h.contextHintEN, contextualTitle: '' }),
  } as any;
}

/* =======================================================================
 * 5) buildVoyageAIMateContext — 注入到 messages[0] 的 system 摘要
 * ======================================================================= */
export type AIMateSessionSnapshot = {
  currentStep?: string | null;
  diagnosis?: Partial<DiagnosisResult> | null;
  knowledgeMap?: ReadonlyArray<{ subject?: string | null; name?: string | null; status?: string | null; mastery?: number | null }>;
  adaptiveExercises?: ReadonlyArray<unknown>;
  examResult?: Partial<ExamResult> | null;
  scoreAnalysis?: Partial<ScoreAnalysisResult> | null;
  errorRecords?: ReadonlyArray<Partial<ExamQuestion>>;
  studyPlan?: Partial<StudyPlan> | null;
  selectedSubjects?: string[];
  selectedCountryCode?: string;
  hskLevel?: number;
  targetMajorId?: string;
};

export function buildVoyageAIMateContext(snap: AIMateSessionSnapshot, locale?: string | null): string {
  const hint = getAIMateContextHint(snap.currentStep ?? null, locale);
  const zh = !locale || locale.startsWith('zh');
  const lines: string[] = [];
  lines.push(zh ? '[CSCA 学习航程 · 上下文摘要]' : '[CSCA Learning Voyage · Context Summary]');
  lines.push(zh ? `当前阶段：${hint.stageId}（内部索引 ${hint.internalIndex + 1}/9）` : `Stage: ${hint.stageId} (${hint.internalIndex + 1}/9)`);
  lines.push(zh ? `AI 默认职责：${hint.contextHint}` : `AI default role: ${hint.contextHintEN}`);
  if (snap.selectedCountryCode || snap.hskLevel || snap.targetMajorId) {
    lines.push(
      zh
        ? `学生档案：国家=${snap.selectedCountryCode ?? '—'}；HSK=${snap.hskLevel ?? '—'}；目标专业=${snap.targetMajorId ?? '—'}`
        : `Profile: country=${snap.selectedCountryCode ?? '—'}; HSK=${snap.hskLevel ?? '—'}; major=${snap.targetMajorId ?? '—'}`,
    );
  }
  if (snap.selectedSubjects?.length) {
    lines.push(zh ? `关注科目：${snap.selectedSubjects.join(' / ')}` : `Subjects: ${snap.selectedSubjects.join(' / ')}`);
  }
  if (snap.knowledgeMap?.length) {
    const resolveStatus = (n: { status?: string | null; mastery?: number | null }): string => {
      if (n.status) return n.status;
      const m = typeof n.mastery === 'number' ? n.mastery : -1;
      if (m >= 80) return 'mastered';
      if (m >= 40) return 'needsReview';
      return 'weak';
    };
    const weak = snap.knowledgeMap.filter((n) => resolveStatus(n) === 'weak').length;
    const mid = snap.knowledgeMap.filter((n) => resolveStatus(n) === 'needsReview').length;
    const strong = snap.knowledgeMap.filter((n) => resolveStatus(n) === 'mastered').length;
    lines.push(
      zh
        ? `知识地图共 ${snap.knowledgeMap.length} 节点：需要掌握 ${weak} / 学习中 ${mid} / 已掌握 ${strong}`
        : `Knowledge map nodes ${snap.knowledgeMap.length}: weak=${weak} / learning=${mid} / mastered=${strong}`,
    );
  }
  if (snap.adaptiveExercises?.length) {
    lines.push(zh ? `训练题库可用 ${snap.adaptiveExercises.length} 题。` : `Training bank size=${snap.adaptiveExercises.length}.`);
  }
  if (snap.examResult?.score !== undefined) {
    lines.push(
      zh
        ? `最近试航成绩=${snap.examResult.score}`
        : `Latest trial score=${snap.examResult.score}`,
    );
  }
  if (snap.errorRecords?.length) {
    lines.push(zh ? `错题本大小=${snap.errorRecords.length}。` : `Error book size=${snap.errorRecords.length}.`);
  }
  if ((snap.studyPlan as any)?.weeks?.length || (snap.studyPlan as any)?.dailySchedule?.length) {
    lines.push(zh ? `已存在学习航程计划。` : `Personal voyage route exists.`);
  }
  lines.push(
    zh
      ? '请用「航海 / 航程」隐喻，但**禁止**使用：宝藏、船长、海盗、金币、等级、经验值、闯关、Boss、任务奖励、提督、幕僚、大捷、横扫千军等游戏或官职语言。回答保持专业、学术、克制。'
      : 'Use the maritime voyage metaphor. AVOID: treasure/captain/pirate/coins/level/XP/quest/boss/reward/admiral/bureaucrat. Keep tone academic, premium, calm.',
  );
  return lines.join('\n');
}

/* =======================================================================
 * 6) getVoyageNextStep — 观星测运 / 修正航向底部的「下一步应该做什么」
 * ======================================================================= */
export function getVoyageNextStep(
  currentStepKey: string | null | undefined,
  snap: AIMateSessionSnapshot,
  locale?: string | null,
): { title: string; subTitle: string; anchor: string } {
  const zh = !locale || locale.startsWith('zh');
  const idx = getCurrentStageIndex(currentStepKey ?? null);

  const go = (zhTitle: string, enTitle: string, zhSub: string, enSub: string, hash: string) => ({
    title: zh ? zhTitle : enTitle,
    subTitle: zh ? zhSub : enSub,
    anchor: `/csca#${hash}`,
  });

  // 若没有试航成绩，统一拉去试航
  if (snap.examResult?.score === undefined || snap.examResult?.score === null) {
    if (idx <= 2) {
      return go(
        '先完成一次低压试航演练',
        'Run a practice trial first',
        '熟悉题型与时间，再进入正式试航。',
        'Build pacing muscle in practice trial before the official one.',
        'mock-exam',
      );
    }
    return go(
      '进入正式试航（模拟考试）',
      'Enter the official mock trial',
      '得到完整成绩后，观星测运与修正航向才能给出真实差距。',
      'Observation & correction require a full score first.',
      'mock-exam',
    );
  }

  // 若错题本为空但成绩低于 60% → 先修正
  const score = Number(snap.examResult.score) || 0;
  const errorSize = snap.errorRecords?.length ?? 0;
  if (score < 60 && errorSize === 0) {
    return go(
      '进入错题修正阶段',
      'Open Correction Route',
      '把本次试航中的错误先修正，再进入下一航程。',
      'Close the loop on this trial’s mistakes before the next route.',
      'error-review',
    );
  }
  // 如果已有 StudyPlan → 去学习航程
  if (snap.studyPlan && ((snap.studyPlan as any).weeks?.length || (snap.studyPlan as any).dailySchedule?.length)) {
    return go(
      '按本周航程继续学习',
      'Follow this week’s voyage route',
      '每天一步，稳定接近目标。',
      'A steady day-by-day route toward the goal.',
      'study-plan',
    );
  }
  // 否则按顺序推荐下一段
  const route = [
    { hash: 'adaptive-learning', zh: '回到演武操练继续训练', en: 'Return to Training Ground' },
    { hash: 'error-review', zh: '进入错题修正（形成闭环）', en: 'Open Correction Route (close the loop)' },
    { hash: 'study-plan', zh: '生成你的学习航程计划', en: 'Generate your voyage route' },
    { hash: 'university-match', zh: '到达港口：查看院校匹配', en: 'Arrive at University Port' },
  ];
  const pick = route[Math.min(route.length - 1, Math.max(0, idx - 2))];
  return go(
    pick.zh,
    pick.en,
    zh ? '基于当前能力差距给出的下一建议。' : 'Recommended based on your current ability gap.',
    pick.zh,
    pick.hash,
  );
}

/* =======================================================================
 * 7) getWeeklyRoutePlan — 本周航程视图（Day01..Day07）
 * ======================================================================= */
export type WeeklyRouteDay = {
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string; // Day 01
  subject: string; // 主题
  focus: string; // 说明
  fromPlan: boolean; // 是否来自真实 studyPlan
};

const _FALLBACK_SUBJECT_POOL = [
  { s: '基础汉语', en: 'Basic Chinese' },
  { s: '数学', en: 'Mathematics' },
  { s: '物理', en: 'Physics' },
  { s: '化学', en: 'Chemistry' },
  { s: '英语', en: 'English' },
  { s: '综合训练', en: 'Mixed review' },
  { s: '复习与休息', en: 'Review + Rest' },
];

export function getWeeklyRoutePlan(
  plan: StudyPlan | null | undefined,
  opts: { locale?: string | null; selectedSubjects?: string[] } = {},
): WeeklyRouteDay[] {
  const zh = !opts.locale || opts.locale.startsWith('zh');
  const subjects = opts.selectedSubjects?.filter(Boolean) ?? [];

  // 优先：StudyPlan.weeks[0].days
  const realDays = (plan as any)?.weeks?.[0]?.days as
    | Array<{ subject?: string; focus?: string; topics?: string[] }>
    | undefined;

  if (realDays?.length) {
    return realDays.slice(0, 7).map((d, i) => ({
      index: (i + 1) as WeeklyRouteDay['index'],
      label: `Day ${String(i + 1).padStart(2, '0')}`,
      subject: d.subject || (zh ? '综合训练' : 'Mixed review'),
      focus:
        d.focus ||
        (d.topics?.length
          ? (zh ? `主题：${d.topics.slice(0, 2).join(' · ')}` : `Topics: ${d.topics.slice(0, 2).join(' · ')}`)
          : (zh ? '按既有学习航程执行' : 'Follow existing route')),
      fromPlan: true,
    }));
  }

  // 次优先：StudyPlan.dailySchedule
  const daily = (plan as any)?.dailySchedule as Array<{ subject?: string; focus?: string }> | undefined;
  if (daily?.length) {
    return daily.slice(0, 7).map((d, i) => ({
      index: (i + 1) as WeeklyRouteDay['index'],
      label: `Day ${String(i + 1).padStart(2, '0')}`,
      subject: d.subject || (zh ? '综合训练' : 'Mixed review'),
      focus: d.focus || (zh ? '按既有日程执行' : 'Follow the scheduled plan'),
      fromPlan: true,
    }));
  }

  // 兜底：基于诊断科目 6 天 + 1 天综合/休息。显式标记「推荐待确认」。
  const pool: { s: string; en: string }[] = [];
  subjects.forEach((s) => pool.push({ s, en: s }));
  if (pool.length < 6) {
    _FALLBACK_SUBJECT_POOL.forEach((p) => {
      if (!pool.some((x) => x.s === p.s || x.s === p.en)) pool.push(p);
    });
  }
  const finalPool = pool.slice(0, 6).concat([{ s: '综合训练 · 复习与休息', en: 'Mixed review + Rest' }]);
  return finalPool.slice(0, 7).map((x, i) => ({
    index: (i + 1) as WeeklyRouteDay['index'],
    label: `Day ${String(i + 1).padStart(2, '0')}`,
    subject: zh ? x.s : x.en,
    focus: zh
      ? '基于诊断的推荐航程（保存个性化计划后自动替换）'
      : 'Diagnosis-based recommendation; replaced once personalized route saved.',
    fromPlan: false,
  }));
}

/* =======================================================================
 * 8) getCorrectionLoop — 错题 5 段闭环
 * ======================================================================= */
export type CorrectionLoopStep = {
  index: 1 | 2 | 3 | 4 | 5;
  code: string; // 01..05
  eyebrow: string;
  eyebrowEN: string;
  title: string;
  titleEN: string;
  description: string;
  descriptionEN: string;
  status: 'ready' | 'pending' | 'done' | 'todo';
  metrics?: { zh: string; en: string; value: string }[];
};

export function getCorrectionLoop(
  errorRecords: ReadonlyArray<unknown> | null | undefined,
  examResult: Partial<ExamResult> | null | undefined,
  snap: AIMateSessionSnapshot,
  opts: { locale?: string | null } = {},
): CorrectionLoopStep[] {
  const zh = !opts.locale || opts.locale.startsWith('zh');
  const total = errorRecords?.length ?? 0;
  const hasExam = !!examResult && examResult.score !== undefined;
  const score = hasExam ? Number(examResult!.score) : 0;

  const analysis = snap.scoreAnalysis;
  const causes = (analysis as any)?.errorCauses as
    | Array<{ name: string; nameEn?: string; count?: number; percent?: number }>
    | undefined;

  const trainingRecommended =
    ((analysis as any)?.recommendedTopics as Array<{ subject?: string; topic?: string }>) ?? [];

  const steps: CorrectionLoopStep[] = [
    {
      index: 1,
      code: '01',
      eyebrow: '找错',
      eyebrowEN: 'FIND',
      title: zh ? '定位错误' : 'Locate Errors',
      titleEN: 'Locate Errors',
      description: zh ? '汇总最近试航中的全部错题。' : 'Aggregate every error from the latest trial voyage.',
      descriptionEN: 'Aggregate every error from the latest trial voyage.',
      status: hasExam || total > 0 ? (total > 0 ? 'done' : 'ready') : 'pending',
      metrics: [
        {
          zh: '错题总数',
          en: 'Total errors',
          value: total > 0 ? String(total) : (zh ? '待试航解锁' : 'After trial voyage'),
        },
      ],
    },
    {
      index: 2,
      code: '02',
      eyebrow: '分析',
      eyebrowEN: 'WHY',
      title: zh ? '归因分析' : 'Cause Analysis',
      titleEN: 'Cause Analysis',
      description: zh
        ? '分类：概念不清 / 公式记忆 / 计算失误 / 审题错误。'
        : 'Classify: concept / formula / computation / reading mistake.',
      descriptionEN: 'Classify: concept / formula / computation / reading mistake.',
      status: causes?.length ? 'ready' : total > 0 ? 'todo' : 'pending',
      metrics: causes?.length
        ? causes.slice(0, 3).map((c) => ({
            zh: c.name,
            en: c.nameEn ?? c.name,
            value: `${c.count ?? '—'}${c.percent ? ` (${c.percent}%)` : ''}`,
          }))
        : undefined,
    },
    {
      index: 3,
      code: '03',
      eyebrow: '推荐',
      eyebrowEN: 'TRAIN',
      title: zh ? '推荐训练' : 'Targeted Training',
      titleEN: 'Targeted Training',
      description: zh ? '针对高频原因，给出下一阶段训练题与知识图谱回补节点。' : 'Drills + chart nodes for high-freq causes.',
      descriptionEN: 'Drills + chart nodes for high-freq causes.',
      status: trainingRecommended.length > 0 ? 'ready' : total > 0 ? 'todo' : 'pending',
      metrics: trainingRecommended.length
        ? [
            {
              zh: '推荐主题数',
              en: 'Topics',
              value: String(trainingRecommended.length),
            },
          ]
        : undefined,
    },
    {
      index: 4,
      code: '04',
      eyebrow: '再测',
      eyebrowEN: 'RETEST',
      title: zh ? '再次测试' : 'Retest',
      titleEN: 'Retest',
      description: zh ? '完成训练后，再做一次低压试航验证修正是否有效。' : 'After training, run a practice trial to verify correction works.',
      descriptionEN: 'After training, run a practice trial to verify correction works.',
      status: total === 0 ? 'pending' : hasExam && score >= 80 ? 'done' : 'todo',
    },
    {
      index: 5,
      code: '05',
      eyebrow: '结果',
      eyebrowEN: 'OUTCOME',
      title: zh ? '闭环结果' : 'Closed-Loop Outcome',
      titleEN: 'Closed-Loop Outcome',
      description: zh
        ? '对比两次试航的总分、分项差距与能力提升值。'
        : 'Compare scores, subject gaps & ability deltas across two trials.',
      descriptionEN: 'Compare scores, subject gaps & ability deltas across two trials.',
      status: hasExam ? 'ready' : 'pending',
      metrics: hasExam
        ? [
            { zh: '当前成绩', en: 'Current score', value: String(score) },
            {
              zh: '目标区间',
              en: 'Target range',
              value: score >= 80 ? (zh ? '已达' : 'On target') : (zh ? '≥80' : '≥80'),
            },
          ]
        : undefined,
    },
  ];

  return steps;
}

/* =======================================================================
 * 9) 能力表（观星测运）合成：当前水平 / 目标水平 / 差距
 * ======================================================================= */
export type AbilityRow = {
  subject: string;
  subjectEn: string;
  current: number | null; // 百分制
  target: number; // 百分制
  gap: number | null; // target - current
  tone: 'success' | 'warn' | 'error' | 'pending';
};

const _DEFAULT_SUBJECTS = [
  { zh: '基础汉语', en: 'Basic Chinese' },
  { zh: '数学', en: 'Mathematics' },
  { zh: '物理', en: 'Physics' },
  { zh: '化学', en: 'Chemistry' },
  { zh: '英语', en: 'English' },
];

export function buildAbilityTable(
  examResult: Partial<ExamResult> | null | undefined,
  scoreAnalysis: Partial<ScoreAnalysisResult> | null | undefined,
  selectedSubjects: string[] = [],
): AbilityRow[] {
  const breakdown = (examResult as any)?.breakdown as Record<string, number> | undefined;
  const subjectScores = (scoreAnalysis as any)?.subjectScores as Record<string, number> | undefined;

  const list = selectedSubjects.length
    ? selectedSubjects.map((s) => ({ zh: s, en: s }))
    : _DEFAULT_SUBJECTS;

  return list.map((s) => {
    const rawCurr =
      (breakdown ? Number(breakdown[s.zh] ?? breakdown[s.en]) : NaN) ||
      (subjectScores ? Number(subjectScores[s.zh] ?? subjectScores[s.en]) : NaN);
    const current = Number.isFinite(rawCurr) ? Math.max(0, Math.min(100, rawCurr)) : null;
    const target = 80; // 默认目标（不动后端，只在 UI 显示）
    const gap = current === null ? null : Math.max(-100, Math.min(100, target - current));
    const tone =
      current === null
        ? 'pending'
        : current >= target
          ? 'success'
          : current >= target - 15
            ? 'warn'
            : 'error';
    return { subject: s.zh, subjectEn: s.en, current, target, gap, tone };
  });
}

/* =======================================================================
 * 10) 小工具：禁止词扫描（用于开发 / CI）
 * ======================================================================= */
export function findBlacklisted(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const w of VOYAGE_BLACKLISTED_WORDS) {
    if (text.includes(w)) out.push(w);
  }
  return out;
}

/* 供 Sidebar / Ribbon / Hero 复用的 8+1 桥接：
 * 把内部 stage 索引映射到首页 8 段；stage8(AI Mate) 自动并到 stage9(抵达) 展示。*/
export function homeStopFromInternalStageIndex(i: number): LearningVoyageStop | undefined {
  return (
    LEARNING_VOYAGE_8_STOPS.find((s) => s.internalStageIndex === i) ??
    (i === 7 ? LEARNING_VOYAGE_8_STOPS[7] : undefined)
  );
}

/* Compat: STEP_TO_STAGE 别名（保证新旧 key 都能命中 brand-logic 调用点） */
export const BRAND_STEP_TO_STAGE: Record<string, number> = { ...STEP_TO_STAGE };
