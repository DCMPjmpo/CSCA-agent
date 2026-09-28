'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Search,
  Map,
  Target,
  ClipboardList,
  Pencil,
  BarChart3,
  XCircle,
  Calendar,
  Landmark,
  Check,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Bot,
  GraduationCap,
  TrendingUp,
  Lightbulb,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { CSCA_SUBJECTS, getSubjectConfig } from '@/lib/csca/exam-config';
// [TRA-FIX] 从 import 中移除 getAIErrorExplanation，改为走 /api/csca/error-analysis
// [WORKER] 直接 import core（不走 error-analysis 的 export * 再导出），让 tree-shaking
// 只保留本页用到的函数；analyzeWeakAreas/generateStudyPlan/mergeErrorRecords
// 等判分代码仅存在于 worker chunk 与懒加载兜底 chunk，不进首屏主 chunk。
import { TARGET_MAJORS, EDUCATION_SYSTEMS } from '@/lib/csca/voyage-constants';
import {
  getErrorRecords,
  getStudyPlan,
  markTaskCompleted,
  saveStudyPlan,
  writeErrorRecords,
} from '@/lib/csca/error-analysis-core';
// [WORKER] 判分在 Web Worker 内完成，落盘一律回到主线程（Worker 环境没有 localStorage）。
// gradeExam 仅用于 worker 不可用时的兜底，改为动态 import，避免把判分代码留在首屏主 chunk。
import type { ExamGradeResult, ExamQuestionLike } from '@/lib/csca/exam-scoring';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCscaSession } from '@/lib/hooks/use-csca-session';
import { localeFromCountryCode } from '@/lib/csca/locale';
import { BrandShell } from '@/components/brand/BrandShell';
import { ScrollDialog } from '@/components/brand/ScrollDialog';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/toaster-dynamic';
import type { KnowledgeMapItem } from '@/components/csca/KnowledgeGraphView';
import {
  saveCscaSession,
  loadCscaSession,
  appendAnswerRecords,
  type AnswerRecord,
} from '@/lib/csca/session';
import { createPptTask, createHtmlTask } from '@/lib/openmaic';
import { completeStage, getVoyageProgress, setCurrentStage } from '@/lib/voyage-progress';
import { ASEAN_COUNTRIES } from '@/lib/csca/asean-countries';
import {
  VoyagePageHeader,
  VoyageProgress,
  VoyageStageRibbon,
  StageFooter,
} from '@/components/voyage';
import {
  STEP_TO_STAGE as STEP_TO_VOYAGE_INDEX,
  getCurrentStageIndex,
  VOYAGE_STAGE_ORDER,
} from '@/lib/voyage-stages';
import {
  buildAbilityTable,
  buildVoyageAIMateContext,
  getCorrectionLoop,
  getWeeklyRoutePlan,
  getAIMateContextHint,
} from '@/lib/brand-logic';
// [P3.5-B] 个性化航程决策层：学生状态 → 下一学习行动（纯函数，见 lib/csca/personalized-voyage.ts）
import {
  buildStudentModel,
  resolveNextLearningAction,
  type NextLearningAction,
} from '@/lib/csca/personalized-voyage';

// [PERF-FIX] echarts (KnowledgeGraphView) is code-split out of the first screen;
// it loads only when the knowledge_map step is entered.
const KnowledgeGraphView = dynamic(
  () => import('@/components/csca/KnowledgeGraphView').then((m) => m.KnowledgeGraphView),
  { ssr: false },
);

import type {
  ScoreAnalysisResult,
  DiagnosisResult,
  AdaptiveExercise,
  ExamQuestion,
  ExamResult,
  UniversityMatch,
  UniversityCategory,
  Step,
} from '@/lib/csca/voyage-constants';
import type { ErrorRecord } from '@/lib/csca/error-analysis-core';

interface StudyPlan {
  id: string;
  userId: string;
  createdAt: number;
  targetSubjects: string[];
  weakAreas: {
    subject: string;
    module: string;
    errorCount: number;
    accuracy: number;
    priority: 'high' | 'medium' | 'low';
  }[];
  dailyGoals: {
    id: string;
    subject: string;
    module: string;
    tasks: { id: string; type: string; description: string; completed: boolean }[];
    completed: boolean;
  }[];
  weeklyGoals: {
    id: string;
    weekNumber: number;
    goals: {
      id: string;
      description: string;
      subject: string;
      targetScore: number;
      completed: boolean;
    }[];
    completed: boolean;
  }[];
  progress: number;
}

const STEP_DEFS: { id: Step; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'diagnosis', icon: Search },
  { id: 'knowledge_map', icon: Map },
  { id: 'adaptive_learning', icon: Target },
  { id: 'exam_center', icon: ClipboardList },
  { id: 'exam', icon: Pencil },
  { id: 'result', icon: BarChart3 },
  { id: 'error_review', icon: XCircle },
  { id: 'study_plan', icon: Calendar },
  { id: 'university_match', icon: Landmark },
  { id: 'ai_tutor', icon: Bot },
];

/**
 * hash → step 全量白名单（P0-1）。
 *
 * 约束（改这里之前先读这两处，三边必须逐字一致）：
 *   - components/brand/VoyageNavigation.tsx 的 STAGES href
 *   - app/page.tsx 的 LEARNING_VOYAGE_8_STOPS anchor
 *
 * index 是 STEP_DEFS 的下标；`exam` 段无独立入口，与 exam_center 合并。
 * `error-analysis` / `error_review` 是历史链接的兼容别名（旧版侧栏与
 * createPptTask 的 voyageStageId 曾使用），非新增功能。
 */
const HASH_TO_STEP: Record<string, { step: Step; index: number }> = {
  diagnosis: { step: 'diagnosis', index: 0 },
  'knowledge-map': { step: 'knowledge_map', index: 1 },
  'adaptive-learning': { step: 'adaptive_learning', index: 2 },
  'mock-exam': { step: 'exam_center', index: 3 },
  'score-analysis': { step: 'result', index: 5 },
  'error-review': { step: 'error_review', index: 6 },
  'study-plan': { step: 'study_plan', index: 7 },
  'university-match': { step: 'university_match', index: 8 },
  'ai-tutor': { step: 'ai_tutor', index: 9 },
  // 兼容别名
  'error-analysis': { step: 'error_review', index: 6 },
  error_review: { step: 'error_review', index: 6 },
  ai_tutor: { step: 'ai_tutor', index: 9 },
};

const EXAM_MODE_CONFIG = [
  { id: 'full', color: 'bg-vermilion' },
  { id: 'practice', color: 'bg-bamboo' },
];

