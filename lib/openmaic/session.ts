/**
 * PilarCore Task Session Layer
 *
 * 负责 PilarCore 侧 Task 生命周期管理与持久化。
 * 所有任务记录持久化在 IndexedDB（MAIC-Database v11 pilarCoreTasks 表），
 * 不依赖 sessionStorage 或 browser history。
 *
 * 支持：
 *   - 浏览器刷新后恢复（IndexedDB 持久）
 *   - 关闭标签页后恢复
 *   - 重新打开网站后找回历史任务
 *
 * 不创建第二套 OpenMAIC Job 系统：状态由 OpenMAIC job 真实轮询结果派生。
 */

import { nanoid } from 'nanoid';
import { db } from '@/lib/utils/database';
import type {
  Capability,
  OpenMAICJobResult,
  OpenMAICJobStep,
  PilarCoreTaskRecord,
  TaskStatus,
} from '@/lib/openmaic/types';
import type { PollClassroomJobResult } from '@/lib/openmaic/client';

/** Session 层错误基类 */
export class PilarCoreTaskError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_FOUND'
      | 'STORAGE_UNAVAILABLE'
      | 'INVALID_INPUT'
      | 'PERSIST_ERROR',
  ) {
    super(message);
    this.name = 'PilarCoreTaskError';
  }
}

/**
 * 创建 PilarCore 任务的输入参数。
 */
export interface CreateTaskInput {
  /** OpenMAIC jobId（必填，来自 createClassroomJob） */
  openmaicJobId: string;
  /** 能力类型 */
  capability: Capability;
  /** 返回 PilarCore 时的目标 URL */
  returnUrl: string;
  /** 用户原始需求文本 */
  requirement: string;
  /** 关联航程阶段 ID（可选） */
  voyageStageId?: string;
  /** 初始状态，默认 'pending' */
  initialStatus?: TaskStatus;
}

/**
 * 任务状态更新补丁。
 * 仅允许更新可变字段；taskId / openmaicJobId / capability / createdAt 不可改。
 */
export interface TaskStatusPatch {
  status?: TaskStatus;
  classroomId?: string;
  result?: OpenMAICJobResult;
  error?: string;
  lastStep?: OpenMAICJobStep;
  lastProgress?: number;
  lastMessage?: string;
  scenesGenerated?: number;
  totalScenes?: number;
  updatedAt?: string;
}

/**
 * 守卫：确认当前在浏览器环境且 IndexedDB 可用。
 * Dexie 在非浏览器环境会延迟打开，但任何实际 IO 会失败。
 */
function assertBrowserStorage(): void {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    throw new PilarCoreTaskError(
      'PilarCore task persistence 仅在浏览器环境可用',
      'STORAGE_UNAVAILABLE',
    );
  }
}

/**
 * 创建一个新的 PilarCore 任务记录并持久化到 IndexedDB。
 *
 * @returns 完整的 PilarCoreTaskRecord（含自动生成的 taskId）
 */
export async function createTask(input: CreateTaskInput): Promise<PilarCoreTaskRecord> {
  assertBrowserStorage();

  if (!input.openmaicJobId) {
    throw new PilarCoreTaskError('createTask: openmaicJobId 不能为空', 'INVALID_INPUT');
  }
  if (!input.requirement || !input.requirement.trim()) {
    throw new PilarCoreTaskError('createTask: requirement 不能为空', 'INVALID_INPUT');
  }
  if (!input.returnUrl) {
    throw new PilarCoreTaskError('createTask: returnUrl 不能为空', 'INVALID_INPUT');
  }

  const now = new Date().toISOString();
  const taskId = `pilarcore-task-${nanoid(12)}`;
  const record: PilarCoreTaskRecord = {
    taskId,
    openmaicJobId: input.openmaicJobId,
    capability: input.capability,
    status: input.initialStatus ?? 'pending',
    returnUrl: input.returnUrl,
    requirement: input.requirement,
    createdAt: now,
    updatedAt: now,
    ...(input.voyageStageId ? { voyageStageId: input.voyageStageId } : {}),
  };

  try {
    await db.pilarCoreTasks.put(record);
  } catch (err) {
    throw new PilarCoreTaskError(
      `createTask: 写入 IndexedDB 失败 — ${err instanceof Error ? err.message : String(err)}`,
      'PERSIST_ERROR',
    );
  }

  return record;
}

/**
 * 根据 taskId 读取单个任务。
 * 不存在时返回 null（不抛错，便于调用方优雅降级）。
 */
export async function getTask(taskId: string): Promise<PilarCoreTaskRecord | null> {
  assertBrowserStorage();
  if (!taskId) return null;
  try {
    return (await db.pilarCoreTasks.get(taskId)) ?? null;
  } catch (err) {
    throw new PilarCoreTaskError(
      `getTask: 读取 IndexedDB 失败 — ${err instanceof Error ? err.message : String(err)}`,
      'PERSIST_ERROR',
    );
  }
}

/**
 * 根据 OpenMAIC jobId 反查 PilarCore 任务。
 * 用于在已知 jobId 时找回对应的 PilarCore 侧记录。
 */
