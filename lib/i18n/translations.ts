/**
 * CSCA Pilot Agent - Multi-language Support
 * Supported: English, Thai, Vietnamese, Indonesian, Chinese
 */

// 8 位幕僚文案库（批次 12）：唯一内容源 brand/advisors-content.json，
// 品牌决策选项 B（中文为唯一内容）。仅挂到 en 上，其余语言经 getTranslation
// 的 deepMerge(en, localeData) 自动继承 —— 零重复、无漂移。
import advisorsContent from '../../brand/advisors-content.json';

/** 单幕僚的完整文案库（字段与 brand/advisors-content.json 的 advisors.<id> 一致） */
export interface AdvisorVoice {
  name: string;
  role: string;
  dialogueStyle: string;
  persona: string;
  catchphrases: string[];
  welcomes: string[];
  taskDone: string[];
}

export interface Translations {
  brand: {
    name?: string;
    slogan?: string;
  };
  nav?: {
    tagline?: string;
    framework?: string;
    home?: string;
    caseStudy?: string;
    aiAssistant?: string;
    classroom?: string;
    prepCenter?: string;
    studio?: string;
    collapse?: string;
    expand?: string;
    learningVoyage?: string;
    voyage?: {
      index?: string;
      stage1?: { code?: string; eyebrow?: string; title?: string; subtitle?: string };
      stage2?: { code?: string; eyebrow?: string; title?: string; subtitle?: string };
      stage3?: { code?: string; eyebrow?: string; title?: string; subtitle?: string };
      stage4?: { code?: string; eyebrow?: string; title?: string; subtitle?: string };
      stage5?: { code?: string; eyebrow?: string; title?: string; subtitle?: string };
      stage6?: { code?: string; eyebrow?: string; title?: string; subtitle?: string };
      stage7?: { code?: string; eyebrow?: string; title?: string; subtitle?: string };
      stage8?: { code?: string; eyebrow?: string; title?: string; subtitle?: string };
      stage9?: { code?: string; eyebrow?: string; title?: string; subtitle?: string };
    };
  };
  hero?: {
    badge?: string;
    title?: string;
    description?: string;
    cta?: string;
    secondaryCta?: string;
    subtitleEN?: string;
  };
  /** 品牌层：首页 Learning Voyage 8 段（code 01..08）对应到内部 9 段的说明 */
  voyageBrand?: {
    sectionEyebrow?: string;
    sectionTitle?: string;
    sectionTitleEN?: string;
    sectionSubtitle?: string;
    sectionSubtitleEN?: string;
    ctaStage?: string;
  };
  flow?: {
    title?: string;
    progress?: string;
    step1Title?: string;
    step1Desc?: string;
    step2Title?: string;
    step2Desc?: string;
    step3Title?: string;
    step3Desc?: string;
    step4Title?: string;
    step4Desc?: string;
    step5Title?: string;
    step5Desc?: string;
    step6Title?: string;
    step6Desc?: string;
    errorReview?: string;
    studyPlan?: string;
    restart?: string;
    daysUnit?: string;
    aseanCountries?: string;
    candidateInfo?: string;
    examNotes?: string;
    languageHint?: string;
    /** stage3 新增：训练 / 试航 / 修正 通用动作文案 */
    continueVoyage?: string;
    enterOfficialTrial?: string;
    enterObservation?: string;
    resetDeparture?: string;
  };
  features?: {
    multiAgentTitle?: string;
    multiAgentDesc?: string;
    classroomTitle?: string;
    classroomDesc?: string;
    /** stage3 新增：Editorial Features 三栏标题（ROUTE / PORT / CREW） */
    sectionEyebrow?: string;
    sectionTitle?: string;
    sectionTitleEN?: string;
    sectionSubtitle?: string;
    sectionSubtitleEN?: string;
    col1Eyebrow?: string;
    col1Title?: string;
    col1Desc?: string;
    col2Eyebrow?: string;
    col2Title?: string;
    col2Desc?: string;
    col3Eyebrow?: string;
    col3Title?: string;
    col3Desc?: string;
  };
  classroomSection?: {
    title?: string;
    description?: string;
    hint?: string;
    generate?: string;
    generateFromErrors?: string;
    placeholder?: string;
    placeholderFocus?: string;
  };
  sandbox?: {
    title?: string;
    subtitle?: string;
    progress?: string;
    explored?: string;
    current?: string;
    unexplored?: string;
    enter?: string;
  };
  common?: {
    welcome?: string;
    next?: string;
    back?: string;
    complete?: string;
    loading?: string;
    generating?: string;
    error?: string;
    success?: string;
    /** 批次 16：3 天未登录回访横幅 */
    returnBanner?: string;
    /** 批次 18：10 种语言本地名称 */
    lang?: {
      zh?: string;
      en?: string;
      th?: string;
      vi?: string;
      id?: string;
      ms?: string;
      tl?: string;
      my?: string;
      km?: string;
      lo?: string;
    };
  };
  chat?: {
    placeholder?: string;
    placeholderFocus?: string;
    quickDiagnose?: string;
    quickClassroom?: string;
    quickProgress?: string;
    quickTutor?: string;
    quickMockExam?: string;
    send?: string;
    quickFlags?: string;
    voice?: string;
    roster?: string;
    rollUp?: string;
  };
  diagnosis?: {
    title?: string;
    description?: string;
    targetMajor?: string;
    nationality?: string;
    highSchoolSystem?: string;
    hskLevel?: string;
    start?: string;
    resultTitle?: string;
    requiredSubjects?: string;
    recommendedSubjects?: string;
    estimatedDays?: string;
  };
  knowledgeMap?: {
    title?: string;
    description?: string;
    selectSubject?: string;
    generate?: string;
    weak?: string;
    needsReview?: string;
    mastered?: string;
    /** stage3 新增：Learning Room 三层分类与 why-matters */
    needToLearn?: string;
    learning?: string;
    alreadyMastered?: string;
    whyMatters?: string;
    whyMattersTemplate?: string; // 支持插值 {{major}} {{country}}
  };
  adaptiveLearning?: {
    title?: string;
    description?: string;
    generate?: string;
    question?: string;
    options?: string;
    answer?: string;
    explanation?: string;
    submit?: string;
    next?: string;
    /** 批次 16：演武闯关反馈 */
    correctFeedback?: string;
    wrongFeedback?: string;
    /** stage3 新增：训练场（不使用战功/连击/胜利） */
    today?: string;
    goal?: string;
    progress?: string;
    continueVoyage?: string;
  };
  mockExam?: {
    title?: string;
    description?: string;
    start?: string;
    time?: string;
    answered?: string;
    correct?: string;
    submit?: string;
    completed?: string;
    examMode?: string;
    fullMode?: string;
    practiceMode?: string;
    fullDescription?: string;
    practiceDescription?: string;
    examNotes?: string;
    fullDetails?: string;
    practiceDetails?: string;
    resultReview?: string;
    studyPlanAuto?: string;
    selectSubjects?: string;
    questionProgress?: string;
    remainingTime?: string;
    noTimeLimit?: string;
    submitExam?: string;
    examScore?: string;
    questionsAnswered?: string;
    questionsWrong?: string;
    easy?: string;
    medium?: string;
    difficult?: string;
    essayQuestion?: string;
    enterAnswer?: string;
    nextQuestion?: string;
    prevQuestion?: string;
    correctAnswer?: string;
    yourAnswer?: string;
    errorList?: string;
    aiExplanation?: string;
    personalizedPlan?: string;
    todayTasks?: string;
    weeklyGoals?: string;
    universityMatchResult?: string;
    currentScore?: string;
    commonQuestions?: string;
    hotQuestions?: string;
    close?: string;
    deepAnalysis?: string;
    personalAdvice?: string;
    aiTutor?: string;
    /** stage3 新增：两模式品牌名 + 结束 CTA；移除 medal */
    practiceModeTitle?: string;
    fullModeTitle?: string;
    enterOfficialTrial?: string;
    enterObservation?: string;
    /** 批次 16：试航结果庆祝（无官职语言） */
    failed?: string;
  };
  scoreAnalysis?: {
    title?: string;
    description?: string;
    analyze?: string;
    totalScore?: string;
    percentile?: string;
    weakPoints?: string;
    improvement?: string;
    passing?: string;
    belowPassing?: string;
    /** stage3 新增：观星测运 → 专业 Performance Analysis 结构 */
    abilityTitle?: string;
    abilityCurrent?: string;
    abilityTarget?: string;
    abilityGap?: string;
    recommendedNext?: string;
  };
  studyPlan?: {
    title?: string;
    description?: string;
    generate?: string;
    weeklyVoyage?: string;
    dayN?: string; // Day {{n}}
    empty?: string;
    saveCta?: string;
    day01?: string;
    day02?: string;
    day03?: string;
    day04?: string;
    day05?: string;
    day06?: string;
    day07?: string;
  };
  /** stage3 新增：AI 航海助手全局智能层（ContextualAIPanel） */
  ai?: {
    panelEyebrow?: string;
    contextualTitleTemplate?: string; // 支持 {{stage}} {{contextHint}}
    contextModeTitle?: string;
    placeholder?: string;
    stageDiagnosis?: string;
    stageKnowledgeMap?: string;
    stageTraining?: string;
    stageTrial?: string;
    stageObservation?: string;
    stageCorrection?: string;
    stageRoute?: string;
    stageHall?: string;
    stageDestination?: string;
    openHallCta?: string;
  };
  /** stage3 新增：错题模块 5 段闭环（Correction Route） */
  correction?: {
    title?: string;
    subtitle?: string;
    loopTitle?: string;
    empty?: string;
    step1Eyebrow?: string;
    step1Title?: string;
    step2Eyebrow?: string;
    step2Title?: string;
    step3Eyebrow?: string;
    step3Title?: string;
    step4Eyebrow?: string;
    step4Title?: string;
    step5Eyebrow?: string;
    step5Title?: string;
    ctaRetest?: string;
    ctaNextRoute?: string;
  };
  universityMatch?: {
    title?: string;
    description?: string;
    selectMajor?: string;
    find?: string;
    safeSchools?: string;
    targetSchools?: string;
    reachSchools?: string;
    scholarships?: string;
    probability?: string;
  };
  steps?: {
    diagnosis?: string;
    knowledgeMap?: string;
    adaptiveLearning?: string;
    mockExam?: string;
    scoreAnalysis?: string;
    universityMatch?: string;
    aiTutor?: string;
  };
  dashboard?: {
    title?: string;
    subtitle?: string;
    welcome?: string;
    resumeWhere?: string;
    startVoyage?: string;
    statsProgress?: string;
    statsErrors?: string;
    statsAccuracy?: string;
    statsDaysActive?: string;
    todayTasks?: string;
    weakPoints?: string;
    recentActivity?: string;
    nextMilestone?: string;
    empty?: string;
    ctaDiagnosis?: string;
    ctaPractice?: string;
    ctaWrongAnswer?: string;
    ctaExam?: string;
  };
  wrongAnswerCenter?: {
    title?: string;
    subtitle?: string;
    empty?: string;
    filterAll?: string;
    filterSubject?: string;
    filterDifficulty?: string;
    retryAll?: string;
    retryOne?: string;
    hintKnowledgePoint?: string;
    hintRetry?: string;
    statsTotalErrors?: string;
    statsBySubject?: string;
    statsResolved?: string;
    unresolvedOnly?: string;
  };
  onboarding?: {
    title?: string;
    welcome?: string;
    step1Country?: string;
    step2Hsk?: string;
    step3Major?: string;
    step4Education?: string;
    start?: string;
    skipToVoyage?: string;
    englishFirstHint?: string;
  };
  aiMateFallback?: {
    title?: string;
    body?: string;
    retry?: string;
    contextUnavailable?: string;
  };
  /** 8 位幕僚文案库（批次 12）；可选 → 仅 en 提供，其余语言经 deepMerge 继承中文 */
  advisors?: Record<string, AdvisorVoice>;
}

