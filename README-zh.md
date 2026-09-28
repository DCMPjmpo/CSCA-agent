<p align="center">
  <img src="assets/banner.png" alt="CSCA Pilot Agent Banner" width="680"/>
</p>

<p align="center">
  CSCA Pilot Agent - 东盟来华留学生智能备考助手
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=flat-square" alt="License: AGPL-3.0"/></a>
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDCMPjmpo%2FCSCA-agent&envDescription=Configure%20LLM%20provider%20API%20keys.&project-name=csca-agent&framework=nextjs"><img src="https://vercel.com/button" alt="Deploy with Vercel" height="20"/></a>
  <br/>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/LangGraph-1.1-purple?style=flat-square" alt="LangGraph"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="./README-zh.md">简体中文</a>
</p>

## 项目概述

**CSCA Pilot Agent** 是面向东盟十国来华留学生的全链路 AI 智能备考系统，基于开源框架 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC)（AGPL-3.0 协议）二次开发。

### 核心痛点解决

- **备考资料零散** — 整合分散的 CSCA 备考资源
- **缺乏自适应学习路径** — 个性化学习规划
- **院校与奖学金信息获取困难** — 精准匹配推荐

### 完整自主工作流

| 功能模块 | 描述 |
|---------|------|
| **学情诊断** | 智能评估学习水平和薄弱环节 |
| **知识图谱构建** | 构建学科知识体系和考点关联 |
| **考点自适应学习** | 根据学情定制学习路径 |
| **专项模考** | 模拟真实考试环境 |
| **成绩分析** | 深度分析答题情况和改进建议 |
| **院校奖学金精准匹配** | 根据成绩匹配适合的院校和奖学金 |

### 底层架构

- **GMI Cloud Inference Engine** — 统一 API 接入平台
- **多模型智能路由** — DeepSeek V3、Qwen3-32B、Kimi
- **负载均衡与故障降级** — 保障海外用户稳定使用

---

## 快速开始

### 环境要求

- **Node.js** >= 20.9.0
- **pnpm** >= 10

### 1. 克隆与安装

```bash
git clone https://github.com/DCMPjmpo/CSCA-agent.git
cd CSCA-agent
pnpm install
```

### 2. 配置

```bash
cp .env.example .env.local
```

配置至少一个 LLM 提供商密钥：

```env
# GMI Cloud API 配置
GMI_API_KEY=your-gmi-api-key
GMI_BASE_URL=https://api.gmi-cloud.com/v1

# 或者使用其他提供商
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
MINIMAX_API_KEY=...
```

### 3. 运行

```bash
pnpm dev
```

打开 **http://localhost:3000** 开始使用！

### 4. 生产构建

```bash
pnpm build && pnpm start
```

### Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDCMPjmpo%2FCSCA-agent&envDescription=Configure%20LLM%20provider%20API%20keys.&project-name=csca-agent&framework=nextjs)

手动部署：
1. Fork 本仓库
2. 导入到 [Vercel](https://vercel.com/new)
3. 设置环境变量（至少配置一个 LLM API 密钥）
4. 部署

### Docker 部署

```bash
cp .env.example .env.local
# 编辑 .env.local 配置 API 密钥
docker compose up --build
```

---

## 核心功能

### 多语言支持

支持 11 种语言（覆盖东盟核心国家 + 中英日俄阿拉伯）：
- 中文 (Chinese)
- 英文 (English)
- 泰语 (Thai)
- 越南语 (Vietnamese)
- 印尼语 (Indonesian)
- 马来语 (Malay)
- 菲律宾语 (Filipino)
- 日语 (Japanese)
- 俄语 (Russian)
- 阿拉伯语 (Arabic)

### 学情诊断

智能分析学习状态，识别薄弱环节，生成个性化诊断报告。

### 知识图谱

构建完整的学科知识体系，展示知识点之间的关联关系。

### 自适应学习

根据诊断结果，定制个性化学习路径和练习计划。

### 专项模考

模拟真实 CSCA 考试环境，支持全真模式和练习模式。

### 院校匹配

根据学习成绩和个人偏好，精准匹配适合的中国高校和奖学金项目。

---

## 贡献指南

欢迎社区贡献！详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 许可证

本项目基于 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) 二次开发，遵循 [AGPL-3.0](LICENSE) 开源协议。

---

## 联系方式

如有问题或合作意向，请联系：csca-support@gmi-cloud.com