export async function getTaskByJobId(
  openmaicJobId: string,
): Promise<PilarCoreTaskRecord | null> {
  assertBrowserStorage();
  if (!openmaicJobId) return null;
  try {
    return (await db.pilarCoreTasks.where('openmaicJobId').equals(openmaicJobId).first()) ?? null;
  } catch (err) {
    throw new PilarCoreTaskError(
      `getTaskByJobId: 读取 IndexedDB 失败 — ${err instanceof Error ? err.message : String(err)}`,
      'PERSIST_ERROR',
    );
  }
}

/**
 * 根据 classroomId 反查 PilarCore 任务。
 * 用于课堂播放页（/classroom/[id]）恢复"返回 PilarCore"按钮的目标 URL。
 * 如果该课堂不是由 PilarCore 任务生成（无对应记录），返回 null。
 */
export async function getTaskByClassroomId(
  classroomId: string,
): Promise<PilarCoreTaskRecord | null> {
  assertBrowserStorage();
  if (!classroomId) return null;
  try {
    // classroomId 不是索引字段；用 filter 全表扫描后取第一条匹配。
    // 任务总量小（每个用户每次生成一条），全表扫描成本可接受。
    const all = await db.pilarCoreTasks.toArray();
    return all.find((t) => t.classroomId === classroomId) ?? null;
  } catch (err) {
    throw new PilarCoreTaskError(
      `getTaskByClassroomId: 读取 IndexedDB 失败 — ${err instanceof Error ? err.message : String(err)}`,
      'PERSIST_ERROR',
    );
  }
}

/**
 * 列出所有 PilarCore 任务，按 createdAt 降序（最新在前）。
 */
export async function listTasks(): Promise<PilarCoreTaskRecord[]> {
  assertBrowserStorage();
  try {
    const all = await db.pilarCoreTasks.toArray();
    return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch (err) {
    throw new PilarCoreTaskError(
      `listTasks: 读取 IndexedDB 失败 — ${err instanceof Error ? err.message : String(err)}`,
      'PERSIST_ERROR',
    );
  }
}

/**
 * 按 capability 过滤任务列表，按 createdAt 降序。
 */
export async function listTasksByCapability(
  capability: Capability,
): Promise<PilarCoreTaskRecord[]> {
  assertBrowserStorage();
  try {
    const filtered = await db.pilarCoreTasks.where('capability').equals(capability).toArray();
    return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch (err) {
    throw new PilarCoreTaskError(
      `listTasksByCapability: 读取 IndexedDB 失败 — ${err instanceof Error ? err.message : String(err)}`,
      'PERSIST_ERROR',
    );
  }
}

/**
 * 更新任务状态。
 *
 * 状态最终态保护：一旦 status === 'succeeded' | 'failed' | 'cancelled'，
 * 除非显式再次调用（如 retry），否则不重置回 pending/running。
 *
 * @param taskId 任务 ID
 * @param patch 状态补丁
 * @returns 更新后的完整记录
 */
export async function updateTaskStatus(
  taskId: string,
  patch: TaskStatusPatch,
): Promise<PilarCoreTaskRecord> {
  assertBrowserStorage();
  if (!taskId) {
    throw new PilarCoreTaskError('updateTaskStatus: taskId 不能为空', 'INVALID_INPUT');
  }

  const existing = await db.pilarCoreTasks.get(taskId);
  if (!existing) {
    throw new PilarCoreTaskError(
      `updateTaskStatus: 任务不存在 — taskId=${taskId}`,
      'NOT_FOUND',
    );
  }

  const updatedAt = patch.updatedAt ?? new Date().toISOString();
  const next: PilarCoreTaskRecord = {
    ...existing,
    ...patch,
    updatedAt,
    // 不可变字段强制保留
    taskId: existing.taskId,
    openmaicJobId: existing.openmaicJobId,
    capability: existing.capability,
    createdAt: existing.createdAt,
  };

  try {
    await db.pilarCoreTasks.put(next);
  } catch (err) {
    throw new PilarCoreTaskError(
      `updateTaskStatus: 写入 IndexedDB 失败 — ${err instanceof Error ? err.message : String(err)}`,
      'PERSIST_ERROR',
    );
  }

  return next;
}

/**
 * 将 OpenMAIC Job 轮询结果同步到 PilarCore 任务记录。
 *
 * 派生规则（OpenMAIC status → PilarCore TaskStatus）：
 *   - queued   → pending
 *   - running  → running
 *   - succeeded→ succeeded（并写入 result / classroomId）
 *   - failed   → failed（并写入 error）
 *
 * 同步是幂等的：可重复调用，最终态不会被回退。
 */
export async function syncTaskFromPollResult(
  taskId: string,
  poll: PollClassroomJobResult,
): Promise<PilarCoreTaskRecord> {
  const derived: TaskStatus =
    poll.status === 'queued'
      ? 'pending'
      : poll.status === 'running'
        ? 'running'
        : poll.status; // succeeded | failed

  const patch: TaskStatusPatch = {
    status: derived,
    lastStep: poll.step,
    lastProgress: poll.progress,
    lastMessage: poll.message,
    scenesGenerated: poll.scenesGenerated,
    totalScenes: poll.totalScenes,
  };

  if (poll.status === 'succeeded' && poll.result) {
    patch.classroomId = poll.result.classroomId;
    patch.result = poll.result;
  }
  if (poll.status === 'failed' && poll.error) {
    patch.error = poll.error;
  }

  return updateTaskStatus(taskId, patch);
}