export const en: Translations = {
  brand: {
    name: 'Nanyang Academy',
    slogan: 'CSCA Prep Platform for ASEAN Students',
  },
  nav: {
    tagline: 'CSCA Learning Voyage',
    framework: 'THU-MAIC · LangGraph',
    home: 'Voyage Overview',
    caseStudy: 'Student Stories',
    aiAssistant: 'AI Mate Hall',
    classroom: 'Nanyang Classroom',
    prepCenter: 'Learning Voyage',
    studio: 'AI Learning Studio',
    collapse: 'Collapse',
    expand: 'Expand',
    learningVoyage: 'Learning Voyage',
    voyage: {
      index: 'Voyage Overview',
      stage1: { code: '01', eyebrow: 'DEPARTURE · DIAGNOSIS', title: 'Departure', subtitle: 'Confirm your starting point' },
      stage2: { code: '02', eyebrow: 'VOYAGE CHART', title: 'Voyage Chart', subtitle: 'Knowledge map & dependencies' },
      stage3: { code: '03', eyebrow: 'TRAINING', title: 'Training', subtitle: 'Training ground · daily drills' },
      stage4: { code: '04', eyebrow: 'TRIAL', title: 'Trial Voyage', subtitle: 'Mock CSCA exam practice' },
      stage5: { code: '05', eyebrow: 'OBSERVATION', title: 'Observation', subtitle: 'Performance analysis' },
      stage6: { code: '06', eyebrow: 'CORRECTION', title: 'Correction', subtitle: 'Close the loop on errors' },
      stage7: { code: '07', eyebrow: 'ROUTE', title: 'Voyage Route', subtitle: 'Personalized study plan' },
      stage8: { code: '08', eyebrow: 'AI MATE', title: 'AI Mate', subtitle: 'Context-aware AI tutor (global)' },
      stage9: { code: '09', eyebrow: 'DESTINATION', title: 'University Port', subtitle: 'University matching' },
    },
  },
  hero: {
    badge: 'YOUR CSCA VOYAGE',
    title: 'Your CSCA Learning Voyage',
    description: 'From setting direction, to mastering the chart, to passing CSCA.',
    cta: 'Begin My Voyage',
    secondaryCta: 'View Voyage Chart',
  },
  voyageBrand: {
    sectionEyebrow: 'LEARNING VOYAGE',
    sectionTitle: 'The 8 Stops of Your Voyage',
    sectionTitleEN: 'THE 8 STOPS OF YOUR VOYAGE',
    sectionSubtitle:
      'Every stage follows the logic of a real maritime voyage — departure → chart → training → trial → observation → correction → route → destination.',
    sectionSubtitleEN:
      'Every stage follows the logic of a real maritime voyage — departure → chart → training → trial → observation → correction → route → destination.',
    ctaStage: 'Open this stage',
  },
  flow: {
    title: 'Learning Voyage',
    progress: 'Progress',
    step1Title: 'Departure Point',
    step1Desc: 'Confirm country / HSK / major / high-school system and your goal',
    step2Title: 'Voyage Chart Room',
    step2Desc: 'Map knowledge: to learn / learning / mastered, with dependencies',
    step3Title: 'Training Ground',
    step3Desc: 'Goal-driven daily drills with instant feedback & progress',
    step4Title: 'Trial Voyage (Mock Practice → Official Mock)',
    step4Desc: 'Low-pressure practice first, then full-fidelity mock exam',
    step5Title: 'Observation (Performance Analysis)',
    step5Desc: 'Current ability · target · gap · recommended next',
    step6Title: 'Correction Route (5-step loop)',
    step6Desc: 'Find → Why → Train → Retest → Outcome, closed loop on errors',
    errorReview: 'Correction Route',
    studyPlan: 'Voyage Route',
    restart: 'Reset Departure Point',
    daysUnit: 'days',
    aseanCountries: 'ASEAN Country',
    candidateInfo: 'Your Profile',
    examNotes: 'Exam Guidelines',
    languageHint: 'Fluent in Chinese? Switch to 简体中文 in the top-right corner.',
    continueVoyage: 'Continue Voyage',
    enterOfficialTrial: 'Enter the Official Mock Trial',
    enterObservation: 'Enter Observation (Performance Analysis)',
    resetDeparture: 'Reset Departure',
  },
  features: {
    multiAgentTitle: 'AI Voyage Crew',
    multiAgentDesc: 'AI Mate is a global intelligent layer, not an isolated chatbot — it follows your current stage context end-to-end.',
    classroomTitle: 'Custom Classroom',
    classroomDesc: 'Diagnosis-driven custom slides, quizzes, interactive simulations — scheduled to your voyage route.',
    sectionEyebrow: 'PLATFORM DNA',
    sectionTitle: 'A maritime archive for every stage of learning',
    sectionTitleEN: 'A MARITIME ARCHIVE FOR EVERY STAGE',
    sectionSubtitle:
      '9 stages, fully archived, traceable and readable by AI — from your departure point to the university port.',
    sectionSubtitleEN:
      '9 stages, fully archived, traceable and readable by AI — from your departure point to the university port.',
    col1Eyebrow: 'ROUTE',
    col1Title: 'The Learning Voyage',
    col1Desc:
      'Departure → Chart → Training → Trial → Observation → Correction → Route → Destination. A one-piece logical voyage instead of isolated features.',
    col2Eyebrow: 'PORT',
    col2Title: 'University Port',
    col2Desc:
      'After all 9 stages, AI Mate matches universities & majors and gives application advice based on your real HSK, subjects and trial scores.',
    col3Eyebrow: 'CREW',
    col3Title: 'AI Mate (Global)',
    col3Desc:
      'AI Mate reads your current stage by default: in the correction route it analyses errors; in route planning it adjusts your plan; on the chart it explains prerequisites.',
  },
  sandbox: {
    title: 'South Sea Chart Sandbox',
    subtitle: 'Part the mist, sail island by island',
    progress: '{n} routes charted',
    explored: 'Charted',
    current: 'Favorable winds here',
    unexplored: 'Mist unbroken',
    enter: 'Set Sail',
  },
  classroomSection: {
    title: 'Custom Classroom Generation',
    description: 'Based on your departure-point profile and current stage needs, AI customizes your course material including slides, quizzes, interactive simulations and project activities.',
    hint: 'Ctrl + Enter to generate',
    generate: 'Generate Classroom',
    generateFromErrors: 'Generate Classroom from Correction Route',
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
  },
  common: {
    welcome: 'Welcome aboard. Which part of the voyage do you want to begin with today?',
    next: 'Continue',
    back: 'Back',
    complete: 'Complete',
    loading: 'AI Mate is preparing…',
    generating: 'Generating learning materials…',
    error: 'Request failed — please try again.',
    success: 'Saved.',
    returnBanner: "It's been a few days since your last voyage entry — continue today.",
    lang: {
      zh: '简体中文',
      en: 'English',
      th: 'ภาษาไทย',
      vi: 'Tiếng Việt',
      id: 'Bahasa Indonesia',
      ms: 'Bahasa Malaysia',
      tl: 'Filipino',
      my: 'မြန်မာဘာသာ',
      km: 'ភាសាខ្មែរ',
      lo: 'ພາສາລາວ',
    },
  },
  chat: {
    placeholder: 'Ask AI Mate…',
    placeholderFocus: 'AI Mate reads your current stage context by default.',
    quickDiagnose: 'Open Departure Point',
    quickClassroom: 'Prepare Classroom',
    quickProgress: 'Open Voyage Log',
    quickTutor: 'Ask AI Mate',
    quickMockExam: 'Start Trial Voyage',
    send: 'Send',
    quickFlags: 'Quick actions',
    voice: 'Voice input',
    roster: 'AI Crew',
    rollUp: 'Close panel',
  },
  diagnosis: {
    title: 'Confirm Your Departure Point',
    description:
      'Choose your country, HSK level, target major, high-school system and exam goal. The voyage then begins from exactly this point.',
    targetMajor: 'Target Major *',
    nationality: 'Nationality *',
    highSchoolSystem: 'High School System',
    hskLevel: 'HSK Level',
    start: 'Lock Departure Point',
    resultTitle: 'Your Voyage Starts Here.',
    requiredSubjects: 'Required Subjects',
    recommendedSubjects: 'Recommended Subjects',
    estimatedDays: 'Recommended Preparation Time',
  },
  knowledgeMap: {
    title: 'Voyage Chart Room',
    description: 'See what you need to learn, what you are learning, and what you already mastered — with the dependencies that explain "why".',
    selectSubject: 'Select Subject',
    generate: 'Generate Voyage Chart',
    weak: 'Weak',
    needsReview: 'Needs Review',
    mastered: 'Mastered',
    needToLearn: 'To Learn',
    learning: 'Learning',
    alreadyMastered: 'Already Mastered',
    whyMatters: 'Why this subject matters',
    whyMattersTemplate:
      'For students applying to {{major}} from {{country}}, this subject sits on the critical route between your departure level and the HSK + subject threshold at destination universities.',
  },
  adaptiveLearning: {
    title: 'Training Ground',
    description: 'Goal-driven daily drills: goal, questions, instant feedback, progress. Continue the voyage when you reach the daily target.',
    generate: 'Generate Today’s Drills',
    question: 'Question',
    options: 'Options',
    answer: 'Answer',
    explanation: 'Explanation',
    submit: 'Submit',
    next: 'Next Question',
    correctFeedback: 'Correct.',
    wrongFeedback: 'Not this time — correct answer is {{answer}}.',
    today: 'Today’s Training',
    goal: 'Training Goal',
    progress: 'Training Progress',
    continueVoyage: 'Continue Voyage',
  },
  mockExam: {
    title: 'Trial Voyage',
    description:
      'Practice trial keeps the pressure low so you can build pacing muscle. Official trial mirrors the real CSCA — focus on questions, time, progress and submission only.',
    start: 'Begin Trial',
    time: 'Time',
    answered: 'Answered',
    correct: 'Correct',
    submit: 'Submit',
    completed: 'Trial Completed',
    examMode: 'Trial Mode',
    fullMode: 'Official Mock Trial',
    practiceMode: 'Practice Trial',
    fullDescription: 'Same question count and time limits as the real CSCA exam',
    practiceDescription: 'Fewer questions, no time limit, suitable for low-pressure drilling',
    examNotes: 'Exam Notes',
    fullDetails: 'Science Chinese: 80 questions / 90 min, Math: 60 questions / 90 min',
    practiceDetails: '10 questions per subject, no time limit',
    resultReview: 'Review errors and AI explanations after the trial',
    studyPlanAuto: 'AI Mate will then refine your personalized voyage route automatically',
    selectSubjects: 'Select Subjects',
    questionProgress: 'Progress',
    remainingTime: 'Remaining Time',
    noTimeLimit: 'No Time Limit',
    submitExam: 'Submit Trial',
    examScore: 'Trial Score',
    questionsAnswered: 'Correct',
    questionsWrong: 'Wrong',
    easy: 'Easy',
    medium: 'Medium',
    difficult: 'Hard',
    essayQuestion: 'Essay Question',
    enterAnswer: 'Enter your answer',
    nextQuestion: 'Next',
    prevQuestion: 'Previous',
    correctAnswer: 'Correct Answer',
    yourAnswer: 'Your Answer',
    errorList: 'Error List',
    aiExplanation: 'AI Explanation',
    personalizedPlan: 'Refined Route',
    todayTasks: "Today's Drills",
    weeklyGoals: 'Weekly Goals',
    universityMatchResult: 'University Match Result',
    currentScore: 'Current Score',
    commonQuestions: 'Common Questions',
    hotQuestions: 'Frequently Asked',
    close: 'Close',
    deepAnalysis: 'Deep Analysis',
    personalAdvice: 'Personalized Advice',
    aiTutor: 'AI Mate',
    practiceModeTitle: 'Practice Trial (low-pressure mock)',
    fullModeTitle: 'Official Mock Trial (exam fidelity)',
    enterOfficialTrial: 'Enter Official Mock Trial',
    enterObservation: 'Enter Observation (Performance Analysis)',
    failed: 'You have not reached the port yet. Refit the route, correct course, and try again.',
  },
  scoreAnalysis: {
    title: 'Observation · Performance Analysis',
    description:
      '"观星测运" is our brand name. Functionally, this page translates your trial into a professional ability profile: current level, target level, and the gap — followed by a concrete next step.',
    analyze: 'Analyze Performance',
    totalScore: 'Total Score',
    percentile: 'Ranking Percentile',
    weakPoints: 'Weak Areas',
    improvement: 'Improvement Plan',
    passing: '✓ On target range',
    belowPassing: '✗ Below target range (≥60)',
    abilityTitle: 'Your Current Ability Profile',
    abilityCurrent: 'Current Level',
    abilityTarget: 'Target Level',
    abilityGap: 'Gap',
    recommendedNext: 'Recommended Next Step',
  },
  studyPlan: {
    title: 'Voyage Route',
    description: 'A personalized route built around your exam date, current ability, weak areas and available study time.',
    generate: 'Generate Voyage Route',
    weeklyVoyage: 'This Week’s Voyage',
    dayN: 'Day {{n}}',
    empty: 'No voyage route saved yet — start from a diagnosis or a trial score.',
    saveCta: 'Save Route',
    day01: 'Basic Chinese',
    day02: 'Mathematics',
    day03: 'Physics',
    day04: 'Chemistry',
    day05: 'English',
    day06: 'Mixed Review',
    day07: 'Practice Trial',
  },
  ai: {
    panelEyebrow: 'AI MATE · CONTEXT',
    contextualTitleTemplate: 'You are in the {{stage}} stage. By default, AI Mate understands: {{contextHint}}',
    contextModeTitle: 'Context is linked to your current voyage',
    placeholder: 'Type your question…',
    stageDiagnosis:
      'You are defining your departure point. AI Mate validates goal realism, country-system mapping and subject combination rationale.',
    stageKnowledgeMap:
      'You are on the Voyage Chart. AI Mate explains node dependencies and answers "why do I need to learn this".',
    stageTraining:
      'You are in the Training Ground. AI Mate walks through wrong answers step by step, recommends similar drills, never just gives the final answer.',
    stageTrial:
      'You are on a Trial Voyage. AI Mate assists with post-trial review, pacing and strategy; never leaks answers mid-exam.',
    stageObservation:
      'You are in Observation. AI Mate translates scores into ability gaps and concrete next-step learning advice, not just raw numbers.',
    stageCorrection:
      'You are on the Correction Route. AI Mate classifies error causes (concept / formula / computation / reading) and recommends targeted drills.',
    stageRoute:
      'You are designing a Voyage Route. AI Mate adjusts load, reorders subjects and preserves rest days while meeting the exam date.',
    stageHall:
      'You are in the AI Mate Panorama Hall. AI Mate proactively recommends your next action using the latest diagnosis, chart and trial data.',
    stageDestination:
      'You have arrived at the University Port. AI Mate compares major requirements, HSK thresholds and admission difficulty to help order your applications.',
    openHallCta: 'Open AI Mate Panorama Hall',
  },
  correction: {
    title: 'Correction Route · 5-Step Loop',
    subtitle: 'Errors → why → drills → retest → outcome. Close the loop before the next long sail.',
    loopTitle: 'Find the errors · Analyze why · Train · Retest · Measure outcome',
    empty: 'No error records yet — continue your voyage.',
    step1Eyebrow: 'FIND',
    step1Title: 'Locate the Errors',
    step2Eyebrow: 'WHY',
    step2Title: 'Cause Analysis',
    step3Eyebrow: 'TRAIN',
    step3Title: 'Recommend Drills',
    step4Eyebrow: 'RETEST',
    step4Title: 'Run a Practice Retrial',
    step5Eyebrow: 'OUTCOME',
    step5Title: 'Closed-Loop Outcome',
    ctaRetest: 'Enter Practice Trial (Retest)',
    ctaNextRoute: 'Continue to Next Week’s Voyage Route',
  },
  universityMatch: {
    title: 'University Port · Destination',
    description: 'Match Chinese universities by your real profile, trial score and HSK level.',
    selectMajor: 'Target Major',
    find: 'Find Universities',
    safeSchools: 'Safe Ports',
    targetSchools: 'Target Ports',
    reachSchools: 'Reach Ports',
    scholarships: 'Available Scholarships',
    probability: 'Probability',
  },
  steps: {
    diagnosis: 'Departure Point',
    knowledgeMap: 'Voyage Chart Room',
    adaptiveLearning: 'Training Ground',
    mockExam: 'Trial Voyage',
    scoreAnalysis: 'Observation · Performance Analysis',
    universityMatch: 'University Port · Destination',
    aiTutor: 'AI Mate (Global)',
  },
  dashboard: {
    title: 'Learning Dashboard',
    subtitle: 'Your personalized learning voyage',
    welcome: 'Welcome back',
    resumeWhere: 'Continue from',
    startVoyage: 'Begin Your Voyage',
    statsProgress: 'Voyage Progress',
    statsErrors: 'Errors to Review',
    statsAccuracy: 'Recent Accuracy',
    statsDaysActive: 'Days Active',
    todayTasks: "Today's Tasks",
    weakPoints: 'Weak Points',
    recentActivity: 'Recent Activity',
    nextMilestone: 'Next Milestone',
    empty: 'Begin your voyage — start with a quick diagnosis',
    ctaDiagnosis: 'Start Diagnosis',
    ctaPractice: 'Practice',
    ctaWrongAnswer: 'Review Errors',
    ctaExam: 'Mock Exam',
  },
  wrongAnswerCenter: {
    title: 'Wrong Answer Center',
    subtitle: 'Review and correct your mistakes',
    empty: 'No errors yet — complete a mock exam first',
    filterAll: 'All',
    filterSubject: 'Subject',
    filterDifficulty: 'Difficulty',
    retryAll: 'Retry All',
    retryOne: 'Retry',
    hintKnowledgePoint: 'Knowledge Point',
    hintRetry: 'Re-attempt similar questions',
    statsTotalErrors: 'Total Errors',
    statsBySubject: 'By Subject',
    statsResolved: 'Resolved',
    unresolvedOnly: 'Unresolved only',
  },
  onboarding: {
    title: 'Welcome to CSCA',
    welcome: 'Tell us about yourself to personalize your learning voyage',
    step1Country: 'Your Country',
    step2Hsk: 'HSK Level',
    step3Major: 'Target Major',
    step4Education: 'Education System',
    start: 'Start Learning',
    skipToVoyage: 'Skip — Explore freely',
    englishFirstHint: 'All learning content is in English. The CSCA exam is bilingual (Chinese/English).',
  },
  aiMateFallback: {
    title: 'AI Mate is in fallback mode',
    body: 'The AI service is temporarily unavailable. The response below is generic. Try again in a moment for a personalized answer.',
    retry: 'Retry',
    contextUnavailable: 'No learning data yet — complete some practice or exams to get personalized guidance.',
  },
  advisors: advisorsContent.advisors,
};

