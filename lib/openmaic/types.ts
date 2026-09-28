/**
 * PilarCore × OpenMAIC Capability Layer — Type Definitions
 *
 * PilarCoreTask 是 PilarCore 侧的任务抽象，与 OpenMAIC 的 jobId 形成 1:1 映射。
 * 任务状态基于 OpenMAIC Job 真实状态派生，禁止伪造进度。
 */

/**
 * PilarCore 暴露的 OpenMAIC 能力类型。
 * - 'ppt':  Custom PPT / Classroom generation (P2 vertical slice)
 * - 'html': Interactive HTML learning page (P3.1 vertical slice)
 *
 * 其余能力（quiz / pbl / video 等）暂未通过 PilarCore Task Bridge 暴露，
 * 不要在此处添加未实现的能力类型。
 */
export type Capability = 'ppt' | 'html';

/**
 * PilarCore 任务状态。
 * 与 OpenMAIC ClassroomGenerationJobStatus 对齐，避免映射层引入伪造状态。
 *   - pending   → OpenMAIC 'queued'
 *   - running   → OpenMAIC 'running'
 *   - succeeded → OpenMAIC 'succeeded'
 *   - failed    → OpenMAIC 'failed'
 *
 * 'cancelled' 为预留状态：当前 OpenMAIC 未暴露取消 API，
 * 在未实现真实取消前，session 层不得主动写入该状态。
 */
export type TaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

/**
 * OpenMAIC Job 真实生成步骤（来自 ClassroomGenerationStep）。
 * 任务状态页根据此字段映射展示文案，不使用 setTimeout 伪造进度。
 */
export type OpenMAICJobStep =
  | 'initializing'
  | 'researching'
  | 'generating_outlines'
  | 'generating_scenes'
  | 'generating_media'
  | 'generating_tts'
  | 'persisting'
  | 'completed'
  | 'queued'
  | 'failed';

/**
 * OpenMAIC Job 状态（来自 ClassroomGenerationJobStatus）。
 */
export type OpenMAICJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/**
 * OpenMAIC Job 结果（来自 ClassroomGenerationJob.result）。
 */
export interface OpenMAICJobResult {
  classroomId: string;
  url: string;
  scenesCount: number;
}

/**
 * OpenMAIC Job 轮询响应 — GET /api/generate-classroom/[jobId] 返回体。
 * 用于类型安全地消费现有 API contract。
 */
export interface OpenMAICJobPollResponse {
  success: true;
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
 * OpenMAIC Job 创建响应 — POST /api/generate-classroom 返回体。
 */
export interface OpenMAICJobCreateResponse {
  success: true;
  jobId: string;
  status: OpenMAICJobStatus;
  step: OpenMAICJobStep;
  message: string;
  pollUrl: string;
  pollIntervalMs: number;
}

/**
 * PilarCore 侧任务记录（IndexedDB pilarCoreTasks 表的形状）。
 *
 * 持久化在 IndexedDB（MAIC-Database v11+）以支持：
 *   - 浏览器刷新恢复
 *   - 关闭标签页后恢复
 *   - 重新打开网站后找回历史任务
 */
export interface PilarCoreTaskRecord {
  /** PilarCore 侧任务 ID（nanoid） */
  taskId: string;
  /** OpenMAIC 侧 jobId（来自 POST /api/generate-classroom） */
  openmaicJobId: string;
  /** 生成完成后的课堂 ID（OpenMAIC result.classroomId） */
  classroomId?: string;
  /** 能力类型：第一阶段固定 'ppt' */
  capability: Capability;
  /** 任务状态：派生自 OpenMAIC job status */
  status: TaskStatus;
  /** 返回 PilarCore 时的目标 URL（如 /csca#study-plan） */
  returnUrl: string;
  /** 关联的航程阶段 ID（可选） */
  voyageStageId?: string;
  /** 用户原始 requirement 文本 */
  requirement: string;
  /** 任务创建时间（ISO） */
  createdAt: string;
  /** 任务最后更新时间（ISO） */
  updatedAt: string;
  /** 生成结果（仅 status=succeeded 时存在） */
  result?: OpenMAICJobResult;
  /** 失败原因（仅 status=failed 时存在） */
  error?: string;
  /** 最近一次轮询到的 OpenMAIC step（用于状态页展示） */
  lastStep?: OpenMAICJobStep;
  /** 最近一次轮询到的 progress（0-100） */
  lastProgress?: number;
  /** 最近一次轮询到的 message */
  lastMessage?: string;
  /** 最近一次轮询到的 scenesGenerated */
  scenesGenerated?: number;
  /** 最近一次轮询到的 totalScenes */
  totalScenes?: number;
}

/**
 * 创建 PPT 任务的输入参数。
 */
export interface CreatePptTaskInput {
  /** 用户输入的需求文本（必填） */
  requirement: string;
  /** 返回 PilarCore 时的目标 URL，默认 '/csca' */
  returnUrl?: string;
  /** 关联的航程阶段 ID */
  voyageStageId?: string;
  /** PDF 内容（可选，文本+图片 base64 数组） */
  pdfContent?: { text: string; images: string[] };
}

/**
 * 创建 Interactive HTML 任务的输入参数。
 *
 * 与 CreatePptTaskInput 形状一致；区别在于：
 *   - capability = 'html'
 *   - 内部通过 requirement steering 包装主题，引导 OpenMAIC 优先生成
 *     InteractiveContent scene，但不强制（engine 不修改）。
 *   - 成功判据不仅是 job succeeded，还要 classroom 中至少存在一个
 *     scene.content.type === 'interactive'。
 */
export interface CreateHtmlTaskInput {
  /** 用户输入的需求文本（必填，将作为生成主题） */
  requirement: string;
  /** 返回 PilarCore 时的目标 URL，默认 '/csca' */
  returnUrl?: string;
  /** 关联的航程阶段 ID */
  voyageStageId?: string;
}
