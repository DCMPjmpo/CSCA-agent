/**
 * CSCAVoyageApp 静态数据常量
 *
 * 从 CSCAVoyageApp.tsx 中提取，以减小主组件文件体积，
 * 避免超过 Turbopack worker 的文件大小限制（>151KB 会报 Worker loader 错误）。
 */

export interface TargetMajor {
  id: string;
  name: string;
  nameEn: string;
  category: 'medical' | 'engineering' | 'business' | 'social' | 'humanities' | 'science';
}

export const TARGET_MAJORS: TargetMajor[] = [
  { id: 'medicine', name: '临床医学', nameEn: 'Clinical Medicine', category: 'medical' },
  { id: 'dentistry', name: '口腔医学', nameEn: 'Dentistry', category: 'medical' },
  { id: 'pharmacology', name: '药学', nameEn: 'Pharmacology', category: 'medical' },
  { id: 'nursing', name: '护理学', nameEn: 'Nursing', category: 'medical' },
  { id: 'public-health', name: '公共卫生', nameEn: 'Public Health', category: 'medical' },
  { id: 'biomedical', name: '生物医学', nameEn: 'Biomedical Engineering', category: 'medical' },
  { id: 'engineering', name: '工程学', nameEn: 'Engineering', category: 'engineering' },
  { id: 'computer', name: '计算机科学', nameEn: 'Computer Science', category: 'engineering' },
  { id: 'software', name: '软件工程', nameEn: 'Software Engineering', category: 'engineering' },
  { id: 'electrical', name: '电气工程', nameEn: 'Electrical Engineering', category: 'engineering' },
  { id: 'mechanical', name: '机械工程', nameEn: 'Mechanical Engineering', category: 'engineering' },
  { id: 'civil', name: '土木工程', nameEn: 'Civil Engineering', category: 'engineering' },
  { id: 'business', name: '工商管理', nameEn: 'Business Administration', category: 'business' },
  { id: 'economics', name: '经济学', nameEn: 'Economics', category: 'business' },
  { id: 'finance', name: '金融学', nameEn: 'Finance', category: 'business' },
  { id: 'marketing', name: '市场营销', nameEn: 'Marketing', category: 'business' },
  { id: 'accounting', name: '会计学', nameEn: 'Accounting', category: 'business' },
  { id: 'international', name: '国际商务', nameEn: 'International Business', category: 'business' },
  { id: 'law', name: '法学', nameEn: 'Law', category: 'social' },
  { id: 'education', name: '教育学', nameEn: 'Education', category: 'social' },
  { id: 'psychology', name: '心理学', nameEn: 'Psychology', category: 'social' },
  { id: 'sociology', name: '社会学', nameEn: 'Sociology', category: 'social' },
  { id: 'english', name: '英语语言文学', nameEn: 'English Language & Literature', category: 'humanities' },
  { id: 'chinese', name: '中国语言文学', nameEn: 'Chinese Language & Literature', category: 'humanities' },
  { id: 'history', name: '历史学', nameEn: 'History', category: 'humanities' },
  { id: 'art', name: '艺术设计', nameEn: 'Art & Design', category: 'humanities' },
  { id: 'mathematics', name: '数学', nameEn: 'Mathematics', category: 'science' },
  { id: 'physics', name: '物理学', nameEn: 'Physics', category: 'science' },
  { id: 'chemistry', name: '化学', nameEn: 'Chemistry', category: 'science' },
  { id: 'biology', name: '生物学', nameEn: 'Biology', category: 'science' },
  { id: 'environmental', name: '环境科学', nameEn: 'Environmental Science', category: 'science' },
];

export interface EducationSystem {
  id: string;
  name: string;
  nameEn: string;
}

export const EDUCATION_SYSTEMS: EducationSystem[] = [
  { id: 'ib', name: 'IB课程', nameEn: 'International Baccalaureate' },
  { id: 'a-level', name: 'A-Level', nameEn: 'A-Level' },
  { id: 'ap', name: 'AP课程', nameEn: 'Advanced Placement' },
  { id: 'high-school', name: '普通高中', nameEn: 'National High School' },
  { id: 'international', name: '国际学校', nameEn: 'International School' },
];

import type { ExamQuestionLike } from '@/lib/csca/exam-scoring';

// ===== Types extracted from CSCAVoyageApp.tsx (to keep main file under Turbopack 151KB limit) =====

export interface ScoreAnalysisResult {
    totalScore: number;
    moduleScores: Record<string, number>;
    rankingPercentile?: number;
    weakPoints: string[];
    improvementPlan: string;
}

export interface DiagnosisResult {
    requiredSubjects: string[];
    recommendedSubjects: string[];
    subjectPriorities: Record<string, number>;
    estimatedDays: number;
}

export interface AdaptiveExercise {
    id: string;
    question: string;
    options: string[];
    answer: number;
    difficulty: number;
    topic: string;
    subject: string;
    explanation?: string;
    knowledgePoint?: string;
}

export interface ExamQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    difficulty: string;
    module: string;
    subject: string;
    type?: string;
    answerExplanation?: string;
    englishTerm?: string;
    knowledgePoint?: string;
}

export interface ExamResult {
    score: number;
    total: number;
    breakdown: Record<string, number>;
    correctCount: number;
    answers: Record<string, number | string>;
    wrongQuestions: ExamQuestionLike[];
}

export interface UniversityMatch {
    name: string;
    nameZh: string;
    rank?: number;
    matchScore: number;
    probability: number;
    requirements: string[];
    location: string;
    type: string;
    description: string;
}

export interface UniversityCategory {
    title: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    universities: UniversityMatch[];
}

export type Step =
    | 'diagnosis'
    | 'knowledge_map'
    | 'adaptive_learning'
    | 'exam_center'
    | 'exam'
    | 'result'
    | 'error_review'
    | 'study_plan'
    | 'university_match'
    | 'ai_tutor';