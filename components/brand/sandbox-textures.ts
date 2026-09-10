/**
 * 南洋海图沙盘像素纹理（南洋出海局 · 批次 8）
 *
 * 三张 SVG data-URI 背景 tile：
 * - SEA_TILE：像素海浪（靛青海面 + 深靛波谷 + 亮靛波峰 + 金箔浪花）
 * - CHART_GRID：老化海图经纬格（金箔 30% 经纬线 + 罗盘箭头）
 * - FOG_TILE：迷雾噪点（宣纸白低透明斑块，叠在未探索据点上）
 *
 * 编码要点同 bamboo-textures：`data:image/svg+xml;utf8,` + encodeURIComponent，
 * SVG 属性用单引号，颜色 `#` 自动转 `%23`。容器内联 `backgroundImage` 叠加，
 * `backgroundSize` 取 tile 整数倍，配合 `image-rendering: pixelated` 保持像素锐利。
 */
import { AGED_TILE } from './bamboo-textures';

function uri(svg: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// 海浪 tile：16×16。靛青底 + 斜向波谷/波峰，36px 平铺后呈层层浪涌
const SEA_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' shape-rendering='crispEdges'>
  <rect x='0' y='0' width='16' height='16' fill='#1E3A5F'/>
  <!-- 深靛波谷（斜向，无缝） -->
  <rect x='0' y='2' width='16' height='1' fill='#162B47'/>
  <rect x='4' y='3' width='12' height='1' fill='#162B47'/>
  <rect x='0' y='9' width='12' height='1' fill='#162B47'/>
  <rect x='4' y='10' width='12' height='1' fill='#162B47'/>
  <rect x='0' y='14' width='12' height='1' fill='#162B47'/>
  <!-- 亮靛波峰高光 -->
  <rect x='0' y='5' width='16' height='2' fill='#2E4E7A'/>
  <rect x='8' y='6' width='8' height='2' fill='#3A5A84'/>
  <rect x='0' y='12' width='16' height='2' fill='#2E4E7A'/>
  <rect x='4' y='13' width='8' height='1' fill='#3A5A84'/>
  <!-- 金箔浪花 -->
  <rect x='3' y='3' width='1' height='1' fill='#C9A227'/>
  <rect x='11' y='10' width='1' height='1' fill='#C9A227'/>
</svg>`;

// 老化海图经纬格：48×48。金箔 30% 经纬线 + 右上罗盘 N 箭头
const CHART_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48' shape-rendering='crispEdges'>
  <rect x='0' y='0' width='48' height='48' fill='none'/>
  <!-- 经纬线 -->
  <rect x='0' y='0' width='48' height='1' fill='#C9A227' fill-opacity='0.30'/>
  <rect x='0' y='12' width='48' height='1' fill='#C9A227' fill-opacity='0.30'/>
  <rect x='0' y='24' width='48' height='1' fill='#C9A227' fill-opacity='0.30'/>
  <rect x='0' y='36' width='48' height='1' fill='#C9A227' fill-opacity='0.30'/>
  <rect x='0' y='0' width='1' height='48' fill='#C9A227' fill-opacity='0.30'/>
  <rect x='12' y='0' width='1' height='48' fill='#C9A227' fill-opacity='0.30'/>
  <rect x='24' y='0' width='1' height='48' fill='#C9A227' fill-opacity='0.30'/>
  <rect x='36' y='0' width='1' height='48' fill='#C9A227' fill-opacity='0.30'/>
  <!-- 罗盘 N 箭头（右上） -->
  <rect x='40' y='6' width='2' height='5' fill='#C9A227' fill-opacity='0.45'/>
  <rect x='39' y='10' width='4' height='1' fill='#C9A227' fill-opacity='0.45'/>
  <rect x='38' y='11' width='6' height='2' fill='#C9A227' fill-opacity='0.45'/>
</svg>`;

// 迷雾噪点：48×48。宣纸白低透明底 + 更高透明斑块，叠层漂移动画后呈飘雾
const FOG_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48' shape-rendering='crispEdges'>
  <rect x='0' y='0' width='48' height='48' fill='#F5F0E6' fill-opacity='0.32'/>
  <rect x='6' y='4' width='14' height='8' fill='#FFFFFF' fill-opacity='0.5'/>
  <rect x='26' y='12' width='18' height='6' fill='#FFFFFF' fill-opacity='0.45'/>
  <rect x='4' y='24' width='12' height='10' fill='#FFFFFF' fill-opacity='0.55'/>
  <rect x='30' y='30' width='14' height='12' fill='#FFFFFF' fill-opacity='0.5'/>
  <rect x='14' y='38' width='12' height='6' fill='#FFFFFF' fill-opacity='0.4'/>
</svg>`;

export const SEA_TILE = uri(SEA_SVG);
export const CHART_GRID = uri(CHART_SVG);
export const FOG_TILE = uri(FOG_SVG);

// 组合海图背景（海面 + 做旧噪点），供沙盘容器内联 backgroundImage 使用
export const SEA_BG = `${SEA_TILE}, ${AGED_TILE}`;
export const SEA_BG_SIZE = '36px 36px, 96px 96px';

// 海图纸背景（幕僚厅/讲学堂据点格内用）
export const CHART_BG = `${CHART_GRID}, ${AGED_TILE}`;
export const CHART_BG_SIZE = '96px 96px, 96px 96px';
