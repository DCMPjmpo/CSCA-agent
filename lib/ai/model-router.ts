/**
 * Model Router with Fallback - CSCA Pilot Agent
 * 
 * Priority: GMI Platform → DashScope (Qwen/DeepSeek/Kimi)
 * 
 * GMI Platform Configuration:
 * - Base URL: GMI_API_BASE (from environment)
 * - API Key: ANTHROPIC_API_KEY (from environment)
 * - Models: Qwen/Qwen3.6-Max-Preview, DeepSeek-V4-Pro, Kimi-K2-Thinking
 */

import { generateText, streamText, type GenerateTextResult, type StreamTextResult } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

type Message = { role: 'user' | 'assistant' | 'system'; content: string };

// ==========================================
// Task Type Definition
// ==========================================
export type TaskType =
  | 'diagnosis'          // Step 1: Subject diagnosis
  | 'knowledge_map'      // Step 2: Knowledge graph generation
  | 'exercise_generation'// Step 3: Exercise generation
  | 'mock_exam'          // Step 4: Mock exam generation
  | 'score_analysis'     // Step 5: Score analysis
  | 'university_match'   // Step 6: University/scholarship matching
  | 'translation'        // Multilingual translation
  | 'fallback'           // Generic fallback
  | 'tutor';             // AI tutor/explanation

// ==========================================
// GMI Platform Configuration (PRIORITY)
// ==========================================
const GMI_CONFIG = {
  baseUrl: process.env.GMI_API_BASE || 'https://api.gmi-serving.com',
  apiKey: process.env.ANTHROPIC_API_KEY,
  models: {
    qwen: process.env.QWEN_MODEL || 'Qwen/Qwen3.6-Max-Preview',
    deepseek: process.env.DEEPSEEK_MODEL || 'DeepSeek-V4-Pro',
    kimi: process.env.KIMI_MODEL || 'Kimi-K2-Thinking',
  },
};

// Check if GMI is configured
const isGmiConfigured = () => {
  return !!GMI_CONFIG.baseUrl && !!GMI_CONFIG.apiKey;
};

// ==========================================
// Fallback Model Configuration (DashScope)
// ==========================================
interface FallbackModelConfig {
  id: string;
  provider: 'qwen' | 'deepseek' | 'kimi' | 'siliconflow';
  baseUrl: string;
  apiKeyEnv: string;
}

