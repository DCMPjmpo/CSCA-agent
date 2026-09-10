/**
 * Unified LLM Call Layer
 *
 * All LLM interactions should go through callLLM / streamLLM.
 */

import { generateText, streamText } from 'ai';
import type { GenerateTextResult, StreamTextResult } from 'ai';
import { createLogger } from '@/lib/logger';
import { PROVIDERS } from './providers';
import { thinkingContext } from './thinking-context';
import { getModelMetadataKey } from './model-metadata';
import type { ThinkingCapability, ThinkingConfig } from '@/lib/types/provider';
import {
  getThinkingMode,
  pickThinkingBudget,
  pickThinkingEffort,
  pickThinkingLevel,
} from '@/lib/ai/thinking-config';
const log = createLogger('LLM');

// Re-export for external use
export type { ThinkingConfig } from '@/lib/types/provider';

// Re-export the parameter types accepted by AI SDK
type GenerateTextParams = Parameters<typeof generateText>[0];
type StreamTextParams = Parameters<typeof streamText>[0];

function _extractRequestInfo(params: GenerateTextParams | StreamTextParams) {
  const tools = params.tools ? Object.keys(params.tools as Record<string, unknown>) : undefined;

  const p = params as Record<string, unknown>;
  return {
    system: p.system as string | undefined,
    prompt: p.prompt as string | undefined,
    messages: p.messages as unknown[] | undefined,
    tools,
    maxOutputTokens: p.maxOutputTokens as number | undefined,
  };
}

