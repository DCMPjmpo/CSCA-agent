'use client';

/**
 * StageCard — Editorial Section Tier-2 容器 (Batch 3)
 *
 * 设计原则：
 * - 减少 border + box-shadow 叠加（不做"厚重卡片"）
 * - 通过 间距 / 背景层级 / 标题 / 细线 / 编号 / 留白 建立层级
 * - 真正需要交互的内容（可点击可展开面板）才使用 <StageCard interactive />
 *
 * 结构：
 * ┌─ rule-line (1px hair) ──────────────────────────────────┐
 * │ 编号 + Eyebrow 小字                                      │
 * │ 大标题 (L)                                               │
 * │ 一段解释 (S)                                             │
 * ├─ rule-line ─────────────────────────────────────────────┤
 * │ children (内容体)                                         │
 * └──────────────────────────────────────────────────────────┘
 */
import { cn } from '@/lib/utils';

export interface StageCardProps {
  /** 编号：01 / 02 …；或 icon 节点 */
  index?: string | React.ReactNode;
  eyebrow?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** interactive 会加浅边框/白底/悬停上移 1px；非交互则纯 section rule */
  interactive?: boolean;
  /** accent 变体（用于 AI 面板/重点操作） */
  tone?: 'default' | 'paper' | 'accent' | 'success' | 'warning' | 'danger';
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  as?: 'section' | 'div' | 'article' | 'aside';
}

export function StageCard({
  index,
  eyebrow,
  title,
  subtitle,
  interactive = false,
  tone = 'default',
  actions,
  className,
  bodyClassName,
  children,
  onClick,
  as = 'section',
}: StageCardProps) {
  const Tag = as as any;

  const toneClasses: Record<NonNullable<StageCardProps['tone']>, string> = {
    default: interactive ? 'bg-white border border-[color:var(--color-border)]' : 'bg-transparent',
    paper: interactive
      ? 'bg-[color:var(--color-paper-100)] border border-[color:var(--color-border)]'
      : 'bg-[color:var(--color-paper-100)]/60',
    accent: interactive
      ? 'bg-gradient-to-b from-white to-[color:var(--color-paper-100)]/60 border border-[color:var(--color-muted-gold)]/30'
      : 'bg-[color:var(--color-muted-gold)]/6 border-y border-[color:var(--color-muted-gold)]/20',
    success: interactive
      ? 'bg-white border border-[color:var(--color-status-success)]/20'
      : 'bg-[color:var(--color-status-success)]/5 border-y border-[color:var(--color-status-success)]/15',
    warning: interactive
      ? 'bg-white border border-[color:var(--color-status-warning)]/25'
      : 'bg-[color:var(--color-status-warning)]/6 border-y border-[color:var(--color-status-warning)]/15',
    danger: interactive
      ? 'bg-white border border-[color:var(--color-status-error)]/25'
      : 'bg-[color:var(--color-status-error)]/5 border-y border-[color:var(--color-status-error)]/15',
  };

  const interactiveHover = interactive
    ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-12px_rgba(7,28,38,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]'
    : '';

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'relative w-full group',
        'rounded-[12px] overflow-hidden',
        toneClasses[tone],
        interactiveHover,
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {/* Hairline rule at the very top (for non-interactive default) */}
      {!interactive && tone === 'default' && (
        <div
          className="absolute left-0 right-0 top-0 h-px bg-[color:var(--color-line-200)]"
          aria-hidden
        />
      )}

      <div
        className={cn(
          'flex flex-col gap-4',
          interactive ? 'px-6 py-6 md:px-7 md:py-7' : 'px-0 py-6 md:py-7',
        )}
      >
        {/* Header row */}
        {(index || eyebrow || title || subtitle || actions) && (
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {index !== undefined && (
                <div
                  aria-hidden
                  className="shrink-0 select-none flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-[8px] bg-[color:var(--color-deep-ocean-700)]/95 text-white"
                >
                  {typeof index === 'string' ? (
                    <span className="font-[600] tracking-wider text-[13px] md:text-[14px] font-sans">
                      {index}
                    </span>
                  ) : (
                    index
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1 flex flex-col gap-2">
                {eyebrow && <span className="voyage-eyebrow text-[11px]">{eyebrow}</span>}
                {title !== undefined && (
                  <h3 className="font-editorial-title text-[22px] md:text-[24px] leading-[1.25] text-[color:var(--color-ink-900)]">
                    {title}
                  </h3>
                )}
                {subtitle !== undefined && (
                  <p className="text-[14px] md:text-[15px] leading-[1.7] text-[color:var(--color-muted-foreground)]">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
          </div>
        )}

        {/* Rule line between header and body */}
        {children !== undefined && (index || eyebrow || title || subtitle || actions) && (
          <div
            className="rule-line--strong mx-0 my-1 h-px bg-[color:var(--color-line-200)]"
            aria-hidden
          />
        )}

        {children !== undefined && (
          <div className={cn('w-full min-w-0', bodyClassName)}>{children}</div>
        )}
      </div>
    </Tag>
  );
}

export default StageCard;
