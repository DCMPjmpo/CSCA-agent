import type { Question } from './question-bank';
export type { Question };

export interface AuditResult {
  isValid: boolean;
  issues: string[];
  confidence: number;
  suggestion?: string;
  correctedQuestion?: string;
  correctedOptions?: any;
}

export function auditQuestion(question: Question): AuditResult {
  return {
    isValid: true,
    issues: [],
    confidence: 1.0,
  };
}

export function auditQuestions(questions: Question[]) {
  return {
    validQuestions: questions,
    invalidQuestions: [],
    auditResults: questions.map(() => ({
      isValid: true,
      issues: [],
      confidence: 1.0,
    })),
    stats: {
      total: questions.length,
      valid: questions.length,
      invalid: 0,
      avgConfidence: 1.0,
    },
  };
}

export function fixQuestion(question: Question): Question {
  return question;
}