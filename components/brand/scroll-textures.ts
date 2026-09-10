/**
 * 卷轴/卡片像素卷边纹理（南洋出海局 · 批次 10）
 *
 * SCROLLBAR_TILE：24×8 横向卷边 tile——朱砂底 + 金箔上下 2px 细线 + 靛青刻度 + 金浪花簇，
 * 作为卡片顶部 8px 像素卷轴装饰条（`.card-scrollbar`）平铺。
 *
 * 编码要点同 desk-textures：`data:image/svg+xml;utf8,` + encodeURIComponent，
 * SVG 属性单引号，颜色 `#` 自动转 `%23`，配合 `image-rendering: pixelated` 像素锐利。
 */

function uri(svg: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// 卷边 tile：24×8。朱砂底 + 金箔上下 2px 细线 + 靛青上下排刻度 + 中部金浪花簇
const SCROLLBAR_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='8' viewBox='0 0 24 8' shape-rendering='crispEdges'>
  <rect x='0' y='0' width='24' height='8' fill='#B82222'/>
  <!-- 金箔上 2px 细线 -->
  <rect x='0' y='0' width='24' height='2' fill='#C9A227'/>
  <!-- 金箔下 2px 细线 -->
  <rect x='0' y='6' width='24' height='2' fill='#C9A227'/>
  <!-- 靛青刻度（上排） -->
  <rect x='3' y='2' width='1' height='2' fill='#1E3A5F'/>
  <rect x='9' y='2' width='1' height='2' fill='#1E3A5F'/>
  <rect x='15' y='2' width='1' height='2' fill='#1E3A5F'/>
  <rect x='21' y='2' width='1' height='2' fill='#1E3A5F'/>
  <!-- 靛青刻度（下排，错位） -->
  <rect x='6' y='4' width='1' height='2' fill='#1E3A5F'/>
  <rect x='12' y='4' width='1' height='2' fill='#1E3A5F'/>
  <rect x='18' y='4' width='1' height='2' fill='#1E3A5F'/>
  <!-- 金浪花簇（中部） -->
  <rect x='4' y='3' width='3' height='1' fill='#C9A227'/>
  <rect x='3' y='4' width='1' height='1' fill='#C9A227'/>
  <rect x='7' y='4' width='1' height='1' fill='#C9A227'/>
</svg>`;

export const SCROLLBAR_TILE = uri(SCROLLBAR_SVG);
export const SCROLLBAR_SIZE = '24px 8px';
