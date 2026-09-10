/**
 * CSCA Adaptive Learning API
 * Step 3: Generate adaptive exercises based on knowledge weaknesses
 *
 * Phase E+ 改动：
 *   - 接入统一 LearningContext（targetMajor, answerHistory, currentAbility...）
 *   - 从 answerHistory 派生统计字段，不重复计算
 *   - practice 模式使用 candidateScore 评分
 *   - 诚实标注 sourceStats / sourceLabel / usedFallback / fallbackReason
 */

import { NextResponse } from 'next/server';
import {
  selectQuestionsForSubjects,
} from '@/lib/csca/question-selection';
import {
  enrichContextWithHistory,
  type LearningContext,
  type AnswerRecord,
} from '@/lib/csca/learning-context';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      subjects = ['基础汉语', '数学'],
      diagnosis,
      targetMajor,
      targetUniversity,
      targetCountry,
      countryCode,
      currentStage = 2,
      knowledgeMap,
      answerHistory,
      perSubject: perSubjectOverride,
    } = body;

    // 安全校验 answerHistory
    const safeHistory: AnswerRecord[] = Array.isArray(answerHistory)
      ? answerHistory.filter(
          (a): a is AnswerRecord =>
            !!a &&
            typeof a.questionId === 'string' &&
            typeof a.subject === 'string' &&
            typeof a.isCorrect === 'boolean',
        )
      : [];

    // 从 diagnosis 获取所需科目
    const requiredSubjects: string[] =
      diagnosis?.requiredSubjects && Array.isArray(diagnosis.requiredSubjects)
        ? diagnosis.requiredSubjects
        : subjects;

    // 构建基础 LearningContext
    const baseCtx: Pick<LearningContext, 'requiredSubjects' | 'currentStage'> & Partial<LearningContext> = {
      targetMajor,
      countryCode,
      targetUniversity,
      targetCountry,
      requiredSubjects,
      currentStage: currentStage ?? 2,
      knowledgeMap,
      learningMode: 'practice',
    };

    // 用 answerHistory 填充统计字段（completed/correct/wrong/ability/weakPoints/recentIds）
    const ctx = enrichContextWithHistory(baseCtx, safeHistory);

    const perSubject = Math.max(1, Math.min(15, perSubjectOverride ?? 5));

    // 调用统一 Selector（practice 模式）
    const { results, totalQuestions, aggregatedStats, actualDifficulty } = selectQuestionsForSubjects(
      ctx,
      'practice',
      subjects,
      perSubject,
    );

    // 诚实标注来源
    const realTotal =
      aggregatedStats.real_exam + aggregatedStats.science_chinese + aggregatedStats.arts_chinese;
    const basicTotal = aggregatedStats.basic_practice + aggregatedStats.fallback_mock;
    const usedFallback = aggregatedStats.fallback_mock > 0 || basicTotal > 0 ||
      results.some((r) => r.fallbackReason);
    const sourceLabel: 'real_exam' | 'mixed' | 'basic_practice' =
      realTotal > 0 && basicTotal === 0
        ? 'real_exam'
        : realTotal > 0 && basicTotal > 0
          ? 'mixed'
          : 'basic_practice';

    // 聚合 fallbackReason
    const fallbackReasons = results
      .map((r) => r.fallbackReason)
      .filter(Boolean) as string[];

    // 适配前端期望字段
    const adaptedData = totalQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      answer: q.correctAnswer,
      difficulty: q.difficulty === 'easy' ? 0.3 : q.difficulty === 'hard' ? 0.7 : 0.5,
      topic: q.module,
      subject: q.subject,
      module: q.module,
      knowledgePoint: q.knowledgePoint,
      answerExplanation: q.answerExplanation,
      source: q.source,
    }));

    return NextResponse.json({
      success: true,
      data: adaptedData,
      step: 3,
      mock: false,
      sourceStats: aggregatedStats,
      sourceLabel,
      usedFallback,
      fallbackReason: fallbackReasons.length > 0 ? fallbackReasons.join(',') : undefined,
      blueprints: results.map((r) => r.blueprint),
      totalQuestions: adaptedData.length,
      actualDifficulty,
      // Phase E+: 返回派生统计，便于前端展示
      contextStats: {
        completedQuestionCount: ctx.completedQuestionCount,
        correctQuestionCount: ctx.correctQuestionCount,
        wrongQuestionCount: ctx.wrongQuestionCount,
        recentAccuracy: ctx.recentAccuracy,
      },
    });
  } catch (error) {
    console.error('[CSCA Adaptive Learning API] Error:', error);
    return NextResponse.json({
      success: false,
      error: '生成训练题失败',
      data: [],
    });
  }
}
