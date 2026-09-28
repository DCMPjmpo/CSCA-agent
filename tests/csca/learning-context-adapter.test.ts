import { describe, it, expect } from 'vitest';

import { computeAnswerStats, type AnswerRecord } from '@/lib/csca/learning-context';
import {
  buildLearningContext,
  parseAnswerHistory,
  parseKnowledgeMap,
  parseProgress,
  parseWeakKnowledgePoints,
  renderLearningContext,
  resolveCurrentStage,
} from '@/lib/csca/learning-context-adapter';

function rec(overrides: Partial<AnswerRecord> = {}): AnswerRecord {
  return {
    questionId: 'q1',
    subject: 'Math',
    knowledgePoint: 'Algebra',
    isCorrect: true,
    mode: 'practice',
    timestamp: 1,
    ...overrides,
  };
}

describe('parseAnswerHistory', () => {
  it('keeps well-formed records and preserves optional fields', () => {
    const out = parseAnswerHistory([rec({ difficulty: 'hard', module: 'M1', targetMajor: 'CS' })]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      questionId: 'q1',
      subject: 'Math',
      knowledgePoint: 'Algebra',
      isCorrect: true,
      mode: 'practice',
      difficulty: 'hard',
      module: 'M1',
      targetMajor: 'CS',
    });
  });

  it('drops records with malformed required fields (no coercion of isCorrect)', () => {
    const out = parseAnswerHistory([
      rec(),
      { ...rec(), questionId: '' }, // empty questionId
      { ...rec(), subject: 42 }, // non-string subject
      { ...rec(), isCorrect: 'true' }, // truthy string, not strict boolean
      { ...rec(), timestamp: NaN }, // non-finite timestamp
      null,
      'nope',
    ]);
    expect(out).toHaveLength(1);
  });

  it('ignores non-string knowledgePoint/module rather than stringifying them', () => {
    const out = parseAnswerHistory([{ ...rec(), knowledgePoint: { a: 1 }, module: ['x'] }]);
    expect(out[0].knowledgePoint).toBeUndefined();
    expect(out[0].module).toBeUndefined();
  });

  it('normalizes an invalid mode to practice (mode is inert downstream)', () => {
    const out = parseAnswerHistory([
      { ...rec(), mode: 'bogus' },
      { ...rec(), mode: undefined },
    ]);
    expect(out.map((r) => r.mode)).toEqual(['practice', 'practice']);
  });

  it('returns [] for a non-array input', () => {
    expect(parseAnswerHistory(undefined)).toEqual([]);
    expect(parseAnswerHistory({})).toEqual([]);
  });

  it('caps history at the last 500 records', () => {
    const many = Array.from({ length: 620 }, (_, i) => rec({ questionId: `q${i}`, timestamp: i }));
    const out = parseAnswerHistory(many);
    expect(out).toHaveLength(500);
    expect(out[0].questionId).toBe('q120'); // most recent 500 kept
  });
});

