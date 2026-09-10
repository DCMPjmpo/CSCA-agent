/**
 * 南洋海图沙盘像素图标（南洋出海局 · 批次 8）
 *
 * 32×32 像素网格手绘 SVG，`shape-rendering: crispEdges`，坐标全整数。
 * 配色与 bamboo-icons 一致（靛青 #1E3A5F + 金箔 #C9A227 + 宣纸白 #F5F0E6），
 * 另引入朱砂红 #B82222 点缀旗面/仪盘。复用 bamboo-icons 的 PixelFrame 外壳。
 */
import type { SVGProps } from 'react';
import { PixelFrame } from './bamboo-icons';

const INDIGO = '#1E3A5F';
const GOLD = '#C9A227';
const PAPER = '#F5F0E6';
const VERMILION = '#B82222';

/** 出海风向标（诊断）：金箔罗盘环 + 宣纸盘面 + 靛青/金针 */
export function PixelCompass(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 金环 */}
      <rect x="6" y="8" width="20" height="16" fill={GOLD} />
      <rect x="8" y="6" width="16" height="20" fill={GOLD} />
      {/* 宣纸盘面 */}
      <rect x="8" y="8" width="16" height="16" fill={PAPER} />
      {/* 指针：N 靛青 / S 金箔 / W-E 靛青 */}
      <rect x="15" y="10" width="2" height="4" fill={INDIGO} />
      <rect x="15" y="18" width="2" height="4" fill={GOLD} />
      <rect x="10" y="15" width="4" height="2" fill={INDIGO} />
      <rect x="18" y="15" width="4" height="2" fill={INDIGO} />
      {/* 中心朱砂 */}
      <rect x="15" y="15" width="2" height="2" fill={VERMILION} />
    </PixelFrame>
  );
}

/** 航海图室（知识图谱）：展开卷轴 —— 宣纸书卷 + 金箔卷轴轴头 + 靛青行纹 */
export function PixelScroll(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 卷面（宣纸白） */}
      <rect x="6" y="10" width="20" height="12" fill={PAPER} />
      {/* 卷轴轴头（金箔） */}
      <rect x="4" y="8" width="2" height="16" fill={GOLD} />
      <rect x="26" y="8" width="2" height="16" fill={GOLD} />
      {/* 海图行纹（靛青） */}
      <rect x="8" y="13" width="16" height="1" fill={INDIGO} fillOpacity={0.4} />
      <rect x="8" y="16" width="12" height="1" fill={INDIGO} fillOpacity={0.4} />
      <rect x="8" y="19" width="14" height="1" fill={INDIGO} fillOpacity={0.4} />
    </PixelFrame>
  );
}

/** 演武场（自适应）：兵器架 —— 靛青木架 + 金箔兵刃 */
export function PixelWeaponRack(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 木架（靛青） */}
      <rect x="6" y="6" width="2" height="22" fill={INDIGO} />
      <rect x="24" y="6" width="2" height="22" fill={INDIGO} />
      <rect x="6" y="10" width="20" height="2" fill={INDIGO} />
      <rect x="6" y="20" width="20" height="2" fill={INDIGO} />
      {/* 金箔兵刃（斜挂） */}
      <rect x="10" y="13" width="2" height="6" fill={GOLD} />
      <rect x="14" y="12" width="2" height="8" fill={GOLD} />
      <rect x="18" y="13" width="2" height="6" fill={GOLD} />
    </PixelFrame>
  );
}

/** 试航港（模考）：宝船 —— 靛青船身 + 金箔船舷/宝箱 + 朱旗桅杆 */
export function PixelTreasureShip(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 桅杆（靛青） */}
      <rect x="17" y="8" width="2" height="12" fill={INDIGO} />
      {/* 朱旗 */}
      <rect x="19" y="6" width="8" height="5" fill={VERMILION} />
      {/* 船舷（靛青）+ 甲板金箔高光 */}
      <rect x="8" y="20" width="16" height="2" fill={INDIGO} />
      <rect x="10" y="21" width="12" height="1" fill={GOLD} />
      <rect x="6" y="22" width="20" height="4" fill={INDIGO} />
      {/* 龙骨（更深靛青） */}
      <rect x="10" y="26" width="12" height="2" fill="#162B47" />
      {/* 金箔宝箱 */}
      <rect x="13" y="16" width="5" height="3" fill={GOLD} />
    </PixelFrame>
  );
}

