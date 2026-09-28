import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, string> = {};
const localStorageStub = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() {
    return Object.keys(store).length;
  },
};

vi.stubGlobal('localStorage', localStorageStub);
vi.stubGlobal('window', { localStorage: localStorageStub });

import {
  completeStage,
  emptyProgress,
  getVoyageProgress,
  restartVoyage,
  setCurrentStage,
} from '@/lib/voyage-progress';
import { saveCscaSession, loadCscaSession } from '@/lib/csca/session';

/** 该文件此前零测试覆盖 —— P3.5-B 让 step key 成为承载物，故补齐。 */

function seedSession(data: Record<string, unknown> = {}) {
  saveCscaSession({
    currentStep: 'diagnosis',
    activeStep: 0,
    completedStages: [],
    answerHistory: [],
    ...data,
  });
}

function currentStep(): string | undefined {
  return loadCscaSession()?.currentStep;
}

beforeEach(() => {
  localStorageStub.clear();
});

describe('getVoyageProgress', () => {
  it('新用户（无 session）→ 空进度，0/9', () => {
    const p = getVoyageProgress();
    expect(p).toEqual(emptyProgress());
    expect(p.completedCount).toBe(0);
    expect(p.progressPercent).toBe(0);
    expect(p.totalStages).toBe(9);
  });

  it('读取 completedStages，过滤越界与重复值', () => {
    seedSession({ completedStages: [0, 1, 1, 9, -2, 3] });
    const p = getVoyageProgress();
    expect(p.completedStages).toEqual([0, 1, 3]);
    expect(p.completedCount).toBe(3);
    expect(p.progressPercent).toBe(33);
  });

  it('历史别名 exam-analysis 仍能解析为 stage 4（读取端保持兼容）', () => {
    seedSession({ currentStep: 'exam-analysis' });
    expect(getVoyageProgress().currentStage).toBe(4);
  });
});

describe('completeStage', () => {
  it('标记后 completedStages 幂等增长', () => {
    seedSession();
    completeStage(2);
    completeStage(2);
    expect(getVoyageProgress().completedStages).toEqual([2]);
    expect(getVoyageProgress().progressPercent).toBe(11);
  });

  it('REG 回归锁：不传 opts 时写入规范 key，不再是历史的 exam-analysis', () => {
    // 修复前：reverseMapStageToStep 按 Object.entries 插入序遍历，
    // 'exam-analysis' 排在 result 之前 → completeStage(3) 会写进非法 step key。
    seedSession({ currentStep: 'mock-exam' });
    completeStage(3);
    expect(currentStep()).toBe('result');
    expect(currentStep()).not.toBe('exam-analysis');
  });

  it('不传 opts 时保持历史行为（stage n → 规范 key(n+1)）', () => {
    const expected = [
      [0, 'knowledge_map'],
      [1, 'adaptive_learning'],
      [2, 'exam_center'],
      [3, 'result'],
      [4, 'error_review'],
      [5, 'study_plan'],
      [6, 'ai_tutor'],
      [7, 'university_match'],
    ] as const;
    for (const [stage, step] of expected) {
      localStorageStub.clear();
      seedSession();
      completeStage(stage);
      expect(currentStep()).toBe(step);
    }
  });

  it('opts.nextStepKey 覆盖默认推进（推进改由决策层决定）', () => {
    seedSession();
    completeStage(4, { nextStepKey: 'study_plan' });
    expect(currentStep()).toBe('study_plan');
    expect(getVoyageProgress().completedStages).toEqual([4]);
  });

  it('非法 nextStepKey 被忽略，退回默认推进', () => {
    seedSession();
    completeStage(4, { nextStepKey: 'not-a-step' });
    expect(currentStep()).toBe('error_review');
  });

  it('越界 stageIndex 是 no-op', () => {
    seedSession();
    completeStage(-1);
    completeStage(9);
    expect(getVoyageProgress().completedStages).toEqual([]);
    expect(currentStep()).toBe('diagnosis');
  });

  it('无 session 时 no-op，不创建 session', () => {
    completeStage(3);
    expect(loadCscaSession()).toBeNull();
  });

  it('progressPercent 只增不减（决策式推进跳过阶段也不会回退）', () => {
    seedSession();
    completeStage(2, { nextStepKey: 'university_match' });
    const a = getVoyageProgress().progressPercent;
    completeStage(8, { nextStepKey: 'study_plan' });
    const b = getVoyageProgress().progressPercent;
    expect(b).toBeGreaterThanOrEqual(a);
  });
});

describe('setCurrentStage', () => {
  it('只改 currentStep，不标记完成', () => {
    seedSession();
    setCurrentStage(6);
    expect(currentStep()).toBe('study_plan');
    expect(getVoyageProgress().completedStages).toEqual([]);
  });

  it('越界是 no-op', () => {
    seedSession();
    setCurrentStage(99);
    expect(currentStep()).toBe('diagnosis');
  });
});

describe('restartVoyage', () => {
  it('清空导航进度，但保留真实学习数据', () => {
    seedSession({
      completedStages: [0, 1, 2],
      currentStep: 'exam_center',
      answerHistory: [
        { questionId: 'q1', subject: '数学', isCorrect: true, mode: 'practice', timestamp: 1 },
      ],
      examScore: 88,
    });

    restartVoyage();

    const p = getVoyageProgress();
    expect(p.completedStages).toEqual([]);
    expect(p.progressPercent).toBe(0);
    expect(currentStep()).toBe('diagnosis');

    const s = loadCscaSession();
    expect(s?.examScore).toBe(88);
    expect(s?.answerHistory).toHaveLength(1);
  });
});
