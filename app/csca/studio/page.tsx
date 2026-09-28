'use client';

/**
 * P3.3-B2-1 / B2-2 · AI Learning Studio — 一级创作空间
 *
 * 定位（见 docs/release/P3.3_B1_STUDIO_IA.md）：
 *   /csca       = "我在哪 / 今天学什么"（备考工作台 Dashboard）
 *   /csca/studio = "我在创建什么"（创作空间）
 * 因此本页**不复制** Dashboard：没有航程进度、没有 StatCard、没有 QuickAction、
 * 没有薄弱点。只有创建入口 + 进行中的任务。
 *
 * 已实现：B2-1 Create 区（AI PPT / Interactive Lesson）、B2-2 Active Tasks（pending / running）、
 *         B2-3 Recent Tasks（succeeded / failed）、B2-4 Creation History（全部 task，全状态）。
 * 未实现：B2-5（把 /csca 的 Studio 区块降级为入口）。
 *
 * 生成逻辑不在此处：两张卡都只调用 lib/openmaic 里已验证的
 * createPptTask() / createHtmlTask()，与 /csca 是同一套 Task Bridge，
 * 不是第二套生成逻辑。唯一差异是 returnUrl 指向本页。
 *
 * Active / Recent / History 三个分区共用**同一次** listTasks() 读取，不新造状态逻辑、
 * 不新建持久化。本页不做长轮询 —— 轮询归属任务页；Studio 只做一次读取 + 显式「刷新」。
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Archive, ArrowRight, ChevronRight, Code2, FileText, History, ListChecks, Loader2, RotateCcw, Sparkles,
} from 'lucide-react';
import { BrandShell } from '@/components/brand/BrandShell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n/hooks';
import { createHtmlTask, createPptTask, listTasks, type PilarCoreTaskRecord } from '@/lib/openmaic';
import { cn } from '@/lib/utils';

/**
 * Studio 创建的任务回到 Studio（而不是 /csca），使
 * Classroom → 任务工作台 → 返回 的闭环落回创作空间。
 */
const STUDIO_RETURN_URL = '/csca/studio';

/** 进行中 = 尚未进入终态的任务。终态由 Task Bridge 定义，此处不新增状态。 */
const ACTIVE_STATUSES: PilarCoreTaskRecord['status'][] = ['pending', 'running'];

/** 已结束 = 终态任务。与 ACTIVE_STATUSES 互补，二者不会重叠。 */
const RECENT_STATUSES: PilarCoreTaskRecord['status'][] = ['succeeded', 'failed'];

/**
 * 最近任务 = 最近 3 条终态任务，只作为「刚做完什么」的短列表；
 * 完整历史见下方的 Creation History（B2-4）。与 History 共用同一次 listTasks()。
 */
const RECENT_LIMIT = 3;

/**
 * History 默认展示条数。Full History 是「全部 task」，不做过滤；
 * 只有在真实数据超过该上限时才出现「加载更多」——纯前端切片，
 * 不引入分页 API、不引入新 persistence。
 */
const HISTORY_PAGE_SIZE = 20;

/**
 * 状态文案：复用任务工作台既有的 `STATUS_LABEL_ZH` 语义（含预留的 cancelled），
 * 不自造状态、不新增状态机。用 Record<TaskStatus, …> 约束穷尽性 ——
 * 若 Task Bridge 将来新增状态，这里会编译报错而不是静默渲染空白。
 */
const STATUS_LABEL: Record<PilarCoreTaskRecord['status'], { zh: string; en: string }> = {
  pending: { zh: '排队中', en: 'Queued' },
  running: { zh: '生成中', en: 'Generating' },
  succeeded: { zh: '已完成', en: 'Completed' },
  failed: { zh: '生成失败', en: 'Failed' },
  cancelled: { zh: '已取消', en: 'Cancelled' },
};

/** 状态配色：与 Active / Recent 两区保持同一套语义。 */
const STATUS_TONE: Record<PilarCoreTaskRecord['status'], string> = {
  pending: 'text-[var(--muted-foreground)]',
  running: 'text-[var(--primary)]',
  succeeded: 'text-green-600',
  failed: 'text-red-600',
  cancelled: 'text-[var(--muted-foreground)]',
};