export const th: Partial<Translations> = {
  nav: {
    tagline: 'เส้นทางการเรียนรู้ ASEAN แบบครบวงจร',
    framework: 'THU-MAIC · LangGraph',
    home: 'สำนักงานทางทะเล',
    caseStudy: 'กรณีศึกษานักเรียน',
    aiAssistant: 'ผู้ช่วย AI',
    classroom: 'ห้องเรียนนานยาง',
    prepCenter: 'ศูนย์เตรียมสอบ',
    collapse: 'ม้วนปิด',
    expand: 'คลี่เปิด',
  },
  hero: {
    badge: 'ระบบเตรียมสอบ CSCA',
    title: 'ผู้ช่วยเตรียมสอบ CSCA สำหรับนักเรียนอาเซียน',
    description: 'เตรียมสอบ CSCA ครบวงจรสำหรับนักเรียนอาเซียน เส้นทางการเรียนรู้เฉพาะบุคคลด้วย AI',
    cta: '扬帆起航',
  },
  flow: {
    title: 'เส้นทางการเรียนรู้',
    progress: 'ความคืบหน้า',
    step1Title: '探航风向标',
    step1Desc: 'ประเมินความรู้ปัจจุบัน ปรับแต่งเส้นทางการเรียนรู้',
    step2Title: '航海图室',
    step2Desc: 'เห็นภาพโครงสร้างความรู้ ค้นหาจุดอ่อน',
    step3Title: '演武操练',
    step3Desc: 'แบบฝึกหัดเฉพาะบุคคลตามจุดอ่อน',
    step4Title: '试航演练',
    step4Desc: 'จำลองการสอบ CSCA เสมือนจริง',
    step5Title: '观星测运',
    step5Desc: 'วิเคราะห์ข้อผิดพลาดและวางแผนพัฒนา',
    step6Title: '日程司',
    step6Desc: 'วางแผนการเรียนรู้ ติดตามความคืบหน้า',
    errorReview: 'ทบทวนข้อผิด',
    studyPlan: '日程司',
    restart: 'เริ่มใหม่',
    daysUnit: 'วัน',
    aseanCountries: 'ประเทศอาเซียน',
    candidateInfo: 'ข้อมูลผู้สมัคร',
    examNotes: 'ข้อปฏิบัติการสอบ',
    languageHint: 'หากคุณเก่งภาษาจีน สามารถเปลี่ยนเป็น 简体中文 ที่มุมขวาบน',
  },
  features: {
    multiAgentTitle: 'ติวเตอร์ AI หลายความสามารถ',
    multiAgentDesc: 'ผู้เชี่ยวชาญ AI 8 คนพร้อมให้คำปรึกษา',
    classroomTitle: '讲学堂',
    classroomDesc: 'หลักสูตรเฉพาะบุคคลตามผลวินิจฉัย',
  },
  sandbox: {
    title: 'แผนที่เดินเรือทะเลใต้',
    subtitle: 'ผ่าเมฆหมอก ก้าวข้ามเกาะแล้วเกาะเล่า',
    progress: 'สำรวจเส้นทางแล้ว {n} เส้น',
    explored: 'สำรวจแล้ว',
    current: 'ลมเหมาะที่นี่',
    unexplored: 'หมอกยังไม่จาง',
    enter: 'เข้าไป',
  },
  classroomSection: {
    title: '讲学堂生成',
    description: 'AI จะปรับแต่งเนื้อหาหลักสูตรตามผลวินิจฉัยและความต้องการของคุณ',
    hint: 'Ctrl + Enter เพื่อสร้าง',
    generate: 'Generate Classroom',
    generateFromErrors: '📚 สร้างจากข้อผิดพลาด',
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
  },
  common: {
    welcome: 'Welcome aboard. Which part of the voyage do you want to begin with today?',
    next: '进',
    back: '返航',
    complete: 'เสร็จสมบูรณ์',
    loading: 'AI Mate is preparing…',
    generating: '先生正在挥毫',
    error: '信鸽迷途，请再传一次',
    success: '呈报已准，归档在案',
    returnBanner: "Your learning voyage has been idle for a few days. Would you like to continue?",
    lang: {
      zh: "简体中文",
      en: "English",
      th: "ภาษาไทย",
      vi: "Tiếng Việt",
      id: "Bahasa Indonesia",
      ms: "Bahasa Malaysia",
      tl: "Filipino",
      my: "မြန်မာဘာသာ",
      km: "ភាសាខ្មែរ",
      lo: "ພາສາລາວ"
    }
  },
  chat: {
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
    quickDiagnose: 'Start Survey',
    quickClassroom: 'Prepare Classroom',
    quickProgress: 'Open Voyage Log',
    quickTutor: 'Ask AI Mate',
    quickMockExam: 'Start Trial Voyage',
    send: 'Send',
    quickFlags: 'Quick actions',
    voice: 'Voice input',
    roster: 'AI Crew',
    rollUp: 'Close panel',
  },
  diagnosis: {
    title: '探航风向标',
    description: 'บอกเราเกี่ยวกับแผนการศึกษาของคุณ เราจะแนะนำวิชาที่จำเป็นสำหรับการสอบ CSCA',
    targetMajor: 'สาขาที่ต้องการเรียน *',
    nationality: 'สัญชาติ *',
    highSchoolSystem: 'ระบบโรงเรียนมัธยม',
    hskLevel: 'ระดับ HSK',
    start: 'เริ่มวินิจฉัย',
    resultTitle: 'วินิจฉัยเสร็จสมบูรณ์!',
    requiredSubjects: 'วิชาที่จำเป็น',
    recommendedSubjects: 'วิชาที่แนะนำ',
    estimatedDays: 'เวลาเตรียมตัวแนะนำ',
  },
  knowledgeMap: {
    title: '航海图室',
    description: 'ระบุจุดแข็งและจุดอ่อนของความรู้',
    selectSubject: 'เลือกวิชา',
    generate: 'สร้างแผนที่ความรู้',
    weak: 'อ่อนแอ',
    needsReview: 'ต้องตรวจสอบ',
    mastered: 'เชี่ยวชาญ',
  },
  adaptiveLearning: {
    title: '演武操练',
    description: 'ฝึกหัดที่ออกแบบมาสำหรับจุดอ่อนของคุณ',
    generate: 'สร้างฝึกหัด',
    question: 'คำถาม',
    options: 'ตัวเลือก',
    answer: 'คำตอบ',
    explanation: 'คำอธิบาย',
    submit: 'ส่งคำตอบ',
    next: 'คำถามถัดไป',
  },
  mockExam: {
    title: 'การสอบจำลอง',
    description: 'ทำการสอบจำลองสไตล์ CSCA เพื่อประเมินความพร้อม',
    start: 'เริ่มการสอบ',
    time: 'เวลา',
    answered: 'ตอบแล้ว',
    correct: 'ถูกต้อง',
    submit: 'ส่งคำตอบ',
    completed: 'สอบเสร็จแล้ว!',
    examMode: 'โหมดสอบ',
    fullMode: 'โหมดเต็ม',
    practiceMode: 'โหมดฝึกหัด',
    fullDescription: 'จำนวนข้อสอบและเวลาเดียวกับข้อสอบจริง',
    practiceDescription: 'ข้อสอบน้อยกว่า เหมาะสำหรับฝึกหัดรวดเร็ว',
    examNotes: 'ข้อควรระลึก',
    fullDetails: 'ภาษาจีนวิทยาศาสตร์: 80 ข้อ/90 นาที, คณิตศาสตร์: 60 ข้อ/90 นาที',
    practiceDetails: '10 ข้อต่อวิชา ไม่จำกัดเวลา',
    resultReview: 'ดูคำตอบผิดและคำอธิบาย AI หลังสอบ',
    studyPlanAuto: 'ระบบจะสร้างแผนการเรียนส่วนตัวอัตโนมัติ',

    selectSubjects: 'Select Subjects',
    questionProgress: 'Progress',
    remainingTime: 'Remaining Time',
    noTimeLimit: 'No Time Limit',
    submitExam: 'Submit Exam',
    examScore: 'Exam Score',
    questionsAnswered: 'Correct',
    questionsWrong: 'Wrong',
    easy: 'Easy',
    medium: 'Medium',
    difficult: 'Hard',
    essayQuestion: 'Essay Question',
    enterAnswer: 'Enter your answer',
    nextQuestion: 'Next',
    prevQuestion: 'Previous',
    correctAnswer: 'Correct Answer',
    yourAnswer: 'Your Answer',
    errorList: 'Error List',
    aiExplanation: 'AI Explanation',
    personalizedPlan: 'Personalized Plan',
    todayTasks: "Today's Tasks",
    weeklyGoals: 'Weekly Goals',
    universityMatchResult: 'University Match Result',
    currentScore: 'Current Score',
    commonQuestions: 'Common Questions',
    hotQuestions: 'Popular Questions',
    close: 'Close',
    deepAnalysis: 'Deep Analysis',
    personalAdvice: 'Personalized Advice',
    aiTutor: 'AI Tutor',
  },
  scoreAnalysis: {
    title: '观星测运',
    description: 'ได้รับการวิเคราะห์รายละเอียดเกี่ยวกับผลลัพธ์และข้อเสนอแนะการปรับปรุง',
    analyze: 'วิเคราะห์คะแนน',
    totalScore: 'คะแนนรวม',
    percentile: 'เปอร์เซ็นไทล์อันดับ',
    weakPoints: 'จุดอ่อน',
    improvement: 'แผนการปรับปรุง',
    passing: '✓ ผ่านเกณฑ์',
    belowPassing: '✗ ต่ำกว่าเกณฑ์ (60)',
  },
  universityMatch: {
    title: 'จับคู่มหาวิทยาลัย',
    description: 'ค้นหามหาวิทยาลัยจีนอันดับต้นๆ ตามโปรไฟล์ของคุณ',
    selectMajor: 'สาขาที่ต้องการ',
    find: 'ค้นหามหาวิทยาลัย',
    safeSchools: 'มหาวิทยาลัยปลอดภัย',
    targetSchools: 'มหาวิทยาลัยเป้าหมาย',
    reachSchools: 'มหาวิทยาลัยท้าทาย',
    scholarships: 'ทุนการศึกษาที่มี',
    probability: 'ความน่าจะเป็น',
  },
  steps: {
    diagnosis: '探航风向标',
    knowledgeMap: '航海图室',
    adaptiveLearning: '演武操练',
    mockExam: '试航演练',
    scoreAnalysis: '观星测运',
    universityMatch: 'จับคู่มหาวิทยาลัย',
    aiTutor: 'AI Mate (Global)',
  },
};

