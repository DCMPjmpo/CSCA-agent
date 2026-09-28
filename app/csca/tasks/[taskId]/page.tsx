'use client';

/**
 * PilarCore 任务工作台 — P2 PPT Vertical Slice / P3.1 Interactive HTML
 *
 * 显示 PilarCore × OpenMAIC 任务的真实状态：
 *   - pending / running → 真实轮询 OpenMAIC job，展示真实 step/progress
 *   - succeeded        → 显示「打开生成结果」/「打开交互式学习内容」→ /classroom/[classroomId]
 *   - failed           → 显示真实错误 + 「重新生成」
 *
 * 状态展示全部来自 OpenMAIC API 真实返回值，不使用 setTimeout 伪造进度。
 * 浏览器刷新 / 关闭标签页 / 重新打开网站后，任务仍可恢复（持久化在 IndexedDB）。
 *
 * P3.1 扩展（最小分支）：
 *   - capability === 'ppt'  → 调用 pollPptTask/retryPptTask，CTA = "打开生成结果"
 *   - capability === 'html' → 调用 pollHtmlTask/retryHtmlTask，CTA = "打开交互式学习内容"
 *     并在成功后拉取 classroom scenes，确认存在 interactive scene 才展示完成 CTA；
 *     若无 interactive scene，提示"未生成交互式场景，请重新生成"。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  getTask,
  pollPptTask,
  retryPptTask,
  pollHtmlTask,
  retryHtmlTask,
  type PilarCoreTaskRecord,
  type OpenMAICJobStep,
} from '@/lib/openmaic';

// 默认轮询间隔（与 OpenMAIC API 返回的 pollIntervalMs 一致）
const DEFAULT_POLL_INTERVAL_MS = 5000;

/**
 * 能力差异化文案（最小分支）。
 * 共享：状态/轮询/进度/错误/重试/返回；仅切换 eyebrow/title/CTA 文案。
 */
const CAPABILITY_COPY: Record<
  PilarCoreTaskRecord['capability'],
  { eyebrow: string; title: string; successCta: string; successHint: string }
> = {
  ppt: {
    eyebrow: 'PilarCore · 定制 PPT',
    title: '生成任务工作台',
    successCta: '打开生成结果',
    successHint: '任务已完成，可打开课堂查看 PPT 与场景。',
  },
  html: {
    eyebrow: 'PilarCore · 交互式内容',
    title: 'Interactive Lesson 工作台',
    successCta: '打开交互式学习内容',
    successHint: '任务已完成，可打开课堂使用交互式学习内容。',
  },
};

// 任务状态中文映射
const STATUS_LABEL_ZH: Record<PilarCoreTaskRecord['status'], string> = {
  pending: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '生成失败',
  cancelled: '已取消',
};

// OpenMAIC step → 中文展示文案（基于真实 ClassroomGenerationStep，不使用 setTimeout 伪造）
const STEP_LABEL_ZH: Record<OpenMAICJobStep, string> = {
  queued: '正在排队',
  initializing: '正在准备',
  researching: '正在分析材料',
  generating_outlines: '正在生成大纲',
  generating_scenes: '正在生成内容',
  generating_media: '正在生成课堂场景',
  generating_tts: '正在生成语音',
  persisting: '正在保存',
  completed: '已完成',
  failed: '生成失败',
};

// 品牌色板（与 project_memory 中定义一致）
const COLORS = {
  deepOcean: '#071C26',
  deepOceanMid: '#0B4F8C',
  paper: '#FAF8F2',
  paperWarm: '#F5F0E6',
  mutedGold: '#C7A54A',
  mutedGreen: '#5A7A5A',
  mutedAmber: '#B8842F',
  restrainedRed: '#8B3A3A',
  ink: '#1F2937',
  inkMuted: '#5A6B7A',
  border: '#E5DDD0',
};

function isTerminal(status: PilarCoreTaskRecord['status']): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}

