# CSCA Pilot Agent

## 南洋档案局 · 东盟来华留学生智能备考平台

> 面向东盟十国来华留学生的全链路 AI 智能备考系统，基于多智能体协同架构，覆盖从学情诊断到院校匹配的完整备考闭环。

---

| 维度 | 说明 |
|------|------|
| **项目定位** | 东盟来华留学生 CSCA 考试全流程自主智能体 |
| **技术基座** | Next.js 16 + React 19 + TypeScript 5 + LangGraph 1.1 |
| **AI 架构** | 多模型智能路由 + 8 专家智能体协同 + GMI 云推理引擎 |
| **多语言支持** | 14 种语言（覆盖东盟十国 + 中英日俄阿拉伯） |
| **开源协议** | AGPL-3.0（基于 OpenMAIC 二次开发） |
| **版本** | v0.2.1 |

---

## 一、项目背景

### 1.1 行业痛点

当前东盟来华留学生面临三大核心痛点：

1. **备考资料零散** — CSCA（Chinese Standardized Competency Assessment）备考资源分散在各处，缺乏统一入口和系统化组织。
2. **缺乏自适应学习路径** — 留学生基础差异大，传统"一刀切"式学习方案效率低下，无法精准定位薄弱环节。
3. **院校与奖学金信息获取困难** — 中国高校招生政策和奖学金项目信息分散，留学生难以高效匹配适合的院校。

### 1.2 解决方案

CSCA Pilot Agent 构建了一套**全链路自主工作流**，通过 8 个专业智能体协同运作，覆盖从入学评估到升学匹配的完整备考生命周期，为东盟留学生提供一站式智能化备考服务。

---

## 二、系统架构

### 2.1 整体架构

系统采用**四层分离架构**，确保各层职责清晰、独立演进：

