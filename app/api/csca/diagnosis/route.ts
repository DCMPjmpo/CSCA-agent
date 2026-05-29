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

// Mock diagnosis results for different majors
const MOCK_DIAGNOSIS: Record<string, any> = {
  '临床医学': {
    requiredSubjects: ['基础汉语', '数学', '物理', '化学'],
    recommendedSubjects: ['专业词汇', '医学汉语'],
    subjectPriorities: { '基础汉语': 1, '数学': 2, '化学': 3, '物理': 4 },
    estimatedDays: 90,
    advice: '临床医学专业需要较强的数理基础和化学知识。建议重点加强基础汉语和数学的学习，同时打好化学基础。',
  },
  '工程学': {
    requiredSubjects: ['基础汉语', '数学', '物理'],
    recommendedSubjects: ['工程汉语', '计算机基础'],
    subjectPriorities: { '基础汉语': 1, '数学': 2, '物理': 3 },
    estimatedDays: 75,
    advice: '工程专业注重数学和物理能力。建议多做练习题，提高解题速度，同时加强专业汉语词汇学习。',
  },
  '工商管理': {
    requiredSubjects: ['基础汉语', '数学'],
    recommendedSubjects: ['商务汉语', '经济学基础'],
    subjectPriorities: { '基础汉语': 1, '数学': 2 },
    estimatedDays: 60,
    advice: '工商管理专业需要良好的汉语语言能力和数学基础。建议加强汉语阅读和写作练习，特别是商务场景。',
  },
  '计算机科学': {
    requiredSubjects: ['基础汉语', '数学', '物理'],
    recommendedSubjects: ['计算机汉语', '编程基础'],
    subjectPriorities: { '基础汉语': 1, '数学': 2, '物理': 3 },
    estimatedDays: 80,
    advice: '计算机专业需要扎实的数学基础和逻辑思维能力。建议重点学习离散数学相关知识，同时加强汉语沟通能力。',
  },
  '经济学': {
    requiredSubjects: ['基础汉语', '数学'],
    recommendedSubjects: ['经济汉语', '统计学基础'],
    subjectPriorities: { '基础汉语': 1, '数学': 2 },
    estimatedDays: 70,
    advice: '经济学专业对数学要求较高。建议加强微积分和统计学知识，同时提升汉语听说读写能力。',
  },
  default: {
    requiredSubjects: ['基础汉语', '数学', '物理'],
    recommendedSubjects: ['专业汉语'],
    subjectPriorities: { '基础汉语': 1, '数学': 2, '物理': 3 },
    estimatedDays: 80,
    advice: '根据你的专业方向，建议重点学习基础汉语和数学。制定合理的学习计划，循序渐进。',
  },
};

// Fast path: use mock data directly for quick response
const getMockResult = (targetMajor: string) => {
  return MOCK_DIAGNOSIS[targetMajor] || MOCK_DIAGNOSIS.default;
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

      // Use Promise.race with shorter timeout (15 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DIAGNOSIS_TIMEOUT')), 15000)
      );

      const resultPromise = generateWithFallback({
        task: 'diagnosis',
        messages: [{ role: 'user', content: prompt }],
      });

      const result = await Promise.race([resultPromise, timeoutPromise]);

      try {
        const diagnosis = JSON.parse((result as any).text);
        return NextResponse.json({
          success: true,
          data: diagnosis,
          step: 1,
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
      data: MOCK_DIAGNOSIS.default,
      step: 1,
      mock: true,
    });
  }
}
