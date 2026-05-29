/**
 * GMI Cloud Provider - CSCA Pilot Agent
 * 
 * GMI Cloud Inference Engine integration for OpenMAIC
 * Supports three models for different task types:
 * - DeepSeek V3: Logical reasoning (math/physics/chemistry)
 * - Qwen3-32B: Multilingual content generation & translation
 * - Kimi-K2: Long context analysis (200K+ tokens)
 */

import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';
import { generateText, streamText, type GenerateTextResult, type StreamTextResult } from 'ai';

// Create GMI Cloud OpenAI-compatible client
export const gmiCloud = createOpenAI({
  apiKey: process.env.GMI_API_KEY,
  baseURL: process.env.GMI_BASE_URL || 'https://api.gmi-serving.com/v1',
});

// ==========================================
// Three Model Definitions
// ==========================================

/** DeepSeek V3 — 数学/物理/化学推理（逻辑严谨） */
export const gmiDeepSeek = gmiCloud(
  process.env.GMI_MODEL_DEEPSEEK || 'deepseek-ai/DeepSeek-V3'
);

/** Qwen3-32B — 多语言内容生成与翻译（响应快、多语言强） */
export const gmiQwen = gmiCloud(
  process.env.GMI_MODEL_QWEN || 'qwen/qwen3-32b'
);

/** Kimi-K2 — 长文本成绩分析与申请策略（200K+ 上下文） */
export const gmiKimi = gmiCloud(
  process.env.GMI_MODEL_KIMI || 'moonshotai/Kimi-K2'
);

// Export model map for router layer
export const GMI_MODELS = {
  deepseek: gmiDeepSeek,
  qwen: gmiQwen,
  kimi: gmiKimi,
} as const;

export type GmiModelKey = keyof typeof GMI_MODELS;

// ==========================================
// Model Parameters Configuration
// ==========================================

export interface ModelParams {
  temperature: number;
  maxTokens: number;
  thinking: boolean;
}

export const MODEL_PARAMS: Record<GmiModelKey, ModelParams> = {
  deepseek: {
    temperature: 0.3,
    maxTokens: 2048,
    thinking: true,
  },
  qwen: {
    temperature: 0.5,
    maxTokens: 1024,
    thinking: true,
  },
  kimi: {
    temperature: 0.5,
    maxTokens: 4096,
    thinking: false,
  },
};

// ==========================================
// Helper Functions
// ==========================================

export function getModelParams(modelKey: GmiModelKey): ModelParams {
  return MODEL_PARAMS[modelKey];
}

export function getModel(modelKey: GmiModelKey) {
  return GMI_MODELS[modelKey];
}

// Check if GMI Cloud is configured
export function isGmiConfigured(): boolean {
  return !!process.env.GMI_API_KEY;
}
