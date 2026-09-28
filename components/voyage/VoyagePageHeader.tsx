'use client';

/**
 * VoyagePageHeader — 每一页统一顶部结构 (Batch 3 · Editorial Maritime)
 *
 * 结构：
 * ┌────────────────────────────────────────────────────────────┐
 * │ [BreadcrumbVoyage]                                         │
 * │                                                            │
 * │ VOYAGE CHART  ← eyebrow (uppercase sans, letter-spacing)   │
 * │ 航海图          ← 页面标题（editorial serif/zh title）      │
 * │ 你的 CSCA 学习路线正在这里展开。 ← 一句解释                 │
 * ├────────────────────────────────────────────────────────────┤
 * │ Progress  11% │ Stages 2/9 │ Current 航海图 │ Next 演练    │
 * └────────────────────────────────────────────────────────────┘
 *
 * Props 约定：
 * - eyebrow: 英文 uppercase eyebrow (如 "VOYAGE CHART")
 * - title: 中文页面标题
 * - description: 一句解释
 * - stageId: 当前所属 01-09 stage id (stage1..stage9)，用于进度条
 * - children: 可选的右侧动作（如按钮）
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { CheckCircle2, ChevronRight, Compass, Lock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCscaSession } from '@/lib/hooks/use-csca-session';
import { cn } from '@/lib/utils';
import {
  deriveVoyageStageStates,
  getCurrentStageIndex,
  VOYAGE_STAGE_ORDER,
  type VoyageStageId,
} from '@/lib/voyage-stages';

/* ===============================
 * BreadcrumbVoyage
 * =============================== */
export function BreadcrumbVoyage({
  homeLabel,
  currentLabel,
  extra,
}: {
  homeLabel?: string;
  currentLabel?: string;
  extra?: Array<{ label: string; href?: string }>;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const home = homeLabel ?? t.nav.home ?? '航程概览';
  const items: Array<{ label: string; href?: string }> = [
    { label: home, href: '/' },
    ...(extra ?? []),
  ];
  if (currentLabel) items.push({ label: currentLabel });
  else if (pathname?.startsWith('/csca-multi-agent'))
    items.push({ label: t.nav.aiAssistant ?? 'AI 航海助手' });
  else if (pathname?.startsWith('/csca/case-study'))
    items.push({ label: t.nav.caseStudy ?? '上岸故事' });
  else if (pathname?.startsWith('/csca')) items.push({ label: t.nav.learningVoyage ?? '学习航程' });
  else if (pathname?.startsWith('/classroom')) items.push({ label: t.nav.classroom ?? '讲学堂' });
  else if (pathname?.startsWith('/brand/advisors'))
    items.push({ label: t.nav.prepCenter ?? 'AI 航海助手全景大厅' });

  return (
    <nav
      aria-label="breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-[12px] text-[color:var(--color-muted-foreground)]"
    >
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const inner = (
          <span
            className={cn(
              'transition-colors duration-200',
              last
                ? 'text-[color:var(--color-ink-900)] font-medium'
                : 'hover:text-[color:var(--color-deep-ocean-700)]',
            )}
          >
            {it.label}
          </span>
        );
        return (
          <span key={i} className="flex items-center gap-1.5">
            {!last && it.href ? <Link href={it.href}>{inner}</Link> : inner}
            {!last && <ChevronRight className="w-3 h-3 opacity-50" strokeWidth={2.2} aria-hidden />}
          </span>
        );
      })}
    </nav>
  );
}

/* ===============================
 * VoyageProgress
 * =============================== */