export const vi: Partial<Translations> = {
  nav: {
    tagline: 'Lộ trình học ASEAN toàn diện',
    framework: 'THU-MAIC · LangGraph',
    home: 'Tổng cục Hàng hải',
    caseStudy: 'Câu chuyện học sinh',
    aiAssistant: 'Trợ lý AI',
    classroom: 'Lớp học Nanyang',
    prepCenter: 'Trung tâm ôn thi',
    collapse: 'Cuộn lại',
    expand: 'Mở ra',

  },
  hero: {
    badge: 'Hệ thống Luyện thi CSCA',
    title: 'Trợ lý Luyện thi CSCA cho Du học sinh ASEAN',
    description: 'Chuẩn bị kỳ thi CSCA toàn diện cho du học sinh ASEAN. Lộ trình học tập cá nhân hóa bằng AI giúp bạn đỗ vào các trường đại học Trung Quốc.',
    cta: '扬帆起航',
  },
  flow: {
    title: 'Lộ trình Học tập',
    progress: 'Tiến độ',
    step1Title: '探航风向标',
    step1Desc: 'Đánh giá trình độ hiện tại, tùy chỉnh lộ trình học',
    step2Title: '航海图室',
    step2Desc: 'Trực quan hóa cấu trúc kiến thức, tìm điểm yếu',
    step3Title: '演武操练',
    step3Desc: 'Bài tập cá nhân hóa theo điểm yếu của bạn',
    step4Title: '试航演练',
    step4Desc: 'Mô phỏng đầy đủ kỳ thi CSCA',
    step5Title: '观星测运',
    step5Desc: 'Phân tích lỗi chi tiết và kế hoạch cải thiện',
    step6Title: '日程司',
    step6Desc: 'Kế hoạch học tập có hệ thống, theo dõi tiến độ',
    errorReview: 'Xem lại lỗi sai',
    studyPlan: '日程司',
    restart: 'Bắt đầu lại',
    daysUnit: 'ngày',
    aseanCountries: 'Quốc gia ASEAN',
    candidateInfo: 'Hồ sơ của bạn',
    examNotes: 'Hướng dẫn thi',
    languageHint: 'Giỏi tiếng Trung? Chọn 简体中文 ở góc trên bên phải.',
  },
  features: {
    multiAgentTitle: 'Gia sư AI Đa năng',
    multiAgentDesc: '8 chuyên gia AI sẵn sàng hỗ trợ 24/7',
    classroomTitle: '讲学堂',
    classroomDesc: 'Khóa học tùy chỉnh theo kết quả chẩn đoán',
  },
  sandbox: {
    title: 'Sa Bàn Hải Đồ Nam Dương',
    subtitle: 'Vén sương thấy biển, vượt đảo tiến bước',
    progress: 'Đã vẽ {n} hải trình',
    explored: 'Đã khám phá',
    current: 'Gió thuận nơi này',
    unexplored: 'Sương chưa tan',
    enter: 'Tiến vào',
  },
  classroomSection: {
    title: '讲学堂生成',
    description: 'AI sẽ tùy chỉnh nội dung khóa học dựa trên chẩn đoán và nhu cầu học tập của bạn, bao gồm slide, bài kiểm tra, mô phỏng tương tác và dự án học tập.',
    hint: 'Ctrl + Enter để tạo',
    generate: 'Generate Classroom',
    generateFromErrors: '📚 Tạo từ lỗi sai',
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
  },
  common: {
    welcome: 'Welcome aboard. Which part of the voyage do you want to begin with today?',
    next: '进',
    back: '返航',
    complete: 'Hoàn thành',
    loading: 'AI Mate is preparing…',
    generating: '先生正在挥毫',
    error: '信鸽迷途，请再传一次',
    success: '呈报已准，归档在案',
    returnBanner: "Your learning voyage has been idle for a few days. Would you like to continue?",
    lang: {
      zh: "简体中文",
      en: "English",
      th: "ภาษาไทย",
      vi: "Tiếng Việt",
      id: "Bahasa Indonesia",
      ms: "Bahasa Malaysia",
      tl: "Filipino",
      my: "မြန်မာဘာသာ",
      km: "ភាសាខ្មែរ",
      lo: "ພາສາລາວ"
    }
  },
  chat: {
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
    quickDiagnose: 'Start Survey',
    quickClassroom: 'Prepare Classroom',
    quickProgress: 'Open Voyage Log',
    quickTutor: 'Ask AI Mate',
    quickMockExam: 'Start Trial Voyage',
    send: 'Send',
    quickFlags: 'Quick actions',
    voice: 'Voice input',
    roster: 'AI Crew',
    rollUp: 'Close panel',
  },
  diagnosis: {
    title: '探航风向标',
    description: 'Cho chúng tôi biết về kế hoạch học tập của bạn và chúng tôi sẽ đề xuất các môn học cho kỳ thi CSCA',
    targetMajor: 'Ngành mục tiêu *',
    nationality: 'Quốc tịch *',
    highSchoolSystem: 'Hệ thống trung học',
    hskLevel: 'Cấp độ HSK',
    start: 'Bắt đầu chẩn đoán',
    resultTitle: 'Chẩn đoán hoàn tất!',
    requiredSubjects: 'Các môn bắt buộc',
    recommendedSubjects: 'Các môn đề xuất',
    estimatedDays: 'Thời gian chuẩn bị đề xuất',
  },
  knowledgeMap: {
    title: '航海图室',
    description: 'Xác định điểm mạnh và điểm yếu của kiến thức',
    selectSubject: 'Chọn môn học',
    generate: 'Tạo bản đồ kiến thức',
    weak: 'Yếu',
    needsReview: 'Cần xem xét',
    mastered: 'Chuyên môn',
  },
  adaptiveLearning: {
    title: '演武操练',
    description: 'Câu hỏi luyện tập được điều chỉnh theo điểm yếu của bạn',
    generate: 'Tạo bài tập',
    question: 'Câu hỏi',
    options: 'Các lựa chọn',
    answer: 'Trả lời',
    explanation: 'Giải thích',
    submit: 'Gửi câu trả lời',
    next: 'Câu hỏi tiếp theo',
  },
  mockExam: {
    title: 'Kiểm tra mô phỏng',
    description: 'Hoàn thành bài kiểm tra mô phỏng CSCA để đánh giá mức độ sẵn sàng',
    start: 'Bắt đầu kiểm tra',
    time: 'Thời gian',
    answered: 'Đã trả lời',
    correct: 'Đúng',
    submit: 'Nộp bài',
    completed: 'Hoàn thành kiểm tra!',
    examMode: 'Chế độ kiểm tra',
    fullMode: 'Chế độ chính thức',
    practiceMode: 'Chế độ luyện tập',
    fullDescription: 'Số lượng câu hỏi và thời gian giống như kỳ thi chính thức',
    practiceDescription: 'Ít câu hỏi hơn, thích hợp để luyện tập nhanh',
    examNotes: 'Lưu ý thi',
    fullDetails: 'Tiếng Trung Khoa học: 80 câu/90 phút, Toán: 60 câu/90 phút',
    practiceDetails: '10 câu mỗi môn, không giới hạn thời gian',
    resultReview: 'Xem câu trả lời sai và giải thích AI sau khi thi',
    studyPlanAuto: 'Hệ thống sẽ tự động tạo kế hoạch học tập cá nhân',

    selectSubjects: 'Select Subjects',
    questionProgress: 'Progress',
    remainingTime: 'Remaining Time',
    noTimeLimit: 'No Time Limit',
    submitExam: 'Submit Exam',
    examScore: 'Exam Score',
    questionsAnswered: 'Correct',
    questionsWrong: 'Wrong',
    easy: 'Easy',
    medium: 'Medium',
    difficult: 'Hard',
    essayQuestion: 'Essay Question',
    enterAnswer: 'Enter your answer',
    nextQuestion: 'Next',
    prevQuestion: 'Previous',
    correctAnswer: 'Correct Answer',
    yourAnswer: 'Your Answer',
    errorList: 'Error List',
    aiExplanation: 'AI Explanation',
    personalizedPlan: 'Personalized Plan',
    todayTasks: "Today's Tasks",
    weeklyGoals: 'Weekly Goals',
    universityMatchResult: 'University Match Result',
    currentScore: 'Current Score',
    commonQuestions: 'Common Questions',
    hotQuestions: 'Popular Questions',
    close: 'Close',
    deepAnalysis: 'Deep Analysis',
    personalAdvice: 'Personalized Advice',
    aiTutor: 'AI Tutor',
  },
  scoreAnalysis: {
    title: '观星测运',
    description: 'Nhận phân tích chi tiết về kết quả và gợi ý cải thiện',
    analyze: 'Phân tích điểm',
    totalScore: 'Tổng điểm',
    percentile: 'Phần trăm xếp hạng',
    weakPoints: 'Điểm yếu',
    improvement: 'Kế hoạch cải thiện',
    passing: '✓ Đạt chuẩn',
    belowPassing: '✗ Dưới chuẩn (60)',
  },
  universityMatch: {
    title: 'Khớp trường đại học',
    description: 'Tìm trường đại học Trung Quốc lý tưởng dựa trên hồ sơ của bạn',
    selectMajor: 'Ngành mục tiêu',
    find: 'Tìm trường đại học',
    safeSchools: 'Trường an toàn',
    targetSchools: 'Trường mục tiêu',
    reachSchools: 'Trường thách thức',
    scholarships: 'Học bổng có sẵn',
    probability: 'Xác suất',
  },
  steps: {
    diagnosis: '探航风向标',
    knowledgeMap: '航海图室',
    adaptiveLearning: '演武操练',
    mockExam: '试航演练',
    scoreAnalysis: '观星测运',
    universityMatch: 'Khớp trường',
    aiTutor: 'AI Mate (Global)',
  },
};

export const id: Partial<Translations> = {
  nav: {
    tagline: 'Jalur Belajar ASEAN Lengkap',
    framework: 'THU-MAIC · LangGraph',
    home: 'Biro Maritim',
    caseStudy: 'Kisah Siswa',
    aiAssistant: 'Asisten AI',
    classroom: 'Kelas Nanyang',
    prepCenter: 'Pusat Persiapan',
    collapse: 'Gulung',
    expand: 'Buka',

  },
  hero: {
    badge: 'Sistem Persiapan CSCA',
    title: 'Asisten Persiapan CSCA untuk Mahasiswa ASEAN',
    description: 'Persiapan ujian CSCA satu atap untuk mahasiswa ASEAN. Jalur pembelajaran personal berbasis AI untuk membantu Anda sukses dalam ujian masuk universitas Tiongkok.',
    cta: '扬帆起航',
  },
  flow: {
    title: 'Perjalanan Belajar',
    progress: 'Kemajuan',
    step1Title: '探航风向标',
    step1Desc: 'Evaluasi tingkat pengetahuan saat ini, sesuaikan jalur belajar',
    step2Title: '航海图室',
    step2Desc: 'Visualisasi struktur pengetahuan, temukan area lemah',
    step3Title: '演武操练',
    step3Desc: 'Latihan personal berdasarkan titik lemah Anda',
    step4Title: '试航演练',
    step4Desc: 'Simulasi penuh lingkungan ujian CSCA',
    step5Title: '观星测运',
    step5Desc: 'Analisis kesalahan detail dan rencana perbaikan',
    step6Title: '日程司',
    step6Desc: 'Rencana belajar sistematis, lacak kemajuan',
    errorReview: 'Tinjau Kesalahan',
    studyPlan: '日程司',
    restart: 'Mulai Ulang',
    daysUnit: 'hari',
    aseanCountries: 'Negara ASEAN',
    candidateInfo: 'Profil Anda',
    examNotes: 'Panduan Ujian',
    languageHint: 'Fasih Mandarin? Ganti ke 简体中文 di pojok kanan atas.',
  },
  features: {
    multiAgentTitle: 'Tutor AI Multi-Agen',
    multiAgentDesc: '8 pakar AI siap membantu 24/7',
    classroomTitle: '讲学堂',
    classroomDesc: 'Kursus khusus berdasarkan hasil diagnosis Anda',
  },
  sandbox: {
    title: 'Papan Harta Laut Selatan',
    subtitle: 'Buka kabut, layar pulau demi pulau',
    progress: '{n} rute terpetakan',
    explored: 'Terpetakan',
    current: 'Angin baik di sini',
    unexplored: 'Kabut belum sirna',
    enter: 'Masuk',
  },
  classroomSection: {
    title: '讲学堂生成',
    description: 'AI akan menyesuaikan konten kursus berdasarkan diagnosis dan kebutuhan belajar Anda, termasuk slide, kuis, simulasi interaktif, dan kegiatan proyek.',
    hint: 'Ctrl + Enter untuk membuat',
    generate: 'Generate Classroom',
    generateFromErrors: '📚 Buat dari Kesalahan',
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
  },
  common: {
    welcome: 'Welcome aboard. Which part of the voyage do you want to begin with today?',
    next: '进',
    back: '返航',
    complete: 'Selesai',
    loading: 'AI Mate is preparing…',
    generating: '先生正在挥毫',
    error: '信鸽迷途，请再传一次',
    success: '呈报已准，归档在案',
    returnBanner: "Your learning voyage has been idle for a few days. Would you like to continue?",
    lang: {
      zh: "简体中文",
      en: "English",
      th: "ภาษาไทย",
      vi: "Tiếng Việt",
      id: "Bahasa Indonesia",
      ms: "Bahasa Malaysia",
      tl: "Filipino",
      my: "မြန်မာဘာသာ",
      km: "ភាសាខ្មែរ",
      lo: "ພາສາລາວ"
    }
  },
  chat: {
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
    quickDiagnose: 'Start Survey',
    quickClassroom: 'Prepare Classroom',
    quickProgress: 'Open Voyage Log',
    quickTutor: 'Ask AI Mate',
    quickMockExam: 'Start Trial Voyage',
    send: 'Send',
    quickFlags: 'Quick actions',
    voice: 'Voice input',
    roster: 'AI Crew',
    rollUp: 'Close panel',
  },
  diagnosis: {
    title: '探航风向标',
    description: 'Ceritakan rencana studi Anda dan kami akan merekomendasikan mata pelajaran untuk ujian CSCA',
    targetMajor: 'Jurusan Target *',
    nationality: 'Kewarganegaraan *',
    highSchoolSystem: 'Sistem Sekolah Menengah',
    hskLevel: 'Tingkat HSK',
    start: 'Mulai Diagnosa',
    resultTitle: 'Diagnosa Selesai!',
    requiredSubjects: 'Mata Pelajaran Wajib',
    recommendedSubjects: 'Mata Pelajaran Direkomendasikan',
    estimatedDays: 'Waktu Persiapan Direkomendasikan',
  },
  knowledgeMap: {
    title: '航海图室',
    description: 'Identifikasi kekuatan dan kelemahan pengetahuan Anda',
    selectSubject: 'Pilih Mata Pelajaran',
    generate: 'Buat Peta Pengetahuan',
    weak: 'Lemah',
    needsReview: 'Perlu Tinjauan',
    mastered: 'Mahir',
  },
  adaptiveLearning: {
    title: '演武操练',
    description: 'Soal latihan yang disesuaikan dengan kelemahan Anda',
    generate: 'Buat Latihan',
    question: 'Pertanyaan',
    options: 'Pilihan',
    answer: 'Jawaban',
    explanation: 'Penjelasan',
    submit: 'Kirim Jawaban',
    next: 'Pertanyaan Berikutnya',
  },
  mockExam: {
    title: 'Ujian Praktek',
    description: 'Selesaikan ujian praktek gaya CSCA untuk menilai kesiapan Anda',
    start: 'Mulai Ujian',
    time: 'Waktu',
    answered: 'Sudah dijawab',
    correct: 'Benar',
    submit: 'Kirim Ujian',
    completed: 'Ujian Selesai!',
    examMode: 'Mode Ujian',
    fullMode: 'Mode Penuh',
    practiceMode: 'Mode Latihan',
    fullDescription: 'Jumlah soal dan waktu sama dengan ujian resmi',
    practiceDescription: 'Sedikit soal, cocok untuk latihan cepat',
    examNotes: 'Catatan Ujian',
    fullDetails: 'Bahasa Cina Ilmiah: 80 soal/90 menit, Matematika: 60 soal/90 menit',
    practiceDetails: '10 soal per mata pelajaran, tanpa batas waktu',
    resultReview: 'Lihat jawaban salah dan penjelasan AI setelah ujian',
    studyPlanAuto: 'Sistem akan secara otomatis membuat rencana belajar personalisasi',

    selectSubjects: 'Select Subjects',
    questionProgress: 'Progress',
    remainingTime: 'Remaining Time',
    noTimeLimit: 'No Time Limit',
    submitExam: 'Submit Exam',
    examScore: 'Exam Score',
    questionsAnswered: 'Correct',
    questionsWrong: 'Wrong',
    easy: 'Easy',
    medium: 'Medium',
    difficult: 'Hard',
    essayQuestion: 'Essay Question',
    enterAnswer: 'Enter your answer',
    nextQuestion: 'Next',
    prevQuestion: 'Previous',
    correctAnswer: 'Correct Answer',
    yourAnswer: 'Your Answer',
    errorList: 'Error List',
    aiExplanation: 'AI Explanation',
    personalizedPlan: 'Personalized Plan',
    todayTasks: "Today's Tasks",
    weeklyGoals: 'Weekly Goals',
    universityMatchResult: 'University Match Result',
    currentScore: 'Current Score',
    commonQuestions: 'Common Questions',
    hotQuestions: 'Popular Questions',
    close: 'Close',
    deepAnalysis: 'Deep Analysis',
    personalAdvice: 'Personalized Advice',
    aiTutor: 'AI Tutor',
  },
  scoreAnalysis: {
    title: '观星测运',
    description: 'Dapatkan analisis detail tentang kinerja dan saran perbaikan',
    analyze: 'Analisis Skor',
    totalScore: 'Skor Total',
    percentile: 'Persentil Peringkat',
    weakPoints: 'Titik Lemah',
    improvement: 'Rencana Perbaikan',
    passing: '✓ Lulus',
    belowPassing: '✗ Dibawah batas (60)',
  },
  universityMatch: {
    title: 'Pencocokan Universitas',
    description: 'Temukan universitas Tiongkok ideal berdasarkan profil Anda',
    selectMajor: 'Jurusan Target',
    find: 'Cari Universitas',
    safeSchools: 'Universitas Aman',
    targetSchools: 'Universitas Target',
    reachSchools: 'Universitas Tantangan',
    scholarships: 'Beasiswa Tersedia',
    probability: 'Kemungkinan',
  },
  steps: {
    diagnosis: '探航风向标',
    knowledgeMap: '航海图室',
    adaptiveLearning: '演武操练',
    mockExam: '试航演练',
    scoreAnalysis: '观星测运',
    universityMatch: 'Pencocokan',
    aiTutor: 'AI Mate (Global)',
  },
};

