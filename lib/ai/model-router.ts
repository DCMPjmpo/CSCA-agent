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
  baseUrl: process.env.GMI_API_BASE || 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  models: {
    qwen: process.env.QWEN_MODEL || 'deepseek-v4-pro',
    deepseek: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
    kimi: process.env.KIMI_MODEL || 'deepseek-v4-pro',
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
  'deepseek-chat': {
    id: 'deepseek-chat',
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
  },
};

// ==========================================
// Routing Rules: Task → Model
// ==========================================
const TASK_TO_MODEL: Record<TaskType, { gmi: string; fallback: string }> = {
  diagnosis: { gmi: 'deepseek', fallback: 'deepseek-chat' },
  knowledge_map: { gmi: 'qwen', fallback: 'deepseek-chat' },
  exercise_generation: { gmi: 'qwen', fallback: 'deepseek-chat' },
  mock_exam: { gmi: 'deepseek', fallback: 'deepseek-chat' },
  score_analysis: { gmi: 'kimi', fallback: 'deepseek-chat' },
  university_match: { gmi: 'kimi', fallback: 'deepseek-chat' },
  translation: { gmi: 'qwen', fallback: 'deepseek-chat' },
  fallback: { gmi: 'qwen', fallback: 'deepseek-chat' },
  tutor: { gmi: 'deepseek', fallback: 'deepseek-chat' },
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

    // P3.1-R: 不再用 mock 文案冒充成功。所有模型失败时向上抛出真实错误，
    // 由调用方转换为明确的失败状态（UI 显示失败 + 提供重试）。
    // 之前的实现会返回一段写死的"AI 服务暂时不可用"文案，且调用方无法区分
    // 它与真实回答，属于 fake success。
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
// Synchronous Text Response Wrapper
// ==========================================
/**
 * P3.1-R: 完全失败时抛错，不再返回 mock 文案。
 * 所有调用方（ask-tutor / score-analysis / diagnosis / error-analysis /
 * multi-agent / csca-workflow）都有自己的 try/catch，会转换为明确的失败
 * 状态而不是把写死的文案当成 AI 回答展示给用户。
 */
export async function generateWithFallback(
  options: Omit<CallOptions, 'type'>
): Promise<GenerateTextResult<any, any>> {
  return callWithFallback({ ...options, type: 'text' });
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
