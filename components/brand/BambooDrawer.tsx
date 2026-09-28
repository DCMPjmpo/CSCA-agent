'use client';

/**
 * 竹简抽屉（南洋出海局 · 批次 10）
 *
 * 从右侧滑出的抽屉：背景竹简纹理（BAMBOO_BG），滑入动画模拟卷轴展开
 * （slide-in-from-right + duration-300，覆盖 dialog 基座 zoom/duration）。
 * 顶/底木质轴头 + 朱砂标题栏（令字印章 + 合卷关闭）与 ScrollDialog 共用。
 *
 * Radix Dialog portal 不继承 .brand-light CSS 变量，故显式携带
 * bg-indigo-deep / text-ricepaper / font-brand-body；竹简纹经 inline style。
 */
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/hooks';
import { PixelRollUp } from '@/components/brand/scroll-icons';
import { BAMBOO_BG, BAMBOO_BG_SIZE } from '@/components/brand/bamboo-textures';
import { playSfx } from '@/lib/brand/sfx';

interface BambooDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  className?: string;
  overlayClassName?: string;
  children: ReactNode;
}

export function BambooDrawer({
  open,
  onOpenChange,
  title,
  className,
  overlayClassName,
  children,
}: BambooDrawerProps) {
  const { t } = useTranslation();

  // 批次 15：竹简抽屉展开 → 竹简声（open 变化时触发一次）
  useEffect(() => {
    if (open) playSfx('scroll-open');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={overlayClassName ?? 'bg-black/40'}
        className={cn(
          'fixed right-0 bottom-0 top-0 left-auto z-50 flex h-full max-w-sm w-full translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-l-2 border-gold-leaf/30 p-0 ring-0 bg-indigo-deep text-ricepaper font-brand-body',
          'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-right data-open:zoom-in-100 duration-300',
          'data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-right data-closed:zoom-out-100',
          className,
        )}
        style={
          {
            backgroundImage: BAMBOO_BG,
            backgroundSize: BAMBOO_BG_SIZE,
            imageRendering: 'pixelated',
          } as CSSProperties
        }
      >
        {/* 上轴头 */}
        <div className="scroll-roller" />
        {/* 标题栏：朱砂底 + 金箔文字 + 令字印章 + 合卷关闭 */}
        <div className="scroll-titlebar">
          <span className="scroll-seal">令</span>
          {title && <DialogTitle className="scroll-title text-lg">{title}</DialogTitle>}
          <DialogClose asChild>
            <button type="button" className="scroll-close" aria-label={t.chat.rollUp}>
              <PixelRollUp className="h-6 w-6" />
            </button>
          </DialogClose>
        </div>
        {/* 竹简正文（自带滚动） */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-ricepaper">{children}</div>
        {/* 下轴头 */}
        <div className="scroll-roller" />
      </DialogContent>
    </Dialog>
  );
}
