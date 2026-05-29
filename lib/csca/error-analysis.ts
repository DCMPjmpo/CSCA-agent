/**
 * 错题分析与个性化学习计划模块
 * 
 * 功能：
 * 1. 记录用户错题
 * 2. 分析错题模式和薄弱环节
 * 3. 生成个性化学习计划
 * 4. 提供AI错题讲解
 */

import { generateWithFallback } from '@/lib/ai/model-router';

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
    const uniqueRecords = records.filter(record => {
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

// 保存错题记录
export function saveErrorRecord(record: ErrorRecord): void {
  const records = getErrorRecords();
  const existingIndex = records.findIndex(r => r.questionId === record.questionId);
  
  if (existingIndex >= 0) {
    // 更新现有记录
    records[existingIndex] = {
      ...records[existingIndex],
      reviewCount: records[existingIndex].reviewCount + 1,
      lastReviewTime: Date.now()
    };
  } else {
    // 添加新记录
    records.push({
      ...record,
      id: generateUniqueId(),
      reviewCount: 0
    });
  }
  
  localStorage.setItem(ERROR_RECORDS_KEY, JSON.stringify(records));
}

// 删除错题记录
export function deleteErrorRecord(recordId: string): void {
  const records = getErrorRecords();
  const filtered = records.filter(r => r.id !== recordId);
  localStorage.setItem(ERROR_RECORDS_KEY, JSON.stringify(filtered));
}

// 清空所有错题记录
export function clearAllErrorRecords(): void {
  localStorage.removeItem(ERROR_RECORDS_KEY);
}

// 获取某科目的错题
export function getErrorRecordsBySubject(subject: string): ErrorRecord[] {
  return getErrorRecords().filter(r => r.subject === subject);
}

// 分析薄弱环节
export function analyzeWeakAreas(userAnswers: UserAnswer[]): WeakArea[] {
  const subjectModules: Record<string, Record<string, { total: number; correct: number }>> = {};
  
  userAnswers.forEach(answer => {
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
          priority
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
  examDate?: Date
): StudyPlan {
  const now = Date.now();
  const daysUntilExam = examDate ? Math.ceil((examDate.getTime() - now) / (1000 * 60 * 60 * 24)) : 30;
  
  // 生成每日目标
  const dailyGoals: DailyGoal[] = [];
  const dailySubjects = [...targetSubjects];
  
  // 优先安排薄弱环节
  const highPriorityAreas = weakAreas.filter(a => a.priority === 'high');
  const mediumPriorityAreas = weakAreas.filter(a => a.priority === 'medium');
  
  // 为高优先级薄弱环节创建任务
  let taskCounter = 0;
  highPriorityAreas.forEach((area, areaIndex) => {
    const tasks: Task[] = [
      {
        id: `task-${Date.now()}-${areaIndex}-${taskCounter++}`,
        type: 'review',
        description: `复习${area.module}知识点`,
        completed: false
      },
      {
        id: `task-${Date.now()}-${areaIndex}-${taskCounter++}`,
        type: 'practice',
        description: `完成${area.module}练习题10道`,
        questionCount: 10,
        completed: false
      }
    ];
    
    dailyGoals.push({
      id: `daily-${Date.now()}-${areaIndex}`,
      subject: area.subject,
      module: area.module,
      tasks,
      completed: false
    });
  });
  
  // 生成每周目标
  const weeklyGoals: WeeklyGoal[] = [];
  for (let week = 1; week <= Math.ceil(daysUntilExam / 7); week++) {
    const goals: Goal[] = targetSubjects.map(subject => ({
      id: `goal-${week}-${subject}`,
      description: `${subject}本周学习目标`,
      subject,
      targetScore: week * 10, // 每周进步10分
      completed: false
    }));
    
    weeklyGoals.push({
      id: `week-${week}`,
      weekNumber: week,
      goals,
      completed: false
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
    progress: 0
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
    plan.dailyGoals.forEach(goal => {
      goal.tasks.forEach(task => {
        if (task.id === taskId) {
          task.completed = true;
        }
      });
      // 检查是否所有任务都完成
      goal.completed = goal.tasks.every(t => t.completed);
    });
    saveStudyPlan(plan);
  }
}

// Mock讲解数据
const generateMockExplanation = (
  question: string,
  userAnswer: string | number,
  correctAnswer: string | number,
  subject: string,
  module: string
): string => {
  const answerText = typeof correctAnswer === 'number' ? String.fromCharCode(65 + correctAnswer) : correctAnswer;
  const userAnswerText = typeof userAnswer === 'number' ? String.fromCharCode(65 + userAnswer) : userAnswer;
  
  return `📌 错误分析
- 你的答案「${userAnswerText}」与正确答案「${answerText}」不符
- 可能存在概念理解上的偏差
- 建议重新复习「${module}」相关知识点

💡 正确解答
- 本题的正确答案是：${answerText}
- 解题思路：仔细分析题目要求，结合${module}的相关知识进行判断
- 关键知识点：${subject}中的${module}基础概念

📝 知识点回顾
- 核心概念：${module}的定义和应用
- 记忆技巧：多做练习题，加深理解
- 关联知识点：与${subject}其他模块的联系

⚠️ 注意事项
- 注意题目中的关键词和限定条件
- 答题时要仔细审题，避免粗心错误
- 建议：多复习相关知识点，巩固基础

🎯 举一反三
- 练习题1：请举出类似的例子，并说明解题思路
- 练习题2：如果题目条件变化，答案会有什么不同？`;
};

// 使用AI讲解错题
export async function getAIErrorExplanation(
  question: string,
  userAnswer: string | number,
  correctAnswer: string | number,
  subject: string,
  module: string,
  locale?: string
): Promise<string> {
  const prompt = `你是一位专业的${subject}学科AI辅导老师，擅长为国际学生讲解知识点。请帮我详细分析这道错题：

【题目信息】
题目：${question}
我的答案：${userAnswer}
正确答案：${correctAnswer}
所属科目：${subject}
所属模块：${module}

【请按以下结构详细解答】：

📌 错误分析
- 指出学生可能存在的概念误解或思维误区
- 分析错误答案的产生原因
- 列举常见的错误类型

💡 正确解答
- 详细讲解正确答案的推导过程
- 分步骤展示解题思路
- 引用相关知识点和公式

📝 知识点回顾
- 总结本题涉及的核心知识点
- 提供记忆技巧和方法
- 关联相关概念

⚠️ 注意事项
- 提醒易错点和陷阱
- 提供解题时的注意事项
- 给出避免错误的建议

🎯 举一反三
- 提供1-2道类似难度的练习题
- 给出练习题的简要解答思路

请用清晰、简洁、易懂的语言解答，避免使用过于专业的术语。
如果是数学或理科题目，请使用Markdown格式展示公式。
输出格式要美观，使用适当的emoji和分隔线。`;

  try {
    const result = await generateWithFallback({
      task: 'tutor',
      messages: [{ role: 'user', content: prompt }],
    });
    
    return result.text;
  } catch (error) {
    console.error('[AI Error Explanation] Error:', error);
    // 返回mock数据作为fallback
    return generateMockExplanation(question, userAnswer, correctAnswer, subject, module);
  }
}

// 生成错题报告
export function generateErrorReport(errorRecords: ErrorRecord[]): string {
  if (errorRecords.length === 0) {
    return '暂无错题记录，继续保持！';
  }
  
  const subjectStats: Record<string, number> = {};
  errorRecords.forEach(record => {
    subjectStats[record.subject] = (subjectStats[record.subject] || 0) + 1;
  });
  
  let report = `## 错题报告\n\n`;
  report += `共 ${errorRecords.length} 道错题\n\n`;
  report += `### 各科目错题分布\n`;
  
  Object.entries(subjectStats).forEach(([subject, count]) => {
    report += `- ${subject}: ${count} 道\n`;
  });
  
  report += `\n### 错题列表\n`;
  errorRecords.forEach((record, index) => {
    report += `\n${index + 1}. **${record.module}**\n`;
    report += `   - 题目：${record.question.substring(0, 50)}...\n`;
    report += `   - 你的答案：${record.userAnswer}\n`;
    report += `   - 正确答案：${record.correctAnswer}\n`;
    report += `   - 复习次数：${record.reviewCount}\n`;
  });
  
  return report;
}

// 获取需要复习的错题（根据艾宾浩斯遗忘曲线）
export function getErrorRecordsForReview(): ErrorRecord[] {
  const records = getErrorRecords();
  const now = Date.now();
  
  return records.filter(record => {
    if (!record.lastReviewTime) return true;
    
    // 计算距离上次复习的天数
    const daysSinceReview = Math.floor((now - record.lastReviewTime) / (1000 * 60 * 60 * 24));
    
    // 根据复习次数确定复习间隔
    const reviewIntervals = [1, 3, 7, 14, 30]; // 第n次复习后的间隔天数
    const interval = reviewIntervals[Math.min(record.reviewCount, reviewIntervals.length - 1)];
    
    return daysSinceReview >= interval;
  });
}
