import { describe, it, expect } from 'vitest';

import {
  buildStudentModel,
  resolveNextLearningAction,
  type StudentModel,
} from '@/lib/csca/personalized-voyage';

/**
 * P3.5-B 决策层测试（纯函数，不需要 storage stub）。
 *
 * 核心要证明的两件事：
 *   1. 阶梯每条规则在正确的信号下命中，且 basis 诚实（no_data vs derived）。
 *   2. 终止性：反复 resolve → 标记完成 → resolve，completedCount 严格增长、
 *      返回的阶段互不重复、必然收敛到 kind='done'，绝不自循环。
 */

/** 阶梯的最低通过态：定位已做，其余全空。规则 1 由此让位给后续规则。 */
function base(overrides: Partial<StudentModel> = {}): StudentModel {
  return {
    currentStage: 0,
    completedStages: [],
    hasDiagnosis: true,
    completedQuestionCount: 0,
    weakKnowledgePointCount: 0,
    errorRecordCount: 0,
    examScore: null,
    hasStudyPlan: false,
    ...overrides,
  };
}

describe('resolveNextLearningAction — 阶梯', () => {
  it('无定位 → 推荐定位（stage 0, basis no_data）', () => {
    const a = resolveNextLearningAction(base({ hasDiagnosis: false }));
    expect(a.kind).toBe('diagnosis');
    expect(a.stageIndex).toBe(0);
    expect(a.stepKey).toBe('diagnosis');
    expect(a.basis).toBe('no_data');
    expect(a.advancesProgress).toBe(true);
  });

  it('有薄弱知识点 → 推荐适应性练习（stage 2, basis derived）', () => {
    const a = resolveNextLearningAction(base({ weakKnowledgePointCount: 3 }));
    expect(a.kind).toBe('adaptive_learning');
    expect(a.stageIndex).toBe(2);
    expect(a.basis).toBe('derived');
    expect(a.signals).toContain('weakKnowledgePointCount=3');
  });

  it('无成绩 → 推荐试航演练（stage 3, basis no_data）', () => {
    const a = resolveNextLearningAction(base());
    expect(a.kind).toBe('mock_exam');
    expect(a.stageIndex).toBe(3);
    expect(a.stepKey).toBe('exam_center');
    expect(a.basis).toBe('no_data');
    expect(a.signals).toContain('examScore=none');
  });

  it('有成绩但未看分析 → 推荐成绩分析（stage 4）', () => {
    const a = resolveNextLearningAction(base({ examScore: 72 }));
    expect(a.kind).toBe('score_analysis');
    expect(a.stageIndex).toBe(4);
    expect(a.stepKey).toBe('result');
    expect(a.basis).toBe('derived');
  });

  it('有错题且未修正 → 推荐错题修正（stage 5）', () => {
    const a = resolveNextLearningAction(
      base({ examScore: 72, completedStages: [4], errorRecordCount: 7 }),
    );
    expect(a.kind).toBe('error_review');
    expect(a.stageIndex).toBe(5);
    expect(a.signals).toContain('errorRecordCount=7');
  });

  it('有计划待执行且未到计划阶段 → 推荐学习计划（stage 6）', () => {
    const a = resolveNextLearningAction(
      base({ examScore: 72, completedStages: [4], hasStudyPlan: true }),
    );
    expect(a.kind).toBe('study_plan');
    expect(a.stageIndex).toBe(6);
    expect(a.signals).toContain('hasStudyPlan=true');
  });

  it('无信号但阶段未完成 → 最终落到院校匹配 / AI 答疑', () => {
    const a = resolveNextLearningAction(base({ examScore: 72, completedStages: [4] }));
    expect(a.kind).toBe('university_match');
    expect(a.stageIndex).toBe(8);
  });

  it('九段全部完成 → kind=done 且不推进进度', () => {
    const a = resolveNextLearningAction(
      base({ examScore: 72, completedStages: [0, 1, 2, 3, 4, 5, 6, 7, 8] }),
    );
    expect(a.kind).toBe('done');
    expect(a.advancesProgress).toBe(false);
    expect(a.signals).toContain('allStagesComplete=true');
  });
});

