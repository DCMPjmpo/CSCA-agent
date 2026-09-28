/**
 * P3.4-2B-2：Interactive Lesson Action Tool 单测
 *
 * 与 P3.4-2B-1 的 agent-tools.test.ts 同构，只测**纯**部分。
 * 单独成文件，以保持既有测试文件除一条 stage-scoped 断言外不被改动。
 */

import { describe, expect, it } from 'vitest';

import {
  buildCscaAgentTools,
  buildLessonSubmission,
  composeLessonRequirement,
  createLessonInputSchema,
  extractLessonAction,
} from '@/lib/csca/agent/tools';

describe('createLessonInputSchema', () => {
  it('接受只有 topic 的最小输入', () => {
    expect(createLessonInputSchema.safeParse({ topic: '牛顿第二定律' }).success).toBe(true);
  });

  it('接受 topic + 可选 requirement', () => {
    const parsed = createLessonInputSchema.safeParse({
      topic: '牛顿第二定律',
      requirement: '包含受力分析与例题',
    });
    expect(parsed.success).toBe(true);
  });

  it('拒绝缺失 / 空 / 过短的 topic', () => {
    expect(createLessonInputSchema.safeParse({}).success).toBe(false);
    expect(createLessonInputSchema.safeParse({ topic: '' }).success).toBe(false);
    expect(createLessonInputSchema.safeParse({ topic: ' ' }).success).toBe(false);
    expect(createLessonInputSchema.safeParse({ topic: '力' }).success).toBe(false);
  });

  it('拒绝非字符串 topic', () => {
    expect(createLessonInputSchema.safeParse({ topic: 123 }).success).toBe(false);
    expect(createLessonInputSchema.safeParse({ topic: null }).success).toBe(false);
  });
});

describe('composeLessonRequirement', () => {
  it('无 requirement 时返回 topic 本身', () => {
    expect(composeLessonRequirement('牛顿第二定律', undefined)).toBe('牛顿第二定律');
    expect(composeLessonRequirement('牛顿第二定律', '')).toBe('牛顿第二定律');
    expect(composeLessonRequirement('牛顿第二定律', '   ')).toBe('牛顿第二定律');
  });

  it('有 requirement 时拼接 topic 与额外要求', () => {
    expect(composeLessonRequirement('牛顿第二定律', '含受力分析与例题')).toBe(
      '牛顿第二定律\n含受力分析与例题',
    );
  });

  it('trim 首尾空白', () => {
    expect(composeLessonRequirement('  牛顿第二定律  ', '  含例题  ')).toBe('牛顿第二定律\n含例题');
  });

  it('topic 非法时返回 null（不抛错）', () => {
    expect(composeLessonRequirement('', 'x')).toBeNull();
    expect(composeLessonRequirement('   ', 'x')).toBeNull();
    expect(composeLessonRequirement(undefined, 'x')).toBeNull();
    expect(composeLessonRequirement(42, 'x')).toBeNull();
  });

  it('不做 interactive steering —— steering 是 lib/openmaic/html.ts 的职责', () => {
    const composed = composeLessonRequirement('牛顿第二定律', undefined);
    expect(composed).not.toContain('交互式学习页面');
    expect(composed).not.toContain('interactive');
  });
});

describe('buildLessonSubmission', () => {
  it('返回提交形状，且 requestId 带固定前缀', () => {
    const submission = buildLessonSubmission('牛顿第二定律', undefined);
    expect(submission).toMatchObject({
      ok: true,
      submitted: true,
      topic: '牛顿第二定律',
      requirement: '牛顿第二定律',
    });
    if (submission.ok) {
      expect(submission.requestId).toMatch(/^csca-lesson-/);
    }
  });

  it('topic 非法时返回失败而不是抛出', () => {
    // 关键：execute 抛错会中断 agentic 循环，模型将没有机会回复。
    expect(buildLessonSubmission('', undefined)).toEqual({ ok: false, error: 'topic 不能为空' });
    expect(buildLessonSubmission('  ', undefined)).toMatchObject({ ok: false });
    expect(buildLessonSubmission(undefined, undefined)).toMatchObject({ ok: false });
    expect(buildLessonSubmission(7, undefined)).toMatchObject({ ok: false });
  });

  it('每次生成不同的 requestId', () => {
    const a = buildLessonSubmission('牛顿第二定律', undefined);
    const b = buildLessonSubmission('牛顿第二定律', undefined);
    if (!a.ok || !b.ok) throw new Error('expected ok submission');
    expect(a.requestId).not.toBe(b.requestId);
  });
});