export default function CSCAVoyageApp() {
  const { t, locale, changeLocale } = useTranslation();
  const isZh = locale.startsWith('zh');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('diagnosis');
  const [activeStep, setActiveStep] = useState(0);
  // [HYDRATION-FIX] useCscaSession 提供 hydration-safe 的 sessionData（null on server
  // AND client first render），mount 后 useEffect 更新真实数据，避免 typeof window 分支
  const cscaSession = useCscaSession();

  // [P0-1-FIX] 用全量白名单做 hash → step 初始化，并监听 hashchange。
  // 旧实现只识别 6 个 hash（缺 diagnosis / error-review / ai-tutor），
  // 未命中时静默停在默认 diagnosis；且 effect 只在 mount 跑一次，
  // 用户在 /csca/voyage 内点击侧栏阶段（同文档 hash 变化）不会切换步骤。
  useEffect(() => {
    const applyHashStep = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const target = HASH_TO_STEP[hash];
      if (!target) return;
      setCurrentStep(target.step);
      setActiveStep(target.index);
    };
    applyHashStep();
    window.addEventListener('hashchange', applyHashStep);
    return () => window.removeEventListener('hashchange', applyHashStep);
  }, []);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [knowledgeMap, setKnowledgeMap] = useState<KnowledgeMapItem[]>([]);
  const [adaptiveExercises, setAdaptiveExercises] = useState<AdaptiveExercise[]>([]);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<string, number>>({});
  const [showExerciseExplanation, setShowExerciseExplanation] = useState(false);
  // [Batch 5] 学习/练题反馈状态（去游戏化：无战功、无连击、无横扫千军横幅、无大捷弹窗）
  const [exerciseFeedback, setExerciseFeedback] = useState<Record<string, boolean>>({});

  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, number | string>>({});
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [currentExamQuestionIdx, setCurrentExamQuestionIdx] = useState(0);
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
  const [errorRecords, setErrorRecords] = useState<ErrorRecord[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null | undefined>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentErrorQuestion, setCurrentErrorQuestion] = useState<ExamQuestion | null>(null);
  const [scoreAnalysis, setScoreAnalysis] = useState<ScoreAnalysisResult | null>(null);
  const [tutorQuestion, setTutorQuestion] = useState<string>('');
  const [tutorAnswer, setTutorAnswer] = useState<string>('');
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  // Phase F: Wrong Answer Practice 模式标识 + 错题统计
  const [isWrongAnswerMode, setIsWrongAnswerMode] = useState(false);
  const [wrongAnswerStats, setWrongAnswerStats] = useState<{
    wrongCount: number;
    weakPoints: Record<string, string[]>;
    difficultyFallback?: boolean;
  } | null>(null);

  // P4.3: 连续做题 — 自动推进 timer ref（防止 double click / race condition）
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const STEPS = STEP_DEFS.map((s) => ({
    ...s,
    title:
      s.id === 'diagnosis'
        ? t.steps.diagnosis
        : s.id === 'knowledge_map'
          ? t.steps.knowledgeMap
          : s.id === 'adaptive_learning'
            ? t.steps.adaptiveLearning
            : s.id === 'exam_center' || s.id === 'exam'
              ? t.steps.mockExam
              : s.id === 'result'
                ? t.steps.scoreAnalysis
                : s.id === 'university_match'
                  ? t.steps.universityMatch
                  : s.id === 'error_review'
                    ? t.flow.errorReview
                    : s.id === 'study_plan'
                      ? t.flow.studyPlan
                      : t.steps.aiTutor,
    description:
      s.id === 'diagnosis'
        ? t.diagnosis.description
        : s.id === 'knowledge_map'
          ? t.knowledgeMap.description
          : s.id === 'adaptive_learning'
            ? t.adaptiveLearning.description
            : s.id === 'exam_center' || s.id === 'exam'
              ? t.mockExam.description
              : s.id === 'result'
                ? t.scoreAnalysis.description
                : s.id === 'university_match'
                  ? t.universityMatch.description
                  : '',
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
      // 不恢复 currentStep/activeStep，让 hash 决定初始步骤
      // 如果无 hash，默认从 diagnosis 开始
    }
  }, []);

  // [P1-FIX] 直接导航到 #knowledge-map 时，自动加载知识图谱数据
  // 原因：loadKnowledgeMap 只在诊断完成时调用，直接通过 URL 访问时 knowledgeMap 为空
  useEffect(() => {
    if (currentStep !== 'knowledge_map') return;
    if (knowledgeMap.length > 0) return;
    if (!diagnosisResult) return;
    if (isLoading) return;
    const subjects = diagnosisResult.requiredSubjects?.length
      ? diagnosisResult.requiredSubjects
      : selectedSubjects;
    if (subjects.length === 0) return;
    loadKnowledgeMap(diagnosisResult, subjects);
  }, [currentStep, knowledgeMap, diagnosisResult, isLoading, selectedSubjects]);

  // P4.3: 组件卸载时清除自动推进 timer，防止内存泄漏
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
    };
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
  }, [
    currentStep,
    activeStep,
    diagnosisResult,
    selectedSubjects,
    selectedCountry,
    targetMajor,
    hskLevel,
    locale,
    examResult,
  ]);

  const onCountrySelect = useCallback(
    (country: (typeof ASEAN_COUNTRIES)[0]) => {
      setSelectedCountry(country);
      changeLocale(localeFromCountryCode(country.code));
    },
    [changeLocale],
  );

  useEffect(() => {
    let timer: number | undefined;
    if (timeRemaining > 0 && examStarted) {
      timer = window.setInterval(() => {
        setTimeRemaining((prev) => {
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
          fastMode: false, // [AI-FIX] 必须传 false 才能触发真实 AI 诊断，否则走 mock
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(t.common.error);
        setIsLoading(false);
        return;
      }
      setDiagnosisResult(data.data);
      const subjects = data.data.requiredSubjects ?? ['数学'];
      setSelectedSubjects(subjects);
      toast.success(t.common.success);
      // 先加载知识图谱数据，再切换页面
      await loadKnowledgeMap(data.data, subjects);
      completeStage(0); // Stage 01 定位完成
      setActiveStep(1);
      setCurrentStep('knowledge_map');
    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error(t.common.error);
      const fallback = {
        requiredSubjects: ['理科中文', '数学', '物理', '基础汉语'],
        recommendedSubjects: ['化学'],
        subjectPriorities: { 理科中文: 1, 数学: 2, 物理: 3, 基础汉语: 4 },
        estimatedDays: 90,
      };
      setDiagnosisResult(fallback);
      setSelectedSubjects(fallback.requiredSubjects);
      toast.info(isZh ? '已用默认数据探明风向' : 'Using default diagnosis');
      await loadKnowledgeMap(fallback, fallback.requiredSubjects);
      completeStage(0); // Stage 01 定位完成（fallback path）
      setActiveStep(1);
      setCurrentStep('knowledge_map');
    } finally {
      setIsLoading(false);
    }
  };

  const loadKnowledgeMap = async (diagnosis: DiagnosisResult, subjects: string[]) => {
    try {
      // Phase E+: 从 session 读取真实答题历史，传给 Knowledge Map 计算 mastery
      const session = loadCscaSession();
      const answerHistory: AnswerRecord[] = Array.isArray(session?.answerHistory)
        ? session!.answerHistory!
        : [];

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
          answerHistory, // Phase E+: 真实答题历史
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setKnowledgeMap(data.data);
      }
    } catch (e) {
      console.error('Knowledge map error:', e);
      toast.error(
        isZh
          ? '海图展开失败，请稍后重试'
          : 'Failed to load the navigation chart — please try again',
      );
    }
  };

  const handleLoadAdaptiveExercises = async () => {
    setIsLoading(true);
    try {
      // Phase F: 进入普通练习模式时重置 wrong answer 标识
      setIsWrongAnswerMode(false);
      setWrongAnswerStats(null);
      // Phase E+: 读取答题历史用于去重和能力自适应
      const session = loadCscaSession();
      const answerHistory: AnswerRecord[] = Array.isArray(session?.answerHistory)
        ? session!.answerHistory!
        : [];
      const recentQuestionIds = answerHistory.slice(-30).map((a) => a.questionId);

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
          countryCode: selectedCountry.code,
          locale,
          answerHistory,
          recentQuestionIds,
          currentStage: activeStep,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdaptiveExercises(data.data);
        setCurrentExerciseIdx(0);
        setExerciseAnswers({});
        setExerciseFeedback({});
        setActiveStep(2);
        setCurrentStep('adaptive_learning');
      }
    } catch (e) {
      console.error('Adaptive learning error:', e);
      toast.error(
        isZh ? '演武点将失败，请稍后重试' : 'Failed to load exercises — please try again',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadExamQuestions = async () => {
    setIsLoading(true);
    try {
      // Phase E+: practice 模式传入答题历史用于去重和自适应
      const session = loadCscaSession();
      const answerHistory: AnswerRecord[] = Array.isArray(session?.answerHistory)
        ? session!.answerHistory!
        : [];
      const recentQuestionIds = answerHistory.slice(-30).map((a) => a.questionId);

      const res = await fetch('/api/csca/mock-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: selectedSubjects,
          questionCount: null,
          mode: examMode,
          // Phase E+: practice 模式使用
          ...(examMode === 'practice'
            ? { answerHistory, recentQuestionIds, targetMajor: targetMajor.name }
            : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const config = getSubjectConfig(selectedSubjects[0]);
        // 练习模式不限时间，设置为-1表示无时间限制
        const duration = examMode === 'practice' ? -1 : config?.duration || 90;
        setTimeRemaining(examMode === 'practice' ? -1 : duration * 60);
        setExamQuestions(data.data);
        setExamAnswers({});
        setExamResult(null);
        setExamStarted(true);
        setCurrentExamQuestionIdx(0);
        clearAutoAdvanceTimer(); // P4.3: 新考试清除残留 timer
        setActiveStep(4);
        setCurrentStep('exam');
      }
    } catch (error) {
      console.error('Mock exam load error:', error);
      toast.error(
        isZh ? '试航起卷失败，请稍后重试' : 'Failed to start the trial — please try again',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // [Batch 5] 练题判分：仅记录对错反馈；不产出战功、连击横幅、大捷弹窗（纯学习反馈）
  const handleSubmitExercise = (ex: AdaptiveExercise, _idx: number) => {
    const selected = exerciseAnswers[ex.id];
    if (selected === undefined) return;
    const correct = selected === ex.answer;
    setExerciseFeedback((prev) => ({ ...prev, [ex.id]: correct }));

    // Phase E+: 记录题目级答题历史（持久化到 session）
    // Q3.0.1: 优先使用 enrichment knowledgePoint（与 Knowledge Map 真实 KP 对齐）
    const kp = ex.knowledgePoint || ex.topic;
    const record: AnswerRecord = {
      questionId: ex.id,
      subject: ex.subject,
      knowledgePoint: kp,
      module: kp,
      isCorrect: correct,
      difficulty: ex.difficulty <= 0.4 ? 'easy' : ex.difficulty >= 0.6 ? 'hard' : 'medium',
      mode: isWrongAnswerMode ? 'wrong_answer_practice' : 'practice',
      targetMajor: targetMajor?.name,
      timestamp: Date.now(),
    };
    appendAnswerRecords([record]);
  };

  // Phase F: 启动独立错题修正（Wrong Answer Practice）
  // 从 answerHistory 提取错题 -> 调用 /api/csca/wrong-answer -> 加载同知识点新题（排除原题）
  const handleStartWrongAnswerPractice = async () => {
    setIsLoading(true);
    try {
      const session = loadCscaSession();
      const answerHistory: AnswerRecord[] = Array.isArray(session?.answerHistory)
        ? session!.answerHistory!
        : [];

      const res = await fetch('/api/csca/wrong-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: selectedSubjects,
          targetMajor: targetMajor?.nameEn,
          countryCode: selectedCountry.code,
          answerHistory,
          perSubject: 5,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (!data.data || data.data.length === 0) {
          toast.info(
            isZh
              ? '暂无错题或同知识点题目不足（题库瓶颈）'
              : 'No wrong answers or insufficient same-knowledge-point questions',
          );
          setIsLoading(false);
          return;
        }
        setAdaptiveExercises(data.data);
        setCurrentExerciseIdx(0);
        setExerciseAnswers({});
        setExerciseFeedback({});
        setIsWrongAnswerMode(true);
        setWrongAnswerStats({
          wrongCount: data.wrongQuestionCount ?? 0,
          weakPoints: data.weakKnowledgePoints ?? {},
          difficultyFallback: data.difficultyFallback,
        });
        setActiveStep(2);
        setCurrentStep('adaptive_learning');
        toast.success(
          isZh
            ? `已生成 ${data.data.length} 道错题修正题目`
            : `Loaded ${data.data.length} correction questions`,
        );
      } else {
        toast.error(isZh ? '错题修正加载失败' : 'Failed to load correction questions');
      }
    } catch (e) {
      console.error('Wrong answer practice error:', e);
      toast.error(isZh ? '错题修正加载失败' : 'Failed to load correction questions');
    } finally {
      setIsLoading(false);
    }
  };

  // [Batch 5] 模考结果标题：克制化 —— 不再授予「南海提督/破浪先锋」等游戏官职名
  const buildExamCelebration = (score: number) => {
    if (score >= 80)
      return (
        t.mockExam.completed ??
        (locale.startsWith('zh') ? '模拟试航完成 · 成绩优秀' : 'Trial voyage complete · Excellent')
      );
    if (score >= 60)
      return (
        t.mockExam.completed ??
        (locale.startsWith('zh')
          ? '模拟试航完成 · 可以进入下一航段'
          : 'Trial voyage complete · Ready for next stage')
      );
    return (
      t.mockExam.failed ??
      (locale.startsWith('zh')
        ? '试航未达目标，回港调整后再试'
        : 'Below target — review and retry.')
    );
  };

  // P4.3: 清除自动推进 timer（手动导航时调用）
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }, []);

  // P4.3: 导航到指定题目（清除 pending timer，防止 race condition）
  const goToQuestion = useCallback(
    (idx: number) => {
      clearAutoAdvanceTimer();
      setCurrentExamQuestionIdx(Math.max(0, Math.min(examQuestions.length - 1, idx)));
    },
    [examQuestions.length, clearAutoAdvanceTimer],
  );

  // P4.3: 连续做题 — 选择答案 → 立即保存 → 300ms 后自动进入下一题
  // 防止：double click、duplicate save、race condition、快速连续点击导致跳两题
  // 仅对选择题（number）自动推进；文本题（string）不自动推进
  const handleAnswerSelect = (questionId: string, answer: number | string) => {
    // 1. 立即保存答案（覆盖旧答案，不产生重复）
    setExamAnswers((prev) => ({ ...prev, [questionId]: answer }));

    // 2. 清除前一个 pending timer（快速连续点击只推进一次）
    clearAutoAdvanceTimer();

    // 3. 文本题（string 类型）不自动推进
    if (typeof answer !== 'number') return;

    // 4. 最后一题不自动推进（避免误提交）
    const isLastQuestion = currentExamQuestionIdx >= examQuestions.length - 1;
    if (isLastQuestion) return;

    // 5. 300ms 后自动进入下一题（250–400ms 范围）
    autoAdvanceTimer.current = setTimeout(() => {
      setCurrentExamQuestionIdx((prev) => Math.min(examQuestions.length - 1, prev + 1));
      autoAdvanceTimer.current = null;
    }, 300);
  };

  const handleSubmitExam = async () => {
    clearAutoAdvanceTimer(); // P4.3: 提交时清除 pending timer
    setExamStarted(false);
    // [WORKER] 判分 / 弱项分析 / 学习计划生成在 Web Worker 中执行，避免阻塞主线程；
    // 错题写入由 O(N²) 逐条读改写降为 1 次读 + 1 次写，但读写都发生在主线程（见下方 [PERSIST]）。
    // [NEXT-FIX] SSR-safe: typeof window 判断，SSR 阶段跳过 worker 实例化。
    let result: ExamGradeResult;
    try {
      if (typeof window === 'undefined') throw new Error('worker unavailable during SSR');
      const worker = new Worker(new URL('./score-exam.worker.ts', import.meta.url));
      result = await new Promise<ExamGradeResult>((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data?.type === 'grade-result') {
            resolve(e.data.result as ExamGradeResult);
          } else if (e.data?.type === 'grade-error') {
            worker.terminate();
            reject(new Error(e.data.message || 'score worker error'));
          }
        };
        worker.onerror = (e) => {
          worker.terminate();
          reject(new Error(e.message || 'score worker error'));
        };
        worker.postMessage({
          type: 'grade-exam',
          examQuestions,
          examAnswers,
          selectedSubjects,
          existingErrorRecords: getErrorRecords(),
        });
      });
      worker.terminate();
    } catch (e) {
      // Worker 不可用/出错时主线程兜底判分，功能不降级。
      // 动态 import，让判分代码只出现在 worker chunk 与懒加载兜底 chunk，不进首屏主 chunk。
      console.warn('[score-worker] fallback to main-thread grading:', e);
      const { gradeExam } = await import('@/lib/csca/exam-scoring');
      result = gradeExam({
        examQuestions,
        examAnswers,
        selectedSubjects,
        existingErrorRecords: getErrorRecords(),
      });
    }

    // [PERSIST] Worker 只负责计算，落盘一律在主线程完成 —— Worker 环境没有 localStorage，
    // 判分成功的正常路径必须在这里写入，否则错题本 / 学习计划 / 弱项只存在于组件内存，
    // 刷新即失。写入失败不得影响放榜，故仅告警。
    try {
      writeErrorRecords(result.errorRecords);
      saveStudyPlan(result.studyPlan);
    } catch (e) {
      console.warn('[score-worker] persist learning evidence failed:', e);
    }

    const score = result.score;
    const breakdown = result.breakdown;

    setExamResult({
      score,
      total: 100,
      breakdown,
      correctCount: result.correctCount,
      answers: examAnswers,
      wrongQuestions: result.wrongQuestions,
    });
    setErrorRecords(result.errorRecords);
    setStudyPlan(result.studyPlan);

    // Phase E+: 批量记录考试答题历史（持久化到 session）
    // Q3.0.1: 优先使用 enrichment knowledgePoint
    const examRecords: AnswerRecord[] = examQuestions.map((q) => {
      const ans = examAnswers[q.id];
      const isCorrect = ans !== undefined && Number(ans) === q.correctAnswer;
      const kp = q.knowledgePoint || q.module;
      return {
        questionId: q.id,
        subject: q.subject,
        knowledgePoint: kp,
        module: kp,
        isCorrect,
        difficulty: (q.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        mode: 'exam' as const,
        targetMajor: targetMajor?.name,
        timestamp: Date.now(),
      };
    });
    appendAnswerRecords(examRecords);
    // [BATCH16] 试航放榜：高分甲上 / 通过金榜题名 / 未捷待航
    toast.success(`${buildExamCelebration(score)} · ${score}/100`);

    completeStage(3); // Stage 04 试航完成
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
        improvementPlan:
          score >= 60
            ? isZh
              ? '乘胜追击，针对薄弱航段每日操练。'
              : 'Keep going — drill weak modules daily.'
            : isZh
              ? '建议整备 7 日再行试航。'
              : 'Regroup for 7 days before the next trial.',
      });
    }
  };

  const handleGetAIExplanation = async (
    questionOrRecord: ExamQuestion | (ErrorRecord & { options?: string[] }),
  ) => {
    const isQuestion = 'options' in questionOrRecord;
    const questionText = questionOrRecord.question;
    const correctAnswer = questionOrRecord.correctAnswer;
    const subject = questionOrRecord.subject;
    const moduleInfo = questionOrRecord.module;
    const userAnswer = isQuestion
      ? (examAnswers[questionOrRecord.id] ?? '未作答')
      : (questionOrRecord.userAnswer ?? '未作答');

    // 设置当前错题用于弹窗显示
    setCurrentErrorQuestion(isQuestion ? (questionOrRecord as ExamQuestion) : null);
    setIsLoading(true);
    try {
      // [TRA-FIX] 改为调用服务端 API，避免 AI SDK 进入客户端 bundle
      const res = await fetch('/api/csca/error-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          userAnswer,
          correctAnswer,
          subject,
          module: moduleInfo,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        throw new Error(data.error || (isZh ? 'AI 讲解请求失败' : 'AI explanation request failed'));
      }
      const explanation = data.result as string;
      setAiExplanation(explanation);
      setShowExplanation(true);
    } catch (error) {
      console.error('AI explanation error:', error);
      const answerText =
        typeof correctAnswer === 'number' ? String.fromCharCode(65 + correctAnswer) : correctAnswer;
      setAiExplanation(
        (isZh
          ? '抱歉，AI 航海助手暂不可用。正确答案是：'
          : 'AI Mate is unavailable right now. The correct answer is: ') + answerText,
      );
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
            color: 'text-warning',
            bgColor: 'bg-warning/10',
            borderColor: 'border-warning/40',
            universities: data.data.reachSchools.map((u: Record<string, unknown>, i: number) => ({
              ...u,
              rank: i + 1,
            })),
          },
          {
            title: '目标院校',
            description: '录取概率适中，是主要申请目标',
            color: 'text-gold-leaf',
            bgColor: 'bg-gold-leaf/10',
            borderColor: 'border-gold-leaf/40',
            universities: data.data.targetSchools.map((u: Record<string, unknown>, i: number) => ({
              ...u,
              rank: i + 1,
            })),
          },
          {
            title: '稳妥院校',
            description: '录取概率较高，保底选择',
            color: 'text-bamboo',
            bgColor: 'bg-bamboo/10',
            borderColor: 'border-bamboo/40',
            universities: data.data.safeSchools.map((u: Record<string, unknown>, i: number) => ({
              ...u,
              rank: i + 1,
            })),
          },
        ]);
      }
    } catch (error) {
      console.error('University match error:', error);
      toast.error(isZh ? '名册匹配失败，请稍后重试' : 'University match failed — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskTutor = async (question: string) => {
    if (!question.trim()) return;

    setIsTutorLoading(true);
    setTutorQuestion(question);
    setTutorAnswer('');

    const aiCtx = buildVoyageAIMateContext(
      {
        currentStep,
        diagnosis: diagnosisResult,
        knowledgeMap,
        adaptiveExercises,
        examResult: examResult as unknown as Record<string, unknown>,
        scoreAnalysis: scoreAnalysis as unknown as Record<string, unknown>,
        errorRecords,
        studyPlan: studyPlan as unknown as Record<string, unknown>,
        selectedSubjects,
        selectedCountryCode: selectedCountry.code,
        hskLevel,
        targetMajorId: targetMajor.id,
      },
      locale,
    );

    try {
      // P3.4-1: 改送原始学习数据，由服务端 adapter 重算统计与薄弱点。
      // 不再把客户端算好的聚合值当作事实上行（与 knowledge-map / adaptive-learning 同一范式）。
      const session = loadCscaSession();
      const answerHistory: AnswerRecord[] = Array.isArray(session?.answerHistory)
        ? session.answerHistory
        : [];
      const subjects = diagnosisResult?.requiredSubjects?.length
        ? diagnosisResult.requiredSubjects
        : selectedSubjects;

      // P3.4-2B-1：导师输入框改走 Agent 端点（该端点具备 tool calling 能力，
      // 可调用 create_ppt）。纯问答行为不变，只是服务端多了一条"能做事"的路径。
      const res = await fetch('/api/csca/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          targetMajor: targetMajor.name,
          nationality: selectedCountry.name,
          hskLevel,
          examScore: examResult?.score || 0,
          locale,
          voyageContext: aiCtx,
          // P3.4-1: 原始学习数据（服务端重算，非客户端自述）
          answerHistory,
          subjects,
          progress: getVoyageProgress(),
          currentStage: activeStep,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // P3.4-2B：Agent 可能返回 create_ppt 或 create_interactive_lesson 动作。
        // 两者拓扑一致：服务端（有 tool calling 能力）只出决定——它按构造
        // 无法写 IndexedDB；真正落地由浏览器执行既有 createPptTask()/createHtmlTask()。
        //
        // P3.4-3B：action 契约扩展为五类（answer / create_ppt /
        // create_interactive_lesson / clarify / refer）。这里**只**处理两类 create_*：
        // 其余三类都表示"不要建任务"，因此**有意**落到下面的 setTutorAnswer(data.answer)
        // —— clarify 的 answer 就是那句反问，refer 的 answer 就是转介提示。
        // 不新增分支，是为了让"不建任务"成为一个不需要代码的可信默认。
        const actionType = data.action?.type;
        if (actionType === 'create_ppt' || actionType === 'create_interactive_lesson') {
          const isLesson = actionType === 'create_interactive_lesson';
          const pending = toast.loading(
            isLesson
              ? isZh
                ? '正在创建交互式学习任务...'
                : 'Creating interactive lesson task...'
              : isZh
                ? '正在创建 PPT 生成任务...'
                : 'Creating PPT task...',
          );
          try {
            // 用真实存在的 hash（HASH_TO_STEP），避免 P0-3 那类死锚点。
            const taskInput = {
              requirement: data.action.requirement,
              returnUrl: '/csca/voyage#ai-tutor',
              voyageStageId: 'ai_tutor',
            };
            const task = isLesson
              ? await createHtmlTask(taskInput)
              : await createPptTask(taskInput);
            toast.success(isZh ? '生成任务已创建，正在调度...' : 'Task created, scheduling...', {
              id: pending,
            });
            completeStage(7);
            router.push(`/csca/tasks/${task.taskId}`);
            return;
          } catch (err) {
            // 不得静默吞掉：任务创建失败要让用户看见。
            toast.error(
              isZh
                ? `创建生成任务失败：${err instanceof Error ? err.message : String(err)}`
                : `Failed to create task: ${err instanceof Error ? err.message : String(err)}`,
              { id: pending },
            );
            setTutorAnswer(data.answer);
            completeStage(7);
            return;
          }
        }

        setTutorAnswer(data.answer);
        // Phase F: AI Mate 成功返回即标记 Stage 08 (ai-tutor, index 7) 完成
        // 之前 Stage 08 从未被 completeStage 触发，导致航程进度失真
        completeStage(7);
      } else {
        setTutorAnswer(
          isZh
            ? 'AI 航海助手暂时无法应答，请稍后再试。'
            : 'AI Mate is unavailable right now. Please try again later.',
        );
      }
    } catch (error) {
      console.error('Tutor API error:', error);
      setTutorAnswer(
        isZh
          ? `AI 航海助手参考：
- 每日保持 2–3 小时专注学习
- 重点覆盖薄弱科目：${selectedSubjects.join('、')}
- 定期参加试航模拟，检验进度

备考策略：
- 在「学习航程」阶段建立系统日程
- 针对错题专项练习
- 多做真题熟悉试航形式

如需更个性化建议，请携带最新诊断与模考数据进入「AI 航海助手全景大厅」。`
          : `AI Mate notes:
- Study 2–3 focused hours daily.
- Prioritize weak areas: ${selectedSubjects.join(', ')}.
- Take regular Trial Voyage mocks.

Strategy:
- Build a schedule in Learning Route.
- Drill error corrections specifically.
- Work through past papers.

For a personalized plan, enter the AI Mate Hall with latest diagnosis & mock data.`,
      );
    } finally {
      setIsTutorLoading(false);
    }
  };

  const handleGenerateClassroomFromErrors = async () => {
    const errors = getErrorRecords();
    if (errors.length === 0) {
      toast.error(
        isZh
          ? '暂无触礁记录，请先探明风向或试航'
          : 'No error records yet — complete a diagnosis or mock exam first',
      );
      return;
    }

    const weakSubjects = [
      ...new Set(errors.map((e: { subject: string; module?: string }) => e.subject)),
    ];
    const weakModules = [
      ...new Set(errors.map((e: { subject: string; module?: string }) => e.module)),
    ];

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

    // P2 Vertical Slice：把生成任务真正接入 PilarCore 任务系统，
    // 不再使用 sessionStorage（关闭即丢），改用 createPptTask 持久化到 IndexedDB。
    // 任务可在 /csca/tasks/[taskId] 工作台追踪，刷新/关闭标签页后仍可恢复。
    const pending = toast.loading(isZh ? '正在创建生成任务...' : 'Creating generation task...');
    try {
      const task = await createPptTask({
        requirement: requirement.trim(),
        // P0-3：原先写 '/csca#error_review' —— /csca 上没有该锚点，是死 hash。
        // 改为本步真实存在的 hash（见 HASH_TO_STEP），任务页与课堂页的
        // 「返回」因此都落在真实的错题修正段。
        returnUrl: '/csca/voyage#error-review',
        voyageStageId: 'error_review',
      });
      toast.success(isZh ? '生成任务已创建，正在调度...' : 'Task created, scheduling...', {
        id: pending,
      });
      router.push(`/csca/tasks/${task.taskId}`);
    } catch (err) {
      toast.error(
        isZh
          ? `创建生成任务失败：${err instanceof Error ? err.message : String(err)}`
          : `Failed to create task: ${err instanceof Error ? err.message : String(err)}`,
        { id: pending },
      );
    }
  };

  const handleTaskComplete = (taskId: string) => {
    markTaskCompleted(taskId);
    setStudyPlan(getStudyPlan());
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        return prev.filter((s) => s !== subject);
      }
      return [...prev, subject];
    });
  };

  // [P3.5-B] 学生状态 → 下一学习行动。下一阶段不再由 completeStage 的盲 idx+1 决定，
  // 而由纯决策层从真实学习证据推出（见 lib/csca/personalized-voyage.ts）。
  //
  // 必须是 useMemo，不能是 useEffect + setState：saveCscaSession 会 dispatch
  // 'cscaSessionSaved' → useCscaSession 重读 → 若有 effect 依赖 nextAction 又写 session，
  // 就会无限循环。**约束：nextAction 只允许在渲染与点击回调中消费，
  // 禁止出现在任何 useEffect 依赖数组里。**
  const studentModel = useMemo(
    () =>
      buildStudentModel({
        completedStages: cscaSession.progress.completedStages,
        currentStage: cscaSession.progress.currentStage,
        answerHistory: cscaSession.sessionData?.answerHistory,
        errorRecordCount: errorRecords.length,
        examScore: examResult?.score ?? cscaSession.sessionData?.examScore ?? null,
        hasStudyPlan: !!studyPlan,
        hasDiagnosis: !!diagnosisResult,
      }),
    [
      cscaSession.progress.completedStages,
      cscaSession.progress.currentStage,
      cscaSession.sessionData?.answerHistory,
      cscaSession.sessionData?.examScore,
      errorRecords.length,
      examResult,
      studyPlan,
      diagnosisResult,
    ],
  );
  const nextAction = useMemo(() => resolveNextLearningAction(studentModel), [studentModel]);

  // 跳到决策层给出的落点。
  // activeStep 必须用 stepKey 反查 STEPS 下标，不能直接用 stageIndex：
  // STEP_DEFS 有 10 项而 VOYAGE_STAGE_ORDER 只有 9 项，两套下标不相等
  // （stage4 → step index 5，stage8 → 8，stage7 → 9）。
  const followDecision = (action: NextLearningAction = nextAction) => {
    if (action.kind === 'done') return;
    const idx = STEPS.findIndex((s) => s.id === action.stepKey);
    setCurrentStep(action.stepKey as Step);
    if (idx >= 0) setActiveStep(idx);
    // 只改「我在哪」，不标记完成 —— 用 voyage-progress 的既有 API，
    // 不让本组件越过进度模块直接写 currentStep。
    setCurrentStage(action.stageIndex);
    // /csca/voyage 的动作走 hash（同页 hashchange 已被 applyHashStep 监听）；
    // ai_tutor 落在 /csca-multi-agent，是另一个页面，走 router。
    if (action.href.startsWith('/csca/voyage#')) {
      window.location.hash = action.href.slice('/csca/voyage#'.length);
    } else if (action.href) {
      router.push(action.href);
    }
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'diagnosis':
        return (
          <div className="space-y-6">
            <div className="card-brand p-8">
              <div className="space-y-5">
                {/* 东盟国家 · 竖长令牌 70×90 */}
                <div>
                  <label className="csca-field-label mb-2 block">{t.flow.aseanCountries}</label>
                  <div className="grid grid-cols-5 gap-2 justify-items-center">
                    {ASEAN_COUNTRIES.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => onCountrySelect(country)}
                        title={isZh ? `${country.name}港` : `${country.name} Port`}
                        className={`csca-country-token ${selectedCountry.code === country.code ? 'is-selected' : ''}`}
                      >
                        <span className="csca-token-code">{country.code}</span>
                        <span className="csca-token-name">{country.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* HSK 等级 · 腰牌令牌 50×80，数字分层色 */}
                <div>
                  <label className="csca-field-label mb-2 block">{t.diagnosis.hskLevel}</label>
                  <div className="grid grid-cols-6 gap-2 justify-items-center">
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <button
                        key={level}
                        onClick={() => setHskLevel(level)}
                        className={`csca-hsk-token ${hskLevel === level ? 'is-selected' : ''}`}
                      >
                        <span
                          className="csca-hsk-num"
                          style={{
                            color: level <= 2 ? '#8B6914' : level <= 4 ? '#A0A0A0' : '#E8C547',
                          }}
                        >
                          {level}
                        </span>
                        <span style={{ fontSize: '10px', color: '#3B1D0C' }}>HSK</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 目标专业 · 志向牌网格（分类级，点击选中该类代表专业） */}
                <div className="pt-4 border-t border-sandalwood/25">
                  <label className="csca-field-label mb-3 block">{t.diagnosis.targetMajor}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { category: 'medical', name: '悬壶济世', sub: '医学' },
                      { category: 'engineering', name: '巧夺天工', sub: '工科' },
                      { category: 'business', name: '货通天下', sub: '商科' },
                      { category: 'humanities', name: '经世济民', sub: '文科' },
                      { category: 'social', name: '明法齐家', sub: '社科' },
                      { category: 'science', name: '格物致知', sub: '理科' },
                    ].map((zp) => {
                      const representative = TARGET_MAJORS.find((m) => m.category === zp.category);
                      const isSelected = representative
                        ? targetMajor.id === representative.id
                        : false;
                      return (
                        <button
                          key={zp.category}
                          onClick={() => representative && setTargetMajor(representative)}
                          className={`csca-zhipai p-3 text-center ${isSelected ? 'is-selected' : ''}`}
                        >
                          <span className="csca-zhipai-name block">{isZh ? zp.name : zp.sub}</span>
                          <span style={{ fontSize: '11px', color: '#8B6914' }}>
                            {isZh ? zp.sub : zp.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 教育背景 · 直角令牌 */}
                <div>
                  <label className="csca-field-label mb-2 block">
                    {t.diagnosis.highSchoolSystem}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EDUCATION_SYSTEMS.map((system) => (
                      <button
                        key={system.id}
                        onClick={() => setEducationSystem(system)}
                        className={`csca-zhipai px-3 py-2 ${educationSystem.id === system.id ? 'is-selected' : ''}`}
                      >
                        <span className="csca-zhipai-name">{system.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-sandalwood text-center">{t.flow.languageHint}</p>
            <button
              onClick={handleDiagnosis}
              disabled={isLoading}
              className="csca-submit w-full py-4"
            >
              {isLoading ? (
                <span className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">
                    {isZh ? '正在读取学习记录…' : 'Reading your learning records…'}
                  </span>
                  <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                    {isZh
                      ? '分析知识掌握 → 识别薄弱领域 → 生成学习建议'
                      : 'Analyzing mastery → Identifying weak areas → Generating suggestions'}
                  </span>
                </span>
              ) : isZh ? (
                `${t.diagnosis.start} →`
              ) : (
                `${t.diagnosis.start} →`
              )}
            </button>
            {/* Stage 3 · Brand：确定出发点后 paper 克制结果横幅（仅当 diagnosis 已成功返回时显示） */}
            {diagnosisResult && (
              <div className="rounded-[12px] p-5 border border-[color:var(--color-line-200)] bg-[color:var(--color-paper-100)]/80 flex items-start gap-3 min-w-0">
                <div className="shrink-0 w-9 h-9 rounded-[8px] bg-[color:var(--color-deep-ocean-700)] text-white flex items-center justify-center">
                  <Target className="w-4.5 h-4.5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="voyage-eyebrow text-[10.5px] mb-1">
                    {isZh ? '出发点 · DEPARTURE POINT' : 'DEPARTURE POINT'}
                  </p>
                  <p className="font-semibold text-[15px] text-[color:var(--color-ink-900)] mb-0.5">
                    {t.diagnosis.resultTitle}
                  </p>
                  <p className="text-[12.5px] leading-[1.6] text-[color:var(--color-muted-foreground)]">
                    {isZh
                      ? `国家 ${selectedCountry.code} · HSK ${hskLevel} · 专业 ${targetMajor.name} · 学制 ${educationSystem.name}`
                      : `Country ${selectedCountry.code} · HSK ${hskLevel} · Major ${targetMajor.name} · System ${educationSystem.name}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'knowledge_map': {
        const statusOf = (n: KnowledgeMapItem): 'weak' | 'needsReview' | 'mastered' => {
          const s = (n as unknown as Record<string, unknown>).status as string | undefined;
          if (s === 'weak' || s === 'needsReview' || s === 'mastered') return s;
          const m =
            typeof (n as unknown as Record<string, unknown>).mastery === 'number'
              ? Number((n as unknown as Record<string, unknown>).mastery)
              : 50;
          if (m >= 80) return 'mastered';
          if (m >= 40) return 'needsReview';
          return 'weak';
        };
        const buckets = {
          need: knowledgeMap.filter((n) => statusOf(n) === 'weak'),
          learning: knowledgeMap.filter((n) => statusOf(n) === 'needsReview'),
          mastered: knowledgeMap.filter((n) => statusOf(n) === 'mastered'),
        };
        const countryName = isZh
          ? ((selectedCountry as unknown as { nameZh?: string }).nameZh ?? selectedCountry.name)
          : selectedCountry.name;
        const whyTemplate = (
          t.knowledgeMap.whyMattersTemplate ??
          (isZh
            ? '对来自 {{country}}、申请 {{major}} 的学生来说，这一科处于出发点能力到目的地院校（HSK + 专业门槛）之间的关键航线上。'
            : 'For students applying to {{major}} from {{country}}, this subject sits on the critical route between departure and destination.')
        )
          .replace('{{country}}', countryName)
          .replace('{{major}}', targetMajor.name);
        return (
          <div className="space-y-6">
            {diagnosisResult && (
              <div className="card-brand p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-ink">{t.diagnosis.resultTitle}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/70 rounded-xl p-4">
                    <div className="text-sandalwood text-sm mb-1">
                      {t.diagnosis.requiredSubjects}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {diagnosisResult.requiredSubjects.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-1 bg-vermilion/10 text-vermilion rounded-full text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/70 rounded-xl p-4">
                    <div className="text-sandalwood text-sm mb-1">
                      {t.diagnosis.recommendedSubjects}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {diagnosisResult.recommendedSubjects.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-1 bg-gold-leaf/15 text-gold-leaf rounded-full text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/70 rounded-xl p-4">
                    <div className="text-sandalwood text-sm mb-2">{t.diagnosis.estimatedDays}</div>
                    <div className="font-num font-bold text-ink">
                      {diagnosisResult.estimatedDays}
                    </div>
                    <div className="text-sandalwood text-sm">{t.flow.daysUnit}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 3 · Brand: 为什么要学这个？ */}
            <div className="rounded-[12px] p-5 border border-[color:var(--color-line-200)] bg-[color:var(--color-paper-100)]/80 flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-[8px] bg-[color:var(--color-muted-gold)]/15 text-[color:var(--color-deep-ocean-800)] flex items-center justify-center">
                <Lightbulb className="w-4.5 h-4.5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="voyage-eyebrow text-[10.5px] mb-1">
                  {isZh ? '为什么要学这个？ · WHY IT MATTERS' : 'WHY IT MATTERS'}
                </p>
                <p className="font-semibold text-[14px] md:text-[15px] text-[color:var(--color-ink-900)] mb-1">
                  {t.knowledgeMap.whyMatters ??
                    (isZh ? '为什么要学这个？' : 'Why this subject matters')}
                </p>
                <p className="text-[13px] leading-[1.7] text-[color:var(--color-ink-700)]">
                  {whyTemplate}
                </p>
              </div>
            </div>

            <div className="card-brand p-6">
              <h3 className="text-lg font-semibold text-ink mb-2">{t.knowledgeMap.title}</h3>
              <p className="text-sm text-sandalwood mb-4">{t.knowledgeMap.description}</p>
              {knowledgeMap.length > 0 ? (
                <>
                  <KnowledgeGraphView topics={knowledgeMap} locale={locale} />
                  <div className="mt-4 p-4 rounded-[10px] border border-[color:var(--color-deep-ocean-700)]/20 bg-[color:var(--color-deep-ocean-700)]/[0.04]">
                    <p className="voyage-eyebrow text-[10.5px] mb-1.5">
                      {isZh ? '今日优先 · TODAY’S PRIORITY' : 'TODAY’S PRIORITY'}
                    </p>
                    <p className="text-[13px] leading-[1.65] text-[color:var(--color-ink-800)]">
                      {buckets.need.length > 0
                        ? isZh
                          ? `系统识别 ${buckets.need.length} 个薄弱知识点，建议今日从「${buckets.need[0]?.name ?? '—'}」开始训练。`
                          : `${buckets.need.length} weak knowledge points detected. Start today's drill with "${buckets.need[0]?.name ?? '—'}".`
                        : buckets.learning.length > 0
                          ? isZh
                            ? `当前 ${buckets.learning.length} 个知识点正在巩固，继续航行以稳定掌握。`
                            : `${buckets.learning.length} knowledge points in progress. Continue drilling to consolidate.`
                          : isZh
                            ? '所有已测知识点已掌握，建议开始模拟试航检验综合能力。'
                            : 'All measured knowledge points mastered. Try a mock exam to validate overall ability.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-sandalwood">
                  <Loader2 className="w-8 h-8 animate-spin text-vermilion mb-3" />
                  <p className="text-sm">{t.common.loading}</p>
                </div>
              )}
            </div>

            {/* Stage 3 · Brand: 三层 Bucket（需要掌握 / 正在学习 / 已经掌握） */}
            {knowledgeMap.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    key: 'need',
                    title: t.knowledgeMap.needToLearn ?? (isZh ? '需要掌握' : 'To Learn'),
                    list: buckets.need,
                    tone: 'error' as const,
                  },
                  {
                    key: 'learning',
                    title: t.knowledgeMap.learning ?? (isZh ? '正在学习' : 'Learning'),
                    list: buckets.learning,
                    tone: 'warn' as const,
                  },
                  {
                    key: 'mastered',
                    title:
                      t.knowledgeMap.alreadyMastered ?? (isZh ? '已经掌握' : 'Already Mastered'),
                    list: buckets.mastered,
                    tone: 'success' as const,
                  },
                ].map((b) => {
                  const card =
                    b.tone === 'error'
                      ? 'border-[color:var(--color-status-error)]/25 bg-[color:var(--color-status-error)]/5'
                      : b.tone === 'warn'
                        ? 'border-[color:var(--color-muted-gold)]/25 bg-[color:var(--color-paper-100)]'
                        : 'border-[color:var(--color-status-success)]/25 bg-[color:var(--color-status-success)]/4';
                  return (
                    <div key={b.key} className={`rounded-[12px] p-5 border ${card}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="voyage-eyebrow text-[10.5px]">
                          {b.key === 'need'
                            ? 'TO LEARN'
                            : b.key === 'learning'
                              ? 'LEARNING'
                              : 'MASTERED'}
                        </p>
                        <span className="text-[12px] font-medium text-[color:var(--color-muted-foreground)] tabular-nums">
                          {b.list.length}
                        </span>
                      </div>
                      <h4 className="font-[600] text-[15px] leading-[1.3] text-[color:var(--color-ink-900)] mb-3">
                        {b.title}
                      </h4>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {b.list.length === 0 ? (
                          <p className="text-[12.5px] text-[color:var(--color-muted-foreground)]">
                            {isZh ? '—' : '—'}
                          </p>
                        ) : (
                          b.list.map((n: KnowledgeMapItem) => (
                            <div
                              key={n.id ?? n.name}
                              className="flex items-start gap-2 text-[12.5px] leading-[1.6]"
                            >
                              <span className="mt-[4px] inline-block w-[3px] h-[3px] rounded-full bg-[color:var(--color-deep-ocean-600)] shrink-0" />
                              <span className="min-w-0">
                                <span className="font-medium text-[color:var(--color-ink-900)]">
                                  {n.name}
                                </span>
                                <span className="ml-2 text-[color:var(--color-muted-foreground)] text-[11px]">
                                  {n.subject}
                                </span>
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setActiveStep(0);
                  setCurrentStep('diagnosis');
                }}
                className="btn-brand-secondary py-4"
              >
                ← {t.common.back}
              </button>
              <button
                onClick={() => {
                  completeStage(1);
                  handleLoadAdaptiveExercises();
                }}
                disabled={isLoading || knowledgeMap.length === 0}
                className="btn-brand-primary py-4"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.common.loading}
                  </span>
                ) : (
                  `${t.adaptiveLearning.generate} →`
                )}
              </button>
            </div>
          </div>
        );
      }

      case 'adaptive_learning': {
        const currentEx = adaptiveExercises[currentExerciseIdx];
        const graded = currentEx ? exerciseFeedback[currentEx.id] !== undefined : false;
        const isLast = !!currentEx && currentExerciseIdx === adaptiveExercises.length - 1;
        const correctCount = adaptiveExercises.reduce(
          (n, e) => n + (exerciseFeedback[e.id] === true ? 1 : 0),
          0,
        );
        const attemptedCount = adaptiveExercises.reduce(
          (n, e) => n + (exerciseFeedback[e.id] !== undefined ? 1 : 0),
          0,
        );
        const trainingGoal = adaptiveExercises.length || 10;
        return (
          <div className="space-y-6">
            {/* Stage 3 · Brand：今日训练 / 训练目标 / 进度 (克制的训练面板) */}
            <div className="rounded-[12px] p-5 border border-[color:var(--color-line-200)] bg-[color:var(--color-paper-100)]/60">
              <p className="voyage-eyebrow text-[10.5px] mb-2">
                {isZh ? '演武 · TRAINING DECK' : 'TRAINING DECK'}
              </p>
              <p className="text-[12px] leading-[1.6] text-[color:var(--color-muted-foreground)] mb-4">
                {isZh
                  ? '基于你的诊断结果与航海图薄弱知识点，为你定制的靶向训练。'
                  : 'Targeted drills based on your diagnosis results and knowledge map weak points.'}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] mb-1 font-brand-eng">
                    {t.adaptiveLearning.today ?? (isZh ? '今日训练' : 'Today')}
                  </p>
                  <p className="font-semibold text-[14px] md:text-[15px] text-[color:var(--color-ink-900)]">
                    {isZh ? `${trainingGoal} 道小题` : `${trainingGoal} questions`}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] mb-1 font-brand-eng">
                    {t.adaptiveLearning.goal ?? (isZh ? '训练目标' : 'Goal')}
                  </p>
                  <p className="font-semibold text-[14px] md:text-[15px] text-[color:var(--color-ink-900)]">
                    {isZh ? `正确率 ≥ 70%` : `Accuracy ≥ 70%`}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] mb-1 font-brand-eng">
                    {t.adaptiveLearning.progress ?? (isZh ? '训练进度' : 'Progress')}
                  </p>
                  <p className="font-semibold text-[14px] md:text-[15px] text-[color:var(--color-ink-900)] tabular-nums">
                    {attemptedCount}/{trainingGoal}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-[6px] w-full rounded-full bg-[color:var(--color-line-200)] overflow-hidden">
                <div
                  className="h-full bg-[color:var(--color-deep-ocean-700)] transition-[width] duration-300 ease-out"
                  style={{
                    width: `${Math.min(100, (attemptedCount / Math.max(1, trainingGoal)) * 100)}%`,
                  }}
                />
              </div>
              {attemptedCount > 0 && (
                <p className="mt-2 text-[12px] text-[color:var(--color-muted-foreground)] tabular-nums">
                  {isZh
                    ? `已完成 ${attemptedCount} 道，正确 ${correctCount}，正确率 ${Math.round((correctCount / Math.max(1, attemptedCount)) * 100)}%`
                    : `${attemptedCount} done · ${correctCount} correct · ${Math.round((correctCount / Math.max(1, attemptedCount)) * 100)}% correct`}
                </p>
              )}
            </div>

            {currentEx ? (
              <>
                <div className="card-brand p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs px-3 py-1 bg-vermilion/10 text-vermilion rounded-full">
                      {currentEx.subject}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[color:var(--color-muted-foreground)]">
                        {t.adaptiveLearning.question} {currentExerciseIdx + 1}/
                        {adaptiveExercises.length}
                      </span>
                    </div>
                  </div>

                  <p className="text-ink text-lg mb-6 leading-relaxed">{currentEx.question}</p>
                  <div className="space-y-3">
                    {currentEx.options.map((opt, optIdx) => {
                      const isSelected = exerciseAnswers[currentEx.id] === optIdx;
                      const isCorrect = optIdx === currentEx.answer;
                      let boxCls = 'card-brand-tint bg-white text-ink hover:border-sandalwood/40';
                      let letterCls = 'bg-sandalwood/15 text-sandalwood';
                      if (graded) {
                        if (isCorrect) {
                          boxCls = 'border-2 border-bamboo bg-bamboo/10 text-ink';
                          letterCls = 'bg-bamboo text-white';
                        } else if (isSelected) {
                          boxCls = 'border-2 border-warning bg-warning/10 text-ink';
                          letterCls = 'bg-warning text-white';
                        }
                      } else if (isSelected) {
                        boxCls = 'card-brand-selected text-ink';
                        letterCls = 'bg-vermilion text-white';
                      }
                      return (
                        <button
                          key={optIdx}
                          onClick={() =>
                            !graded &&
                            setExerciseAnswers((prev) => ({ ...prev, [currentEx.id]: optIdx }))
                          }
                          disabled={graded}
                          className={`w-full p-4 text-left transition-all flex items-center gap-3 ${boxCls}`}
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm font-brand-eng ${letterCls}`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {graded && isCorrect && (
                            <span className="text-bamboo text-sm">✓ {t.mockExam.correct}</span>
                          )}
                          {graded && !isCorrect && isSelected && (
                            <span className="text-warning text-sm">✗</span>
                          )}
                          {!graded && isSelected && (
                            <svg
                              className="w-5 h-5 text-vermilion"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {graded && (
                    <div
                      className={`mt-4 p-4 rounded-xl text-sm flex items-center gap-2 ${exerciseFeedback[currentEx.id] ? 'bg-bamboo/10 text-bamboo border border-bamboo/40' : 'bg-warning/10 text-warning border border-warning/40'}`}
                    >
                      <span className="text-lg">{exerciseFeedback[currentEx.id] ? '✓' : '!'}</span>
                      <span className="font-medium">
                        {exerciseFeedback[currentEx.id]
                          ? t.adaptiveLearning.correctFeedback
                          : t.adaptiveLearning.wrongFeedback?.replace(
                              '{{answer}}',
                              String.fromCharCode(65 + currentEx.answer),
                            )}
                      </span>
                    </div>
                  )}

                  {showExerciseExplanation && currentEx.explanation && (
                    <div className="mt-6 p-4 bg-white/70 border border-sandalwood/25 rounded-xl text-sandalwood text-sm">
                      <div className="text-vermilion font-medium mb-2">
                        {t.adaptiveLearning.explanation}
                      </div>
                      {currentEx.explanation}
                    </div>
                  )}

                  {isLast && graded && (
                    <div className="mt-6 p-5 rounded-[12px] border border-[color:var(--color-deep-ocean-700)]/30 bg-[color:var(--color-deep-ocean-700)]/[0.04]">
                      <p className="voyage-eyebrow text-[10.5px] mb-2">
                        {isZh ? '今日航程 · TODAY’S VOYAGE' : 'TODAY’S VOYAGE'}
                      </p>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-muted-foreground)] mb-0.5 font-brand-eng">
                            {isZh ? '完成' : 'Done'}
                          </p>
                          <p className="font-semibold text-[15px] text-[color:var(--color-ink-900)] tabular-nums">
                            {attemptedCount}/{trainingGoal}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-muted-foreground)] mb-0.5 font-brand-eng">
                            {isZh ? '正确' : 'Correct'}
                          </p>
                          <p className="font-semibold text-[15px] text-[color:var(--color-status-success)] tabular-nums">
                            {correctCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-muted-foreground)] mb-0.5 font-brand-eng">
                            {isZh ? '正确率' : 'Accuracy'}
                          </p>
                          <p className="font-semibold text-[15px] text-[color:var(--color-ink-900)] tabular-nums">
                            {attemptedCount > 0
                              ? Math.round((correctCount / attemptedCount) * 100)
                              : 0}
                            %
                          </p>
                        </div>
                      </div>
                      <p className="text-[12.5px] leading-[1.6] text-[color:var(--color-ink-700)]">
                        {attemptedCount > 0 && correctCount === attemptedCount
                          ? isZh
                            ? '全部正确，航海状态稳定。建议进入试航检验综合能力。'
                            : 'All correct. Voyage steady. Proceed to mock exam to validate overall ability.'
                          : attemptedCount > 0 && correctCount / attemptedCount >= 0.7
                            ? isZh
                              ? '表现良好，薄弱知识点已加入纠错闭环。建议继续试航。'
                              : 'Good performance. Weak points added to correction loop. Continue to mock exam.'
                            : isZh
                              ? '部分知识点需巩固，错题已记录。建议先复习错题再试航。'
                              : 'Some knowledge points need review. Errors recorded. Review errors before mock exam.'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      if (exerciseAnswers[currentEx.id] === undefined) return;
                      setShowExerciseExplanation(true);
                    }}
                    disabled={exerciseAnswers[currentEx.id] === undefined}
                    className="btn-brand-secondary py-4"
                  >
                    {t.adaptiveLearning.explanation}
                  </button>
                  {!graded ? (
                    <button
                      onClick={() => handleSubmitExercise(currentEx, currentExerciseIdx)}
                      disabled={exerciseAnswers[currentEx.id] === undefined}
                      className="btn-brand-primary py-4"
                    >
                      {t.adaptiveLearning.submit} →
                    </button>
                  ) : isLast ? (
                    <button
                      onClick={() => {
                        if (isWrongAnswerMode) {
                          // Phase F: 错题修正模式 - 完成 Stage 06 纠错 + 跳回 error_review
                          completeStage(5);
                          setIsWrongAnswerMode(false);
                          setWrongAnswerStats(null);
                          setShowExerciseExplanation(false);
                          setActiveStep(6);
                          setCurrentStep('error_review');
                          toast.success(
                            isZh
                              ? '错题修正已完成，能力画像已更新'
                              : 'Correction complete, ability profile updated',
                          );
                        } else {
                          // Phase F: 普通练习模式 - 仅完成 Stage 03，不再提前标 Stage 04（移除 completeStage(3)）
                          completeStage(2);
                          setShowExerciseExplanation(false);
                          setActiveStep(3);
                          setCurrentStep('exam_center');
                          const acc =
                            attemptedCount > 0
                              ? Math.round((correctCount / attemptedCount) * 100)
                              : 0;
                          toast.success(
                            isZh
                              ? `今日航程完成：${attemptedCount} 题 · 正确率 ${acc}% · 下一步试航`
                              : `Today's voyage complete: ${attemptedCount} done · ${acc}% correct · Next: Mock Exam`,
                          );
                        }
                      }}
                      className="btn-brand-primary py-4"
                    >
                      {isWrongAnswerMode
                        ? isZh
                          ? '完成错题修正'
                          : 'Finish Correction'
                        : (t.adaptiveLearning.continueVoyage ??
                          (isZh ? '继续航行' : 'Continue Voyage'))}{' '}
                      →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowExerciseExplanation(false);
                        setCurrentExerciseIdx((i) => i + 1);
                      }}
                      className="btn-brand-primary py-4"
                    >
                      {t.adaptiveLearning.next} →
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-sandalwood">
                <Loader2 className="w-8 h-8 animate-spin text-vermilion mb-3" />
                <p className="text-sm">{t.common.loading}</p>
              </div>
            )}
            <button
              onClick={() => {
                setActiveStep(3);
                setCurrentStep('exam_center');
              }}
              className="btn-brand-secondary w-full py-4"
            >
              {t.mockExam.start} →
            </button>
          </div>
        );
      }

      case 'exam_center':
        return (
          <div className="space-y-6">
            <div className="card-brand p-6">
              <h3 className="text-2xl font-semibold text-ink mb-2 font-brand-title">
                {t.mockExam.selectSubjects}
              </h3>
              <p className="text-sm text-sandalwood mb-6">{t.mockExam.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CSCA_SUBJECTS.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSubjectToggle(subject.name)}
                    className={`p-4 text-left transition-all active:scale-[0.98] ${
                      selectedSubjects.includes(subject.name)
                        ? 'card-brand-selected'
                        : 'card-brand-tint bg-white hover:border-sandalwood/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-ink font-medium">{subject.name}</span>
                      {selectedSubjects.includes(subject.name) && (
                        <span className="w-5 h-5 rounded-full bg-vermilion flex items-center justify-center text-xs text-white">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-sandalwood">
                      {subject.totalQuestions}题 / {subject.duration}分钟
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stage 3 · Brand：双模式独立呈现（Practice / Full — 克制，非游戏） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[12px] border border-[color:var(--color-line-200)] bg-[color:var(--color-paper-100)]/60 p-5">
                <p className="voyage-eyebrow text-[10.5px] mb-2">
                  {isZh ? '试航演练 · TRIAL PRACTICE' : 'TRIAL PRACTICE'}
                </p>
                <h4 className="font-semibold text-[16px] leading-[1.35] text-[color:var(--color-ink-900)] mb-1">
                  {t.mockExam.practiceModeTitle ?? (isZh ? '试航演练' : 'Trial Practice')}
                </h4>
                <p className="text-[13px] leading-[1.65] text-[color:var(--color-ink-700)] mb-3 min-h-[3.3em]">
                  {t.mockExam.practiceDescription}
                </p>
                <ul className="text-[12px] text-[color:var(--color-muted-foreground)] space-y-1 mb-4">
                  <li>{isZh ? '• 低压力、半题量' : '• Low pressure, half volume'}</li>
                  <li>
                    {isZh ? '• 完成后自动进入「正式试航」' : '• Auto-advances to Formal Trial'}
                  </li>
                </ul>
                <button
                  onClick={() => {
                    setExamMode('practice');
                    if (selectedSubjects.length === 0) {
                      handleSubjectToggle(CSCA_SUBJECTS[0].name);
                    }
                    setTimeout(() => loadExamQuestions(), 0);
                  }}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-[10px] border transition-all font-medium text-[14px] ${
                    examMode === 'practice'
                      ? 'btn-brand-selected btn-brand-primary'
                      : 'btn-brand-primary'
                  }`}
                >
                  {isLoading && examMode === 'practice' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.common.loading}
                    </span>
                  ) : isZh ? (
                    '开始试航演练'
                  ) : (
                    'Start Trial Practice'
                  )}{' '}
                  →
                </button>
              </div>

              <div className="rounded-[12px] border border-[color:var(--color-deep-ocean-700)]/30 bg-[color:var(--color-deep-ocean-700)]/[0.03] p-5">
                <p className="voyage-eyebrow text-[10.5px] mb-2">
                  {isZh ? '正式试航 · FORMAL TRIAL' : 'FORMAL TRIAL'}
                </p>
                <h4 className="font-semibold text-[16px] leading-[1.35] text-[color:var(--color-ink-900)] mb-1">
                  {t.mockExam.fullModeTitle ?? (isZh ? '正式试航' : 'Formal Trial')}
                </h4>
                <p className="text-[13px] leading-[1.65] text-[color:var(--color-ink-700)] mb-3 min-h-[3.3em]">
                  {t.mockExam.fullDescription}
                </p>
                <ul className="text-[12px] text-[color:var(--color-muted-foreground)] space-y-1 mb-4">
                  <li>{isZh ? '• 真实 CSCA 考试环境' : '• Real CSCA environment'}</li>
                  <li>{isZh ? '• 严格计时、完整题量' : '• Strict timing · full paper'}</li>
                </ul>
                <button
                  onClick={() => {
                    setExamMode('full');
                    if (selectedSubjects.length === 0) {
                      handleSubjectToggle(CSCA_SUBJECTS[0].name);
                    }
                    setTimeout(() => loadExamQuestions(), 0);
                  }}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-[10px] border transition-all font-medium text-[14px] ${
                    examMode === 'full'
                      ? 'btn-brand-selected btn-brand-primary'
                      : 'btn-brand-primary'
                  }`}
                >
                  {isLoading && examMode === 'full' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.common.loading}
                    </span>
                  ) : isZh ? (
                    '进入正式试航'
                  ) : (
                    'Enter Formal Trial'
                  )}{' '}
                  →
                </button>
              </div>
            </div>

            <div className="card-brand-tint bg-white/50 p-5">
              <h4 className="text-ink font-medium mb-3">{t.mockExam.examNotes}</h4>
              <ul className="text-sm text-sandalwood space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-sandalwood mt-1">•</span>
                  <span>
                    {t.mockExam.fullMode}: {t.mockExam.fullDetails}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sandalwood mt-1">•</span>
                  <span>
                    {t.mockExam.practiceMode}: {t.mockExam.practiceDetails}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sandalwood mt-1">•</span>
                  <span>{t.mockExam.resultReview}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sandalwood mt-1">•</span>
                  <span>{t.mockExam.studyPlanAuto}</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'exam': {
        const currentQuestion = examQuestions[currentExamQuestionIdx];
        if (!currentQuestion) return null;
        const selectedAnswer = examAnswers[currentQuestion.id];
        const hasOptions = currentQuestion.options && currentQuestion.options.length > 0;
        // P4.3: 连续做题进度计算
        const answeredCount = examQuestions.filter((q) => examAnswers[q.id] !== undefined).length;
        const allAnswered = answeredCount >= examQuestions.length;
        const isLastQuestion = currentExamQuestionIdx >= examQuestions.length - 1;

        return (
          <div className="space-y-6">
            <div className="card-brand p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <span className="text-ink font-medium">{t.mockExam.questionProgress}</span>
                  <span className="text-sandalwood text-sm font-brand-eng">
                    {currentExamQuestionIdx + 1} / {examQuestions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-48 h-2 bg-sandalwood/15 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold-leaf transition-all"
                        style={{ width: `${(answeredCount / examQuestions.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sandalwood text-sm">
                      {answeredCount}/{examQuestions.length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sandalwood text-sm">
                  {t.mockExam.remainingTime}:{' '}
                  <span
                    className={`font-num font-medium ${timeRemaining >= 0 && timeRemaining < 300 ? 'text-warning animate-pulse' : 'text-ink'}`}
                  >
                    {timeRemaining < 0 ? t.mockExam.noTimeLimit : formatTime(timeRemaining)}
                  </span>
                </span>
                <button onClick={handleSubmitExam} className="btn-brand-danger px-4 py-2">
                  {t.mockExam.submitExam}
                </button>
              </div>
            </div>

            <div className="card-brand p-6">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${selectedAnswer !== undefined ? 'bg-vermilion text-white' : 'bg-sandalwood/20 text-sandalwood'}`}
                >
                  {currentExamQuestionIdx + 1}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-vermilion/10 text-vermilion rounded-full">
                    {currentQuestion.subject}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-brand-pixel ${
                      currentQuestion.difficulty === 'easy'
                        ? 'bg-bamboo/15 text-bamboo'
                        : currentQuestion.difficulty === 'medium'
                          ? 'bg-gold-leaf/15 text-gold-leaf'
                          : 'bg-warning/15 text-warning'
                    }`}
                  >
                    {currentQuestion.difficulty === 'easy'
                      ? t.mockExam.easy
                      : currentQuestion.difficulty === 'medium'
                        ? t.mockExam.medium
                        : t.mockExam.difficult}
                  </span>
                </div>
              </div>

              <p className="text-ink text-lg mb-6 leading-relaxed">{currentQuestion.question}</p>

              {hasOptions ? (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = selectedAnswer === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswerSelect(currentQuestion.id, optIdx)}
                        className={`w-full p-4 text-left transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'card-brand-selected text-ink'
                            : 'card-brand-tint bg-white text-ink hover:border-sandalwood/40'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm font-brand-eng ${isSelected ? 'bg-vermilion text-white' : 'bg-sandalwood/15 text-sandalwood'}`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {isSelected && (
                          <svg
                            className="w-5 h-5 text-vermilion"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/70 rounded-xl p-4">
                  <div className="text-sandalwood text-sm mb-3">{t.mockExam.essayQuestion}</div>
                  <textarea
                    value={selectedAnswer || ''}
                    onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    placeholder={t.mockExam.enterAnswer}
                    className="w-full h-32 bg-white border border-sandalwood/30 rounded-xl p-4 text-ink placeholder-sandalwood focus:outline-none focus:border-vermilion focus:ring-2 focus:ring-vermilion/20 resize-none text-lg transition-all"
                  />
                </div>
              )}
              {/* Q3.0.3: 练习模式下，作答后展示 V1 enrichment 解析 */}
              {examMode === 'practice' &&
                selectedAnswer !== undefined &&
                currentQuestion.answerExplanation &&
                currentQuestion.answerExplanation.trim() && (
                  <div className="mt-4 p-4 bg-deep-ocean-700/[0.06] border border-deep-ocean-700/20 rounded-xl">
                    <div className="text-vermilion text-xs font-medium mb-1">
                      {isZh ? '解析' : 'Explanation'}
                    </div>
                    <p className="text-sandalwood text-sm leading-relaxed whitespace-pre-line">
                      {currentQuestion.answerExplanation}
                    </p>
                  </div>
                )}
              {/* P4.3: 最后一题完成状态提示（不自动提交，用户手动提交） */}
              {isLastQuestion && selectedAnswer !== undefined && (
                <div
                  className={`mt-4 p-4 rounded-xl text-center ${allAnswered ? 'bg-bamboo/10 border border-bamboo/30' : 'bg-warning/10 border border-warning/30'}`}
                >
                  <p className={`font-medium ${allAnswered ? 'text-bamboo' : 'text-warning'}`}>
                    {allAnswered
                      ? isZh
                        ? '已完成全部题目'
                        : 'All questions completed'
                      : isZh
                        ? `还有 ${examQuestions.length - answeredCount} 题未作答`
                        : `${examQuestions.length - answeredCount} questions unanswered`}
                  </p>
                </div>
              )}
            </div>

            {/* P4.3: 导航按钮（辅助导航，自动推进为主交互） */}
            <div className="flex gap-4">
              <button
                onClick={() => goToQuestion(currentExamQuestionIdx - 1)}
                disabled={currentExamQuestionIdx === 0}
                className="btn-brand-secondary flex-1 py-3"
              >
                ← {t.mockExam.prevQuestion}
              </button>
              {currentExamQuestionIdx < examQuestions.length - 1 ? (
                <button
                  onClick={() => goToQuestion(currentExamQuestionIdx + 1)}
                  className="btn-brand-primary flex-1 py-3"
                >
                  {t.mockExam.nextQuestion} →
                </button>
              ) : (
                <button
                  onClick={handleSubmitExam}
                  className="btn-brand-primary btn-accent-bamboo flex-1 py-3"
                >
                  {t.mockExam.submitExam}
                </button>
              )}
            </div>

            {/* P4.3: 题号导航（已答/未答视觉区分，点击跳转） */}
            <div className="flex flex-wrap gap-2">
              {examQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(idx)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all font-brand-eng ${
                    idx === currentExamQuestionIdx
                      ? 'bg-vermilion text-white ring-2 ring-vermilion'
                      : examAnswers[q.id] !== undefined
                        ? 'bg-bamboo/20 text-bamboo'
                        : 'bg-white text-sandalwood hover:bg-sandalwood/10'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'result': {
        const abilityTable = buildAbilityTable(
          examResult as unknown as Record<string, unknown>,
          scoreAnalysis as unknown as Record<string, unknown>,
          selectedSubjects,
        );
        const nextTitle = isZh ? nextAction.title.zh : nextAction.title.en;
        const nextReason = isZh ? nextAction.reason.zh : nextAction.reason.en;
        return (
          <div className="space-y-6">
            <div className="card-brand p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">{t.mockExam.examScore}</h3>
              {examResult && (
                <div
                  className={`mb-5 p-4 rounded-xl border text-center ${examResult.score >= 80 ? 'bg-gold-leaf/10 border-gold-leaf/50 text-gold-leaf' : examResult.score >= 60 ? 'bg-bamboo/10 border-bamboo/50 text-bamboo' : 'bg-warning/10 border-warning/50 text-warning'}`}
                >
                  <div className="text-2xl font-bold">{buildExamCelebration(examResult.score)}</div>
                </div>
              )}
              {examResult ? (
                <>
                  <div className="flex items-center justify-center mb-8">
                    <div className="relative">
                      <div
                        className={`w-32 h-32 rounded-full flex items-center justify-center ${
                          examResult.score >= 80
                            ? 'bg-bamboo'
                            : examResult.score >= 60
                              ? 'bg-gradient-to-br from-gold-leaf to-warning'
                              : 'bg-warning'
                        }`}
                      >
                        <div className="text-center">
                          <span className="font-num text-white font-bold">{examResult.score}</span>
                          <div className="text-sm text-white/80 font-brand-eng">/ 100</div>
                        </div>
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white/90 border border-sandalwood/20 px-4 py-2 rounded-full">
                        <span className="text-sandalwood text-sm">
                          {t.mockExam.questionsAnswered}: {examResult.correctCount}/
                          {examQuestions.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {Object.entries(examResult.breakdown).map(([subject, score]) => (
                      <div key={subject} className="bg-white/70 rounded-lg p-4 text-center">
                        <div
                          className={`font-num font-bold ${
                            score >= 80
                              ? 'text-bamboo'
                              : score >= 60
                                ? 'text-gold-leaf'
                                : 'text-warning'
                          }`}
                        >
                          {score}
                        </div>
                        <div className="text-sm text-sandalwood mt-1">{subject}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="card-brand-tint bg-bamboo/10 border-bamboo/40 p-4">
                      <div className="text-bamboo font-num font-bold mb-1">
                        {examResult.correctCount}
                      </div>
                      <div className="text-bamboo text-sm">{t.mockExam.questionsAnswered}</div>
                    </div>
                    <div className="card-brand-tint bg-warning/10 border-warning/40 p-4">
                      <div className="text-warning font-num font-bold mb-1">
                        {examResult.wrongQuestions.length}
                      </div>
                      <div className="text-warning text-sm">{t.mockExam.questionsWrong}</div>
                    </div>
                  </div>

                  <div className="bg-white/70 border border-sandalwood/25 rounded-lg p-4 space-y-3">
                    <h4 className="text-ink font-medium flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-vermilion" /> {t.scoreAnalysis.title}
                    </h4>
                    <p className="text-sandalwood text-sm">
                      {examResult.score >= 60
                        ? t.scoreAnalysis.passing
                        : t.scoreAnalysis.belowPassing}
                    </p>
                    {scoreAnalysis && (
                      <>
                        {scoreAnalysis.rankingPercentile !== undefined && (
                          <p className="text-sandalwood text-sm">
                            {t.scoreAnalysis.percentile}:{' '}
                            <span className="font-brand-eng">
                              {scoreAnalysis.rankingPercentile}%
                            </span>
                          </p>
                        )}
                        {scoreAnalysis.weakPoints?.length > 0 && (
                          <div>
                            <p className="text-sandalwood text-xs mb-1">
                              {t.scoreAnalysis.weakPoints}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {scoreAnalysis.weakPoints.map((w) => (
                                <span
                                  key={w}
                                  className="px-2 py-0.5 bg-warning/15 text-warning rounded text-xs"
                                >
                                  {w}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-sandalwood text-sm whitespace-pre-line">
                          <span className="font-medium">{t.scoreAnalysis.improvement}: </span>
                          {scoreAnalysis.improvementPlan}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Stage 3 · Brand: 观星测运 = 能力测评表 + 下一步推荐 */}
                  {abilityTable.length > 0 && (
                    <div className="mt-6 rounded-[12px] border border-[color:var(--color-line-200)] bg-[color:var(--color-paper-100)]/70 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="voyage-eyebrow text-[10.5px] mb-1">
                            {isZh ? '观星 · OBSERVATION' : 'OBSERVATION'}
                          </p>
                          <h4 className="font-semibold text-[15px] text-[color:var(--color-ink-900)]">
                            {t.scoreAnalysis.abilityTitle ??
                              (isZh ? '你的当前能力状态' : 'Your current ability status')}
                          </h4>
                        </div>
                        <span className="text-[11px] font-brand-eng text-[color:var(--color-muted-foreground)] tracking-[0.16em]">
                          CURRENT · TARGET · GAP
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {abilityTable.map((a) => {
                          const current = a.current ?? 0;
                          const pct = Math.max(
                            0,
                            Math.min(100, (current / Math.max(1, a.target)) * 100),
                          );
                          const toneCls =
                            a.tone === 'success'
                              ? 'from-[color:var(--color-status-success)] to-[color:var(--color-status-success)]/80'
                              : a.tone === 'warn'
                                ? 'from-[color:var(--color-muted-gold)] to-[color:var(--color-muted-gold)]/80'
                                : 'from-[color:var(--color-status-error)] to-[color:var(--color-status-error)]/80';
                          return (
                            <div key={a.subjectEn ?? a.subject}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="min-w-0 flex items-baseline gap-2">
                                  <span className="font-medium text-[13.5px] text-[color:var(--color-ink-900)] truncate">
                                    {a.subject}
                                  </span>
                                  <span className="text-[11px] font-brand-eng text-[color:var(--color-muted-foreground)] tracking-[0.12em]">
                                    {a.subjectEn}
                                  </span>
                                </div>
                                <div className="tabular-nums text-[12px] text-[color:var(--color-ink-700)] shrink-0">
                                  <span
                                    className={`font-semibold ${a.tone === 'success' ? 'text-[color:var(--color-status-success)]' : a.tone === 'warn' ? 'text-[color:var(--color-muted-gold)]' : 'text-[color:var(--color-status-error)]'}`}
                                  >
                                    {current}
                                  </span>
                                  <span className="mx-1 opacity-60">/</span>
                                  <span>
                                    {(t.scoreAnalysis.abilityTarget ?? isZh) ? '目标' : 'Target'}{' '}
                                    {a.target}
                                  </span>
                                  <span className="mx-1 opacity-60">·</span>
                                  <span className="opacity-90">
                                    {(t.scoreAnalysis.abilityGap ?? isZh) ? '差距' : 'Gap'} {a.gap}
                                  </span>
                                </div>
                              </div>
                              <div className="h-[4px] w-full rounded-full bg-[color:var(--color-line-200)] overflow-hidden">
                                <div
                                  className={`h-full bg-gradient-to-r ${toneCls}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-5 pt-4 border-t border-[color:var(--color-line-200)]">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] mb-1.5 font-brand-eng">
                          {t.scoreAnalysis.recommendedNext ?? (isZh ? '下一步' : 'Next Step')}
                        </p>
                        {/* [P3.5-B] 原为只读文本（anchor 从不渲染的死字段）；现为真实可跳转按钮 */}
                        <button
                          type="button"
                          onClick={() => followDecision()}
                          className="group w-full text-left"
                        >
                          <span className="block font-semibold text-[13.5px] text-[color:var(--color-ink-900)]">
                            {nextTitle}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-[1.6] text-[color:var(--color-muted-foreground)]">
                            {nextReason}
                          </span>
                          <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--color-deep-ocean-700)]">
                            {isZh ? '前往' : 'Go'}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-sandalwood">
                  <BarChart3 className="w-10 h-10 text-sandalwood mb-3" />
                  <p className="text-sm">{isZh ? '测评加载中…' : 'Loading results…'}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 这两个是用户显式意图（我要纠错 / 我要计划），目的地由按钮自己决定，
                            不由决策层改写；只把「下一站」显式传给 completeStage，不再依赖 idx+1。 */}
              <button
                onClick={() => {
                  completeStage(4, { nextStepKey: 'error_review' });
                  setActiveStep(6);
                  setCurrentStep('error_review');
                }}
                className="btn-brand-secondary py-4"
              >
                {t.correction.title ?? (isZh ? '纠错（修正航向）' : 'Correct Your Course')} (
                {examResult?.wrongQuestions.length || 0})
              </button>
              <button
                onClick={() => {
                  completeStage(4, { nextStepKey: 'study_plan' });
                  setActiveStep(7);
                  setCurrentStep('study_plan');
                }}
                className="btn-brand-primary py-4"
              >
                {t.studyPlan.title ?? (isZh ? '查看航程计划' : 'View Route Plan')} →
              </button>
            </div>
          </div>
        );
      }

      case 'ai_tutor': {
        const aiCtx = buildVoyageAIMateContext(
          {
            currentStep,
            diagnosis: diagnosisResult,
            knowledgeMap,
            adaptiveExercises,
            examResult: examResult as unknown as Record<string, unknown>,
            scoreAnalysis: scoreAnalysis as unknown as Record<string, unknown>,
            errorRecords,
            studyPlan: studyPlan as unknown as Record<string, unknown>,
            selectedSubjects,
            selectedCountryCode: selectedCountry.code,
            hskLevel,
            targetMajorId: targetMajor.id,
          },
          locale,
        );
        const hint = getAIMateContextHint(currentStep, locale);
        return (
          <div className="space-y-6">
            {/* Stage 3 · Brand：AI 航海助手上下文面板（非孤立聊天） */}
            <div className="rounded-[12px] border border-[color:var(--color-line-200)] bg-[color:var(--color-paper-100)]/70 p-5 flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-[8px] bg-[color:var(--color-deep-ocean-700)] text-white flex items-center justify-center">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="voyage-eyebrow text-[10.5px] mb-1">
                  {isZh ? 'AI 航海助手 · AI MATE CONTEXT' : 'AI MATE · CONTEXTUAL MODE'}
                </p>
                <h4 className="font-semibold text-[14.5px] md:text-[15px] text-[color:var(--color-ink-900)] mb-1.5">
                  {t.ai.contextModeTitle ??
                    (isZh ? '上下文联动模式' : 'Context is linked to your voyage')}
                </h4>
                <p className="text-[13px] leading-[1.65] text-[color:var(--color-ink-700)]">
                  {isZh ? hint.contextHint : hint.contextHintEN}
                </p>
                <p className="mt-2 text-[11.5px] text-[color:var(--color-muted-foreground)] break-all line-clamp-2">
                  <span className="font-brand-eng uppercase tracking-[0.14em] mr-2 opacity-80">
                    CONTEXT
                  </span>
                  {aiCtx.slice(0, 180)}
                  {aiCtx.length > 180 ? '…' : ''}
                </p>
              </div>
            </div>

            <div className="card-brand p-6">
              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-deep" /> {t.mockExam.aiTutor}
              </h3>
              <p className="text-sandalwood text-sm mb-6">{t.mockExam.commonQuestions}</p>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder={
                      t.ai.placeholder ?? (isZh ? '输入你的问题...' : 'Type your question…')
                    }
                    value={tutorQuestion}
                    onChange={(e) => setTutorQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAskTutor(tutorQuestion)}
                    className="flex-1 px-4 py-3 bg-white border border-sandalwood/30 rounded-xl text-ink placeholder-sandalwood focus:outline-none focus:border-vermilion focus:ring-2 focus:ring-vermilion/20 transition-all"
                  />
                  <button
                    onClick={() => handleAskTutor(tutorQuestion)}
                    disabled={isTutorLoading}
                    className="btn-brand-primary btn-accent-indigo px-6 py-3"
                  >
                    {isTutorLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t.common.loading}
                      </span>
                    ) : (
                      t.common.next
                    )}
                  </button>
                </div>

                <div className="bg-white/70 rounded-xl p-4">
                  <div className="text-[color:var(--color-muted-foreground)] text-xs font-medium mb-3 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-[color:var(--color-muted-gold)]" />{' '}
                    {t.mockExam.hotQuestions}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(isZh
                      ? [
                          '如何提升 CSCA 成绩？',
                          '有哪些推荐备战资料？',
                          'HSK 4 需要多少词汇量？',
                          '临床医学要考哪些科目？',
                        ]
                      : [
                          'How to boost my CSCA score?',
                          'What prep materials do you recommend?',
                          'How much vocabulary for HSK 4?',
                          'Which subjects for Clinical Medicine?',
                        ]
                    ).map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAskTutor(question)}
                        className="btn-brand-ghost px-3 py-2 text-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {tutorAnswer && (
                <div className="mt-6 bg-white/70 border border-[color:var(--color-line-300)] rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[color:var(--color-deep-ocean-700)] flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-ink font-semibold">
                        {isZh ? 'AI 航海助手' : 'AI Mate'}
                      </div>
                      <div className="text-xs text-[color:var(--color-muted-foreground)]">
                        {isZh
                          ? 'CSCA 学习副驾 · 应答仅供参考'
                          : 'CSCA study co-pilot · AI suggestions'}
                      </div>
                    </div>
                  </div>
                  <div className="mb-3 p-3 bg-[color:var(--color-paper-100)] border border-[color:var(--color-line-200)] rounded-lg">
                    <div className="text-[color:var(--color-muted-foreground)] text-xs mb-1">
                      {isZh ? '你的提问' : 'Your question'}
                    </div>
                    <p className="text-ink text-sm">{tutorQuestion}</p>
                  </div>
                  <p className="text-[color:var(--color-ink-700)] text-sm leading-[1.75] whitespace-pre-line">
                    {tutorAnswer}
                  </p>
                </div>
              )}

              {!tutorAnswer && (
                <div className="mt-6 bg-white/70 border border-[color:var(--color-line-300)] rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[color:var(--color-deep-ocean-700)] flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-ink font-semibold">
                        {isZh ? 'AI 航海助手' : 'AI Mate'}
                      </div>
                      <div className="text-xs text-[color:var(--color-muted-foreground)]">
                        {isZh
                          ? '基于你的诊断/模考/错题即时建议'
                          : 'Contextual suggestions from your voyage'}
                      </div>
                    </div>
                  </div>
                  <p className="text-[color:var(--color-ink-700)] text-sm leading-[1.75]">
                    {isZh
                      ? '参考以下几点：1. 持续提升数学与物理，对临床医学至关重要；2. 每日保持 2–3 小时专注学习；3. 定期试航模拟，检验进度；4. 若目标为北医名校，建议总分稳定 90+。'
                      : 'Focus areas: 1. Keep raising math & physics — critical for Clinical Medicine; 2. Study 2–3 focused hours daily; 3. Take regular Trial Voyage mocks; 4. Aim for a stable 90+ total for top medical schools.'}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setActiveStep(8);
                  setCurrentStep('university_match');
                }}
                className="btn-brand-secondary py-4"
              >
                ← {t.mockExam.universityMatchResult}
              </button>
              <button
                onClick={() => {
                  handleGenerateClassroomFromErrors();
                }}
                className="btn-brand-primary py-4"
              >
                {t.classroomSection.generateFromErrors}
              </button>
            </div>
          </div>
        );
      }

      case 'error_review': {
        const loop = getCorrectionLoop(
          errorRecords,
          examResult as unknown as Record<string, unknown>,
          {
            scoreAnalysis: scoreAnalysis as unknown as Record<string, unknown>,
            studyPlan: studyPlan as unknown as Record<string, unknown>,
          },
          { locale },
        );
        return (
          <div className="space-y-6">
            {/* Stage 3 · Brand: 纠错闭环卡片（5 步 — 形成闭环，非纯错题列表） */}
            <div className="rounded-[12px] border border-[color:var(--color-line-200)] bg-[color:var(--color-paper-100)]/60 p-5">
              <p className="voyage-eyebrow text-[10.5px] mb-3">
                {isZh ? '修正 · CORRECTION LOOP' : 'CORRECTION LOOP'}
              </p>
              <h4 className="font-semibold text-[15px] text-[color:var(--color-ink-900)] mb-4">
                {t.correction.loopTitle ??
                  (isZh
                    ? '错题 → 分析 → 训练 → 再测 → 结果'
                    : 'Find → Analyze → Train → Retest → Result')}
              </h4>
              <ol className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {loop.map((s, i) => {
                  const active =
                    s.status === 'ready' ||
                    (s.status !== 'done' &&
                      s.status !== 'pending' &&
                      loop.every((x, j) => (j < i ? x.status === 'done' : true)));
                  const done = s.status === 'done';
                  return (
                    <li
                      key={s.code}
                      className={`relative rounded-[10px] p-3 border transition-all ${
                        active
                          ? 'border-[color:var(--color-deep-ocean-700)]/50 bg-[color:var(--color-deep-ocean-700)]/[0.06]'
                          : done
                            ? 'border-[color:var(--color-status-success)]/20 bg-[color:var(--color-status-success)]/4'
                            : 'border-[color:var(--color-line-200)] bg-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10.5px] font-brand-eng uppercase tracking-[0.14em] text-[color:var(--color-muted-foreground)]">
                          {s.code}
                        </span>
                        {done && (
                          <span className="text-[color:var(--color-status-success)] text-[12px]">
                            ✓
                          </span>
                        )}
                        {active && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-deep-ocean-700)] animate-pulse" />
                        )}
                      </div>
                      <p className="font-semibold text-[13px] leading-[1.35] text-[color:var(--color-ink-900)] mb-1">
                        {s.title}
                      </p>
                      <p className="text-[12px] leading-[1.5] text-[color:var(--color-ink-700)]">
                        {s.description}
                      </p>
                      {s.metrics?.length ? (
                        <div className="mt-2 space-y-1">
                          {s.metrics.map((m, mi) => (
                            <p
                              key={mi}
                              className="text-[11px] tabular-nums text-[color:var(--color-muted-foreground)]"
                            >
                              {m.zh}:{' '}
                              <span className="text-[color:var(--color-ink-800)]">{m.value}</span>
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="card-brand p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ink">
                  {t.correction.title ?? t.mockExam.errorList}
                </h3>
                <span className="text-sm text-sandalwood">
                  {t.mockExam.errorList}: {errorRecords.length}
                </span>
              </div>

              {errorRecords.length > 0 && (
                <button
                  onClick={handleStartWrongAnswerPractice}
                  disabled={isLoading}
                  className="btn-brand-primary w-full py-3 mb-4 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>{t.common.loading ?? 'Loading'}</span>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>
                        {isZh
                          ? `开始错题修正（${errorRecords.length} 题）`
                          : `Start Correction (${errorRecords.length} questions)`}
                      </span>
                    </>
                  )}
                </button>
              )}

              {errorRecords.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {errorRecords.map((record) => {
                    return (
                      <div
                        key={record.id}
                        className="bg-white/70 rounded-xl p-4 border-l-4 border-warning"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 bg-vermilion/10 text-vermilion rounded">
                              {record.subject}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-white text-sandalwood rounded border border-sandalwood/25">
                              {record.module}
                            </span>
                          </div>
                          <button
                            onClick={() => handleGetAIExplanation(record)}
                            disabled={isLoading}
                            className="btn-brand-primary px-3 py-1 text-sm"
                          >
                            {isLoading ? t.common.loading : t.mockExam.aiExplanation}
                          </button>
                        </div>
                        <p className="text-ink text-sm mb-3">{record.question}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-warning">
                            {t.mockExam.yourAnswer}:{' '}
                            <span className="font-brand-eng">
                              {typeof record.userAnswer === 'number'
                                ? String.fromCharCode(65 + record.userAnswer)
                                : record.userAnswer}
                            </span>
                          </span>
                          <span className="text-bamboo">
                            {t.mockExam.correctAnswer}:{' '}
                            <span className="font-brand-eng">
                              {typeof record.correctAnswer === 'number'
                                ? String.fromCharCode(65 + record.correctAnswer)
                                : record.correctAnswer}
                            </span>
                          </span>
                        </div>
                        {record.explanation && record.explanation.trim() && (
                          <div className="mt-3 p-3 bg-deep-ocean-700/[0.06] border border-deep-ocean-700/20 rounded-lg">
                            <div className="text-vermilion text-xs font-medium mb-1">
                              {isZh ? '解析' : 'Explanation'}
                            </div>
                            <p className="text-sandalwood text-sm leading-relaxed whitespace-pre-line">
                              {record.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-sandalwood">
                  <Check className="w-10 h-10 text-bamboo mb-3" />
                  <p className="text-sm">
                    {t.correction.empty ??
                      (isZh ? '暂无错题记录，继续航行。' : 'No errors yet. Continue your voyage.')}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setActiveStep(5);
                  setCurrentStep('result');
                }}
                className="btn-brand-secondary py-4"
              >
                ← {t.scoreAnalysis.title}
              </button>
              <button
                onClick={() => {
                  completeStage(5, { nextStepKey: 'study_plan' });
                  setActiveStep(7);
                  setCurrentStep('study_plan');
                }}
                className="btn-brand-primary py-4"
              >
                {t.studyPlan.title ?? (isZh ? '生成航程计划' : 'Build Route Plan')} →
              </button>
            </div>

            {showExplanation && aiExplanation && (
              <ScrollDialog
                open
                onOpenChange={(open) => !open && setShowExplanation(false)}
                title={t.mockExam.aiExplanation}
                description={t.mockExam.personalAdvice}
                className="max-w-2xl"
              >
                <div className="bg-white/70 border border-sandalwood/25 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-6 h-6 text-vermilion" />
                    <h4 className="text-ink font-semibold">{t.mockExam.deepAnalysis}</h4>
                  </div>
                  <div className="text-sandalwood text-sm leading-relaxed whitespace-pre-line">
                    {aiExplanation}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowExplanation(false)}
                    className="btn-brand-secondary flex-1 py-3"
                  >
                    {t.mockExam.close}
                  </button>
                  <button
                    onClick={() => {
                      setShowExplanation(false);
                      setActiveStep(7);
                      setCurrentStep('study_plan');
                    }}
                    className="btn-brand-primary flex-1 py-3"
                  >
                    {t.mockExam.personalizedPlan}
                  </button>
                </div>
              </ScrollDialog>
            )}
          </div>
        );
      }

      case 'study_plan': {
        const weakSubjects: string[] = selectedSubjects.slice(0, 7);
        const weekly = getWeeklyRoutePlan(studyPlan, {
          locale,
          selectedSubjects: weakSubjects,
        });
        return (
          <div className="space-y-6">
            <div className="card-brand p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">
                {t.studyPlan.title ?? t.mockExam.personalizedPlan}
              </h3>

              {studyPlan ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="card-brand-tint bg-indigo-deep/10 p-4 text-center">
                      <div className="font-num font-bold text-indigo-deep">
                        {studyPlan.targetSubjects.length}
                      </div>
                      <div className="text-sm text-indigo-deep/70">
                        {isZh ? '目标科目' : 'Target Subjects'}
                      </div>
                    </div>
                    <div className="card-brand-tint bg-gold-leaf/15 p-4 text-center">
                      <div className="font-num font-bold text-gold-leaf">
                        {studyPlan.weakAreas.length}
                      </div>
                      <div className="text-sm text-gold-leaf/80">
                        {isZh ? '薄弱航段' : 'Weak Segments'}
                      </div>
                    </div>
                    <div className="card-brand-tint bg-bamboo/15 p-4 text-center">
                      <div className="font-num font-bold text-bamboo">
                        {studyPlan.weeklyGoals.length}
                      </div>
                      <div className="text-sm text-bamboo/80">
                        {isZh ? '本周航程数' : 'Weekly Routes'}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-ink font-medium mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-gold-leaf" />{' '}
                      {isZh ? '薄弱航段' : 'Weak Segments'}
                    </h4>
                    <div className="space-y-2">
                      {studyPlan.weakAreas.map((area) => (
                        <div
                          key={`${area.subject}-${area.module}`}
                          className={`card-brand-tint flex items-center justify-between p-3 ${
                            area.priority === 'high'
                              ? 'bg-warning/10'
                              : area.priority === 'medium'
                                ? 'bg-gold-leaf/10'
                                : 'bg-white/70'
                          }`}
                        >
                          <div>
                            <span className="text-ink font-medium">{area.subject}</span>
                            <span className="text-sandalwood text-sm ml-2">{area.module}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                area.priority === 'high'
                                  ? 'bg-warning text-white'
                                  : area.priority === 'medium'
                                    ? 'bg-gold-leaf text-white'
                                    : 'bg-sandalwood text-white'
                              }`}
                            >
                              {area.priority === 'high'
                                ? isZh
                                  ? '高优先级'
                                  : 'High'
                                : area.priority === 'medium'
                                  ? isZh
                                    ? '中优先级'
                                    : 'Medium'
                                  : isZh
                                    ? '低优先级'
                                    : 'Low'}
                            </span>
                            <span className="text-sandalwood text-sm tabular-nums">
                              {isZh ? `${area.errorCount} 次错题` : `${area.errorCount} errors`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-ink font-medium mb-3 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-vermilion" /> {t.mockExam.todayTasks}
                    </h4>
                    <div className="space-y-2">
                      {studyPlan.dailyGoals.slice(0, 3).map((goal) => (
                        <div key={goal.id} className="bg-white/70 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-ink font-medium">
                              {goal.subject} - {goal.module}
                            </span>
                            {goal.completed && (
                              <span className="text-bamboo text-sm">
                                ✓ {isZh ? '完成' : 'Done'}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {goal.tasks.map((task) => (
                              <div key={task.id} className="flex items-center gap-3">
                                <button
                                  onClick={() => !task.completed && handleTaskComplete(task.id)}
                                  disabled={task.completed}
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    task.completed
                                      ? 'bg-bamboo border-bamboo'
                                      : 'border-sandalwood/40 hover:border-vermilion'
                                  }`}
                                >
                                  {task.completed && <span className="text-white text-xs">✓</span>}
                                </button>
                                <span
                                  className={
                                    task.completed
                                      ? 'text-sandalwood/70 line-through'
                                      : 'text-sandalwood'
                                  }
                                >
                                  {task.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stage 3 · Brand：本周航程 Day01 ~ Day07 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-ink font-medium flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-bamboo" />{' '}
                        {t.studyPlan.weeklyVoyage ?? (isZh ? '本周航程' : 'This Week’s Route')}
                      </h4>
                      <span className="text-[11px] font-brand-eng uppercase tracking-[0.16em] text-[color:var(--color-muted-foreground)]">
                        DAY 01 – DAY 07
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {weekly.map((d) => (
                        <div
                          key={d.index}
                          className="rounded-[10px] border border-[color:var(--color-line-200)] bg-white/65 p-3.5"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10.5px] font-brand-eng uppercase tracking-[0.14em] text-[color:var(--color-muted-foreground)]">
                              {d.label}
                            </span>
                            {d.fromPlan && (
                              <span className="text-[10.5px] text-[color:var(--color-muted-gold)] font-brand-eng">
                                {isZh ? '系统' : 'Plan'}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-[13.5px] leading-[1.3] text-[color:var(--color-ink-900)] mb-1 truncate">
                            {t.studyPlan[`day${String(d.index).padStart(2, '0')}` as 'day01'] ??
                              d.subject}
                          </p>
                          <p className="text-[12px] leading-[1.55] text-[color:var(--color-ink-700)] min-h-[2.6em]">
                            {d.focus}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-ink font-medium mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-bamboo" /> {t.mockExam.weeklyGoals}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {studyPlan.weeklyGoals.slice(0, 4).map((week) => (
                        <div key={week.id} className="bg-white/70 rounded-lg p-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-ink">
                              {isZh ? '第' : 'W'}
                              <span className="font-brand-eng">{week.weekNumber}</span>
                              {isZh ? '周' : ''}
                            </div>
                            <div className="text-sm text-sandalwood mt-1">
                              <span className="font-brand-eng">
                                {week.goals.filter((g) => g.completed).length}/{week.goals.length}
                              </span>{' '}
                              {isZh ? '完成' : 'Done'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-sandalwood">
                  <ClipboardList className="w-10 h-10 text-sandalwood mb-3" />
                  <p className="text-sm">
                    {t.studyPlan.empty ??
                      (isZh
                        ? '暂无航程计划，请先完成一次试航。'
                        : 'No route plan yet — complete a trial first.')}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setActiveStep(6);
                  setCurrentStep('error_review');
                }}
                className="btn-brand-secondary py-4"
              >
                ← {t.correction.title ?? (isZh ? '纠错' : 'Correction')}
              </button>
              <button
                onClick={() => {
                  // Phase F: 移除 completeStage(8) 提前触发；Stage 07(ai-tutor) 不再被跳过
                  // Stage 08(university-match, index 8) 完成应由院校匹配 API 成功触发
                  completeStage(6);
                  handleUniversityMatch();
                  setActiveStep(8);
                  setCurrentStep('university_match');
                }}
                disabled={isLoading}
                className="btn-brand-primary py-4"
              >
                {isZh ? '院校匹配' : 'University Match'} →
              </button>
            </div>
          </div>
        );
      }

      case 'university_match':
        return (
          <div className="space-y-6">
            <div className="card-brand p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ink">
                  {t.mockExam.universityMatchResult}
                </h3>
                <span
                  className={`text-sm ${examResult?.score ? 'text-sandalwood' : 'text-gold-leaf'}`}
                >
                  {t.mockExam.currentScore}:{' '}
                  <span className="font-brand-eng">{examResult?.score || 0}</span>
                  {!examResult?.score && <span className="ml-2">({t.mockExam.start})</span>}
                </span>
              </div>
              {universityCategories.length > 0 ? (
                <div className="space-y-6">
                  {universityCategories.map((category) => (
                    <div
                      key={category.title}
                      className={`card-brand-tint ${category.bgColor} p-4 ${category.borderColor}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className={`font-semibold ${category.color}`}>{category.title}</h4>
                          <p className="text-xs text-sandalwood">{category.description}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${category.bgColor} ${category.color}`}
                        >
                          {category.universities.length}所院校
                        </span>
                      </div>
                      <div className="space-y-3">
                        {category.universities.map((uni, idx) => (
                          <div key={uni.name} className="bg-white/70 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold font-brand-eng ${category.title === '冲刺院校' ? 'bg-warning' : category.title === '目标院校' ? 'bg-gold-leaf' : 'bg-bamboo'}`}
                                >
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="text-ink font-semibold">{uni.name}</div>
                                  <div className="text-xs text-sandalwood">
                                    {uni.nameZh} · {uni.location}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-semibold ${category.color}`}>
                                  匹配度: <span className="font-brand-eng">{uni.matchScore}%</span>
                                </div>
                                <div className="text-xs text-sandalwood">
                                  录取概率:{' '}
                                  <span className="font-brand-eng">
                                    {(uni.probability * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-sandalwood mb-2">{uni.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {uni.requirements.map((req) => (
                                <span
                                  key={req}
                                  className="px-2 py-1 bg-white text-sandalwood rounded text-xs border border-sandalwood/25 font-brand-pixel"
                                >
                                  {req}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-sandalwood">
                  <Landmark className="w-10 h-10 text-sandalwood mb-3" />
                  <button
                    onClick={handleUniversityMatch}
                    disabled={isLoading}
                    className="text-vermilion hover:text-vermilion/80 transition-colors"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        匹配中...
                      </span>
                    ) : (
                      '点击获取院校匹配'
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setActiveStep(7);
                    setCurrentStep('study_plan');
                  }}
                  className="btn-brand-secondary py-4"
                >
                  ← 返回日程司
                </button>
                <button
                  onClick={() => {
                    setActiveStep(0);
                    setCurrentStep('diagnosis');
                    setExamQuestions([]);
                    setExamAnswers({});
                    setExamResult(null);
                  }}
                  className="btn-brand-secondary py-4"
                >
                  🔄 {t.flow.restart}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    handleGenerateClassroomFromErrors();
                  }}
                  className="btn-brand-primary btn-accent-gold py-4"
                >
                  {t.classroomSection.generateFromErrors}
                </button>
                <button
                  onClick={() => {
                    setActiveStep(4);
                    setCurrentStep('ai_tutor');
                  }}
                  className="btn-brand-primary btn-accent-indigo py-4"
                >
                  {isZh ? 'AI 航海助手' : 'AI Mate'} →
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stageIndex = STEP_TO_VOYAGE_INDEX[currentStep] ?? activeStep;
  const stageMeta = (
    (t.nav as Record<string, unknown>).voyage as
      | Record<string, { eyebrow?: string; title?: string; subtitle?: string } | undefined>
      | undefined
  )?.[VOYAGE_STAGE_ORDER[stageIndex] ?? 'stage1'];
  const stageEyebrow = stageMeta?.eyebrow
    ? String(stageMeta.eyebrow)
        .toUpperCase()
        .replace(/^[^A-Z0-9]*([A-Z0-9])/, '$1')
    : 'VOYAGE';

  const headerTitle =
    (stageMeta?.title as string | undefined) ??
    STEPS.find((s) => s.id === currentStep)?.title ??
    (isZh ? '学习航程' : 'Learning Voyage');
  const headerDesc =
    (stageMeta?.subtitle as string | undefined) ??
    STEPS.find((s) => s.id === currentStep)?.description ??
    (isZh ? '按阶段完成学习、模拟与复盘。' : 'Progress through study, mock exams & review.');

  const goPrevStage = () => {
    const prev = Math.max(0, activeStep - 1);
    const s = STEPS[prev];
    if (s) {
      setActiveStep(prev);
      setCurrentStep(s.id);
    }
  };
  const goNextStage = () => {
    // [P3.5-B] 替换式推进：下一阶段不再是盲 idx+1，而是决策层根据学生状态给出的行动。
    if (nextAction.kind === 'done') return;
    followDecision(nextAction);
  };

  return (
    <BrandShell>
      <div className="brand-light min-h-screen bg-[color:var(--background)] text-ink">
        {/* Global Activity Indicator — 克制化深海蓝细线 */}
        {(isLoading || isTutorLoading) && (
          <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-[color:var(--color-line-200)] overflow-hidden">
            <div className="h-full bg-[color:var(--color-deep-ocean-700)] animate-[loading-bar_1.5s_ease-in-out_infinite] w-1/3" />
          </div>
        )}

        <main className="max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-14">
          {/* ====== 统一顶部：Breadcrumb + Eyebrow + 标题 + 一句解释 + Progress ====== */}
          <VoyagePageHeader
            eyebrow={stageEyebrow}
            title={headerTitle}
            description={headerDesc}
            stageId={stageIndex}
            currentBreadcrumb={isZh ? '学习航程' : 'Learning Voyage'}
            showProgress
          />

          {/* ====== 9 段航线 Ribbon（可点击跳转已解锁阶段） ====== */}
          <section
            aria-label={isZh ? '学习阶段导航' : 'Stage navigation'}
            className="mb-10 md:mb-12"
          >
            <div className="p-4 md:p-5 rounded-[12px] bg-white border border-[color:var(--color-line-200)]">
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                {(() => {
                  // [HYDRATION-FIX] 原 typeof window 分支导致 server/client 不一致：
                  // server 返回 null（done=false → muted-gold），client 返回真实 session
                  // （done=true → status-success），触发 hydration mismatch。
                  // 改为从 useCscaSession hook 提供的 sessionData（null on server AND
                  // client first render），mount 后 useEffect 更新真实数据。
                  const _sessionData = cscaSession?.sessionData as unknown as
                    | Record<string, unknown>
                    | undefined;
                  const _completedArr = Array.isArray(_sessionData?.completedStages)
                    ? (_sessionData?.completedStages as number[])
                    : [];
                  return VOYAGE_STAGE_ORDER.map((sid, i) => {
                    const meta = (
                      (t.nav as Record<string, unknown>).voyage as
                        | Record<
                            string,
                            { eyebrow?: string; title?: string; subtitle?: string } | undefined
                          >
                        | undefined
                    )?.[sid];
                    const done = _completedArr.includes(i);
                    const isCurrent = i === stageIndex;
                    const unlocked =
                      done ||
                      isCurrent ||
                      (_completedArr.length === 0 && i <= 1) ||
                      (_completedArr.includes(i - 1) && i === stageIndex + 1);
                    const clickable = unlocked && STEPS[i];
                    return (
                      <button
                        type="button"
                        key={sid}
                        disabled={!clickable}
                        onClick={() =>
                          clickable && STEPS[i] && (setActiveStep(i), setCurrentStep(STEPS[i].id))
                        }
                        className={[
                          'w-full text-left p-3 rounded-[10px] border transition-all duration-200 flex flex-col gap-1.5 min-w-0',
                          clickable
                            ? 'cursor-pointer hover:-translate-y-[1px] hover:shadow-[0_6px_18px_-14px_rgba(7,28,38,0.22)]'
                            : 'cursor-default',
                          isCurrent
                            ? 'border-[color:var(--color-deep-ocean-700)] bg-white'
                            : done
                              ? 'border-transparent bg-[color:var(--color-paper-200)]/70'
                              : unlocked
                                ? 'border-[color:var(--color-line-200)] bg-white/70'
                                : 'border-transparent bg-[color:var(--color-paper-200)]/40 opacity-70',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="voyage-eyebrow text-[10px] opacity-80">
                            {meta?.code ?? String(i + 1).padStart(2, '0')}
                          </span>
                          <span
                            aria-hidden
                            className={[
                              'w-2 h-2 rounded-full',
                              done
                                ? 'bg-[color:var(--color-status-success)]'
                                : isCurrent
                                  ? 'bg-[color:var(--color-muted-gold)]'
                                  : unlocked
                                    ? 'bg-[color:var(--color-deep-ocean-500)]'
                                    : 'bg-[color:var(--color-muted-foreground)]/40',
                            ].join(' ')}
                          />
                        </div>
                        <span
                          className={[
                            'truncate text-[13px] font-semibold',
                            isCurrent
                              ? 'text-[color:var(--color-deep-ocean)]'
                              : 'text-[color:var(--color-ink-900)]',
                          ].join(' ')}
                        >
                          {meta?.title ?? sid}
                        </span>
                        <span className="truncate text-[11px] text-[color:var(--color-muted-foreground)] tracking-wide uppercase">
                          {meta?.subtitle ?? ''}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </section>

          {/* ====== 内容区：Editorial panel（非游戏卡）+ 下部分页 StageFooter ====== */}
          <section aria-label="stage content" className="relative">
            <div className="p-5 md:p-7 lg:p-8 rounded-[14px] bg-white border border-[color:var(--color-line-200)] shadow-[0_1px_2px_rgba(7,28,38,0.04)]">
              <div key={currentStep} className="csca-step-fade min-w-0">
                {renderContent()}
              </div>

              <StageFooter
                className="mt-10 md:mt-12"
                backLabel={isZh ? '返回上一阶段' : 'Previous stage'}
                onBack={activeStep > 0 ? goPrevStage : undefined}
                backDisabled={activeStep <= 0}
                nextLabel={
                  nextAction.kind === 'done'
                    ? isZh
                      ? '九段航程已完成'
                      : 'Voyage complete'
                    : isZh
                      ? `下一步：${nextAction.title.zh}`
                      : `Next: ${nextAction.title.en}`
                }
                onNext={nextAction.kind !== 'done' ? goNextStage : undefined}
                nextDisabled={nextAction.kind === 'done'}
                meta={
                  <span className="tabular-nums">
                    {isZh
                      ? `第 ${activeStep + 1} / ${STEPS.length} 阶段 · ${VOYAGE_STAGE_ORDER.length} 段学习航程`
                      : `Stage ${activeStep + 1} / ${STEPS.length} · ${VOYAGE_STAGE_ORDER.length} voyages`}
                  </span>
                }
              />
            </div>

            {/* 最近模考成绩（若有）· 单行展示 · 不做游戏勋章 */}
            {examResult && (
              <div className="mt-8 p-5 md:p-6 rounded-[12px] bg-[color:var(--color-paper-100)]/70 border border-[color:var(--color-line-200)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 shrink-0 rounded-[10px] bg-[color:var(--color-deep-ocean-700)] text-white flex items-center justify-center">
                    🗺️
                  </div>
                  <div className="min-w-0">
                    <p className="voyage-eyebrow text-[10.5px] mb-1">
                      {isZh ? '最近试航 · LATEST TRIAL' : 'LATEST TRIAL VOYAGE'}
                    </p>
                    <p className="text-[14px] md:text-[15px] leading-[1.6] text-[color:var(--color-ink-700)]">
                      {t.scoreAnalysis.totalScore}：
                      <span className="font-semibold text-[color:var(--color-deep-ocean)] tabular-nums ml-1">
                        {examResult.score}
                      </span>
                      <span className="mx-2 text-[color:var(--color-line-300)]">·</span>
                      {Object.entries(examResult.breakdown)
                        .slice(0, 4)
                        .map(([s, v], i, arr) => (
                          <span key={s} className="tabular-nums">
                            <span className="text-[color:var(--color-ink-700)]">{s}</span>
                            <span className="ml-1 font-medium text-[color:var(--color-ink-900)]">
                              {String(v)}
                            </span>
                            {i < arr.length - 1 && (
                              <span className="mx-1.5 text-[color:var(--color-line-300)]">/</span>
                            )}
                          </span>
                        ))}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-[13px] text-[color:var(--color-muted-foreground)] whitespace-nowrap">
                  {buildExamCelebration(examResult.score)}
                </div>
              </div>
            )}
          </section>
        </main>

        {/* [PERF-FIX] Toaster mounts here (not the global layout) so `/` and
            /csca-multi-agent never download the sonner chunk. */}
        <Toaster position="top-center" theme="light" />
      </div>
    </BrandShell>
  );
}
