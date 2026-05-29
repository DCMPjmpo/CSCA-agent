/**
 * CSCA Multi-Agent Orchestration System
 * 
 * Optimized for speed - keyword-based agent selection only
 */

import { generateWithFallback, streamWithFallback, getTaskTypeForAgent } from '@/lib/ai/model-router';
import { CSCA_AGENTS, getAgentById } from './agents';

// ==========================================
// Agent Selection Logic (Fast Keyword-Based)
// ==========================================

const AGENT_KEYWORDS: Record<string, string[]> = {
  examiner: ['考试', '测验', '题目', '试卷', '模拟', '真题', '习题', '练习', '测验', '考题', 'exam', 'test', 'question', 'paper'],
  tutor: ['讲解', '解释', '什么是', '为什么', '概念', '原理', '知识', '学习', '理解', '怎么', 'explain', 'teach', 'learn', 'concept'],
  analyst: ['分析', '成绩', '评估', '报告', '统计', '数据', '表现', '弱点', '优势', 'analyze', 'score', 'report', 'performance'],
  challenger: ['挑战', '批判', '辩论', '反驳', '质疑', '深入', '思考', '论证', 'challenge', 'debate', 'critical'],
  advisor: ['大学', '专业', '申请', '奖学金', '职业', '规划', '推荐', '选校', 'university', 'college', 'apply', 'scholarship'],
  motivator: ['加油', '鼓励', '坚持', '信心', '动力', '激励', '心态', 'motivate', 'encourage', 'keep going'],
  video_explainer: ['视频', '教程', '演示', '讲解视频', 'video', 'tutorial', 'demo'],
  error_explainer: ['错题', '错误', '做错', '解析', '答案', '订正', 'mistake', 'error', 'wrong', 'correct'],
};

/**
 * Fast keyword-based agent selection (no AI call)
 */
export function selectAgent(userQuery: string): string {
  // 1. Check if user @mentioned a specific agent
  for (const agent of CSCA_AGENTS) {
    if (userQuery.toLowerCase().includes(`@${agent.name.toLowerCase()}`)) {
      return agent.id;
    }
    if (userQuery.toLowerCase().includes(`@${agent.id.toLowerCase()}`)) {
      return agent.id;
    }
  }

  // 2. Auto-select based on keywords
  const queryLower = userQuery.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [agentId, keywords] of Object.entries(AGENT_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (queryLower.includes(keyword)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = agentId;
    }
  }

  // 3. Return best match or default to tutor
  return bestMatch || 'tutor';
}

// ==========================================
// Format Conversion Utilities
// ==========================================

/**
 * Convert LaTeX math notation to readable text format
 */
function cleanLaTeXFormat(text: string): string {
  let result = text;

  // Remove LaTeX inline math delimiters \(...\)
  result = result.replace(/\\\(([^)]+)\\\)/g, '$1');

  // Convert fractions \frac{a}{b} -> a/b
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');

  // Convert superscripts ^{...} -> ^...
  result = result.replace(/\^\{([^}]+)\}/g, '^$1');

  // Convert square root \sqrt{...} -> √...
  result = result.replace(/\\sqrt\{([^}]+)\}/g, '√$1');

  // Convert pi \pi -> π
  result = result.replace(/\\pi/g, 'π');

  // Convert theta \theta -> θ
  result = result.replace(/\\theta/g, 'θ');

  // Convert alpha \alpha -> α
  result = result.replace(/\\alpha/g, 'α');

  // Convert beta \beta -> β
  result = result.replace(/\\beta/g, 'β');

  // Convert infinity \infty -> ∞
  result = result.replace(/\\infty/g, '∞');

  // Convert integral \int -> ∫
  result = result.replace(/\\int/g, '∫');

  // Convert sum \sum -> ∑
  result = result.replace(/\\sum/g, '∑');

  // Remove extra backslashes
  result = result.replace(/\\/g, '');

  // Clean up extra ** markdown bold markers
  result = result.replace(/\*\*/g, '');

  return result.trim();
}

// ==========================================
// Single Agent Execution
// ==========================================

/**
 * Build prompt for agent execution
 */
