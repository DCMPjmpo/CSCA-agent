'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CSCA_AGENTS } from '@/lib/csca/agents';
import { CSCA_SUBJECTS, getSubjectConfig } from '@/lib/csca/exam-config';
import { saveErrorRecord, getErrorRecords, getAIErrorExplanation, analyzeWeakAreas, generateStudyPlan, saveStudyPlan, getStudyPlan, markTaskCompleted } from '@/lib/csca/error-analysis';
import { useTranslation } from '@/lib/i18n/hooks';
import { localeFromCountryCode } from '@/lib/csca/locale';
import { CscaLanguageSwitcher } from '@/components/csca/CscaLanguageSwitcher';
import { KnowledgeGraphView, type KnowledgeMapItem } from '@/components/csca/KnowledgeGraphView';
import { saveCscaSession, loadCscaSession } from '@/lib/csca/session';

interface ScoreAnalysisResult {
    totalScore: number;
    moduleScores: Record<string, number>;
    rankingPercentile?: number;
    weakPoints: string[];
    improvementPlan: string;
}

interface DiagnosisResult {
    requiredSubjects: string[];
    recommendedSubjects: string[];
    subjectPriorities: Record<string, number>;
    estimatedDays: number;
}

interface AdaptiveExercise {
    id: string;
    question: string;
    options: string[];
    answer: number;
    difficulty: number;
    topic: string;
    subject: string;
    explanation?: string;
}

interface ExamQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    difficulty: string;
    module: string;
    subject: string;
    answerExplanation?: string;
    englishTerm?: string;
}

interface ExamResult {
    score: number;
    total: number;
    breakdown: Record<string, number>;
    correctCount: number;
    answers: Record<string, number>;
    wrongQuestions: ExamQuestion[];
}

interface UserAnswer {
    questionId: string;
    question: string;
    subject: string;
    module: string;
    userAnswer: string | number;
    correctAnswer: string | number;
    isCorrect: boolean;
    timestamp: number;
}

