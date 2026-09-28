/**
 * 南洋出海局 · 府邸 5 层纵深场景像素层（批次 14）
 *
 * 议事圆桌（AdvisorHall）的场景底与前景：
 * - FarScene  远景层：窗棂外的南洋港口（落日/宝船桅杆/远洋帆影/海鸥），整层 opacity .13
 * - MidScene  中景层：府邸大厅主体（木质梁柱/「南洋出海局」牌匾/航海图卷轴/烛台微闪/
 *             窗棂框）。注意：本层背景必须透明 —— 大厅的「墙」就是远景，窗棂格间透出港口。
 * - SeaChartTable 近景层：中央南洋海图沙盘（东南亚像素地图轮廓 + 金航线 + 巡航船 +
 *             8 港口据点标记），替代批次 13 的装饰圆桌 `.hall-ellipse`。
 *
 * 像素范式沿用 advisors.tsx：字符网格 → 1×1 `<rect>` SVG（crispEdges）。
 * `PALETTE`/`P()` 是 advisors.tsx 模块私有，故此处本地复刻 Px() + 同款 12 色板；
 * 海鸥/烛台为本地新增像素图标（不动 sandbox-icons.tsx，导出页零回归）。
 */
'use client';

import type { ReactNode, SVGProps } from 'react';
import { PixelFrame } from './bamboo-icons';
import { PixelFlag, PixelShip, PixelTreasureShip, PixelScroll } from './sandbox-icons';
import { SEA_BG, SEA_BG_SIZE, CHART_GRID, CHART_BG_SIZE } from './sandbox-textures';
import { MAP_W, MAP_H, SEA_PORTS, SEA_ROUTE, type PortId } from '@/lib/brand/sea-ports';

/* ------------------------------------------------------------
   本地像素渲染器（复刻 advisors.tsx 私有 P()/PALETTE）
   ------------------------------------------------------------ */
const PALETTE: Record<string, string> = {
  K: '#1A1A1A',
  P: '#F5F0E6',
  I: '#1E3A5F',
  D: '#162B47',
  G: '#C9A227',
  V: '#B82222',
  B: '#5A8F6E',
  S: '#8B5A2B',
  T: '#0E7490',
  F: '#5C6B73',
  W: '#FFFFFF',
  O: '#E67E22',
};

function Px(rows: string[], ox = 0, oy = 0): ReactNode {
  const rects: ReactNode[] = [];
  rows.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const c = line[x];
      if (c === '.' || c === ' ') continue;
      const fill = PALETTE[c];
      if (!fill) throw new Error(`[scene] 未知颜色 "${c}" @${x},${y}`);
      rects.push(<rect key={`${x},${y}`} x={x + ox} y={y + oy} width={1} height={1} fill={fill} />);
    }
  });
  return rects;
}

/* ---- 行构造器：强制 88 列宽，防错位 ---- */
function row(...seg: Array<[string, number]>): string {
  let s = '';
  for (const [ch, n] of seg) s += ch.repeat(n);
  if (s.length !== MAP_W) throw new Error(`[scene] row length ${s.length} ≠ ${MAP_W}`);
  return s;
}

/* ------------------------------------------------------------
   东南亚像素地图轮廓（只画陆地，海面由沙盘 tile 背景承担）
   色约定：S=大陆/中南半岛、B=岛屿（苏门答腊/爪哇/婆罗洲/锡兰）；
   coastify() 把濒海陆地描为 K 形成海岸线。
   ------------------------------------------------------------ */