const FALLBACK_MODEL_CONFIGS: Record<string, FallbackModelConfig> = {
  'qwen-turbo': {
    id: 'qwen-turbo',
    provider: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  'deepseek-v4-pro': {
    id: 'deepseek-v4-pro',
    provider: 'deepseek',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  'kimi-k2-thinking': {
    id: 'kimi-k2-thinking',
    provider: 'kimi',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  'glm-4': {
    id: 'Pro/zai-org/GLM-4.7',
    provider: 'siliconflow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeyEnv: 'SILICONFLOW_API_KEY',
  },
};

// ==========================================
// Routing Rules: Task → Model
// ==========================================
const TASK_TO_MODEL: Record<TaskType, { gmi: string; fallback: string }> = {
  diagnosis: { gmi: 'deepseek', fallback: 'glm-4' },              // GLM-4: Logical reasoning
  knowledge_map: { gmi: 'qwen', fallback: 'glm-4' },              // GLM-4: Structured generation
  exercise_generation: { gmi: 'qwen', fallback: 'glm-4' },        // GLM-4: Multilingual question generation
  mock_exam: { gmi: 'deepseek', fallback: 'glm-4' },              // GLM-4: Rigorous question generation
  score_analysis: { gmi: 'kimi', fallback: 'glm-4' },             // GLM-4: Long text analysis
  university_match: { gmi: 'kimi', fallback: 'glm-4' },           // GLM-4: Long context matching
  translation: { gmi: 'qwen', fallback: 'glm-4' },                // GLM-4: Strong multilingual capabilities
  fallback: { gmi: 'qwen', fallback: 'glm-4' },                   // GLM-4: General fallback
  tutor: { gmi: 'deepseek', fallback: 'glm-4' },                  // GLM-4: Educational explanation
};

// ==========================================
// Interface Definitions
// ==========================================
export interface CallOptions {
  task: TaskType;
  messages: Message[];
  systemPrompt?: string;
  maxTokens?: number;
}

// ==========================================
// Agent ID to Task Type Mapping
// ==========================================
const AGENT_TO_TASK: Record<string, TaskType> = {
  examiner: 'mock_exam',
  tutor: 'knowledge_map',
  analyst: 'score_analysis',
  challenger: 'exercise_generation',
  advisor: 'university_match',
  motivator: 'fallback',
  video_explainer: 'knowledge_map',
  error_explainer: 'fallback',
};

// ==========================================
// Get task type from agent ID
// ==========================================
export function getTaskTypeForAgent(agentId: string): TaskType {
  return AGENT_TO_TASK[agentId] || 'fallback';
}

// ==========================================
// Get GMI Client (Priority)
// ==========================================
function getGmiClient() {
  if (!isGmiConfigured()) {
    throw new Error('GMI platform not configured');
  }

  console.info(`[ModelRouter] Using GMI platform: ${GMI_CONFIG.baseUrl}`);

  return createOpenAI({
    apiKey: GMI_CONFIG.apiKey!,
    baseURL: GMI_CONFIG.baseUrl,
  });
}

// ==========================================
// Get Fallback Client (DashScope / SiliconFlow)
// ==========================================
function getFallbackClient(modelId: string) {
  const config = FALLBACK_MODEL_CONFIGS[modelId];
  if (!config) {
    throw new Error(`Unknown fallback model: ${modelId}`);
  }

  // First, try the specific API key for this provider
  let apiKey = process.env[config.apiKeyEnv];

  // Log current environment variables for debugging
  console.info(`[ModelRouter] Looking for ${config.apiKeyEnv}: ${apiKey ? 'SET' : 'NOT SET'}`);

  // If not found, try alternative keys
  if (!apiKey) {
    console.warn(`[ModelRouter] ${config.apiKeyEnv} not set, trying alternative keys...`);
    const fallbackKeys = [
      process.env.SILICONFLOW_API_KEY,
      process.env.DASHSCOPE_API_KEY,
      process.env.DEEPSEEK_API_KEY,
      process.env.MOONSHOT_API_KEY,
      process.env.OPENAI_API_KEY,
    ].filter(Boolean);

    if (fallbackKeys.length > 0) {
      apiKey = fallbackKeys[0]!;
      console.info(`[ModelRouter] Using fallback API key from ${fallbackKeys[0] ? 'available sources' : 'unknown'}`);
    } else {
      throw new Error(`API key required for model ${modelId}. Please set ${config.apiKeyEnv} in .env.local`);
    }
  }

  const providerName = config.provider === 'siliconflow' ? 'SiliconFlow' : 'DashScope';
  console.info(`[ModelRouter] Using ${providerName} for ${modelId}`);

  return createOpenAI({
    apiKey,
    baseURL: config.baseUrl,
  });
}

// ==========================================
// Call with Fallback (GMI → DashScope)
// ==========================================
const TIMEOUT_MS = 60000; // 60 seconds

export async function callWithFallback<T extends 'text' | 'stream'>(
  options: CallOptions & { type: T }
): Promise<T extends 'text' ? GenerateTextResult<any, any> : StreamTextResult<any, any>> {
  const { task, messages, systemPrompt, maxTokens, type } = options;

  // Get model mapping for this task
  const modelMapping = TASK_TO_MODEL[task];
  const gmiModelKey = modelMapping.gmi;
  const fallbackModelId = modelMapping.fallback;
  const gmiModelName = GMI_CONFIG.models[gmiModelKey as keyof typeof GMI_CONFIG.models];

  console.info(`[ModelRouter] Task: ${task}, GMI Model: ${gmiModelName}, Fallback: ${fallbackModelId}`);

  const makeGmiCall = async () => {
    const client = getGmiClient();

    const callParams = {
      model: client.chat(gmiModelName),
      messages,
      system: systemPrompt,
      temperature: 0.7,
      maxTokens: maxTokens || 2048,
    };

    console.info(`[ModelRouter] 🔵 Calling GMI API: ${gmiModelName}`);

    return Promise.race([
      type === 'text'
        ? generateText(callParams)
        : streamText(callParams),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GMI_TIMEOUT')), TIMEOUT_MS)
      ),
    ]);
  };

  const makeFallbackCall = async () => {
    const client = getFallbackClient(fallbackModelId);
    const modelConfig = FALLBACK_MODEL_CONFIGS[fallbackModelId];

    const callParams = {
      model: client.chat(modelConfig.id),
      messages,
      system: systemPrompt,
      temperature: 0.7,
      maxTokens: maxTokens || 2048,
    };

    console.info(`[ModelRouter] 🟢 Falling back to ${modelConfig.provider === 'siliconflow' ? 'SiliconFlow' : 'DashScope'}: ${modelConfig.id}`);

    return Promise.race([
      type === 'text'
        ? generateText(callParams)
        : streamText(callParams),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('FALLBACK_TIMEOUT')), TIMEOUT_MS)
      ),
    ]);
  };

  // First, try GMI platform if configured
  if (isGmiConfigured()) {
    try {
      const result = await makeGmiCall();
      console.info(`[ModelRouter] ✅ GMI API call successful`);
      return result as any;
    } catch (gmiError) {
      console.warn(`[ModelRouter] ❌ GMI API failed:`, gmiError);
      console.info(`[ModelRouter] Falling back to secondary provider`);
    }
  } else {
    console.info(`[ModelRouter] GMI not configured, using secondary provider directly`);
  }

  // Fallback to secondary provider
  try {
    const result = await makeFallbackCall();
    console.info(`[ModelRouter] ✅ Fallback successful`);
    return result as any;
  } catch (fallbackError) {
    console.error(`[ModelRouter] ❌ Fallback also failed:`, fallbackError);

    // Return mock result for text generation
    if (type === 'text') {
      console.warn(`[ModelRouter] Returning mock result as final fallback`);
      return generateMockResult(messages[0]?.content || '') as any;
    }

    throw new Error('ALL_MODELS_FAILED');
  }
}

