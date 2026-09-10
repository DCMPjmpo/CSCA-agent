/**
 * CSCA LangGraph workflow step runner — single-step execution for API routes.
 */

import type { CscaAgentState } from '@/lib/orchestration/csca-workflow';
import {
  runDiagnosisStep,
  runKnowledgeMapStep,
  runAdaptiveExercisesStep,
  runScoreAnalysisStep,
  runUniversityMatchStep,
} from '@/lib/orchestration/csca-workflow';

export type WorkflowStepName =
  | 'diagnose'
  | 'knowledge_map'
  | 'exercises'
  | 'score_analysis'
  | 'university_match';

const STEP_RUNNERS: Record<
  WorkflowStepName,
  (state: CscaAgentState) => Promise<Partial<CscaAgentState>>
> = {
  diagnose: runDiagnosisStep,
  knowledge_map: runKnowledgeMapStep,
  exercises: runAdaptiveExercisesStep,
  score_analysis: runScoreAnalysisStep,
  university_match: runUniversityMatchStep,
};

export async function runWorkflowStep(
  step: WorkflowStepName,
  state: CscaAgentState,
): Promise<Partial<CscaAgentState>> {
  const runner = STEP_RUNNERS[step];
  if (!runner) {
    throw new Error(`Unknown workflow step: ${step}`);
  }
  return runner(state);
}

export function buildInitialState(input: {
  candidateId?: string;
  nationality: string;
  targetMajor: string;
  highSchoolSystem?: string;
  hskLevel?: number;
  locale?: string;
}): CscaAgentState {
  return {
    candidateId: input.candidateId ?? `csca-${Date.now()}`,
    nationality: input.nationality,
    targetMajor: input.targetMajor,
    highSchoolSystem: input.highSchoolSystem ?? 'International Baccalaureate',
    hskLevel: input.hskLevel ?? 4,
    preferredLanguages: input.locale ? [input.locale] : undefined,
    currentStep: 1,
  };
}
