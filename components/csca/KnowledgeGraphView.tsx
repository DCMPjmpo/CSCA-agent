'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { masteryToLevel } from '@/lib/csca/knowledge-data';

export interface KnowledgeMapItem {
  id: string;
  name: string;
  description: string;
  mastery: number;
  subject: string;
}

interface KnowledgeGraphViewProps {
  topics: KnowledgeMapItem[];
  locale?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  mastered: '#22c55e',
  needs_review: '#eab308',
  weak: '#ef4444',
};

const LEVEL_LABELS: Record<string, Record<string, string>> = {
  mastered: { zh: '已掌握', en: 'Mastered', th: 'เชี่ยวชาญ', vi: 'Đã nắm', id: 'Dikuasai' },
  needs_review: { zh: '待巩固', en: 'Review', th: 'ทบทวน', vi: 'Ôn tập', id: 'Review' },
  weak: { zh: '薄弱', en: 'Weak', th: 'อ่อนแอ', vi: 'Yếu', id: 'Lemah' },
};

export function KnowledgeGraphView({ topics, locale = 'en' }: KnowledgeGraphViewProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const stats = useMemo(() => {
    const weak = topics.filter((t) => masteryToLevel(t.mastery) === 'weak').length;
    const review = topics.filter((t) => masteryToLevel(t.mastery) === 'needs_review').length;
    const mastered = topics.filter((t) => masteryToLevel(t.mastery) === 'mastered').length;
    return { weak, review, mastered };
  }, [topics]);

  useEffect(() => {
    if (!chartRef.current || topics.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const categories = [...new Set(topics.map((t) => t.subject))];
    const nodes = topics.map((t, i) => {
      const level = masteryToLevel(t.mastery);
      return {
        id: t.id || String(i),
        name: t.name,
        value: Math.round(t.mastery * 100),
        category: categories.indexOf(t.subject),
        symbolSize: 28 + t.mastery * 20,
        itemStyle: { color: LEVEL_COLORS[level] },
        label: { show: true, fontSize: 10, color: '#e2e8f0' },
      };
    });

    const edges: { source: string; target: string }[] = [];
    const bySubject = new Map<string, typeof nodes>();
    topics.forEach((t, i) => {
      const list = bySubject.get(t.subject) ?? [];
      list.push(nodes[i]);
      bySubject.set(t.subject, list);
    });
    bySubject.forEach((subjectNodes) => {
      for (let i = 0; i < subjectNodes.length - 1; i++) {
        edges.push({ source: subjectNodes[i].id, target: subjectNodes[i + 1].id });
      }
    });

    instanceRef.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (p: { name?: string; value?: number }) => {
          const topic = topics.find((t) => t.name === p.name);
          const level = topic ? masteryToLevel(topic.mastery) : 'needs_review';
          const label = LEVEL_LABELS[level]?.[locale] ?? LEVEL_LABELS[level]?.en ?? level;
          return `${p.name}<br/>${label}: ${p.value}%`;
        },
      },
      legend: {
        data: categories,
        textStyle: { color: '#94a3b8' },
        bottom: 0,
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          force: { repulsion: 120, edgeLength: 60 },
          data: nodes,
          links: edges,
          categories: categories.map((name) => ({ name })),
          lineStyle: { color: '#475569', width: 1, opacity: 0.6 },
          emphasis: { focus: 'adjacency' },
        },
      ],
    });

    const onResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [topics, locale]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  if (topics.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.weak}</div>
          <div className="text-xs text-red-200">
            {LEVEL_LABELS.weak[locale] ?? LEVEL_LABELS.weak.en}
          </div>
        </div>
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.review}</div>
          <div className="text-xs text-amber-200">
            {LEVEL_LABELS.needs_review[locale] ?? LEVEL_LABELS.needs_review.en}
          </div>
        </div>
        <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.mastered}</div>
          <div className="text-xs text-green-200">
            {LEVEL_LABELS.mastered[locale] ?? LEVEL_LABELS.mastered.en}
          </div>
        </div>
      </div>

      <div
        ref={chartRef}
        className="h-[320px] rounded-xl bg-slate-900/50 border border-slate-700/50"
      />

      <div className="max-h-48 overflow-y-auto space-y-2">
        {topics.map((t) => {
          const level = masteryToLevel(t.mastery);
          return (
            <div
              key={t.id}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30 text-sm"
            >
              <div>
                <span className="text-white font-medium">{t.name}</span>
                <span className="text-slate-500 ml-2 text-xs">{t.subject}</span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: `${LEVEL_COLORS[level]}33`, color: LEVEL_COLORS[level] }}
              >
                {Math.round(t.mastery * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
