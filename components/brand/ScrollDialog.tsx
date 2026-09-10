'use client';

/**
 * 卷轴弹窗（南洋出海局 · 批次 10）
 *
 * 「展开的卷轴」造型：上下木质轴头 + 朱砂红标题栏（金箔文字 + 「令」字印章 +
 * 合卷关闭按钮）+ 宣纸正文滚动容器。组合 shadcn 风格 dialog 原语。
 *
 * 注意：Radix Dialog 渲染到 document.body（portal），不继承 .brand-light 子树
 * 的 CSS 变量，故显式携带 bg-ricepaper / text-ink / font-brand-body。
 */
import { useEffect, type ReactNode } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/hooks';
import { PixelRollUp } from '@/components/brand/scroll-icons';
import { playSfx } from '@/lib/brand/sfx';

interface ScrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  overlayClassName?: string;
  children: ReactNode;
}

export function ScrollDialog({
  open,
  onOpenChange,
  title,
  description,
  className,
  overlayClassName,
  children,
}: ScrollDialogProps) {
  const { t } = useTranslation();

  // 批次 15：卷轴弹窗展开 → 卷轴声（open 变化时触发一次）
  useEffect(() => {
    if (open) playSfx('scroll-unroll');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={overlayClassName}
        className={cn(
          'max-w-lg gap-0 overflow-hidden p-0 ring-0 bg-ricepaper text-ink font-brand-body',
          className,
        )}
      >
        {/* 上轴头 */}
        <div className="scroll-roller" />
        {/* 标题栏：朱砂底 + 金箔文字 + 令字印章 + 合卷关闭 */}
        <div className="scroll-titlebar">
          <span className="scroll-seal">令</span>
          <DialogTitle className="scroll-title text-lg">{title}</DialogTitle>
          <DialogClose asChild>
            <button type="button" className="scroll-close" aria-label={t.chat.rollUp}>
              <PixelRollUp className="h-6 w-6" />
            </button>
          </DialogClose>
        </div>
        {/* 宣纸正文（自带滚动容器） */}
        <div className="scroll-dialog-body">
          {description && (
            <DialogDescription className="mb-3 leading-relaxed text-sandalwood">
              {description}
            </DialogDescription>
          )}
          {children}
        </div>
        {/* 下轴头 */}
        <div className="scroll-roller" />
      </DialogContent>
    </Dialog>
  );
}
