/**
 * CSCA题目审核服务
 * 使用AI模型检查题目质量，包括：
 * 1. 书写问题（错别字、语法错误）
 * 2. 格式问题（乱码、标记残留）
 * 3. 内容问题（不是有效题目、答案不匹配等）
 */

import type { Question } from './question-bank';

export interface AuditResult {
  isValid: boolean;
  issues: string[];
  confidence: number;
  suggestion?: string;
  correctedQuestion?: string;
  correctedOptions?: string[] | Array<{ key: string; value: string }>;
}

// 题目质量检查规则
const AUDIT_RULES = {
  minQuestionLength: 10,
  maxQuestionLength: 500,
  minOptionLength: 2,
  maxOptionLength: 200,
  allowedSpecialChars: ['？', '？', '！', '。', ',', '.', ':', '：', ';', '；', '(', ')', '（', '）', '[', ']', '【', '】'],
};

/**
 * 检查题目是否包含乱码或格式标记
 */
function hasEncodingIssues(text: string): boolean {
  // 检查是否包含明显的乱码模式
  const garbagePatterns = [
    /[\u0000-\u001F\u007F-\u009F]/g, // 控制字符
    /[^\u0000-\uFFFF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AFa-zA-Z0-9\s\p{P}]/gu, // 非法字符
    /xx\+|xx\)|xx\(|xx=|xx"|bb"|aa"/g, // 明显的乱码模式
    /\\frac|\\left|\\right|\\times|\\pi|\\cdot/g, // LaTeX残留但可能是正常的
    /---\s*#+\s*Part\s*[A-Z]\s*#+/g, // 格式标记
    /\{|}/g, // 花括号（可能是JSON残留）
    /\|\|/g, // 双竖线（可能是分隔符残留）
  ];

  return garbagePatterns.some(pattern => pattern.test(text));
}

/**
 * 检查题目是否是有效问题
 */
function isValidQuestion(question: string): boolean {
  const trimmed = question.trim();

  // 长度检查
  if (trimmed.length < AUDIT_RULES.minQuestionLength) return false;
  if (trimmed.length > AUDIT_RULES.maxQuestionLength) return false;

  // 是否以问号结尾（选择题通常应该是问句）
  if (!trimmed.endsWith('？') && !trimmed.endsWith('?') && !trimmed.endsWith('。')) {
    return false;
  }

  // 是否包含问题词
  const questionWords = ['什么', '哪个', '哪项', '哪些', '属于', '正确', '错误', '是', '为', '等于', '满足', '成立', '取值', '范围'];
  return questionWords.some(word => trimmed.includes(word));
}

/**
 * 检查选项是否有效（选择题需要）
 */
function isValidOptions(options: Array<{ key: string; value: string }>): boolean {
  if (!options || options.length < 2) return false;

  return options.every(opt => {
    const trimmed = opt.value.trim();
    return trimmed.length >= AUDIT_RULES.minOptionLength && trimmed.length <= AUDIT_RULES.maxOptionLength;
  });
}

/**
 * 判断是否是问答题类型（不需要选项）
 */
function isEssayQuestion(question: Question): boolean {
  const type = question.module || question.difficulty || '';
  const essayKeywords = ['问答', '简述', '论述', '分析', '说明', '解释', '写作'];

  // 检查题目类型或模块是否包含问答题关键词
  if (essayKeywords.some(keyword => type.includes(keyword))) {
    return true;
  }

  // 检查题目内容是否以"什么是"、"简述"、"论述"等开头
  const questionText = question.question || '';
  const essayPrefixes = ['什么是', '简述', '论述', '分析', '说明', '解释', '请', '试'];
  return essayPrefixes.some(prefix => questionText.startsWith(prefix));
}

/**
 * 检查是否包含考试须知类内容（不是题目）
 */
function isInstructionText(text: string): boolean {
  const instructionKeywords = ['考生', '姓名', '准考证', '答题', '试卷', '注意', '要求', '务必', '填写', '写好', '步骤', '计算'];
  return instructionKeywords.some(keyword => text.includes(keyword));
}

/**
 * 检查是否包含明显的格式标记
 */
function hasFormatMarkers(text: string): boolean {
  const markers = ['###', '####', '---', '===', '**', '*', '_', '~~', '[', ']', '|', '`', '$'];
  return markers.some(marker => text.includes(marker));
}

/**
 * 审核单个题目（宽松模式：只要有内容就算有效）
 */
