'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// [TRA-FIX] 按需引入 echarts，替代全量 import * as echarts from 'echarts'（全量约 1MB）
import * as echarts from 'echarts/core'; // [TRA-FIX]
import { GraphChart } from 'echarts/charts'; // [TRA-FIX]
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'; // [TRA-FIX]
import { CanvasRenderer } from 'echarts/renderers'; // [TRA-FIX]
import { masteryToLevel } from '@/lib/csca/knowledge-data';
// [WORKER] 力导向布局在 Web Worker 中执行（computeForceLayout 用于主线程兜底）
import { computeForceLayout, type ForcePosition } from '@/lib/csca/knowledge-graph-layout';

// [TRA-FIX] 注册知识图谱用到的模块：Graph 图 + Tooltip/Grid/Legend/Title + Canvas 渲染器
echarts.use([
  GraphChart, // [TRA-FIX]
  TitleComponent, // [TRA-FIX]
  TooltipComponent, // [TRA-FIX]
  GridComponent, // [TRA-FIX]
  LegendComponent, // [TRA-FIX]
  CanvasRenderer, // [TRA-FIX]
]);

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
  mastered: '#5A8F6E', // 竹青绿：已掌握
  needs_review: '#C9A227', // 金箔黄：待巩固
  weak: '#E67E22', // 告警橙：薄弱
};

const LEVEL_LABELS: Record<string, Record<string, string>> = {
  mastered: { zh: '已掌握', en: 'Mastered', th: 'เชี่ยวชาญ', vi: 'Đã nắm', id: 'Dikuasai' },
  needs_review: { zh: '待巩固', en: 'Review', th: 'ทบทวน', vi: 'Ôn tập', id: 'Review' },
  weak: { zh: '薄弱', en: 'Weak', th: 'อ่อนแอ', vi: 'Yếu', id: 'Lemah' },
};

interface GraphNode {
  id: string;
  name: string;
  value: number;
  category: number;
  symbolSize: number;
  itemStyle: { color: string };
  label: { show: boolean; fontSize: number; color: string };
}

interface LayoutData {
  nodes: GraphNode[];
  edges: { source: string; target: string }[];
  categories: string[];
}