```
┌─────────────────────────────────────────────────────────┐
│                    表现层 (Presentation)                   │
│  Next.js App Router · React 19 · Tailwind CSS 4         │
│  南洋档案局主题 · 14 语种 i18n · 响应式布局              │
├─────────────────────────────────────────────────────────┤
│                    接口层 (API Gateway)                    │
│  /api/csca/*  ·  /api/chat  ·  /api/generate/*          │
│  SSE 流式响应 · 心跳保活 · SSRF 防护                      │
├─────────────────────────────────────────────────────────┤
│                    编排层 (Orchestration)                  │
│  LangGraph StateGraph · 多智能体 Director 图              │
│  无状态生成器 · Partial-JSON 流式解析                     │
├─────────────────────────────────────────────────────────┤
│                    推理层 (AI Inference)                   │
│  GMI 云推理引擎 · 16+ Provider 统一抽象                   │
│  智能模型路由 · 故障降级 · Mock 回退                      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心模块

#### AI 推理引擎 ([lib/ai/](lib/ai/))

| 模块 | 职责 |
|------|------|
| [providers.ts](lib/ai/providers.ts) | 统一 Provider 注册表，管理 16+ AI 服务商配置（OpenAI、Anthropic、Google、DeepSeek、Qwen、Kimi、GLM、Doubao、SiliconFlow、Grok、Tencent Hunyuan、Xiaomi MiMo、OpenRouter、MiniMax、Ollama、Lemonade） |
| [model-router.ts](lib/ai/model-router.ts) | 任务级智能路由器，按 TaskType 分配最优模型，支持 GMI 优先 → DashScope/SiliconFlow 降级 → Mock 回退三级容灾 |
| [llm.ts](lib/ai/llm.ts) | 统一 LLM 调用层，封装 `callLLM` / `streamLLM`，注入 Thinking/Reasoning 配置 |
| [thinking-config.ts](lib/ai/thinking-config.ts) | 深度思考模式配置，支持 toggle/budget/level 三种控制策略 |
| [thinking-context.ts](lib/ai/thinking-context.ts) | 基于 AsyncLocalStorage 的思考上下文传递，支持 OpenAI-compatible 提供商的请求体注入 |

#### 多智能体编排 ([lib/orchestration/](lib/orchestration/))

| 模块 | 职责 |
|------|------|
| [stateless-generate.ts](lib/orchestration/stateless-generate.ts) | 无状态多智能体生成器，解析 LLM 输出的结构化 JSON Array 为 text/action 事件流 |
| [director-graph.ts](lib/orchestration/director-graph.ts) | LangGraph StateGraph 导演图，决策多智能体发言顺序与动作执行 |
| [ai-sdk-adapter.ts](lib/orchestration/ai-sdk-adapter.ts) | LangChain 兼容适配器，将 Vercel AI SDK LanguageModel 包装为 LangGraph 可用的 ChatModel |
| [csca-workflow.ts](lib/orchestration/csca-workflow.ts) | CSCA 备考工作流定义 |
| [prompt-builder.ts](lib/orchestration/prompt-builder.ts) | 多智能体提示词构建器 |

#### CSCA 业务核心 ([lib/csca/](lib/csca/))

| 模块 | 职责 |
|------|------|
| [agents.ts](lib/csca/agents.ts) | 8 个 CSCA 专家智能体定义（详见第三节） |
| [multi-agent-orchestration.ts](lib/csca/multi-agent-orchestration.ts) | 基于关键词的快速 Agent 选择 + 流式响应编排 |
| [diagnosis.ts](lib/csca/diagnosis.ts) | 学情诊断引擎 |
| [knowledge-data.ts](lib/csca/knowledge-data.ts) | CSCA 学科知识体系数据 |
| [question-bank.ts](lib/csca/question-bank.ts) | 题库管理与题目生成 |
| [error-analysis.ts](lib/csca/error-analysis.ts) | 错题分析与薄弱点诊断 |
| [university-database.ts](lib/csca/university-database.ts) | 中国高校与奖学金数据库 |
| [exam-config.ts](lib/csca/exam-config.ts) | 考试科目配置（基础汉语、数学、理化、文科汉语） |
| [syllabus.ts](lib/csca/syllabus.ts) | CSCA 考试大纲 |
| [workflow-runner.ts](lib/csca/workflow-runner.ts) | 全链路备考工作流执行器 |

### 2.3 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| **框架** | Next.js | 16.1.2 |
| **前端** | React | 19.2.3 |
| **语言** | TypeScript | 5.x |
| **AI SDK** | Vercel AI SDK | 6.0.168 |
| **多智能体** | LangGraph | 1.1.1 |
| **状态管理** | Zustand | 5.0.10 |
| **样式** | Tailwind CSS | 4.x |
| **国际化** | i18next | 26.0.1 |
| **图表** | ECharts | 6.0.0 |
| **流程图** | XYFlow | 12.10.0 |
| **富文本** | ProseMirror | 1.x |
| **数学渲染** | KaTeX / Temml | 0.16 / 0.13 |
| **PDF 解析** | unpdf | 1.4.0 |
| **测试** | Vitest + Playwright | 4.1 / 1.58 |
| **包管理** | pnpm | 10.28 |

---

## 三、多智能体系统

### 3.1 智能体阵容

CSCA Pilot Agent 部署了 8 个专业化智能体，各司其职、协同运作：

| 智能体 | 角色定位 | 核心职责 | 路由模型 |
|--------|----------|----------|----------|
| **CSCA Examiner** | 考试协调官 | 模拟出题、答题评估、错题讲解、难度调整 | DeepSeek |
| **CSCA Tutor** | 学习辅导师 | 知识点拆解、概念讲解、学习路径规划 | Qwen |
| **CSCA Analyst** | 成绩分析师 | 成绩深度分析、薄弱点识别、改进策略 | Kimi |
| **CSCA Challenger** | 批判训练师 | 批判性思维训练、多路径问题挑战 | DeepSeek |
| **CSCA Advisor** | 升学顾问 | 大学/奖学金匹配、职业路径规划 | Kimi |
| **CSCA Motivator** | 学习激励师 | 学习动力维持、成就庆祝、心态调节 | Qwen |
| **Video Explainer** | 视频讲解师 | AI 视频讲解脚本生成 | Qwen |
| **Error Explainer** | 错题讲解专家 | 错题归因、知识盲区定位、针对性练习 | DeepSeek |

### 3.2 协同机制

系统采用**关键词驱动的快速选择 + LangGraph 导演图编排**双层机制：

1. **快速选择层** — 基于关键词匹配，零延迟选择最优 Agent 响应用户请求
2. **导演图编排层** — LangGraph StateGraph 管理多 Agent 对话流，决策发言顺序与动作执行
3. **流式响应层** — SSE (Server-Sent Events) 实时推送，支持 Partial-JSON 增量解析

### 3.3 模型路由策略

按任务类型（TaskType）智能分配最优模型：

```
TaskType          → GMI 优先模型     → 降级模型
─────────────────────────────────────────────
diagnosis         → DeepSeek V4 Pro → deepseek-chat
knowledge_map     → Qwen3.6 Max     → deepseek-chat
exercise_gen      → Qwen3.6 Max     → deepseek-chat
mock_exam         → DeepSeek V4 Pro → deepseek-chat
score_analysis    → Kimi K2.5       → deepseek-chat
university_match  → Kimi K2.5       → deepseek-chat
translation       → Qwen3.6 Max     → deepseek-chat
tutor             → DeepSeek V4 Pro → deepseek-chat
```

---

## 四、核心功能

### 4.1 完整备考工作流

```
学情诊断 → 知识图谱 → 自适应学习 → 专项模考 → 成绩分析 → 错题回顾 → 学习规划 → 院校匹配
   │           │          │          │          │          │          │          │
   ▼           ▼          ▼          ▼          ▼          ▼          ▼          ▼
 诊断报告   知识网络   个性化路径  真题模拟   深度分析   错题归因   备考路线   院校推荐