export default function TaskStatusPage() {
  const params = useParams<{ taskId: string }>();
  const router = useRouter();
  const taskId = params?.taskId;

  const [task, setTask] = useState<PilarCoreTaskRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // P3.1：HTML capability 的 interactive scene 检测结果
  //   'unknown'    — 尚未检测（仍在生成或刚切换状态）
  //   'present'    — 检测到至少一个 scene.content.type === 'interactive'
  //   'absent'     — classroom 已加载但无 interactive scene
  //   'error'      — classroom fetch 失败（不阻塞 CTA，仍允许打开）
  const [interactiveCheck, setInteractiveCheck] = useState<
    'unknown' | 'present' | 'absent' | 'error'
  >('unknown');

  // 轮询控制器（防止 race condition + 卸载后内存泄漏）
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 真实轮询逻辑：按 capability 选择 pollPptTask / pollHtmlTask → 同步到 IndexedDB → 更新 state
  const pollOnce = useCallback(async (current: PilarCoreTaskRecord) => {
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setPollError(null);
      const poller = current.capability === 'html' ? pollHtmlTask : pollPptTask;
      const { task: updated } = await poller(current, controller.signal);
      setTask(updated);
      return updated;
    } catch (err) {
      if (controller.signal.aborted) return null;
      // 轮询失败时展示真实错误，不伪造状态
      const msg = err instanceof Error ? err.message : String(err);
      setPollError(msg);
      return null;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  // 初始加载 + 启动轮询循环
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;

    const run = async () => {
      try {
        const record = await getTask(taskId);
        if (cancelled) return;
        if (!record) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setTask(record);
        setLoading(false);

        // 终态任务：仍轮询一次以刷新最新状态（防止服务端状态已变），
        // 但不启动循环轮询。
        if (isTerminal(record.status)) {
          await pollOnce(record);
          return;
        }

        // 非终态：先轮询一次，若仍是 pending/running 则启动循环
        const afterFirst = await pollOnce(record);
        if (cancelled || !afterFirst) return;
        if (isTerminal(afterFirst.status)) return;

        const loop = async () => {
          if (cancelled) return;
          const controller = new AbortController();
          abortRef.current = controller;
          try {
            const poller = afterFirst.capability === 'html' ? pollHtmlTask : pollPptTask;
            const { task: updated } = await poller(afterFirst, controller.signal);
            if (cancelled) return;
            setTask(updated);
            if (isTerminal(updated.status)) return; // 终态停止
            pollTimerRef.current = setTimeout(loop, DEFAULT_POLL_INTERVAL_MS);
          } catch (err) {
            if (cancelled || controller.signal.aborted) return;
            setPollError(err instanceof Error ? err.message : String(err));
            // 轮询失败后 10s 重试一次（避免短暂网络问题导致永久停止）
            pollTimerRef.current = setTimeout(loop, DEFAULT_POLL_INTERVAL_MS * 2);
          } finally {
            if (abortRef.current === controller) abortRef.current = null;
          }
        };
        pollTimerRef.current = setTimeout(loop, DEFAULT_POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        setPollError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [taskId, pollOnce]);

  const handleRetry = useCallback(async () => {
    if (!task) return;
    setIsRetrying(true);
    try {
      const retryFn = task.capability === 'html' ? retryHtmlTask : retryPptTask;
      const newTask = await retryFn(task);
      router.push(`/csca/tasks/${newTask.taskId}`);
    } catch (err) {
      setIsRetrying(false);
      setPollError(err instanceof Error ? err.message : String(err));
    }
  }, [task, router]);

  // P3.1：HTML capability 成功后检测 interactive scene
  // 触发条件：capability === 'html' && status === 'succeeded' && classroomId 存在
  // 只在第一次进入成功状态时拉取一次，不重复 fetch。
  useEffect(() => {
    if (!task) return;
    if (task.capability !== 'html') {
      setInteractiveCheck('unknown');
      return;
    }
    if (task.status !== 'succeeded' || !task.classroomId) {
      setInteractiveCheck('unknown');
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/classroom?id=${encodeURIComponent(task.classroomId!)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          if (!cancelled) setInteractiveCheck('error');
          return;
        }
        const data = await res.json();
        // 响应结构：{ classroom: { stage, scenes: Scene[] } }
        const scenes: Array<{ content?: { type?: string } }> =
          data?.classroom?.scenes ?? data?.scenes ?? [];
        const hasInteractive = scenes.some((s) => s?.content?.type === 'interactive');
        if (!cancelled) setInteractiveCheck(hasInteractive ? 'present' : 'absent');
      } catch (err) {
        if (controller.signal.aborted || cancelled) return;
        setInteractiveCheck('error');
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [task?.capability, task?.status, task?.classroomId]);

  // --- 渲染分支 ---

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.paper,
          color: COLORS.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"PingFang SC", "Noto Sans SC", system-ui, sans-serif',
        }}
      >
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: COLORS.deepOceanMid }} />
      </main>
    );
  }

  if (notFound || !task) {
    return (
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.paper,
          color: COLORS.ink,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          fontFamily: '"PingFang SC", "Noto Sans SC", system-ui, sans-serif',
        }}
      >
        <AlertTriangle style={{ width: 40, height: 40, color: COLORS.restrainedRed }} />
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>未找到任务</h1>
        <p style={{ fontSize: 14, color: COLORS.inkMuted }}>该任务记录不存在，或已被清理。</p>
        <Link
          href="/csca"
          style={{
            padding: '10px 20px',
            backgroundColor: COLORS.deepOcean,
            color: COLORS.paper,
            borderRadius: 6,
            fontSize: 14,
            textDecoration: 'none',
            transition: 'opacity 200ms',
          }}
        >
          返回 PilarCore
        </Link>
      </main>
    );
  }

  const statusLabel = STATUS_LABEL_ZH[task.status];
  // B2-5：回链目标与文案都取自同一表达式 —— 逻辑（`returnUrl || '/csca'`）不变，
  // 只让文案跟着真实落点走：来自 Studio 的任务显示「返回 AI Learning Studio」，
  // 其余（含历史任务）保持原有「返回 PilarCore」。
  const backHref = task.returnUrl || '/csca';
  const backLabel = backHref === '/csca/studio' ? '返回 AI Learning Studio' : '返回 PilarCore';
  const stepLabel = task.lastStep ? STEP_LABEL_ZH[task.lastStep] : null;
  const progress = task.lastProgress ?? (task.status === 'succeeded' ? 100 : 0);
  const isRunning = task.status === 'pending' || task.status === 'running';
  const isSucceeded = task.status === 'succeeded' && !!task.classroomId;
  const isFailed = task.status === 'failed';

  // P3.1：HTML capability 的成功展示策略
  //   - 'present' 或 'error' → 展示成功 CTA（'error' 仍允许打开，提示已生成但场景类型未知）
  //   - 'absent'             → 展示"未生成交互式场景"提示，允许重新生成
  //   - 'unknown' 且非成功   → 正常生成中
  const isHtmlCapability = task.capability === 'html';
  const htmlInteractiveAbsent = isHtmlCapability && isSucceeded && interactiveCheck === 'absent';
  const htmlInteractivePending = isHtmlCapability && isSucceeded && interactiveCheck === 'unknown';
  // HTML 成功 CTA 仅在检测到 interactive 或检测出错时显示（'error' 不阻塞打开）
  const htmlCanOpen =
    isHtmlCapability &&
    isSucceeded &&
    (interactiveCheck === 'present' || interactiveCheck === 'error');
  const showSuccessCta = isSucceeded && (!isHtmlCapability || htmlCanOpen);

  const copy = CAPABILITY_COPY[task.capability];

  const statusColor =
    task.status === 'succeeded'
      ? COLORS.mutedGreen
      : task.status === 'failed'
        ? COLORS.restrainedRed
        : task.status === 'cancelled'
          ? COLORS.inkMuted
          : COLORS.deepOceanMid;

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.paper,
        color: COLORS.ink,
        padding: '32px 24px',
        fontFamily: '"PingFang SC", "Noto Sans SC", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* 顶部：返回 + 面包屑 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link
            href={backHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: COLORS.inkMuted,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'color 200ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.deepOceanMid)}
            onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.inkMuted)}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            {backLabel}
          </Link>
        </div>

        {/* 任务卡片 */}
        <div
          style={{
            backgroundColor: COLORS.paperWarm,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 28,
          }}
        >
          {/* Eyebrow + 标题 */}
          <div
            style={{
              marginBottom: 6,
              fontSize: 12,
              letterSpacing: '0.12em',
              color: COLORS.mutedGold,
              textTransform: 'uppercase',
            }}
          >
            {copy.eyebrow}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: COLORS.deepOcean, marginBottom: 8 }}>
            {copy.title}
          </h1>
          <p style={{ fontSize: 13, color: COLORS.inkMuted, marginBottom: 20 }}>
            任务 ID：{task.taskId}
          </p>

          {/* 状态徽章 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                backgroundColor: `${statusColor}1A`,
                color: statusColor,
                border: `1px solid ${statusColor}33`,
              }}
            >
              {isRunning && (
                <Loader2
                  style={{ width: 14, height: 14, animation: 'spin 1.4s linear infinite' }}
                />
              )}
              {task.status === 'succeeded' && <CheckCircle2 style={{ width: 14, height: 14 }} />}
              {isFailed && <AlertTriangle style={{ width: 14, height: 14 }} />}
              {statusLabel}
            </span>
            {stepLabel && (
              <span style={{ fontSize: 13, color: COLORS.inkMuted }}>· {stepLabel}</span>
            )}
          </div>

          {/* 真实进度条 */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: COLORS.inkMuted,
                marginBottom: 6,
              }}
            >
              <span>进度</span>
              <span>{progress}%</span>
            </div>
            <div
              style={{
                height: 6,
                backgroundColor: COLORS.border,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: statusColor,
                  transition: 'width 250ms ease',
                }}
              />
            </div>
            {typeof task.scenesGenerated === 'number' && (
              <div style={{ fontSize: 12, color: COLORS.inkMuted, marginTop: 6 }}>
                已生成 {task.scenesGenerated}
                {typeof task.totalScenes === 'number' ? ` / ${task.totalScenes}` : ''} 个场景
              </div>
            )}
          </div>

          {/* 真实 message */}
          {task.lastMessage && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: COLORS.paper,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                fontSize: 13,
                color: COLORS.ink,
                marginBottom: 20,
              }}
            >
              {task.lastMessage}
            </div>
          )}

          {/* 轮询错误（真实展示，不伪造） */}
          {pollError && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: `${COLORS.restrainedRed}0D`,
                border: `1px solid ${COLORS.restrainedRed}33`,
                borderRadius: 6,
                fontSize: 12,
                color: COLORS.restrainedRed,
                marginBottom: 20,
              }}
            >
              轮询失败：{pollError}（仍会自动重试）
            </div>
          )}

          {/* 失败错误（真实展示） */}
          {isFailed && task.error && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: `${COLORS.restrainedRed}0D`,
                border: `1px solid ${COLORS.restrainedRed}33`,
                borderRadius: 6,
                fontSize: 13,
                color: COLORS.restrainedRed,
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: 4 }}>生成失败原因</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{task.error}</div>
            </div>
          )}

          {/* 需求预览 */}
          <details style={{ marginBottom: 20 }}>
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 13,
                color: COLORS.deepOceanMid,
                userSelect: 'none',
              }}
            >
              查看原始需求
            </summary>
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                backgroundColor: COLORS.paper,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: COLORS.ink,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {task.requirement}
            </pre>
          </details>

          {/* 时间戳 */}
          <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 20 }}>
            <div>创建：{formatTime(task.createdAt)}</div>
            <div>更新：{formatTime(task.updatedAt)}</div>
          </div>

          {/* P3.1：HTML capability 的"无交互式场景"提示（在操作按钮前展示） */}
          {htmlInteractiveAbsent && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: `${COLORS.mutedAmber}0D`,
                border: `1px solid ${COLORS.mutedAmber}33`,
                borderRadius: 6,
                fontSize: 13,
                color: COLORS.mutedAmber,
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                生成完成，但本次没有生成交互式场景。
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Job 已成功，但 classroom 中未检测到 scene.content.type === &quot;interactive&quot;。
                请调整需求或重新生成。
              </div>
            </div>
          )}
          {htmlInteractivePending && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: `${COLORS.deepOceanMid}0D`,
                border: `1px solid ${COLORS.deepOceanMid}33`,
                borderRadius: 6,
                fontSize: 12,
                color: COLORS.deepOceanMid,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Loader2 style={{ width: 14, height: 14, animation: 'spin 1.4s linear infinite' }} />
              正在检查 classroom 中是否包含交互式场景…
            </div>
          )}

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {showSuccessCta && task.classroomId && (
              <Link
                href={`/classroom/${task.classroomId}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  backgroundColor: COLORS.deepOcean,
                  color: COLORS.paper,
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'transform 200ms, opacity 200ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <ExternalLink style={{ width: 16, height: 16 }} />
                {copy.successCta}
              </Link>
            )}

            {(isFailed || htmlInteractiveAbsent) && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  backgroundColor: COLORS.mutedGold,
                  color: COLORS.paper,
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: isRetrying ? 'not-allowed' : 'pointer',
                  opacity: isRetrying ? 0.7 : 1,
                  transition: 'transform 200ms, opacity 200ms',
                }}
              >
                {isRetrying ? (
                  <Loader2
                    style={{ width: 16, height: 16, animation: 'spin 1.4s linear infinite' }}
                  />
                ) : (
                  <RefreshCw style={{ width: 16, height: 16 }} />
                )}
                重新生成
              </button>
            )}

            <Link
              href={backHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                backgroundColor: 'transparent',
                color: COLORS.deepOceanMid,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                fontSize: 14,
                textDecoration: 'none',
                transition: 'border-color 200ms, color 200ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.deepOceanMid)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
            >
              {backLabel}
            </Link>
          </div>
        </div>
      </div>

      {/* 旋转动画 keyframes（Tailwind animate-spin 可能未引入到本页） */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
