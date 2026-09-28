/**
 * CSCA Agent Action API（P3.4-2B-1 / P3.4-2B-2 / P3.4-3B）
 *
 * 能"做事"的 Agent 端点：在真实 tool-calling 循环里决定走哪条路径，并把该决定
 * 作为结构化 `action` 返回给客户端。
 *
 * P3.4-3B 起，action 契约固定为**五类**（规格 §1）：
 *   answer / create_ppt / create_interactive_lesson / clarify / refer
 * 且**总是**返回 action（不再是"有才带"），使选择结果可观测、可端到端断言。
 *
 * 模型**提议**，`resolveCapabilityDecision()` **裁决** —— 冲突绝不静默取舍
 * （取代 P3.4-2B 时代 route.ts 里的 `extractPptAction ?? extractLessonAction`）。
 *
 * 与 ask-tutor 的分工（刻意分开，ask-tutor 一行未改）：
 *   /api/csca/ask-tutor  —— 纯问答，走 model-router（60s 硬超时，无 tools）
 *   /api/csca/agent      —— 可调用工具，走 callLLM（10 分钟预算，支持 tools/stopWhen）
 *
 * 本端点**不产生任何副作用**：不建 OpenMAIC job、不写存储、不 import OpenMAIC 客户端实现。
 * 真正的落地由浏览器执行既有 createPptTask() / createHtmlTask()（详见交付报告）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { stepCountIs } from 'ai';

import { callLLM } from '@/lib/ai/llm';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { apiSuccess } from '@/lib/server/api-response';
import { emptyLearningContext } from '@/lib/csca/learning-context';
import {
  buildLearningContext,
  parseProgress,
  renderLearningContext,
  resolveCurrentStage,
} from '@/lib/csca/learning-context-adapter';
import {
  buildCscaAgentTools,
  resolveCapabilityDecision,
  type CapabilityDecision,
} from '@/lib/csca/agent/tools';

export const maxDuration = 300;

/**
 * 构建学习上下文文本。
 *
 * 主路径与 ask-tutor 完全一致：客户端上行的原始 answerHistory 由服务端
 * adapter 重算，不采信客户端自述的聚合值。
 *
 * 本端点唯一已知调用方（CSCAVoyageApp）总是发送 answerHistory 数组，
 * 因此不复制 ask-tutor 那套 legacy 聚合字段分支——那种兼容路径只为
 * 不破坏 ask-tutor 的旧调用方而存在。缺失时如实渲染为空上下文。
 */
function buildContextText(body: Record<string, unknown>, voyageContext: unknown): string {
  if (Array.isArray(body.answerHistory)) {
    const ctx = buildLearningContext(body);
    return renderLearningContext(ctx, {
      stage: resolveCurrentStage(body),
      progress: parseProgress(body.progress),
      voyageContext: typeof voyageContext === 'string' ? voyageContext : undefined,
    });
  }

  let text = renderLearningContext(emptyLearningContext());
  if (typeof voyageContext === 'string' && voyageContext.trim()) {
    text += `\n\n[品牌叙事摘要]\n${voyageContext}`;
  }
  return text;
}

/**
 * 模型只发出了 tool call、却没有产出文本时的兜底回复。
 *
 * P3.4-3B：覆盖全部五类决定。后三类（clarify / refer / answer）都**不创建任务**，
 * 兜底文案必须与之一致 —— 不能对一次 clarify 说"已为你提交生成请求"。
 */
function buildDecisionFallbackAnswer(
  decision: CapabilityDecision,
  locale: string | undefined,
): string {
  const isEn = locale === 'en';

  switch (decision.type) {
    case 'create_ppt':
      return isEn
        ? `I've submitted your PPT request: "${decision.requirement}". Generation takes about 4–6 minutes — you can track progress on the task page.`
        : `已为你提交 PPT 生成请求：「${decision.requirement}」。生成约需 4–6 分钟，可在任务页查看进度。`;

    case 'create_interactive_lesson':
      return isEn
        ? `I've submitted your interactive lesson request: "${decision.requirement}". Generation takes about 4–6 minutes — you can track progress on the task page.`
        : `已为你提交交互式学习页面生成请求：「${decision.requirement}」。生成约需 4–6 分钟，可在任务页查看进度。`;

    case 'clarify':
      return decision.question;

    case 'refer':
      return isEn
        ? "I don't have that question's content here, so I can't tell what went wrong. Please open the wrong-answer review and use AI explanation there — or paste the question and your answer here."
        : '我这边看不到那道题的内容，所以无法判断你错在哪里。请到「错题复习」里用 AI 讲解查看，或把题目和你的作答贴出来。';

    default:
      return isEn
        ? 'Sorry, I could not produce a response right now. Please try again in a moment.'
        : '抱歉，暂时无法回答您的问题。请稍后再试。';
  }
}