const SEA_ROWS: string[] = [
  row(['.', 88]),
  row(['.', 88]),
  row(['.', 88]),
  row(['.', 88]),
  row(['.', 88]),
  row(['.', 88]),
  row(['.', 88]),
  row(['.', 88]),
  /* y8-36 大陆 + 马来半岛（自顶向右下收窄成半岛尖端） */
  row(['.', 34], ['S', 50], ['.', 4]),
  row(['.', 32], ['S', 52], ['.', 4]),
  row(['.', 30], ['S', 52], ['.', 6]),
  row(['.', 28], ['S', 54], ['.', 6]),
  row(['.', 28], ['S', 52], ['.', 8]),
  row(['.', 30], ['S', 12], ['.', 6], ['S', 32], ['.', 8]),
  row(['.', 32], ['S', 12], ['.', 3], ['S', 31], ['.', 10]),
  row(['.', 33], ['S', 11], ['.', 2], ['S', 30], ['.', 12]),
  row(['.', 34], ['S', 38], ['.', 16]),
  row(['.', 35], ['S', 36], ['.', 17]),
  row(['.', 36], ['S', 34], ['.', 18]),
  row(['.', 37], ['S', 32], ['.', 19]),
  row(['.', 38], ['S', 30], ['.', 20]),
  row(['.', 39], ['S', 28], ['.', 21]),
  row(['.', 40], ['S', 26], ['.', 22]),
  row(['.', 41], ['S', 24], ['.', 23]),
  row(['.', 42], ['S', 22], ['.', 24]),
  row(['.', 43], ['S', 20], ['.', 25]),
  row(['.', 44], ['S', 18], ['.', 26]),
  row(['.', 45], ['S', 16], ['.', 27]),
  /* y28-33 左缘锡兰小岛 + 半岛收窄 */
  row(['.', 7], ['B', 4], ['.', 33], ['S', 14], ['.', 30]),
  row(['.', 6], ['B', 7], ['.', 30], ['S', 13], ['.', 32]),
  row(['.', 6], ['B', 7], ['.', 30], ['S', 12], ['.', 33]),
  row(['.', 6], ['B', 7], ['.', 29], ['S', 11], ['.', 35]),
  row(['.', 6], ['B', 6], ['.', 29], ['S', 10], ['.', 37]),
  row(['.', 7], ['B', 4], ['.', 29], ['S', 9], ['.', 39]),
  /* y34-36 半岛尖端 */
  row(['.', 40], ['S', 8], ['.', 40]),
  row(['.', 39], ['S', 7], ['.', 42]),
  row(['.', 38], ['S', 6], ['.', 44]),
  row(['.', 88]),
  /* y38-50 婆罗洲 / 苏门答腊 / 爪哇 */
  row(['.', 56], ['B', 8], ['.', 24]),
  row(['.', 9], ['B', 25], ['.', 20], ['B', 16], ['.', 18]),
  row(['.', 9], ['B', 28], ['.', 16], ['B', 19], ['.', 16]),
  row(['.', 10], ['B', 28], ['.', 14], ['B', 22], ['.', 14]),
  row(['.', 11], ['B', 28], ['.', 13], ['B', 23], ['.', 13]),
  row(['.', 12], ['B', 27], ['.', 13], ['B', 23], ['.', 13]),
  row(['.', 13], ['B', 25], ['.', 14], ['B', 22], ['.', 14]),
  row(['.', 14], ['B', 23], ['.', 16], ['B', 20], ['.', 15]),
  row(['.', 16], ['B', 19], ['.', 19], ['B', 18], ['.', 16]),
  row(['.', 32], ['B', 21], ['.', 2], ['B', 16], ['.', 17]),
  row(['.', 31], ['B', 24], ['.', 1], ['B', 13], ['.', 19]),
  row(['.', 32], ['B', 27], ['.', 29]),
  row(['.', 34], ['B', 23], ['.', 31]),
  row(['.', 88]),
  row(['.', 88]),
  row(['.', 88]),
  row(['.', 88]),
  row(['.', 88]),
];

/** 濒海陆地 → K 描边（四邻任一为海即描，形成海岸线轮廓） */
function coastify(rows: string[]): string[] {
  const grid = rows.map((r) => r.split(''));
  const land = new Set(['S', 'B']);
  const isLand = (x: number, y: number) =>
    y >= 0 && y < grid.length && x >= 0 && x < grid[0].length && land.has(grid[y][x]);
  const out = grid.map((r) => [...r]);
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (!land.has(grid[y][x])) continue;
      if (!isLand(x, y - 1) || !isLand(x, y + 1) || !isLand(x - 1, y) || !isLand(x + 1, y)) {
        out[y][x] = 'K';
      }
    }
  }
  return out.map((r) => r.join(''));
}
const LAND_ROWS = coastify(SEA_ROWS);

/* ------------------------------------------------------------
   本地新增像素图标：海鸥 / 烛台
   ------------------------------------------------------------ */
function PixelGull(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 左翼 */}
      <rect x="8" y="12" width="5" height="1" fill={PALETTE.W} />
      <rect x="9" y="11" width="4" height="1" fill={PALETTE.W} />
      {/* 躯干 */}
      <rect x="13" y="13" width="7" height="2" fill={PALETTE.W} />
      {/* 右翼 */}
      <rect x="20" y="11" width="4" height="1" fill={PALETTE.W} />
      <rect x="19" y="12" width="5" height="1" fill={PALETTE.W} />
      {/* 尾羽（灰青） */}
      <rect x="20" y="14" width="2" height="1" fill={PALETTE.F} />
    </PixelFrame>
  );
}

function PixelCandle(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 火焰：外橙内白，挂 candle-flicker（微闪烁） */}
      <rect className="candle-flame" x="15" y="9" width="2" height="4" fill={PALETTE.O} />
      <rect className="candle-flame" x="15" y="11" width="2" height="2" fill={PALETTE.W} />
      {/* 烛身（宣纸 + 檀木烛缘） */}
      <rect x="14" y="13" width="4" height="9" fill={PALETTE.P} />
      <rect x="14" y="13" width="4" height="1" fill={PALETTE.S} />
      {/* 烛台（金箔 + 深靛底座） */}
      <rect x="12" y="22" width="8" height="2" fill={PALETTE.G} />
      <rect x="13" y="24" width="6" height="2" fill={PALETTE.G} />
      <rect x="14" y="26" width="4" height="1" fill={PALETTE.D} />
    </PixelFrame>
  );
}

