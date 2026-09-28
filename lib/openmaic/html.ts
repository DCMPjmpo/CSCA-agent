/**
 * Interactive HTML Adapter — P3.1 Vertical Slice
 *
 * 把 OpenMAIC 已有的 InteractiveContent scene 生成能力以独立 capability
 * 暴露给 PilarCore UI，复用现有 generate-classroom pipeline 与 Task Bridge。
 *
 * 调用链（与 ppt.ts 对称）：
 *   PilarCore UI（/csca "Interactive Lesson" 入口）
 *     ↓ createHtmlTask()
 *     ↓ lib/openmaic/client.ts → POST /api/generate-classroom
 *     ↓ lib/openmaic/session.ts → IndexedDB pilarCoreTasks
 *     ↓ 返回 PilarCoreTaskRecord
 *   PilarCore UI → router.push(`/csca/tasks/${task.taskId}`)
 *   任务状态页 → pollHtmlTask() → GET /api/generate-classroom/[jobId]
 *
 * 不修改 generateClassroom() engine；不新增 forceOutlineType 参数。
 * 通过 requirement steering 引导 LLM 优先生成 interactive scene。
 *
 * 成功判据：
 *   1. OpenMAIC job status === 'succeeded'
 *   2. classroom 中至少存在一个 scene.content.type === 'interactive'
 * 第 2 项由任务工作台在打开 classroom 时校验，本 adapter 只负责
 * 创建与轮询；adapter 不在轮询过程中预读 classroom 内容（避免引入
 * 第二套 classroom fetch 路径）。
 */

import { createClassroomJob, pollClassroomJob } from '@/lib/openmaic/client';
import { createTask, syncTaskFromPollResult, updateTaskStatus } from '@/lib/openmaic/session';
import type { CreateHtmlTaskInput, PilarCoreTaskRecord } from '@/lib/openmaic/types';
import type { PollClassroomJobResult } from '@/lib/openmaic/client';

/**
 * 把用户的 requirement 包装成引导 LLM 生成 interactive scene 的完整需求。
 *
 * 不修改 engine；只是把用户简短主题扩展为 OpenMAIC generation pipeline
 * 能识别的 requirement 文本。如果 LLM 仍不生成 interactive scene，
 * 任务工作台会展示"未生成交互式场景，请重新生成"提示。
 */
function buildSteeredRequirement(userRequirement: string): string {
  return `请围绕以下主题生成一个交互式学习页面：

${userRequirement}

本次产物类型要求：
- 以 Interactive HTML 学习内容为主要产物
- 优先设计 interactive scene（type: 'interactive'）
- 内容应具有真实的学习交互价值
- 可以包含知识讲解、操作探索、即时反馈、练习等
- 不要把普通 PPT slide 作为主要产物
- 如果主题不适合某种交互形式，应选择合理的交互学习形式`;
}

/**
 * 创建一个 Interactive HTML 生成任务。
 *
 * 流程：
 *   1. 包装 requirement（steering，不修改 engine）
 *   2. 调用 createClassroomJob()（POST /api/generate-classroom）
 *   3. 获得 openmaicJobId
 *   4. 创建 PilarCore task 并持久化（IndexedDB），capability = 'html'
 *   5. 保存 taskId ↔ openmaicJobId 映射
 *   6. 返回 PilarCoreTaskRecord
 *
 * @throws Error 当创建 OpenMAIC job 或写入 IndexedDB 失败时
 */
export async function createHtmlTask(input: CreateHtmlTaskInput): Promise<PilarCoreTaskRecord> {
  const { requirement, returnUrl = '/csca', voyageStageId } = input;

  if (!requirement || !requirement.trim()) {
    throw new Error('createHtmlTask: requirement 不能为空');
  }

  // 1. Requirement steering — 引导 LLM 优先生成 interactive scene
  const steeredRequirement = buildSteeredRequirement(requirement.trim());

  // 2. 调用 OpenMAIC 现有 API 创建 job（与 createPptTask 走同一 API）
  const job = await createClassroomJob({
    requirement: steeredRequirement,
    // P3.1 第一版：不强制开启 web search / 媒体生成 / TTS，
    // 与 createPptTask 一致，先跑通 vertical slice。
  });

  // 3. 创建 PilarCore 侧任务记录并持久化
  const task = await createTask({
    openmaicJobId: job.jobId,
    capability: 'html',
    returnUrl,
    requirement: requirement.trim(), // 原始用户需求，不写入 steered 版本
    ...(voyageStageId ? { voyageStageId } : {}),
    initialStatus: 'pending',
  });

  // 4. 立即同步一次 job 创建时的 step / message，便于 UI 展示初始状态
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
 * 轮询 Interactive HTML 任务状态并同步到 PilarCore 任务记录。
 *
 * 与 pollPptTask 行为完全一致；区别仅在于调用方知道 capability='html'。
 * 任务状态页基于此函数返回的真实数据展示，不使用 setTimeout 伪造进度。
 *
 * @param task PilarCore 任务记录（或 taskId）
 * @returns 轮询结果 + 更新后的任务记录
 */
export async function pollHtmlTask(
  task: PilarCoreTaskRecord | string,
  signal?: AbortSignal,
): Promise<{ poll: PollClassroomJobResult; task: PilarCoreTaskRecord }> {
  const taskId = typeof task === 'string' ? task : task.taskId;
  const openmaicJobId =
    typeof task === 'string'
      ? (await lookupJobIdByTaskId(task)) ?? ''
      : task.openmaicJobId;

  if (!openmaicJobId) {
    throw new Error('pollHtmlTask: 任务缺少 openmaicJobId，无法轮询');
  }

  // 1. 调用 OpenMAIC 现有 API 轮询真实状态
  const poll = await pollClassroomJob(openmaicJobId, signal);

  // 2. 同步到 PilarCore 任务记录（持久化到 IndexedDB）
  const updated = await syncTaskFromPollResult(taskId, poll);

  return { poll, task: updated };
}

/**
 * 重新生成 Interactive HTML。
 *
 * 当前 OpenMAIC 未提供 retry API，因此"重新生成"实际是：
 * 基于原任务的 requirement 创建一个新的 PilarCore task + OpenMAIC job。
 * 旧任务保留在历史中，新任务独立追踪。
 *
 * @param originalTask 原任务记录
 * @returns 新创建的 PilarCoreTaskRecord
 */
export async function retryHtmlTask(
  originalTask: PilarCoreTaskRecord,
): Promise<PilarCoreTaskRecord> {
  return createHtmlTask({
    requirement: originalTask.requirement,
    returnUrl: originalTask.returnUrl,
    ...(originalTask.voyageStageId ? { voyageStageId: originalTask.voyageStageId } : {}),
  });
}

/**
 * 辅助：仅知道 taskId 时反查 openmaicJobId。
 * 用于 pollHtmlTask 的字符串重载。
 */
async function lookupJobIdByTaskId(taskId: string): Promise<string | undefined> {
  const { getTask } = await import('@/lib/openmaic/session');
  const record = await getTask(taskId);
  return record?.openmaicJobId;
}