export const zh: Partial<Translations> = {
  brand: {
    name: '南洋书院',
    slogan: '东盟来华留学 · CSCA 学习航程',
  },
  nav: {
    tagline: 'CSCA 学习航程',
    framework: '清华大学 THU-MAIC · LangGraph 驱动',
    home: '航程概览',
    caseStudy: '上岸故事',
    aiAssistant: 'AI 航海助手全景大厅',
    classroom: '讲学堂',
    prepCenter: '学习航程',
    studio: 'AI Learning Studio',
    collapse: '收起侧栏',
    expand: '展开侧栏',
    learningVoyage: '学习航程',
    voyage: {
      index: '航程概览',
      stage1: { code: '01', eyebrow: '出发 · DEPARTURE', title: '定位', subtitle: '确定你的出发点' },
      stage2: { code: '02', eyebrow: '航图 · VOYAGE CHART', title: '航海图', subtitle: '知识地图 & 前置关系' },
      stage3: { code: '03', eyebrow: '训练 · TRAINING', title: '演武操练', subtitle: '训练场 · 每日训练' },
      stage4: { code: '04', eyebrow: '试航 · TRIAL', title: '试航', subtitle: '模拟考试（练习 / 正式）' },
      stage5: { code: '05', eyebrow: '测评 · OBSERVATION', title: '观星测运', subtitle: '能力现状 / 差距 / 下一步' },
      stage6: { code: '06', eyebrow: '修正 · CORRECTION', title: '错题修正', subtitle: '找错 → 原因 → 训练 → 再测' },
      stage7: { code: '07', eyebrow: '航程 · ROUTE', title: '学习航程', subtitle: '每日到每周的个性化计划' },
      stage8: { code: '08', eyebrow: 'AI 助手 · AI MATE', title: 'AI 航海助手', subtitle: '全局智能层（理解当前阶段）' },
      stage9: { code: '09', eyebrow: '目标 · DESTINATION', title: '院校港口', subtitle: '院校与专业匹配' },
    },
  },
  hero: {
    badge: 'YOUR CSCA VOYAGE',
    title: '你的 CSCA 学习航程',
    description: '从定位方向，到掌握知识，再到最终通过 CSCA。',
    cta: '开始我的航程',
    secondaryCta: '查看航海图',
  },
  voyageBrand: {
    sectionEyebrow: 'LEARNING VOYAGE',
    sectionTitle: '学习航程 · 8 段航段',
    sectionTitleEN: 'THE 8 STOPS OF YOUR VOYAGE',
    sectionSubtitle:
      '每一段都沿着真实航海的逻辑展开：出发 → 航图 → 训练 → 试航 → 测评 → 修正 → 航程 → 目标。',
    sectionSubtitleEN:
      'Every stage follows the logic of a real maritime voyage: departure → chart → training → trial → observation → correction → route → destination.',
    ctaStage: '进入此段航程',
  },
  flow: {
    title: '学习航程',
    progress: '学习进度',
    step1Title: '定位 · 出发点',
    step1Desc: '确认国家 / HSK / 专业方向 / 课程体系 / 目标',
    step2Title: '航海图室 · Voyage Chart',
    step2Desc: '需要掌握 / 正在学习 / 已经掌握，并解释前置关系',
    step3Title: '演武操练 · 训练场',
    step3Desc: '今日训练 / 训练目标 / 即时反馈 / 训练进度',
    step4Title: '试航 · 低压练习 → 正式模拟',
    step4Desc: '先低压模拟熟悉节奏，再进入还原度更高的正式试航',
    step5Title: '观星测运 · 能力分析',
    step5Desc: '当前水平 / 目标水平 / 差距 / 推荐下一步',
    step6Title: '错题修正 · 5 段闭环',
    step6Desc: '找错 → 原因 → 训练 → 再测 → 结果，形成闭环',
    errorReview: '错题修正 · 修正航向',
    studyPlan: '学习航程 · 航程计划',
    restart: '重置出发点',
    daysUnit: '天',
    aseanCountries: '东盟国家',
    candidateInfo: '学生档案',
    examNotes: '试航须知',
    languageHint: '中文较好的同学，可在右上角切换为「简体中文」界面与 AI 讲解。',
    continueVoyage: '继续航行',
    enterOfficialTrial: '进入正式试航（模拟考试）',
    enterObservation: '进入观星测运（成绩分析）',
    resetDeparture: '重置出发点',
  },
  features: {
    multiAgentTitle: 'AI 船员（全局智能层）',
    multiAgentDesc:
      'AI 航海助手不是孤立聊天机器人，而是贯穿 9 段航程的全局智能层——在每一段默认理解你当前的学习意图。',
    classroomTitle: '定制讲学堂',
    classroomDesc: '基于出发点档案与当前航程阶段，AI 定制课件、测验、交互模拟与项目任务。',
    sectionEyebrow: '平台体系 · PLATFORM',
    sectionTitle: '航海档案式学习平台',
    sectionTitleEN: 'A MARITIME LEARNING ARCHIVE',
    sectionSubtitle:
      '9 段航程逐一展开：从出发点到院校港口，每一份学习档案都可追溯、可可视化、被 AI 真正理解并利用。',
    sectionSubtitleEN:
      '9 stages, fully archived, traceable, visualizable and end-to-end AI readable — from departure to university port.',
    col1Eyebrow: '航线 · ROUTE',
    col1Title: '学习航程（一整条逻辑）',
    col1Desc:
      '出发点 → 航图 → 训练 → 试航 → 测评 → 修正 → 航程 → 目标。一整条连续的学习逻辑航程，而不是彼此割裂的功能页面。',
    col2Eyebrow: '港口 · PORT',
    col2Title: '院校港口（目的地）',
    col2Desc:
      '完成 9 段航程后，AI 航海助手基于真实 HSK / 科目 / 试航成绩匹配院校与专业，给出申请顺序建议。',
    col3Eyebrow: '船员 · CREW',
    col3Title: 'AI 航海助手（全局）',
    col3Desc:
      '在错题模块默认分析错题，在航程计划模块默认调计划，在航海图上默认解释「我为什么要学这个」，在试航后默认做复盘。',
  },
  sandbox: {
    title: '南洋航线档案',
    subtitle: '一段一段，循档案前进',
    progress: '已归档 {n} 段航程',
    explored: '已归档',
    current: '当前航段',
    unexplored: '完成「定位」后解锁',
    enter: '进入',
  },
  classroomSection: {
    title: '讲学堂生成',
    description:
      '根据「出发点」档案与当前航程阶段的真实学习需求，AI 为你定制课件、随堂测验、交互模拟与项目任务。',
    hint: 'Ctrl + Enter 快速生成',
    generate: '生成讲学堂',
    generateFromErrors: '基于错题修正定制讲学堂',
    placeholder: '向 AI 航海助手描述你要定制的讲学堂主题与目标…',
    placeholderFocus: '描述当前航段、科目或知识点，AI 航海助手默认按上下文定制。',
  },
  common: {
    welcome: '欢迎登船。今天从哪一段航程开始？',
    next: '继续',
    back: '返回',
    complete: '完成',
    loading: 'AI 航海助手正在准备…',
    generating: '正在为你生成学习材料…',
    error: '请求失败，请稍后重试。',
    success: '已保存。',
    returnBanner: '你已连续几天没有记录航程，今天继续。',
    lang: {
      zh: "简体中文",
      en: "English",
      th: "ภาษาไทย",
      vi: "Tiếng Việt",
      id: "Bahasa Indonesia",
      ms: "Bahasa Malaysia",
      tl: "Filipino",
      my: "မြန်မာဘာသာ",
      km: "ភាសាខ្មែរ",
      lo: "ພາສາລາວ"
    }
  },
  chat: {
    placeholder: '向 AI 航海助手提问…',
    placeholderFocus: 'AI 航海助手默认理解你当前所在的航程阶段。',
    quickDiagnose: '打开出发点（定位）',
    quickClassroom: '准备讲学堂',
    quickProgress: '打开航海日志',
    quickTutor: '询问 AI 航海助手',
    quickMockExam: '开始试航',
    send: '发送',
    quickFlags: '快捷入口',
    voice: '语音输入',
    roster: 'AI 船员',
    rollUp: '收起面板',
  },
  diagnosis: {
    title: '确定你的出发点',
    description:
      '选择国家 / HSK / 目标专业 / 课程体系 / 目标。完成后系统会说：「你的航程从这里开始。」',
    targetMajor: '目标专业 *',
    nationality: '国籍 *',
    highSchoolSystem: '高中学制',
    hskLevel: 'HSK 等级',
    start: '确定出发点',
    resultTitle: '你的航程从这里开始。',
    requiredSubjects: '必考科目',
    recommendedSubjects: '建议加考科目',
    estimatedDays: '预计备考时长',
  },
  knowledgeMap: {
    title: '航海图室',
    description:
      '看清「需要掌握 / 正在学习 / 已经掌握」三个层次，并解释每个知识点为什么重要——让学生理解「我为什么要学这个」。',
    selectSubject: '选择科目',
    generate: '生成航海图',
    weak: '需要掌握',
    needsReview: '正在学习',
    mastered: '已经掌握',
    needToLearn: '需要掌握',
    learning: '正在学习',
    alreadyMastered: '已经掌握',
    whyMatters: '我为什么要学这个？',
    whyMattersTemplate:
      '对来自 {{country}}、申请 {{major}} 的学生来说，这一科处于出发点能力到目的地院校（HSK + 专业门槛）之间的关键航线上。',
  },
  adaptiveLearning: {
    title: '演武操练 · 训练场',
    description:
      '训练场：今日训练 / 训练目标 / 题目 / 即时反馈 / 训练进度。达到每日目标后继续航行。',
    generate: '生成今日训练',
    question: '题目',
    options: '选项',
    answer: '答案',
    explanation: '解析',
    submit: '提交',
    next: '下一题',
    correctFeedback: '正确。',
    wrongFeedback: '还需要再练习。正确答案是 {{answer}}。',
    today: '今日训练',
    goal: '训练目标',
    progress: '训练进度',
    continueVoyage: '继续航行',
  },
  mockExam: {
    title: '试航',
    description:
      '练习试航用于低压力熟悉题型与节奏；正式试航还原 CSCA 环境——视觉尽量克制，只保留题目 / 时间 / 进度 / 状态 / 提交。',
    start: '开始试航',
    time: '时间',
    answered: '已答',
    correct: '答对',
    submit: '提交',
    completed: '试航完成',
    examMode: '试航模式',
    fullMode: '正式试航',
    practiceMode: '练习试航',
    fullDescription: '与正式 CSCA 一致的题量与时间',
    practiceDescription: '题量更少、不限时间、适合低压练习',
    examNotes: '试航须知',
    fullDetails: '理科中文 80 题 / 90 分钟；数学 60 题 / 90 分钟',
    practiceDetails: '每科 10 题，不限时间',
    resultReview: '试航结束后查看错题与 AI 讲解',
    studyPlanAuto: 'AI 航海助手随后自动优化你的个性化航程计划',

    selectSubjects: '选择科目',
    questionProgress: '答题进度',
    remainingTime: '剩余时间',
    noTimeLimit: '不限时间',
    submitExam: '提交试航',
    examScore: '试航成绩',
    questionsAnswered: '答对',
    questionsWrong: '答错',
    easy: '易',
    medium: '中',
    difficult: '难',
    essayQuestion: '简答题',
    enterAnswer: '在此作答…',
    nextQuestion: '下一题',
    prevQuestion: '上一题',
    correctAnswer: '正确答案',
    yourAnswer: '你的答案',
    errorList: '错题列表',
    aiExplanation: 'AI 讲解',
    personalizedPlan: '航程计划（优化后）',
    todayTasks: '今日训练',
    weeklyGoals: '本周目标',
    universityMatchResult: '院校匹配结果',
    currentScore: '当前成绩',
    commonQuestions: '常见问题',
    hotQuestions: '热门问题',
    close: '关闭',
    deepAnalysis: '深度分析',
    personalAdvice: '个性化建议',
    aiTutor: 'AI 航海助手',
    practiceModeTitle: '练习试航（低压模拟）',
    fullModeTitle: '正式试航（还原考试）',
    enterOfficialTrial: '进入正式试航',
    enterObservation: '进入观星测运（能力分析）',
    failed: '还未到达港口。整理装备，修正航向，再次试航。',
  },
  scoreAnalysis: {
    title: '观星测运',
    description:
      '「观星测运」是品牌名。功能上是专业的能力分析：把成绩翻译成「当前水平 / 目标水平 / 差距」，并给出具体的下一步。',
    analyze: '分析能力现状',
    totalScore: '总分',
    percentile: '位次',
    weakPoints: '薄弱航段',
    improvement: '下一阶段学习建议',
    passing: '✓ 已在目标区间',
    belowPassing: '✗ 仍低于目标区间（≥ 60）',
    abilityTitle: '你的当前能力状态',
    abilityCurrent: '当前水平',
    abilityTarget: '目标水平',
    abilityGap: '差距',
    recommendedNext: '下一步应该做什么',
  },
  studyPlan: {
    title: '学习航程 · 航程计划',
    description:
      '根据目标考试时间、当前能力、薄弱科目、可用学习时间，为你生成每日到每周的个性化航程计划。',
    generate: '生成航程计划',
    weeklyVoyage: '本周航程',
    dayN: 'Day {{n}}',
    empty: '尚未保存航程计划。请先完成「定位」或至少完成一次「正式试航」后再生成。',
    saveCta: '保存航程计划',
    day01: '基础汉语',
    day02: '数学',
    day03: '物理',
    day04: '化学',
    day05: '英语',
    day06: '综合训练',
    day07: '试航演练',
  },
  ai: {
    panelEyebrow: 'AI MATE · 上下文',
    contextualTitleTemplate: '你正处于「{{stage}}」阶段。AI 航海助手默认理解：{{contextHint}}',
    contextModeTitle: '上下文已联动到你当前的学习航程',
    placeholder: '输入你的问题...',
    stageDiagnosis:
      '学生正在确定出发点。默认帮判断目标是否合理、国家与学制对应关系、科目组合原因说明。',
    stageKnowledgeMap:
      '学生正在航海图室。默认解释节点的前置关系并回答「我为什么要学这个」。',
    stageTraining:
      '学生正在训练场。默认分步讲解错题、推荐同类训练题，不直接给答案。',
    stageTrial:
      '学生正在试航。默认做试后复盘、时间分配建议、答题策略与心态提示；试航进行中绝不泄露答案。',
    stageObservation:
      '学生正在观星测运。默认把成绩翻译为「能力差距」并给出下一阶段的具体学习建议，而不是只报分数。',
    stageCorrection:
      '学生正在错题修正。默认对每一道错题按「概念 / 公式 / 计算 / 审题」归因并推荐对应训练题。',
    stageRoute:
      '学生正在学习航程计划。默认帮调整题量、科目顺序、保留休息日，并保证仍然在目标考试日期前完成。',
    stageHall:
      '学生正在 AI 航海助手全景大厅。默认根据最新的出发点 / 航海图 / 试航数据，主动推荐下一步行动。',
    stageDestination:
      '学生已到达院校港口。默认对比不同院校专业的录取门槛 / HSK 门槛 / 录取难度，帮助排序申请志愿。',
    openHallCta: '进入 AI 航海助手全景大厅',
  },
  correction: {
    title: '错题修正 · 5 段闭环',
    subtitle: '找错 → 原因 → 训练 → 再测 → 结果。在下一航程前把错误闭环。',
    loopTitle: '定位错误 · 归因分析 · 训练题 · 再次测试 · 闭环结果',
    empty: '暂无错题记录，继续航行。',
    step1Eyebrow: '找错',
    step1Title: '定位错题',
    step2Eyebrow: '分析',
    step2Title: '归因分析',
    step3Eyebrow: '训练',
    step3Title: '推荐训练',
    step4Eyebrow: '再测',
    step4Title: '再次测试',
    step5Eyebrow: '结果',
    step5Title: '闭环结果',
    ctaRetest: '进入练习试航（再测）',
    ctaNextRoute: '继续下一周的航程计划',
  },
  universityMatch: {
    title: '院校港口 · 目标',
    description: '基于你的真实档案、试航成绩与 HSK 水平，为你匹配目标中国院校与专业。',
    selectMajor: '目标专业',
    find: '匹配院校',
    safeSchools: '稳妥港口',
    targetSchools: '目标港口',
    reachSchools: '冲刺港口',
    scholarships: '可申请奖学金',
    probability: '录取概率',
  },
  steps: {
    diagnosis: '定位 · 出发点',
    knowledgeMap: '航海图室',
    adaptiveLearning: '演武操练 · 训练场',
    mockExam: '试航（练习 → 正式）',
    scoreAnalysis: '观星测运 · 能力分析',
    universityMatch: '院校港口 · 目标',
    aiTutor: 'AI 航海助手（全局）',
  },
};