function getModelId(params: GenerateTextParams | StreamTextParams): string {
  const m = params.model;
  if (typeof m === 'string') return m;
  if (m && typeof m === 'object' && 'modelId' in m) return (m as { modelId: string }).modelId;
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Thinking / Reasoning Adapter
//
// Builds a lookup table from PROVIDERS at module load time, then uses it to
// map a unified ThinkingConfig into provider-specific providerOptions.
// Native providers (OpenAI/Anthropic/Google) are mapped to providerOptions.
// OpenAI-compatible providers are injected by the providers.ts fetch wrapper.
// ---------------------------------------------------------------------------

interface ModelThinkingInfo {
  thinking?: ThinkingCapability;
}

/** Provider/model → thinking capability (built once at module load) */
const MODEL_THINKING_MAP: Map<string, ModelThinkingInfo> = (() => {
  const map = new Map<string, ModelThinkingInfo>();
  for (const provider of Object.values(PROVIDERS)) {
    for (const model of provider.models) {
      map.set(getModelMetadataKey(provider.id, model.id), {
        thinking: model.capabilities?.thinking,
      });
    }
  }
  return map;
})();

/** Model ID → thinking capability for IDs that are unique across providers. */
const UNIQUE_MODEL_THINKING_MAP: Map<string, ModelThinkingInfo> = (() => {
  const counts = new Map<string, number>();
  for (const provider of Object.values(PROVIDERS)) {
    for (const model of provider.models) {
      counts.set(model.id, (counts.get(model.id) ?? 0) + 1);
    }
  }

  const map = new Map<string, ModelThinkingInfo>();
  for (const provider of Object.values(PROVIDERS)) {
    for (const model of provider.models) {
      if (counts.get(model.id) === 1) {
        map.set(model.id, {
          thinking: model.capabilities?.thinking,
        });
      }
    }
  }
  return map;
})();

/** Global thinking override from environment variable */
function getGlobalThinkingConfig(): ThinkingConfig | undefined {
  if (process.env.LLM_THINKING_DISABLED === 'true') {
    return { mode: 'disabled', enabled: false };
  }
  return undefined;
}

type ProviderOptions = Record<string, Record<string, unknown>>;

function getAnthropicEffort(
  thinking: ThinkingCapability,
  config: ThinkingConfig,
): 'low' | 'medium' | 'high' | 'xhigh' | 'max' | undefined {
  const effort = pickThinkingEffort(thinking, config);
  if (!effort || effort === 'none' || effort === 'minimal') return undefined;
  return effort;
}

function getModelProviderId(params: GenerateTextParams | StreamTextParams): string | undefined {
  const m = params.model;
  if (!m || typeof m !== 'object' || !('provider' in m)) return undefined;
  const provider = (m as { provider?: string }).provider;
  if (!provider) return undefined;
  if (provider in PROVIDERS) return provider;
  const prefix = provider.split('.')[0];
  return prefix in PROVIDERS ? prefix : undefined;
}

/**
 * Map a unified ThinkingConfig to provider-specific providerOptions.
 */
function buildThinkingProviderOptions(
  providerId: string | undefined,
  modelId: string,
  config: ThinkingConfig,
): ProviderOptions | undefined {
  const info = providerId
    ? MODEL_THINKING_MAP.get(getModelMetadataKey(providerId, modelId))
    : UNIQUE_MODEL_THINKING_MAP.get(modelId);
  if (!info?.thinking) return undefined; // model has no thinking capability
  const thinking = info.thinking;
  if (thinking.control === 'none') return undefined;

  const mode = getThinkingMode(config);

  switch (thinking.requestAdapter) {
    case 'openai': {
      const effort = pickThinkingEffort(thinking, config);
      return effort ? { openai: { reasoningEffort: effort } } : undefined;
    }

    case 'anthropic': {
      if (mode === 'disabled') return { anthropic: { thinking: { type: 'disabled' } } };

      if (thinking.control === 'toggle-budget' || thinking.control === 'budget-only') {
        const budget = pickThinkingBudget(thinking, config);
        return budget === undefined
          ? undefined
          : { anthropic: { thinking: { type: 'enabled', budgetTokens: budget } } };
      }

      const effort = getAnthropicEffort(thinking, config);
      if (!effort) return undefined;

      if (thinking.anthropicThinking?.type === 'adaptive') {
        return {
          anthropic: {
            thinking: { type: 'adaptive' },
            effort,
          },
        };
      }

      const manualEffort = effort === 'xhigh' ? 'max' : effort;
      const budget = thinking.anthropicThinking?.budgetByEffort?.[manualEffort];
      if (!budget) return undefined;
      return {
        anthropic: {
          thinking: { type: 'enabled', budgetTokens: budget },
          effort: manualEffort,
        },
      };
    }

    case 'google': {
      if (thinking.control === 'level') {
        const level = pickThinkingLevel(thinking, config);
        return level ? { google: { thinkingConfig: { thinkingLevel: level } } } : undefined;
      }

      const budget = pickThinkingBudget(thinking, config);
      if (budget === undefined) return undefined;
      return { google: { thinkingConfig: { thinkingBudget: budget } } };
    }

    default:
      // OpenAI-compatible providers are injected in providers.ts fetch wrapper.
      return undefined;
  }
}

/**
 * Inject provider-specific thinking options into LLM call params.
 *
 * For native providers (OpenAI/Anthropic/Google), this sets providerOptions.
 * For OpenAI-compatible providers, providerOptions won't work (stripped by
 * zod schema) — those are handled by the custom fetch wrapper via thinkingContext.
 *
 * Priority: caller's providerOptions > ThinkingConfig
 */
function injectProviderOptions<T extends GenerateTextParams | StreamTextParams>(
  params: T,
  thinking?: ThinkingConfig,
): T {
  if ((params as Record<string, unknown>).providerOptions) return params; // caller explicitly set providerOptions

  const modelId = getModelId(params);
  const providerId = getModelProviderId(params);

  if (thinking) {
    const opts = buildThinkingProviderOptions(providerId, modelId, thinking);
    if (opts) return { ...params, providerOptions: opts };
  }

  return params;
}

/**
 * Options for LLM call retry on validation failure.
 * This is separate from the AI SDK's built-in maxRetries (which handles network/5xx errors).
 */
export interface LLMRetryOptions {
  /** Max retry attempts when validate() fails or the response is empty (default: 0 = no retry) */
  retries?: number;
  /** Custom validation function. Return true to accept the result, false to retry.
   *  Default: checks that response text is non-empty. */
  validate?: (text: string) => boolean;
}

const DEFAULT_VALIDATE = (text: string) => text.trim().length > 0;

/**
 * Unified wrapper around `generateText`.
 *
 * @param params - Same parameters as AI SDK's `generateText`
 * @param source - A short label for log grouping (e.g. 'scene-stream', 'pbl-chat')
 * @param retryOptions - Optional retry-on-validation-failure settings
 * @param thinking - Optional per-call thinking config (overrides global LLM_THINKING_DISABLED)
 */
export async function callLLM<T extends GenerateTextParams>(
  params: T,
  source: string,
  retryOptions?: LLMRetryOptions,
  thinking?: ThinkingConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<GenerateTextResult<any, any>> {
  const maxAttempts = (retryOptions?.retries ?? 0) + 1;
  const validate = retryOptions?.validate ?? (maxAttempts > 1 ? DEFAULT_VALIDATE : undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastResult: GenerateTextResult<any, any> | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Resolve effective thinking config: per-call > global env > undefined
      const effectiveThinking = thinking ?? getGlobalThinkingConfig();
      const injectedParams = injectProviderOptions(params, effectiveThinking);

      // Wrap in thinkingContext so the custom fetch wrapper in providers.ts
      // can read the config and inject vendor-specific body params for
      // OpenAI-compatible providers.
      const result = await thinkingContext.run(effectiveThinking, () =>
        generateText(injectedParams),
      );

      // Validate result (only when retries are configured)
      if (validate && !validate(result.text)) {
        log.warn(
          `[${source}] Validation failed (attempt ${attempt}/${maxAttempts}), ${attempt < maxAttempts ? 'retrying...' : 'giving up'}`,
        );
        lastResult = result;
        continue;
      }

      return result;
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        log.warn(`[${source}] Call failed (attempt ${attempt}/${maxAttempts}), retrying...`, error);
        continue;
      }
    }
  }

  // All attempts exhausted — return last result or throw last error
  if (lastResult) return lastResult;
  throw lastError;
}

