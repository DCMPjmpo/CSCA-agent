/**
 * 南洋海图沙盘进度推导（南洋出海局 · 批次 8）
 *
 * 从 localStorage（csca_learning_session / csca_study_plan）派生 8 据点的
 * 解锁/完成/当前位置，供首页沙盘做迷雾与航船叙事。纯视觉 —— 不写任何存储，
 * 8 据点恒可点击（迷雾仅外观）。
 */
import { loadCscaSession } from './session';
import { getStudyPlan } from './error-analysis-core';

export type OutpostId =
  | 'diagnosis'
  | 'knowledge-map'
  | 'adaptive-learning'
  | 'mock-exam'
  | 'score-analysis'
  | 'study-plan'
  | 'multi-agent'
  | 'classroom';

export interface OutpostProgress {
  id: OutpostId;
  unlocked: boolean;
  completed: boolean;
  isCurrent: boolean;
}

export interface SandboxProgress {
  outposts: Record<OutpostId, OutpostProgress>;
  /** 航线推进前缘：已完成的据点数（船停在此） */
  frontier: number;
  /** 已探明（完成）的航线据点数，用于「已探明 {n} 处航线」 */
  visitedCount: number;
}

/** 6 个航线据点的 route 顺序与 csca 步骤映射（stepIndex 见 /csca 页 STEPS） */
const ROUTE_OUTPOSTS: { id: OutpostId; stepIndex: number }[] = [
  { id: 'diagnosis', stepIndex: 0 },
  { id: 'knowledge-map', stepIndex: 1 },
  { id: 'adaptive-learning', stepIndex: 2 },
  { id: 'mock-exam', stepIndex: 3 },
  { id: 'score-analysis', stepIndex: 4 },
  { id: 'study-plan', stepIndex: 5 },
];

/** 初始快照（SSR / 新访客）。前 3 航线据点默认解锁（首页展示 3 解锁 + 3 未探索），
 *  幕僚厅/讲学堂恒解锁、无完成信号。船停起点（frontier=0）。 */
export function emptySandboxProgress(): SandboxProgress {
  const outposts = {} as Record<OutpostId, OutpostProgress>;
  for (const { id, stepIndex } of ROUTE_OUTPOSTS) {
    outposts[id] = {
      id,
      unlocked: stepIndex <= 2,
      completed: false,
      isCurrent: stepIndex === 0,
    };
  }
  outposts['multi-agent'] = { id: 'multi-agent', unlocked: true, completed: false, isCurrent: false };
  outposts['classroom'] = { id: 'classroom', unlocked: true, completed: false, isCurrent: false };
  return { outposts, frontier: 0, visitedCount: 0 };
}

export function deriveSandboxProgress(): SandboxProgress {
  if (typeof window === 'undefined') return emptySandboxProgress();

  const session = loadCscaSession();
  const plan = getStudyPlan();

  // 无任何进度 → 全雾态，船停起点
  if (!session && !plan) return emptySandboxProgress();

  const outposts = emptySandboxProgress().outposts;

  let frontier = 0;
  // 使用 completedStages 而非 activeStep 来推导 frontier
  const completedStages = Array.isArray((session as any)?.completedStages)
    ? (session as any).completedStages as number[]
    : [];
  if (completedStages.length > 0) {
    frontier = Math.max(0, Math.min(5, Math.max(...completedStages)));
  }
  if (session && typeof session.examScore === 'number') frontier = Math.max(frontier, 4);
  if (plan) frontier = Math.max(frontier, 5);

  for (const { id, stepIndex } of ROUTE_OUTPOSTS) {
    const prog = outposts[id];
    if (stepIndex < frontier) {
      prog.unlocked = true;
      prog.completed = true;
      prog.isCurrent = false;
    } else if (stepIndex === frontier) {
      prog.unlocked = true;
      prog.isCurrent = true;
    } else {
      // stepIndex > frontier → 未探索（前 3 默认解锁的设定仅对新访客有效）
      prog.unlocked = false;
      prog.isCurrent = false;
    }
  }

  const visitedCount = ROUTE_OUTPOSTS.filter(({ stepIndex }) => stepIndex < frontier).length;

  return { outposts, frontier, visitedCount };
}
