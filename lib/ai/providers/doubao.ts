/**
 * Doubao (Baichuan) Provider
 * Supports DeepSeek, Qwen, Kimi models through Doubao API
 */

import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';

// Create Doubao OpenAI-compatible client
export const doubao = createOpenAI({
  apiKey: process.env.DOUBAO_API_KEY,
  baseURL: process.env.DOUBAO_BASE_URL || 'https://open.doubao.com/api/chat/v1',
});

// Model definitions
export type DoubaoModelKey = 'deepseek' | 'qwen' | 'kimi' | 'doubao';

export const DOBAO_MODELS: Record<DoubaoModelKey, string> = {
  deepseek: 'deepseek-chat',
  qwen: 'qwen-max',
  kimi: 'kimi-chat',
  doubao: 'Doubao',
};

// Model parameters
export interface ModelParams {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export function getModelParams(modelKey: DoubaoModelKey): ModelParams {
  const params: Record<DoubaoModelKey, ModelParams> = {
    deepseek: { temperature: 0.7, maxTokens: 4096, topP: 0.9 },
    qwen: { temperature: 0.8, maxTokens: 8192, topP: 0.8 },
    kimi: { temperature: 0.6, maxTokens: 16384, topP: 0.85 },
    doubao: { temperature: 0.7, maxTokens: 4096, topP: 0.9 },
  };
  return params[modelKey];
}

// Check if Doubao is configured
export function isDoubaoConfigured(): boolean {
  return !!process.env.DOUBAO_API_KEY;
}
