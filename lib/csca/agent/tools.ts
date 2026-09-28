/**
 * P3.4-2B：CSCA Agent Action Tools
 *
 * P3.4-2B-1 加入 `create_ppt`；P3.4-2B-2 加入 `create_interactive_lesson`。
 * 两个工具拓扑完全一致。
 *
 * Agent 侧的工具定义。**刻意不 import 任何 OpenMAIC / Task Bridge 实现**（规格 §三 原则2）：
 * Agent 只负责"决定要做什么"，不负责"怎么做"，更不碰 Task Bridge 的实现。
 *
 * 拓扑（核心设计）：
 *   模型在服务端发出真实的 tool() 调用，但 `execute()` **只产出结构化决定**，
 *   不产生任何副作用（不建 job、不写存储）。真正落地由浏览器执行既有
 *   `createPptTask()` / `createHtmlTask()` —— 那是它们唯一合法的运行环境
 *   （IndexedDB + 相对 fetch）。
 *   详见 docs/release/P3.4_2B_1_AGENT_PPT_ACTION_REPORT.md。
 */

import { tool } from 'ai';
import { z } from 'zod';
import { nanoid } from 'nanoid';

/** 浏览器侧要执行的动作。客户端据此调用既有 createPptTask()。 */
export interface PptAction {
  type: 'create_ppt';
  requirement: string;
  requestId: string;
}

/** `create_ppt` 的入参契约（独立导出，便于单测不依赖 AI SDK 的包装）。 */
export const createPptInputSchema = z.object({
  requirement: z
    .string()
    .min(4)
    .describe('完整、具体的 PPT 需求描述，应包含学科与主题，例如「一元二次方程的解法与例题」'),
});

/** `create_ppt` 工具 execute() 的返回形状（喂回给模型看的纯数据）。 */
export type PptSubmission =
  | { ok: true; submitted: true; requirement: string; requestId: string }
  | { ok: false; error: string };

/**
 * 纯函数：把模型给出的 requirement 规范化为一次"提交"。
 *
 * **无任何副作用**——不建 job、不写存储、不发请求。真正的创建在浏览器侧。
 * 校验失败时**返回**失败而不是抛出：抛出会中断 agentic 循环，模型就没有
 * 机会产出任何回复了（PBL 先例：lib/pbl/generate-pbl.ts:88-90）。
 */
export function buildPptSubmission(requirement: unknown): PptSubmission {
  if (typeof requirement !== 'string' || !requirement.trim()) {
    return { ok: false, error: 'requirement 不能为空' };
  }
  return {
    ok: true,
    submitted: true,
    requirement: requirement.trim(),
    requestId: `csca-ppt-${nanoid(12)}`,
  };
}

/**
 * 构造 CSCA Agent 的工具集。
 *
 * 返回的对象直接交给 AI SDK 的 `callLLM`（见 app/api/csca/agent/route.ts）。
 *
 * 目前两个工具：`create_ppt`（P3.4-2B-1）、`create_interactive_lesson`（P3.4-2B-2）。
 * 这不是 multi-tool orchestration —— 只是并列的能力声明，由模型按学生意图二选一，
 * 各自"最多调用一次"。
 */
