/**
 * 诊断测试判分核心模块（纯函数，无副作用）
 *
 * 从 app/csca/page.tsx 的 handleSubmitExam 判分循环中提取，可在 Web Worker 中执行，
 * 也可在 vitest（node 环境）中直接单测。错题批量合并、弱项分析、学习计划生成全部在此完成。
 */

import {
  analyzeWeakAreas,
  generateStudyPlan,
  mergeErrorRecords,
  type ErrorRecord,
  type StudyPlan,
  type UserAnswer,
  type WeakArea,
} from './error-analysis-core';

/** gradeExam 只关心这些字段（worker 侧 postMessage 传递的最小形状） */
export interface ExamQuestionLike {
  id: string;
  question: string;
  subject: string;
  module: string;
  correctAnswer: number | string;
  /** Q3.0.3: V1 enrichment 解析（透传到 ErrorRecord 供前端展示） */
  answerExplanation?: string;
}

export interface GradeExamParams {
  examQuestions: ExamQuestionLike[];
  examAnswers: Record<string, number | string>;
  selectedSubjects: string[];
  /** 已存在的错题记录（worker 内读一次传入，纯函数内不碰 localStorage） */
  existingErrorRecords: ErrorRecord[];
  now?: number;
}

export interface ExamGradeResult {
  score: number;
  breakdown: Record<string, number>;
  correctCount: number;
  wrongQuestions: ExamQuestionLike[];
  userAnswers: UserAnswer[];
  /** 合并去重后的完整错题记录（已含本次新增/累加的） */
  errorRecords: ErrorRecord[];
  weakAreas: WeakArea[];
  studyPlan: StudyPlan;
}

const NOT_ANSWERED = '未作答';

export function gradeExam(params: GradeExamParams): ExamGradeResult {
  const now = params.now ?? Date.now();
  const { examQuestions, examAnswers, selectedSubjects, existingErrorRecords } = params;

  let correctCount = 0;
  const subjectScores: Record<string, { correct: number; total: number }> = {};
  const wrongQuestions: ExamQuestionLike[] = [];
  const userAnswers: UserAnswer[] = [];
  const newErrorRecords: ErrorRecord[] = [];

  examQuestions.forEach((q) => {
    if (!subjectScores[q.subject]) {
      subjectScores[q.subject] = { correct: 0, total: 0 };
    }
    subjectScores[q.subject].total++;

    const userAnswer = examAnswers[q.id];
    const isCorrect = userAnswer === q.correctAnswer;

    userAnswers.push({
      questionId: q.id,
      question: q.question,
      subject: q.subject,
      module: q.module,
      userAnswer: userAnswer ?? NOT_ANSWERED,
      correctAnswer: q.correctAnswer,
      isCorrect,
      timestamp: now,
    });

    if (isCorrect) {
      correctCount++;
      subjectScores[q.subject].correct++;
    } else {
      wrongQuestions.push(q);
      newErrorRecords.push({
        id: `error-${now}-${q.id}`,
        questionId: q.id,
        question: q.question,
        subject: q.subject,
        module: q.module,
        userAnswer: userAnswer ?? NOT_ANSWERED,
        correctAnswer: q.correctAnswer,
        explanation: q.answerExplanation,
        timestamp: now,
        reviewCount: 0,
      });
    }
  });

  const score =
    examQuestions.length > 0 ? Math.round((correctCount / examQuestions.length) * 100) : 0;
  const breakdown: Record<string, number> = {};

  Object.entries(subjectScores).forEach(([subject, stats]) => {
    breakdown[subject] = Math.round((stats.correct / stats.total) * 100);
  });

  const errorRecords = mergeErrorRecords(existingErrorRecords, newErrorRecords, now);
  const weakAreas = analyzeWeakAreas(userAnswers);
  const studyPlan = generateStudyPlan('user-1', selectedSubjects, weakAreas);

  return {
    score,
    breakdown,
    correctCount,
    wrongQuestions,
    userAnswers,
    errorRecords,
    weakAreas,
    studyPlan,
  };
}