/* ------------------------------------------------------------
   远景层：窗棂外的南洋港口（整层 opacity .13，pointer-events:none）
   ------------------------------------------------------------ */
export function FarScene() {
  return (
    <div className="scene-far" data-testid="scene-far" aria-hidden="true">
      {/* 海面（下 55%），像素海浪 tile */}
      <div
        className="scene-horizon"
        style={{
          backgroundImage: SEA_BG,
          backgroundSize: SEA_BG_SIZE,
          imageRendering: 'pixelated',
        }}
      />
      {/* 落日余晖 */}
      <div className="scene-sun" />
      {/* 宝船桅杆 */}
      <span className="scene-ship-big">
        <PixelTreasureShip className="h-10 w-10" />
      </span>
      {/* 远洋帆影巡航 */}
      <span className="scene-sail">
        <PixelShip className="h-6 w-6" />
      </span>
      <span className="scene-sail scene-sail-2">
        <PixelShip className="h-5 w-5" />
      </span>
      {/* 海鸥像素动画（三只错峰横越） */}
      <span className="scene-gull">
        <PixelGull className="h-5 w-5" />
      </span>
      <span className="scene-gull scene-gull-2">
        <PixelGull className="h-4 w-4" />
      </span>
      <span className="scene-gull scene-gull-3">
        <PixelGull className="h-4 w-4" />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------
   中景层：府邸大厅主体（背景必须透明，远景经窗棂格间透出）
   ------------------------------------------------------------ */
export function MidScene() {
  return (
    <div className="scene-mid" data-testid="scene-mid" aria-hidden="true">
      {/* 顶部木质横梁 */}
      <div className="scene-beam-top" />
      {/* 左右立柱 */}
      <div className="scene-pillar scene-pillar-left" />
      <div className="scene-pillar scene-pillar-right" />
      {/* 窗棂框（网格 gap 即木棂，格间透远景） */}
      <div className="scene-window">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      {/* 「南洋出海局」牌匾（像素字体） */}
      <div className="scene-plaque">
        <span className="font-brand-pixel">南洋出海局</span>
      </div>
      {/* 航海图卷轴（装饰） */}
      <PixelScroll className="scene-scroll h-10 w-10" />
      {/* 烛台像素动画（左右各一，微闪烁） */}
      <div className="scene-candle scene-candle-left">
        <PixelCandle className="h-8 w-8" />
      </div>
      <div className="scene-candle scene-candle-right">
        <PixelCandle className="h-8 w-8" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   近景层：中央南洋海图沙盘（东南亚地图 + 金航线 + 巡航船 + 8 港口标记）
   ------------------------------------------------------------ */
export function SeaChartTable({ onPortClick }: { onPortClick: (id: PortId) => void }) {
  return (
    <div
      className="scene-table"
      data-testid="scene-sandbox"
      style={{
        backgroundImage: `${SEA_BG}, ${CHART_GRID}`,
        backgroundSize: `${SEA_BG_SIZE}, ${CHART_BG_SIZE}`,
        imageRendering: 'pixelated',
      }}
    >
      {/* 东南亚陆地轮廓（只画陆地像素，海面透出 tile 背景） */}
      <svg
        aria-hidden
        className="scene-table-map"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        {Px(LAND_ROWS)}
      </svg>
      {/* 金箔航线（议事厅精修：2px 藤黄虚线，opacity 0.8） */}
      <svg
        aria-hidden
        className="scene-table-route"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="none"
      >
        <polyline
          points={SEA_ROUTE}
          fill="none"
          stroke="#E8C547"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeOpacity="0.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* 巡航小船（贴底海域，从左向右缓慢平移） */}
      <span className="scene-cruise">
        <PixelShip className="h-5 w-5" />
      </span>
      {/* 8 港口据点标记（HTML 按钮按 % 定位，与 SVG 网格同拉伸空间对齐）
          议事厅精修：旗子 24×24px，与港口名称木牌绑定 */}
      {SEA_PORTS.map((p) => (
        <button
          key={p.id}
          type="button"
          data-testid={`port-${p.id}`}
          data-port={p.id}
          aria-label={p.name}
          title={`${p.name}（${p.modern}）`}
          className="scene-port"
          style={{ left: `${(p.gx / MAP_W) * 100}%`, top: `${(p.gy / MAP_H) * 100}%` }}
          onClick={() => onPortClick(p.id)}
        >
          <PixelFlag className="h-6 w-6" />
          <span className="scene-port-name">{p.name}</span>
        </button>
      ))}
    </div>
  );
}
