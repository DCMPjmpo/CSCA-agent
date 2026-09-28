/**
 * P3.4-3B：Capability Selection —— 最小确定性守卫
 *
 * 锁住 P3.4-3A 决策协议里**可纯函数化**的那部分：
 *   - 五类 action 的 schema / builder / extractor
 *   - resolveCapabilityDecision() 的确定性优先级（I1 / I3 / I4）
 *
 * 这些测试**不调用模型**。模型提议什么由端到端验证覆盖；这里只保证
 * 「无论模型提议什么，裁决结果都是确定且安全的」。
 */

import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_CONFLICT_QUESTION,
  askClarificationInputSchema,
  buildClarifySubmission,
  buildReferSubmission,
  extractClarifyAction,
  extractLessonAction,
  extractPptAction,
  extractReferAction,
  referToStageInputSchema,
  resolveCapabilityDecision,
  type AgentStepsLike,
} from '@/lib/csca/agent/tools';

/** 造一个含若干 tool call 的 callLLM 结果形状。 */
function steps(...calls: { toolName: string; input?: unknown }[]): AgentStepsLike {
  return { steps: [{ toolCalls: calls }] };
}

const VALID_PPT = { toolName: 'create_ppt', input: { requirement: '一元二次方程的解法' } };
const VALID_LESSON = {
  toolName: 'create_interactive_lesson',
  input: { topic: '牛顿第二定律' },
};
const VALID_CLARIFY = {
  toolName: 'ask_clarification',
  input: { question: '要 PPT 还是交互式页面？' },
};
const VALID_REFER = {
  toolName: 'refer_to_stage',
  input: { stage: 'error_review', reason: '学生问的是某道具体错题' },
};

describe('askClarificationInputSchema', () => {
  it('接受一个正常的澄清问题', () => {
    expect(
      askClarificationInputSchema.safeParse({ question: '要 PPT 还是交互式页面？' }).success,
    ).toBe(true);
  });

  it('拒绝空问题与过短问题', () => {
    expect(askClarificationInputSchema.safeParse({ question: '' }).success).toBe(false);
    expect(askClarificationInputSchema.safeParse({ question: '嗯' }).success).toBe(false);
    expect(askClarificationInputSchema.safeParse({}).success).toBe(false);
  });
});

describe('referToStageInputSchema', () => {
  it('只接受 error_review 这一个 stage', () => {
    expect(
      referToStageInputSchema.safeParse({ stage: 'error_review', reason: '需要题目上下文' })
        .success,
    ).toBe(true);
    // 刻意只有一个取值：没有第二个被证实的转介场景之前不开放。
    expect(
      referToStageInputSchema.safeParse({ stage: 'study_plan', reason: '需要计划' }).success,
    ).toBe(false);
  });

  it('拒绝空 reason', () => {
    expect(referToStageInputSchema.safeParse({ stage: 'error_review', reason: '' }).success).toBe(
      false,
    );
  });
});

describe('buildClarifySubmission', () => {
  it('规范化并 trim', () => {
    expect(buildClarifySubmission('  要哪一种？  ')).toEqual({
      ok: true,
      kind: 'clarify',
      question: '要哪一种？',
    });
  });

  it('非法输入返回失败而非抛出（抛出会中断 agentic 循环）', () => {
    expect(buildClarifySubmission(undefined)).toEqual({ ok: false, error: 'question 不能为空' });
    expect(buildClarifySubmission('   ')).toEqual({ ok: false, error: 'question 不能为空' });
  });
});

describe('buildReferSubmission', () => {
  it('规范化并 trim', () => {
    expect(buildReferSubmission('error_review', '  没有题目内容  ')).toEqual({
      ok: true,
      kind: 'refer',
      stage: 'error_review',
      reason: '没有题目内容',
    });
  });

  it('非法 stage / reason 返回失败而非抛出', () => {
    expect(buildReferSubmission('error_review', '')).toEqual({
      ok: false,
      error: 'reason 不能为空',
    });
    expect(buildReferSubmission('anything_else', 'x')).toEqual({
      ok: false,
      error: 'stage 不受支持',
    });
  });
});

describe('extractClarifyAction / extractReferAction', () => {
  it('能从 steps 中抽出 clarify', () => {
    expect(extractClarifyAction(steps(VALID_CLARIFY))).toEqual({
      type: 'clarify',
      question: '要 PPT 还是交互式页面？',
    });
  });

  it('能从 steps 中抽出 refer', () => {
    expect(extractReferAction(steps(VALID_REFER))).toEqual({
      type: 'refer',
      stage: 'error_review',
      reason: '学生问的是某道具体错题',
    });
  });

  it('无对应工具调用时返回 undefined', () => {
    expect(extractClarifyAction(steps(VALID_PPT))).toBeUndefined();
    expect(extractReferAction(steps(VALID_PPT))).toBeUndefined();
    expect(extractClarifyAction(undefined)).toBeUndefined();
    expect(extractReferAction(undefined)).toBeUndefined();
  });

  it('入参非法时跳过该调用（不产出半成品 action）', () => {
    expect(
      extractClarifyAction(steps({ toolName: 'ask_clarification', input: {} })),
    ).toBeUndefined();
    expect(
      extractReferAction(
        steps({ toolName: 'refer_to_stage', input: { stage: 'nope', reason: 'x' } }),
      ),
    ).toBeUndefined();
  });
});

