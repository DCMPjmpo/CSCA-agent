/**
 * PilarCore × OpenMAIC Capability Layer — 统一导出
 *
 * 边界约定：
 *   PilarCore UI
 *     ↓ lib/openmaic/* (client + session + ppt + types)
 *     ↓ OpenMAIC API
 *
 * 禁止 PilarCore 页面组件直接散落调用 OpenMAIC API。
 */

export type {
  Capability,
  TaskStatus,
  OpenMAICJobStep,
  OpenMAICJobStatus,
  OpenMAICJobResult,
  OpenMAICJobPollResponse,
  OpenMAICJobCreateResponse,
  PilarCoreTaskRecord,
  CreatePptTaskInput,
  CreateHtmlTaskInput,
} from '@/lib/openmaic/types';

export { createClassroomJob, pollClassroomJob } from '@/lib/openmaic/client';

export type {
  CreateClassroomJobInput,
  CreateClassroomJobResult,
  PollClassroomJobResult,
} from '@/lib/openmaic/client';

export {
  PilarCoreTaskError,
  createTask,
  getTask,
  getTaskByJobId,
  getTaskByClassroomId,
  listTasks,
  listTasksByCapability,
  updateTaskStatus,
  syncTaskFromPollResult,
} from '@/lib/openmaic/session';

export type { CreateTaskInput, TaskStatusPatch } from '@/lib/openmaic/session';

export { createPptTask, pollPptTask, retryPptTask } from '@/lib/openmaic/ppt';

export { createHtmlTask, pollHtmlTask, retryHtmlTask } from '@/lib/openmaic/html';