function buildAgentPrompt(
  agent: any,
  userQuery: string,
  conversationHistory: Array<{ role: string; content: string; agentId?: string }> = []
): string {
  const contextMessages = conversationHistory.slice(-3); // Reduced context for faster response
  const contextText = contextMessages.map(m =>
    `${m.agentId ? `[${getAgentById(m.agentId)?.name || m.agentId}]` : '[User]'}: ${m.content}`
  ).join('\n');

  return `你是${agent.name}，${agent.role}。

${agent.systemPrompt}

---
历史对话（仅供参考）：
${contextText}

---
用户当前问题：
${userQuery}

格式要求：
1. 使用中文回答，语言自然友好
2. 数学表达式使用简单文本格式，如 x^2、a/b、√2
3. 不要使用 LaTeX 语法（如 \(x\)、\frac{a}{b}）
4. 不要使用 Markdown 格式（如 **粗体**）

请回答用户的问题。`;
}

/**
 * Execute a single agent with the user's query (regular mode)
 */
export async function executeSingleAgent(
  agentId: string,
  userQuery: string,
  conversationHistory: Array<{ role: string; content: string; agentId?: string }> = []
) {
  const agent = getAgentById(agentId);
  if (!agent) {
    return {
      success: false,
      message: 'Agent not found',
      agentId: 'system',
    };
  }

  const fullPrompt = buildAgentPrompt(agent, userQuery, conversationHistory);

  try {
    const taskType = getTaskTypeForAgent(agentId);
    const result = await generateWithFallback({
      task: taskType,
      messages: [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: fullPrompt },
      ],
      maxTokens: 2048, // Reduced tokens for faster response
    });

    const cleanedMessage = cleanLaTeXFormat(result.text);

    return {
      success: true,
      message: cleanedMessage,
      agentId: agent.id,
      agentName: agent.name,
    };
  } catch (error) {
    console.error(`[Agent ${agentId}] Error:`, error);
    return {
      success: false,
      message: '抱歉，我遇到了一个错误，请稍后重试。',
      agentId: agent.id,
      agentName: agent.name,
    };
  }
}

/**
 * Execute a single agent with streaming response
 */
export async function* executeSingleAgentStream(
  agentId: string,
  userQuery: string,
  conversationHistory: Array<{ role: string; content: string; agentId?: string }> = []
) {
  const agent = getAgentById(agentId);
  if (!agent) {
    yield { type: 'error', data: { message: 'Agent not found', agentId: 'system' } };
    return;
  }

  const fullPrompt = buildAgentPrompt(agent, userQuery, conversationHistory);

  try {
    const taskType = getTaskTypeForAgent(agentId);
    const stream = await streamWithFallback({
      task: taskType,
      messages: [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: fullPrompt },
      ],
      maxTokens: 2048,
    });

    // Stream the response
    let fullMessage = '';
    for await (const chunk of stream.textStream) {
      fullMessage += chunk;
      yield {
        type: 'chunk',
        data: {
          content: chunk,
          fullContent: fullMessage,
          agentId: agent.id,
          agentName: agent.name
        }
      };
    }

    yield {
      type: 'complete',
      data: {
        content: cleanLaTeXFormat(fullMessage),
        agentId: agent.id,
        agentName: agent.name
      }
    };
  } catch (error) {
    console.error(`[Agent ${agentId}] Stream error:`, error);
    yield {
      type: 'error',
      data: {
        message: '抱歉，我遇到了一个错误，请稍后重试。',
        agentId: agent.id
      }
    };
  }
}

// ==========================================
// Main Entry Point
// ==========================================

/**
 * Run CSCA multi-agent conversation (simplified single-agent mode)
 */
export async function runCscaMultiAgent(
  userMessage: string,
  existingMessages: Array<{ role: string; content: string; agentId?: string }> = []
) {
  // Step 1: Select the best agent (FAST - keyword-based only)
  const selectedAgentId = selectAgent(userMessage);
  
  console.info(`[Multi-Agent] Selected agent: ${selectedAgentId} for query: "${userMessage}"`);

  // Step 2: Execute the selected agent
  const result = await executeSingleAgent(selectedAgentId, userMessage, existingMessages);

  // Return structured response
  return {
    messages: [{
      role: result.success ? 'assistant' : 'system',
      content: result.message,
      agentId: result.agentId,
    }],
    selectedAgent: getAgentById(selectedAgentId),
    agentId: selectedAgentId,
  };
}

/**
 * Run CSCA multi-agent conversation with streaming response
 */
export async function* runCscaMultiAgentStream(
  userMessage: string,
  existingMessages: Array<{ role: string; content: string; agentId?: string }> = []
) {
  // Step 1: Select the best agent (FAST - keyword-based only)
  const selectedAgentId = selectAgent(userMessage);
  
  console.info(`[Multi-Agent Stream] Selected agent: ${selectedAgentId} for query: "${userMessage}"`);

  // Step 2: Execute with streaming
  yield* executeSingleAgentStream(selectedAgentId, userMessage, existingMessages);
}
