/**
 * CSCA learning session persistence (localStorage)
 */

const SESSION_KEY = 'csca_learning_session';

export interface CscaSessionData {
  currentStep: string;
  activeStep: number;
  diagnosisResult?: {
    requiredSubjects: string[];
    recommendedSubjects: string[];
    subjectPriorities: Record<string, number>;
    estimatedDays: number;
  } | null;
  selectedSubjects: string[];
  selectedCountryCode: string;
  targetMajorId: string;
  hskLevel: number;
  locale: string;
  examScore?: number;
  updatedAt: number;
}

export function saveCscaSession(data: Partial<CscaSessionData>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadCscaSession();
    const merged: CscaSessionData = {
      currentStep: 'diagnosis',
      activeStep: 0,
      selectedSubjects: ['数学'],
      selectedCountryCode: 'TH',
      targetMajorId: 'engineering',
      hskLevel: 4,
      locale: 'th',
      updatedAt: Date.now(),
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(merged));
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
