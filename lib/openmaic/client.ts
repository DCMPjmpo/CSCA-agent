/**
 * OpenMAIC Client Adapter
 *
 * 统一封装 PilarCore → OpenMAIC 现有 HTTP API 的调用，
 * 避免 React 页面直接散落 fetch('/api/generate-classroom')。
 *
 * 严格复用现有 API contract，不修改 API route，不重写 generation engine。
 *
 * 调用链：
 *   PilarCore UI
 *     ↓ lib/openmaic/* (client + session + ppt)
 *     ↓ OpenMAIC API (/api/generate-classroom, /api/generate-classroom/[jobId])
 */

import type {
  OpenMAICJobCreateResponse,
  OpenMAICJobPollResponse,
  OpenMAICJobResult,
  OpenMAICJobStatus,
  OpenMAICJobStep,
} from '@/lib/openmaic/types';

/**
 * 创建 OpenMAIC Classroom Job 的输入参数。
 *
 * 形状与 OpenMAIC 服务端 GenerateClassroomInput 对齐，
 * 但此处只声明客户端需要的字段，避免把服务端类型泄露进客户端 bundle。
 */
export interface CreateClassroomJobInput {
  /** 用户需求文本（必填） */
  requirement: string;
  /** PDF 内容（可选）：解析后的文本 + base64 图片数组 */
  pdfContent?: { text: string; images: string[] };
  /** 是否启用 web search */
  enableWebSearch?: boolean;
  /** web search provider id */
  webSearchProviderId?: string;
  /** web search api key（不强制；为 undefined 时不写入 body） */
  webSearchApiKey?: string;
  /** 百度搜索子源配置 */
  baiduSubSources?: unknown;
  /** 是否启用图片生成 */
  enableImageGeneration?: boolean;
  /** 是否启用视频生成 */
  enableVideoGeneration?: boolean;
  /** 是否启用 TTS */
  enableTTS?: boolean;
  /** agent 模式 */
  agentMode?: 'default' | 'generate';
}

/**
 * 创建 OpenMAIC Classroom Job 的结果。
 */
export interface CreateClassroomJobResult {
  jobId: string;
  status: OpenMAICJobStatus;
  step: OpenMAICJobStep;
  message: string;
  pollUrl: string;
  pollIntervalMs: number;
}

/**
 * 轮询 OpenMAIC Classroom Job 的结果。
 */
export interface PollClassroomJobResult {
  jobId: string;
  status: OpenMAICJobStatus;
  step: OpenMAICJobStep;
  progress: number;
  message: string;
  pollUrl: string;
  pollIntervalMs: number;
  scenesGenerated: number;
  totalScenes?: number;
  result?: OpenMAICJobResult;
  error?: string;
  done: boolean;
}

/**
 * 错误响应体（来自 apiError）。
 */
interface ApiErrorBody {
  success: false;
  errorCode: string;
  error: string;
  details?: string;
}

/**
 * 将 Response 解析为强类型结果，统一处理 success=false 与网络错误。
 */
async function parseJsonResponse<T extends { success: true }>(
  res: Response,
  fallbackMessage: string,
): Promise<T> {
  let body: T | ApiErrorBody;
  try {
    body = (await res.json()) as T | ApiErrorBody;
  } catch {
    throw new Error(
      `${fallbackMessage}: 响应不是合法 JSON (HTTP ${res.status} ${res.statusText})`,
    );
  }

  if (!res.ok) {
    const errBody = body as ApiErrorBody;
    const detail = errBody?.details ? ` — ${errBody.details}` : '';
    throw new Error(
      `${fallbackMessage}: HTTP ${res.status} ${errBody?.error || res.statusText}${detail}`,
    );
  }

  if (!body || (body as ApiErrorBody).success === false) {
    const errBody = body as ApiErrorBody;
    const detail = errBody?.details ? ` — ${errBody.details}` : '';
    throw new Error(`${fallbackMessage}: ${errBody?.error || '未知错误'}${detail}`);
  }

  return body as T;
}

/**
 * 创建 OpenMAIC Classroom 生成 Job。
 *
 * 调用现有 `POST /api/generate-classroom`，返回 jobId 与轮询 URL。
 * 不修改 API route；只在其上层提供类型安全封装。
 *
 * @throws Error 当网络错误或 API 返回 success=false 时
 */
export async function createClassroomJob(
  input: CreateClassroomJobInput,
  signal?: AbortSignal,
): Promise<CreateClassroomJobResult> {
  if (!input.requirement || !input.requirement.trim()) {
    throw new Error('createClassroomJob: requirement 不能为空');
  }

  const res = await fetch('/api/generate-classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });

  const body = await parseJsonResponse<OpenMAICJobCreateResponse>(
    res,
    '创建生成任务失败',
  );

  return {
    jobId: body.jobId,
    status: body.status,
    step: body.step,
    message: body.message,
    pollUrl: body.pollUrl,
    pollIntervalMs: body.pollIntervalMs,
  };
}

/**
 * 轮询 OpenMAIC Classroom Job 状态。
 *
 * 调用现有 `GET /api/generate-classroom/[jobId]`，返回真实 step/progress/result/error。
 * 任务状态页基于此函数返回的真实数据展示，不使用 setTimeout 伪造进度。
 *
 * @param jobId OpenMAIC jobId（来自 createClassroomJob 返回值）
 * @throws Error 当网络错误或 API 返回 success=false 时
 */
export async function pollClassroomJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<PollClassroomJobResult> {
  if (!jobId) {
    throw new Error('pollClassroomJob: jobId 不能为空');
  }

  const res = await fetch(`/api/generate-classroom/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  const body = await parseJsonResponse<OpenMAICJobPollResponse>(
    res,
    '查询生成任务状态失败',
  );

  return {
    jobId: body.jobId,
    status: body.status,
    step: body.step,
    progress: body.progress,
    message: body.message,
    pollUrl: body.pollUrl,
    pollIntervalMs: body.pollIntervalMs,
    scenesGenerated: body.scenesGenerated,
    totalScenes: body.totalScenes,
    result: body.result,
    error: body.error,
    done: body.done,
  };
}
