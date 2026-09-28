/**
 * PPT Adapter — 定制 PPT 能力适配器
 *
 * 第一阶段 Vertical Slice：把 OpenMAIC 已有的"定制 PPT"能力
 * 真正接入 PilarCore，并形成完整闭环。
 *
 * 调用链：
 *   PilarCore UI（CSCAVoyageApp / SeaChartSandbox）
 *     ↓ createPptTask()
 *     ↓ lib/openmaic/client.ts → POST /api/generate-classroom
 *     ↓ lib/openmaic/session.ts → IndexedDB 持久化
 *     ↓ 返回 PilarCoreTaskRecord
 *   PilarCore UI → router.push(`/csca/tasks/${task.taskId}`)
 *   任务状态页 → pollPptTask() → GET /api/generate-classroom/[jobId]
 *
 * 不修改 generateClassroom()，不复制 OpenMAIC generation engine。
 * PPTX 最终由客户端 lib/export/use-export-pptx.ts 使用 pptxgenjs 导出，
 * 服务端只生成 Scene 数据。
 */

import { createClassroomJob, pollClassroomJob } from '@/lib/openmaic/client';
import { createTask, syncTaskFromPollResult, updateTaskStatus } from '@/lib/openmaic/session';
import type {
  CreatePptTaskInput,
  PilarCoreTaskRecord,
} from '@/lib/openmaic/types';
import type { PollClassroomJobResult } from '@/lib/openmaic/client';

/**
 * 创建一个 PPT 生成任务。
 *
 * 流程：
 *   1. 接收用户 requirement
 *   2. 调用 createClassroomJob()（POST /api/generate-classroom）
 *   3. 获得 openmaicJobId
 *   4. 创建 PilarCore task 并持久化（IndexedDB）
 *   5. 保存 taskId ↔ openmaicJobId 映射
 *   6. 保存 returnUrl / voyageStageId
 *   7. 返回 PilarCoreTaskRecord
 *
 * @throws Error 当创建 OpenMAIC job 或写入 IndexedDB 失败时
 */
export async function createPptTask(input: CreatePptTaskInput): Promise<PilarCoreTaskRecord> {
  const {
    requirement,
    returnUrl = '/csca',
    voyageStageId,
    pdfContent,
  } = input;

  if (!requirement || !requirement.trim()) {
    throw new Error('createPptTask: requirement 不能为空');
  }

  // 1. 调用 OpenMAIC 现有 API 创建 job
  const job = await createClassroomJob({
    requirement,
    ...(pdfContent ? { pdfContent } : {}),
    // 第一阶段 PPT 默认行为：不强制开启 web search / 媒体生成 / TTS，
    // 由调用方按需扩展。这样能更快跑通 PPT vertical slice。
  });

  // 2. 创建 PilarCore 侧任务记录并持久化
  const task = await createTask({
    openmaicJobId: job.jobId,
    capability: 'ppt',
    returnUrl,
    requirement,
    ...(voyageStageId ? { voyageStageId } : {}),
    initialStatus: 'pending',
  });

  // 3. 立即同步一次 job 创建时的 step / message，便于 UI 展示初始状态
  try {
    await updateTaskStatus(task.taskId, {
      lastStep: job.step,
      lastMessage: job.message,
    });
  } catch {
    // 同步失败不影响任务创建，后续轮询会刷新
  }

  return task;
}

/**
 * 轮询 PPT 任务状态并同步到 PilarCore 任务记录。
 *
 * 调用现有 `GET /api/generate-classroom/[jobId]`，返回真实 step/progress/result/error。
 * 任务状态页基于此函数返回的真实数据展示，不使用 setTimeout 伪造进度。
 *
 * @param task PilarCore 任务记录（或 taskId）
 * @returns 轮询结果 + 更新后的任务记录
 */
export async function pollPptTask(
  task: PilarCoreTaskRecord | string,
  signal?: AbortSignal,
): Promise<{ poll: PollClassroomJobResult; task: PilarCoreTaskRecord }> {
  const taskId = typeof task === 'string' ? task : task.taskId;
  const openmaicJobId = typeof task === 'string' ? (await lookupJobIdByTaskId(task)) ?? '' : task.openmaicJobId;

  if (!openmaicJobId) {
    throw new Error('pollPptTask: 任务缺少 openmaicJobId，无法轮询');
  }

  // 1. 调用 OpenMAIC 现有 API 轮询真实状态
  const poll = await pollClassroomJob(openmaicJobId, signal);

  // 2. 同步到 PilarCore 任务记录（持久化到 IndexedDB）
  const updated = await syncTaskFromPollResult(taskId, poll);

  return { poll, task: updated };
}

/**
 * 辅助：仅知道 taskId 时反查 openmaicJobId。
 * 用于 pollPptTask 的字符串重载。
 */
async function lookupJobIdByTaskId(taskId: string): Promise<string | undefined> {
  const { getTask } = await import('@/lib/openmaic/session');
  const record = await getTask(taskId);
  return record?.openmaicJobId;
}

/**
 * 重新生成 PPT。
 *
 * 当前 OpenMAIC 未提供 retry API，因此"重新生成"实际是：
 * 基于原任务的 requirement 创建一个新的 PilarCore task + OpenMAIC job。
 * 旧任务保留在历史中，新任务独立追踪。
 *
 * @param originalTask 原任务记录
 * @returns 新创建的 PilarCoreTaskRecord
 */
export async function retryPptTask(
  originalTask: PilarCoreTaskRecord,
): Promise<PilarCoreTaskRecord> {
  return createPptTask({
    requirement: originalTask.requirement,
    returnUrl: originalTask.returnUrl,
    ...(originalTask.voyageStageId ? { voyageStageId: originalTask.voyageStageId } : {}),
  });
}