export function auditQuestion(question: Question): AuditResult {
  const issues: string[] = [];
  let isValid = true;
  let confidence = 1.0;

  // 检查题目内容
  if (!question.question || question.question.trim().length === 0) {
    issues.push('题目内容为空');
    isValid = false;
    confidence -= 0.5;
  } else {
    // 检查乱码（标记但不拒绝）
    if (hasEncodingIssues(question.question)) {
      issues.push('题目内容包含乱码或格式标记，建议修复');
      confidence -= 0.2;
    }

    // 检查是否是考试须知（标记但不拒绝）
    if (isInstructionText(question.question)) {
      issues.push('题目内容像是考试须知，请确认是否为有效题目');
      confidence -= 0.3;
    }

    // 检查格式标记（标记但不拒绝）
    if (hasFormatMarkers(question.question)) {
      issues.push('题目内容包含格式标记（如###、---等），建议清理');
      confidence -= 0.1;
    }
  }

  // 检查选项（如果有）
  if (question.options && question.options.length > 0) {
    // 检查选项中的乱码
    question.options.forEach((opt, index) => {
      if (hasEncodingIssues(opt.value)) {
        issues.push(`选项${String.fromCharCode(65 + index)}包含乱码，建议修复`);
        confidence -= 0.05;
      }
    });
  }

  // 如果没有选项，只是标记提示
  if (!question.options || question.options.length === 0) {
    issues.push('题目没有选项（可能是问答题）');
    confidence -= 0.1;
  }

  return {
    isValid: isValid || (question.question && question.question.trim().length > 0),
    issues,
    confidence: Math.max(0, confidence),
    suggestion: generateSuggestion(issues),
  };
}

/**
 * 生成改进建议
 */
function generateSuggestion(issues: string[]): string {
  if (issues.length === 0) return '';

  const suggestions: string[] = [];

  if (issues.some(i => i.includes('乱码'))) {
    suggestions.push('请检查原始题库的编码格式，确保使用UTF-8编码');
  }

  if (issues.some(i => i.includes('格式标记'))) {
    suggestions.push('请移除题目中的Markdown格式标记（如###、**等）');
  }

  if (issues.some(i => i.includes('考试须知'))) {
    suggestions.push('请将考试须知与实际题目分开存放');
  }

  if (issues.some(i => i.includes('有效问题'))) {
    suggestions.push('题目应以问号或句号结尾，并包含疑问词（如：什么、哪个、正确等）');
  }

  return suggestions.join('；');
}

/**
 * 批量审核题目
 */
export function auditQuestions(questions: Question[]): {
  validQuestions: Question[];
  invalidQuestions: Question[];
  auditResults: AuditResult[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    avgConfidence: number;
  };
} {
  const validQuestions: Question[] = [];
  const invalidQuestions: Question[] = [];
  const auditResults: AuditResult[] = [];

  questions.forEach((q, index) => {
    const result = auditQuestion(q);
    result.correctedQuestion = q.question;
    result.correctedOptions = q.options;

    auditResults.push(result);

    if (result.isValid) {
      validQuestions.push(q);
    } else {
      invalidQuestions.push(q);
    }
  });

  const avgConfidence = auditResults.length > 0
    ? auditResults.reduce((sum, r) => sum + r.confidence, 0) / auditResults.length
    : 0;

  return {
    validQuestions,
    invalidQuestions,
    auditResults,
    stats: {
      total: questions.length,
      valid: validQuestions.length,
      invalid: invalidQuestions.length,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    },
  };
}

/**
 * 清理题目内容中的格式标记和乱码
 */
export function cleanQuestionContent(text: string): string {
  let cleaned = text;

  // 移除Markdown格式
  cleaned = cleaned.replace(/###+/g, '');
  cleaned = cleaned.replace(/\*\*/g, '');
  cleaned = cleaned.replace(/\*/g, '');
  cleaned = cleaned.replace(/~~/g, '');
  cleaned = cleaned.replace(/`/g, '');
  cleaned = cleaned.replace(/---+/g, '');
  cleaned = cleaned.replace(/===+/g, '');

  // 移除明显的乱码模式
  cleaned = cleaned.replace(/xx\+|xx\)|xx\(|xx=|xx"|bb"|aa"/g, '');

  // 移除格式标记
  cleaned = cleaned.replace(/---\s*#+\s*Part\s*[A-Z]\s*#+/g, '');

  // 移除多余的空格和换行
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * 修复有问题的题目（简单修复）
 */
export function fixQuestion(question: Question): Question {
  const cleaned: Question = {
    ...question,
    question: cleanQuestionContent(question.question || ''),
  };

  if (cleaned.options) {
    cleaned.options = cleaned.options.map(opt => ({
      ...opt,
      value: cleanQuestionContent(opt.value),
    }));
  }

  return cleaned;
}
