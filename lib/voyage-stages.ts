'use client';

/**
 * Shared stage order & step → stage index mapping.
 * Mirrors VoyageNavigation deriveStageStates so progress/header stay consistent.
 */
export const VOYAGE_STAGE_ORDER = [
  'stage1', 'stage2', 'stage3', 'stage4',
  'stage5', 'stage6', 'stage7', 'stage8', 'stage9',
] as const;

export type VoyageStageId = typeof VOYAGE_STAGE_ORDER[number];

export const STEP_TO_STAGE: Record<string, number> = {
  diagnosis: 0,
  'knowledge-map': 1,
  knowledge_map: 1,
  'adaptive-learning': 2,
  adaptive_learning: 2,
  'mock-exam': 3,
  exam_center: 3,
  exam: 3,
  'exam-analysis': 4,
  result: 4,
  'error-review': 5,
  error_review: 5,
  'study-plan': 6,
  study_plan: 6,
  'ai-tutor': 7,
  ai_tutor: 7,
  'university-match': 8,
  university_match: 8,
};

/**
 * 阶段索引 → 规范 step key（0-8）。**反向映射的唯一权威，禁止在别处再写第二张表。**
 *
 * 为什么不从 STEP_TO_STAGE 反查：该表是「多对一」的别名表（'exam-analysis' / result 都指向 4，
 * 且按插入序 'exam-analysis' 在前），反查会拿到别名而非规范值 —— 历史上 real bug，
 * 详见 docs/release/P3.5_B_PERSONALIZED_VOYAGE_ENGINE.md。STEP_TO_STAGE 继续承担
 * 「任意 key → 阶段索引」的正向查询（含历史别名），本表承担「阶段索引 → 规范 key」的反向查询。
 */
export const STAGE_TO_CANONICAL_STEP: readonly string[] = [
  'diagnosis',        // 0
  'knowledge_map',    // 1
  'adaptive_learning',// 2
  'exam_center',      // 3
  'result',           // 4
  'error_review',     // 5
  'study_plan',       // 6
  'ai_tutor',         // 7
  'university_match', // 8
] as const;

export type VoyageStageStatus = 'done' | 'current' | 'unlocked' | 'locked';

/**
 * @deprecated 使用 lib/voyage-progress.ts 的 getVoyageProgress() 代替。
 * 此函数仅保留向后兼容；新代码不应直接调用。
 */
export function deriveVoyageStageStates(
  currentStepKey: string | null | undefined,
): Record<VoyageStageId, VoyageStageStatus> {
  const idx = currentStepKey ? (STEP_TO_STAGE[currentStepKey] ?? -1) : -1;
  const result = {} as Record<VoyageStageId, VoyageStageStatus>;
  // 安全 fallback：无 currentStepKey 时，不标记任何 done
  if (idx === -1) {
    for (let i = 0; i < VOYAGE_STAGE_ORDER.length; i++) {
      const s = VOYAGE_STAGE_ORDER[i];
      result[s] = i === 0 ? 'current' : (i === 1 ? 'unlocked' : 'locked');
    }
    return result;
  }
  // 有 currentStepKey 但不自动标记前面为 done
  for (let i = 0; i < VOYAGE_STAGE_ORDER.length; i++) {
    const s = VOYAGE_STAGE_ORDER[i];
    if (i === idx) {
      result[s] = 'current';
    } else if (i === idx + 1) {
      result[s] = 'unlocked';
    } else if (i === 0 && idx === 0) {
      result[s] = 'current';
    } else {
      result[s] = 'locked';
    }
  }
  return result;
}

export function getCurrentStageIndex(currentStepKey: string | null | undefined): number {
  if (!currentStepKey) return 0;
  return STEP_TO_STAGE[currentStepKey] ?? 0;
}
