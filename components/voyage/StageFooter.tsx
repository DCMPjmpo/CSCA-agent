'use client';

/**
 * StageFooter — 每个阶段底部统一操作区 (Batch 3)
 *
 * 结构：左（返回 / secondary） —— 细线分隔 —— 右（下一步 / primary）
 * 中间可放辅助信息：进度百分比 · 提示 · 上次保存时间
 *
 * 不使用游戏式按钮；按钮交互按全局规定（150-250ms / 1-2px 上移 / 不 bounce）
 */
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StageFooterProps {
  /** left / back */
  backHref?: string;
  backLabel?: React.ReactNode;
  onBack?: () => void;
  backDisabled?: boolean;
  backVariant?: ButtonProps['variant'];

  /** right / next */
  nextHref?: string;
  nextLabel?: React.ReactNode;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextVariant?: ButtonProps['variant'];
  nextLoading?: boolean;

  /** middle */
  meta?: React.ReactNode;

  /** extra center-right actions (Save, etc.) */
  extra?: React.ReactNode;

  className?: string;
  /** 纯非交互 rule line（没有按钮时） */
  minimal?: boolean;
}

export function StageFooter({
  backHref,
  backLabel,
  onBack,
  backDisabled,
  backVariant = 'ghost',
  nextHref,
  nextLabel,
  onNext,
  nextDisabled,
  nextVariant = 'default',
  nextLoading,
  meta,
  extra,
  className,
  minimal = false,
}: StageFooterProps) {
  if (minimal) {
    return (
      <footer
        className={cn(
          'mt-10 md:mt-14 pt-6',
          'border-t border-[color:var(--color-line-200)]',
          className,
        )}
      >
        {meta && (
          <div className="text-[12px] text-[color:var(--color-muted-foreground)] flex items-center justify-between">
            {meta}
          </div>
        )}
      </footer>
    );
  }

  const BackContent = (
    <>
      <ArrowLeft className="w-4 h-4" strokeWidth={2.1} aria-hidden />
      <span>{backLabel ?? '返回'}</span>
    </>
  );
  const NextContent = (
    <>
      <span>{nextLabel ?? '下一步'}</span>
      {!nextLoading && <ArrowRight className="w-4 h-4" strokeWidth={2.1} aria-hidden />}
      {nextLoading && (
        <span
          className="w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin"
          aria-hidden
        />
      )}
    </>
  );

  return (
    <footer
      data-testid="stage-footer"
      className={cn(
        'mt-10 md:mt-14 pt-6 md:pt-7',
        'border-t border-[color:var(--color-line-200)]',
        'flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4',
        className,
      )}
    >
      {/* LEFT */}
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        {backHref && !onBack ? (
          <Button asChild variant={backVariant} disabled={backDisabled} className="gap-1.5">
            <Link href={backHref}>{BackContent}</Link>
          </Button>
        ) : onBack ? (
          <Button
            variant={backVariant}
            disabled={backDisabled}
            onClick={onBack}
            className="gap-1.5"
          >
            {BackContent}
          </Button>
        ) : null}

        {meta && (
          <div className="text-[12px] text-[color:var(--color-muted-foreground)] truncate">
            {meta}
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">
        {extra}
        {nextHref && !onNext ? (
          <Button
            asChild
            variant={nextVariant}
            disabled={nextDisabled || nextLoading}
            className="gap-2"
          >
            <Link href={nextHref}>{NextContent}</Link>
          </Button>
        ) : onNext ? (
          <Button
            variant={nextVariant}
            disabled={nextDisabled || nextLoading}
            onClick={onNext}
            className="gap-2"
          >
            {NextContent}
          </Button>
        ) : null}
      </div>
    </footer>
  );
}

/** 常用 Save action 按钮（放在 extra 中） */
export function StageFooterSaveAction({
  onClick,
  disabled,
  label = '保存',
}: {
  onClick?: () => void;
  disabled?: boolean;
  label?: React.ReactNode;
}) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled} className="gap-1.5">
      <Save className="w-4 h-4" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </Button>
  );
}

export default StageFooter;
