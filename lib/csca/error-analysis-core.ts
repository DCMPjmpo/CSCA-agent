/**
 * 错题分析与个性化学习计划核心模块（纯函数 + localStorage 存储）
 *
 * 与 error-analysis.ts 分离：本模块不含任何 AI 调用，可安全地被 Web Worker 打包，
 * 也可在 vitest（node 环境）中直接单测。
 */

export interface UserAnswer {
  questionId: string;
  question: string;
  subject: string;
  module: string;
  userAnswer: string | number;
  correctAnswer: string | number;
  isCorrect: boolean;
  timestamp: number;
}

export interface ErrorRecord {
  id: string;
  questionId: string;
  question: string;
  subject: string;
  module: string;
  userAnswer: string | number;
  correctAnswer: string | number;
  explanation?: string;
  timestamp: number;
  reviewCount: number;
  lastReviewTime?: number;
}

export interface WeakArea {
  subject: string;
  module: string;
  errorCount: number;
  accuracy: number;
  priority: 'high' | 'medium' | 'low';
}

export interface StudyPlan {
  id: string;
  userId: string;
  createdAt: number;
  targetSubjects: string[];
  weakAreas: WeakArea[];
  dailyGoals: DailyGoal[];
  weeklyGoals: WeeklyGoal[];
  progress: number;
}

export interface DailyGoal {
  id: string;
  subject: string;
  module: string;
  tasks: Task[];
  completed: boolean;
}

export interface WeeklyGoal {
  id: string;
  weekNumber: number;
  goals: Goal[];
  completed: boolean;
}

export interface Goal {
  id: string;
  description: string;
  subject: string;
  targetScore: number;
  actualScore?: number;
  completed: boolean;
}

export interface Task {
  id: string;
  type: 'practice' | 'review' | 'video' | 'quiz';
  description: string;
  questionCount?: number;
  completed: boolean;
}

// 存储键名
const ERROR_RECORDS_KEY = 'csca_error_records';
const STUDY_PLAN_KEY = 'csca_study_plan';

// 获取所有错题记录
export function getErrorRecords(): ErrorRecord[] {
  try {
    const data = localStorage.getItem(ERROR_RECORDS_KEY);
    if (!data) return [];

    const records: ErrorRecord[] = JSON.parse(data);

    // 清理重复记录（根据id去重）
    const seen = new Set<string>();
    const uniqueRecords = records.filter((record) => {
      if (seen.has(record.id)) {
        console.warn(`[ErrorAnalysis] Found duplicate record id: ${record.id}, removing`);
        return false;
      }
      seen.add(record.id);
      return true;
    });

    // 如果有重复记录，更新localStorage
    if (uniqueRecords.length !== records.length) {
      localStorage.setItem(ERROR_RECORDS_KEY, JSON.stringify(uniqueRecords));
    }

    return uniqueRecords;
  } catch {
    return [];
  }
}

// 生成唯一ID
function generateUniqueId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `error-${timestamp}-${random}`;
}

/**
 * 批量合并错题记录（纯函数，不触碰 localStorage）。
 * 按 questionId 去重：已存在的记录 reviewCount+1 并更新 lastReviewTime；
 * 新记录补 generateUniqueId() id 后追加。
 */
export function mergeErrorRecords(
  existing: ErrorRecord[],
  newRecords: ErrorRecord[],
  now?: number,
): ErrorRecord[] {
  const nowMs = now ?? Date.now();
  const merged = [...existing];

  for (const record of newRecords) {
    const existingIndex = merged.findIndex((r) => r.questionId === record.questionId);

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        reviewCount: merged[existingIndex].reviewCount + 1,
        lastReviewTime: nowMs,
      };
    } else {
      merged.push({
        ...record,
        id: generateUniqueId(),
        reviewCount: 0,
      });
    }
  }

  return merged;
}

// 保存错题记录
export function saveErrorRecord(record: ErrorRecord): void {
  const records = getErrorRecords();
  const existingIndex = records.findIndex((r) => r.questionId === record.questionId);

  if (existingIndex >= 0) {
    // 更新现有记录
    records[existingIndex] = {
      ...records[existingIndex],
      reviewCount: records[existingIndex].reviewCount + 1,
      lastReviewTime: Date.now(),
    };
  } else {
    // 添加新记录
    records.push({
      ...record,
      id: generateUniqueId(),
      reviewCount: 0,
    });
  }

  localStorage.setItem(ERROR_RECORDS_KEY, JSON.stringify(records));
}

/**
 * 批量保存错题记录：读一次 + 合并一次 + 写一次。
 * 替代逐条调用 saveErrorRecord 的 O(N²) 读改写。
 */
export function saveErrorRecords(records: ErrorRecord[]): ErrorRecord[] {
  const merged = mergeErrorRecords(getErrorRecords(), records);
  localStorage.setItem(ERROR_RECORDS_KEY, JSON.stringify(merged));
  return merged;
}

/**
 * 直接写入已合并好的错题记录（供 Web Worker 使用，避免二次合并导致 reviewCount 重复累加）。
 */