describe('extractLessonAction', () => {
  it('从含 create_interactive_lesson 的 steps 中抽出 action', () => {
    const action = extractLessonAction({
      steps: [
        { toolCalls: [{ toolName: 'create_interactive_lesson', input: { topic: '牛顿第二定律' } }] },
      ],
    });
    expect(action).toMatchObject({
      type: 'create_interactive_lesson',
      topic: '牛顿第二定律',
      requirement: '牛顿第二定律',
    });
    expect(action?.requestId).toMatch(/^csca-lesson-/);
  });

  it('把 topic 与 requirement 组合进 action.requirement', () => {
    const action = extractLessonAction({
      steps: [
        {
          toolCalls: [
            {
              toolName: 'create_interactive_lesson',
              input: { topic: '牛顿第二定律', requirement: '含受力分析' },
            },
          ],
        },
      ],
    });
    expect(action?.requirement).toBe('牛顿第二定律\n含受力分析');
  });

  it('纯问答（无 tool call）返回 undefined', () => {
    expect(extractLessonAction({ steps: [{ toolCalls: [] }] })).toBeUndefined();
    expect(
      extractLessonAction({ steps: [{ toolCalls: [{ toolName: 'other_tool', input: {} }] }] }),
    ).toBeUndefined();
  });

  it('只认自己的工具名 —— create_ppt 不会被误抽成 lesson', () => {
    expect(
      extractLessonAction({
        steps: [{ toolCalls: [{ toolName: 'create_ppt', input: { requirement: '一元二次方程' } }] }],
      }),
    ).toBeUndefined();
  });

  it('steps / toolCalls 缺失或为 null 时不抛错', () => {
    expect(extractLessonAction(undefined)).toBeUndefined();
    expect(extractLessonAction(null)).toBeUndefined();
    expect(extractLessonAction({})).toBeUndefined();
    expect(extractLessonAction({ steps: [] })).toBeUndefined();
    expect(extractLessonAction({ steps: [{}] })).toBeUndefined();
  });

  it('忽略 input 非法（缺失 topic / 非对象 / 空 topic）的调用', () => {
    expect(
      extractLessonAction({ steps: [{ toolCalls: [{ toolName: 'create_interactive_lesson' }] }] }),
    ).toBeUndefined();
    expect(
      extractLessonAction({
        steps: [{ toolCalls: [{ toolName: 'create_interactive_lesson', input: 'nope' }] }],
      }),
    ).toBeUndefined();
    expect(
      extractLessonAction({
        steps: [{ toolCalls: [{ toolName: 'create_interactive_lesson', input: { topic: '' } }] }],
      }),
    ).toBeUndefined();
    expect(
      extractLessonAction({
        steps: [{ toolCalls: [{ toolName: 'create_interactive_lesson', input: { topic: 7 } }] }],
      }),
    ).toBeUndefined();
  });

  it('跨多个 step 时取第一个 create_interactive_lesson', () => {
    const action = extractLessonAction({
      steps: [
        { toolCalls: [{ toolName: 'other_tool', input: {} }] },
        { toolCalls: [{ toolName: 'create_interactive_lesson', input: { topic: '第一个' } }] },
        { toolCalls: [{ toolName: 'create_interactive_lesson', input: { topic: '第二个' } }] },
      ],
    });
    expect(action?.topic).toBe('第一个');
  });
});

describe('buildCscaAgentTools — lesson 工具元数据', () => {
  it('create_interactive_lesson 带有描述与 inputSchema', () => {
    const tools = buildCscaAgentTools();
    expect(tools.create_interactive_lesson.description).toBeTruthy();
    expect(tools.create_interactive_lesson.inputSchema).toBeTruthy();
  });

  it('工具描述声明"只是提交请求"且异步，避免模型谎称已完成', () => {
    const { description } = buildCscaAgentTools().create_interactive_lesson;
    expect(description).toContain('提交生成请求');
    expect(description).toContain('异步');
  });

  it('工具描述与 create_ppt 有区分度（避免两者被混用）', () => {
    const { description } = buildCscaAgentTools().create_interactive_lesson;
    expect(description).toContain('create_ppt');
  });

  it('两个工具共用同一份 AgentStepsLike 形状的抽取器', () => {
    // P3.4-3B：工具集新增 clarify / refer 两个守卫工具。
    // 「工具集恰好有哪些」由 agent-tools.test.ts 独占断言，此处只关心
    // 两个 create_* 是否仍走同一套抽取机制——避免同一份列表在两个文件里各存一份。
    const keys = Object.keys(buildCscaAgentTools());
    expect(keys).toContain('create_ppt');
    expect(keys).toContain('create_interactive_lesson');
  });
});