describe('resolveNextLearningAction — 防打转（替换式推进的正确性核心）', () => {
  it('stage 5 已完成但错题仍在时，不再推荐 stage 5', () => {
    const model = base({
      examScore: 72,
      completedStages: [4, 5],
      errorRecordCount: 7, // 错题信号仍在 —— 若无闸门就会永远推荐 stage 5
    });
    const a = resolveNextLearningAction(model);
    expect(a.kind).not.toBe('error_review');
    expect(a.stageIndex).not.toBe(5);
  });

  it('返回的阶段必定不在 completedStages 中', () => {
    const cases: Partial<StudentModel>[] = [
      { hasDiagnosis: false },
      { weakKnowledgePointCount: 2 },
      {},
      { examScore: 60 },
      { examScore: 60, completedStages: [4], errorRecordCount: 3 },
      { examScore: 60, completedStages: [4], hasStudyPlan: true },
      { examScore: 60, completedStages: [4] },
      { examScore: 60, completedStages: [4, 8] },
      { examScore: 60, completedStages: [4, 8, 7] },
    ];
    for (const c of cases) {
      const m = base(c);
      const a = resolveNextLearningAction(m);
      if (a.kind !== 'done') {
        expect(m.completedStages).not.toContain(a.stageIndex);
      }
    }
  });

  it('迭代 resolve → 标记完成 → resolve：completedCount 严格增长并收敛到 done', () => {
    const completed: number[] = [];
    const seen: number[] = [];
    let reachedDone = false;

    // 上限 12 轮（9 阶段 + done + 余量），超限即视为打转
    for (let round = 0; round < 12; round++) {
      const before = completed.length;
      const a = resolveNextLearningAction(base({ completedStages: [...completed] }));
      if (a.kind === 'done') {
        reachedDone = true;
        break;
      }

      expect(completed).not.toContain(a.stageIndex); // 绝不重复推荐已完成阶段
      seen.push(a.stageIndex);
      completed.push(a.stageIndex);
      expect(completed.length).toBe(before + 1); // 每轮恰好推进一个阶段
    }

    expect(reachedDone).toBe(true);
    expect(new Set(seen).size).toBe(seen.length); // 无重复
    expect(completed.length).toBe(9); // 恰好覆盖九段
    expect([...completed].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('resolveNextLearningAction — 输出契约', () => {
  const ALL: StudentModel[] = [
    base({ hasDiagnosis: false }),
    base({ weakKnowledgePointCount: 1 }),
    base(),
    base({ examScore: 90 }),
    base({ examScore: 90, completedStages: [4], errorRecordCount: 2 }),
    base({ examScore: 90, completedStages: [4], hasStudyPlan: true }),
    base({ examScore: 90, completedStages: [0, 1, 2, 3, 4, 5, 6, 7, 8] }),
  ];

  it('href 的 hash 全部落在 CSCAVoyageApp 的 HASH_TO_STEP 白名单内（防死链）', () => {
    // 独立列出的白名单 —— 刻意不 import 组件，避免自证式断言
    const ALLOWED = new Set([
      '/csca/voyage#diagnosis',
      '/csca/voyage#knowledge-map',
      '/csca/voyage#adaptive-learning',
      '/csca/voyage#mock-exam',
      '/csca/voyage#score-analysis',
      '/csca/voyage#error-review',
      '/csca/voyage#study-plan',
      '/csca/voyage#university-match',
      '/csca-multi-agent', // stage 8 (ai_tutor) 落在 Agent 圆桌页，无 hash
    ]);
    for (const m of ALL) {
      expect(ALLOWED.has(resolveNextLearningAction(m).href)).toBe(true);
    }
  });

  it('stepKey 只产出规范的 Step 成员（stage 4 是 result，不是历史别名 exam-analysis）', () => {
    const CANONICAL = new Set([
      'diagnosis',
      'knowledge_map',
      'adaptive_learning',
      'exam_center',
      'result',
      'error_review',
      'study_plan',
      'ai_tutor',
      'university_match',
    ]);
    for (const m of ALL) {
      const a = resolveNextLearningAction(m);
      expect(CANONICAL.has(a.stepKey)).toBe(true);
    }
    expect(resolveNextLearningAction(base({ examScore: 90 })).stepKey).toBe('result');
  });

  it('title / reason 双语齐备且非空', () => {
    for (const m of ALL) {
      const a = resolveNextLearningAction(m);
      for (const lang of ['zh', 'en'] as const) {
        expect(a.title[lang].length).toBeGreaterThan(0);
        expect(a.reason[lang].length).toBeGreaterThan(0);
      }
    }
  });

  it('确定性：同输入两次调用深度相等', () => {
    for (const m of ALL) {
      expect(resolveNextLearningAction(m)).toEqual(resolveNextLearningAction(m));
    }
  });
});

describe('buildStudentModel — 禁止伪造', () => {
  it('空输入 → 全部为 0 / false / null，不假装有数据', () => {
    const m = buildStudentModel({});
    expect(m).toEqual({
      currentStage: 0,
      completedStages: [],
      hasDiagnosis: false,
      completedQuestionCount: 0,
      weakKnowledgePointCount: 0,
      errorRecordCount: 0,
      examScore: null,
      hasStudyPlan: false,
    });
  });

  it('从 answerHistory 派生统计与薄弱点（复用 learning-context 的纯函数）', () => {
    const history = [
      {
        questionId: 'q1',
        subject: '数学',
        knowledgePoint: '代数',
        isCorrect: false,
        mode: 'practice' as const,
        timestamp: 1,
      },
      {
        questionId: 'q2',
        subject: '数学',
        knowledgePoint: '代数',
        isCorrect: false,
        mode: 'practice' as const,
        timestamp: 2,
      },
      {
        questionId: 'q3',
        subject: '数学',
        knowledgePoint: '代数',
        isCorrect: false,
        mode: 'practice' as const,
        timestamp: 3,
      },
      {
        questionId: 'q4',
        subject: '数学',
        knowledgePoint: '几何',
        isCorrect: true,
        mode: 'practice' as const,
        timestamp: 4,
      },
    ];
    const m = buildStudentModel({ answerHistory: history });
    expect(m.completedQuestionCount).toBe(4);
    // 代数 3 题全错 → mastery 0 < 0.5 且样本 ≥3 → 计入薄弱
    // 几何 1 题 → 样本 < 3，诚实标注「数据不足」，不计入
    expect(m.weakKnowledgePointCount).toBe(1);
  });

  it('缺 examScore 时视同「没有成绩」，不会伪装成 0 分', () => {
    expect(buildStudentModel({}).examScore).toBeNull();
    expect(buildStudentModel({ examScore: 0 }).examScore).toBe(0); // 真实 0 分要保留
  });

  it('completedStages 排序且不修改入参', () => {
    const input = [5, 1, 3];
    const m = buildStudentModel({ completedStages: input });
    expect(m.completedStages).toEqual([1, 3, 5]);
    expect(input).toEqual([5, 1, 3]);
  });
});