export function writeErrorRecords(records: ErrorRecord[]): void {
  localStorage.setItem(ERROR_RECORDS_KEY, JSON.stringify(records));
}

// 删除错题记录
export function deleteErrorRecord(recordId: string): void {
  const records = getErrorRecords();
  const filtered = records.filter((r) => r.id !== recordId);
  localStorage.setItem(ERROR_RECORDS_KEY, JSON.stringify(filtered));
}

// 清空所有错题记录
export function clearAllErrorRecords(): void {
  localStorage.removeItem(ERROR_RECORDS_KEY);
}

// 获取某科目的错题
export function getErrorRecordsBySubject(subject: string): ErrorRecord[] {
  return getErrorRecords().filter((r) => r.subject === subject);
}

// 分析薄弱环节
export function analyzeWeakAreas(userAnswers: UserAnswer[]): WeakArea[] {
  const subjectModules: Record<string, Record<string, { total: number; correct: number }>> = {};

  userAnswers.forEach((answer) => {
    if (!subjectModules[answer.subject]) {
      subjectModules[answer.subject] = {};
    }
    if (!subjectModules[answer.subject][answer.module]) {
      subjectModules[answer.subject][answer.module] = { total: 0, correct: 0 };
    }

    subjectModules[answer.subject][answer.module].total++;
    if (answer.isCorrect) {
      subjectModules[answer.subject][answer.module].correct++;
    }
  });

  const weakAreas: WeakArea[] = [];

  Object.entries(subjectModules).forEach(([subject, modules]) => {
    Object.entries(modules).forEach(([module, stats]) => {
      const accuracy = stats.total > 0 ? stats.correct / stats.total : 1;
      const errorCount = stats.total - stats.correct;

      let priority: 'high' | 'medium' | 'low' = 'low';
      if (accuracy < 0.5) priority = 'high';
      else if (accuracy < 0.7) priority = 'medium';

      if (errorCount > 0) {
        weakAreas.push({
          subject,
          module,
          errorCount,
          accuracy,
          priority,
        });
      }
    });
  });

  // 按优先级排序
  return weakAreas.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// 生成个性化学习计划
export function generateStudyPlan(
  userId: string,
  targetSubjects: string[],
  weakAreas: WeakArea[],
  examDate?: Date,
): StudyPlan {
  const now = Date.now();
  const daysUntilExam = examDate
    ? Math.ceil((examDate.getTime() - now) / (1000 * 60 * 60 * 24))
    : 30;

  // 生成每日目标
  const dailyGoals: DailyGoal[] = [];

  // 优先安排薄弱环节
  const highPriorityAreas = weakAreas.filter((a) => a.priority === 'high');

  // 为高优先级薄弱环节创建任务
  let taskCounter = 0;
  highPriorityAreas.forEach((area, areaIndex) => {
    const tasks: Task[] = [
      {
        id: `task-${Date.now()}-${areaIndex}-${taskCounter++}`,
        type: 'review',
        description: `复习${area.module}知识点`,
        completed: false,
      },
      {
        id: `task-${Date.now()}-${areaIndex}-${taskCounter++}`,
        type: 'practice',
        description: `完成${area.module}练习题10道`,
        questionCount: 10,
        completed: false,
      },
    ];

    dailyGoals.push({
      id: `daily-${Date.now()}-${areaIndex}`,
      subject: area.subject,
      module: area.module,
      tasks,
      completed: false,
    });
  });

  // 生成每周目标
  const weeklyGoals: WeeklyGoal[] = [];
  for (let week = 1; week <= Math.ceil(daysUntilExam / 7); week++) {
    const goals: Goal[] = targetSubjects.map((subject) => ({
      id: `goal-${week}-${subject}`,
      description: `${subject}本周学习目标`,
      subject,
      targetScore: week * 10, // 每周进步10分
      completed: false,
    }));

    weeklyGoals.push({
      id: `week-${week}`,
      weekNumber: week,
      goals,
      completed: false,
    });
  }

  return {
    id: `plan-${Date.now()}`,
    userId,
    createdAt: now,
    targetSubjects,
    weakAreas,
    dailyGoals,
    weeklyGoals,
    progress: 0,
  };
}

// 保存学习计划
export function saveStudyPlan(plan: StudyPlan): void {
  localStorage.setItem(STUDY_PLAN_KEY, JSON.stringify(plan));
}

// 获取学习计划
export function getStudyPlan(): StudyPlan | null {
  try {
    const data = localStorage.getItem(STUDY_PLAN_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// 更新学习计划进度
export function updateStudyPlanProgress(planId: string, progress: number): void {
  const plan = getStudyPlan();
  if (plan && plan.id === planId) {
    plan.progress = progress;
    saveStudyPlan(plan);
  }
}

// 标记任务完成
export function markTaskCompleted(taskId: string): void {
  const plan = getStudyPlan();
  if (plan) {
    plan.dailyGoals.forEach((goal) => {
      goal.tasks.forEach((task) => {
        if (task.id === taskId) {
          task.completed = true;
        }
      });
      // 检查是否所有任务都完成
      goal.completed = goal.tasks.every((t) => t.completed);
    });
    saveStudyPlan(plan);
  }
}
