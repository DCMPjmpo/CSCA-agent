/**
 * CSCA Pilot Agent Workflow - LangGraph Orchestration
 * 
 * Six-step workflow for CSCA exam preparation:
 * 1. Subject Diagnosis
 * 2. Knowledge Map Generation
 * 3. Adaptive Exercise Generation
 * 4. Mock Exam
 * 5. Score Analysis
 * 6. University Matching
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import { generateWithFallback, type TaskType } from '../ai/model-router';
import { retrieveCscaKnowledge, getCscaSubjectRules } from '../rag/retriever';
import { calculateEloDifficulty, suggestDailyPracticeCount, type TopicMastery } from '../elo/algorithm';

// ==========================================
// Workflow State Definition
// ==========================================
export interface CscaAgentState {
  // Candidate Info
  candidateId: string;
  nationality: string;
  targetMajor: string;
  highSchoolSystem: string;
  hskLevel: number;
  preferredLanguages?: string[];

  // Step 1: Diagnosis Result
  diagnosis?: {
    requiredSubjects: string[];
    recommendedSubjects: string[];
    subjectPriorities: Record<string, number>;
    estimatedDays: number; // Recommended preparation days
  };

  // Step 2: Knowledge Map
  knowledgeMap?: {
    subject: string;
    topics: Array<{
      name: string;
      description: string;
      mastery: 'mastered' | 'needs_review' | 'weak';
      eloScore: number;
    }>;
  };

  // Step 3: Adaptive Learning
  exercises?: Array<{
    id: string;
    subject: string;
    topic: string;
    difficulty: number;
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
  }>;

  // Step 4: Mock Exam
  mockExam?: {
    id: string;
    subject: string;
    questions: any[];
    answers: Record<string, string>;
    totalQuestions: number;
    correctCount: number;
    score: Record<string, number>;
  };

  // Step 5: Score Analysis
  scoreAnalysis?: {
    totalScore: number;
    moduleScores: Record<string, number>;
    rankingPercentile?: number;
    weakPoints: string[];
    improvementPlan: string;
  };

  // Step 6: University Matching
  universityMatch?: {
    safeSchools: Array<{ name: string; location: string; probability: number }>;
    targetSchools: Array<{ name: string; location: string; probability: number }>;
    reachSchools: Array<{ name: string; location: string; probability: number }>;
    scholarships: Array<{ name: string; description: string; requirements: string[] }>;
  };

  // Global State
  currentStep: number;
  error?: string;
}

// ==========================================
// Step 1: Subject Diagnosis
// ==========================================
export async function diagnoseSubjects(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  const { targetMajor, highSchoolSystem, hskLevel, nationality } = state;

  // RAG retrieval for CSCA subject requirements
  const subjectRules = await getCscaSubjectRules();

  const prompt = `You are a CSCA subject diagnosis expert. Based on the candidate's target major, high school curriculum system, and HSK level, output the required subject combination, priorities, and estimated difficulty.
  
CSCA Subject Rules:
${subjectRules}

Candidate Info:
- Target Major: ${targetMajor}
- High School System: ${highSchoolSystem}
- HSK Level: ${hskLevel}
- Nationality: ${nationality}

Output Format (JSON):
{
  "requiredSubjects": ["Subject1", "Subject2", ...],
  "recommendedSubjects": ["Subject1", ...],
  "subjectPriorities": {"Subject1": 1, "Subject2": 2, ...},
  "estimatedDays": 30
}`;

  const result = await generateWithFallback({
    task: 'diagnosis',
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const diagnosis = JSON.parse(result.text);
    return { diagnosis, currentStep: 2 };
  } catch {
    return { error: 'DIAGNOSIS_PARSE_ERROR', currentStep: 1 };
  }
}

// ==========================================
// Step 2: Knowledge Weakness Map
// ==========================================
export async function generateKnowledgeMap(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  const { diagnosis, nationality, highSchoolSystem } = state;

  if (!diagnosis) {
    return { error: 'MISSING_DIAGNOSIS', currentStep: 2 };
  }

  const subject = diagnosis.requiredSubjects[0] || '数学';

  // Generate knowledge map for the first subject
  const prompt = `You are a CSCA knowledge map expert. Based on the ${subject} exam syllabus, generate a mastery assessment framework with 48 knowledge points.
  
Syllabus requirements:
- ${subject} exam covers fundamental to advanced topics
- Focus on key concepts and common weak points

Candidate Background:
- Nationality: ${nationality}
- High School System: ${highSchoolSystem}

Mark common weak points for this student demographic.

Output Format (JSON):
{
  "subject": "${subject}",
  "topics": [
    {
      "name": "Topic Name",
      "description": "Brief description",
      "mastery": "mastered" | "needs_review" | "weak",
      "eloScore": 1000
    }
  ]
}`;

  const result = await generateWithFallback({
    task: 'knowledge_map',
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const knowledgeMap = JSON.parse(result.text);
    return { knowledgeMap, currentStep: 3 };
  } catch {
    return { error: 'KNOWLEDGE_MAP_PARSE_ERROR', currentStep: 2 };
  }
}

// ==========================================
// Step 3: Adaptive Exercise Generation
// ==========================================
export async function generateAdaptiveExercises(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  const { knowledgeMap } = state;

  if (!knowledgeMap) {
    return { error: 'MISSING_KNOWLEDGE_MAP', currentStep: 3 };
  }

  // Extract weak topics
  const weakTopics = knowledgeMap.topics
    .filter(t => t.mastery !== 'mastered')
    .map(t => ({
      subject: knowledgeMap.subject,
      topic: t.name,
      eloScore: t.eloScore,
    }));

  // Calculate target difficulty using ELO
  const targetDifficulty = calculateEloDifficulty(weakTopics.map(t => t.eloScore));

  // Determine exercise count
  const exerciseCount = suggestDailyPracticeCount(weakTopics.length);

  // Generate exercises
  const exercises: any[] = [];

  for (let i = 0; i < Math.min(exerciseCount, weakTopics.length); i++) {
    const topic = weakTopics[i];
    const prompt = `You are a CSCA exercise generation expert. Create 1 multiple-choice question for the "${topic.topic}" topic in ${topic.subject}, with difficulty coefficient ${targetDifficulty}.

Requirements:
1. Strictly align with CSCA exam format (single choice, 4 options)
2. Math/Physics/Chemistry can be in English
3. Chinese for science subjects must be in Chinese with English annotations
4. Include detailed explanation

Output Format (JSON):
{
  "id": "${i + 1}",
  "subject": "${topic.subject}",
  "topic": "${topic.topic}",
  "difficulty": ${targetDifficulty},
  "question": "Question text",
  "options": ["A. Option A", "B. Option B", "C. Option C", "D. Option D"],
  "correctAnswer": "A",
  "explanation": "Detailed explanation"
}`;

    const result = await generateWithFallback({
      task: 'exercise_generation',
      messages: [{ role: 'user', content: prompt }],
    });

    try {
      exercises.push(JSON.parse(result.text));
    } catch {
      console.warn(`Failed to parse exercise for ${topic.topic}`);
    }
  }

  return { exercises, currentStep: 4 };
}

// ==========================================
// Step 4: Mock Exam Generation
// ==========================================
async function generateMockExam(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  const { diagnosis } = state;

  if (!diagnosis) {
    return { error: 'MISSING_DIAGNOSIS', currentStep: 4 };
  }

  const subject = diagnosis.requiredSubjects[0] || '数学';
  const totalQuestions = 48;
  const duration = 60; // minutes

  // Generate mock exam in batches
  const batchSize = 12;
  const batches = Math.ceil(totalQuestions / batchSize);
  const questions: any[] = [];

  for (let batch = 0; batch < batches; batch++) {
    const prompt = `You are a CSCA mock exam expert. Generate ${batchSize} multiple-choice questions for ${subject}, strictly aligning with CSCA exam parameters.

Requirements:
1. Question type: Single choice with 4 options
2. Coverage: Sets/Functions/Geometry/Probability & Statistics
3. Difficulty distribution: Easy 40% / Medium 40% / Hard 20%
4. Support English version (for ASEAN candidates)

Output Format (JSON Array):
[
  {
    "id": "${batch * batchSize + 1}-${(batch + 1) * batchSize}",
    "question": "Question text",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctAnswer": "A",
    "module": "Module Name",
    "difficulty": "easy|medium|hard"
  }
]`;

    const result = await generateWithFallback({
      task: 'mock_exam',
      messages: [{ role: 'user', content: prompt }],
    });

    try {
      const batchQuestions = JSON.parse(result.text);
      questions.push(...batchQuestions);
    } catch {
      console.warn(`Failed to parse batch ${batch + 1}`);
    }
  }

  return {
    mockExam: {
      id: `MOCK-${Date.now()}`,
      subject,
      questions: questions.slice(0, totalQuestions),
      answers: {},
      totalQuestions,
      correctCount: 0,
      score: {},
    },
    currentStep: 5,
  };
}

// ==========================================
// Step 5: Score Analysis
// ==========================================
export async function analyzeScore(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  const { mockExam, nationality } = state;

  if (!mockExam) {
    return { error: 'MISSING_MOCK_EXAM', currentStep: 5 };
  }

  // Calculate module scores
  const moduleScores: Record<string, { total: number; correct: number }> = {};

  mockExam.questions.forEach(q => {
    if (!moduleScores[q.module]) {
      moduleScores[q.module] = { total: 0, correct: 0 };
    }
    moduleScores[q.module].total++;
    if (mockExam.answers[q.id] === q.correctAnswer) {
      moduleScores[q.module].correct++;
    }
  });

  // Calculate module rates
  const moduleRates: Record<string, number> = {};
  Object.entries(moduleScores).forEach(([module, scores]) => {
    moduleRates[module] = Math.round((scores.correct / scores.total) * 100);
  });

  // Calculate total score
  const totalScore = Math.round(
    Object.values(moduleScores).reduce((sum, s) => sum + s.correct, 0) / mockExam.totalQuestions * 100
  );

  // Generate analysis report using Kimi
  const prompt = `You are a CSCA score analysis expert. Generate a multi-dimensional analysis report and 7-day sprint plan based on the mock exam results.

Candidate Info:
- Nationality: ${nationality}
- Subject: ${mockExam.subject}
- Total Score: ${totalScore}/100
- Module Scores: ${JSON.stringify(moduleRates)}

Requirements:
1. Compare with CSCA passing score (60/100)
2. Estimate ranking among candidates from the same country
3. Top 3 weak areas
4. 7-day sprint plan (specific to each day)

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
    return { scoreAnalysis, currentStep: 6 };
  } catch {
    return {
      scoreAnalysis: {
        totalScore,
        moduleScores: moduleRates,
        rankingPercentile: Math.min(90, Math.max(10, totalScore)),
        weakPoints: Object.entries(moduleRates)
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .map(([name]) => name),
        improvementPlan: 'Focus on weak modules and practice daily.',
      },
      currentStep: 6,
    };
  }
}

// ==========================================
// Step 6: University Matching
// ==========================================
export async function matchUniversities(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  const { scoreAnalysis, targetMajor, nationality } = state;

  const prompt = `You are a CSCA university admission expert. Recommend suitable universities and scholarships based on the candidate's profile.

Candidate Info:
- Target Major: ${targetMajor}
- Nationality: ${nationality}
- Estimated CSCA Score: ${scoreAnalysis?.totalScore || 70}/100

Requirements:
1. Classify into Safe/Target/Reach schools
2. Include scholarship opportunities
3. Provide admission probability estimates

Output Format (JSON):
{
  "safeSchools": [{"name": "University", "location": "City", "probability": 0.9}],
  "targetSchools": [{"name": "University", "location": "City", "probability": 0.7}],
  "reachSchools": [{"name": "University", "location": "City", "probability": 0.4}],
  "scholarships": [{"name": "Scholarship", "description": "...", "requirements": ["..."]}]
}`;

  const result = await generateWithFallback({
    task: 'university_match',
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const universityMatch = JSON.parse(result.text);
    return { universityMatch, currentStep: 7 };
  } catch {
    return {
      universityMatch: {
        safeSchools: [
          { name: 'Local Universities', location: 'Various Cities', probability: 0.9 },
        ],
        targetSchools: [
          { name: 'Mid-tier Universities', location: 'Major Cities', probability: 0.6 },
        ],
        reachSchools: [
          { name: 'Top Universities', location: 'Beijing/Shanghai', probability: 0.3 },
        ],
        scholarships: [],
      },
      currentStep: 7,
    };
  }
}

// ==========================================
// Build and Export Workflow
// ==========================================
export const cscaWorkflow = new StateGraph<CscaAgentState>({
  channels: {
    candidateId: null,
    nationality: null,
    targetMajor: null,
    highSchoolSystem: null,
    hskLevel: null,
    preferredLanguages: null,
    diagnosis: null,
    knowledgeMap: null,
    exercises: null,
    mockExam: null,
    scoreAnalysis: null,
    universityMatch: null,
    currentStep: null,
    error: null,
  },
})
  .addNode('diagnose', diagnoseSubjects)
  .addNode('knowledge_map', generateKnowledgeMap)
  .addNode('generate_exercises', generateAdaptiveExercises)
  .addNode('mock_exam', generateMockExam)
  .addNode('score_analysis', analyzeScore)
  .addNode('university_match', matchUniversities)
  .addEdge('diagnose', 'knowledge_map')
  .addEdge('knowledge_map', 'generate_exercises')
  .addEdge('generate_exercises', 'mock_exam')
  .addEdge('mock_exam', 'score_analysis')
  .addEdge('score_analysis', 'university_match')
  .addEdge('university_match', END)
  .addEdge(START, 'diagnose');

export const cscaAgent = cscaWorkflow.compile();

// ==========================================
// Step Runner Exports for API Routes
// ==========================================
export async function runDiagnosisStep(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  return diagnoseSubjects(state);
}

export async function runKnowledgeMapStep(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  return generateKnowledgeMap(state);
}

export async function runAdaptiveExercisesStep(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  return generateAdaptiveExercises(state);
}

export async function runScoreAnalysisStep(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  return analyzeScore(state);
}

export async function runUniversityMatchStep(state: CscaAgentState): Promise<Partial<CscaAgentState>> {
  return matchUniversities(state);
}

// ==========================================
// Helper Functions
// ==========================================
export async function runCscaWorkflow(initialState: any): Promise<any> {
  const result = await cscaAgent.invoke(initialState);
  return result;
}

export async function runStep(
  state: any,
  step: number
): Promise<any> {
  const steps = ['diagnose', 'knowledge_map', 'generate_exercises', 'mock_exam', 'score_analysis', 'university_match'];
  const stepName = steps[step - 1];

  if (!stepName) {
    throw new Error(`Invalid step: ${step}`);
  }

  const result = await cscaAgent.invoke(state);
  return result;
}