export function buildCscaAgentTools() {
  return {
    create_ppt: tool({
      description:
        '为学生创建一份定制 PPT / 课堂课件。' +
        '仅当学生明确要求生成 PPT、课件、讲义、幻灯片时才调用，最多调用一次。' +
        '重要：此工具只是"提交生成请求"，真实生成是异步的（约需 4–6 分钟），' +
        '调用后不要声称课件已经生成完毕，只需告知学生任务已提交并正在生成。',
      inputSchema: createPptInputSchema,
      execute: async ({ requirement }) => buildPptSubmission(requirement),
    }),
    create_interactive_lesson: tool({
      description:
        '为学生创建一个可交互的学习页面 / 交互式课件（Interactive Lesson）。' +
        '仅当学生明确要求"可交互 / 可操作 / 互动"的学习内容时才调用，最多调用一次。' +
        '如果学生要的是普通 PPT / 幻灯片，请改用 create_ppt。' +
        '重要：此工具只是"提交生成请求"，真实生成是异步的（约需 4–6 分钟），' +
        '调用后不要声称页面已经生成完毕，只需告知学生任务已提交并正在生成。',
      inputSchema: createLessonInputSchema,
      execute: async ({ topic, requirement }) => buildLessonSubmission(topic, requirement),
    }),
    ask_clarification: tool({
      description:
        '当学生表达了"要生成某个学习产物"，但**无法确定**要哪一种时调用：' +
        '例如只说了「课程 / 学习页面 / 内容 / 材料」，既没说要 PPT，也没说要可交互。' +
        '调用后**不要**再调用任何 create_ppt / create_interactive_lesson —— 先问清楚。' +
        '注意：如果学生只是表达"想学习 / 想复习"的意愿、并没有要求生成任何产物，' +
        '就**不要**调用本工具，直接正常回答即可。',
      inputSchema: askClarificationInputSchema,
      execute: async ({ question }) => buildClarifySubmission(question),
    }),
    refer_to_stage: tool({
      description:
        '当学生的请求依赖**某道具体题目或某次具体考试**，而你的上下文里没有该题内容时调用：' +
        '例如「我这道题做错了，为什么？」。你无法凭空知道是哪道题、学生选了什么，' +
        '应把学生转介到既有的错题复习入口，而不是猜测作答。',
      inputSchema: referToStageInputSchema,
      execute: async ({ stage, reason }) => buildReferSubmission(stage, reason),
    }),
  };
}

/** `extractPptAction` 的最小结构化入参，避免耦合 AI SDK 的具体类型。 */
export interface AgentToolCallLike {
  toolName: string;
  input?: unknown;
}

export interface AgentStepsLike {
  steps?: { toolCalls?: AgentToolCallLike[] }[];
}

/**
 * 从 callLLM 结果中抽取 create_ppt 动作。
 *
 * **绝不通过解析 answer 文本判断意图** —— 只认模型真实发出的 tool call。
 * 取第一个 create_ppt；没有则返回 undefined（正常的纯问答回复）。
 */
