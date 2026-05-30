/**
 * CSCA题库服务模块
 * 整合题库和大纲数据，提供统一的题目管理服务
 */

import * as QuestionBank from './question-bank';
import * as Syllabus from './syllabus';

export type { Question } from './question-bank';
export type { SyllabusNode, SubjectInfo } from './syllabus';

// 获取所有科目（合并题库和大纲）
export function getAllSubjects(): string[] {
  const bankSubjects = QuestionBank.getAllSubjects();
  const syllabusSubjects = Syllabus.getAllSubjects();

  const allSubjects = new Set([...bankSubjects, ...syllabusSubjects]);
  return Array.from(allSubjects).filter(s => s !== 'unknown');
}

// 获取题库统计信息
export function getQuestionBankStats() {
  return QuestionBank.getQuestionBankStats();
}

// 获取大纲信息
export function getSyllabusInfo() {
  return Syllabus.getSyllabusMetadata();
}

// 获取科目详情（包含题库和大纲信息）
export function getSubjectDetail(subjectName: string) {
  const syllabusDetail = Syllabus.getSubjectDetail(subjectName);
  const questionStats = {
    totalQuestions: QuestionBank.countQuestionsBySubject(subjectName),
    typeDistribution: QuestionBank.getTypeDistribution(subjectName),
    difficultyDistribution: QuestionBank.getDifficultyDistribution(subjectName)
  };

  return {
    syllabus: syllabusDetail,
    questionStats
  };
}

// 获取适合考试的题目
export function getExamQuestions(subjects: string[], questionCount: number) {
  return QuestionBank.getExamQuestions(subjects, questionCount);
}

// 获取科目题库
export function getQuestionsBySubject(subject: string) {
  return QuestionBank.getQuestionsBySubject(subject);
}

// 获取选择题
export function getChoiceQuestions(subject: string) {
  return QuestionBank.getChoiceQuestions(subject);
}

// 获取主观题
export function getSubjectiveQuestions(subject: string) {
  return QuestionBank.getSubjectiveQuestions(subject);
}

// 随机获取题目
export function getRandomQuestions(count: number, subject?: string) {
  return QuestionBank.getRandomQuestions(count, subject);
}

// 搜索题目
export function searchQuestions(keyword: string) {
  return QuestionBank.searchQuestions(keyword);
}

// 获取题目详情
export function getQuestionById(id: string) {
  return QuestionBank.getQuestionById(id);
}

// 获取知识点路径
export function getKnowledgePointPath(nodeId: string) {
  return Syllabus.getNodePath(nodeId);
}

// 获取知识点详情
export function getKnowledgePointDetail(nodeId: string) {
  return Syllabus.getNodeById(nodeId);
}

// 获取所有知识点
export function getAllKnowledgePoints(subject: string) {
  return Syllabus.getKnowledgePointsBySubject(subject);
}

// 获取难度分布
export function getDifficultyDistribution(subject: string) {
  return QuestionBank.getDifficultyDistribution(subject);
}

// 获取题型分布
export function getTypeDistribution(subject: string) {
  return QuestionBank.getTypeDistribution(subject);
}

// 获取题库和大纲的完整统计
export function getFullStats() {
  return {
    questionBank: QuestionBank.getQuestionBankStats(),
    syllabus: Syllabus.getSyllabusMetadata(),
    subjects: getAllSubjects()
  };
}

// 判断题目是否可用（有选项和答案）
export function isQuestionUsable(question: QuestionBank.Question): boolean {
  return QuestionBank.hasOptions(question) && QuestionBank.hasAnswer(question);
}

// 获取可用题目数量
export function getUsableQuestionCount(subject: string): number {
  const questions = QuestionBank.getQuestionsBySubject(subject);
  return questions.filter(q => isQuestionUsable(q)).length;
}

// 验证答案
export function checkAnswer(question: QuestionBank.Question, userAnswer: string): boolean {
  return QuestionBank.checkAnswer(question, userAnswer);
}

// 获取题型标签
export function getTypeLabel(type: string): string {
  return QuestionBank.getTypeLabel(type);
}

// 获取难度标签
export function getDifficultyLabel(difficulty: number | null): string {
  return QuestionBank.getDifficultyLabel(difficulty?.toString() ?? undefined);
}

// 获取选项数组
export function getOptionsArray(question: QuestionBank.Question) {
  return QuestionBank.getOptionsArray(question);
}

// 获取格式化答案
export function getFormattedAnswer(question: QuestionBank.Question) {
  return QuestionBank.getFormattedAnswer(question);
}

// 获取科目难度分布（大纲）
export function getSyllabusDifficultyDistribution(subject: string) {
  return Syllabus.getDifficultyDistribution(subject);
}

// 统计科目知识点数量
export function countKnowledgePoints(subject: string) {
  return Syllabus.countKnowledgePoints(subject);
}

// 搜索知识点
export function searchKnowledgePoints(keyword: string) {
  return Syllabus.searchNodes(keyword);
}
