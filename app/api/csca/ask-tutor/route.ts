/**
 * CSCA AI Tutor API
 * Provides AI-powered explanations and answers for CSCA exam preparation
 *
 * Phase 4 改动：
 *   - 接入真实学习上下文（currentStage, knowledgeMap, weakKnowledgePoints,
 *     recentAccuracy, completedQuestionCount, wrongQuestionCount）
 *
 * P3.4-1 改动（Agent Read Layer）：
 *   - 学习上下文改由服务端从**原始 answerHistory** 重算（learning-context-adapter），
 *     不再采信客户端预计算的统计量。旧字段保留为兼容兜底。
 *   - 严禁伪造上下文：未传字段标注"暂无数据"，不编造掌握度
 */

import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/ai/model-router';
import { emptyLearningContext, type LearningContext } from '@/lib/csca/learning-context';
import {
  buildLearningContext,
  parseKnowledgeMap,
  parseProgress,
  parseWeakKnowledgePoints,
  renderLearningContext,
  resolveCurrentStage,
} from '@/lib/csca/learning-context-adapter';

export const maxDuration = 60;

/**
 * 兼容路径：旧契约下客户端预计算的统计字段。
 *
 * 这些值按定义就是「客户端自述」，这里不做重算 —— 保留仅为不破坏旧调用方。
 * 新调用方一律走原始 answerHistory 适配层（见 POST 内的分支顺序）。
 */
function legacyLearningContext(body: Record<string, unknown>): LearningContext {
  const completed = typeof body.completedQuestionCount === 'number' ? body.completedQuestionCount : 0;
  const wrong = typeof body.wrongQuestionCount === 'number' ? body.wrongQuestionCount : 0;
  return {
    ...emptyLearningContext(),
    currentStage: typeof body.currentStage === 'number' ? body.currentStage : 0,
    completedQuestionCount: completed,
    correctQuestionCount: Math.max(0, completed - wrong),
    wrongQuestionCount: wrong,
    recentAccuracy: typeof body.recentAccuracy === 'number' ? body.recentAccuracy : undefined,
    weakKnowledgePoints: parseWeakKnowledgePoints(body.weakKnowledgePoints),
    knowledgeMap: parseKnowledgeMap(body.knowledgeMap),
  };
}

export async function POST(request: Request) {
  let locale: string | undefined;
  try {
    const body = await request.json();
    const {
      question,
      targetMajor,
      nationality,
      hskLevel,
      examScore,
      // P3.4-1：原始学习数据（优先）
      answerHistory,
      progress,
      // 兼容：客户端预计算的统计字段（旧契约）
      currentStage,
      knowledgeMap,
      recentAccuracy,
      completedQuestionCount,
      wrongQuestionCount,
      weakKnowledgePoints,
      // 兼容：前端可能直接传 voyageContext 字符串摘要
      voyageContext,
    } = body;
    locale = body.locale;

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `你是一位专业的CSCA（中国国际学生标准化考试）备考导师。

你的职责：
1. 解答关于CSCA考试的各种问题
2. 针对学生的薄弱环节提供学习建议
3. 推荐备考策略和复习方法
4. 解释考试中的知识点和概念

回答要求：
1. 使用${locale === 'en' ? '英语' : '中文'}回答，语言自然友好
2. 数学表达式使用简单文本格式（如 x^2、a/b、√2）
3. 如果学生有具体题目，请详细解析解题思路
4. 给出实用、可操作的学习建议
5. 保持积极鼓励的态度
6. 基于学生的真实学习数据给出个性化建议，不要编造学生未生成的数据
7. 如果学生尚未开始练习/考试，请鼓励其从 S1 定位开始，不要假设其已有学习成果`;

    // P3.4-1: 分支顺序 —— 原始 answerHistory 优先。
    // 必须用 Array.isArray 而非 length/真值判断：「空但存在」表示学生确实尚无答题记录，
    // 与「未提供该字段」语义不同，前者应走适配层并如实渲染为 0。
    let learningContextText: string;
    if (Array.isArray(answerHistory)) {
      const ctx = buildLearningContext(body);
      learningContextText = renderLearningContext(ctx, {
        stage: resolveCurrentStage(body),
        progress: parseProgress(progress),
        voyageContext,
      });
    } else {
      const hasStructuredFields =
        typeof currentStage === 'number' ||
        Array.isArray(knowledgeMap) ||
        typeof completedQuestionCount === 'number';

      if (hasStructuredFields) {
        learningContextText = renderLearningContext(legacyLearningContext(body));
        // 如果同时有 voyageContext 字符串，附加在后（保留品牌叙事）
        if (typeof voyageContext === 'string' && voyageContext.trim().length > 0) {
          learningContextText += `\n\n[品牌叙事摘要]\n${voyageContext}`;
        }
      } else if (typeof voyageContext === 'string' && voyageContext.trim().length > 0) {
        // 兼容旧前端：仅有 voyageContext 字符串
        learningContextText = voyageContext;
      } else {
        learningContextText = renderLearningContext(legacyLearningContext({}));
      }
    }

    const userPrompt = `学生信息：
- 目标专业：${targetMajor || '未指定'}
- 国籍：${nationality || '未指定'}
- HSK水平：HSK${hskLevel || '未指定'}
- 最近考试成绩：${examScore || '暂无'}
- 语言偏好：${locale === 'en' ? 'English' : '中文'}

真实学习上下文：
${learningContextText}

学生问题：${question}

请根据以上真实信息，给出专业、详细、个性化的回答。如果某些学习数据为"暂无数据"，请鼓励学生通过相应学习环节生成数据，而不是编造能力评估。`;

    const result = await generateWithFallback({
      task: 'tutor',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 2048,
    });

    const answer = result.text || '抱歉，暂时无法回答您的问题。请稍后再试。';

    return NextResponse.json({ success: true, answer, degraded: false });
  } catch (error) {
    console.error('[AskTutor] Error:', error);
    const isEn = locale === 'en' || locale?.startsWith('en');
    const fallbackAnswer = isEn
      ? `I'm currently unable to provide a personalized response. The AI service is temporarily unavailable.

Here's what you can do:
- Complete a practice session or mock exam to generate real learning data
- Visit the Wrong Answer Center to review and correct mistakes
- Check your Knowledge Map to see your current mastery levels
- Try again in a moment for a personalized AI response

Your learning progress is automatically saved.`
      : `AI服务暂时不可用，无法生成个性化回答。

建议您：
- 完成一次练习或模拟考试，以生成真实学习数据
- 前往错题中心查看并纠正错误
- 查看知识地图了解当前掌握程度
- 稍后重试获取个性化AI回答

您的学习进度已自动保存。`;

    return NextResponse.json({
      success: true,
      answer: fallbackAnswer,
      degraded: true,
      fallbackReason: 'all_models_failed',
    });
  }
}
