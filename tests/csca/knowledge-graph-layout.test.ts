import { describe, it, expect } from 'vitest';

import {
  computeForceLayout,
  type ForceLayoutNodeInput,
  type ForceLayoutEdgeInput,
} from '@/lib/csca/knowledge-graph-layout';

const WIDTH = 640;
const HEIGHT = 320;

function chainNodes(count: number, prefix = 'n'): ForceLayoutNodeInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    category: 0,
    symbolSize: 28,
  }));
}

function chainEdges(nodes: ForceLayoutNodeInput[]): ForceLayoutEdgeInput[] {
  const edges: ForceLayoutEdgeInput[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ source: nodes[i].id, target: nodes[i + 1].id });
  }
  return edges;
}

describe('computeForceLayout', () => {
  it('returns one position per node, all finite and within canvas bounds', () => {
    const nodes = chainNodes(30);
    const positions = computeForceLayout(nodes, chainEdges(nodes), WIDTH, HEIGHT);

    expect(positions).toHaveLength(30);
    for (const pos of positions) {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(WIDTH);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(HEIGHT);
    }
  });

  it('keeps nodes away from the very edges (symbol margin respected)', () => {
    const nodes = chainNodes(20);
    const positions = computeForceLayout(nodes, chainEdges(nodes), WIDTH, HEIGHT);

    const margin = 28 / 2 + 8; // 22
    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(margin - 1e-6);
      expect(pos.x).toBeLessThanOrEqual(WIDTH - margin + 1e-6);
      expect(pos.y).toBeGreaterThanOrEqual(margin - 1e-6);
      expect(pos.y).toBeLessThanOrEqual(HEIGHT - margin + 1e-6);
    }
  });

  it('is deterministic: identical input yields identical positions', () => {
    const nodes = chainNodes(25);
    const edges = chainEdges(nodes);
    const a = computeForceLayout(nodes, edges, WIDTH, HEIGHT);
    const b = computeForceLayout(nodes, edges, WIDTH, HEIGHT);
    expect(a).toEqual(b);
  });

  it('pulls edge-connected nodes closer than unrelated pairs', () => {
    // 6-node chain + 6 isolated nodes
    const nodes: ForceLayoutNodeInput[] = [...chainNodes(6, 'chain'), ...chainNodes(6, 'iso')];
    const edges = chainEdges(nodes.filter((n) => n.id.startsWith('chain')));
    const positions = computeForceLayout(nodes, edges, WIDTH, HEIGHT, {
      edgeLength: 60,
      iterations: 200,
    });

    const byId = new Map(positions.map((p) => [p.id, p]));
    const dist = (a: string, b: string) => {
      const pa = byId.get(a)!;
      const pb = byId.get(b)!;
      return Math.hypot(pa.x - pb.x, pa.y - pb.y);
    };

    const connectedDistances = edges.map((e) => dist(e.source, e.target));
    const chainIds = nodes.filter((n) => n.id.startsWith('chain')).map((n) => n.id);
    let maxAll = 0;
    for (let i = 0; i < chainIds.length; i++) {
      for (let j = i + 1; j < chainIds.length; j++) {
        maxAll = Math.max(maxAll, dist(chainIds[i], chainIds[j]));
      }
    }

    const maxConnected = Math.max(...connectedDistances);
    expect(maxConnected).toBeLessThan(maxAll);
  });

  it('returns empty array for empty input', () => {
    expect(computeForceLayout([], [], WIDTH, HEIGHT)).toEqual([]);
  });

  it('single node sits at center within bounds', () => {
    const positions = computeForceLayout(
      [{ id: 'only', category: 0, symbolSize: 28 }],
      [],
      WIDTH,
      HEIGHT,
    );
    expect(positions).toHaveLength(1);
    expect(positions[0].id).toBe('only');
    expect(Number.isFinite(positions[0].x)).toBe(true);
  });
});
