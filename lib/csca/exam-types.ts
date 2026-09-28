/**
 * Shared exam question types used across CSCA API routes and components.
 */

/** A question as returned by the mock exam / exam generation pipeline. */
export interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string | number;
  module?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  subject?: string;
  answerExplanation?: string;
  englishTerm?: string;
  source?: string;
  auditIssues?: string[];
  [key: string]: unknown;
}

/** Result of auditing a batch of exam questions. */
export interface AuditFilterResult {
  valid: ExamQuestion[];
  invalid: ExamQuestion[];
}

/** University match category. */
export interface MatchedUniversity {
  id: string;
  name: string;
  nameZh: string;
  type: string;
  location: string;
  matchScore: number;
  majors: string[];
  scholarship?: string;
  rank: number;
  probability?: number;
  [key: string]: unknown;
}
