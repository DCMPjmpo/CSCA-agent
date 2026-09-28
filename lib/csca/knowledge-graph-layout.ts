/**
 * 知识图谱力导向布局核心模块（纯函数，无副作用、无 DOM 依赖）
 *
 * 在 Web Worker 中执行，替代 echarts 主线程的 `layout:'force'` 模拟。
 * 确定性算法（不用 Math.random），同输入必得同输出，便于单测与复现。
 */

export interface ForceLayoutNodeInput {
  id: string;
  category?: number;
  symbolSize?: number;
}

export interface ForceLayoutEdgeInput {
  source: string;
  target: string;
}

export interface ForcePosition {
  id: string;
  x: number;
  y: number;
}

export interface ForceLayoutOptions {
  /** 斥力常数 k（默认按面积/节点数自动推算：sqrt(area/n)） */
  repulsion?: number;
  /** 弹簧平衡长度（像素），默认 60 */
  edgeLength?: number;
  /** 迭代次数，默认 200 */
  iterations?: number;
  /** 向心引力系数，默认 0.02 */
  gravity?: number;
}

export function computeForceLayout(
  nodes: ForceLayoutNodeInput[],
  edges: ForceLayoutEdgeInput[],
  width: number,
  height: number,
  options: ForceLayoutOptions = {},
): ForcePosition[] {
  const n = nodes.length;
  if (n === 0) return [];

  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const iterations = options.iterations ?? 200;
  const edgeLength = options.edgeLength ?? 60;
  const gravity = options.gravity ?? 0.02;
  const area = safeWidth * safeHeight;
  const k = options.repulsion ?? Math.sqrt(area / Math.max(n, 1));

  // id → 下标索引
  const idToIndex = new Map<string, number>();
  nodes.forEach((node, i) => idToIndex.set(node.id, i));

  // 邻接表（无向）
  const adjacency: number[][] = Array.from({ length: n }, () => []);
  for (const edge of edges) {
    const u = idToIndex.get(edge.source);
    const v = idToIndex.get(edge.target);
    if (u === undefined || v === undefined || u === v) continue;
    adjacency[u].push(v);
    adjacency[v].push(u);
  }

  // 确定性初始位置：太阳花分布（黄金角），避免随机初始导致布局不稳定
  const cx = safeWidth / 2;
  const cy = safeHeight / 2;
  const maxRadius = Math.min(safeWidth, safeHeight) * 0.45;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const positions: { x: number; y: number }[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const angle = i * goldenAngle;
    const radius = n > 1 ? maxRadius * Math.sqrt(i / (n - 1)) : 0;
    positions[i] = {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  }

  const disp: { x: number; y: number }[] = new Array(n);

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) disp[i] = { x: 0, y: 0 };

    // 温度随迭代冷却：初期大步分离，后期精细收敛
    const temperature = k * (1 - iter / iterations) * 0.9 + 0.5;

    // 斥力（O(N²) 库仑力）
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = positions[i].x - positions[j].x;
        let dy = positions[i].y - positions[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.001) {
          // 确定性偏移避免 NaN / 完全重叠
          dx = (j - i) % 2 === 0 ? 0.5 : -0.5;
          dy = 0.5;
          dist = Math.sqrt(dx * dx + dy * dy);
        }
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[i].x += fx;
        disp[i].y += fy;
        disp[j].x -= fx;
        disp[j].y -= fy;
      }
    }

    // 弹簧引力（沿边，趋近 edgeLength）
    const springStrength = 0.08;
    for (let u = 0; u < n; u++) {
      for (const v of adjacency[u]) {
        if (v <= u) continue; // 每条边只处理一次
        const dx = positions[u].x - positions[v].x;
        const dy = positions[u].y - positions[v].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6;
        const force = (dist - edgeLength) * springStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[u].x -= fx;
        disp[u].y -= fy;
        disp[v].x += fx;
        disp[v].y += fy;
      }
    }

    // 向心引力，防止整体漂移出画布
    for (let i = 0; i < n; i++) {
      disp[i].x += (cx - positions[i].x) * gravity;
      disp[i].y += (cy - positions[i].y) * gravity;
    }

    // 按温度限制单步最大位移
    for (let i = 0; i < n; i++) {
      const norm = Math.sqrt(disp[i].x * disp[i].x + disp[i].y * disp[i].y);
      if (norm > 0) {
        const maxMove = Math.min(norm, temperature);
        positions[i].x += (disp[i].x / norm) * maxMove;
        positions[i].y += (disp[i].y / norm) * maxMove;
      }
    }
  }

  // 按节点半径 + 内边距 clamp 到画布内
  return nodes.map((node, i) => {
    const symbolSize = node.symbolSize ?? 32;
    const margin = symbolSize / 2 + 8;
    return {
      id: node.id,
      x: Math.min(Math.max(positions[i].x, margin), safeWidth - margin),
      y: Math.min(Math.max(positions[i].y, margin), safeHeight - margin),
    };
  });
}