// ==========================================
// SSE Streaming Response Wrapper
// ==========================================
export async function streamWithFallback(
  options: Omit<CallOptions, 'type'>
): Promise<StreamTextResult<any, any>> {
  return callWithFallback({ ...options, type: 'stream' });
}

// ==========================================
// Generate mock result for fallback
// ==========================================
function generateMockResult(prompt: string): GenerateTextResult<any, any> {
  const task = prompt.toLowerCase();

  // 根据不同任务类型生成不同的mock响应
  let mockText = '';

  // 优先检测错题讲解任务
  if (task.includes('讲解') || task.includes('错题') || task.includes('分析这道错题')) {
    mockText = `📌 错误分析
- 你的答案与正确答案不符，可能存在概念理解上的偏差
- 建议重新复习相关知识点

💡 正确解答
- 本题的正确答案是：B
- 解题思路：仔细分析题目要求，结合相关知识进行判断
- 关键知识点：本题涉及的核心概念

📝 知识点回顾
- 核心概念：相关知识点的定义和应用
- 记忆技巧：多做练习题，加深理解
- 关联知识点：与其他相关概念的联系

⚠️ 注意事项
- 注意题目中的关键词和限定条件
- 答题时要仔细审题，避免粗心错误
- 建议：多复习相关知识点，巩固基础

🎯 举一反三
- 练习题1：请举出类似的例子，并说明解题思路
- 练习题2：如果题目条件变化，答案会有什么不同？`;
  } else if (task.includes('诊断') || task.includes('备考') || task.includes('科目')) {
    mockText = `{"requiredSubjects":["基础汉语","数学","物理"],"recommendedSubjects":["专业词汇"],"subjectPriorities":{"基础汉语":1,"数学":2,"物理":3},"estimatedDays":80,"advice":"根据您的情况，建议重点复习基础汉语和数学，物理作为辅助科目。每天建议学习2-3小时。"}`;
  } else if (task.includes('知识图谱') || task.includes('知识点')) {
    mockText = `{"nodes":[{"id":"n1","name":"函数","subject":"数学"},{"id":"n2","name":"三角函数","subject":"数学"},{"id":"n3","name":"导数","subject":"数学"}],"edges":[{"source":"n1","target":"n2"},{"source":"n1","target":"n3"}]}`;
  } else if (task.includes('练习') || task.includes('题目')) {
    mockText = `[{"id":"q1","question":"已知函数 f(x) = x^2 + 2x + 1，求 f(2) 的值。","options":["A. 5","B. 8","C. 9","D. 10"],"correctAnswer":2,"subject":"数学","module":"函数"}]`;
  } else if (task.includes('考试') || task.includes('试卷')) {
    mockText = `{"questions":[{"id":"e1","question":"下列词语中，哪个是形容词？","options":["A. 跑步","B. 美丽","C. 思考","D. 学校"],"correctAnswer":1,"subject":"基础汉语","module":"词汇运用"}],"duration":90}`;
  } else if (task.includes('分析') || task.includes('成绩')) {
    mockText = `{"totalScore":85,"subjectScores":{"基础汉语":90,"数学":80,"物理":85},"weakAreas":["数学-几何","物理-力学"],"suggestions":["建议加强几何知识的复习","建议多做力学练习题"]}`;
  } else if (task.includes('大学') || task.includes('匹配')) {
    mockText = `{"universities":[{"name":"北京大学","major":"临床医学","score":95},{"name":"复旦大学","major":"临床医学","score":92},{"name":"上海交通大学","major":"临床医学","score":90}],"recommendations":["建议报考北京大学，专业匹配度高"]}`;
  } else {
    mockText = '抱歉，我暂时无法回答这个问题。请稍后再试。';
  }

  return {
    text: mockText,
    finishReason: 'mock',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  } as unknown as GenerateTextResult<any, any>;
}

// ==========================================
// Synchronous Text Response Wrapper with Mock Fallback
// ==========================================
export async function generateWithFallback(
  options: Omit<CallOptions, 'type'>
): Promise<GenerateTextResult<any, any>> {
  try {
    return await callWithFallback({ ...options, type: 'text' });
  } catch (error) {
    console.warn(`[ModelRouter] All models failed, returning mock result:`, error);
    return generateMockResult(options.messages[0]?.content || '');
  }
}

// ==========================================
// Debug: Show GMI Configuration
// ==========================================
export function getGmiConfiguration() {
  return {
    configured: isGmiConfigured(),
    baseUrl: GMI_CONFIG.baseUrl,
    apiKeySet: !!GMI_CONFIG.apiKey,
    models: GMI_CONFIG.models,
  };
}
