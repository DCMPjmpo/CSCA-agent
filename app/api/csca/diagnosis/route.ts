/**
 * CSCA Subject Diagnosis API
 * Step 1: Diagnose required subjects based on candidate profile
 * 
 * CSCA考试科目：
 * - 基础汉语（综合）- 必考科目，包括听力、阅读、写作
 * - 数学 - 必考科目，包括代数、几何、微积分基础
 * - 物理/化学 - 根据专业方向选择其一（理科方向）
 * 
 * Note: Uses mock data when external API is unavailable
 */

import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/ai/model-router';
import { getCscaSubjectRules } from '@/lib/rag/retriever';
import { getMajorSubjectMap } from '@/lib/csca/major-subject-map';

export const maxDuration = 60; // [AI-FIX] AI 诊断需要更长时间，设置 60s

// Phase 4: 从 major-subject-map.ts 获取配置（单一事实来源，明确标注 confidence）
// 旧的内联 MOCK_DIAGNOSIS 已迁移到 lib/csca/major-subject-map.ts
const getMockResult = (targetMajor: string) => {
  const map = getMajorSubjectMap(targetMajor);
  return {
    requiredSubjects: map.requiredSubjects,
    recommendedSubjects: map.recommendedSubjects,
    subjectPriorities: map.subjectPriorities,
    estimatedDays: map.estimatedDays,
    advice: map.advice,
    // Phase 4 新增：诚实标注来源
    confidence: map.confidence,
    rationale: map.rationale,
    majorName: map.majorName,
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetMajor, highSchoolSystem, hskLevel, nationality, fastMode } = body;

    if (!targetMajor || !nationality) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fast mode: return mock data immediately for better UX
    if (fastMode !== false) {
      const mockResult = getMockResult(targetMajor);
      console.info(`[CSCA Diagnosis] Fast mode: returning mock data for ${targetMajor}`);
      return NextResponse.json({
        success: true,
        data: mockResult,
        step: 1,
        mock: true,
      });
    }

    // Normal mode: try AI-enhanced diagnosis with timeout
    try {
      const subjectRules = await getCscaSubjectRules();

      const prompt = `你是CSCA科目诊断专家。根据考生的目标专业、高中学历体系和HSK水平，输出所需的科目组合、优先级和预估难度。

CSCA考试科目规则：
- 基础汉语（综合）- 必考科目，包括听力、阅读、写作
- 数学 - 必考科目，包括代数、几何、微积分基础
- 物理/化学 - 根据专业方向选择其一（理科方向）

考生信息：
- 目标专业: ${targetMajor}
- 高中学历体系: ${highSchoolSystem || 'International Baccalaureate'}
- HSK等级: ${hskLevel || 4}
- 国籍: ${nationality}

输出格式 (JSON):
{
  "requiredSubjects": ["基础汉语", "数学", "物理"],
  "recommendedSubjects": ["专业词汇"],
  "subjectPriorities": {"基础汉语": 1, "数学": 2, "物理": 3},
  "estimatedDays": 80,
  "advice": "..."
}`;

      // [AI-FIX] 原 15s 超时太短，deepseek-v4-pro 带 reasoning 模式需要更长时间
      // 增加到 50s（Vercel maxDuration 60s 留 10s 余量）
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DIAGNOSIS_TIMEOUT')), 50000)
      );

      const resultPromise = generateWithFallback({
        task: 'diagnosis',
        messages: [{ role: 'user', content: prompt }],
      });

      const result = await Promise.race([resultPromise, timeoutPromise]);

      try {
        // [AI-FIX] AI 返回的 JSON 可能被 markdown 代码块包裹，需提取
        let text = ((result as any).text || '').trim();
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          text = jsonMatch[1].trim();
        }
        const diagnosis = JSON.parse(text);
        return NextResponse.json({
          success: true,
          data: diagnosis,
          step: 1,
          aiGenerated: true,
        });
      } catch {
        console.warn('[CSCA Diagnosis] Failed to parse API result, using mock data');
      }
    } catch (apiError) {
      console.warn('[CSCA Diagnosis] API call failed or timed out, using mock data:', apiError);
    }

    // Return mock data as fallback
    const mockResult = getMockResult(targetMajor);

    return NextResponse.json({
      success: true,
      data: mockResult,
      step: 1,
      mock: true,
    });

  } catch (error) {
    console.error('[CSCA Diagnosis API] Error:', error);
    return NextResponse.json({
      success: true,
      data: getMockResult('default'),
      step: 1,
      mock: true,
    });
  }
}
