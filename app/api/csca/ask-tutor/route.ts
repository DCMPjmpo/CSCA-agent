/**
 * CSCA AI Tutor API
 * Provides AI-powered explanations and answers for CSCA exam preparation
 *
 * Phase 4 改动：
 *   - 接入真实学习上下文（currentStage, knowledgeMap, weakKnowledgePoints,
 *     recentAccuracy, completedQuestionCount, wrongQuestionCount）
 *   - AI Mate 不再只看到 targetMajor/examScore，而是完整学习画像
 *   - 严禁伪造上下文：未传字段标注"暂无数据"，不编造掌握度
 */

import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/ai/model-router';

export const maxDuration = 60;

interface KnowledgeTopicInput {
  id: string;
  name: string;
  description: string;
  mastery: number;
  subject: string;
  masterySource?: 'real_answers' | 'ai_inferred' | 'initial';
}

/** 把学习上下文格式化为 AI 可读文本（诚实标注数据来源） */
function formatLearningContext(ctx: {
  currentStage?: number;
  knowledgeMap?: KnowledgeTopicInput[];
  recentAccuracy?: number;
  completedQuestionCount?: number;
  wrongQuestionCount?: number;
  weakKnowledgePoints?: Record<string, string[]>;
}): string {
  const lines: string[] = [];

  // 当前阶段
  if (typeof ctx.currentStage === 'number' && ctx.currentStage >= 0) {
    const stageNames = [
      'S0 出发前准备',
      'S1 定位（专业诊断）',
      'S2 航海图（知识图谱）',
      'S3 演武（自适应训练）',
      'S4 观星（模拟考试）',
      'S5 纠错（错题修正）',
      'S6 测算（成绩分析）',
      'S7 修正航向（个性化计划）',
      'S8 抵达（最终评估）',
    ];
    lines.push(`- 当前学习阶段：${stageNames[ctx.currentStage] ?? `S${ctx.currentStage}`}`);
  } else {
    lines.push('- 当前学习阶段：暂无数据');
  }

  // 答题统计
  const completed = ctx.completedQuestionCount ?? 0;
  const wrong = ctx.wrongQuestionCount ?? 0;
  if (completed > 0) {
    const accuracy = ctx.recentAccuracy != null
      ? `${Math.round(ctx.recentAccuracy * 100)}%`
      : '暂无数据';
    lines.push(`- 已完成题目数：${completed}，错题数：${wrong}，最近正确率：${accuracy}`);
  } else {
    lines.push('- 已完成题目数：0（学生尚未开始练习/考试）');
  }

  // 薄弱知识点（来自真实答题历史）
  if (ctx.weakKnowledgePoints && Object.keys(ctx.weakKnowledgePoints).length > 0) {
    const weakList = Object.entries(ctx.weakKnowledgePoints)
      .map(([subj, pts]) => `${subj}: ${pts.join('、')}`)
      .join('；');
    lines.push(`- 薄弱知识点（来自答题数据）：${weakList}`);
  } else {
    lines.push('- 薄弱知识点：暂无数据（学生尚未答题或全部掌握）');
  }

  // 知识图谱 mastery 概要（只统计真实数据，不展示伪造值）
  if (Array.isArray(ctx.knowledgeMap) && ctx.knowledgeMap.length > 0) {
    const realTopics = ctx.knowledgeMap.filter((t) => t.masterySource === 'real_answers');
    if (realTopics.length > 0) {
      const avgMastery =
        realTopics.reduce((s, t) => s + t.mastery, 0) / realTopics.length;
      lines.push(
        `- 知识图谱（基于 ${realTopics.length} 个真实答题知识点）：平均掌握度 ${Math.round(avgMastery * 100)}%`,
      );
    } else {
      lines.push('- 知识图谱：暂无真实答题数据，无法评估掌握度');
    }
  }

  return lines.join('\n');
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
      // Phase 4 新增：真实学习上下文（结构化字段）
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

    // Phase 4: 优先使用结构化字段构建上下文，兼容 voyageContext 字符串
    let learningContextText: string;
    const hasStructuredFields =
      typeof currentStage === 'number' ||
      Array.isArray(knowledgeMap) ||
      typeof completedQuestionCount === 'number';

    if (hasStructuredFields) {
      learningContextText = formatLearningContext({
        currentStage,
        knowledgeMap,
        recentAccuracy,
        completedQuestionCount,
        wrongQuestionCount,
        weakKnowledgePoints,
      });
      // 如果同时有 voyageContext 字符串，附加在后（保留品牌叙事）
      if (typeof voyageContext === 'string' && voyageContext.trim().length > 0) {
        learningContextText += `\n\n[品牌叙事摘要]\n${voyageContext}`;
      }
    } else if (typeof voyageContext === 'string' && voyageContext.trim().length > 0) {
      // 兼容旧前端：仅有 voyageContext 字符串
      learningContextText = voyageContext;
    } else {
      learningContextText = formatLearningContext({});
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
