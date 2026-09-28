import * as React from 'react';

import { cn } from '@/lib/utils';

/* Batch 1 · Card (Maritime Editorial — 减少边框+卡片感)
   非交互卡：white bg + hairline 1px · radius-12 · shadow-xs (柔淡)
   交互卡在调用方加 `card-brand-interactive`
*/
function Card({
  className,
  size = 'default',
  variant = 'default', // 'default' | 'editorial'（paper-100,无阴影,顶部+底部细线）| 'interactive'
  ...props
}: React.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
  variant?: 'default' | 'editorial' | 'interactive';
}) {
  const variantCls =
    variant === 'editorial'
      ? 'bg-[var(--color-paper-100)] text-[var(--color-ink-900)] border-y border-[var(--color-line-200)] shadow-none rounded-none'
      : variant === 'interactive'
        ? 'bg-white text-[var(--color-ink-900)] border border-[var(--color-line-200)] shadow-[0_1px_2px_rgba(18,28,34,0.04)] rounded-[12px] transition-transform duration-200 hover:-translate-y-[1px] hover:border-[var(--color-line-300)] hover:shadow-[0_4px_14px_rgba(7,28,38,0.06)]'
        : 'bg-white text-[var(--color-ink-900)] border border-[var(--color-line-200)] shadow-[0_1px_2px_rgba(18,28,34,0.04)] rounded-[12px]';

  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(
        `gap-6 overflow-hidden py-6 text-sm has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-[12px] *:[img:last-child]:rounded-b-[12px] group/card flex flex-col`,
        variantCls,
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'gap-1 rounded-t-[12px] px-6 group-data-[size=sm]/card:px-4 [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'text-[17px] leading-snug font-semibold tracking-[-0.005em] text-[var(--color-ink-900)] group-data-[size=sm]/card:text-base',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-[var(--color-ink-500)] text-[14px] leading-relaxed', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        'px-6 group-data-[size=sm]/card:px-4 text-[14px] text-[var(--color-ink-700)] leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'rounded-b-[12px] px-6 group-data-[size=sm]/card:px-4 [.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4 flex items-center',
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