describe('buildLearningContext — server-side recomputation', () => {
  it('derives stats from raw history identically to computeAnswerStats (reuse, not reimplementation)', () => {
    const history = [
      rec({ isCorrect: true }),
      rec({ isCorrect: false }),
      rec({ isCorrect: true }),
      rec({ isCorrect: false }),
    ];
    const ctx = buildLearningContext({
      answerHistory: history,
      subjects: ['Math'],
      currentStage: 3,
    });
    const expected = computeAnswerStats(history);
    expect(ctx.completedQuestionCount).toBe(expected.completedQuestionCount);
    expect(ctx.correctQuestionCount).toBe(expected.correctQuestionCount);
    expect(ctx.wrongQuestionCount).toBe(expected.wrongQuestionCount);
    expect(ctx.recentAccuracy).toBe(expected.recentAccuracy);
  });

  it('extracts weak knowledge points from real answers (>=3 samples, mastery < 0.5)', () => {
    const history = [
      rec({ knowledgePoint: 'Algebra', isCorrect: false }),
      rec({ knowledgePoint: 'Algebra', isCorrect: false }),
      rec({ knowledgePoint: 'Algebra', isCorrect: true }),
      rec({ knowledgePoint: 'Geometry', isCorrect: true }),
      rec({ knowledgePoint: 'Geometry', isCorrect: true }),
      rec({ knowledgePoint: 'Geometry', isCorrect: true }),
    ];
    const ctx = buildLearningContext({ answerHistory: history });
    expect(ctx.weakKnowledgePoints).toEqual({ Math: ['Algebra'] });
  });

  it('produces no weak knowledge points for records lacking a knowledge point', () => {
    const history = [
      rec({ knowledgePoint: undefined, module: undefined, isCorrect: false }),
      rec({ knowledgePoint: undefined, module: undefined, isCorrect: false }),
      rec({ knowledgePoint: undefined, module: undefined, isCorrect: false }),
    ];
    const ctx = buildLearningContext({ answerHistory: history });
    expect(ctx.weakKnowledgePoints).toBeUndefined();
    expect(ctx.completedQuestionCount).toBe(3);
  });

  it('treats an empty-but-present history as zero, not as "no data provided"', () => {
    const ctx = buildLearningContext({ answerHistory: [] });
    expect(ctx.completedQuestionCount).toBe(0);
    expect(ctx.recentAccuracy).toBeUndefined();
  });
});

// The regression that matters most: enrichContextWithHistory falls back to `base`
// when its derivation is empty (learning-context.ts:215, :234, :236-237). If client
// aggregates ever reached `base`, they would leak straight through — exactly the
// "trust the client's self-report" behaviour this layer exists to remove.
describe('buildLearningContext — client-supplied aggregates are ignored (D1 regression)', () => {
  const forged = {
    completedQuestionCount: 999,
    correctQuestionCount: 999,
    wrongQuestionCount: 111,
    recentAccuracy: 0.99,
    weakKnowledgePoints: { Math: ['FORGED'] },
    currentAbility: { Math: 0.98 },
  };

  it('ignores forged aggregates when history is empty', () => {
    const ctx = buildLearningContext({ ...forged, answerHistory: [] });
    expect(ctx.completedQuestionCount).toBe(0);
    expect(ctx.wrongQuestionCount).toBe(0);
    expect(ctx.recentAccuracy).toBeUndefined();
    expect(ctx.weakKnowledgePoints).toBeUndefined();
    expect(ctx.currentAbility).toBeUndefined();
  });

  it('ignores forged aggregates when history is present', () => {
    const history = [rec({ isCorrect: true }), rec({ isCorrect: false })];
    const ctx = buildLearningContext({ ...forged, answerHistory: history });
    expect(ctx.completedQuestionCount).toBe(2);
    expect(ctx.wrongQuestionCount).toBe(1);
    expect(ctx.weakKnowledgePoints).toBeUndefined(); // 2 samples < 3 → no mastery, and NO fallback
    expect(ctx.currentAbility).toBeUndefined();
  });

  it('ignores forged aggregates when history is below the 3-sample mastery threshold', () => {
    const history = [
      rec({ knowledgePoint: 'Algebra', isCorrect: false }),
      rec({ knowledgePoint: 'Algebra', isCorrect: false }),
    ];
    const ctx = buildLearningContext({ ...forged, answerHistory: history });
    expect(ctx.weakKnowledgePoints).toBeUndefined();
    expect(ctx.currentAbility).toBeUndefined();
  });

  it('ignores client-supplied identity fields (server cannot verify identity)', () => {
    const ctx = buildLearningContext({
      answerHistory: [],
      userId: 'victim-1',
      studentId: 'victim-1',
      name: 'Someone Else',
      role: 'admin',
    });
    expect(JSON.stringify(ctx)).not.toContain('victim-1');
    expect(JSON.stringify(ctx)).not.toContain('Someone Else');
    expect(JSON.stringify(ctx)).not.toContain('admin');
  });
});

