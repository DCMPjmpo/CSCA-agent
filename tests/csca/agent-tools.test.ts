/**
 * P3.4-2B-1：Agent Action Tool 单测
 *
 * 只测**纯**部分：入参 schema、提交构造、以及从 tool call 抽取 action。
 * AI SDK 的循环行为由 SDK 自身负责，不在此处重复测试。
 */

import { describe, expect, it } from 'vitest';

import {
  buildCscaAgentTools,
  buildPptSubmission,
  createPptInputSchema,
  extractPptAction,
} from '@/lib/csca/agent/tools';

describe('createPptInputSchema', () => {
  it('接受含学科与主题的正常需求', () => {
    const parsed = createPptInputSchema.safeParse({ requirement: '一元二次方程的解法与例题' });
    expect(parsed.success).toBe(true);
  });

  it('拒绝缺失 / 空 / 过短的 requirement', () => {
    expect(createPptInputSchema.safeParse({}).success).toBe(false);
    expect(createPptInputSchema.safeParse({ requirement: '' }).success).toBe(false);
    expect(createPptInputSchema.safeParse({ requirement: 'PPT' }).success).toBe(false);
    expect(createPptInputSchema.safeParse({ requirement: '   ' }).success).toBe(false);
  });

  it('拒绝非字符串 requirement', () => {
    expect(createPptInputSchema.safeParse({ requirement: 123 }).success).toBe(false);
    expect(createPptInputSchema.safeParse({ requirement: null }).success).toBe(false);
  });
});

describe('buildPptSubmission', () => {
  it('返回提交形状，且 requestId 带固定前缀', () => {
    const submission = buildPptSubmission('一元二次方程');
    expect(submission).toMatchObject({ ok: true, submitted: true, requirement: '一元二次方程' });
    if (submission.ok) {
      expect(submission.requestId).toMatch(/^csca-ppt-/);
    }
  });

  it('trim 掉首尾空白', () => {
    const submission = buildPptSubmission('  化学方程式配平  ');
    expect(submission.ok && submission.requirement).toBe('化学方程式配平');
  });

  it('空 / 非字符串时返回失败而不是抛出', () => {
    // 关键：execute 抛错会中断 agentic 循环，模型将没有机会回复。
    expect(buildPptSubmission('')).toEqual({ ok: false, error: 'requirement 不能为空' });
    expect(buildPptSubmission('   ')).toMatchObject({ ok: false });
    expect(buildPptSubmission(undefined)).toMatchObject({ ok: false });
    expect(buildPptSubmission(42)).toMatchObject({ ok: false });
  });

  it('每次生成不同的 requestId', () => {
    const a = buildPptSubmission('一元二次方程');
    const b = buildPptSubmission('一元二次方程');
    if (!a.ok || !b.ok) throw new Error('expected ok submission');
    expect(a.requestId).not.toBe(b.requestId);
  });
});

describe('buildCscaAgentTools', () => {
  it('暴露两个 create_* 工具 + 两个非副作用守卫工具（P3.4-3B 起）', () => {
    // P3.4-2B-1 时此断言为 ['create_ppt']（当时测试名即「本阶段禁止多工具」）。
    // P3.4-2B-2 按规格新增第二个 capability，该 stage-scoped 约束随之解除。
    // P3.4-3B 按 P3.4-3A 决策协议新增 clarify / refer 两类表达（§6.5 选项 C：
    // 复用既有 extractXxxAction 机制，把非文本结果也做成 tool call）。
    // buildCscaAgentTools() 仍是**唯一**的工具组装点。
    expect(Object.keys(buildCscaAgentTools())).toEqual([
      'create_ppt',
      'create_interactive_lesson',
      'ask_clarification',
      'refer_to_stage',
    ]);
  });

  it('create_ppt 带有描述与 inputSchema', () => {
    const tools = buildCscaAgentTools();
    expect(tools.create_ppt.description).toBeTruthy();
    expect(tools.create_ppt.inputSchema).toBeTruthy();
  });

  it('工具描述明确声明"只是提交请求"，避免模型谎称已完成', () => {
    const { description } = buildCscaAgentTools().create_ppt;
    expect(description).toContain('提交生成请求');
    expect(description).toContain('异步');
  });
});

describe('extractPptAction', () => {
  it('从含 create_ppt 的 steps 中抽出 action', () => {
    const action = extractPptAction({
      steps: [{ toolCalls: [{ toolName: 'create_ppt', input: { requirement: '一元二次方程' } }] }],
    });
    expect(action).toMatchObject({ type: 'create_ppt', requirement: '一元二次方程' });
    expect(action?.requestId).toMatch(/^csca-ppt-/);
  });

  it('纯问答（无 tool call）返回 undefined', () => {
    expect(extractPptAction({ steps: [{ toolCalls: [] }] })).toBeUndefined();
    expect(
      extractPptAction({ steps: [{ toolCalls: [{ toolName: 'other_tool', input: {} }] }] }),
    ).toBeUndefined();
  });

  it('steps / toolCalls 缺失或为 null 时不抛错', () => {
    expect(extractPptAction(undefined)).toBeUndefined();
    expect(extractPptAction(null)).toBeUndefined();
    expect(extractPptAction({})).toBeUndefined();
    expect(extractPptAction({ steps: [] })).toBeUndefined();
    expect(extractPptAction({ steps: [{}] })).toBeUndefined();
  });

  it('忽略 input 非法（缺失 / 非对象 / 空字符串）的 create_ppt 调用', () => {
    expect(
      extractPptAction({ steps: [{ toolCalls: [{ toolName: 'create_ppt' }] }] }),
    ).toBeUndefined();
    expect(
      extractPptAction({ steps: [{ toolCalls: [{ toolName: 'create_ppt', input: 'nope' }] }] }),
    ).toBeUndefined();
    expect(
      extractPptAction({
        steps: [{ toolCalls: [{ toolName: 'create_ppt', input: { requirement: '' } }] }],
      }),
    ).toBeUndefined();
    expect(
      extractPptAction({
        steps: [{ toolCalls: [{ toolName: 'create_ppt', input: { requirement: 7 } }] }],
      }),
    ).toBeUndefined();
  });

  it('跨多个 step 时取第一个 create_ppt', () => {
    const action = extractPptAction({
      steps: [
        { toolCalls: [{ toolName: 'other_tool', input: {} }] },
        { toolCalls: [{ toolName: 'create_ppt', input: { requirement: '第一个' } }] },
        { toolCalls: [{ toolName: 'create_ppt', input: { requirement: '第二个' } }] },
      ],
    });
    expect(action?.requirement).toBe('第一个');
  });

  it('trim 抽出的 requirement', () => {
    const action = extractPptAction({
      steps: [{ toolCalls: [{ toolName: 'create_ppt', input: { requirement: '  地理气候  ' } }] }],
    });
    expect(action?.requirement).toBe('地理气候');
  });
});
