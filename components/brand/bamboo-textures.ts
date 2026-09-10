/**
 * 竹简卷轴像素风纹理（南洋出海局 · 批次 7）
 *
 * 两张 SVG data-URI 背景 tile：
 * - BAMBOO_TILE：竖条竹简（靛青系木质），带金箔细缝与竹节横纹
 * - AGED_TILE：做旧噪点（低透明 speckle）
 *
 * 编码要点：`data:image/svg+xml;utf8,` + `encodeURIComponent`，SVG 属性用单引号，
 * 颜色 `#` 由 encodeURIComponent 自动转成 `%23`。容器内联 `backgroundImage` 叠加，
 * `backgroundSize` 取 tile 的整数倍，配合 `image-rendering: pixelated` 保持像素锐利。
 */

function uri(svg: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// 竹简板 tile：12×16。靛青木质竖条 + 金箔细缝 + 竹节横纹 + 做旧斑点
const BAMBOO_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='16' viewBox='0 0 12 16' shape-rendering='crispEdges'>
  <rect x='0' y='0' width='12' height='16' fill='#1E3A5F'/>
  <rect x='1' y='0' width='1' height='16' fill='#38598C'/>
  <rect x='3' y='0' width='2' height='16' fill='#2A4A73'/>
  <rect x='8' y='0' width='1' height='16' fill='#162B47'/>
  <rect x='10' y='0' width='1' height='16' fill='#C9A227' fill-opacity='0.35'/>
  <rect x='11' y='0' width='1' height='16' fill='#0F1E33'/>
  <rect x='0' y='5' width='12' height='1' fill='#0F1E33' fill-opacity='0.5'/>
  <rect x='0' y='12' width='12' height='1' fill='#0F1E33' fill-opacity='0.5'/>
  <rect x='4' y='9' width='3' height='1' fill='#162B47' fill-opacity='0.6'/>
</svg>`;

// 做旧噪点 tile：48×48，少量低透明深/浅 speckle
const AGED_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48' shape-rendering='crispEdges'>
  <rect x='7' y='5' width='3' height='2' fill='#000000' fill-opacity='0.06'/>
  <rect x='33' y='12' width='4' height='3' fill='#000000' fill-opacity='0.05'/>
  <rect x='18' y='27' width='3' height='2' fill='#000000' fill-opacity='0.07'/>
  <rect x='40' y='34' width='5' height='2' fill='#000000' fill-opacity='0.04'/>
  <rect x='11' y='40' width='3' height='2' fill='#000000' fill-opacity='0.05'/>
  <rect x='27' y='4' width='2' height='2' fill='#FFFFFF' fill-opacity='0.05'/>
  <rect x='5' y='20' width='2' height='2' fill='#FFFFFF' fill-opacity='0.04'/>
  <rect x='24' y='38' width='3' height='2' fill='#FFFFFF' fill-opacity='0.05'/>
  <rect x='36' y='22' width='2' height='2' fill='#FFFFFF' fill-opacity='0.04'/>
  <rect x='14' y='13' width='2' height='2' fill='#FFFFFF' fill-opacity='0.04'/>
</svg>`;

export const BAMBOO_TILE = uri(BAMBOO_SVG);
export const AGED_TILE = uri(AGED_SVG);

// 组合背景（竹简 + 做旧），供侧栏/底部 Tab 内联 backgroundImage 使用
export const BAMBOO_BG = `${BAMBOO_TILE}, ${AGED_TILE}`;
export const BAMBOO_BG_SIZE = '24px 32px, 96px 96px';