describe('resolveCapabilityDecision —— 优先级矩阵', () => {
  it('无任何工具调用 → answer（I2：隐式意图不创建）', () => {
    expect(resolveCapabilityDecision(steps())).toEqual({ type: 'answer' });
    expect(resolveCapabilityDecision(undefined)).toEqual({ type: 'answer' });
    expect(resolveCapabilityDecision(null)).toEqual({ type: 'answer' });
  });

  it('只有 create_ppt → create_ppt', () => {
    const d = resolveCapabilityDecision(steps(VALID_PPT));
    expect(d.type).toBe('create_ppt');
  });

  it('只有 create_interactive_lesson → create_interactive_lesson', () => {
    const d = resolveCapabilityDecision(steps(VALID_LESSON));
    expect(d.type).toBe('create_interactive_lesson');
  });

  it('两个 create_* 同时出现 → clarify，且问的是冲突问题（I3：冲突不静默取舍）', () => {
    // 旧行为是 `extractPptAction ?? extractLessonAction` —— 静默选 PPT。
    // 这是 P3.4-3A 4.C 认定的最危险路径（「可以互动学习的课程」会撞上）。
    const d = resolveCapabilityDecision(steps(VALID_PPT, VALID_LESSON));
    expect(d).toEqual({ type: 'clarify', question: ARTIFACT_CONFLICT_QUESTION });
  });

  it('同时 create_ppt 与 clarify（自相矛盾）→ 取零副作用的 clarify 一侧', () => {
    const d = resolveCapabilityDecision(steps(VALID_PPT, VALID_CLARIFY));
    expect(d.type).toBe('clarify');
    expect(d).toEqual({ type: 'clarify', question: '要 PPT 还是交互式页面？' });
  });

  it('只有 clarify → clarify', () => {
    const d = resolveCapabilityDecision(steps(VALID_CLARIFY));
    expect(d.type).toBe('clarify');
  });

  it('只有 refer → refer', () => {
    const d = resolveCapabilityDecision(steps(VALID_REFER));
    expect(d.type).toBe('refer');
  });

  it('create_* 优先于 refer（生成意图高于转介：3A §6.2）', () => {
    // 「做一份错题讲解的 PPT」应创建，而不是被转介掉。
    expect(resolveCapabilityDecision(steps(VALID_PPT, VALID_REFER)).type).toBe('create_ppt');
    expect(resolveCapabilityDecision(steps(VALID_LESSON, VALID_REFER)).type).toBe(
      'create_interactive_lesson',
    );
  });

  it('clarify 优先于 refer', () => {
    expect(resolveCapabilityDecision(steps(VALID_CLARIFY, VALID_REFER)).type).toBe('clarify');
  });

  it('裁决结果永远在五类契约之内', () => {
    const allowed = new Set([
      'answer',
      'create_ppt',
      'create_interactive_lesson',
      'clarify',
      'refer',
    ]);
    const cases: AgentStepsLike[] = [
      steps(),
      steps(VALID_PPT),
      steps(VALID_LESSON),
      steps(VALID_CLARIFY),
      steps(VALID_REFER),
      steps(VALID_PPT, VALID_LESSON),
      steps(VALID_PPT, VALID_CLARIFY),
      steps(VALID_LESSON, VALID_CLARIFY),
      steps(VALID_PPT, VALID_LESSON, VALID_CLARIFY, VALID_REFER),
    ];
    for (const c of cases) {
      expect(allowed.has(resolveCapabilityDecision(c).type)).toBe(true);
    }
  });

  it('I1：单次最多一个 create_* —— 冲突时绝不返回任一 create 结果', () => {
    const d = resolveCapabilityDecision(steps(VALID_PPT, VALID_LESSON));
    expect(d.type).not.toBe('create_ppt');
    expect(d.type).not.toBe('create_interactive_lesson');
  });

  it('裁决是确定性的：同一输入重复调用结果相同', () => {
    const input = steps(VALID_LESSON, VALID_REFER);
    expect(resolveCapabilityDecision(input).type).toBe(resolveCapabilityDecision(input).type);
  });
});

describe('既有抽取器未被本次改动破坏', () => {
  it('extractPptAction / extractLessonAction 仍然可用', () => {
    expect(extractPptAction(steps(VALID_PPT))?.type).toBe('create_ppt');
    expect(extractLessonAction(steps(VALID_LESSON))?.type).toBe('create_interactive_lesson');
    expect(extractPptAction(steps())).toBeUndefined();
  });
});
