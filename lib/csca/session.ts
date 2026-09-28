/**
 * CSCA learning session persistence (localStorage)
 */

const SESSION_KEY = 'csca_learning_session';

/** 题目级答题历史记录（Phase E+ 新增，用于 Knowledge Map + Selector） */
export interface AnswerRecord {
  questionId: string;
  subject: string;
  knowledgePoint?: string;
  module?: string;
  isCorrect: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  mode: 'practice' | 'exam' | 'wrong_answer_practice';
  targetMajor?: string;
  timestamp: number;
}

export interface CscaSessionData {
  currentStep: string;
  activeStep: number;
  /** 已完成阶段索引列表（0-based）。新用户为空数组。 */
  completedStages?: number[];
  diagnosisResult?: {
    requiredSubjects: string[];
    recommendedSubjects: string[];
    subjectPriorities: Record<string, number>;
    estimatedDays: number;
  } | null;
  selectedSubjects?: string[];
  selectedCountryCode?: string;
  targetMajorId?: string;
  hskLevel?: number;
  locale?: string;
  examScore?: number;
  /** Phase E+: 题目级答题历史（持久化，刷新不丢失） */
  answerHistory?: AnswerRecord[];
  updatedAt: number;
}

export function saveCscaSession(data: Partial<CscaSessionData>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadCscaSession();
    const merged: CscaSessionData = {
      currentStep: 'diagnosis',
      activeStep: 0,
      completedStages: [],
      answerHistory: [],
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(merged));
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('cscaSessionSaved', { detail: merged }));
      } catch {
        /* old browsers may lack CustomEvent */
      }
    }
  } catch {
    /* ignore quota errors */
  }
}

export function loadCscaSession(): CscaSessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as CscaSessionData) : null;
  } catch {
    return null;
  }
}

export function clearCscaSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Phase E+: 追加答题历史记录到 session
 * 保留最近 500 条（防止 localStorage 膨胀）
 */
export function appendAnswerRecords(records: AnswerRecord[]): void {
  if (typeof window === 'undefined' || records.length === 0) return;
  const existing = loadCscaSession();
  const current = Array.isArray(existing?.answerHistory) ? existing!.answerHistory! : [];
  const merged = [...current, ...records].slice(-500);
  saveCscaSession({ answerHistory: merged });
}
