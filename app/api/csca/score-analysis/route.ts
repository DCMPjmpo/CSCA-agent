/**
 * CSCA Score Analysis API
 * Step 5: Analyze mock exam results and generate improvement plan
 */

import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/ai/model-router';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mockExam, nationality } = body;

    // Validate input
    if (!mockExam || !mockExam.questions) {
      return NextResponse.json(
        { error: 'Mock exam data is required' },
        { status: 400 }
      );
    }

    // Calculate module scores
    const moduleScores: Record<string, { total: number; correct: number }> = {};

    mockExam.questions.forEach((q: any) => {
      const module = q.module || 'Uncategorized';
      if (!moduleScores[module]) {
        moduleScores[module] = { total: 0, correct: 0 };
      }
      moduleScores[module].total++;
      if (mockExam.answers && mockExam.answers[q.id] === q.correctAnswer) {
        moduleScores[module].correct++;
      }
    });

    // Calculate module rates
    const moduleRates: Record<string, number> = {};
    Object.entries(moduleScores).forEach(([module, scores]) => {
      moduleRates[module] = Math.round((scores.correct / scores.total) * 100);
    });

    // Calculate total score
    const totalCorrect = Object.values(moduleScores).reduce(
      (sum, s) => sum + s.correct,
      0
    );
    const totalScore = Math.round((totalCorrect / mockExam.questions.length) * 100);

    // Generate analysis report using Kimi
    const prompt = `You are a CSCA score analysis expert. Generate a multi-dimensional analysis report and 7-day sprint plan based on the mock exam results.

Candidate Info:
- Nationality: ${nationality || 'ASEAN'}
- Subject: ${mockExam.subject || 'Mathematics'}
- Total Score: ${totalScore}/100
- Module Scores: ${JSON.stringify(moduleRates)}

Requirements:
1. Compare with CSCA passing score (60/100)
2. Estimate ranking among candidates from the same country
3. Identify Top 3 weak areas
4. Create detailed 7-day sprint plan (specific to each day)

Output Format (JSON):
{
  "totalScore": ${totalScore},
  "moduleScores": ${JSON.stringify(moduleRates)},
  "rankingPercentile": 75,
  "weakPoints": ["Weak Area 1", "Weak Area 2", "Weak Area 3"],
  "improvementPlan": "7-day sprint plan details..."
}`;

    const result = await generateWithFallback({
      task: 'score_analysis',
      messages: [{ role: 'user', content: prompt }],
    });

    try {
      const scoreAnalysis = JSON.parse(result.text);
      return NextResponse.json({
        success: true,
        data: scoreAnalysis,
        step: 5,
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          totalScore,
          moduleScores: moduleRates,
          rankingPercentile: Math.min(90, Math.max(10, totalScore)),
          weakPoints: Object.entries(moduleRates)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 3)
            .map(([name]) => name),
          improvementPlan: 'Focus on weak modules and practice daily. Review basic concepts and do more exercises.',
        },
        step: 5,
      });
    }
  } catch (error) {
    console.error('[CSCA Score Analysis API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