describe('parseKnowledgeMap', () => {
  it('keeps valid topics, clamps mastery, preserves a legal masterySource', () => {
    const out = parseKnowledgeMap([
      {
        id: 'k1',
        name: 'Algebra',
        subject: 'Math',
        description: 'd',
        mastery: 1.4,
        masterySource: 'real_answers',
      },
      { id: 'k2', name: 'Geometry', subject: 'Math', mastery: -0.3, masterySource: 'bogus' },
    ]);
    expect(out).toHaveLength(2);
    expect(out![0].mastery).toBe(1);
    expect(out![1].mastery).toBe(0);
    expect(out![0].masterySource).toBe('real_answers');
    expect(out![1].masterySource).toBeUndefined();
  });

  it('drops malformed entries and returns undefined when nothing survives', () => {
    expect(parseKnowledgeMap([{ id: 'k1' }, null, 'x'])).toBeUndefined();
    expect(parseKnowledgeMap('nope')).toBeUndefined();
  });
});

describe('parseProgress / parseWeakKnowledgePoints', () => {
  it('parses a valid VoyageProgressState subset', () => {
    const p = parseProgress({
      completedCount: 3,
      totalStages: 9,
      progressPercent: 33,
      currentStage: 2.7,
    });
    expect(p).toEqual({ completed: 3, total: 9, percentage: 33, currentStage: 2 });
  });

  it('returns undefined (not zero) for malformed progress', () => {
    expect(parseProgress({})).toBeUndefined();
    expect(parseProgress({ completedCount: 1 })).toBeUndefined();
    expect(parseProgress(null)).toBeUndefined();
  });

  it('validates weak knowledge point maps', () => {
    expect(parseWeakKnowledgePoints({ Math: ['A', 'B'], Bad: [] })).toEqual({ Math: ['A', 'B'] });
    expect(parseWeakKnowledgePoints({ Math: [1, 2] })).toBeUndefined();
  });
});

describe('resolveCurrentStage', () => {
  it('prefers the voyage-derived stage over the raw one (D7)', () => {
    expect(
      resolveCurrentStage({
        currentStage: 1,
        progress: { completedCount: 4, totalStages: 9, progressPercent: 44, currentStage: 4 },
      }),
    ).toBe(4);
  });

  it('falls back to the client stage, and to undefined when absent', () => {
    expect(resolveCurrentStage({ currentStage: 5 })).toBe(5);
    expect(resolveCurrentStage({})).toBeUndefined();
    expect(resolveCurrentStage({ currentStage: -1 })).toBeUndefined();
  });
});

describe('renderLearningContext', () => {
  it('does not fabricate a stage when none was provided (D3)', () => {
    const text = renderLearningContext(buildLearningContext({ answerHistory: [] }));
    expect(text).toContain('当前学习阶段：暂无数据');
    expect(text).not.toContain('S0');
  });

  it('renders the resolved stage and progress when provided', () => {
    const ctx = buildLearningContext({ answerHistory: [rec()] });
    const text = renderLearningContext(ctx, {
      stage: 3,
      progress: { completed: 4, total: 9, percentage: 44 },
    });
    expect(text).toContain('S3 演武（自适应训练）');
    expect(text).toContain('已完成 4/9 个航段（44%）');
    expect(text).toContain('已完成题目数：1');
  });

  it('reports "no data" rather than inventing mastery for a knowledge map without real answers', () => {
    const text = renderLearningContext(
      buildLearningContext({
        answerHistory: [],
        knowledgeMap: [
          {
            id: 'k1',
            name: 'Algebra',
            subject: 'Math',
            description: '',
            mastery: 0.9,
            masterySource: 'initial',
          },
        ],
      }),
    );
    expect(text).toContain('知识图谱：暂无真实答题数据，无法评估掌握度');
  });

  it('appends the brand narrative when present', () => {
    const text = renderLearningContext(buildLearningContext({ answerHistory: [] }), {
      voyageContext: '郑和航海',
    });
    expect(text).toContain('[品牌叙事摘要]\n郑和航海');
  });
});
