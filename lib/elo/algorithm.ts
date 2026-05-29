/**
 * ELO Algorithm for Adaptive Learning - CSCA Pilot Agent
 * 
 * Implements ELO rating system to dynamically adjust exercise difficulty
 * based on student performance and knowledge mastery.
 */

// ==========================================
// Constants
// ==========================================
const DEFAULT_ELO = 1000;
const MIN_ELO = 100;
const MAX_ELO = 2000;
const K_FACTOR = 32; // Sensitivity factor for rating changes

// ==========================================
// Types
// ==========================================
export interface EloScore {
  value: number;
  matches: number;
  wins: number;
}

export interface TopicMastery {
  subject: string;
  topic: string;
  eloScore: number;
  mastery: 'mastered' | 'needs_review' | 'weak';
}

// ==========================================
// Calculate ELO Difficulty
// ==========================================
export function calculateEloDifficulty(eloScores: number[]): number {
  if (eloScores.length === 0) return 0.5; // Default medium difficulty
  
  // Calculate average ELO score
  const avgElo = eloScores.reduce((sum, elo) => sum + elo, 0) / eloScores.length;
  
  // Normalize to difficulty range [0, 1]
  // Lower ELO = weaker topic = higher difficulty needed
  const normalized = 1 - ((avgElo - MIN_ELO) / (MAX_ELO - MIN_ELO));
  
  // Clamp between 0.1 and 0.9 to avoid extreme values
  return Math.max(0.1, Math.min(0.9, normalized));
}

// ==========================================
// Update ELO Score based on performance
// ==========================================
export function updateEloScore(
  currentElo: number,
  wasCorrect: boolean,
  difficulty: number
): number {
  // Expected score based on difficulty (higher difficulty = higher expected score for correct)
  const expectedScore = wasCorrect ? difficulty : (1 - difficulty);
  
  // Actual score
  const actualScore = wasCorrect ? 1 : 0;
  
  // ELO formula
  let newElo = currentElo + K_FACTOR * (actualScore - expectedScore);
  
  // Clamp to valid range
  newElo = Math.max(MIN_ELO, Math.min(MAX_ELO, newElo));
  
  return Math.round(newElo);
}

// ==========================================
// Determine mastery level from ELO
// ==========================================
export function getMasteryLevel(eloScore: number): 'mastered' | 'needs_review' | 'weak' {
  if (eloScore >= 1500) return 'mastered';
  if (eloScore >= 1000) return 'needs_review';
  return 'weak';
}

// ==========================================
// Generate initial topic ELO scores
// ==========================================
export function initializeTopicElo(subject: string, topics: string[]): TopicMastery[] {
  return topics.map(topic => ({
    subject,
    topic,
    eloScore: DEFAULT_ELO,
    mastery: 'needs_review',
  }));
}

// ==========================================
// Calculate overall proficiency
// ==========================================
export function calculateProficiency(topics: TopicMastery[]): number {
  if (topics.length === 0) return 0;
  
  const mastered = topics.filter(t => t.mastery === 'mastered').length;
  const needsReview = topics.filter(t => t.mastery === 'needs_review').length;
  
  return (mastered * 1.0 + needsReview * 0.5) / topics.length;
}

// ==========================================
// Suggest practice count for today
// ==========================================
export function suggestDailyPracticeCount(weakTopicsCount: number): number {
  return Math.min(15, Math.max(10, weakTopicsCount));
}