```

| 功能模块 | 描述 |
|---------|------|
| **学情诊断** | 智能评估学习水平和薄弱环节，生成结构化诊断报告 |
| **知识图谱** | 构建学科知识体系和考点关联网络，可视化呈现 |
| **自适应学习** | 根据诊断结果定制个性化学习路径和练习计划 |
| **专项模考** | 模拟真实 CSCA 考试环境，支持全真模式和练习模式 |
| **成绩分析** | 深度分析答题情况，输出改进建议 |
| **错题回顾** | 错题归因分析，定位知识盲区，推荐针对性练习 |
| **学习规划** | 生成全周期备考路线图 |
| **院校匹配** | 根据成绩和个人偏好精准匹配中国高校和奖学金项目 |

### 4.2 多模态 AI 能力

除核心 LLM 对话外，系统还集成以下 AI 能力：

| 能力 | API 端点 | 说明 |
|------|----------|------|
| **语音合成 (TTS)** | `/api/generate/tts` | 支持 OpenAI、Azure、GLM、Qwen、Doubao、ElevenLabs、MiniMax 等引擎 |
| **语音识别 (ASR)** | `/api/transcription` | 支持 OpenAI Whisper、Qwen ASR |
| **图像生成** | `/api/generate/image` | 支持 OpenAI DALL-E、Seedream、Qwen-Image、Nano Banana、MiniMAX、Grok |
| **视频生成** | `/api/generate/video` | 支持 Seedance、Kling、Veo、Sora、MiniMAX、Grok |
| **PDF 解析** | `/api/parse-pdf` | 基于 unpdf/MinerU 的文档解析 |
| **网络搜索** | `/api/web-search` | 支持 Tavily、Bocha、Brave、Baidu |
| **课堂生成** | `/api/generate-classroom` | AI 驱动的互动课堂内容生成 |

### 4.3 国际化体系

支持 **14 种语言**，覆盖东盟十国全部官方语言：

| 语言 | 代码 | 适用国家 |
|------|------|----------|
| 简体中文 | zh-CN | 中国 |
| 繁體中文 | zh-TW | 中国台湾 |
| English | en-US | 国际通用 |
| ไทย | th-TH | 泰国 |
| Tiếng Việt | vi-VN | 越南 |
| Bahasa Indonesia | id-ID | 印度尼西亚 |
| Bahasa Malaysia | ms-MY | 马来西亚 |
| Filipino | tl-PH | 菲律宾 |
| မြန်မာဘာသာ | my-MM | 缅甸 |
| ភាសាខ្មែរ | km-KH | 柬埔寨 |
| ພາສາລາວ | lo-LA | 老挝 |
| 日本語 | ja-JP | 日本 |
| Русский | ru-RU | 俄罗斯 |
| العربية | ar-SA | 阿拉伯地区 |

---

## 五、页面路由

### 5.1 用户页面

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | 首页 | 品牌展示、南洋档案局沉浸式主题 |
| `/csca` | CSCA 备考中心 | 学情诊断、知识图谱、自适应学习、模考、成绩分析、院校匹配 |
| `/csca/audit` | 题目审核 | AI 题目质量审核 |
| `/csca/case-study` | 案例学习 | 成功上岸案例展示 |
| `/csca-multi-agent` | 议事厅 | 多智能体对话界面，支持 @提及、流式响应、花名册抽屉 |
| `/brand/advisors` | 上岸故事 | 留学生成功案例展示 |
| `/brand/advisors/export` | 案例导出 | 导出案例数据 |
| `/classroom/:id` | 课堂 | AI 生成的互动课堂 |
| `/generation-preview` | 预览 | 内容生成预览 |

### 5.2 API 路由

| 分类 | 端点 |
|------|------|
| **CSCA 业务** | `/api/csca/diagnosis`、`/api/csca/knowledge-map`、`/api/csca/adaptive-learning`、`/api/csca/mock-exam`、`/api/csca/score-analysis`、`/api/csca/error-analysis`、`/api/csca/ask-tutor`、`/api/csca/university-match`、`/api/csca/multi-agent`、`/api/csca/workflow`、`/api/csca/audit-questions` |
| **通用 AI** | `/api/chat`、`/api/generate/tts`、`/api/generate/image`、`/api/generate/video`、`/api/generate/scene-*`、`/api/generate/agent-profiles` |
| **文档与搜索** | `/api/parse-pdf`、`/api/web-search`、`/api/quiz-grade` |
| **课堂** | `/api/classroom`、`/api/generate-classroom`、`/api/classroom-media/*` |
| **系统** | `/api/health`、`/api/server-providers`、`/api/verify-model`、`/api/verify-image-provider`、`/api/access-code/*` |

---

## 六、容灾与可靠性

### 6.1 三级降级机制

系统设计了完整的三级容灾链路，确保服务高可用：

```
GMI 云推理引擎 (优先)
    │ 失败降级
    ▼
DashScope / SiliconFlow (二级)
    │ 失败降级
    ▼
Mock 流式回退 (兜底)
```

- **GMI 优先**：优先调用 GMI 平台（DeepSeek V4 Pro / Qwen3.6 Max / Kimi K2.5）
- **二级降级**：GMI 不可用时自动切换至 DashScope 或 SiliconFlow
- **Mock 兜底**：所有 API 均不可用时，根据用户提问内容生成模拟流式回复，保障用户体验不中断

### 6.2 流式可靠性

- **SSE 心跳保活**：每 15 秒发送 heartbeat 注释，防止代理/浏览器关闭空闲连接
- **Partial-JSON 解析**：支持不完整 JSON 的增量解析，实时推送已完成的数组元素
- **Abort 传播**：客户端中断请求时通过 `req.signal` 传播至 LLM 调用链
- **超时保护**：60 秒超时限制，防止长时间阻塞

### 6.3 安全防护

- **SSRF 防护**：生产环境下对客户端提供的 Base URL 进行 SSRF 校验
- **密钥隔离**：API Key 仅在服务端解析，不暴露给客户端
- **访问控制**：可选站点密码保护 (`ACCESS_CODE`)
- **Provider 验证**：支持模型、图像、PDF、视频 Provider 的可用性验证

---

## 七、设计主题

### 7.1 南洋档案局

项目采用**"南洋档案局"**沉浸式主题设计，将现代 AI 技术与南洋华侨历史文脉融合：

| 视觉元素 | 设计语言 |
|----------|----------|
| **主色调** | 深松绿 `#2D5A4A` + 氧化黄铜 `#A68B5B` + 宣纸白 `#FAF5EC` |
| **背景色** | 深青黑 `#081B24` + 深棕 `#3D2817` |
| **字体** | 衬线体（标题）+ 等宽体（英文）+ 像素体（装饰） |
| **圆角** | 全局零圆角，直角档案签风格 |
| **阴影** | 偏移阴影 `Npx Npx 0 #020b10`，模拟印章/刻印效果 |
| **交互反馈** | hover 上浮 + 深松绿高亮 + 黄铜边框加亮 |

### 7.2 沉浸式组件

- **航海沙盘** — 首页交互式南洋航海地图，据点探索式导航
- **竹简导航** — 左侧边栏竹简卷轴风格
- **奏折输入** — 议事厅底部奏折式传令栏
- **印章按钮** — 传令按钮采用印章视觉设计
- **花名册抽屉** — 右侧竹简抽屉展示智能体阵容

---

## 八、项目结构

```
CSCA-agent/
├── app/                              # Next.js App Router
│   ├── api/                          # 服务端 API 路由
│   │   ├── csca/                     # CSCA 业务接口（11 个端点）
│   │   ├── chat/                     # 通用对话接口
│   │   ├── generate/                 # AI 生成接口（TTS/Image/Video/Scene）
│   │   ├── parse-pdf/                # PDF 解析
│   │   ├── web-search/               # 网络搜索
│   │   └── ...                       # 其他系统接口
│   ├── csca/                         # CSCA 备考中心页面
│   ├── csca-multi-agent/             # 议事厅（多智能体对话）
│   ├── brand/                        # 品牌页面（上岸故事）
│   ├── classroom/                    # 课堂页面
│   └── page.tsx                      # 首页
├── lib/                              # 核心业务逻辑
│   ├── ai/                           # AI 推理引擎
│   │   ├── providers.ts              # 16+ Provider 统一注册表
│   │   ├── model-router.ts          # 智能模型路由 + 三级降级
│   │   ├── llm.ts                    # 统一 LLM 调用层
│   │   ├── thinking-config.ts       # 深度思考配置
│   │   └── thinking-context.ts      # 思考上下文传递
│   ├── csca/                         # CSCA 业务核心
│   │   ├── agents.ts                 # 8 个专家智能体定义
│   │   ├── multi-agent-orchestration.ts
│   │   ├── diagnosis.ts              # 学情诊断
│   │   ├── knowledge-data.ts        # 知识体系数据
│   │   ├── question-bank.ts         # 题库管理
│   │   ├── error-analysis.ts        # 错题分析
│   │   ├── university-database.ts   # 院校数据库
│   │   └── ...                       # 其他业务模块
│   ├── orchestration/                # 多智能体编排
│   │   ├── stateless-generate.ts    # 无状态生成器
│   │   ├── director-graph.ts        # LangGraph 导演图
│   │   ├── ai-sdk-adapter.ts        # AI SDK 适配器
│   │   └── ...                       # 编排工具
│   ├── i18n/                         # 国际化
│   │   ├── locales/                  # 14 种语言翻译文件
│   │   ├── locales.ts                # 语言注册表
│   │   └── config.ts                 # i18n 配置
│   ├── server/                       # 服务端工具
│   │   ├── provider-config.ts       # Provider 配置加载
│   │   ├── resolve-model.ts         # 模型解析
│   │   └── ssrf-guard.ts            # SSRF 防护
│   ├── types/                        # TypeScript 类型定义
│   ├── store/                        # Zustand 状态管理
│   └── utils/                        # 工具函数
├── components/                        # React UI 组件
│   ├── brand/                        # 品牌主题组件
│   ├── csca/                         # CSCA 功能组件
│   ├── ai-elements/                  # AI 交互基础元素
│   ├── settings/                     # 设置面板
│   ├── slide-renderer/               # 幻灯片渲染器
│   ├── chat/                         # 聊天组件
│   ├── ui/                           # 通用 UI 组件库
│   └── ...                           # 其他组件
├── packages/                         # 内部工作区包
│   ├── mathml2omml/                  # 数学公式转换
│   └── pptxgenjs/                    # PPT 生成
├── tests/                            # 单元测试 (Vitest)
├── e2e/                              # 端到端测试 (Playwright)
├── eval/                             # 评估脚本
├── .env.local                        # 环境变量配置
├── next.config.ts                    # Next.js 配置
├── tsconfig.json                     # TypeScript 配置
└── package.json                      # 项目依赖
```

---

## 九、快速开始

### 9.1 环境要求

- **Node.js** >= 20.9.0
- **pnpm** >= 10

### 9.2 安装

```bash
git clone https://github.com/DCMPjmpo/CSCA-agent.git
cd CSCA-agent
pnpm install
```

### 9.3 配置

```bash
cp .env.example .env.local
```

在 `.env.local` 中配置至少一个 LLM 服务商密钥：

```env
# 默认模型
DEFAULT_MODEL=deepseek:deepseek-v4-pro

# DeepSeek 直连
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# 或使用其他服务商
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
SILICONFLOW_API_KEY=sk-...

# CSCA 多智能体模型路由
GMI_API_BASE=https://api.deepseek.com/v1
QWEN_MODEL=deepseek-v4-pro
DEEPSEEK_MODEL=deepseek-v4-pro
KIMI_MODEL=deepseek-v4-pro
```

### 9.4 运行

```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build && pnpm start

# 代码检查
pnpm lint

# 单元测试
pnpm test

# 端到端测试
pnpm test:e2e
```

访问 **http://localhost:3000** 即可使用。

---

## 十、部署

### Vercel 部署

1. Fork 本仓库
2. 导入至 [Vercel](https://vercel.com/new)
3. 配置环境变量（至少一个 LLM API 密钥）
4. 部署

### Docker 部署

```bash
cp .env.example .env.local
# 编辑 .env.local 配置 API 密钥
docker compose up --build
```

---

## 十一、测试与质量

| 测试类型 | 工具 | 覆盖范围 |
|----------|------|----------|
| **单元测试** | Vitest 4.1 | AI Provider 配置、Thinking 配置、Web Search 路由 |
| **端到端测试** | Playwright 1.58 | 关键用户流程、多语言切换、响应式布局 |
| **国际化检查** | 自研脚本 | 翻译 Key 完整性校验 |
| **代码格式化** | Prettier 3.8 | 统一代码风格 |
| **静态检查** | ESLint 9 + TypeScript 5 | 类型安全与代码规范 |

---

## 十二、项目信息

| 项目 | 信息 |
|------|------|
| **项目名称** | CSCA Pilot Agent |
| **底层框架** | OpenMAIC (AGPL-3.0) |
| **代码仓库** | [github.com/DCMPjmpo/CSCA-agent](https://github.com/DCMPjmpo/CSCA-agent) |
| **开源协议** | AGPL-3.0 |
| **联系方式** | csca-support@gmi-cloud.com |

---

> CSCA Pilot Agent — 以 AI 之力，连接南洋学子与中国学府。