// 马来西亚语 - Bahasa Malaysia
export const ms: Partial<Translations> = {
  nav: {
    tagline: 'Persiapan penuh laluan ASEAN ke China',
    framework: 'THU-MAIC · LangGraph',
    home: 'Biro Maritim',
    caseStudy: 'Kisah Pelajar',
    aiAssistant: 'AI Assistant',
    classroom: 'Kelas Nanyang',
    prepCenter: 'Pusat Persiapan',
    collapse: 'Gulung',
    expand: 'Buka',

  },
  hero: {
    badge: 'Sistem Persediaan CSCA',
    title: 'Pembantu Persediaan CSCA untuk Pelajar ASEAN',
    description: 'Persediaan peperiksaan CSCA sehenti untuk pelajar ASEAN. Laluan pembelajaran peribadi dipacu AI untuk membantu anda berjaya dalam ujian masuk universiti China.',
    cta: '扬帆起航',
  },
  flow: {
    title: 'Perjalanan Pembelajaran',
    progress: 'Kemajuan',
    step1Title: '探航风向标',
    step1Desc: 'Nilai tahap pengetahuan semasa, sesuaikan laluan belajar',
    step2Title: '航海图室',
    step2Desc: 'Visualisasi struktur pengetahuan, cari titik lemah',
    step3Title: '演武操练',
    step3Desc: 'Latihan peribadi mensasarkan titik lemah',
    step4Title: '试航演练',
    step4Desc: 'Simulasi penuh persekitaran peperiksaan CSCA',
    step5Title: '观星测运',
    step5Desc: 'Analisis kesilapan terperinci dan rancangan penambahbaikan',
    step6Title: '日程司',
    step6Desc: 'Pelan pembelajaran sistematik, jejak kemajuan',
    errorReview: 'Semak Semula Ralat',
    studyPlan: '日程司',
    restart: 'Mulakan Semula',
    daysUnit: 'hari',
    aseanCountries: 'Negara ASEAN',
    candidateInfo: 'Maklumat Calon',
    examNotes: 'Nota Peperiksaan',
    languageHint: 'Bercakap Bahasa Cina? Tukar ke 简体中文 di sudut kanan atas.',
  },
  features: {
    multiAgentTitle: 'Tutor AI Multi-Agen',
    multiAgentDesc: '8 pakar AI sedia membantu 24/7',
    classroomTitle: '讲学堂',
    classroomDesc: 'Kursus tersuai berdasarkan hasil diagnostik anda',
  },
  sandbox: {
    title: 'Peta Laluan Laut Selatan',
    subtitle: 'Buka kabus, layar pulau demi pulau',
    progress: '{n} laluan dipetakan',
    explored: 'Dipetakan',
    current: 'Angin baik di sini',
    unexplored: 'Kabus belum hilang',
    enter: 'Masuki',
  },
  classroomSection: {
    title: '讲学堂生成',
    description: 'AI akan menyesuaikan kandungan kursus berdasarkan diagnosis dan keperluan pembelajaran anda, termasuk slaid, kuiz, simulasi interaktif, dan aktiviti projek.',
    hint: 'Ctrl + Enter untuk menjana',
    generate: 'Generate Classroom',
    generateFromErrors: '📚 Jana daripada Ralat',
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
  },
  common: {
    welcome: 'Welcome aboard. Which part of the voyage do you want to begin with today?',
    next: '进',
    back: '返航',
    complete: 'Selesai',
    loading: 'AI Mate is preparing…',
    generating: '先生正在挥毫',
    error: '信鸽迷途，请再传一次',
    success: '呈报已准，归档在案',
    returnBanner: "Your learning voyage has been idle for a few days. Would you like to continue?",
    lang: {
      zh: "简体中文",
      en: "English",
      th: "ภาษาไทย",
      vi: "Tiếng Việt",
      id: "Bahasa Indonesia",
      ms: "Bahasa Malaysia",
      tl: "Filipino",
      my: "မြန်မာဘာသာ",
      km: "ភាសាខ្មែរ",
      lo: "ພາສາລາວ"
    }
  },
  chat: {
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
    quickDiagnose: 'Start Survey',
    quickClassroom: 'Prepare Classroom',
    quickProgress: 'Open Voyage Log',
    quickTutor: 'Ask AI Mate',
    quickMockExam: 'Start Trial Voyage',
    send: 'Send',
    quickFlags: 'Quick actions',
    voice: 'Voice input',
    roster: 'AI Crew',
    rollUp: 'Close panel',
  },
  diagnosis: {
    title: '探航风向标',
    description: 'Beritahu kami tentang pelan pengajian anda dan kami akan mengesyorkan subjek peperiksaan CSCA',
    targetMajor: 'Jurusan Sasaran *',
    nationality: 'Kewarganegaraan *',
    highSchoolSystem: 'Sistem Sekolah Menengah',
    hskLevel: 'Tahap HSK',
    start: 'Mulakan Diagnosis',
    resultTitle: 'Diagnosis Selesai!',
    requiredSubjects: 'Subjek Wajib',
    recommendedSubjects: 'Subjek Disyorkan',
    estimatedDays: 'Masa Persiapan Disyorkan',
  },
  knowledgeMap: {
    title: '航海图室',
    description: 'Kenal pasti kekuatan dan kelemahan pengetahuan anda',
    selectSubject: 'Pilih Subjek',
    generate: 'Jana Peta Pengetahuan',
    weak: 'Lemah',
    needsReview: 'Perlu Semak',
    mastered: 'Mahir',
  },
  adaptiveLearning: {
    title: '演武操练',
    description: 'Latihan soalan yang disesuaikan dengan kelemahan anda',
    generate: 'Jana Latihan',
    question: 'Soalan',
    options: 'Pilihan',
    answer: 'Jawapan',
    explanation: 'Penjelasan',
    submit: 'Hantar Jawapan',
    next: 'Soalan Seterusnya',
  },
  mockExam: {
    title: 'Peperiksaan Tiruan',
    description: 'Selesaikan peperiksaan tiruan gaya CSCA untuk menilai kesediaan anda',
    start: 'Mulakan Peperiksaan',
    time: 'Masa',
    answered: 'Telah dijawab',
    correct: 'Betul',
    submit: 'Hantar Peperiksaan',
    completed: 'Peperiksaan Selesai!',
    examMode: 'Mod Peperiksaan',
    fullMode: 'Mod Penuh',
    practiceMode: 'Mod Latihan',
    fullDescription: 'Bilangan soalan dan masa yang sama dengan peperiksaan rasmi',
    practiceDescription: 'Sedikit soalan, sesuai untuk latihan pantas',
    examNotes: 'Nota Peperiksaan',
    fullDetails: 'Bahasa Cina Sains: 80 soalan/90 minit, Matematik: 60 soalan/90 minit',
    practiceDetails: '10 soalan setiap subjek, tiada had masa',
    resultReview: 'Lihat jawapan salah dan penjelasan AI selepas peperiksaan',
    studyPlanAuto: 'Sistem akan menjana pelan pembelajaran peribadi secara automatik',

    selectSubjects: 'Select Subjects',
    questionProgress: 'Progress',
    remainingTime: 'Remaining Time',
    noTimeLimit: 'No Time Limit',
    submitExam: 'Submit Exam',
    examScore: 'Exam Score',
    questionsAnswered: 'Correct',
    questionsWrong: 'Wrong',
    easy: 'Easy',
    medium: 'Medium',
    difficult: 'Hard',
    essayQuestion: 'Essay Question',
    enterAnswer: 'Enter your answer',
    nextQuestion: 'Next',
    prevQuestion: 'Previous',
    correctAnswer: 'Correct Answer',
    yourAnswer: 'Your Answer',
    errorList: 'Error List',
    aiExplanation: 'AI Explanation',
    personalizedPlan: 'Personalized Plan',
    todayTasks: "Today's Tasks",
    weeklyGoals: 'Weekly Goals',
    universityMatchResult: 'University Match Result',
    currentScore: 'Current Score',
    commonQuestions: 'Common Questions',
    hotQuestions: 'Popular Questions',
    close: 'Close',
    deepAnalysis: 'Deep Analysis',
    personalAdvice: 'Personalized Advice',
    aiTutor: 'AI Tutor',
  },
  scoreAnalysis: {
    title: '观星测运',
    description: 'Dapatkan analisis terperinci prestasi dan cadangan penambahbaikan',
    analyze: 'Analisis Skor',
    totalScore: 'Jumlah Skor',
    percentile: 'Percentil Peringkat',
    weakPoints: 'Titik Lemah',
    improvement: 'Pelan Penambahbaikan',
    passing: '✓ Lulus',
    belowPassing: '✗ Dibawah paras (60)',
  },
  universityMatch: {
    title: 'Padanan Universiti',
    description: 'Cari universiti China ideal berdasarkan profil anda',
    selectMajor: 'Jurusan Sasaran',
    find: 'Cari Universiti',
    safeSchools: 'Universiti Selamat',
    targetSchools: 'Universiti Sasaran',
    reachSchools: 'Universiti Cabaran',
    scholarships: 'Biasiswa Tersedia',
    probability: 'Kebarangkalian',
  },
  steps: {
    diagnosis: '探航风向标',
    knowledgeMap: '航海图室',
    adaptiveLearning: '演武操练',
    mockExam: '试航演练',
    scoreAnalysis: '观星测运',
    universityMatch: 'Padanan',
    aiTutor: 'AI Mate (Global)',
  },
};