/** 相对时间：让「更新于」在列表里可扫读，而不是一串 ISO 字符串。 */
function formatRelative(iso: string, isZh: boolean): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffMin = Math.floor((Date.now() - t) / 60_000);
  if (diffMin < 1) return isZh ? '刚刚' : 'just now';
  if (diffMin < 60) return isZh ? `${diffMin} 分钟前` : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return isZh ? `${diffHour} 小时前` : `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return isZh ? `${diffDay} 天前` : `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString(isZh ? 'zh-CN' : 'en-US');
}

export default function StudioPage() {
  const { locale } = useTranslation();
  const router = useRouter();
  const isZh = locale.startsWith('zh');

  // AI PPT 表单状态
  const [pptFormOpen, setPptFormOpen] = useState(false);
  const [pptRequirement, setPptRequirement] = useState('');
  const [isCreatingPpt, setIsCreatingPpt] = useState(false);
  const [pptCreateError, setPptCreateError] = useState<string | null>(null);

  // Interactive Lesson 表单状态
  const [htmlFormOpen, setHtmlFormOpen] = useState(false);
  const [htmlRequirement, setHtmlRequirement] = useState('');
  const [isCreatingHtml, setIsCreatingHtml] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // B2-2 / B2-3 / B2-4：进行中 + 最近 + 完整历史。
  // 三个分区共用**同一次** listTasks() 读取，不做第二套持久化，也不做长轮询。
  const [activeTasks, setActiveTasks] = useState<PilarCoreTaskRecord[]>([]);
  const [recentTasks, setRecentTasks] = useState<PilarCoreTaskRecord[]>([]);
  const [historyTasks, setHistoryTasks] = useState<PilarCoreTaskRecord[]>([]);
  const [historyVisible, setHistoryVisible] = useState(HISTORY_PAGE_SIZE);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  const loadTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const all = await listTasks(); // 已按 createdAt 降序
      setActiveTasks(all.filter((t) => ACTIVE_STATUSES.includes(t.status)));
      setRecentTasks(all.filter((t) => RECENT_STATUSES.includes(t.status)).slice(0, RECENT_LIMIT));
      setHistoryTasks(all); // Full History = 全部 task，不做状态过滤
      setHistoryVisible(HISTORY_PAGE_SIZE);
    } catch {
      // IndexedDB 不可用时静默降级为空列表，不影响创建入口
      setActiveTasks([]);
      setRecentTasks([]);
      setHistoryTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  /** 创建 PPT 任务 → 任务工作台 */
  const handleCreatePptTask = async () => {
    const trimmed = pptRequirement.trim();
    if (!trimmed) return;
    setIsCreatingPpt(true);
    setPptCreateError(null);
    try {
      const task = await createPptTask({
        requirement: trimmed,
        returnUrl: STUDIO_RETURN_URL,
      });
      router.push(`/csca/tasks/${task.taskId}`);
    } catch (err) {
      setIsCreatingPpt(false);
      setPptCreateError(err instanceof Error ? err.message : String(err));
    }
  };

  /** 创建 Interactive HTML 任务 → 任务工作台 */
  const handleCreateHtmlTask = async () => {
    const trimmed = htmlRequirement.trim();
    if (!trimmed) return;
    setIsCreatingHtml(true);
    setCreateError(null);
    try {
      const task = await createHtmlTask({
        requirement: trimmed,
        returnUrl: STUDIO_RETURN_URL,
      });
      router.push(`/csca/tasks/${task.taskId}`);
    } catch (err) {
      setIsCreatingHtml(false);
      setCreateError(err instanceof Error ? err.message : String(err));
    }
  };

  /** 同一时刻只展开一个表单，避免两个 textarea 同时在屏 */
  const togglePptForm = () => {
    setPptFormOpen((v) => !v);
    setHtmlFormOpen(false);
  };
  const toggleHtmlForm = () => {
    setHtmlFormOpen((v) => !v);
    setPptFormOpen(false);
  };

  return (
    <BrandShell>
      <div data-testid="studio-page" className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {/* Header — 与 /csca 同构的版面，但内容属于创作空间，不是学习仪表盘 */}
        <div className="border-b border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">
              PilarCore · AI Learning Studio
            </p>
            <h1 className="mt-1 text-2xl font-bold">AI Learning Studio</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
              {isZh
                ? '在这里创作教学 PPT 与交互式学习内容。选择一种形式开始，生成过程会保存到你的创作记录中。'
                : 'Create teaching slides and interactive learning content. Pick a format to begin — every generation is saved to your creations.'}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <section className="mt-2">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold">
                {isZh ? '创建' : 'Create'}
              </h2>
            </div>

            {/* 两个独立入口，视觉权重相同：同样的卡片类、同样的图标容器、同样的排版权重。
                不提供"万能 AI 创建器" —— 幻灯片与交互内容在用户心智里本就是两种产物，
                capability 枚举（'ppt' | 'html'）也只有两个值。 */}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-testid="ai-ppt-card"
                onClick={togglePptForm}
                aria-expanded={pptFormOpen}
                className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:bg-[var(--muted)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <FileText className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 text-[var(--muted-foreground)] transition-transform',
                      pptFormOpen && 'rotate-90',
                    )}
                  />
                </div>
                <h3 className="mt-3 text-base font-semibold">
                  {isZh ? 'AI PPT' : 'AI PPT'}
                </h3>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {isZh
                    ? '根据学习需求生成教学 PPT，可在课堂页导出 PPTX'
                    : 'Generate teaching slides from your requirements; exportable to PPTX'}
                </p>
              </button>

              <button
                type="button"
                data-testid="ai-html-card"
                onClick={toggleHtmlForm}
                aria-expanded={htmlFormOpen}
                className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:bg-[var(--muted)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <Code2 className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 text-[var(--muted-foreground)] transition-transform',
                      htmlFormOpen && 'rotate-90',
                    )}
                  />
                </div>
                <h3 className="mt-3 text-base font-semibold">
                  {isZh ? 'Interactive Lesson' : 'Interactive Lesson'}
                </h3>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {isZh
                    ? '生成可操作的交互式学习内容（OpenMAIC + DeepSeek）'
                    : 'Generate interactive learning content (OpenMAIC + DeepSeek)'}
                </p>
              </button>
            </div>

            {/* Inline 表单：输入 PPT 需求 → createPptTask → 任务工作台 */}
            {pptFormOpen && (
              <div data-testid="ai-ppt-form" className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <label className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
                  {isZh ? 'PPT 主题 / 需求' : 'Slide topic / requirement'}
                </label>
                <Textarea
                  data-testid="ai-ppt-requirement"
                  value={pptRequirement}
                  onChange={(e) => setPptRequirement(e.target.value)}
                  placeholder={
                    isZh
                      ? '例如：为准备 CSCA 数学考试的高中生制作一套讲解「函数与导数」的教学 PPT，包含概念梳理、典型例题与常见错误。'
                      : 'e.g., A teaching slide deck on "functions and derivatives" for a high-school student preparing for the CSCA math exam — concepts, worked examples, common mistakes.'
                  }
                  rows={4}
                  className="mt-2 resize-none"
                  disabled={isCreatingPpt}
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {isZh
                      ? '将调用 OpenMAIC + DeepSeek 真实生成；无需先完成诊断。'
                      : 'Calls OpenMAIC + DeepSeek real generation. No diagnosis required first.'}
                  </p>
                  <Button
                    type="button"
                    data-testid="ai-ppt-submit"
                    onClick={handleCreatePptTask}
                    disabled={isCreatingPpt || !pptRequirement.trim()}
                  >
                    {isCreatingPpt ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isZh ? '创建中...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        {isZh ? '创建任务' : 'Create task'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                {pptCreateError && (
                  <p className="mt-2 text-xs text-destructive">
                    {isZh ? '创建失败：' : 'Failed: '}
                    {pptCreateError}
                  </p>
                )}
              </div>
            )}

            {/* Inline 表单：输入学习主题 → createHtmlTask → 任务工作台 */}
            {htmlFormOpen && (
              <div data-testid="ai-html-form" className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <label className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
                  {isZh ? '学习主题 / 需求' : 'Learning topic / requirement'}
                </label>
                <Textarea
                  data-testid="ai-html-requirement"
                  value={htmlRequirement}
                  onChange={(e) => setHtmlRequirement(e.target.value)}
                  placeholder={
                    isZh
                      ? '例如：高中生物：光合作用的基本原理。生成一个帮助学生探索光照、二氧化碳和光合作用关系的交互式学习页面，包含知识解释和至少一种真实交互。'
                      : 'e.g., Photosynthesis basics — generate an interactive page for students to explore light/CO2/photosynthesis relationships.'
                  }
                  rows={4}
                  className="mt-2 resize-none"
                  disabled={isCreatingHtml}
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {isZh
                      ? '将调用 OpenMAIC + DeepSeek 真实生成；不修改 engine，通过 requirement steering 引导。'
                      : 'Calls OpenMAIC + DeepSeek real generation. No engine modification; uses requirement steering.'}
                  </p>
                  <Button
                    type="button"
                    data-testid="ai-html-submit"
                    onClick={handleCreateHtmlTask}
                    disabled={isCreatingHtml || !htmlRequirement.trim()}
                  >
                    {isCreatingHtml ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isZh ? '创建中...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        {isZh ? '创建任务' : 'Create task'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                {createError && (
                  <p className="mt-2 text-xs text-destructive">
                    {isZh ? '创建失败：' : 'Failed: '}
                    {createError}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* B2-2：进行中的任务。
              只读列表，不含 recent / history。轮询归任务页，这里只有显式刷新。 */}
          <section data-testid="active-tasks" className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold">
                  {isZh ? '进行中的任务' : 'Active Tasks'}
                </h2>
                {activeTasks.length > 0 && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {activeTasks.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                data-testid="active-tasks-refresh"
                onClick={loadTasks}
                disabled={isLoadingTasks}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-60"
              >
                <RotateCcw className={cn('h-3.5 w-3.5', isLoadingTasks && 'animate-spin')} />
                {isZh ? '刷新' : 'Refresh'}
              </button>
            </div>

            {activeTasks.length === 0 ? (
              <div
                data-testid="active-tasks-empty"
                className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-5 py-8 text-center"
              >
                <p className="text-sm text-[var(--muted-foreground)]">
                  {isZh ? '暂无进行中的任务' : 'No active tasks'}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {isZh
                    ? '创建一个 AI PPT 或互动课程后，它会出现在这里。'
                    : 'Create an AI PPT or an Interactive Lesson and it will show up here.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {activeTasks.map((task) => {
                  const isPpt = task.capability === 'ppt';
                  const statusLabel = task.status === 'pending'
                    ? (isZh ? '排队中' : 'Queued')
                    : (isZh ? '生成中' : 'Generating');
                  const progress = typeof task.lastProgress === 'number' ? task.lastProgress : null;
                  const scenes = task.scenesGenerated ?? 0;
                  const updated = formatRelative(task.updatedAt, isZh);
                  return (
                    <li
                      key={task.taskId}
                      data-testid="active-task-row"
                      data-task-id={task.taskId}
                      data-capability={task.capability}
                      data-status={task.status}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* 左：信息层级 = 类型 → 主题 → 状态/进度/时间 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                isPpt
                                  ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                  : 'bg-[var(--accent)]/15 text-[var(--accent)]',
                              )}
                            >
                              {isPpt ? 'AI PPT' : (isZh ? '互动课程' : 'Interactive Lesson')}
                            </span>
                            <span className="text-xs font-medium text-[var(--primary)]">
                              {statusLabel}
                            </span>
                          </div>

                          <p
                            data-testid="active-task-requirement"
                            className="mt-2 truncate text-sm font-medium"
                            title={task.requirement}
                          >
                            {task.requirement}
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
                            {progress !== null
                              ? <span>{isZh ? `进度 ${progress}%` : `Progress ${progress}%`}</span>
                              : <span>{isZh ? '等待进度回报' : 'Awaiting progress'}</span>}
                            {scenes > 0 && (
                              <span>{isZh ? `${scenes} 个场景` : `${scenes} scenes`}</span>
                            )}
                            {updated && (
                              <span>{isZh ? `更新于 ${updated}` : `Updated ${updated}`}</span>
                            )}
                          </div>

                          {progress !== null && (
                            <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[var(--muted)]">
                              <div
                                className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* 右：独立按钮，不把整行做成一个大 Link */}
                        <Button asChild variant="outline" size="sm" data-testid="active-task-continue">
                          <Link href={`/csca/tasks/${task.taskId}`} className="flex-shrink-0 self-start sm:self-center">
                            {isZh ? '继续任务' : 'Continue'}
                            <ArrowRight className="ml-2 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* B2-3：最近任务（终态）。
              只展示 succeeded / failed —— pending / running 属于上面的 Active 区。
              不做分页、不做 filter tabs、不做完整 History（B2-4）。
              Task 与 Classroom 是两个**独立动作**，整行不是 Link。 */}
          <section data-testid="recent-tasks" className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold">
                {isZh ? '最近任务' : 'Recent Tasks'}
              </h2>
              {recentTasks.length > 0 && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  {recentTasks.length}
                </span>
              )}
            </div>

            {recentTasks.length === 0 ? (
              <div
                data-testid="recent-tasks-empty"
                className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-5 py-8 text-center"
              >
                <p className="text-sm text-[var(--muted-foreground)]">
                  {isZh ? '暂无最近任务' : 'No recent tasks'}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {isZh
                    ? '完成一个 AI PPT 或互动课程后，结果会出现在这里。'
                    : 'Finish an AI PPT or an Interactive Lesson and the result will show up here.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentTasks.map((task) => {
                  const isPpt = task.capability === 'ppt';
                  const isSucceeded = task.status === 'succeeded';
                  const scenes = task.scenesGenerated ?? task.result?.scenesCount ?? 0;
                  const updated = formatRelative(task.updatedAt, isZh);
                  // classroomId 只来自真实生成结果；没有就不渲染「打开课堂」，
                  // 绝不猜测或伪造。
                  const classroomId = task.classroomId;
                  return (
                    <li
                      key={task.taskId}
                      data-testid="recent-task-row"
                      data-task-id={task.taskId}
                      data-capability={task.capability}
                      data-status={task.status}
                      data-classroom-id={classroomId ?? ''}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* 左：类型 → 主题 → 状态/场景/时间/失败原因 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                isPpt
                                  ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                  : 'bg-[var(--accent)]/15 text-[var(--accent)]',
                              )}
                            >
                              {isPpt ? 'AI PPT' : (isZh ? '互动课程' : 'Interactive Lesson')}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-medium',
                                isSucceeded ? 'text-green-600' : 'text-red-600',
                              )}
                            >
                              {isSucceeded
                                ? (isZh ? '已完成' : 'Completed')
                                : (isZh ? '生成失败' : 'Failed')}
                            </span>
                          </div>

                          <p
                            data-testid="recent-task-requirement"
                            className="mt-2 truncate text-sm font-medium"
                            title={task.requirement}
                          >
                            {task.requirement}
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
                            {isSucceeded && scenes > 0 && (
                              <span>{isZh ? `${scenes} 个场景` : `${scenes} scenes`}</span>
                            )}
                            {updated && (
                              <span>{isZh ? `更新于 ${updated}` : `Updated ${updated}`}</span>
                            )}
                          </div>

                          {!isSucceeded && task.error && (
                            <p
                              data-testid="recent-task-error"
                              className="mt-1.5 truncate text-xs text-destructive"
                              title={task.error}
                            >
                              {task.error}
                            </p>
                          )}
                        </div>

                        {/* 右：两个独立动作。右起为「向前」的动作（打开课堂），
                            与 Active 区的「继续任务」保持同一方向感。 */}
                        <div className="flex flex-shrink-0 items-center gap-2 self-start sm:self-center">
                          <Button asChild variant="outline" size="sm" data-testid="recent-task-view">
                            <Link href={`/csca/tasks/${task.taskId}`}>
                              {isZh ? '查看任务' : 'View task'}
                            </Link>
                          </Button>
                          {classroomId && (
                            <Button asChild size="sm" data-testid="recent-task-open-classroom">
                              <Link href={`/classroom/${classroomId}`}>
                                {isZh ? '打开课堂' : 'Open classroom'}
                                <ArrowRight className="ml-2 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* B2-4：完整创作历史 —— 全部 task、全部状态（含 pending / running），不做过滤。
              与 Recent 的区别是「范围」而不是「内容」：Recent 是状态分区、3 条上限；
              History 是全量。为避免与上面的卡片重复，这里刻意用紧凑的行式列表。
              数据源仍是同一次 listTasks()，超出上限只做前端切片 + 「加载更多」。 */}
          <section data-testid="creation-history" className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <Archive className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold">
                {isZh ? '创作历史' : 'Creation History'}
              </h2>
              {historyTasks.length > 0 && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  {historyTasks.length}
                </span>
              )}
            </div>

            {historyTasks.length === 0 ? (
              <div
                data-testid="creation-history-empty"
                className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-5 py-8 text-center"
              >
                <p className="text-sm text-[var(--muted-foreground)]">
                  {isZh ? '还没有创作记录' : 'No creation history yet'}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {isZh
                    ? '创建 AI PPT 或互动课程后，记录会显示在这里。'
                    : 'Create an AI PPT or an Interactive Lesson and the record will show up here.'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
                {/* 列头：仅 sm+ 显示，列宽与下方行严格一致 */}
                <div className="hidden border-b border-[var(--border)] px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] sm:flex sm:items-center sm:gap-4">
                  <span className="w-32 flex-shrink-0">{isZh ? '类型' : 'Type'}</span>
                  <span className="min-w-0 flex-1">{isZh ? '主题' : 'Topic'}</span>
                  <span className="w-20 flex-shrink-0">{isZh ? '状态' : 'Status'}</span>
                  <span className="w-24 flex-shrink-0">{isZh ? '时间' : 'Time'}</span>
                  <span className="w-[176px] flex-shrink-0 text-right">{isZh ? '操作' : 'Actions'}</span>
                </div>

                <ul className="divide-y divide-[var(--border)]">
                  {historyTasks.slice(0, historyVisible).map((task) => {
                    const isPpt = task.capability === 'ppt';
                    const label = STATUS_LABEL[task.status];
                    const updated = formatRelative(task.updatedAt, isZh);
                    // classroomId 只来自真实生成结果；没有就不渲染「打开课堂」。
                    const classroomId = task.classroomId;
                    return (
                      <li
                        key={task.taskId}
                        data-testid="history-task-row"
                        data-task-id={task.taskId}
                        data-capability={task.capability}
                        data-status={task.status}
                        data-classroom-id={classroomId ?? ''}
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:py-2.5"
                      >
                        <div className="flex-shrink-0 sm:w-32">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                              isPpt
                                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                : 'bg-[var(--accent)]/15 text-[var(--accent)]',
                            )}
                          >
                            {isPpt ? 'AI PPT' : (isZh ? '互动课程' : 'Interactive Lesson')}
                          </span>
                        </div>

                        <p
                          data-testid="history-task-requirement"
                          className="min-w-0 flex-1 truncate text-sm font-medium"
                          title={task.requirement}
                        >
                          {task.requirement}
                        </p>

                        {/* 移动端状态与时间同行；sm+ 用 contents 让两者直接成为行内两列 */}
                        <div className="flex items-center gap-3 sm:contents">
                          <span
                            data-testid="history-task-status"
                            className={cn(
                              'flex-shrink-0 text-xs font-medium sm:w-20',
                              STATUS_TONE[task.status],
                            )}
                          >
                            {isZh ? label.zh : label.en}
                          </span>
                          <span className="flex-shrink-0 text-xs text-[var(--muted-foreground)] sm:w-24">
                            {updated}
                          </span>
                        </div>

                        {/* 两个**独立动作**：查看任务 / 打开课堂。整行不是 Link。 */}
                        <div className="flex flex-shrink-0 items-center gap-1.5 sm:w-[176px] sm:justify-end">
                          <Button asChild variant="outline" size="xs" data-testid="history-task-view">
                            <Link href={`/csca/tasks/${task.taskId}`}>
                              {isZh ? '查看任务' : 'View task'}
                            </Link>
                          </Button>
                          {classroomId && (
                            <Button asChild size="xs" data-testid="history-task-open-classroom">
                              <Link href={`/classroom/${classroomId}`}>
                                {isZh ? '打开课堂' : 'Open classroom'}
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* 只有真实数据确实超过上限时才出现 —— 纯前端切片，无分页 API */}
                {historyTasks.length > historyVisible && (
                  <div className="border-t border-[var(--border)] px-4 py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="history-load-more"
                      onClick={() => setHistoryVisible((v) => v + HISTORY_PAGE_SIZE)}
                    >
                      {isZh
                        ? `加载更多（还有 ${historyTasks.length - historyVisible} 条）`
                        : `Load more (${historyTasks.length - historyVisible} left)`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </BrandShell>
  );
}
