/**
 * 木质案几像素图标（南洋出海局 · 批次 9）
 *
 * 32×32 像素网格手绘 SVG，`shape-rendering: crispEdges`，坐标全整数。
 * 配色沿用品牌四色（靛青 #1E3A5F + 金箔 #C9A227 + 宣纸白 #F5F0E6 + 朱砂红 #B82222），
 * 复用 bamboo-icons 的 PixelFrame 外壳。
 */
import type { SVGProps } from 'react';
import { PixelFrame } from './bamboo-icons';

const INDIGO = '#1E3A5F';
const GOLD = '#C9A227';
const PAPER = '#F5F0E6';
const VERMILION = '#B82222';

/** 传声海螺（语音输入）：右上尖顶 → 左下喇叭开口的螺旋壳，金线螺脊 + 朱唇 */
export function PixelConch(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 螺身阶梯（右上尖 → 左下开口） */}
      <rect x="25" y="3" width="3" height="5" fill={PAPER} />
      <rect x="23" y="7" width="5" height="4" fill={PAPER} />
      <rect x="21" y="11" width="7" height="4" fill={PAPER} />
      <rect x="19" y="15" width="9" height="4" fill={PAPER} />
      <rect x="17" y="19" width="11" height="4" fill={PAPER} />
      <rect x="15" y="23" width="13" height="5" fill={PAPER} />
      {/* 螺脊金线（每段上沿） */}
      <rect x="25" y="3" width="3" height="1" fill={GOLD} />
      <rect x="23" y="7" width="5" height="1" fill={GOLD} />
      <rect x="21" y="11" width="7" height="1" fill={GOLD} />
      <rect x="19" y="15" width="9" height="1" fill={GOLD} />
      <rect x="17" y="19" width="11" height="1" fill={GOLD} />
      <rect x="15" y="23" width="13" height="1" fill={GOLD} />
      {/* 内旋阴影 */}
      <rect x="27" y="8" width="1" height="3" fill={INDIGO} />
      <rect x="27" y="12" width="1" height="3" fill={INDIGO} />
      <rect x="27" y="16" width="1" height="3" fill={INDIGO} />
      <rect x="27" y="20" width="1" height="3" fill={INDIGO} />
      <rect x="27" y="24" width="1" height="3" fill={INDIGO} />
      {/* 开口（左下喇叭，朱砂唇边） */}
      <rect x="5" y="24" width="10" height="4" fill={INDIGO} />
      <rect x="4" y="22" width="12" height="2" fill={VERMILION} />
      <rect x="4" y="28" width="12" height="2" fill={VERMILION} />
    </PixelFrame>
  );
}

/** 令箭旗（快捷令箭）：靛青旗杆 + 金箔三角旗 + 朱砂燕尾 + 宣纸旗纹 */
export function PixelPennant(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 旗杆 + 顶/底缀 */}
      <rect x="6" y="3" width="2" height="26" fill={INDIGO} />
      <rect x="4" y="3" width="6" height="2" fill={INDIGO} />
      <rect x="4" y="27" width="6" height="2" fill={INDIGO} />
      {/* 三角旗（金箔，右尖） */}
      <rect x="8" y="6" width="16" height="7" fill={GOLD} />
      <rect x="24" y="7" width="4" height="4" fill={GOLD} />
      <rect x="28" y="8" width="2" height="2" fill={GOLD} />
      <rect x="30" y="9" width="1" height="1" fill={GOLD} />
      {/* 朱砂燕尾 */}
      <rect x="8" y="13" width="5" height="3" fill={VERMILION} />
      {/* 宣纸旗纹 */}
      <rect x="10" y="7" width="2" height="2" fill={PAPER} />
      <rect x="14" y="7" width="3" height="2" fill={PAPER} />
    </PixelFrame>
  );
}