/**
 * Generate a mock stream for streaming fallback
 */
function extractPromptFromParams(params: StreamTextParams): string {
  const p = params as Record<string, unknown>;
  if (p.prompt) return String(p.prompt);
  if (p.messages && Array.isArray(p.messages)) {
    const msgs = p.messages as { role?: string; content?: string }[];
    const lastUser = msgs.filter(m => m.role === 'user').pop();
    if (lastUser?.content) return String(lastUser.content);
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg?.content) return String(lastMsg.content);
  }
  return '';
}

async function* generateMockStream(text: string) {
  const chunkSize = 4;
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
    await new Promise(resolve => setTimeout(resolve, 8));
  }
}

function createMockStreamResult(prompt: string): StreamTextResult<any, any> {
  const text = buildMockText(prompt);

  const asyncIterable = {
    [Symbol.asyncIterator]() {
      return generateMockStream(text);
    }
  };

  return {
    textStream: asyncIterable,
    get text() { return text; },
    finishReason: 'mock' as const,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    experimental_providerMetadata: {},
    response: {
      id: 'mock',
      modelId: 'mock',
      metadata: {},
    },
    toolCalls: [],
    steps: [],
  } as unknown as StreamTextResult<any, any>;
}

function buildMockText(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes('数学') || p.includes('math') || p.includes('方程') || p.includes('函数')) {
    return `📚 数学学习计划

第一阶段：基础巩固（2周）
- 复习代数基础：方程、不等式、函数
- 每天练习 20 道基础题
- 重点掌握一次函数和二次函数

第二阶段：进阶提升（3周）
- 学习三角函数、数列
- 每天练习 15 道中等难度题
- 开始接触综合应用题

第三阶段：冲刺突破（2周）
- 做历年真题和模拟题
- 错题回顾与查漏补缺
- 限时训练提高解题速度

💡 建议每天保持 1-2 小时的学习时间，循序渐进。`;
  }

  if (p.includes('英语') || p.includes('english') || p.includes('单词') || p.includes('语法')) {
    return `📚 英语学习计划

第一阶段：词汇积累（3周）
- 每天背 30 个核心单词
- 使用词根词缀记忆法
- 定期复习巩固

第二阶段：语法系统（2周）
- 系统学习英语语法体系
- 重点突破时态和从句
- 配合例句加深理解

第三阶段：听说读写（3周）
- 每天听力练习 30 分钟
- 口语对话练习
- 写作训练每周 2 篇

💡 语言学习贵在坚持，建议每天都要接触英语。`;
  }

  if (p.includes('物理') || p.includes('physics') || p.includes('力学') || p.includes('电磁')) {
    return `📚 物理学习计划

第一阶段：力学基础（2周）
- 牛顿三大定律及应用
- 运动学与动力学结合
- 功和能的概念与计算

第二阶段：电磁学进阶（2周）
- 电场与磁场基础
- 电磁感应定律
- 电路分析方法

第三阶段：综合训练（2周）
- 力学与电磁学综合题
- 历年真题分析
- 错题归纳与方法总结

💡 物理学习要注重物理图像和数学推导的结合。`;
  }

  if (p.includes('化学') || p.includes('chemistry') || p.includes('反应')) {
    return `📚 化学学习计划

第一阶段：基础理论（2周）
- 原子结构与元素周期律
- 化学键与分子结构
- 化学平衡与反应速率

第二阶段：元素化合物（2周）
- 常见元素及其化合物性质
- 有机化学基础
- 化学实验操作

第三阶段：计算与应用（2周）
- 化学计算题方法
- 工艺流程题分析
- 综合推断题训练

💡 化学学习要注重知识网络的构建和实验思维的培养。`;
  }

  if (p.includes('语文') || p.includes('chinese') || p.includes('阅读') || p.includes('作文')) {
    return `📚 语文学习计划

第一阶段：古诗文积累（2周）
- 背诵指定篇目
- 理解文言实词虚词
- 掌握文言句式

第二阶段：现代文阅读（3周）
- 记叙文阅读方法
- 议论文阅读技巧
- 文学作品鉴赏

第三阶段：写作训练（2周）
- 审题立意方法
- 结构布局技巧
- 素材积累与运用

💡 语文学习重在积累，多读多思多练。`;
  }

  return `AI 航海助手已收到您的请求，正在航行档案中检索…

当前服务繁忙，暂未能实时响应。您可以：

1. 稍后再试，专家即刻返回
2. 尝试换一种方式提问
3. 前往航行大厅咨询其他专家

📮 AI 航海助手全景大厅
全体专家随时待命`;
}

/**
 * Unified wrapper around `streamText`.
 *
 * Returns the same StreamTextResult.
 *
 * @param params - Same parameters as AI SDK's `streamText`
 * @param source - A short label for log grouping
 * @param thinking - Optional per-call thinking config (overrides global LLM_THINKING_DISABLED)
 */
export function streamLLM<T extends StreamTextParams>(
  params: T,
  source: string,
  thinking?: ThinkingConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): StreamTextResult<any, any> {
  // Resolve effective thinking config and wrap in thinkingContext
  const effectiveThinking = thinking ?? getGlobalThinkingConfig();
  const injectedParams = injectProviderOptions(params, effectiveThinking);

  try {
    const result = thinkingContext.run(effectiveThinking, () => streamText(injectedParams));
    return result;
  } catch (error) {
    log.warn(`[${source}] streamText failed, returning mock stream:`, error instanceof Error ? error.message : error);
    const prompt = extractPromptFromParams(params);
    return createMockStreamResult(prompt);
  }
}