// 菲律宾语 - Filipino
export const tl: Partial<Translations> = {
  nav: {
    tagline: 'Kumpletong Landas ng Pag-aaral para sa ASEAN',
    framework: 'THU-MAIC · LangGraph',
    home: 'Bureau of Maritime Affairs',
    caseStudy: 'Mga Kwento ng Mag-aaral',
    aiAssistant: 'AI Assistant',
    classroom: 'Silid-aralan Nanyang',
    prepCenter: 'Sentro ng Paghahanda',
    collapse: 'Igulong',
    expand: 'Buksan',

  },
  hero: {
    badge: 'Sistema ng Paghahanda sa CSCA',
    title: 'Katulong sa Paghahanda ng CSCA para sa mga Mag-aaral ng ASEAN',
    description: 'Isang-hintuang paghahanda sa pagsusulit CSCA para sa mga mag-aaral ng ASEAN. Pinapatnubayang AI na personalized learning path upang magtagumpay sa pagsusulit para sa unibersidad sa Tsina.',
    cta: '扬帆起航',
  },
  flow: {
    title: 'Paglalakbay sa Pag-aaral',
    progress: 'Pag-unlad',
    step1Title: '探航风向标',
    step1Desc: 'Tayahin ang kasalukuyang antas ng kaalaman, i-customize ang learning path',
    step2Title: '航海图室',
    step2Desc: 'I-visualize ang istruktura ng kaalaman, hanapin ang mahihinang bahagi',
    step3Title: '演武操练',
    step3Desc: 'Mga personalized na ehersisyo na naka-target sa mahihinang bahagi',
    step4Title: '试航演练',
    step4Desc: 'Buong simulation ng kapaligiran ng CSCA exam',
    step5Title: '观星测运',
    step5Desc: 'Detalyadong error analysis at improvement plan',
    step6Title: '日程司',
    step6Desc: 'Sistemikong study plan na may progress tracking',
    errorReview: 'Balikang muli ang Error',
    studyPlan: '日程司',
    restart: 'Magsimula Muli',
    daysUnit: 'araw',
    aseanCountries: 'Bansang ASEAN',
    candidateInfo: 'Iyong Profile',
    examNotes: 'Mga Gabay sa Pagsusulit',
    languageHint: 'Marunong ng Chinese? Lumipat sa 简体中文 sa kanang itaas.',
  },
  features: {
    multiAgentTitle: 'Multi-Agent na Pagtuturo',
    multiAgentDesc: '8 AI expert na handang tumulong 24/7',
    classroomTitle: '讲学堂',
    classroomDesc: 'Mga kursong naka-customize batay sa iyong diagnosis',
  },
  sandbox: {
    title: 'Mapa ng Timog Dagat',
    subtitle: 'Buksan ang hamog, maglayag sa bawat isla',
    progress: '{n} ruta ang naitala',
    explored: 'Naitala',
    current: 'Maaliwalas ang hangin dito',
    unexplored: 'Hindi pa humuhupa ang hamog',
    enter: 'Pumasok',
  },
  classroomSection: {
    title: '讲学堂生成',
    description: 'Ia-customize ng AI ang nilalaman ng kurso batay sa iyong diagnosis at pangangailangan, kabilang ang mga slide, pagsusulit, simulation, at mga aktibidad ng proyekto.',
    hint: 'Ctrl + Enter upang makabuo',
    generate: 'Generate Classroom',
    generateFromErrors: '📚 Mula sa Error',
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
  },
  common: {
    welcome: 'Welcome aboard. Which part of the voyage do you want to begin with today?',
    next: '进',
    back: '返航',
    complete: 'Kumpleto',
    loading: 'AI Mate is preparing…',
    generating: '先生正在挥毫',
    error: '信鸽迷途，请再传一次',
    success: '呈报已准，归档在案',
    returnBanner: "Your learning voyage has been idle for a few days. Would you like to continue?",
    lang: {
      zh: "简体中文",
      en: "English",
      th: "ภาษาไทย",
      vi: "Tiếng Việt",
      id: "Bahasa Indonesia",
      ms: "Bahasa Malaysia",
      tl: "Filipino",
      my: "မြန်မာဘာသာ",
      km: "ភាសាខ្មែរ",
      lo: "ພາສາລາວ"
    }
  },
  chat: {
    placeholder: 'Ask AI Mate to prepare a classroom module…',
    placeholderFocus: 'Describe the stage or topic you want AI Mate to customize for you.',
    quickDiagnose: 'Start Survey',
    quickClassroom: 'Prepare Classroom',
    quickProgress: 'Open Voyage Log',
    quickTutor: 'Ask AI Mate',
    quickMockExam: 'Start Trial Voyage',
    send: 'Send',
    quickFlags: 'Quick actions',
    voice: 'Voice input',
    roster: 'AI Crew',
    rollUp: 'Close panel',
  },
  diagnosis: {
    title: '探航风向标',
    description: 'Sabihin sa amin ang tungkol sa iyong plano sa pag-aaral at irerekomenda namin ang mga paksa para sa CSCA exam',
    targetMajor: 'Target Major *',
    nationality: 'Nasyonalidad *',
    highSchoolSystem: 'Sistema ng Mataas na Paaralan',
    hskLevel: 'Antas ng HSK',
    start: 'Simulan ang Diagnosis',
    resultTitle: 'Diagnosis Kumpleto!',
    requiredSubjects: 'Mga Kinakailangang Paksa',
    recommendedSubjects: 'Mga Inirekumendang Paksa',
    estimatedDays: 'Inirerekomendang Oras ng Paghahanda',
  },
  knowledgeMap: {
    title: '航海图室',
    description: 'Tukuyin ang iyong lakas at kahinaan sa kaalaman',
    selectSubject: 'Pumili ng Paksa',
    generate: 'Bumuo ng Mapa ng Kaalaman',
    weak: 'Mahina',
    needsReview: 'Kailangan ng Pagsusuri',
    mastered: 'Sanay',
  },
  adaptiveLearning: {
    title: '演武操练',
    description: 'Mga pagsasanay na iniangkop sa iyong mga kahinaan',
    generate: 'Bumuo ng Pagsasanay',
    question: 'Tanong',
    options: 'Mga Opsyon',
    answer: 'Sagot',
    explanation: 'Paliwanag',
    submit: 'Ipasok ang Sagot',
    next: 'Susunod na Tanong',
  },
  mockExam: {
    title: 'Mock Exam',
    description: 'Kumpletuhin ang isang buong CSCA-style mock exam upang masuri ang iyong kahandaan',
    start: 'Simulan ang Exam',
    time: 'Oras',
    answered: 'Sinagot',
    correct: 'Tama',
    submit: 'Ipasok ang Exam',
    completed: 'Exam Kumpleto!',
    examMode: 'Mode ng Exam',
    fullMode: 'Full Mode',
    practiceMode: 'Practice Mode',
    fullDescription: 'Kaparehong bilang ng mga tanong at oras tulad ng opisyal na exam',
    practiceDescription: 'Kaunting tanong, angkop para sa mabilis na pagsasanay',
    examNotes: 'Mga Tala sa Exam',
    fullDetails: 'Science Chinese: 80 tanong/90 minuto, Math: 60 tanong/90 minuto',
    practiceDetails: '10 tanong bawat subject, walang limitasyon sa oras',
    resultReview: 'Tingnan ang mga maling sagot at AI explanations pagkatapos ng exam',
    studyPlanAuto: 'Awtomatikong gagawin ng system ang personalized study plan',

    selectSubjects: 'Select Subjects',
    questionProgress: 'Progress',
    remainingTime: 'Remaining Time',
    noTimeLimit: 'No Time Limit',
    submitExam: 'Submit Exam',
    examScore: 'Exam Score',
    questionsAnswered: 'Correct',
    questionsWrong: 'Wrong',
    easy: 'Easy',
    medium: 'Medium',
    difficult: 'Hard',
    essayQuestion: 'Essay Question',
    enterAnswer: 'Enter your answer',
    nextQuestion: 'Next',
    prevQuestion: 'Previous',
    correctAnswer: 'Correct Answer',
    yourAnswer: 'Your Answer',
    errorList: 'Error List',
    aiExplanation: 'AI Explanation',
    personalizedPlan: 'Personalized Plan',
    todayTasks: "Today's Tasks",
    weeklyGoals: 'Weekly Goals',
    universityMatchResult: 'University Match Result',
    currentScore: 'Current Score',
    commonQuestions: 'Common Questions',
    hotQuestions: 'Popular Questions',
    close: 'Close',
    deepAnalysis: 'Deep Analysis',
    personalAdvice: 'Personalized Advice',
    aiTutor: 'AI Tutor',
  },
  scoreAnalysis: {
    title: '观星测运',
    description: 'Makakuha ng detalyadong pagsusuri ng iyong pagganap at mga mungkahi sa pagpapabuti',
    analyze: 'Suriin ang Marka',
    totalScore: 'Kabuuan ng Marka',
    percentile: 'Ranking Percentile',
    weakPoints: 'Mahinang Puntos',
    improvement: 'Plano sa Pagpapabuti',
    passing: '✓ Nakapasa',
    belowPassing: '✗ Mababa sa passing (60)',
  },
  universityMatch: {
    title: 'Pagtutugma ng Unibersidad',
    description: 'Hanapin ang iyong perpektong unibersidad sa Tsina batay sa iyong profile',
    selectMajor: 'Target Major',
    find: 'Hanapin ang Mga Unibersidad',
    safeSchools: 'Mga ligtas na Paaralan',
    targetSchools: 'Mga Layunin na Paaralan',
    reachSchools: 'Mga Hamon na Paaralan',
    scholarships: 'Magagamit na Scholarship',
    probability: 'Probability',
  },
  steps: {
    diagnosis: '探航风向标',
    knowledgeMap: '航海图室',
    adaptiveLearning: '演武操练',
    mockExam: '试航演练',
    scoreAnalysis: '观星测运',
    universityMatch: 'Pag-tutugma',
    aiTutor: 'AI Mate (Global)',
  },
};

/* ============================================================
   批次 18：东盟十国语言扩展（缅文/高棉文/老挝文）
   deepMerge(en, localeData) 自动继承英文缺失字段
   ============================================================ */
export const my: Partial<Translations> = {
  brand: {
    name: 'နန်ယန် အကယ်ဒမီ',
    slogan: 'ASEAN ကျောင်းသားများအတွက် တရုတ်နိုင်ငံ ပညာသင် ပြည့်စုံသော စာမေးပွဲ ပြင်ဆင်ရေး ပလက်ဖောင်း',
  },
  nav: {
    home: 'ပင်လယ်ရေး ဦးစီးဌာန',
    caseStudy: 'အောင်မြင်မှု ဇာတ်ကြောင်းများ',
    aiAssistant: 'ဆွေးနွေးတိုင်ပင်ခန်းမ',
    prepCenter: 'စာမေးပွဲ ပြင်ဆင်ရေး စင်တာ',
    collapse: 'လိပ်စာတုံး ခေါက်သိမ်းရန်',
    expand: 'လိပ်စာတုံး ဖြန့်ထုတ်ရန်',
  },
  hero: {
    badge: 'CSCA စာမေးပွဲ ပြင်ဆင်ရေး စနစ်',
    title: 'ASEAN ကျောင်းသားများအတွက် CSCA စာမေးပွဲ ပြင်ဆင်ရေး လက်ထောက်',
    description: 'ASEAN နိုင်ငံဆယ်နိုင်ငံကျောင်းသားများအတွက် တစ်နေရာတည်းတွင် CSCA စာမေးပွဲ ပြင်ဆင်ရေး ခရီးစဉ် စီစဉ်ခြင်း',
    cta: 'ခရီးစဉ် စတင်ရန်',
  },
  sandbox: {
    title: 'နန်ယန် ရေကြောင်း သဲပြင်ပုံစံ',
    subtitle: 'မှတ်တမ်းအတိုင် ရွက်လွှတ်၊ ပုံတူအတိုင် ရှာဖွေ',
    progress: 'ရေကြောင်း {{n}} ခု မှတ်တမ်းတင်ထားသည်',
  },
  common: {
    welcome: 'တပ်မှူးကြီး၊ မင်္ဂလာပါ။ ကျွန်ုပ်မှာ ဇင်ဟီ ဖြစ်ပါသည်။ ယနေ့ လေပန်းကောင်းသည်၊ ဆိပ်ကမ်းမှမှ ထွက်ခွာမည်နည်း။',
    loading: 'ဇင်ဟီ ပြင်ဆင်နေသည်…',
    error: 'ပို့ဆောင်ရန် မအောင်မြင်၊ ပြန်လည်ကြိုးစားပါ',
    success: 'တင်ပြခြင်း အောင်မြင်ပါသည်',
    returnBanner: "Your learning voyage has been idle for a few days. Would you like to continue?",
    lang: {
      zh: "简体中文",
      en: "English",
      th: "ภาษาไทย",
      vi: "Tiếng Việt",
      id: "Bahasa Indonesia",
      ms: "Bahasa Malaysia",
      tl: "Filipino",
      my: "မြန်မာဘာသာ",
      km: "ភាសាខ្មែរ",
      lo: "ພາສາລາວ"
    }
  },
  diagnosis: {
    title: 'ရေကြောင်း စစ်ဆေးရေး ရုံး',
    start: 'စစ်ဆေးမှု စတင်ရန်',
  },
  knowledgeMap: {
    title: 'ရေကြောင်းပုံ မှတ်တမ်းခန်း',
  },
  adaptiveLearning: {
    title: 'လက်တွေ့သင်တန်းခန်းမ',
  },
};

export const km: Partial<Translations> = {
  brand: {
    name: 'សាលានានយ៉ាង',
    slogan: 'វេទិកាត្រៀមប្រឡងពេញដំណើរសម្រាប់និស្សិតអាស៊ានមកសិក្សានៅប្រទេសចិន',
  },
  nav: {
    home: 'មជ្ឈមណ្ឌលនាវាចរណ៍',
    caseStudy: 'រឿងជោគជ័យ',
    aiAssistant: 'សាលាប្រឹក្សា',
    prepCenter: 'មជ្ឈមណ្ឌលត្រៀមប្រឡង',
    collapse: 'បត់ក្បួន',
    expand: 'បើកក្បួន',
  },
  hero: {
    badge: 'ប្រព័ន្ធត្រៀមប្រឡង CSCA',
    title: 'ជំនួយការត្រៀមប្រឡង CSCA សម្រាប់និស្សិតអាស៊ាន',
    description: 'សម្រាប់និស្សិតប្រទេសអាស៊ានទាំង១០ ផែនការផ្លូវត្រៀមប្រឡង CSCA ក្នុងទីតែមួយ',
    cta: 'ចាប់ផ្តើមដំណើរ',
  },
  sandbox: {
    title: 'តុខ្សាច់ផ្លូវនាវានានយ៉ាង',
    subtitle: 'ចេញដំណើរតាមឯកសារ ស្វែងរកតាមផែនទី',
    progress: 'បានរក្សាទុកផ្លូវនាវា {{n}} ក្បួន',
  },
  common: {
    welcome: 'សួស្តីឧត្តមនាវាទុក ខ្ញុំឈ្មោះចេងហូ។ ថ្ងៃនេះខ្យល់ល្អ តើត្រៀមចេញពីកំពង់ផែណា?',
    loading: 'ចេងហូកំពុងរៀបចំ…',
    error: 'ការផ្ញើបរាជ័យ សូមព្យាយាមម្តងទៀត',
    success: 'បានដាក់ស្នើដោយជោគជ័យ',
    returnBanner: "Your learning voyage has been idle for a few days. Would you like to continue?",
    lang: {
      zh: "简体中文",
      en: "English",
      th: "ภาษาไทย",
      vi: "Tiếng Việt",
      id: "Bahasa Indonesia",
      ms: "Bahasa Malaysia",
      tl: "Filipino",
      my: "မြန်မာဘာသာ",
      km: "ភាសាខ្មែរ",
      lo: "ພາສາລາວ"
    }
  },
  diagnosis: {
    title: 'ផ្នែកស្ទង់ផ្លូវទឹក',
    start: 'ចាប់ផ្តើមស្ទង់',
  },
  knowledgeMap: {
    title: 'បន្ទប់ឯកសារផែនទីសមុទ្រ',
  },
  adaptiveLearning: {
    title: 'សាលាបណ្តុះបណ្តាល',
  },
};

