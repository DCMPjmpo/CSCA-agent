/**
 * 卷轴弹窗像素图标（南洋出海局 · 批次 10）
 *
 * 32×32 像素网格手绘 SVG，`shape-rendering: crispEdges`，坐标全整数。
 * 配色沿用品牌四色（靛青 #1E3A5F + 金箔 #C9A227 + 宣纸白 #F5F0E6 + 朱砂红 #B82222），
 * 复用 bamboo-icons 的 PixelFrame 外壳。供弹窗/抽屉「合卷」关闭按钮使用。
 */
import type { SVGProps } from 'react';
import { PixelFrame } from './bamboo-icons';

const INDIGO = '#1E3A5F';
const GOLD = '#C9A227';
const PAPER = '#F5F0E6';
const VERMILION = '#B82222';

/** 合卷：双金轴 + 宣纸卷身 + 两侧内卷边缘 + 上收箭头（关闭即卷起收起） */
export function PixelRollUp(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 上金轴（含端帽） */}
      <rect x="4" y="4" width="3" height="2" fill={GOLD} />
      <rect x="6" y="4" width="20" height="2" fill={GOLD} />
      <rect x="25" y="4" width="3" height="2" fill={GOLD} />
      {/* 卷身（宣纸） */}
      <rect x="6" y="6" width="20" height="14" fill={PAPER} />
      {/* 两侧内卷边缘（靛青淡） */}
      <rect x="6" y="6" width="3" height="14" fill={INDIGO} fillOpacity={0.18} />
      <rect x="23" y="6" width="3" height="14" fill={INDIGO} fillOpacity={0.18} />
      {/* 卷身行纹 */}
      <rect x="9" y="8" width="14" height="1" fill={INDIGO} fillOpacity={0.4} />
      {/* 下金轴（含端帽） */}
      <rect x="4" y="20" width="3" height="2" fill={GOLD} />
      <rect x="6" y="20" width="20" height="2" fill={GOLD} />
      <rect x="25" y="20" width="3" height="2" fill={GOLD} />
      {/* 上收箭头（金箔三角） */}
      <rect x="15" y="9" width="2" height="2" fill={GOLD} />
      <rect x="13" y="11" width="6" height="2" fill={GOLD} />
      <rect x="15" y="13" width="2" height="4" fill={GOLD} />
      {/* 朱砂印（左下小章，呼应「令」印章） */}
      <rect x="10" y="16" width="3" height="3" fill={VERMILION} />
    </PixelFrame>
  );
}