export function extractPptAction(result: AgentStepsLike | null | undefined): PptAction | undefined {
  const steps = result?.steps ?? [];
  for (const step of steps) {
    for (const call of step.toolCalls ?? []) {
      if (call.toolName !== 'create_ppt') continue;

      const input = call.input;
      if (!input || typeof input !== 'object') continue;

      const requirement = (input as { requirement?: unknown }).requirement;
      if (typeof requirement !== 'string' || !requirement.trim()) continue;

      return {
        type: 'create_ppt',
        requirement: requirement.trim(),
        requestId: `csca-ppt-${nanoid(12)}`,
      };
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ *
 * P3.4-2B-2：Interactive Lesson（Task Bridge capability = 'html'）
 *
 * 与 create_ppt 完全同构，只有两点不同：
 *   1. 入参是 topic（必填）+ requirement（可选），不是单个 requirement；
 *   2. 浏览器侧落地函数是 createHtmlTask()（capability='html'）。
 * ------------------------------------------------------------------ */

/** 浏览器侧要执行的动作。客户端据此调用既有 createHtmlTask()。 */
export interface LessonAction {
  type: 'create_interactive_lesson';
  topic: string;
  /**
   * **已组合好的**完整需求（含 topic），客户端直接透传给 createHtmlTask()。
   * 注意这里**不做** interactive steering —— 那是 lib/openmaic/html.ts 里
   * buildSteeredRequirement() 的职责，此处预包装会导致双重包装。
   */
  requirement: string;
  requestId: string;
}

/** `create_interactive_lesson` 的入参契约：主题必填，额外要求可选。 */
export const createLessonInputSchema = z.object({
  topic: z
    .string()
    .min(2)
    .describe('交互式学习页面的主题，应具体到一个知识点，例如「牛顿第二定律」'),
  requirement: z
    .string()
    .optional()
    .describe('可选的额外要求，例如覆盖范围、难度、希望采用的交互形式'),
});

/** `create_interactive_lesson` 工具 execute() 的返回形状（喂回给模型看的纯数据）。 */
export type LessonSubmission =
  | { ok: true; submitted: true; topic: string; requirement: string; requestId: string }
  | { ok: false; error: string };

/**
 * 纯函数：把 topic（+ 可选 requirement）组合成 createHtmlTask() 能直接消费的 requirement。
 *
 * 只做拼接，**不做 interactive steering**（见 LessonAction.requirement 的说明）。
 *
 * @returns 组合后的需求；topic 非法时返回 null。
 */
export function composeLessonRequirement(topic: unknown, requirement: unknown): string | null {
  if (typeof topic !== 'string' || !topic.trim()) return null;

  const trimmedTopic = topic.trim();
  const extra = typeof requirement === 'string' ? requirement.trim() : '';
  return extra ? `${trimmedTopic}\n${extra}` : trimmedTopic;
}

/**
 * 纯函数：规范化为一次"提交"。**无任何副作用**；失败时**返回**而非抛出
 * （抛出会中断 agentic 循环，模型将没有机会产出回复）。
 */
export function buildLessonSubmission(topic: unknown, requirement: unknown): LessonSubmission {
  const composed = composeLessonRequirement(topic, requirement);
  if (!composed) return { ok: false, error: 'topic 不能为空' };

  return {
    ok: true,
    submitted: true,
    topic: (topic as string).trim(),
    requirement: composed,
    requestId: `csca-lesson-${nanoid(12)}`,
  };
}

/**
 * 从 callLLM 结果中抽取 create_interactive_lesson 动作。
 *
 * 与 extractPptAction 同构：**绝不通过解析 answer 文本判断意图**，只认模型真实
 * 发出的 tool call。取第一个；没有则返回 undefined。
 */
export function extractLessonAction(
  result: AgentStepsLike | null | undefined,
): LessonAction | undefined {
  const steps = result?.steps ?? [];
  for (const step of steps) {
    for (const call of step.toolCalls ?? []) {
      if (call.toolName !== 'create_interactive_lesson') continue;

      const input = call.input;
      if (!input || typeof input !== 'object') continue;

      const { topic, requirement } = input as { topic?: unknown; requirement?: unknown };
      const composed = composeLessonRequirement(topic, requirement);
      if (!composed) continue;

      return {
        type: 'create_interactive_lesson',
        topic: (topic as string).trim(),
        requirement: composed,
        requestId: `csca-lesson-${nanoid(12)}`,
      };
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ *
 * P3.4-3B：Capability Selection —— 澄清与转介
 *
 * P3.4-3A 审计结论：只有 answer / create_ppt / create_interactive_lesson
 * 三类**无法表达**两种真实输入 ——
 *   - 「有生成意图但产物类型未定」（如「帮我生成一个课程」）→ clarify
 *   - 「请求依赖某道具体题，而 Agent 无该数据」（如「我这道题为什么错了」）→ refer
 *
 * 落地形态采用 3A §6.5 的**选项 C**：把两者也表达为 tool call，
 * 复用既有「从 step.toolCalls 抽 action」机制，零新范式。
 * ------------------------------------------------------------------ */

/** Agent 面对一次输入时的最终决定。契约只允许这五类（P3.4-3B §1）。 */
export interface AnswerDecision {
  type: 'answer';
}

export interface ClarifyAction {
  type: 'clarify';
  /** 要向学生提出的那个澄清问题。 */
  question: string;
}

/**
 * 可转介的既有入口。
 *
 * **刻意只有一个取值**：P3.4-3A 只证明了「错题讲解」这一个真实转介场景
 * （`/api/csca/error-analysis`，从错题复习页面进入）。新增取值必须先有被证实的场景，
 * 否则就是把学生导向死胡同（S7 学习计划目前只有查看器、没有生成器）。
 */
export type ReferStage = 'error_review';

export interface ReferAction {
  type: 'refer';
  stage: ReferStage;
  reason: string;
}

export type CapabilityDecision =
  AnswerDecision | PptAction | LessonAction | ClarifyAction | ReferAction;

export const askClarificationInputSchema = z.object({
  question: z
    .string()
    .min(2)
    .describe(
      '向学生提出的澄清问题，例如「你是想要一份 PPT 课件，还是一个可以动手操作的交互式学习页面？」',
    ),
});

export const referToStageInputSchema = z.object({
  stage: z
    .enum(['error_review'])
    .describe('要转介到的既有入口。目前仅支持 error_review（错题复习，含 AI 错题讲解）'),
  reason: z.string().min(2).describe('为什么需要转介，用一句话说明'),
});

export type ClarifySubmission =
  { ok: true; kind: 'clarify'; question: string } | { ok: false; error: string };

/** 纯函数，无副作用。校验失败时**返回**失败而非抛出（抛出会中断 agentic 循环）。 */
export function buildClarifySubmission(question: unknown): ClarifySubmission {
  if (typeof question !== 'string' || !question.trim()) {
    return { ok: false, error: 'question 不能为空' };
  }
  return { ok: true, kind: 'clarify', question: question.trim() };
}

export type ReferSubmission =
  { ok: true; kind: 'refer'; stage: ReferStage; reason: string } | { ok: false; error: string };

/** 纯函数，无副作用。同上，返回而非抛出。 */
export function buildReferSubmission(stage: unknown, reason: unknown): ReferSubmission {
  if (stage !== 'error_review') {
    return { ok: false, error: 'stage 不受支持' };
  }
  if (typeof reason !== 'string' || !reason.trim()) {
    return { ok: false, error: 'reason 不能为空' };
  }
  return { ok: true, kind: 'refer', stage, reason: reason.trim() };
}

export function extractClarifyAction(
  result: AgentStepsLike | null | undefined,
): ClarifyAction | undefined {
  for (const step of result?.steps ?? []) {
    for (const call of step.toolCalls ?? []) {
      if (call.toolName !== 'ask_clarification') continue;

      const input = call.input;
      if (!input || typeof input !== 'object') continue;

      const slot = buildClarifySubmission((input as { question?: unknown }).question);
      if (!slot.ok) continue;

      return { type: 'clarify', question: slot.question };
    }
  }
  return undefined;
}

export function extractReferAction(
  result: AgentStepsLike | null | undefined,
): ReferAction | undefined {
  for (const step of result?.steps ?? []) {
    for (const call of step.toolCalls ?? []) {
      if (call.toolName !== 'refer_to_stage') continue;

      const input = call.input;
      if (!input || typeof input !== 'object') continue;

      const { stage, reason } = input as { stage?: unknown; reason?: unknown };
      const slot = buildReferSubmission(stage, reason);
      if (!slot.ok) continue;

      return { type: 'refer', stage: slot.stage, reason: slot.reason };
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ *
 * P3.4-3B：最小确定性守卫（Minimal Deterministic Guard）
 *
 * 模型**提议**，守卫**裁决**。把 P3.4-3A §6.3 的不变量落成一条纯函数：
 *   I1 单次最多一个 create_*        —— 从 prompt 软约束升级为硬门禁
 *   I3 冲突**绝不静默取舍**          —— 取代旧的 `extractPptAction ?? extractLessonAction`
 *   I4 歧义 → 零工具、只问一句
 * ------------------------------------------------------------------ */

/** 两类创建信号同时出现时的确定性提问（模型没给出自己的澄清问题时的兜底）。 */
export const ARTIFACT_CONFLICT_QUESTION =
  '你是想要一份 PPT 课件，还是一个可以动手操作的交互式学习页面？';

/**
 * 把一次 callLLM 结果裁决为**唯一**一个决定。
 *
 * 规则顺序固定、可单测：
 *   1. 同时命中 create_ppt 与 create_interactive_lesson → clarify（I3，冲突不静默）
 *   2. 既命中 create_* 又要求澄清（自相矛盾）        → 取零副作用的 clarify 一侧
 *   3. create_ppt
 *   4. create_interactive_lesson
 *   5. clarify（模型自己的提问）
 *   6. refer
 *   7. answer
 *
 * 注意规则 3 在 6 之前：**生成意图优先于转介**（3A §6.2 的优先级），
 * 即「做一份错题讲解的 PPT」仍应创建任务，而不是被转介掉。
 */
export function resolveCapabilityDecision(
  result: AgentStepsLike | null | undefined,
): CapabilityDecision {
  const ppt = extractPptAction(result);
  const lesson = extractLessonAction(result);
  const clarify = extractClarifyAction(result);
  const refer = extractReferAction(result);

  if (ppt && lesson) {
    return { type: 'clarify', question: ARTIFACT_CONFLICT_QUESTION };
  }
  if ((ppt || lesson) && clarify) {
    return clarify;
  }
  if (ppt) return ppt;
  if (lesson) return lesson;
  if (clarify) return clarify;
  if (refer) return refer;
  return { type: 'answer' };
}
