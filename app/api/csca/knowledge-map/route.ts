/**
 * CSCA Knowledge Map API
 * Step 2: Generate knowledge weakness map for subjects
 *
 * Phase 4 改动：
 *   - 移除内联 MOCK_TOPICS 硬编码掌握度（0.4-0.75 伪造值）
 *   - 接入 lib/csca/knowledge-data.ts 的 buildKnowledgeMap
 *   - 接受 answerHistory 参数，从真实答题历史计算 mastery
 *   - 新用户无答题数据 → mastery = 0（显示"暂无数据"）
 *   - 响应增加 masterySource 字段（'real_answers' | 'ai_inferred' | 'initial'）
 *
 * CSCA考试科目：
 * - 基础汉语（综合）- 听力、阅读、写作
 * - 数学 - 代数、几何、微积分基础
 * - 物理/化学 - 根据专业方向选择
 */

import { NextResponse } from 'next/server';
import { buildKnowledgeMap, type AnswerRecord } from '@/lib/csca/knowledge-data';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      subjects = ['基础汉语', '数学'],
      countryCode,
      // Phase 4: 接受真实答题历史（可选，由前端传入）
      // 格式：[{ subject, module?, isCorrect, timestamp }]
      answerHistory,
    } = body;

    // Phase 4: 调用 buildKnowledgeMap，传入真实答题数据
    // 无 answerHistory 时 mastery = 0（诚实显示"暂无数据"）
    const safeAnswers: AnswerRecord[] = Array.isArray(answerHistory)
      ? answerHistory.filter(
          (a): a is AnswerRecord =>
            !!a && typeof a.subject === 'string' && typeof a.isCorrect === 'boolean',
        )
      : [];

    const knowledgeMap = buildKnowledgeMap(subjects, countryCode, safeAnswers);

    // 统计 mastery 来源（用于 UI 调试/展示）
    const sourceSummary = {
      real_answers: knowledgeMap.filter((t) => t.masterySource === 'real_answers').length,
      ai_inferred: knowledgeMap.filter((t) => t.masterySource === 'ai_inferred').length,
      initial: knowledgeMap.filter((t) => t.masterySource === 'initial').length,
    };

    return NextResponse.json({
      success: true,
      data: knowledgeMap,
      step: 2,
      mock: false, // Phase 4: 不再使用 mock 数据
      sourceSummary,
      hasRealAnswers: safeAnswers.length > 0,
    });
  } catch (error) {
    console.error('[CSCA Knowledge Map API] Error:', error);
    // 错误时返回安全初始状态（mastery=0），不伪造能力
    const fallback = buildKnowledgeMap(['基础汉语', '数学']);
    return NextResponse.json({
      success: true,
      data: fallback,
      step: 2,
      mock: false,
      error: 'knowledge_map_fallback',
    });
  }
}
