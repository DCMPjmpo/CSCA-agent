/**
 * CSCA LangGraph Workflow API — run individual pipeline steps.
 */

import { NextResponse } from 'next/server';
import {
  runWorkflowStep,
  buildInitialState,
  type WorkflowStepName,
} from '@/lib/csca/workflow-runner';

const VALID_STEPS: WorkflowStepName[] = [
  'diagnose',
  'knowledge_map',
  'exercises',
  'score_analysis',
  'university_match',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { step, state: inputState, ...profile } = body;

    if (!step || !VALID_STEPS.includes(step)) {
      return NextResponse.json(
        { error: `Invalid step. Use one of: ${VALID_STEPS.join(', ')}` },
        { status: 400 },
      );
    }

    const baseState =
      inputState ??
      buildInitialState({
        nationality: profile.nationality,
        targetMajor: profile.targetMajor,
        highSchoolSystem: profile.highSchoolSystem,
        hskLevel: profile.hskLevel,
        locale: profile.locale,
      });

    const result = await runWorkflowStep(step as WorkflowStepName, baseState);

    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error,
        data: result,
        step,
        workflow: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      step,
      workflow: true,
    });
  } catch (error) {
    console.error('[CSCA Workflow API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Workflow execution failed' },
      { status: 500 },
    );
  }
}
