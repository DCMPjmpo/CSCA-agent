'use client';

import Link from 'next/link';
import { Check, Lock, Compass } from 'lucide-react';
import { VOYAGE_STAGE_ORDER, type VoyageStageId } from '@/lib/voyage-stages';
import type { VoyageProgressState, VoyageStageStatus } from '@/lib/voyage-progress';
import { cn } from '@/lib/utils';

const STAGE_LINKS: Record<VoyageStageId, string> = {
  stage1: '/csca/voyage#diagnosis',
  stage2: '/csca/voyage#knowledge-map',
  stage3: '/csca/voyage#adaptive-learning',
  stage4: '/csca/voyage#mock-exam',
  stage5: '/csca/voyage#score-analysis',
  stage6: '/csca/voyage#error-review',
  stage7: '/csca/voyage#study-plan',
  stage8: '/csca/voyage#ai-tutor',
  stage9: '/csca/voyage#university-match',
};

interface Props {
  progress: VoyageProgressState;
  isZh: boolean;
}

export function VoyageProgressTracker({ progress, isZh }: Props) {
  const labels = isZh
    ? ['诊断', '知识图', '训练', '模拟', '分析', '纠错', '计划', 'AI助手', '院校']
    : [
        'Diagnosis',
        'Map',
        'Training',
        'Mock',
        'Analysis',
        'Correction',
        'Plan',
        'AI Mate',
        'University',
      ];

  const statusColors: Record<VoyageStageStatus, string> = {
    completed: 'bg-[var(--status-success)] border-[var(--status-success)] text-white',
    in_progress: 'bg-[var(--primary)] border-[var(--primary)] text-white',
    available: 'bg-[var(--card)] border-[var(--muted-gold)] text-[var(--muted-gold)]',
    locked: 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)]',
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="text-sm font-semibold">
            {isZh ? '学习航程进度' : 'Learning Voyage Progress'}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-[var(--primary)]">
            {progress.progressPercent}%
          </span>
          <span className="ml-1 text-xs text-[var(--muted-foreground)]">
            {progress.completedCount}/{progress.totalStages}
          </span>
        </div>
      </div>

      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--muted-gold)] transition-all duration-500"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {VOYAGE_STAGE_ORDER.map((stageId, i) => {
          const status = progress.stageStatus[stageId];
          const isLast = i === VOYAGE_STAGE_ORDER.length - 1;
          const link = STAGE_LINKS[stageId];
          const clickable =
            status === 'completed' || status === 'in_progress' || status === 'available';

          const node = (
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-all',
                  statusColors[status],
                )}
              >
                {status === 'completed' ? (
                  <Check className="h-4 w-4" />
                ) : status === 'locked' ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-[10px] font-medium',
                  status === 'in_progress'
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)]',
                )}
              >
                {labels[i]}
              </span>
            </div>
          );

          return (
            <div key={stageId} className="flex flex-1 items-center">
              {clickable ? (
                <Link href={link} className="flex flex-col items-center">
                  {node}
                </Link>
              ) : (
                <div className="flex flex-col items-center opacity-60">{node}</div>
              )}
              {!isLast && (
                <div
                  className={cn(
                    'mx-1 h-px flex-1 min-w-[12px]',
                    progress.stageStatus[VOYAGE_STAGE_ORDER[i]] === 'completed'
                      ? 'bg-[var(--status-success)]'
                      : 'bg-[var(--border)]',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
