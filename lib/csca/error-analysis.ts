/**
 * 错题分析与个性化学习计划模块（入口）
 *
 * 纯函数与存储逻辑已移至 error-analysis-core.ts（可被 Web Worker 打包、可单测）。
 * 本文件仅保留 AI 错题讲解，并 re-export 核心模块以保持既有 import 不变。
 */

export * from './error-analysis-core';

// Mock讲解数据
const generateMockExplanation = (
  question: string,
  userAnswer: string | number,
  correctAnswer: string | number,
  subject: string,
  module: string,
): string => {
  const answerText =
    typeof correctAnswer === 'number' ? String.fromCharCode(65 + correctAnswer) : correctAnswer;
  const userAnswerText =
    typeof userAnswer === 'number' ? String.fromCharCode(65 + userAnswer) : userAnswer;

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
  _locale?: string,
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
    // [TRA-FIX] 动态 import，仅服务端执行时加载 model-router
    const { generateWithFallback } = await import('@/lib/ai/model-router');
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
