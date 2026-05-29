/**
 * CSCA真实题库加载模块
 * 从TXT文件解析的JSON数据加载题库，支持按科目、题型、难度查询
 */

import questionsFromTxt from '@/data/processed/questions_from_txt.json';

export interface Question {
  id: string;
  subject: string;
  track: string;
  questionNumber: number;
  question: string;
  type: '选择题' | '问答题' | '填空题' | '阅读理解' | string;
  partTitle?: string;
  sourceFile: string;
  lineNumber: number;
  uniqueId: string;
  options?: Array<{ key: string; value: string }>;
  answer?: string;
  score?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// 获取所有题目
export function getAllQuestions(): Question[] {
  return questionsFromTxt.questions as Question[];
}

// 根据科目获取题目
export function getQuestionsBySubject(subject: string): Question[] {
  return getAllQuestions().filter((q: Question) => q.subject === subject);
}

// 根据题型获取题目
export function getQuestionsByType(type: string): Question[] {
  return getAllQuestions().filter((q: Question) => q.type === type);
}

// 根据难度获取题目
export function getQuestionsByDifficulty(difficulty: string): Question[] {
  return getAllQuestions().filter((q: Question) => q.difficulty === difficulty);
}

// 根据ID获取题目
export function getQuestionById(id: string): Question | undefined {
  return getAllQuestions().find((q: Question) => q.uniqueId === id || q.id === id);
}

// 搜索题目（根据题目内容）
export function searchQuestions(keyword: string): Question[] {
  const lowerKeyword = keyword.toLowerCase();
  return getAllQuestions().filter((q: Question) =>
    q.question.toLowerCase().includes(lowerKeyword)
  );
}

// 获取所有科目
export function getAllSubjects(): string[] {
  const subjects = new Set(getAllQuestions().map((q: Question) => q.subject));
  return Array.from(subjects).filter(s => s !== '未知');
}

// 获取所有文理科类型
export function getAllTracks(): string[] {
  const tracks = new Set(getAllQuestions().map((q: Question) => q.track));
  return Array.from(tracks);
}

// 获取所有题型
export function getAllTypes(): string[] {
  const types = new Set(getAllQuestions().map((q: Question) => q.type));
  return Array.from(types);
}

// 统计某个科目的题目数量
export function countQuestionsBySubject(subject: string): number {
  return getQuestionsBySubject(subject).length;
}

// 获取题目的选项数组（用于前端展示）
export function getOptionsArray(question: Question): { key: string; value: string }[] {
  return question.options || [];
}

// 判断题目是否为选择题
export function isChoiceQuestion(question: Question): boolean {
  return question.type === '选择题';
}

// 判断题目是否有选项
export function hasOptions(question: Question): boolean {
  return question.options && question.options.length > 0;
}

// 判断题目是否有答案
export function hasAnswer(question: Question): boolean {
  return question.answer && question.answer.trim() !== '';
}

// 获取格式化的答案（用于展示）
export function getFormattedAnswer(question: Question): string {
  if (!hasAnswer(question)) return '暂无答案';
  return question.answer;
}

// 获取题目难度描述
export function getDifficultyLabel(difficulty: string | undefined): string {
  if (!difficulty) return '未知';
  const labelMap: Record<string, string> = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  };
  return labelMap[difficulty] || difficulty;
}

// 获取题型描述
export function getTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    '选择题': '选择题',
    '问答题': '问答题',
    '填空题': '填空题',
    '阅读理解': '阅读理解'
  };
  return typeMap[type] || type;
}

// 获取某个科目的难度分布
export function getDifficultyDistribution(subject: string): Record<string, number> {
  const distribution: Record<string, number> = {};
  const questions = getQuestionsBySubject(subject);

  questions.forEach(q => {
    if (q.difficulty) {
      distribution[q.difficulty] = (distribution[q.difficulty] || 0) + 1;
    }
  });

  return distribution;
}

// 获取某个科目的题型分布
export function getTypeDistribution(subject: string): Record<string, number> {
  const distribution: Record<string, number> = {};
  const questions = getQuestionsBySubject(subject);

  questions.forEach(q => {
    distribution[q.type] = (distribution[q.type] || 0) + 1;
  });

  return distribution;
}

// 获取某个科目的文理科分布
export function getTrackDistribution(subject: string): Record<string, number> {
  const distribution: Record<string, number> = {};
  const questions = getQuestionsBySubject(subject);

  questions.forEach(q => {
    distribution[q.track] = (distribution[q.track] || 0) + 1;
  });

  return distribution;
}

// 随机获取指定数量的题目
export function getRandomQuestions(count: number, subject?: string): Question[] {
  let questions = subject ? getQuestionsBySubject(subject) : getAllQuestions();
  const shuffled = questions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// 获取某个科目的选择题
export function getChoiceQuestions(subject: string): Question[] {
  return getQuestionsBySubject(subject).filter(q => isChoiceQuestion(q) && hasOptions(q));
}

// 获取某个科目的问答题
export function getSubjectiveQuestions(subject: string): Question[] {
  return getQuestionsBySubject(subject).filter(q => q.type === '问答题');
}

// 验证答案（适用于选择题）
export function checkAnswer(question: Question, userAnswer: string): boolean {
  if (!hasAnswer(question)) return false;
  return question.answer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
}

// 获取题库统计信息
export function getQuestionBankStats() {
  const allQuestions = getAllQuestions();
  const subjects = getAllSubjects();

  const stats = {
    totalQuestions: allQuestions.length,
    subjects: subjects.length,
    subjectsDetails: subjects.map(subject => ({
      name: subject,
      count: countQuestionsBySubject(subject),
      types: getTypeDistribution(subject),
      difficulties: getDifficultyDistribution(subject),
      tracks: getTrackDistribution(subject)
    }))
  };

  return stats;
}

// 导出适合模拟考试使用的题目格式（返回所有类型的题目）
export function getExamQuestions(subjects: string[], questionCount: number): Question[] {
  let allQuestions: Question[] = [];

  subjects.forEach(subject => {
    const questions = getQuestionsBySubject(subject);
    allQuestions = [...allQuestions, ...questions];
  });

  // 返回所有题目（包括选择题和问答题）
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, questionCount);
}

// 获取元数据
export function getMetadata() {
  return questionsFromTxt.metadata;
}