/** 观星台（成绩）：星盘 —— 金箔环 + 宣纸盘面 + 靛青十字 */
export function PixelAstrolabe(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 金环 */}
      <rect x="7" y="9" width="18" height="14" fill={GOLD} />
      <rect x="9" y="7" width="14" height="18" fill={GOLD} />
      {/* 宣纸盘面 */}
      <rect x="9" y="9" width="14" height="14" fill={PAPER} />
      {/* 靛青十字 */}
      <rect x="15" y="11" width="2" height="10" fill={INDIGO} />
      <rect x="11" y="15" width="10" height="2" fill={INDIGO} />
      {/* 中心朱砂 */}
      <rect x="15" y="15" width="2" height="2" fill={VERMILION} />
    </PixelFrame>
  );
}

/** 日程司（计划）：日晷 —— 金箔晷针 + 宣纸晷面 + 靛青底座 */
export function PixelSundial(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 底座（靛青） */}
      <rect x="6" y="22" width="20" height="4" fill={INDIGO} />
      <rect x="8" y="20" width="16" height="2" fill={INDIGO} />
      {/* 晷面（宣纸白） */}
      <rect x="11" y="12" width="10" height="8" fill={PAPER} />
      {/* 金箔晷针（三角） */}
      <rect x="15" y="12" width="2" height="6" fill={GOLD} />
      <rect x="14" y="12" width="4" height="2" fill={GOLD} />
      {/* 时辰刻度（金箔） */}
      <rect x="12" y="14" width="1" height="1" fill={GOLD} />
      <rect x="19" y="14" width="1" height="1" fill={GOLD} />
      <rect x="15" y="19" width="2" height="1" fill={GOLD} />
    </PixelFrame>
  );
}

/** 讲学堂（课堂生成）：先生授课 —— 靛青袍/帽 + 宣纸面容 + 金箔讲台 */
export function PixelLectern(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 儒冠（靛青） */}
      <rect x="12" y="6" width="8" height="1" fill={INDIGO} />
      <rect x="13" y="7" width="6" height="2" fill={INDIGO} />
      {/* 面容（宣纸白） */}
      <rect x="14" y="9" width="4" height="4" fill={PAPER} />
      {/* 袍身（靛青） */}
      <rect x="11" y="13" width="10" height="6" fill={INDIGO} />
      {/* 金箔讲台 */}
      <rect x="6" y="20" width="20" height="4" fill={GOLD} />
      <rect x="10" y="19" width="12" height="1" fill={GOLD} />
    </PixelFrame>
  );
}

/** 幕僚厅（多智能体）：幕僚立绘 —— 靛青冠/袍 + 宣纸面容 + 金箔领 */
export function PixelAgentBust(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 冠（靛青，三尖） */}
      <rect x="13" y="6" width="6" height="2" fill={INDIGO} />
      <rect x="11" y="8" width="10" height="2" fill={INDIGO} />
      {/* 面容（宣纸白） */}
      <rect x="12" y="10" width="8" height="7" fill={PAPER} />
      {/* 眉眼（靛青） */}
      <rect x="14" y="13" width="1" height="2" fill={INDIGO} />
      <rect x="17" y="13" width="1" height="2" fill={INDIGO} />
      {/* 金箔领 */}
      <rect x="11" y="17" width="10" height="2" fill={GOLD} />
      {/* 袍身（靛青） */}
      <rect x="9" y="19" width="14" height="7" fill={INDIGO} />
    </PixelFrame>
  );
}

/** 插旗（完成标记）：靛青旗杆 + 金箔旗面 + 宣纸旗座 */
export function PixelFlag(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 旗杆（靛青） */}
      <rect x="14" y="5" width="2" height="23" fill={INDIGO} />
      {/* 金旗 */}
      <rect x="16" y="6" width="10" height="7" fill={GOLD} />
      {/* 旗座（宣纸白） */}
      <rect x="11" y="28" width="10" height="2" fill={PAPER} />
    </PixelFrame>
  );
}

/** 航船（进度标记）：靛青船身 + 宣纸帆 + 朱旗 */
export function PixelShip(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelFrame {...props}>
      {/* 桅杆（靛青） */}
      <rect x="16" y="7" width="2" height="12" fill={INDIGO} />
      {/* 朱旗 */}
      <rect x="18" y="5" width="6" height="3" fill={VERMILION} />
      {/* 宣纸帆 */}
      <rect x="18" y="9" width="6" height="7" fill={PAPER} />
      {/* 甲板（宣纸白）+ 船身（靛青） */}
      <rect x="8" y="19" width="16" height="1" fill={PAPER} />
      <rect x="6" y="20" width="20" height="4" fill={INDIGO} />
      <rect x="9" y="24" width="14" height="2" fill="#162B47" />
    </PixelFrame>
  );
}