export function KnowledgeGraphView({ topics, locale = 'en' }: KnowledgeGraphViewProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const layoutDataRef = useRef<LayoutData>({ nodes: [], edges: [], categories: [] });
  const positionsRef = useRef<ForcePosition[]>([]);
  const sizeRef = useRef({ width: 0, height: 0 });
  const runIdRef = useRef(0);
  const [layoutPending, setLayoutPending] = useState(true);

  const stats = useMemo(() => {
    const weak = topics.filter((t) => masteryToLevel(t.mastery) === 'weak').length;
    const review = topics.filter((t) => masteryToLevel(t.mastery) === 'needs_review').length;
    const mastered = topics.filter((t) => masteryToLevel(t.mastery) === 'mastered').length;
    return { weak, review, mastered };
  }, [topics]);

  const renderGraph = useCallback(
    (data: LayoutData, positions: ForcePosition[]) => {
      const chart = instanceRef.current;
      if (!chart) return;
      positionsRef.current = positions;
      const posById = new Map(positions.map((p) => [p.id, p]));
      const nodesWithPos = data.nodes.map((n) => {
        const pos = posById.get(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      });

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (p: { name?: string; value?: number }) => {
            const topic = topics.find((t) => t.name === p.name);
            const level = topic ? masteryToLevel(topic.mastery) : 'needs_review';
            const label = LEVEL_LABELS[level]?.[locale] ?? LEVEL_LABELS[level]?.en ?? level;
            return `${p.name}<br/>${label}: ${p.value}%`;
          },
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderColor: 'rgba(139,90,43,0.3)',
          textStyle: { color: '#1A1A1A' },
        },
        legend: {
          data: data.categories,
          textStyle: { color: '#8B5A2B' },
          bottom: 0,
        },
        series: [
          {
            // [WORKER] 布局由 Worker 内的 computeForceLayout 计算，echarts 不再做力导向模拟
            type: 'graph',
            layout: 'none',
            roam: true,
            draggable: true,
            data: nodesWithPos,
            links: data.edges,
            categories: data.categories.map((name) => ({ name })),
            lineStyle: { color: 'rgba(139,90,43,0.4)', width: 1, opacity: 0.6 },
            emphasis: { focus: 'adjacency' },
          },
        ],
      });
      chart.resize();
    },
    [topics, locale],
  );

  const runLayout = useCallback(() => {
    const container = chartRef.current;
    const data = layoutDataRef.current;
    if (!container || data.nodes.length === 0) return;

    const runId = ++runIdRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 320;
    sizeRef.current = { width, height };

    let done = false;
    const finish = (positions: ForcePosition[]) => {
      if (done || runId !== runIdRef.current) return;
      done = true;
      renderGraph(data, positions);
      setLayoutPending(false);
    };
    const fallback = () => finish(computeForceLayout(data.nodes, data.edges, width, height));

    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('./knowledge-graph.worker.ts', import.meta.url));
    } catch {
      // Worker 不可用（罕见）：主线程内联计算兜底，保证图谱必现。
      // 异步执行，避免在 effect 内同步 setState（react-hooks/set-state-in-effect）
      setTimeout(fallback, 0);
      return;
    }

    const onMessage = (e: MessageEvent) => {
      if (e.data?.id !== runId) return;
      if (timeoutId) clearTimeout(timeoutId);
      worker?.terminate();
      finish(e.data.positions);
    };
    const onError = () => {
      if (timeoutId) clearTimeout(timeoutId);
      worker?.terminate();
      fallback();
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ id: runId, nodes: data.nodes, edges: data.edges, width, height });

    // 超时兜底：Worker 迟迟无响应时回退主线程
    const timeoutId = setTimeout(() => {
      worker?.terminate();
      fallback();
    }, 1200);
  }, [renderGraph]);

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
        label: { show: true, fontSize: 10, color: '#1A1A1A' },
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

    layoutDataRef.current = { nodes, edges, categories };
    runLayout();
  }, [topics, locale, runLayout]);

  useEffect(() => {
    const onResize = () => {
      const chart = instanceRef.current;
      const container = chartRef.current;
      if (!chart || !container) return;
      const { width, height } = sizeRef.current;
      const positions = positionsRef.current;
      if (positions.length === 0 || width <= 0 || height <= 0) {
        chart.resize();
        return;
      }
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth <= 0 || newHeight <= 0) return;
      // 按比例缩放已存坐标，避免 resize 后节点错位
      const scaled = positions.map((p) => ({
        ...p,
        x: (p.x / width) * newWidth,
        y: (p.y / height) * newHeight,
      }));
      positionsRef.current = scaled;
      sizeRef.current = { width: newWidth, height: newHeight };
      const posById = new Map(scaled.map((p) => [p.id, p]));
      chart.setOption({
        series: [
          {
            type: 'graph',
            data: layoutDataRef.current.nodes.map((n) => {
              const pos = posById.get(n.id);
              return pos ? { ...n, x: pos.x, y: pos.y } : n;
            }),
          },
        ],
      });
      chart.resize();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
        <div className="bg-warning/10 border border-warning/40 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-warning">{stats.weak}</div>
          <div className="text-xs text-warning">
            {LEVEL_LABELS.weak[locale] ?? LEVEL_LABELS.weak.en}
          </div>
        </div>
        <div className="bg-gold-leaf/10 border border-gold-leaf/40 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gold-leaf">{stats.review}</div>
          <div className="text-xs text-gold-leaf">
            {LEVEL_LABELS.needs_review[locale] ?? LEVEL_LABELS.needs_review.en}
          </div>
        </div>
        <div className="bg-bamboo/10 border border-bamboo/40 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-bamboo">{stats.mastered}</div>
          <div className="text-xs text-bamboo">
            {LEVEL_LABELS.mastered[locale] ?? LEVEL_LABELS.mastered.en}
          </div>
        </div>
      </div>

      <div className="relative h-[320px]">
        <div
          ref={chartRef}
          className="h-full w-full rounded-xl bg-white/70 border border-sandalwood/25"
        />
        {layoutPending && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-sandalwood pointer-events-none">
            Loading…
          </div>
        )}
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2">
        {topics.map((t) => {
          const level = masteryToLevel(t.mastery);
          return (
            <div
              key={t.id}
              className="flex items-center justify-between p-2 rounded-lg bg-white/70 text-sm"
            >
              <div>
                <span className="text-ink font-medium">{t.name}</span>
                <span className="text-sandalwood ml-2 text-xs">{t.subject}</span>
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