export async function POST(request: NextRequest) {
  let locale: string | undefined;
  try {
    const body = await request.json();
    const { question, targetMajor, nationality, hskLevel, examScore, voyageContext } = body;
    locale = body.locale;

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    const { model, thinkingConfig } = await resolveModelFromRequest(request, body);

    const systemPrompt = `你是一位专业的CSCA（中国国际学生标准化考试）备考导师，同时具备"行动能力"。

你的职责：
1. 解答关于CSCA考试的各种问题
2. 针对学生的薄弱环节提供学习建议
3. 推荐备考策略和复习方法
4. 解释考试中的知识点和概念
5. 当学生**明确**要求生成幻灯片类产物时，调用 create_ppt 工具
6. 当学生**明确**要求生成"可交互 / 可操作 / 互动"的学习页面时，调用 create_interactive_lesson 工具
7. 当学生**有生成意图、但产出物类型说不清**时，调用 ask_clarification 工具（只问一句，不要创建）
8. 当学生问的是**某道具体题目**、而你的上下文里没有该题内容时，调用 refer_to_stage 工具

【最重要的原则：不确定就不要创建】
生成一个课件需要 4–6 分钟，且**会真实消耗资源**。宁可多问一句，也不要凭猜测建任务。

信号词表（**必须严格区分，不要混用**）：
- 只有出现「PPT / 幻灯片 / 课件 / 讲义 / slides / deck / presentation」→ 才可以调用 create_ppt
- 只有出现「交互 / 互动 / 可交互 / 可操作 / 动手 / 模拟 / interactive」→ 才可以调用 create_interactive_lesson
- 「课程 / 内容 / 材料 / 资料 / 学习页面 / 页面」属于**歧义词**，**两侧都不算数**。
  学生只说这些词时，调用 ask_clarification 问清楚要哪一种，**绝不要**自己替他决定。
- 只表达「想学习 / 想复习 / 想了解」的意愿 → 那是学习意愿，**不是生成请求**。
  直接正常讲解即可，**不要**调用任何创建工具。

关于 create_ppt 工具：
- 只在学生明确要求生成 PPT、课件、讲义、幻灯片时调用，最多调用一次
- requirement 要写成完整、具体的需求（含学科与主题），例如「一元二次方程的解法与例题」
- 该工具只是"提交生成请求"，真实生成是异步的（约 4–6 分钟）
- 因此调用后**绝不要声称课件已经生成完毕**，只需告知学生任务已提交、可在任务页查看进度

关于 create_interactive_lesson 工具：
- 只在学生明确要求交互式 / 可操作 / 互动的学习页面时调用，最多调用一次；如果学生要的是普通 PPT 或幻灯片，请改用 create_ppt
- topic 要具体到一个知识点，例如「牛顿第二定律」；覆盖范围、难度、希望的交互形式等额外要求写进 requirement
- 同样只是"提交生成请求"，异步（约 4–6 分钟），**绝不要声称页面已经生成完毕**

关于 ask_clarification 工具：
- 用在"学生想生成某个东西，但类型不明确或两类信号冲突"时，例如「帮我生成一个课程」
- 问一句就能问清的问题，例如「你是想要一份 PPT 课件，还是一个可以动手操作的交互式学习页面？」
- **澄清必须通过调用本工具表达**：不要只在回答正文里写一句反问就当作完成了澄清。
  正文里的反问不会触发澄清流程，学生也看不到结构化的选项。先调用本工具，再在回答里简短说明。
- 调用后**不要再调用任何创建工具** —— 先问清楚，等学生回答

关于 refer_to_stage 工具：
- 用在学生的请求**依赖某道具体题目或某次具体考试**，而你的上下文里没有该题内容时，
  例如「我这道题做错了，为什么？」。你无法凭空知道是哪道题、学生选了什么。
- 把它转介到既有的错题复习入口，**不要**猜测作答、也不要假装知道那道题
- 如果学生把题目和作答贴出来了，那就不需要转介，直接讲解即可

这四个工具一次最多只会用到其中一个，不要为了"更全面"而同时调用。
如果学生明确要生成产物，就不要同时再调用 ask_clarification —— 除非类型真的说不清。

回答要求：
1. 使用${locale === 'en' ? '英语' : '中文'}回答，语言自然友好
2. 数学表达式使用简单文本格式（如 x^2、a/b、√2）
3. 基于学生的真实学习数据给出个性化建议，不要编造学生未生成的数据
4. 如果学生尚未开始练习/考试，请鼓励其从 S1 定位开始，不要假设其已有学习成果
5. 如果学生请求的产物**你今天无法真正生成**（例如"把学习计划保存下来"），
   就如实说明这一点，不要承诺一个做不到的结果`;

    const contextText = buildContextText(body, voyageContext);

    const userPrompt = `学生信息：
- 目标专业：${targetMajor || '未指定'}
- 国籍：${nationality || '未指定'}
- HSK水平：HSK${hskLevel || '未指定'}
- 最近考试成绩：${examScore || '暂无'}
- 语言偏好：${locale === 'en' ? 'English' : '中文'}

真实学习上下文：
${contextText}

学生问题：${question}

请根据以上真实信息，给出专业、详细、个性化的回答。如果某些学习数据为"暂无数据"，请鼓励学生通过相应学习环节生成数据，而不是编造能力评估。`;

    const result = await callLLM(
      {
        model,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 2048,
        tools: buildCscaAgentTools(),
        stopWhen: stepCountIs(3),
      },
      'csca-agent',
      undefined,
      thinkingConfig,
    );

    // 模型提议、守卫裁决。取代 P3.4-2B 的 `extractPptAction ?? extractLessonAction`：
    // 若模型同时发出两个 create_*，现在会**明确反问**而不是静默选 PPT。
    const decision = resolveCapabilityDecision(result);

    // 即使有 action 也必须返回 answer：客户端依赖它渲染导师气泡。
    const answer = result.text || buildDecisionFallbackAnswer(decision, locale);

    // 总是返回 action（五类之一），使选择结果可观测、可端到端断言。
    return apiSuccess({ answer, degraded: false, action: decision });
  } catch (error) {
    console.error('[CscaAgent] Error:', error);
    const isEn = locale === 'en' || locale?.startsWith('en');
    const fallbackAnswer = isEn
      ? 'The AI service is temporarily unavailable. Please try again in a moment.'
      : 'AI服务暂时不可用，请稍后再试。';

    return NextResponse.json({
      success: true,
      answer: fallbackAnswer,
      degraded: true,
      fallbackReason: 'all_models_failed',
    });
  }
}