export function VoyageProgress({
  forceStageIndex,
  compact = false,
}: {
  forceStageIndex?: number;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const session = useCscaSession();

  // 从统一状态源读取
  const prog = session.progress;
  const total = prog.totalStages;
  const pct = prog.progressPercent;
  const doneCount = prog.completedCount;
  const cur = forceStageIndex !== undefined ? forceStageIndex : prog.currentStage;

  const currentStage = t.nav.voyage?.[VOYAGE_STAGE_ORDER[cur] as VoyageStageId];
  const nextStage =
    cur < total - 1 ? t.nav.voyage?.[VOYAGE_STAGE_ORDER[cur + 1] as VoyageStageId] : undefined;

  const labelProgress = t.flow?.progress ?? 'Progress';
  const labelCurrent = compact ? 'Current' : '当前';
  const labelNext = compact ? 'Next' : '下一步';
  const labelStages = compact ? 'Stages' : '已完成';
  const unitOf = compact ? '/' : ' / ';

  return (
    <div
      className={cn(
        'grid gap-4 w-full',
        compact
          ? 'grid-cols-2 md:grid-cols-4 text-[12px]'
          : 'grid-cols-2 md:grid-cols-4 gap-4 md:gap-6',
      )}
      aria-label="voyage progress"
    >
      {/* Progress % */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="voyage-eyebrow uppercase">{labelProgress}</span>
        <div className="flex items-end gap-2">
          <span className="font-[600] text-[34px] leading-none tracking-tight text-[color:var(--color-deep-ocean)] font-sans">
            {pct}
            <span className="text-[16px] font-medium ml-0.5 text-[color:var(--color-muted-gold)]">
              %
            </span>
          </span>
        </div>
        {/* Thin editorial bar (no segments — non-game) */}
        <div
          className="w-full h-[3px] rounded-full overflow-hidden bg-[color:var(--color-border)]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[color:var(--color-deep-ocean-700)] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stages x/9 */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="voyage-eyebrow uppercase">{labelStages}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-[600] text-[26px] leading-none text-[color:var(--color-deep-ocean)] font-sans">
            {doneCount}
          </span>
          <span className="text-[14px] text-[color:var(--color-muted-foreground)]">
            {unitOf}
            {total}
          </span>
        </div>
        <div className="text-[12px] text-[color:var(--color-muted-foreground)] truncate">
          {compact ? 'learning stages' : '个阶段完成'}
        </div>
      </div>

      {/* Current */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="voyage-eyebrow uppercase">{labelCurrent}</span>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded-[6px] bg-[color:var(--color-deep-ocean-700)] text-white flex items-center justify-center">
            <Compass className="w-3.5 h-3.5" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-semibold text-[color:var(--color-ink-900)] truncate">
              {currentStage?.title ?? '—'}
            </span>
            <span className="text-[11px] text-[color:var(--color-muted-foreground)] truncate tracking-wide uppercase">
              {currentStage?.subtitle ?? ''}
            </span>
          </div>
        </div>
      </div>

      {/* Next */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="voyage-eyebrow uppercase">{labelNext}</span>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded-[6px] border border-[color:var(--color-border)] bg-white/60 flex items-center justify-center">
            {nextStage ? (
              <ChevronRight
                className="w-3.5 h-3.5 text-[color:var(--color-muted-gold)]"
                strokeWidth={2.4}
              />
            ) : (
              <CheckCircle2
                className="w-3.5 h-3.5 text-[color:var(--color-success)]"
                strokeWidth={2.2}
              />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className={cn(
                'text-[15px] font-semibold truncate',
                nextStage
                  ? 'text-[color:var(--color-ink-900)]'
                  : 'text-[color:var(--color-muted-foreground)]',
              )}
            >
              {nextStage?.title ?? (compact ? 'Finished' : '航程终点')}
            </span>
            <span className="text-[11px] text-[color:var(--color-muted-foreground)] truncate tracking-wide uppercase">
              {nextStage?.subtitle ?? (compact ? 'all stages complete' : '全部阶段完成')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===============================
 * VoyageStageRibbon — 9 段阶段细线可视化 (非游戏)
 * =============================== */
export function VoyageStageRibbon({ forceStageIndex }: { forceStageIndex?: number }) {
  const { t } = useTranslation();
  const session = useCscaSession();
  const prog = session.progress;
  const cur = forceStageIndex !== undefined ? forceStageIndex : prog.currentStage;

  // 从统一状态源构建 ribbon 状态
  const states = useMemo(() => {
    const result: Record<string, 'done' | 'current' | 'unlocked' | 'locked'> = {};
    const completedSet = new Set(prog.completedStages);
    for (let i = 0; i < VOYAGE_STAGE_ORDER.length; i++) {
      const sid = VOYAGE_STAGE_ORDER[i];
      if (completedSet.has(i)) result[sid] = 'done';
      else if (i === cur) result[sid] = 'current';
      else if (i === cur + 1 && completedSet.has(cur)) result[sid] = 'unlocked';
      else if (prog.completedStages.length === 0 && i === 1) result[sid] = 'unlocked';
      else result[sid] = 'locked';
    }
    return result;
  }, [prog.completedStages, prog.currentStage, cur]);

  return (
    <ol
      className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3"
      aria-label="voyage stages ribbon"
    >
      {VOYAGE_STAGE_ORDER.map((sid, i) => {
        const meta = t.nav.voyage?.[sid as VoyageStageId];
        const status = states[sid];
        const isCurrent = i === cur;
        return (
          <li
            key={sid}
            className={cn(
              'relative min-w-0 flex flex-col gap-1.5 p-3 rounded-[10px] border transition-colors duration-200',
              isCurrent
                ? 'border-[color:var(--color-deep-ocean-700)] bg-white'
                : status === 'done'
                  ? 'border-transparent bg-[color:var(--color-muted)]/60'
                  : status === 'locked'
                    ? 'border-transparent bg-[color:var(--color-muted)]/30 opacity-60'
                    : 'border-[color:var(--color-border)] bg-white/60',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="voyage-eyebrow text-[10px] opacity-75 tracking-widest">
                {meta?.code ?? String(i + 1).padStart(2, '0')}
              </span>
              <span
                aria-hidden
                className={cn(
                  'w-2 h-2 rounded-full',
                  status === 'done' && 'bg-[color:var(--color-success)]',
                  isCurrent && 'bg-[color:var(--color-muted-gold)]',
                  status === 'unlocked' && !isCurrent && 'bg-[color:var(--color-deep-ocean-500)]',
                  status === 'locked' && 'bg-[color:var(--color-muted-foreground)] opacity-40',
                )}
              />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              {status === 'done' ? (
                <CheckCircle2
                  className="w-3.5 h-3.5 shrink-0 text-[color:var(--color-success)]"
                  strokeWidth={2.4}
                />
              ) : status === 'locked' ? (
                <Lock
                  className="w-3.5 h-3.5 shrink-0 text-[color:var(--color-muted-foreground)] opacity-70"
                  strokeWidth={2}
                />
              ) : (
                <div
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 rounded-[3px] border',
                    isCurrent
                      ? 'border-[color:var(--color-muted-gold)] bg-[color:var(--color-muted-gold)]/10'
                      : 'border-[color:var(--color-deep-ocean-500)]/40',
                  )}
                />
              )}
              <span
                className={cn(
                  'text-[13px] font-semibold truncate min-w-0',
                  isCurrent
                    ? 'text-[color:var(--color-deep-ocean)]'
                    : 'text-[color:var(--color-ink-900)]',
                )}
              >
                {meta?.title ?? sid}
              </span>
            </div>
            <span className="text-[11px] text-[color:var(--color-muted-foreground)] truncate tracking-wide uppercase">
              {meta?.subtitle ?? ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ===============================
 * VoyagePageHeader (composed)
 * =============================== */
export interface VoyagePageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  stageId?: VoyageStageId | number;
  breadcrumbExtra?: Array<{ label: string; href?: string }>;
  currentBreadcrumb?: string;
  showProgress?: boolean;
  showRibbon?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function VoyagePageHeader({
  eyebrow,
  title,
  description,
  stageId,
  breadcrumbExtra,
  currentBreadcrumb,
  showProgress = true,
  showRibbon = false,
  actions,
  className,
}: VoyagePageHeaderProps) {
  const forceStageIndex =
    typeof stageId === 'number'
      ? stageId
      : typeof stageId === 'string'
        ? VOYAGE_STAGE_ORDER.indexOf(stageId as any)
        : undefined;

  return (
    <header className={cn('editorial-section relative mb-10 md:mb-14', className)}>
      {/* Hairline separator */}
      <div
        className="absolute left-0 right-0 -top-6 h-px bg-[color:var(--color-border)]/70"
        aria-hidden
      />

      <div className="flex flex-col gap-6">
        <BreadcrumbVoyage extra={breadcrumbExtra} currentLabel={currentBreadcrumb} />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="voyage-eyebrow uppercase mb-3">{eyebrow}</p>
            <h1 className="font-editorial-title text-[32px] md:text-[40px] leading-[1.15] tracking-tight text-[color:var(--color-ink-900)]">
              {title}
            </h1>
            {description && (
              <p className="mt-4 max-w-2xl text-[15px] md:text-[16px] leading-[1.75] text-[color:var(--color-muted-foreground)]">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>

        {showProgress && <VoyageProgress forceStageIndex={forceStageIndex} />}
        {showRibbon && (
          <div className="pt-2">
            <VoyageStageRibbon forceStageIndex={forceStageIndex} />
          </div>
        )}
      </div>
    </header>
  );
}

export default VoyagePageHeader;
