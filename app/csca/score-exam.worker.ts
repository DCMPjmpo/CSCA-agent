/**
 * 诊断测试判分 Worker
 *
 * 在 Worker 内完成判分 + 错题批量写入 + 弱项分析 + 学习计划生成（CPU 密集），
 * 避免阻塞浏览器主线程。错误记录只读写 localStorage 各一次（替代 O(N²) 逐条写）。
 */
/// <reference lib="webworker" />
import { gradeExam, type ExamQuestionLike, type ExamGradeResult } from '@/lib/csca/exam-scoring';
import { getErrorRecords, saveStudyPlan, writeErrorRecords } from '@/lib/csca/error-analysis-core';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = (e: MessageEvent) => {
  const msg = e.data as {
    type: string;
    examQuestions: ExamQuestionLike[];
    examAnswers: Record<string, number | string>;
    selectedSubjects: string[];
  };
  if (msg.type !== 'grade-exam') return;

  const result: ExamGradeResult = gradeExam({
    examQuestions: msg.examQuestions,
    examAnswers: msg.examAnswers,
    selectedSubjects: msg.selectedSubjects,
    existingErrorRecords: getErrorRecords(), // Worker 内读一次
  });

  writeErrorRecords(result.errorRecords); // 批量写一次
  saveStudyPlan(result.studyPlan);

  workerScope.postMessage({ type: 'grade-result', result });
};
