/**
 * CSCA Wrong Answer Practice API
 *
 * Phase F 新增：独立错题修正入口。
 *
 * 闭环流程：
 *   历史错题 (answerHistory.filter(isCorrect=false))
 *   -> 提取 knowledgePoint
 *   -> 排除原 questionId (recentWrongQuestionIds)
 *   -> 寻找同知识点新题
 *   -> 匹配难度
 *   -> 重新作答
 *   -> 更新 answerHistory (mode='wrong_answer_practice')
 *   -> 更新 Knowledge Map mastery
 *
 * 调用底层 Selector 的 'wrong_answer_practice' 模式。
 * 不重复原题（recentWrongQuestionIds 在 Selector 内部用于减分）。
 * 同知识点不足时返回 fallbackReason='knowledge_point_insufficient'（诚实标注）。
 */

import { NextResponse } from 'next/server';
import { selectQuestionsForSubjects } from '@/lib/csca/question-selection';
import {
  enrichContextWithHistory,
  extractWeakKnowledgePoints,
  type LearningContext,
  type AnswerRecord,
} from '@/lib/csca/learning-context';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      subjects = ['基础汉语', '数学'],
      targetMajor,
      countryCode,
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

    // 从历史中提取错题 ID 和薄弱知识点
    const wrongRecords = safeHistory.filter((a) => !a.isCorrect);
    const wrongQuestionIds = wrongRecords.map((a) => a.questionId);
    const weakKnowledgePoints = extractWeakKnowledgePoints(safeHistory);

    // 无错题时返回空结果（不伪造题目）
    if (wrongRecords.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        step: 6,
        mock: false,
        mode: 'wrong_answer_practice',
        totalQuestions: 0,
        wrongQuestionCount: 0,
        weakKnowledgePoints,
        message: '暂无错题记录，无需错题修正',
        contextStats: {
          completedQuestionCount: safeHistory.length,
          wrongQuestionCount: 0,
        },
      });
    }

    // 构建基础 LearningContext
    const baseCtx: Pick<LearningContext, 'requiredSubjects' | 'currentStage'> &
      Partial<LearningContext> = {
      targetMajor,
      countryCode,
      requiredSubjects: subjects,
      currentStage: 5,
      learningMode: 'wrong_answer_practice',
      weakKnowledgePoints,
      recentWrongQuestionIds: wrongQuestionIds,
      recentQuestionIds: safeHistory.slice(-30).map((a) => a.questionId),
    };

    // 用 answerHistory 填充统计字段
    const ctx = enrichContextWithHistory(baseCtx, safeHistory);

    const perSubject = Math.max(1, Math.min(10, perSubjectOverride ?? 5));

    // 调用统一 Selector (wrong_answer_practice 模式)
    const { results, totalQuestions, aggregatedStats, difficultyFallback, actualDifficulty } =
      selectQuestionsForSubjects(ctx, 'wrong_answer_practice', subjects, perSubject);

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

    // 聚合 fallbackReason
    const fallbackReasons = results.map((r) => r.fallbackReason).filter(Boolean) as string[];

    // 诚实标注来源
    const realTotal =
      aggregatedStats.real_exam + aggregatedStats.science_chinese + aggregatedStats.arts_chinese;
    const basicTotal = aggregatedStats.basic_practice + aggregatedStats.fallback_mock;
    const usedFallback =
      aggregatedStats.fallback_mock > 0 || basicTotal > 0 || results.some((r) => r.fallbackReason);
    const sourceLabel: 'real_exam' | 'mixed' | 'basic_practice' =
      realTotal > 0 && basicTotal === 0
        ? 'real_exam'
        : realTotal > 0 && basicTotal > 0
          ? 'mixed'
          : 'basic_practice';

    return NextResponse.json({
      success: true,
      data: adaptedData,
      step: 6,
      mock: false,
      mode: 'wrong_answer_practice',
      sourceStats: aggregatedStats,
      sourceLabel,
      usedFallback,
      fallbackReason: fallbackReasons.length > 0 ? fallbackReasons.join(',') : undefined,
      difficultyFallback,
      actualDifficulty,
      blueprints: results.map((r) => r.blueprint),
      totalQuestions: adaptedData.length,
      wrongQuestionCount: wrongRecords.length,
      wrongQuestionIds,
      weakKnowledgePoints,
      contextStats: {
        completedQuestionCount: ctx.completedQuestionCount,
        correctQuestionCount: ctx.correctQuestionCount,
        wrongQuestionCount: ctx.wrongQuestionCount,
        recentAccuracy: ctx.recentAccuracy,
      },
      message:
        adaptedData.length > 0
          ? '已生成错题修正题目'
          : '错题知识点题目不足，无法生成新题（题库瓶颈）',
    });
  } catch (error) {
    console.error('[CSCA Wrong Answer Practice API] Error:', error);
    return NextResponse.json({
      success: false,
      error: '生成错题修正题目失败',
      data: [],
    });
  }
}
