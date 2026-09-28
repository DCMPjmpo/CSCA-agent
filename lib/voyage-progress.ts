/**
 * lib/voyage-progress.ts
 *
 * 唯一可信的「学习航程进度」状态源。
 * 所有 UI 必须从 getVoyageProgress() 读取，禁止各自计算。
 *
 * 核心原则：
 *   - currentStage（当前所在阶段）≠ completedStages（已完成阶段）
 *   - 进入页面 ≠ 完成阶段
 *   - 新用户 = 0/9, 0%, Stage 01
 *   - progressPercent = Math.round(completedCount / totalStages * 100)
 */
import { loadCscaSession, saveCscaSession } from '@/lib/csca/session';
import {
  STAGE_TO_CANONICAL_STEP,
  STEP_TO_STAGE,
  VOYAGE_STAGE_ORDER,
  type VoyageStageId,
} from '@/lib/voyage-stages';

/** 带 completedStages 字段的 session 形态（用于读取） */
interface SessionWithProgress {
  currentStep?: string;
  completedStages?: unknown;
}

export type VoyageStageStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface VoyageProgressState {
  /** 当前所在阶段索引 0-8 */
  currentStage: number;
  /** 已完成阶段索引列表 */
  completedStages: number[];
  /** 每个阶段的实时状态 */
  stageStatus: Record<VoyageStageId, VoyageStageStatus>;
  /** 已完成阶段数 */
  completedCount: number;
  /** 总阶段数 = 9 */
  totalStages: number;
  /** 完成百分比 0-100 */
  progressPercent: number;
  /** 数据来源：localStorage / none（新用户） */
  storageSource: 'localStorage' | 'none';
  /** 是否 demo 模式 */
  demoMode: boolean;
}

const TOTAL = VOYAGE_STAGE_ORDER.length; // 9

/**
 * 从 localStorage 读取真实进度状态。
 * 新用户（无数据）返回全零状态。
 */
export function getVoyageProgress(): VoyageProgressState {
  if (typeof window === 'undefined') {
    return emptyProgress();
  }

  const session = loadCscaSession() as SessionWithProgress | null;
  if (!session) {
    return emptyProgress();
  }

  // 从 session 中读取 completedStages（新字段），做安全校验
  let completedStages: number[] = [];
  if (Array.isArray(session.completedStages)) {
    completedStages = Array.from(
      new Set(
        (session.completedStages as unknown[])
          .filter((n: unknown): n is number => typeof n === 'number' && n >= 0 && n < TOTAL)
      ),
    ).sort((a, b) => a - b);
  }

  // currentStage 从 currentStep 派生，但只用于"当前阶段"展示
  const currentStep = typeof session.currentStep === 'string' ? session.currentStep : null;
  const currentStage = currentStep ? (STEP_TO_STAGE[currentStep] ?? 0) : 0;

  const completedCount = completedStages.length;
  const progressPercent = Math.round((completedCount / TOTAL) * 100);

  return {
    currentStage,
    completedStages,
    stageStatus: deriveStageStatuss(completedStages, currentStage),
    completedCount,
    totalStages: TOTAL,
    progressPercent,
    storageSource: 'localStorage',
    demoMode: false,
  };
}

/**
 * 新用户的空状态。
 */
export function emptyProgress(): VoyageProgressState {
  return {
    currentStage: 0,
    completedStages: [],
    stageStatus: deriveStageStatuss([], 0),
    completedCount: 0,
    totalStages: TOTAL,
    progressPercent: 0,
    storageSource: 'none',
    demoMode: false,
  };
}

/**
 * 根据已完成阶段和当前阶段推导每个阶段的状态。
 *
 * 规则：
 *   - completedStages 中的 → 'completed'
 *   - currentStage 且不在 completedStages 中 → 'in_progress'
 *   - currentStage + 1（下一阶段）且 currentStage 已完成 → 'available'
 *   - 其他 → 'locked'
 *   - 如果没有任何完成记录，Stage 01 = 'in_progress'，Stage 02 = 'available'，其余 locked
 */
