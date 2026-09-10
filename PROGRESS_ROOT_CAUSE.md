# PROGRESS_ROOT_CAUSE.md

## 根因分析：新用户看到 7/9, 89%, 当前=AI 航海助手

### 1. 根因

系统中不存在 `completedStages` 字段。代码将 `currentStep`（用户最后访问的页面步骤）当作"已完成阶段数"使用，导致：

- 用户访问过 `ai-tutor`（Stage 08）→ `currentStep = 'ai-tutor'`
- 代码推导：`cur = 7`（STEP_TO_STAGE 映射）
- `doneCount = cur = 7` → 显示 7/9
- `pct = Math.round((7+1)/9 * 100) = 89%`
- `currentStage = t.nav.voyage.stage8` → 显示 "AI 航海助手"

**核心缺陷**：「当前所在阶段」≠「已完成阶段」。进入页面 ≠ 完成阶段。

### 2. 数据来源

| 文件 | 行 | 问题 |
|------|-----|------|
| `lib/csca/session.ts` L5 | localStorage key `csca_learning_session` | 存储 `currentStep` 但无 `completedStages` |
| `lib/csca/session.ts` L29-40 | `saveCscaSession` 默认值 | 硬编码 `currentStep:'diagnosis'`, `selectedSubjects:['数学']`, `selectedCountryCode:'TH'`, `hskLevel:4` |
| `lib/hooks/use-csca-session.ts` L17 | `useCscaSession` | 读取 `currentStep` 返回给所有 UI |
| `lib/hooks/use-csca-session.ts` L25 | storage event listener | `e.key === 'csca_session'` 但实际 key 是 `'csca_learning_session'`（不匹配） |
| `lib/voyage-stages.ts` L37-57 | `deriveVoyageStageStates` | 将 `i < idx` 全标记为 `done`，基于 `currentStep` 而非真实完成 |
| `components/voyage/VoyagePageHeader.tsx` L123-124 | `VoyageProgress` | `pct = Math.round(((cur+1)/total)*100)`, `doneCount = cur` |
| `app/page.tsx` L105-106, L141 | 首页 `realData` | `doneCount = Math.max(0, stageIndex)`, `pct = Math.round(((stageIndex+1)/total)*100)` |
| `lib/csca/sandbox-progress.ts` L75-76 | `deriveSandboxProgress` | 用 `session.activeStep` 推导 frontier，同样不可信 |

### 3. 默认值问题

`saveCscaSession()` 合并旧数据时使用以下默认值：

```
currentStep: 'diagnosis'
activeStep: 0
selectedSubjects: ['数学']
selectedCountryCode: 'TH'
targetMajorId: 'engineering'
hskLevel: 4
```

这意味着任何调用 `saveCscaSession({})` 都会为用户注入虚假的定位数据。

### 4. Storage 事件监听器 Bug

`use-csca-session.ts` L25:
```typescript
if (e.key === 'csca_session' || !e.key) read();
```
实际 key 是 `'csca_learning_session'`。跨 tab 同步不生效。但 `cscaSessionSaved` CustomEvent 仍能工作。

### 5. 状态计算路径

```
localStorage['csca_learning_session']
  → loadCscaSession()
    → useCscaSession().currentStageKey
      → VoyagePageHeader: getCurrentStageIndex(key) → cur → pct, doneCount
      → app/page.tsx: getCurrentStageIndex(s?.currentStep) → stageIndex → doneCount, pct
      → deriveVoyageStageStates(key) → stage1-9 status (done/current/unlocked/locked)
      → sandbox-progress.ts: session.activeStep → frontier
```

所有 UI 组件各自从 `currentStep` 推导，没有共享的 completedStages 数据。

### 6. 受影响组件

1. `components/voyage/VoyagePageHeader.tsx` — VoyageProgress + VoyageStageRibbon
2. `app/page.tsx` — 首页 Hero stats cards + Learning Voyage 8 stops
3. `app/csca/page.tsx` — 9 段阶段 ribbon
4. `lib/csca/sandbox-progress.ts` — 沙盘进度（如仍使用）
5. 任何使用 `useCscaSession()` 的组件

### 7. 修复方案

#### 7.1 建立唯一状态源

新建 `lib/voyage-progress.ts`：

```typescript
interface VoyageProgressState {
  currentStage: number;        // 0-8
  completedStages: number[];   // [0, 1, 2, ...]
  stageStatus: Record<VoyageStageId, 'locked'|'available'|'in_progress'|'completed'>;
  completedCount: number;
  totalStages: number;        // 9
  progressPercent: number;     // Math.round(completedCount/totalStages*100)
}
```

所有 UI 读取此状态，禁止各自计算。

#### 7.2 修复 CscaSessionData

在 `CscaSessionData` 中新增 `completedStages?: number[]` 字段。
移除 `saveCscaSession` 中的硬编码默认值（`selectedSubjects`, `selectedCountryCode`, `targetMajorId`, `hskLevel`）。

#### 7.3 修复 deriveVoyageStageStates

改为接收 `completedStages: number[]` 和 `currentStage: number`，而非 `currentStepKey`。

#### 7.4 修复 VoyagePageHeader / app/page.tsx

统一从 `getVoyageProgress()` 读取 `completedCount` 和 `progressPercent`。

#### 7.5 修复 storage event listener

`e.key === 'csca_learning_session'`（修正 key 名）。

#### 7.6 旧数据迁移

如果 localStorage 中 `completedStages` 不存在或不是数组 → 设为 `[]`。
如果 `currentStep` 存在但 `completedStages` 为空 → 不自动填充 completed（安全 fallback）。