interface UniversityMatch {
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

interface UniversityCategory {
    title: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    universities: UniversityMatch[];
}

interface StudyPlan {
    id: string;
    userId: string;
    createdAt: number;
    targetSubjects: string[];
    weakAreas: { subject: string; module: string; errorCount: number; accuracy: number; priority: 'high' | 'medium' | 'low' }[];
    dailyGoals: { id: string; subject: string; module: string; tasks: { id: string; type: string; description: string; completed: boolean }[]; completed: boolean }[];
    weeklyGoals: { id: string; weekNumber: number; goals: { id: string; description: string; subject: string; targetScore: number; completed: boolean }[]; completed: boolean }[];
    progress: number;
}

type Step =
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

const ASEAN_COUNTRIES = [
    { code: 'TH', name: '泰国', flag: '🇹🇭', hskRequirement: 4 },
    { code: 'VN', name: '越南', flag: '🇻🇳', hskRequirement: 4 },
    { code: 'MY', name: '马来西亚', flag: '🇲🇾', hskRequirement: 4 },
    { code: 'ID', name: '印度尼西亚', flag: '🇮🇩', hskRequirement: 4 },
    { code: 'PH', name: '菲律宾', flag: '🇵🇭', hskRequirement: 4 },
    { code: 'SG', name: '新加坡', flag: '🇸🇬', hskRequirement: 3 },
    { code: 'BN', name: '文莱', flag: '🇧🇳', hskRequirement: 4 },
    { code: 'KH', name: '柬埔寨', flag: '🇰🇭', hskRequirement: 4 },
    { code: 'LA', name: '老挝', flag: '🇱🇦', hskRequirement: 4 },
    { code: 'MM', name: '缅甸', flag: '🇲🇲', hskRequirement: 4 },
];

const TARGET_MAJORS = [
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

const EDUCATION_SYSTEMS = [
    { id: 'ib', name: 'IB课程', nameEn: 'International Baccalaureate' },
    { id: 'a-level', name: 'A-Level', nameEn: 'A-Level' },
    { id: 'ap', name: 'AP课程', nameEn: 'Advanced Placement' },
    { id: 'high-school', name: '普通高中', nameEn: 'National High School' },
    { id: 'international', name: '国际学校', nameEn: 'International School' },
];

const STEP_DEFS: { id: Step; icon: string }[] = [
    { id: 'diagnosis', icon: '🔍' },
    { id: 'knowledge_map', icon: '🗺️' },
    { id: 'adaptive_learning', icon: '🎯' },
    { id: 'exam_center', icon: '📋' },
    { id: 'exam', icon: '✏️' },
    { id: 'result', icon: '📊' },
    { id: 'error_review', icon: '❌' },
    { id: 'study_plan', icon: '📅' },
    { id: 'university_match', icon: '🏛️' },
];

const EXAM_MODE_CONFIG = [
    { id: 'full', color: 'bg-indigo-600' },
    { id: 'practice', color: 'bg-green-600' },
];

export default function CSCAPage() {
    const { t, locale, changeLocale } = useTranslation();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>('diagnosis');
    const [activeStep, setActiveStep] = useState(0);
    
    useEffect(() => {
        const hash = window.location.hash.slice(1);
        if (hash === 'knowledge-map') {
            setCurrentStep('knowledge_map');
            setActiveStep(1);
        } else if (hash === 'adaptive-learning') {
            setCurrentStep('adaptive_learning');
            setActiveStep(2);
        } else if (hash === 'mock-exam') {
            setCurrentStep('exam_center');
            setActiveStep(3);
        } else if (hash === 'score-analysis') {
            setCurrentStep('result');
            setActiveStep(5);
        } else if (hash === 'study-plan') {
            setCurrentStep('study_plan');
            setActiveStep(7);
        }
    }, []);
    const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
    const [knowledgeMap, setKnowledgeMap] = useState<KnowledgeMapItem[]>([]);
    const [adaptiveExercises, setAdaptiveExercises] = useState<AdaptiveExercise[]>([]);
    const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
    const [exerciseAnswers, setExerciseAnswers] = useState<Record<string, number>>({});
    const [showExerciseExplanation, setShowExerciseExplanation] = useState(false);

    const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
    const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
    const [examResult, setExamResult] = useState<ExamResult | null>(null);
    const [examMode, setExamMode] = useState('full');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['数学']);
    const [selectedCountry, setSelectedCountry] = useState(ASEAN_COUNTRIES[0]);
    const [hskLevel, setHskLevel] = useState(4);
    const [targetMajor, setTargetMajor] = useState(TARGET_MAJORS[0]);
    const [educationSystem, setEducationSystem] = useState(EDUCATION_SYSTEMS[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [examStarted, setExamStarted] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [universityCategories, setUniversityCategories] = useState<UniversityCategory[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<any>(null);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [errorRecords, setErrorRecords] = useState<any[]>([]);
    const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
    const [aiExplanation, setAiExplanation] = useState<string>('');
    const [showExplanation, setShowExplanation] = useState(false);
    const [currentErrorQuestion, setCurrentErrorQuestion] = useState<ExamQuestion | null>(null);
    const [scoreAnalysis, setScoreAnalysis] = useState<ScoreAnalysisResult | null>(null);
    const [tutorQuestion, setTutorQuestion] = useState<string>('');
    const [tutorAnswer, setTutorAnswer] = useState<string>('');
    const [isTutorLoading, setIsTutorLoading] = useState(false);

    const STEPS = STEP_DEFS.map((s) => ({
        ...s,
        title:
            s.id === 'diagnosis' ? t.steps.diagnosis :
                s.id === 'knowledge_map' ? t.steps.knowledgeMap :
                    s.id === 'adaptive_learning' ? t.steps.adaptiveLearning :
                        s.id === 'exam_center' || s.id === 'exam' ? t.steps.mockExam :
                            s.id === 'result' ? t.steps.scoreAnalysis :
                                s.id === 'university_match' ? t.steps.universityMatch :
                                    s.id === 'error_review' ? t.flow.errorReview :
                                        t.flow.studyPlan,
        description:
            s.id === 'diagnosis' ? t.diagnosis.description :
                s.id === 'knowledge_map' ? t.knowledgeMap.description :
                    s.id === 'adaptive_learning' ? t.adaptiveLearning.description :
                        s.id === 'exam_center' || s.id === 'exam' ? t.mockExam.description :
                            s.id === 'result' ? t.scoreAnalysis.description :
                                s.id === 'university_match' ? t.universityMatch.description :
                                    '',
    }));

    useEffect(() => {
        setErrorRecords(getErrorRecords());
        const plan = getStudyPlan();
        if (plan) setStudyPlan(plan);
        const savedLocale = localStorage.getItem('csca_locale');
        if (!savedLocale) {
            changeLocale(localeFromCountryCode(selectedCountry.code));
        }
        const session = loadCscaSession();
        if (session) {
            if (session.diagnosisResult) setDiagnosisResult(session.diagnosisResult);
            if (session.selectedSubjects?.length) setSelectedSubjects(session.selectedSubjects);
            const country = ASEAN_COUNTRIES.find((c) => c.code === session.selectedCountryCode);
            if (country) setSelectedCountry(country);
            const major = TARGET_MAJORS.find((m) => m.id === session.targetMajorId);
            if (major) setTargetMajor(major);
            if (session.hskLevel) setHskLevel(session.hskLevel);
            if (session.currentStep) setCurrentStep(session.currentStep as Step);
            if (session.activeStep !== undefined) setActiveStep(session.activeStep);
        }
    }, []);

    useEffect(() => {
        saveCscaSession({
            currentStep,
            activeStep,
            diagnosisResult: diagnosisResult ?? undefined,
            selectedSubjects,
            selectedCountryCode: selectedCountry.code,
            targetMajorId: targetMajor.id,
            hskLevel,
            locale,
            examScore: examResult?.score,
        });
    }, [currentStep, activeStep, diagnosisResult, selectedSubjects, selectedCountry, targetMajor, hskLevel, locale, examResult]);

    const onCountrySelect = useCallback((country: typeof ASEAN_COUNTRIES[0]) => {
        setSelectedCountry(country);
        changeLocale(localeFromCountryCode(country.code));
    }, [changeLocale]);

    useEffect(() => {
        let timer: number | undefined;
        if (timeRemaining > 0 && examStarted) {
            timer = window.setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        handleSubmitExam();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [timeRemaining, examStarted]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDiagnosis = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/csca/diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetMajor: targetMajor.nameEn,
                    highSchoolSystem: educationSystem.nameEn,
                    hskLevel: hskLevel,
                    nationality: selectedCountry.name,
                    countryCode: selectedCountry.code,
                    locale,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setDiagnosisResult(data.data);
                const subjects = data.data.requiredSubjects ?? ['数学'];
                setSelectedSubjects(subjects);
                setActiveStep(1);
                setCurrentStep('knowledge_map');
                await loadKnowledgeMap(data.data, subjects);
            }
        } catch (error) {
            console.error('Diagnosis error:', error);
            const fallback = {
                requiredSubjects: ['理科中文', '数学', '物理', '基础汉语'],
                recommendedSubjects: ['化学'],
                subjectPriorities: { '理科中文': 1, '数学': 2, '物理': 3, '基础汉语': 4 },
                estimatedDays: 90,
            };
            setDiagnosisResult(fallback);
            setSelectedSubjects(fallback.requiredSubjects);
            setActiveStep(1);
            setCurrentStep('knowledge_map');
            await loadKnowledgeMap(fallback, fallback.requiredSubjects);
        } finally {
            setIsLoading(false);
        }
    };

    const loadKnowledgeMap = async (diagnosis: DiagnosisResult, subjects: string[]) => {
        try {
            const res = await fetch('/api/csca/knowledge-map', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjects,
                    diagnosis,
                    nationality: selectedCountry.name,
                    targetMajor: targetMajor.nameEn,
                    highSchoolSystem: educationSystem.nameEn,
                    hskLevel,
                    countryCode: selectedCountry.code,
                    locale,
                }),
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setKnowledgeMap(data.data);
            }
        } catch (e) {
            console.error('Knowledge map error:', e);
        }
    };

    const handleLoadAdaptiveExercises = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/csca/adaptive-learning', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    knowledgeMap,
                    subjects: selectedSubjects,
                    diagnosis: diagnosisResult,
                    nationality: selectedCountry.name,
                    targetMajor: targetMajor.nameEn,
                    highSchoolSystem: educationSystem.nameEn,
                    hskLevel,
                    locale,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setAdaptiveExercises(data.data);
                setCurrentExerciseIdx(0);
                setExerciseAnswers({});
                setActiveStep(2);
                setCurrentStep('adaptive_learning');
            }
        } catch (e) {
            console.error('Adaptive learning error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadExamQuestions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/csca/mock-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjects: selectedSubjects,
                    questionCount: null,
                    mode: examMode,
                }),
            });
            const data = await res.json();
            if (data.success) {
                const config = getSubjectConfig(selectedSubjects[0]);
                // 练习模式不限时间，设置为-1表示无时间限制
                const duration = examMode === 'practice' ? -1 : (config?.duration || 90);
                setTimeRemaining(examMode === 'practice' ? -1 : (duration * 60));
                setExamQuestions(data.data);
                setExamAnswers({});
                setExamResult(null);
                setExamStarted(true);
                setActiveStep(4);
                setCurrentStep('exam');
            }
        } catch (error) {
            console.error('Mock exam load error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerSelect = (questionId: string, answerIndex: number) => {
        setExamAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    };

    const handleSubmitExam = async () => {
        setExamStarted(false);
        let correctCount = 0;
        const subjectScores: Record<string, { correct: number; total: number }> = {};
        const wrongQuestions: ExamQuestion[] = [];
        const userAnswers: UserAnswer[] = [];

        examQuestions.forEach(q => {
            if (!subjectScores[q.subject]) {
                subjectScores[q.subject] = { correct: 0, total: 0 };
            }
            subjectScores[q.subject].total++;

            const userAnswer = examAnswers[q.id];
            const isCorrect = userAnswer === q.correctAnswer;

            userAnswers.push({
                questionId: q.id,
                question: q.question,
                subject: q.subject,
                module: q.module,
                userAnswer: userAnswer ?? '未作答',
                correctAnswer: q.correctAnswer,
                isCorrect,
                timestamp: Date.now(),
            });

            if (isCorrect) {
                correctCount++;
                subjectScores[q.subject].correct++;
            } else {
                wrongQuestions.push(q);
                saveErrorRecord({
                    questionId: q.id,
                    question: q.question,
                    subject: q.subject,
                    module: q.module,
                    userAnswer: userAnswer ?? '未作答',
                    correctAnswer: q.correctAnswer,
                    timestamp: Date.now(),
                    reviewCount: 0,
                });
            }
        });

        const score = Math.round((correctCount / examQuestions.length) * 100);
        const breakdown: Record<string, number> = {};

        Object.entries(subjectScores).forEach(([subject, stats]) => {
            breakdown[subject] = Math.round((stats.correct / stats.total) * 100);
        });

        setExamResult({ score, total: 100, breakdown, correctCount, answers: examAnswers, wrongQuestions });
        setErrorRecords(getErrorRecords());

        const weakAreas = analyzeWeakAreas(userAnswers);
        const plan = generateStudyPlan('user-1', selectedSubjects, weakAreas);
        saveStudyPlan(plan);
        setStudyPlan(plan);

        setActiveStep(5);
        setCurrentStep('result');

        const answersForApi: Record<string, string | number> = {};
        examQuestions.forEach((q) => {
            const ans = examAnswers[q.id];
            if (ans !== undefined) {
                answersForApi[q.id] = ans;
            }
        });

        try {
            const res = await fetch('/api/csca/score-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mockExam: {
                        subject: selectedSubjects[0],
                        questions: examQuestions.map((q) => ({
                            id: q.id,
                            module: q.module,
                            correctAnswer: q.correctAnswer,
                        })),
                        answers: answersForApi,
                    },
                    nationality: selectedCountry.name,
                    targetMajor: targetMajor.nameEn,
                    locale,
                }),
            });
            const data = await res.json();
            if (data.success && data.data) {
                setScoreAnalysis(data.data);
            }
        } catch (e) {
            console.error('Score analysis error:', e);
            setScoreAnalysis({
                totalScore: score,
                moduleScores: breakdown,
                rankingPercentile: Math.min(90, Math.max(10, score)),
                weakPoints: Object.entries(breakdown)
                    .sort((a, b) => a[1] - b[1])
                    .slice(0, 3)
                    .map(([s]) => s),
                improvementPlan: score >= 60
                    ? '继续保持，针对薄弱模块每日练习。'
                    : '建议7天基础巩固后再进行模考。',
            });
        }
    };

    const handleGetAIExplanation = async (questionOrRecord: ExamQuestion | any) => {
        const isQuestion = 'options' in questionOrRecord;
        const questionText = questionOrRecord.question;
        const correctAnswer = questionOrRecord.correctAnswer;
        const subject = questionOrRecord.subject;
        const module = questionOrRecord.module;
        const userAnswer = isQuestion 
            ? (examAnswers[questionOrRecord.id] ?? '未作答') 
            : (questionOrRecord.userAnswer ?? '未作答');
        
        // 设置当前错题用于弹窗显示
        setCurrentErrorQuestion(isQuestion ? questionOrRecord : null);
        setIsLoading(true);
        try {
            const explanation = await getAIErrorExplanation(
                questionText,
                userAnswer,
                correctAnswer,
                subject,
                module,
                locale,
            );
            setAiExplanation(explanation);
            setShowExplanation(true);
        } catch (error) {
            console.error('AI explanation error:', error);
            const answerText = typeof correctAnswer === 'number' ? String.fromCharCode(65 + correctAnswer) : correctAnswer;
            setAiExplanation('抱歉，AI讲解暂时不可用。正确答案是: ' + answerText);
            setShowExplanation(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUniversityMatch = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/csca/university-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetMajor: targetMajor.nameEn,
                    score: examResult?.score || 0,
                    nationality: selectedCountry.name,
                    countryCode: selectedCountry.code,
                    locale,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setUniversityCategories([
                    {
                        title: '冲刺院校',
                        description: '录取概率较低，但值得冲刺尝试',
                        color: 'text-red-400',
                        bgColor: 'bg-red-50',
                        borderColor: 'border-red-200',
                        universities: data.data.reachSchools.map((u: any, i: number) => ({ ...u, rank: i + 1 })),
                    },
                    {
                        title: '目标院校',
                        description: '录取概率适中，是主要申请目标',
                        color: 'text-yellow-500',
                        bgColor: 'bg-yellow-50',
                        borderColor: 'border-yellow-200',
                        universities: data.data.targetSchools.map((u: any, i: number) => ({ ...u, rank: i + 1 })),
                    },
                    {
                        title: '稳妥院校',
                        description: '录取概率较高，保底选择',
                        color: 'text-green-500',
                        bgColor: 'bg-green-50',
                        borderColor: 'border-green-200',
                        universities: data.data.safeSchools.map((u: any, i: number) => ({ ...u, rank: i + 1 })),
                    },
                ]);
            }
        } catch (error) {
            console.error('University match error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAskTutor = async (question: string) => {
        if (!question.trim()) return;
        
        setIsTutorLoading(true);
        setTutorQuestion(question);
        setTutorAnswer('');
        
        try {
            const res = await fetch('/api/csca/ask-tutor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question.trim(),
                    targetMajor: targetMajor.name,
                    nationality: selectedCountry.name,
                    hskLevel,
                    examScore: examResult?.score || 0,
                    locale,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setTutorAnswer(data.answer);
            } else {
                setTutorAnswer('抱歉，暂时无法回答您的问题。请稍后再试。');
            }
        } catch (error) {
            console.error('Tutor API error:', error);
            setTutorAnswer(`
根据您的问题，以下是一些建议：

📚 学习建议：
- 建议每天保持2-3小时的学习时间
- 重点复习薄弱科目：${selectedSubjects.join('、')}
- 定期进行模拟测试，检验学习效果

🎯 备考策略：
- 制定系统的学习计划
- 针对错题进行专项练习
- 多做真题，熟悉考试形式

如有其他问题，请随时提问！
            `.trim());
        } finally {
            setIsTutorLoading(false);
        }
    };

    const handleGenerateClassroomFromErrors = async () => {
        const errors = getErrorRecords();
        if (errors.length === 0) {
            alert('暂无错题记录，请先完成诊断测试或模拟考试');
            return;
        }
        
        const weakSubjects = [...new Set(errors.map((e: any) => e.subject))];
        const weakModules = [...new Set(errors.map((e: any) => e.module))];
        
        const requirement = `根据以下错题记录生成针对性学习课堂：
        
【薄弱科目】：${weakSubjects.join('、')}
【薄弱知识点】：${weakModules.join('、')}
【错题数量】：${errors.length}道

请生成一个完整的学习课堂，包括：
1. 幻灯片讲解：针对薄弱知识点进行详细讲解
2. 测验题目：生成相关练习题进行巩固
3. 交互式模拟：提供实践操作练习
4. 学习建议：基于错误分析提供学习建议

目标专业：${targetMajor.name}
HSK水平：HSK${hskLevel}
教育背景：${educationSystem.name}`;

        const session = {
            sessionId: `session-${Date.now()}`,
            requirements: {
                requirement: requirement.trim(),
                webSearch: false,
            },
            pdfText: '',
            currentStep: 'generating',
            previewPhase: 'preparing' as const,
        };
        
        sessionStorage.setItem('generationSession', JSON.stringify(session));
        router.push('/generation-preview');
    };

    const handleTaskComplete = (taskId: string) => {
        markTaskCompleted(taskId);
        setStudyPlan(getStudyPlan());
    };

    const handleAgentClick = (agent: any) => {
        setSelectedAgent(agent);
        setShowAgentModal(true);
    };

    const handleSubjectToggle = (subject: string) => {
        setSelectedSubjects(prev => {
            if (prev.includes(subject)) {
                return prev.filter(s => s !== subject);
            }
            return [...prev, subject];
        });
    };

    const renderContent = () => {
        switch (currentStep) {
            case 'diagnosis':
                return (<div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">{t.flow.candidateInfo}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">{t.flow.aseanCountries}</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {ASEAN_COUNTRIES.map((country) => (<button key={country.code} onClick={() => onCountrySelect(country)} className={`p-3 rounded-lg text-center transition-all ${selectedCountry.code === country.code
                                        ? 'bg-indigo-600 text-white scale-105'
                                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>
                                        <div className="text-2xl mb-1">{country.flag}</div>
                                        <div className="text-xs">{country.name}</div>
                                    </button>))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">{t.diagnosis.hskLevel}</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {[1, 2, 3, 4, 5, 6].map((level) => (<button key={level} onClick={() => setHskLevel(level)} className={`p-3 rounded-lg text-center transition-all ${hskLevel === level
                                        ? 'bg-indigo-600 text-white scale-105'
                                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>
                                        <div className="font-bold">HSK {level}</div>
                                    </button>))}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-700">
                                <div className="mb-4">
                                    <label className="text-sm text-slate-400 mb-2 block">{t.diagnosis.targetMajor}</label>
                                    <div className="space-y-3">
                                        {[
                                            { category: 'medical', label: '医学类', color: 'text-red-400' },
                                            { category: 'engineering', label: '工程类', color: 'text-blue-400' },
                                            { category: 'business', label: '商科类', color: 'text-green-400' },
                                            { category: 'social', label: '社科类', color: 'text-purple-400' },
                                            { category: 'humanities', label: '人文类', color: 'text-yellow-400' },
                                            { category: 'science', label: '理科类', color: 'text-cyan-400' },
                                        ].map((cat) => (<div key={cat.category}>
                                            <span className={`text-xs ${cat.color} mb-1 block`}>{cat.label}</span>
                                            <div className="flex flex-wrap gap-2">
                                                {TARGET_MAJORS.filter(m => m.category === cat.category).map((major) => (<button key={major.id} onClick={() => setTargetMajor(major)} className={`px-3 py-2 rounded-lg text-sm transition-all ${targetMajor.id === major.id
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>
                                                    {major.name}
                                                </button>))}
                                            </div>
                                        </div>))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">{t.diagnosis.highSchoolSystem}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {EDUCATION_SYSTEMS.map((system) => (<button key={system.id} onClick={() => setEducationSystem(system)} className={`px-3 py-2 rounded-lg text-sm transition-all ${educationSystem.id === system.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>
                                            {system.name}
                                        </button>))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500 text-center">{t.flow.languageHint}</p>
                    <button onClick={handleDiagnosis} disabled={isLoading} className="w-full py-3.5 bg-white text-zinc-900 font-medium rounded-xl hover:bg-zinc-100 disabled:opacity-50 transition-all">
                        {isLoading ? t.common.loading : t.diagnosis.start}
                    </button>
                </div>);

            case 'knowledge_map':
                return (<div className="space-y-6">
                    {diagnosisResult && (
                        <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-2">{t.diagnosis.resultTitle}</h4>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {diagnosisResult.requiredSubjects.map((s) => (
                                    <span key={s} className="px-2 py-1 bg-indigo-600/40 text-indigo-200 rounded text-xs">{s}</span>
                                ))}
                            </div>
                            <p className="text-indigo-200 text-sm">
                                {t.diagnosis.estimatedDays}: {diagnosisResult.estimatedDays} {t.flow.daysUnit}
                            </p>
                        </div>
                    )}
                    <div className="bg-slate-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">{t.knowledgeMap.title}</h3>
                        <p className="text-sm text-slate-400 mb-4">{t.knowledgeMap.description}</p>
                        {knowledgeMap.length > 0 ? (
                            <KnowledgeGraphView topics={knowledgeMap} locale={locale} />
                        ) : (
                            <p className="text-slate-400 text-center py-8">{t.common.loading}</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { setActiveStep(0); setCurrentStep('diagnosis'); }} className="py-4 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all">
                            ← {t.common.back}
                        </button>
                        <button onClick={handleLoadAdaptiveExercises} disabled={isLoading || knowledgeMap.length === 0} className="py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all">
                            {isLoading ? t.common.loading : `${t.adaptiveLearning.generate} →`}
                        </button>
                    </div>
                </div>);

            case 'adaptive_learning':
                const currentEx = adaptiveExercises[currentExerciseIdx];
                return (<div className="space-y-6">
                    {currentEx ? (<>
                        <div className="bg-slate-800/50 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded">{currentEx.subject}</span>
                                <span className="text-sm text-slate-400">{currentExerciseIdx + 1}/{adaptiveExercises.length}</span>
                            </div>
                            <p className="text-white mb-4">{currentEx.question}</p>
                            <div className="grid grid-cols-2 gap-2">
                                {currentEx.options.map((opt, optIdx) => (
                                    <button key={optIdx} onClick={() => setExerciseAnswers(prev => ({ ...prev, [currentEx.id]: optIdx }))} className={`p-3 rounded-lg text-left transition-all ${exerciseAnswers[currentEx.id] === optIdx ? 'bg-indigo-600/30 border-2 border-indigo-500 text-indigo-200' : 'bg-slate-700/50 border-2 border-transparent text-slate-300 hover:border-slate-500'}`}>
                                        <span className="font-semibold mr-2">{String.fromCharCode(65 + optIdx)}.</span>{opt}
                                    </button>
                                ))}
                            </div>
                            {showExerciseExplanation && currentEx.explanation && (
                                <div className="mt-4 p-4 bg-indigo-900/30 border border-indigo-700/50 rounded-lg text-indigo-200 text-sm">
                                    {currentEx.explanation}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => {
                                const selected = exerciseAnswers[currentEx.id];
                                if (selected === undefined) return;
                                setShowExerciseExplanation(true);
                            }} disabled={exerciseAnswers[currentEx.id] === undefined} className="py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 disabled:opacity-50">
                                {t.adaptiveLearning.explanation}
                            </button>
                            <button onClick={() => {
                                setShowExerciseExplanation(false);
                                if (currentExerciseIdx < adaptiveExercises.length - 1) {
                                    setCurrentExerciseIdx(i => i + 1);
                                } else {
                                    setActiveStep(3);
                                    setCurrentStep('exam_center');
                                }
                            }} className="py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500">
                                {currentExerciseIdx < adaptiveExercises.length - 1 ? t.adaptiveLearning.next : t.mockExam.start}
                            </button>
                        </div>
                    </>) : (
                        <p className="text-slate-400 text-center py-8">{t.common.loading}</p>
                    )}
                    <button onClick={() => { setActiveStep(3); setCurrentStep('exam_center'); }} className="w-full py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700">
                        {t.mockExam.start} →
                    </button>
                </div>);

            case 'exam_center':
                return (<div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">选择考试科目</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {CSCA_SUBJECTS.map((subject) => (<button key={subject.id} onClick={() => handleSubjectToggle(subject.name)} className={`p-4 rounded-xl text-left transition-all ${selectedSubjects.includes(subject.name)
                                ? 'bg-indigo-600/30 border-2 border-indigo-500'
                                : 'bg-slate-700/50 border-2 border-transparent hover:border-slate-500'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-medium">{subject.name}</span>
                                    {selectedSubjects.includes(subject.name) && (<span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white">✓</span>)}
                                </div>
                                <div className="text-sm text-slate-400">
                                    {subject.totalQuestions}题 / {subject.duration}分钟
                                </div>
                            </button>))}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">{t.mockExam.examMode}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {EXAM_MODE_CONFIG.map((mode) => (<button key={mode.id} onClick={() => setExamMode(mode.id)} className={`p-4 rounded-xl text-left transition-all ${examMode === mode.id
                                ? `${mode.color}/30 border-2 ${mode.color}`
                                : 'bg-slate-700/50 border-2 border-transparent hover:border-slate-500'}`}>
                                <div className="text-white font-medium mb-1">{mode.id === 'full' ? t.mockExam.fullMode : t.mockExam.practiceMode}</div>
                                <div className="text-sm text-slate-400">{mode.id === 'full' ? t.mockExam.fullDescription : t.mockExam.practiceDescription}</div>
                            </button>))}
                        </div>
                    </div>

                    <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-4">
                        <h4 className="text-white font-medium mb-2">📌 {t.mockExam.examNotes}</h4>
                        <ul className="text-sm text-indigo-200 space-y-1">
                            <li>• {t.mockExam.fullMode}: {t.mockExam.fullDetails}</li>
                            <li>• {t.mockExam.practiceMode}: {t.mockExam.practiceDetails}</li>
                            <li>• {t.mockExam.resultReview}</li>
                            <li>• {t.mockExam.studyPlanAuto}</li>
                        </ul>
                    </div>

                    <button onClick={loadExamQuestions} disabled={selectedSubjects.length === 0 || isLoading} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all">
                        {isLoading ? t.common.loading : `${t.mockExam.start} (${selectedSubjects.join(', ')})`}
                    </button>
                </div>);

            case 'exam':
                return (<div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-white font-medium">题目进度</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{ width: `${(Object.keys(examAnswers).length / examQuestions.length) * 100}%` }} />
                                    </div>
                                    <span className="text-slate-300 text-sm">{Object.keys(examAnswers).length}/{examQuestions.length}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-slate-400 text-sm">
                                    剩余时间: <span className={`font-medium ${timeRemaining >= 0 && timeRemaining < 300 ? 'text-red-400' : 'text-white'}`}>{timeRemaining < 0 ? '不限时间' : formatTime(timeRemaining)}</span>
                                </span>
                                <button onClick={handleSubmitExam} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">
                                    交卷
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {examQuestions.map((question, idx) => {
                            const selectedAnswer = examAnswers[question.id];
                            const hasOptions = question.options && question.options.length > 0;
                            return (<div key={question.id} className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700/50 hover:border-indigo-500/50 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${selectedAnswer !== undefined ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xs px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded">
                                                {question.subject}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 bg-slate-600/50 text-slate-300 rounded">
                                                {question.type === '选择题' ? '选择题' : question.module || '其他'}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${question.difficulty === 'easy' ? 'bg-green-600/30 text-green-300' :
                                                question.difficulty === 'medium' ? 'bg-amber-600/30 text-amber-300' :
                                                    'bg-red-600/30 text-red-300'}`}>
                                                {question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难'}
                                            </span>
                                        </div>
                                        <p className="text-white mb-4">{question.question}</p>
                                        {hasOptions ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {question.options.map((option, optIdx) => {
                                                    const isSelected = selectedAnswer === optIdx;
                                                    return (<button key={optIdx} onClick={() => handleAnswerSelect(question.id, optIdx)} className={`p-3 rounded-lg text-left transition-all ${isSelected
                                                        ? 'bg-indigo-600/30 border-2 border-indigo-500 text-indigo-200'
                                                        : 'bg-slate-700/50 border-2 border-transparent text-slate-300 hover:border-slate-500'}`}>
                                                        <span className="font-semibold mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                                                        {option}
                                                    </button>);
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-slate-700/30 rounded-lg p-4">
                                                <div className="text-slate-400 text-sm mb-2">📝 问答题</div>
                                                <textarea
                                                    value={selectedAnswer || ''}
                                                    onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
                                                    placeholder="请在此输入你的答案..."
                                                    className="w-full h-24 bg-slate-800 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>);
                        })}
                    </div>
                </div>);

            case 'result':
                return (<div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">考试成绩</h3>
                        {examResult ? (<>
                            <div className="flex items-center justify-center mb-8">
                                <div className="relative">
                                    <div className={`w-40 h-40 rounded-full flex items-center justify-center ${examResult.score >= 80 ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                                        examResult.score >= 60 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                                            'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                                        <div className="text-center">
                                            <span className="text-5xl font-bold text-white">{examResult.score}</span>
                                            <div className="text-sm text-white/80">/ 100</div>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-700 px-4 py-2 rounded-full">
                                        <span className="text-slate-300 text-sm">
                                            答对 {examResult.correctCount}/{examQuestions.length} 题
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {Object.entries(examResult.breakdown).map(([subject, score]) => (<div key={subject} className="bg-slate-700/50 rounded-lg p-4 text-center">
                                    <div className={`text-3xl font-bold ${score >= 80 ? 'text-green-400' :
                                        score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{score}</div>
                                    <div className="text-sm text-slate-400 mt-1">{subject}</div>
                                </div>))}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
                                    <div className="text-green-400 text-2xl font-bold mb-1">{examResult.correctCount}</div>
                                    <div className="text-green-200 text-sm">答对题数</div>
                                </div>
                                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                                    <div className="text-red-400 text-2xl font-bold mb-1">{examResult.wrongQuestions.length}</div>
                                    <div className="text-red-200 text-sm">答错题数</div>
                                </div>
                            </div>

                            <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-4 space-y-3">
                                <h4 className="text-white font-medium">📊 {t.scoreAnalysis.title}</h4>
                                <p className="text-indigo-200 text-sm">
                                    {examResult.score >= 60 ? t.scoreAnalysis.passing : t.scoreAnalysis.belowPassing}
                                </p>
                                {scoreAnalysis && (
                                    <>
                                        {scoreAnalysis.rankingPercentile !== undefined && (
                                            <p className="text-slate-300 text-sm">
                                                {t.scoreAnalysis.percentile}: {scoreAnalysis.rankingPercentile}%
                                            </p>
                                        )}
                                        {scoreAnalysis.weakPoints?.length > 0 && (
                                            <div>
                                                <p className="text-slate-400 text-xs mb-1">{t.scoreAnalysis.weakPoints}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {scoreAnalysis.weakPoints.map((w) => (
                                                        <span key={w} className="px-2 py-0.5 bg-red-900/40 text-red-200 rounded text-xs">{w}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-indigo-100 text-sm whitespace-pre-line">
                                            <span className="font-medium">{t.scoreAnalysis.improvement}: </span>
                                            {scoreAnalysis.improvementPlan}
                                        </p>
                                    </>
                                )}
                            </div>
                        </>) : (<div className="text-center py-8 text-slate-400">
                            <div className="text-4xl mb-2">📊</div>
                            <p>考试成绩加载中...</p>
                        </div>)}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { setActiveStep(6); setCurrentStep('error_review'); }} className="py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-rose-500 transition-all">
                            📝 查看错题 ({examResult?.wrongQuestions.length || 0})
                        </button>
                        <button onClick={() => { setActiveStep(7); setCurrentStep('study_plan'); }} className="py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all">
                            📅 生成学习计划
                        </button>
                    </div>
                </div>);

            case 'ai_tutor':
                return (<div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">🤖 AI助手咨询</h3>
                        <p className="text-slate-400 text-sm mb-6">有任何关于备考、学习策略、院校选择等问题，都可以向AI助手咨询</p>
                        
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="输入您的问题..."
                                    value={tutorQuestion}
                                    onChange={(e) => setTutorQuestion(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAskTutor(tutorQuestion)}
                                    className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                />
                                <button onClick={() => handleAskTutor(tutorQuestion)} disabled={isTutorLoading} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all">
                                    {isTutorLoading ? '思考中...' : '提问'}
                                </button>
                            </div>
                            
                            <div className="bg-slate-700/30 rounded-xl p-4">
                                <div className="text-slate-400 text-xs font-medium mb-3">💡 热门问题</div>
                                <div className="flex flex-wrap gap-2">
                                    {['如何提高CSCA考试成绩？', '推荐哪些备考资料？', 'HSK4需要多少词汇量？', '临床医学专业需要考哪些科目？'].map((question, idx) => (
                                        <button key={idx} onClick={() => handleAskTutor(question)} className="px-3 py-2 bg-slate-600/50 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
                                            {question}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {tutorAnswer && (<div className="mt-6 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl p-5 border border-indigo-700/30">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                    <span className="text-xl">🤖</span>
                                </div>
                                <div>
                                    <div className="text-white font-semibold">CSCA智能助手</div>
                                    <div className="text-xs text-slate-400">基于AI的备考顾问</div>
                                </div>
                            </div>
                            <div className="mb-3 p-3 bg-slate-800/50 rounded-lg">
                                <div className="text-slate-400 text-xs mb-1">您的问题</div>
                                <p className="text-white text-sm">{tutorQuestion}</p>
                            </div>
                            <p className="text-indigo-100 text-sm leading-relaxed whitespace-pre-line">
                                {tutorAnswer}
                            </p>
                        </div>)}
                        
                        {!tutorAnswer && (<div className="mt-6 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl p-5 border border-indigo-700/30">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                    <span className="text-xl">🤖</span>
                                </div>
                                <div>
                                    <div className="text-white font-semibold">CSCA智能助手</div>
                                    <div className="text-xs text-slate-400">基于AI的备考顾问</div>
                                </div>
                            </div>
                            <p className="text-indigo-100 text-sm leading-relaxed">
                                根据您的院校匹配结果，建议您重点关注以下几点：
                                <br />
                                1. 继续提高数学和物理成绩，这对临床医学专业非常重要
                                <br />
                                2. 建议每天保持2-3小时的学习时间
                                <br />
                                3. 定期进行模拟测试，检验学习效果
                                <br />
                                4. 如果目标是北京大学，建议将目标分数设定在90分以上
                            </p>
                        </div>)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { setActiveStep(8); setCurrentStep('university_match'); }} className="py-4 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all">
                            ← 返回院校匹配
                        </button>
                        <button onClick={() => { handleGenerateClassroomFromErrors(); }} className="py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all">
                            📚 根据错题生成课堂
                        </button>
                    </div>
                </div>);

            case 'error_review':
                return (<div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">错题列表</h3>
                            <span className="text-sm text-slate-400">共 {errorRecords.length} 道错题</span>
                        </div>

                        {errorRecords.length > 0 ? (<div className="space-y-4 max-h-[500px] overflow-y-auto">
                            {errorRecords.map((record) => {
                                return (<div key={record.id} className="bg-slate-700/50 rounded-xl p-4 border-l-4 border-red-500">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded">
                                                {record.subject}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 bg-slate-600/50 text-slate-300 rounded">
                                                {record.module}
                                            </span>
                                        </div>
                                        <button onClick={() => handleGetAIExplanation(record)} disabled={isLoading} className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                                            {isLoading ? '加载中...' : 'AI讲解'}
                                        </button>
                                    </div>
                                    <p className="text-white text-sm mb-3">{record.question}</p>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-red-400">
                                            你的答案: {typeof record.userAnswer === 'number' ? String.fromCharCode(65 + record.userAnswer) : record.userAnswer}
                                        </span>
                                        <span className="text-green-400">
                                            正确答案: {typeof record.correctAnswer === 'number' ? String.fromCharCode(65 + record.correctAnswer) : record.correctAnswer}
                                        </span>
                                    </div>
                                </div>);
                            })}
                        </div>) : (<div className="text-center py-8 text-slate-400">
                            <div className="text-4xl mb-2">🎉</div>
                            <p>暂无错题记录，继续保持！</p>
                        </div>)}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { setActiveStep(5); setCurrentStep('result'); }} className="py-4 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all">
                            ← 返回成绩
                        </button>
                        <button onClick={() => { setActiveStep(7); setCurrentStep('study_plan'); }} className="py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all">
                            📅 生成学习计划 →
                        </button>
                    </div>

                    {showExplanation && aiExplanation && (<div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700">
                            <div className="p-6 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">AI智能讲解</h3>
                                            <p className="text-sm text-slate-400">深度分析错题原因，提供个性化学习建议</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowExplanation(false)} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
                                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl p-5 border border-indigo-700/30">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-2xl">🎓</span>
                                        <h4 className="text-white font-semibold">AI深度解析</h4>
                                    </div>
                                    <div className="text-indigo-100 text-sm leading-relaxed whitespace-pre-line">
                                        {aiExplanation}
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={() => setShowExplanation(false)}
                                        className="flex-1 py-3 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition-colors"
                                    >
                                        关闭
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowExplanation(false);
                                            setActiveStep(5);
                                            setCurrentStep('study_plan');
                                        }}
                                        className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all"
                                    >
                                        📅 生成学习计划
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>)}
                </div>);

            case 'study_plan':
                return (<div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">个性化学习计划</h3>

                        {studyPlan ? (<>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-indigo-900/30 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-indigo-400">{studyPlan.targetSubjects.length}</div>
                                    <div className="text-sm text-indigo-200">目标科目</div>
                                </div>
                                <div className="bg-amber-900/30 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-amber-400">{studyPlan.weakAreas.length}</div>
                                    <div className="text-sm text-amber-200">薄弱环节</div>
                                </div>
                                <div className="bg-green-900/30 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-400">{studyPlan.weeklyGoals.length}</div>
                                    <div className="text-sm text-green-200">周目标数</div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-white font-medium mb-3">⚠️ 薄弱环节</h4>
                                <div className="space-y-2">
                                    {studyPlan.weakAreas.map((area) => (<div key={`${area.subject}-${area.module}`} className={`flex items-center justify-between p-3 rounded-lg ${area.priority === 'high' ? 'bg-red-900/30' :
                                        area.priority === 'medium' ? 'bg-amber-900/30' : 'bg-slate-700/50'}`}>
                                        <div>
                                            <span className="text-white font-medium">{area.subject}</span>
                                            <span className="text-slate-400 text-sm ml-2">{area.module}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs px-2 py-0.5 rounded ${area.priority === 'high' ? 'bg-red-600 text-white' :
                                                area.priority === 'medium' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-white'}`}>
                                                {area.priority === 'high' ? '高优先级' : area.priority === 'medium' ? '中优先级' : '低优先级'}
                                            </span>
                                            <span className="text-slate-400 text-sm">错误{area.errorCount}次</span>
                                        </div>
                                    </div>))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-white font-medium mb-3">📅 今日学习任务</h4>
                                <div className="space-y-2">
                                    {studyPlan.dailyGoals.slice(0, 3).map((goal) => (<div key={goal.id} className="bg-slate-700/50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium">{goal.subject} - {goal.module}</span>
                                            {goal.completed && <span className="text-green-400 text-sm">✓ 已完成</span>}
                                        </div>
                                        <div className="space-y-2">
                                            {goal.tasks.map((task) => (<div key={task.id} className="flex items-center gap-3">
                                                <button onClick={() => !task.completed && handleTaskComplete(task.id)} disabled={task.completed} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${task.completed
                                                    ? 'bg-green-600 border-green-600'
                                                    : 'border-slate-500 hover:border-indigo-500'}`}>
                                                    {task.completed && <span className="text-white text-xs">✓</span>}
                                                </button>
                                                <span className={task.completed ? 'text-slate-500 line-through' : 'text-slate-300'}>
                                                    {task.description}
                                                </span>
                                            </div>))}
                                        </div>
                                    </div>))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-white font-medium mb-3">📈 每周目标</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {studyPlan.weeklyGoals.slice(0, 4).map((week) => (<div key={week.id} className="bg-slate-700/50 rounded-lg p-4">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-white">第{week.weekNumber}周</div>
                                            <div className="text-sm text-slate-400 mt-1">
                                                {week.goals.filter(g => g.completed).length}/{week.goals.length} 完成
                                            </div>
                                        </div>
                                    </div>))}
                                </div>
                            </div>
                        </>) : (<div className="text-center py-8 text-slate-400">
                            <div className="text-4xl mb-2">📋</div>
                            <p>暂无学习计划，请先完成一次模拟考试</p>
                        </div>)}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { setActiveStep(6); setCurrentStep('error_review'); }} className="py-4 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all">
                            ← 返回错题
                        </button>
                        <button onClick={() => { handleUniversityMatch(); setActiveStep(8); setCurrentStep('university_match'); }} disabled={isLoading} className="py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all">
                            🏛️ 院校匹配 →
                        </button>
                    </div>
                </div>);

            case 'university_match':
                return (<div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">院校匹配结果</h3>
                            <span className={`text-sm ${examResult?.score ? 'text-slate-400' : 'text-amber-400'}`}>
                                当前分数: {examResult?.score || 0}分
                                {!examResult?.score && <span className="ml-2">(建议先完成模拟考试)</span>}
                            </span>
                        </div>
                        {universityCategories.length > 0 ? (<div className="space-y-6">
                            {universityCategories.map((category) => (<div key={category.title} className={`${category.bgColor} rounded-xl p-4 border ${category.borderColor}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className={`font-semibold ${category.color}`}>{category.title}</h4>
                                        <p className="text-xs text-slate-500">{category.description}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.bgColor} ${category.color}`}>
                                        {category.universities.length}所院校
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {category.universities.map((uni, idx) => (<div key={uni.name} className="bg-slate-800/50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold ${category.title === '冲刺院校' ? 'bg-red-600' : category.title === '目标院校' ? 'bg-yellow-600' : 'bg-green-600'}`}>
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <div className="text-white font-semibold">{uni.name}</div>
                                                    <div className="text-xs text-slate-400">{uni.nameZh} · {uni.location}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-sm font-semibold ${category.color}`}>匹配度: {uni.matchScore}%</div>
                                                <div className="text-xs text-slate-400">录取概率: {(uni.probability * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-2">{uni.description}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {uni.requirements.map((req) => (<span key={req} className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded text-xs">
                                                {req}
                                            </span>))}
                                        </div>
                                    </div>))}
                                </div>
                            </div>))}
                        </div>) : (<div className="text-center py-8 text-slate-400">
                            <div className="text-4xl mb-2">🏛️</div>
                            <button onClick={handleUniversityMatch} disabled={isLoading} className="text-indigo-400 hover:text-indigo-300">
                                {isLoading ? '匹配中...' : '点击获取院校匹配'}
                            </button>
                        </div>)}
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => { setActiveStep(7); setCurrentStep('study_plan'); }} className="py-4 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all">
                                ← 返回学习计划
                            </button>
                            <button onClick={() => { setActiveStep(0); setCurrentStep('diagnosis'); setExamQuestions([]); setExamAnswers({}); setExamResult(null); }} className="py-4 bg-white text-zinc-900 font-medium rounded-xl hover:bg-zinc-100 transition-all">
                                🔄 {t.flow.restart}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => { handleGenerateClassroomFromErrors(); }} className="py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all">
                                📚 根据错题生成课堂
                            </button>
                            <button onClick={() => { setActiveStep(4); setCurrentStep('ai_tutor'); }} className="py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all">
                                🤖 AI助手咨询
                            </button>
                        </div>
                    </div>
                </div>);

            default:
                return null;
        }
    };

    return (<div className="min-h-screen bg-[#09090b] text-zinc-100">
        <header className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                            <span className="text-zinc-900 font-bold text-sm">C</span>
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold tracking-tight">{t.nav.prepCenter}</h1>
                            <p className="text-xs text-zinc-500">{t.nav.tagline}</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap">
                        <CscaLanguageSwitcher />
                        <nav className="hidden md:flex items-center gap-1">
                            <Link href="/" className="px-3 py-1.5 rounded-full text-xs text-zinc-400 hover:text-white transition-colors">{t.nav.home}</Link>
                            <Link href="/csca/case-study" className="px-3 py-1.5 rounded-full text-xs text-zinc-400 hover:text-white transition-colors">{t.nav.caseStudy}</Link>
                            <Link href="/csca-multi-agent" className="px-3 py-1.5 rounded-full text-xs text-zinc-400 hover:text-white transition-colors">{t.nav.aiAssistant}</Link>
                        </nav>
                    </div>
                </div>
            </div>
        </header>

        <div className="border-b border-white/[0.06] bg-white/[0.02]">
            <div className="max-w-5xl mx-auto px-4 py-3">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {STEPS.map((step, idx) => (<div key={step.id} className="flex items-center flex-shrink-0">
                        <button onClick={() => idx <= activeStep && setCurrentStep(step.id)} disabled={idx > activeStep} className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs transition-all ${idx === activeStep ? 'bg-white text-zinc-900 font-medium' : idx < activeStep ? 'text-zinc-300 hover:bg-white/10' : 'text-zinc-600 cursor-not-allowed'}`}>
                            <span>{idx < activeStep ? '✓' : step.icon}</span>
                            <span className="whitespace-nowrap hidden sm:inline">{step.title}</span>
                        </button>
                        {idx < STEPS.length - 1 && (<span className="w-4 h-px bg-white/10 mx-0.5" />)}
                    </div>))}
                </div>
            </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 hidden lg:block">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sticky top-28">
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Agents</h3>
                        <div className="space-y-2">
                            {CSCA_AGENTS.map((agent) => (<button key={agent.id} onClick={() => handleAgentClick(agent)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-left">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: agent.color }}>
                                    {agent.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm text-white">{agent.name}</div>
                                    <div className="text-xs text-slate-400">{agent.role}</div>
                                </div>
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="text-3xl">{STEPS.find((s) => s.id === currentStep)?.icon}</div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {STEPS.find((s) => s.id === currentStep)?.title}
                                </h2>
                                <p className="text-sm text-slate-400">
                                    {STEPS.find((s) => s.id === currentStep)?.description}
                                </p>
                            </div>
                        </div>

                        {renderContent()}
                    </div>
                </div>
            </div>
        </main>

        {showAgentModal && selectedAgent && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-auto">
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: selectedAgent.color }}>
                                {selectedAgent.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedAgent.name}</h3>
                                <p className="text-slate-400">{selectedAgent.role}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAgentModal(false)} className="p-2 rounded-lg hover:bg-slate-700">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="bg-slate-700/50 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">🤖 Role Description</h4>
                            <p className="text-slate-300 text-sm whitespace-pre-line">{selectedAgent.systemPrompt}</p>
                        </div>
                        <div className="bg-slate-700/50 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">⚙️ AI Model</h4>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-indigo-600/30 text-indigo-300 rounded-full text-sm capitalize">
                                    {selectedAgent.model}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <button onClick={() => {
                            setShowAgentModal(false);
                            if (selectedAgent.id === 'examiner') setCurrentStep('exam_center');
                            else if (selectedAgent.id === 'tutor') setCurrentStep('diagnosis');
                            else if (selectedAgent.id === 'analyst') setCurrentStep('result');
                            else if (selectedAgent.id === 'challenger') setCurrentStep('exam_center');
                            else if (selectedAgent.id === 'advisor') setCurrentStep('university_match');
                            else if (selectedAgent.id === 'motivator') setCurrentStep('diagnosis');
                            else if (selectedAgent.id === 'video_explainer') setCurrentStep('study_plan');
                            else if (selectedAgent.id === 'error_explainer') setCurrentStep('error_review');
                        }} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500">
                            Start Working with {selectedAgent.name}
                        </button>
                    </div>
                </div>
            </div>
        </div>)}
    </div>);
}