function deriveStageStatuss(
  completedStages: number[],
  currentStage: number,
): Record<VoyageStageId, VoyageStageStatus> {
  const result = {} as Record<VoyageStageId, VoyageStageStatus>;
  const completedSet = new Set(completedStages);

  for (let i = 0; i < VOYAGE_STAGE_ORDER.length; i++) {
    const sid = VOYAGE_STAGE_ORDER[i];
    if (completedSet.has(i)) {
      result[sid] = 'completed';
    } else if (i === currentStage) {
      result[sid] = 'in_progress';
    } else if (i === currentStage + 1 && completedSet.has(currentStage)) {
      // 下一阶段，仅当当前阶段已完成时才 available
      result[sid] = 'available';
    } else if (completedStages.length === 0 && i === 1) {
      // 新用户：Stage 02 默认 available（允许预览）
      result[sid] = 'available';
    } else {
      result[sid] = 'locked';
    }
  }

  return result;
}

/**
 * 标记某阶段为已完成。
 * 幂等：重复标记同一阶段不会增加计数。
 *
 * @param opts.nextStepKey P3.5-B：下一站由调用方（决策层 resolveNextLearningAction）决定。
 *   不传时保持历史行为（idx+1）。传入的 key 必须是 STEP_TO_STAGE 认识的值，否则忽略并退回默认，
 *   杜绝再写进 'exam-analysis' 这类不在 Step 联合类型里的死值。
 */
export function completeStage(stageIndex: number, opts?: { nextStepKey?: string }): void {
  if (stageIndex < 0 || stageIndex >= TOTAL) return;
  const session = loadCscaSession() as SessionWithProgress | null;
  if (!session) return;

  const existing = Array.isArray(session.completedStages) ? (session.completedStages as number[]) : [];
  let completedStages: number[] = existing;

  if (!completedStages.includes(stageIndex)) {
    completedStages = [...completedStages, stageIndex].sort((a, b) => a - b);
    saveCscaSession({ completedStages });
  }

  // 自动推进 currentStage 到下一未完成阶段
  const overrideKey = opts?.nextStepKey;
  const nextStepKey =
    overrideKey && STEP_TO_STAGE[overrideKey] !== undefined
      ? overrideKey
      : reverseMapStageToStep(Math.min(stageIndex + 1, TOTAL - 1));
  if (nextStepKey && nextStepKey !== session.currentStep) {
    saveCscaSession({ currentStep: nextStepKey });
  }
}

/**
 * 设置当前阶段（仅改变 currentStage，不标记完成）。
 */
export function setCurrentStage(stageIndex: number): void {
  if (stageIndex < 0 || stageIndex >= TOTAL) return;
  const stepKey = reverseMapStageToStep(stageIndex);
  if (stepKey) {
    saveCscaSession({ currentStep: stepKey });
  }
}

/**
 * 反向映射：stage index → 规范 step key。
 *
 * 读 STAGE_TO_CANONICAL_STEP 而非遍历 STEP_TO_STAGE —— 后者是含别名的多对一表，
 * 按插入序遍历会返回 'exam-analysis'（非法 step key）而不是 'result'，见 voyage-stages.ts 的注释。
 */
function reverseMapStageToStep(stageIndex: number): string | null {
  return STAGE_TO_CANONICAL_STEP[stageIndex] ?? null;
}

/**
 * 重新开始航程 — 只重置 9 段航程导航进度，保留所有真实学习数据。
 *
 * 重置字段：
 *   - currentStep -> 'diagnosis'（Stage 01）
 *   - activeStep -> 0
 *   - completedStages -> []
 *
 * 保留字段（不受影响）：
 *   - answerHistory（答题历史）
 *   - diagnosisResult（诊断结果）
 *   - selectedSubjects / selectedCountryCode / targetMajorId / hskLevel
 *   - examScore（考试成绩）
 *   - locale / updatedAt（由 saveCscaSession 自动更新）
 *
 * saveCscaSession 内部 dispatch 'cscaSessionSaved' 事件，
 * useCscaSession 会自动重新读取进度并触发 UI 更新。
 */
export function restartVoyage(): void {
  if (typeof window === 'undefined') return;
  saveCscaSession({
    currentStep: 'diagnosis',
    activeStep: 0,
    completedStages: [] as number[],
  });
}

/**
 * 检查旧 localStorage 数据是否需要迁移。
 * 如果 completedStages 字段不存在但 currentStep 指向高阶段，
 * 不自动填充 completedStages（安全 fallback）。
 */
export function migrateIfNeeded(): void {
  if (typeof window === 'undefined') return;
  const session = loadCscaSession() as SessionWithProgress | null;
  if (!session) return;

  // 如果 completedStages 字段不存在，初始化为空数组
  if (!Array.isArray(session.completedStages)) {
    saveCscaSession({ completedStages: [] as number[] });
  }
}
