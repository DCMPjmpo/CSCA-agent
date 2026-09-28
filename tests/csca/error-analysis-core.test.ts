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
  analyzeWeakAreas,
  clearAllErrorRecords,
  generateStudyPlan,
  getErrorRecords,
  mergeErrorRecords,
  saveErrorRecords,
  saveStudyPlan,
  writeErrorRecords,
  type ErrorRecord,
  type UserAnswer,
} from '@/lib/csca/error-analysis-core';

const DAY_MS = 1000 * 60 * 60 * 24;

function makeAnswer(
  overrides: Omit<Partial<UserAnswer>, 'module'> & { module: string },
): UserAnswer {
  return {
    questionId: `q-${overrides.module}`,
    question: 'question',
    subject: overrides.subject ?? 'Math',
    userAnswer: 0,
    correctAnswer: 1,
    isCorrect: false,
    timestamp: 0,
    ...overrides,
  };
}

function makeRecord(questionId: string, overrides: Partial<ErrorRecord> = {}): ErrorRecord {
  return {
    id: `error-${questionId}`,
    questionId,
    question: 'question',
    subject: 'Math',
    module: 'Algebra',
    userAnswer: 0,
    correctAnswer: 1,
    timestamp: 0,
    reviewCount: 0,
    ...overrides,
  };
}

describe('analyzeWeakAreas', () => {
  it('groups by subject/module and computes accuracy + errorCount', () => {
    const answers = [
      makeAnswer({ module: 'Algebra', isCorrect: false }),
      makeAnswer({ module: 'Algebra', isCorrect: true }),
      makeAnswer({ module: 'Geometry', isCorrect: false }),
    ];
    const areas = analyzeWeakAreas(answers);

    expect(areas).toHaveLength(2);
    const algebra = areas.find((a) => a.module === 'Algebra');
    expect(algebra).toMatchObject({
      subject: 'Math',
      module: 'Algebra',
      errorCount: 1,
      accuracy: 0.5,
    });
  });

  it('assigns priority by accuracy threshold (high < 0.5, medium < 0.7, low otherwise)', () => {
    const answers = [
      makeAnswer({ module: 'M1', isCorrect: false }), // 0/1 → high
      makeAnswer({ module: 'M2', isCorrect: false }),
      makeAnswer({ module: 'M2', isCorrect: true }), // 1/2 → 0.5 medium
      makeAnswer({ module: 'M3', isCorrect: true }),
      makeAnswer({ module: 'M3', isCorrect: false }), // 1/2 → 0.5... make 3rd correct
      makeAnswer({ module: 'M3', isCorrect: true }), // 2/3 → 0.667 medium? <0.7
      makeAnswer({ module: 'M3', isCorrect: true }), // 3/4 → 0.75 low
    ];
    const areas = analyzeWeakAreas(answers);
    const byModule = Object.fromEntries(areas.map((a) => [a.module, a.priority]));
    expect(byModule.M1).toBe('high');
    expect(byModule.M2).toBe('medium');
    expect(byModule.M3).toBe('low');
  });

  it('ignores modules with zero errors and sorts high-priority first', () => {
    const answers = [
      makeAnswer({ module: 'Perfect', isCorrect: true }),
      makeAnswer({ module: 'OK', isCorrect: false }),
      makeAnswer({ module: 'OK', isCorrect: true }),
      makeAnswer({ module: 'Bad', isCorrect: false }),
      makeAnswer({ module: 'Bad', isCorrect: false }),
      makeAnswer({ module: 'Bad', isCorrect: true }),
    ];
    const areas = analyzeWeakAreas(answers);
    expect(areas.find((a) => a.module === 'Perfect')).toBeUndefined();
    expect(areas[0].module).toBe('Bad'); // 1/3 → high
    expect(areas[1].module).toBe('OK'); // 1/2 → medium
  });
});

