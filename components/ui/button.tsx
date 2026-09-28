import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 border border-transparent bg-clip-padding text-[14px] font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        /* Primary · 深海蓝 #0B2834 背景 + Paper 纸白文字 · 符合 RED LINE 六·按钮 */
        default:
          'rounded-[8px] bg-[var(--color-deep-ocean-800)] text-[var(--color-paper-50)] border-[var(--color-deep-ocean-800)] shadow-[0_1px_2px_rgba(7,28,38,0.12)] duration-200 transition-transform transition-colors hover:-translate-y-[1px] hover:bg-[var(--color-deep-ocean-700)] hover:border-[var(--color-deep-ocean-700)] hover:shadow-[0_2px_6px_rgba(7,28,38,0.18)] active:translate-y-0 active:shadow-[0_1px_2px_rgba(7,28,38,0.14)]',
        outline:
          'rounded-[8px] border-[var(--color-line-300)] bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground shadow-xs duration-200 transition-transform transition-colors hover:-translate-y-[1px]',
        /* Secondary · 透明 / 细边框 · Paper 背景 */
        secondary:
          'rounded-[8px] bg-[#FFFFFF] text-[var(--color-ink-900)] border-[var(--color-line-300)] shadow-[0_1px_2px_rgba(18,28,34,0.04)] duration-200 transition-transform transition-colors hover:-translate-y-[1px] hover:bg-[var(--color-paper-100)] hover:shadow-[0_2px_5px_rgba(18,28,34,0.06)] aria-expanded:bg-[var(--color-paper-100)] aria-expanded:text-[var(--color-ink-900)]',
        ghost:
          'rounded-[8px] text-[var(--color-ink-700)] border-[var(--color-line-300)] duration-200 transition-transform transition-colors hover:bg-[rgba(7,28,38,0.03)] hover:text-[var(--color-deep-ocean-800)] hover:border-[var(--color-deep-ocean-700)] hover:-translate-y-[1px] aria-expanded:bg-[rgba(7,28,38,0.03)] aria-expanded:text-[var(--color-deep-ocean-800)]',
        /* Accent · 低饱和金色 #C7A54A · 只在 CTA 极少处使用 */
        accent:
          'rounded-[8px] bg-[var(--color-muted-gold)] text-[var(--color-ink-900)] border-[var(--color-muted-gold)] duration-200 transition-transform transition-colors hover:-translate-y-[1px] hover:bg-[var(--color-muted-gold-400)] hover:border-[var(--color-muted-gold-400)] active:translate-y-0',
        destructive:
          'rounded-[8px] bg-[var(--color-status-error)] text-white border-[var(--color-status-error)] shadow-[0_1px_2px_rgba(168,50,50,0.18)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 duration-200 transition-transform transition-colors hover:-translate-y-[1px] hover:bg-[#902828] hover:border-[#902828] hover:shadow-[0_2px_6px_rgba(168,50,50,0.25)] active:translate-y-0 dark:bg-[var(--color-status-error)]',
        link: 'text-[var(--color-deep-ocean-800)] underline-offset-4 hover:underline',
        /* 兼容历史游戏品牌按钮：→ Primary · 统一现代 */
        voyage:
          'rounded-[8px] bg-[var(--color-deep-ocean-800)] text-[var(--color-paper-50)] border-[var(--color-deep-ocean-800)] shadow-[0_1px_2px_rgba(7,28,38,0.12)] duration-200 transition-transform transition-colors hover:-translate-y-[1px] hover:bg-[var(--color-deep-ocean-700)] hover:border-[var(--color-deep-ocean-700)] hover:shadow-[0_2px_6px_rgba(7,28,38,0.18)]',
      },
      size: {
        default:
          'h-10 gap-2 px-[18px] in-data-[slot=button-group]:rounded-[6px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        xs: "h-7 gap-1 rounded-[6px] px-[10px] text-xs in-data-[slot=button-group]:rounded-[6px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 rounded-[6px] px-3 text-sm in-data-[slot=button-group]:rounded-[6px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        lg: 'h-11 gap-2 px-5 text-[15px] has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6',
        icon: 'size-10 rounded-[8px]',
        'icon-xs':
          "size-6 rounded-[6px] in-data-[slot=button-group]:rounded-[6px] [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 rounded-[6px] in-data-[slot=button-group]:rounded-[6px]',
        'icon-lg': 'size-11 rounded-[10px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export { Button, buttonVariants };
