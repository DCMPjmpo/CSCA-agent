'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Filter,
  BarChart3,
  Target,
} from 'lucide-react';
import { BrandShell } from '@/components/brand/BrandShell';
import { useTranslation } from '@/lib/i18n/hooks';
import {
  getErrorRecords,
  deleteErrorRecord,
  clearAllErrorRecords,
  type ErrorRecord,
} from '@/lib/csca/error-analysis-core';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function WrongAnswerCenterPage() {
  const { t, locale } = useTranslation();
  const isZh = locale.startsWith('zh');
  const w = ((t as Record<string, unknown>).wrongAnswerCenter as Record<string, string>) || {};

  const [records, setRecords] = useState<ErrorRecord[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);

  useEffect(() => {
    setRecords(getErrorRecords());
    const onWrite = () => setRecords(getErrorRecords());
    window.addEventListener('cscaErrorRecordsSaved', onWrite as EventListener);
    return () => window.removeEventListener('cscaErrorRecordsSaved', onWrite as EventListener);
  }, []);

  const subjects = useMemo(() => {
    const set = new Set(records.map((r) => r.subject).filter(Boolean));
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    let list = records;
    if (subjectFilter !== 'all') list = list.filter((r) => r.subject === subjectFilter);
    if (unresolvedOnly) list = list.filter((r) => r.reviewCount < 1);
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [records, subjectFilter, unresolvedOnly]);

  const stats = useMemo(() => {
    const total = records.length;
    const bySubject: Record<string, number> = {};
    records.forEach((r) => {
      const s = r.subject || 'Unknown';
      bySubject[s] = (bySubject[s] || 0) + 1;
    });
    const resolved = records.filter((r) => r.reviewCount > 0).length;
    return { total, bySubject, resolved };
  }, [records]);

  const handleDelete = (id: string) => {
    deleteErrorRecord(id);
    setRecords(getErrorRecords());
  };

  const handleClearAll = () => {
    if (records.length === 0) return;
    clearAllErrorRecords();
    setRecords([]);
  };

  // Empty state
  if (records.length === 0) {
    return (
      <BrandShell>
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
          <PageHeader
            isZh={isZh}
            title={w.title || 'Wrong Answer Center'}
            subtitle={w.subtitle || 'Review and correct your mistakes'}
          />
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-[var(--status-success)]" />
              <h2 className="mt-4 text-xl font-semibold">
                {isZh ? '还没有错题' : 'No Errors Yet'}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {w.empty || 'No errors yet — complete a mock exam first'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/csca/voyage#mock-exam">
                  <Button>
                    <BookOpen className="mr-2 h-4 w-4" />
                    {isZh ? '去模拟考试' : 'Take Mock Exam'}
                  </Button>
                </Link>
                <Link href="/csca">
                  <Button variant="outline">{isZh ? '返回仪表盘' : 'Back to Dashboard'}</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </BrandShell>
    );
  }

  return (
    <BrandShell>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <PageHeader
          isZh={isZh}
          title={w.title || 'Wrong Answer Center'}
          subtitle={w.subtitle || 'Review and correct your mistakes'}
        />

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {w.statsTotalErrors || 'Total Errors'}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {w.statsBySubject || 'By Subject'}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">{Object.keys(stats.bySubject).length}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {w.statsResolved || 'Resolved'}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {stats.resolved}
                <span className="ml-1 text-sm font-normal text-[var(--muted-foreground)]">
                  / {stats.total}
                </span>
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--muted-foreground)]" />
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="all">{w.filterAll || 'All'}</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <input
                type="checkbox"
                checked={unresolvedOnly}
                onChange={(e) => setUnresolvedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              {w.unresolvedOnly || 'Unresolved only'}
            </label>
            <div className="ml-auto flex gap-2">
              <Link href="/csca/voyage#adaptive-learning">
                <Button variant="outline" size="sm">
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  {w.retryAll || 'Retry All'}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                {isZh ? '清空' : 'Clear All'}
              </Button>
            </div>
          </div>

          {/* Error list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
                {isZh ? '当前筛选下无记录' : 'No records match the current filter'}
              </p>
            ) : (
              filtered.map((r) => (
                <ErrorCard key={r.id} record={r} isZh={isZh} w={w} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      </div>
    </BrandShell>
  );
}

function PageHeader({ isZh, title, subtitle }: { isZh: boolean; title: string; subtitle: string }) {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
              {isZh ? 'CSCA 学习航海' : 'CSCA Learning Voyage'}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</p>
          </div>
          <Link href="/csca">
            <Button variant="ghost" size="sm">
              {isZh ? '返回' : 'Back'}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({
  record,
  isZh,
  w,
  onDelete,
}: {
  record: ErrorRecord;
  isZh: boolean;
  w: Record<string, string>;
  onDelete: (id: string) => void;
}) {
  const isResolved = record.reviewCount > 0;
  const date = new Date(record.timestamp).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={cn(
        'rounded-xl border bg-[var(--card)] p-5 transition-colors',
        isResolved ? 'border-[var(--status-success)]/30 opacity-80' : 'border-[var(--border)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Tags */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
              {record.subject || '—'}
            </span>
            {record.module && (
              <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                {record.module}
              </span>
            )}
            {isResolved && (
              <span className="rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-xs text-[var(--status-success)]">
                {isZh ? '已复习' : 'Reviewed'} ×{record.reviewCount}
              </span>
            )}
            <span className="ml-auto text-xs text-[var(--muted-foreground)]">{date}</span>
          </div>

          {/* Question */}
          <p className="text-sm font-medium leading-relaxed">{record.question}</p>

          {/* Answer comparison */}
          <div className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-[var(--status-error)]/5 px-3 py-1.5">
              <span className="text-xs text-[var(--muted-foreground)]">
                {isZh ? '你的答案' : 'Your answer'}:
              </span>
              <p className="font-medium text-[var(--status-error)]">{String(record.userAnswer)}</p>
            </div>
            <div className="rounded-lg bg-[var(--status-success-bg)] px-3 py-1.5">
              <span className="text-xs text-[var(--muted-foreground)]">
                {isZh ? '正确答案' : 'Correct'}:
              </span>
              <p className="font-medium text-[var(--status-success)]">
                {String(record.correctAnswer)}
              </p>
            </div>
          </div>

          {/* Explanation */}
          {record.explanation && (
            <div className="mt-3 rounded-lg bg-[var(--muted)]/50 px-3 py-2">
              <p className="text-xs text-[var(--muted-foreground)]">
                {isZh ? '解析' : 'Explanation'}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed">{record.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3">
        <Link
          href={`/csca/voyage#adaptive-learning?subject=${encodeURIComponent(record.subject || '')}`}
        >
          <Button variant="outline" size="sm">
            <Target className="mr-1.5 h-3.5 w-3.5" />
            {w.retryOne || 'Retry'}
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={() => onDelete(record.id)}>
          {isZh ? '删除' : 'Delete'}
        </Button>
        {isResolved ? (
          <span className="ml-auto flex items-center gap-1 text-xs text-[var(--status-success)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isZh ? '已掌握' : 'Mastered'}
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <AlertCircle className="h-3.5 w-3.5" />
            {w.hintRetry || 'Re-attempt similar questions'}
          </span>
        )}
      </div>
    </div>
  );
}