describe('generateStudyPlan', () => {
  it('creates daily goals with review+practice tasks for high-priority weak areas', () => {
    const weakAreas = [
      {
        subject: 'Math',
        module: 'Algebra',
        errorCount: 3,
        accuracy: 0.2,
        priority: 'high' as const,
      },
      {
        subject: 'Math',
        module: 'Geometry',
        errorCount: 1,
        accuracy: 0.9,
        priority: 'low' as const,
      },
    ];
    const plan = generateStudyPlan('user-1', ['Math'], weakAreas);

    expect(plan.userId).toBe('user-1');
    expect(plan.targetSubjects).toEqual(['Math']);
    expect(plan.progress).toBe(0);
    expect(plan.weakAreas).toEqual(weakAreas);
    // 仅高优先级薄弱项生成每日任务
    expect(plan.dailyGoals).toHaveLength(1);
    expect(plan.dailyGoals[0].module).toBe('Algebra');
    const taskTypes = plan.dailyGoals[0].tasks.map((t) => t.type);
    expect(taskTypes).toEqual(['review', 'practice']);
  });

  it('generates one weekly goal per ~7 days up to exam date', () => {
    const examDate = new Date(Date.now() + 8 * DAY_MS);
    const plan = generateStudyPlan('user-1', ['Math', 'English'], [], examDate);

    expect(plan.weeklyGoals).toHaveLength(2); // ceil(8/7) = 2
    expect(plan.weeklyGoals[0].goals).toHaveLength(2); // 每个目标科目一个 goal
    expect(plan.weeklyGoals[1].weekNumber).toBe(2);
  });
});

describe('mergeErrorRecords', () => {
  it('appends new records with generated id + reviewCount 0', () => {
    const merged = mergeErrorRecords([], [{ ...makeRecord('q1'), timestamp: 1000 }], 1000);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toMatch(/^error-/);
    expect(merged[0].reviewCount).toBe(0);
    expect(merged[0].timestamp).toBe(1000);
  });

  it('increments reviewCount + updates lastReviewTime for duplicate questionId', () => {
    const existing = [{ ...makeRecord('q1'), reviewCount: 2 }];
    const merged = mergeErrorRecords(existing, [makeRecord('q1')], 5000);

    expect(merged).toHaveLength(1);
    expect(merged[0].reviewCount).toBe(3);
    expect(merged[0].lastReviewTime).toBe(5000);
  });

  it('preserves unrelated existing records while merging', () => {
    const existing = [makeRecord('old')];
    const merged = mergeErrorRecords(existing, [makeRecord('q2')], 1);

    expect(merged.map((r) => r.questionId)).toEqual(['old', 'q2']);
  });
});

describe('saveErrorRecords / getErrorRecords (localStorage)', () => {
  beforeEach(() => {
    localStorageStub.clear();
  });

  it('writes the merged result to localStorage and returns it', () => {
    saveErrorRecords([makeRecord('q1'), makeRecord('q2')]);
    const records = getErrorRecords();

    expect(records).toHaveLength(2);
    expect(records.map((r) => r.questionId).sort()).toEqual(['q1', 'q2']);
    // 一次读一次写：写入内容即最终记录
    expect(JSON.parse(store['csca_error_records'])).toHaveLength(2);
  });

  it('does not duplicate records across repeated batch writes (dedupe by questionId)', () => {
    saveErrorRecords([makeRecord('q1')]);
    saveErrorRecords([makeRecord('q1')]);
    const records = getErrorRecords();

    expect(records).toHaveLength(1);
    expect(records[0].reviewCount).toBe(1);
  });

  it('writeErrorRecords writes the exact array without re-merging by questionId', () => {
    // 已合并好的记录允许同 questionId 不同 id；writeErrorRecords 不应二次合并
    writeErrorRecords([
      { ...makeRecord('q1'), id: 'id-a' },
      { ...makeRecord('q1'), id: 'id-b' },
    ]);
    expect(getErrorRecords()).toHaveLength(2); // 原样写入（供 worker 使用，已合并好）
  });

  it('clearAllErrorRecords empties the store', () => {
    saveErrorRecords([makeRecord('q1')]);
    clearAllErrorRecords();
    expect(getErrorRecords()).toEqual([]);
    expect(saveStudyPlan).toBeDefined();
  });
});
