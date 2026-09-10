/**
 * 竹简卷轴像素图标（南洋出海局 · 批次 7）
 *
 * 32×32 像素网格手绘 SVG，`shape-rendering: crispEdges`，坐标全整数。
 * 统一 3 色：靛青 #1E3A5F + 金箔 #C9A227 + 宣纸白 #F5F0E6。
 * 显示尺寸由调用方 className 控制（默认 32px = w-8 h-8）。
 */
import type { SVGProps } from 'react';

const INDIGO = '#1E3A5F';
const GOLD = '#C9A227';
const PAPER = '#F5F0E6';

export function PixelFrame({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={32}
      height={32}
      shapeRendering="crispEdges"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** 首页：金箔阶梯屋顶 + 靛青房身 + 宣纸门窗 */
export function PixelHome(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 屋顶（金箔阶梯） */}
      <rect x="14" y="5" width="4" height="1" fill={GOLD} />
      <rect x="13" y="6" width="6" height="1" fill={GOLD} />
      <rect x="12" y="7" width="8" height="1" fill={GOLD} />
      <rect x="11" y="8" width="10" height="1" fill={GOLD} />
      <rect x="10" y="9" width="12" height="1" fill={GOLD} />
      <rect x="9" y="10" width="14" height="1" fill={GOLD} />
      {/* 房身（靛青） */}
      <rect x="8" y="11" width="16" height="14" fill={INDIGO} />
      {/* 门（宣纸白） */}
      <rect x="13" y="17" width="6" height="8" fill={PAPER} />
      {/* 窗（宣纸白） */}
      <rect x="9" y="13" width="3" height="4" fill={PAPER} />
      <rect x="20" y="13" width="3" height="4" fill={PAPER} />
    </PixelFrame>
  );
}

/** 备考中心：打开的书卷 —— 宣纸书页 + 靛青封边 + 金箔书脊与书签 */
export function PixelPrep(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 书页（宣纸白） */}
      <rect x="4" y="8" width="11" height="15" fill={PAPER} />
      <rect x="17" y="8" width="11" height="15" fill={PAPER} />
      {/* 书脊（金箔） */}
      <rect x="15" y="7" width="2" height="16" fill={GOLD} />
      {/* 封边（靛青） */}
      <rect x="3" y="8" width="1" height="15" fill={INDIGO} />
      <rect x="28" y="8" width="1" height="15" fill={INDIGO} />
      <rect x="3" y="23" width="26" height="2" fill={INDIGO} />
      {/* 书页行纹（靛青） */}
      <rect x="7" y="12" width="6" height="1" fill={INDIGO} fillOpacity={0.4} />
      <rect x="7" y="15" width="6" height="1" fill={INDIGO} fillOpacity={0.4} />
      <rect x="7" y="18" width="4" height="1" fill={INDIGO} fillOpacity={0.4} />
      <rect x="20" y="12" width="6" height="1" fill={INDIGO} fillOpacity={0.4} />
      <rect x="20" y="15" width="6" height="1" fill={INDIGO} fillOpacity={0.4} />
      <rect x="20" y="18" width="4" height="1" fill={INDIGO} fillOpacity={0.4} />
      {/* 书签（金箔） */}
      <rect x="25" y="5" width="3" height="5" fill={GOLD} />
    </PixelFrame>
  );
}

/** 幕僚厅：桅杆信号旗 —— 靛青桅杆 + 金箔旗面 + 宣纸基座 */
export function PixelCouncil(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 桅杆（靛青） */}
      <rect x="9" y="4" width="2" height="23" fill={INDIGO} />
      {/* 旗面（金箔） */}
      <rect x="12" y="6" width="13" height="9" fill={GOLD} />
      {/* 旗徽（靛青菱形） */}
      <rect x="18" y="9" width="1" height="1" fill={INDIGO} />
      <rect x="17" y="10" width="1" height="1" fill={INDIGO} />
      <rect x="19" y="10" width="1" height="1" fill={INDIGO} />
      <rect x="18" y="11" width="1" height="1" fill={INDIGO} />
      {/* 基座（宣纸白） */}
      <rect x="6" y="27" width="13" height="2" fill={PAPER} />
    </PixelFrame>
  );
}

/** 案例页：放大镜 + 文档 —— 靛青镜框 + 金箔镜柄 + 宣纸文档 */
export function PixelCaseStudy(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 文档（宣纸白）+ 行纹（靛青） */}
      <rect x="4" y="9" width="18" height="13" fill={PAPER} />
      <rect x="7" y="12" width="12" height="1" fill={INDIGO} fillOpacity={0.4} />
      <rect x="7" y="15" width="12" height="1" fill={INDIGO} fillOpacity={0.4} />
      <rect x="7" y="18" width="8" height="1" fill={INDIGO} fillOpacity={0.4} />
      {/* 放大镜外框（靛青环形） */}
      <rect x="13" y="13" width="14" height="2" fill={INDIGO} />
      <rect x="13" y="25" width="14" height="2" fill={INDIGO} />
      <rect x="13" y="15" width="2" height="10" fill={INDIGO} />
      <rect x="25" y="15" width="2" height="10" fill={INDIGO} />
      {/* 放大镜镜片（宣纸白，与文档叠合） */}
      <rect x="15" y="15" width="10" height="10" fill={PAPER} />
      {/* 镜柄（金箔对角） */}
      <rect x="24" y="25" width="2" height="2" fill={GOLD} />
      <rect x="26" y="27" width="2" height="2" fill={GOLD} />
      <rect x="28" y="29" width="2" height="2" fill={GOLD} />
    </PixelFrame>
  );
}

/** 折叠/卷起：双左向金箔箭头（«） */
export function PixelRoll(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 左箭头（尖朝左，开口朝右） */}
      <rect x="9" y="13" width="2" height="2" fill={GOLD} />
      <rect x="9" y="15" width="2" height="2" fill={GOLD} />
      <rect x="11" y="13" width="2" height="4" fill={GOLD} />
      <rect x="13" y="14" width="2" height="2" fill={GOLD} />
      {/* 右箭头 */}
      <rect x="17" y="13" width="2" height="2" fill={GOLD} />
      <rect x="17" y="15" width="2" height="2" fill={GOLD} />
      <rect x="19" y="13" width="2" height="4" fill={GOLD} />
      <rect x="21" y="14" width="2" height="2" fill={GOLD} />
    </PixelFrame>
  );
}