export const lo: Partial<Translations> = {
  brand: {
    name: 'ວິທະຍາໄລນານຢາງ',
    slogan: 'ແພລດຟອມກະກຽມສອບເສັງ CSCA ສຳລັບນັກສຶກສາອາຊຽນທີ່ມາຮຽນຢູ່ຈີນ',
  },
  nav: {
    home: 'ກົມການທາງທະເລ',
    caseStudy: 'ເລື່ອງຂຶ້ນຝັ່ງ',
    aiAssistant: 'ຫ້ອງປຶກສາຫາລື',
    prepCenter: 'ສູນກະກຽມສອບເສັງ',
    collapse: 'ມ້ວນແຜນທີ່',
    expand: 'ຄາຍແຜນທີ່',
  },
  hero: {
    badge: 'ລະບົບກະກຽມສອບເສັງ CSCA',
    title: 'ຜູ້ຊ່ວຍກະກຽມສອບເສັງ CSCA ສຳລັບນັກສຶກສາອາຊຽນ',
    description: 'ສຳລັບນັກສຶກສາຈາກ 10 ປະເທດອາຊຽນ, ວາງແຜນເສັນທາງກະກຽມສອບເສັງ CSCA ໃນບ່ອນດຽວ',
    cta: 'ອອກເຮືອ',
  },
  sandbox: {
    title: 'ແບບຈຳລອງເສັນທາງນານຢາງ',
    subtitle: 'ອອກເຮືອຕາມບັນທຶກ, ຄົ້ນຫາຕາມແຜນທີ່',
    progress: 'ໄດ້ເກັບບັນທຶກເສັນທາງ {{n}} ເສັນ',
  },
  common: {
    welcome: 'ທ່ານນາຍພົນເຮືອສະບາຍດີ, ຂ້ອຍແມ່ນເຈິ້ນເຮີ. ມື້ນີ້ລົມປະຈຳທິດດີ, ກະກຽມຈະອອກເຮືອຈາກທ່າໃດ?',
    loading: 'ເຈິ້ນເຮີກຳລັງກະກຽມ…',
    error: 'ສົ່ງບໍ່ສຳເລັດ, ກະລຸນາລອງໃໝ່',
    success: 'ສົ່ງສຳເລັດແລ້ວ',
    returnBanner: "Your learning voyage has been idle for a few days. Would you like to continue?",
    lang: {
      zh: "简体中文",
      en: "English",
      th: "ภาษาไทย",
      vi: "Tiếng Việt",
      id: "Bahasa Indonesia",
      ms: "Bahasa Malaysia",
      tl: "Filipino",
      my: "မြန်မာဘာသာ",
      km: "ភាសាខ្មែរ",
      lo: "ພາສາລາວ"
    }
  },
  diagnosis: {
    title: 'ກົມສຳຫຼວດເສັນທາງ',
    start: 'ເລີ່ມສຳຫຼວດ',
  },
  knowledgeMap: {
    title: 'ຫ້ອງເກັບບັນທຶກແຜນທີ່ທະເລ',
  },
  adaptiveLearning: {
    title: 'ຫ້ອງຝຶກຫັດ',
  },
};

export const ja: Partial<Translations> = {
  brand: { name: '南洋学院', slogan: 'ASEAN学生向けCSCA対策プラットフォーム' },
  nav: {
    tagline: 'CSCA学習航海',
    home: '航海概要',
    caseStudy: '学生ストーリー',
    aiAssistant: 'AIメイトホール',
    classroom: '南洋教室',
    prepCenter: '学習航海',
    collapse: '折りたたむ',
    expand: '展開する',
    learningVoyage: '学習航海',
  },
  hero: {
    badge: 'CSCA航海',
    title: 'CSCA学習航海',
    description: '方向設定から、海図の把握、そしてCSCA合格まで。',
    cta: '航海を始める',
    secondaryCta: '航海図を見る',
  },
  common: {
    welcome: 'おかえりなさい',
    next: '次へ',
    back: '戻る',
    complete: '完了',
    loading: '読み込み中...',
    generating: '生成中...',
    error: 'エラー',
    success: '成功',
  },
  diagnosis: {
    title: '出発点診断',
    description: '国籍・HSK・専攻・学制を確認し、目標を設定します',
    targetMajor: '目標専攻',
    nationality: '国籍',
    highSchoolSystem: '高校教育システム',
    hskLevel: 'HSKレベル',
    start: '診断を開始',
  },
  knowledgeMap: {
    title: '航海図',
    description: '知識マップ：学習すべき・学習中・習得済み',
    selectSubject: '科目を選択',
    generate: '生成',
    weak: '弱点',
    needsReview: '要復習',
    mastered: '習得済み',
  },
  adaptiveLearning: {
    title: '訓練場',
    description: '目標駆動の毎日の練習と即時フィードバック',
    question: '問題',
    options: '選択肢',
    answer: '回答',
    explanation: '解説',
    submit: '提出',
    next: '次へ',
    correctFeedback: '正解です',
    wrongFeedback: '不正解です',
  },
  mockExam: {
    title: '模擬試験',
    description: '本番と同じ形式の模擬試験',
    start: '開始',
    submit: '提出',
    completed: '完了',
    selectSubjects: '科目を選択',
    correct: '正解',
    examScore: '試験スコア',
  },
  scoreAnalysis: {
    title: '成績分析',
    description: 'パフォーマンス分析と改善計画',
    totalScore: '合計スコア',
    weakPoints: '弱点',
    improvement: '改善計画',
  },
  steps: {
    diagnosis: '診断',
    knowledgeMap: '航海図',
    adaptiveLearning: '適応学習',
    mockExam: '模擬試験',
    scoreAnalysis: '成績分析',
    universityMatch: '大学マッチング',
    aiTutor: 'AIチューター',
  },
  flow: {
    title: '学習航海',
    progress: '進捗',
    errorReview: '訂正ルート',
    studyPlan: '航海計画',
    continueVoyage: '航海を続ける',
    languageHint: '日本語ですか？右上で言語を切り替えられます。',
  },
  dashboard: {
    title: '学習ダッシュボード',
    subtitle: 'あなたの個別学習航海',
    welcome: 'おかえりなさい',
    resumeWhere: '続きから',
    startVoyage: '航海を始める',
    statsProgress: '航海進捗',
    statsErrors: '要復習のエラー',
    statsAccuracy: '最近の正答率',
    statsDaysActive: '活動日数',
    todayTasks: '今日のタスク',
    weakPoints: '弱点',
    recentActivity: '最近の活動',
    nextMilestone: '次のマイルストーン',
    empty: '航海を始めましょう — まず診断から',
    ctaDiagnosis: '診断を開始',
    ctaPractice: '練習',
    ctaWrongAnswer: 'エラーを見直す',
    ctaExam: '模擬試験',
  },
  wrongAnswerCenter: {
    title: '誤答センター',
    subtitle: '間違いを確認して訂正する',
    empty: 'エラーはまだありません — まず模擬試験を受けてください',
    filterAll: 'すべて',
    filterSubject: '科目',
    filterDifficulty: '難易度',
    retryAll: 'すべて再試行',
    retryOne: '再試行',
    hintKnowledgePoint: '知識ポイント',
    hintRetry: '同じ知識ポイントの問題を再挑戦',
    statsTotalErrors: '合計エラー数',
    statsBySubject: '科目別',
    statsResolved: '解決済み',
    unresolvedOnly: '未解決のみ',
  },
  onboarding: {
    title: 'CSCAへようこそ',
    welcome: '学習航海を個別化するために、あなたについて教えてください',
    step1Country: 'あなたの国',
    step2Hsk: 'HSKレベル',
    step3Major: '目標専攻',
    step4Education: '教育システム',
    start: '学習を開始',
    skipToVoyage: 'スキップ — 自由に探索',
    englishFirstHint: '学習コンテンツはすべて英語です。CSCA試験はバイリンガル（中国語/英語）です。',
  },
  aiMateFallback: {
    title: 'AIメイトはフォールバックモードです',
    body: 'AIサービスは一時的に利用できません。以下の回答は一般的なものです。個別回答は後ほど再試行してください。',
    retry: '再試行',
    contextUnavailable: '学習データがまだありません — 練習や試験を完了すると、個別ガイダンスが得られます。',
  },
};

export const fr: Partial<Translations> = {
  brand: { name: 'Académie Nanyang', slogan: 'Plateforme de préparation CSCA pour les étudiants de l\'ASEAN' },
  nav: {
    tagline: 'Voyage d\'apprentissage CSCA',
    home: 'Aperçu du voyage',
    caseStudy: 'Témoignages d\'étudiants',
    aiAssistant: 'Hall du compagnon IA',
    classroom: 'Salle de classe Nanyang',
    prepCenter: 'Voyage d\'apprentissage',
    collapse: 'Réduire',
    expand: 'Développer',
    learningVoyage: 'Voyage d\'apprentissage',
  },
  hero: {
    badge: 'VOTRE VOYAGE CSCA',
    title: 'Votre voyage d\'apprentissage CSCA',
    description: 'De la définition du cap à la maîtrise de la carte jusqu\'à la réussite du CSCA.',
    cta: 'Commencer mon voyage',
    secondaryCta: 'Voir la carte du voyage',
  },
  common: {
    welcome: 'Bon retour',
    next: 'Suivant',
    back: 'Retour',
    complete: 'Terminé',
    loading: 'Chargement...',
    generating: 'Génération...',
    error: 'Erreur',
    success: 'Succès',
  },
  diagnosis: {
    title: 'Diagnostic de départ',
    description: 'Confirmez votre nationalité, HSK, spécialité et système éducatif',
    targetMajor: 'Spécialité cible',
    nationality: 'Nationalité',
    highSchoolSystem: 'Système éducatif',
    hskLevel: 'Niveau HSK',
    start: 'Commencer le diagnostic',
  },
  knowledgeMap: {
    title: 'Carte du voyage',
    description: 'Carte des connaissances : à apprendre / en cours / maîtrisées',
    selectSubject: 'Choisir une matière',
    generate: 'Générer',
    weak: 'Lacunes',
    needsReview: 'À réviser',
    mastered: 'Maîtrisé',
  },
  adaptiveLearning: {
    title: 'Terrain d\'entraînement',
    description: 'Exercices quotidiens avec feedback instantané',
    question: 'Question',
    options: 'Options',
    answer: 'Réponse',
    explanation: 'Explication',
    submit: 'Soumettre',
    next: 'Suivant',
    correctFeedback: 'Correct !',
    wrongFeedback: 'Incorrect.',
  },
  mockExam: {
    title: 'Examen blanc',
    description: 'Examen blanc simulant les conditions réelles',
    start: 'Commencer',
    submit: 'Soumettre',
    completed: 'Terminé',
    selectSubjects: 'Choisir les matières',
    correct: 'Correct',
    examScore: 'Score d\'examen',
  },
  scoreAnalysis: {
    title: 'Analyse des résultats',
    description: 'Analyse de performance et plan d\'amélioration',
    totalScore: 'Score total',
    weakPoints: 'Points faibles',
    improvement: 'Plan d\'amélioration',
  },
  steps: {
    diagnosis: 'Diagnostic',
    knowledgeMap: 'Carte des connaissances',
    adaptiveLearning: 'Apprentissage adaptatif',
    mockExam: 'Examen blanc',
    scoreAnalysis: 'Analyse des scores',
    universityMatch: 'Orientation universitaire',
    aiTutor: 'Tuteur IA',
  },
  flow: {
    title: 'Voyage d\'apprentissage',
    progress: 'Progression',
    errorReview: 'Parcours de correction',
    studyPlan: 'Plan de voyage',
    continueVoyage: 'Continuer le voyage',
    languageHint: 'Vous parlez français ? Changez de langue en haut à droite.',
  },
  dashboard: {
    title: 'Tableau de bord d\'apprentissage',
    subtitle: 'Votre voyage d\'apprentissage personnalisé',
    welcome: 'Bon retour',
    resumeWhere: 'Reprendre à',
    startVoyage: 'Commencer votre voyage',
    statsProgress: 'Progression du voyage',
    statsErrors: 'Erreurs à réviser',
    statsAccuracy: 'Précision récente',
    statsDaysActive: 'Jours actifs',
    todayTasks: 'Tâches du jour',
    weakPoints: 'Points faibles',
    recentActivity: 'Activité récente',
    nextMilestone: 'Prochain jalon',
    empty: 'Commencez votre voyage — démarrez par un diagnostic',
    ctaDiagnosis: 'Démarrer le diagnostic',
    ctaPractice: 'Pratiquer',
    ctaWrongAnswer: 'Réviser les erreurs',
    ctaExam: 'Examen blanc',
  },
  wrongAnswerCenter: {
    title: 'Centre des erreurs',
    subtitle: 'Révisez et corrigez vos erreurs',
    empty: 'Aucune erreur pour l\'instant — terminez d\'abord un examen blanc',
    filterAll: 'Toutes',
    filterSubject: 'Matière',
    filterDifficulty: 'Difficulté',
    retryAll: 'Tout réessayer',
    retryOne: 'Réessayer',
    hintKnowledgePoint: 'Point de connaissance',
    hintRetry: 'Réessayer des questions similaires',
    statsTotalErrors: 'Erreurs totales',
    statsBySubject: 'Par matière',
    statsResolved: 'Résolues',
    unresolvedOnly: 'Non résolues seulement',
  },
  onboarding: {
    title: 'Bienvenue au CSCA',
    welcome: 'Parlez-nous de vous pour personnaliser votre voyage d\'apprentissage',
    step1Country: 'Votre pays',
    step2Hsk: 'Niveau HSK',
    step3Major: 'Spécialité cible',
    step4Education: 'Système éducatif',
    start: 'Commencer l\'apprentissage',
    skipToVoyage: 'Passer — Explorer librement',
    englishFirstHint: 'Tout le contenu d\'apprentissage est en anglais. L\'examen CSCA est bilingue (chinois/anglais).',
  },
  aiMateFallback: {
    title: 'Le compagnon IA est en mode secours',
    body: 'Le service IA est temporairement indisponible. La réponse ci-dessous est générique. Réessayez dans un instant pour une réponse personnalisée.',
    retry: 'Réessayer',
    contextUnavailable: 'Pas encore de données d\'apprentissage — complétez des exercices ou examens pour obtenir des conseils personnalisés.',
  },
};

export const translations: Record<string, Partial<Translations>> = {
  zh,
  en,
  th,
  vi,
  id,
  ms,
  tl,
  my,
  km,
  lo,
  ja,
  fr,
};

export const LANGUAGES = [
  { code: 'zh', name:'简体中文', flag: 'CN' },
  { code: 'en', name:'English', flag: 'US' },
  { code: 'th', name:'ภาษาไทย', flag: 'TH' },
  { code: 'vi', name:'Tiếng Việt', flag: 'VN' },
  { code: 'id', name:'Bahasa Indonesia', flag: 'ID' },
  { code: 'ms', name:'Bahasa Malaysia', flag: 'MY' },
  { code: 'tl', name:'Filipino', flag: 'PH' },
  { code: 'my', name:'မြန်မာဘာသာ', flag: 'MM' },
  { code: 'km', name:'ភាសាខ្មែរ', flag: 'KH' },
  { code: 'lo', name:'ພາສາລາວ', flag: 'LA' },
  { code: 'ja', name:'日本語', flag: 'JP' },
  { code: 'fr', name:'Français', flag: 'FR' },
];

export function getTranslation(locale: string): Translations {
  const localeData = translations[locale];
  if (!localeData || locale === 'en') return en as Translations;
  // Deep merge: use English as default, locale values override
  return deepMerge(en as Translations, localeData as Partial<Translations>);
}

function deepMerge<T extends object>(source: T, override: Partial<T> | undefined | null): T {
  if (!override) return source;
  const result: any = { ...source };
  for (const key of Object.keys(override) as (keyof T & string)[]) {
    const ov = override[key];
    if (ov === undefined) continue;
    const src = result[key];
    if (ov && typeof ov === 'object' && !Array.isArray(ov) && src && typeof src === 'object' && !Array.isArray(src)) {
      result[key] = deepMerge(src as any, ov as any);
    } else {
      result[key] = ov;
    }
  }
  return result as T;
}
