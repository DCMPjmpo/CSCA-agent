/// <reference lib="webworker" />

/**
 * score-exam.worker.ts
 *
 * Web Worker：在后台线程执行 CSCA 模拟考试判分逻辑，
 * 避免主线程阻塞。Next.js App Router 兼容写法。
 */

import { gradeExam } from '@/lib/csca/exam-scoring';

self.onmessage = (e) => {
  const data = e.data;
  if (!data || data.type !== 'grade-exam') return;

  try {
    const result = gradeExam({
      examQuestions: data.examQuestions,
      examAnswers: data.examAnswers,
      selectedSubjects: data.selectedSubjects,
      existingErrorRecords: data.existingErrorRecords ?? [],
    });

    self.postMessage({
      type: 'grade-result',
      result,
    });
  } catch (err) {
    self.postMessage({
      type: 'grade-error',
      message: err instanceof Error ? err.message : 'worker grading failed',
    });
  }
};
