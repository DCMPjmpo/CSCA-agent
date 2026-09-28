import { describe, it, expect } from 'vitest';

import { gradeExam, type ExamQuestionLike } from '@/lib/csca/exam-scoring';
import type { ErrorRecord } from '@/lib/csca/error-analysis-core';

function makeQuestion(id: string, module: string, subject = 'Math'): ExamQuestionLike {
  return { id, question: `Question ${id}`, subject, module, correctAnswer: 1 };
}

function makeRecord(questionId: string, overrides: Partial<ErrorRecord> = {}): ErrorRecord {
  return {
    id: `error-${questionId}`,
    questionId,
    question: 'Question',
    subject: 'Math',
    module: 'Algebra',
    userAnswer: 0,
    correctAnswer: 1,
    timestamp: 0,
    reviewCount: 0,
    ...overrides,
  };
}

describe('gradeExam', () => {
  it('computes score, correctCount and rounded per-subject breakdown', () => {
    const questions = [
      makeQuestion('q1', 'Algebra', 'Math'),
      makeQuestion('q2', 'Algebra', 'Math'),
      makeQuestion('q3', 'Algebra', 'Math'),
      makeQuestion('q4', 'Grammar', 'English'),
    ];
    const result = gradeExam({
      examQuestions: questions,
      examAnswers: { q1: 1, q2: 1, q3: 0, q4: 1 }, // 3/4 correct
      selectedSubjects: ['Math', 'English'],
      existingErrorRecords: [],
      now: 1000,
    });

    expect(result.score).toBe(75);
    expect(result.correctCount).toBe(3);
    expect(result.breakdown.Math).toBe(67); // 2/3 → 66.67 → 67
    expect(result.breakdown.English).toBe(100);
  });

  it('collects wrong questions and marks unanswered as 未作答 / incorrect', () => {
    const questions = [makeQuestion('q1', 'Algebra'), makeQuestion('q2', 'Geometry')];
    const result = gradeExam({
      examQuestions: questions,
      examAnswers: { q1: 0 }, // q2 unanswered
      selectedSubjects: ['Math'],
      existingErrorRecords: [],
      now: 1000,
    });

    expect(result.wrongQuestions.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(result.userAnswers[1].userAnswer).toBe('未作答');
    expect(result.userAnswers[1].isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });

  it('merges error records, incrementing reviewCount for repeated questionIds', () => {
    const existing = [{ ...makeRecord('q1'), reviewCount: 2 }];
    const result = gradeExam({
      examQuestions: [makeQuestion('q1', 'Algebra'), makeQuestion('q2', 'Geometry')],
      examAnswers: { q1: 0, q2: 0 },
      selectedSubjects: ['Math'],
      existingErrorRecords: existing,
      now: 1000,
    });

    expect(result.errorRecords).toHaveLength(2);
    const repeated = result.errorRecords.find((r) => r.questionId === 'q1');
    expect(repeated?.reviewCount).toBe(3);
    expect(repeated?.lastReviewTime).toBe(1000);
    const fresh = result.errorRecords.find((r) => r.questionId === 'q2');
    expect(fresh?.reviewCount).toBe(0);
    expect(fresh?.id).toMatch(/^error-/);
  });

  it('derives weakAreas from wrong answers and bakes them into the study plan', () => {
    const questions = [
      makeQuestion('q1', 'Algebra', 'Math'),
      makeQuestion('q2', 'Algebra', 'Math'),
      makeQuestion('q3', 'Algebra', 'Math'),
    ];
    const result = gradeExam({
      examQuestions: questions,
      examAnswers: { q1: 0, q2: 0, q3: 0 }, // all wrong → Algebra high priority
      selectedSubjects: ['Math'],
      existingErrorRecords: [],
      now: 1000,
    });

    expect(result.weakAreas).toHaveLength(1);
    expect(result.weakAreas[0]).toMatchObject({
      subject: 'Math',
      module: 'Algebra',
      priority: 'high',
    });
    expect(result.studyPlan.userId).toBe('user-1');
    expect(result.studyPlan.targetSubjects).toEqual(['Math']);
    expect(result.studyPlan.weakAreas).toEqual(result.weakAreas);
    expect(result.studyPlan.dailyGoals.length).toBeGreaterThan(0);
  });

  it('handles empty question list without crashing', () => {
    const result = gradeExam({
      examQuestions: [],
      examAnswers: {},
      selectedSubjects: ['Math'],
      existingErrorRecords: [],
      now: 1000,
    });

    expect(result.score).toBe(0);
    expect(result.correctCount).toBe(0);
    expect(result.errorRecords).toEqual([]);
    expect(result.studyPlan.weeklyGoals.length).toBeGreaterThan(0);
  });
});
