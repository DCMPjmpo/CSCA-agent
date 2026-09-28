/**
 * 知识图谱力导向布局 Worker
 *
 * 接收主线程的节点/边/画布尺寸，在 Worker 内跑 computeForceLayout（CPU 密集），
 * 返回节点像素坐标，避免阻塞浏览器主线程。
 */
/// <reference lib="webworker" />
import {
  computeForceLayout,
  type ForceLayoutEdgeInput,
  type ForceLayoutNodeInput,
} from '@/lib/csca/knowledge-graph-layout';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = (e: MessageEvent) => {
  const { id, nodes, edges, width, height } = e.data as {
    id: string;
    nodes: ForceLayoutNodeInput[];
    edges: ForceLayoutEdgeInput[];
    width: number;
    height: number;
  };

  const positions = computeForceLayout(nodes, edges, width, height);
  workerScope.postMessage({ id, positions });
};
