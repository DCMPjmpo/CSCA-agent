/**
 * 木质案几像素纹理（南洋出海局 · 批次 9）
 *
 * DESK_TILE：16×16 檀木木纹 tile——檀木棕底 + 竖板缝 + 纹理高光短条 + 木结，
 * 32px 平铺（×2 整数缩放）叠 AGED_TILE 做旧，供幕僚厅输入栏案几内联背景。
 *
 * 编码要点同 sandbox-textures：`data:image/svg+xml;utf8,` + encodeURIComponent，
 * SVG 属性单引号，颜色 `#` 自动转 `%23`，配合 `image-rendering: pixelated` 像素锐利。
 */
import { AGED_TILE } from './bamboo-textures';

function uri(svg: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// 檀木案几 tile：16×16，两条竖板（板缝在 x=7 / x=15 无缝循环）+ 纹理高光 + 木结
const DESK_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' shape-rendering='crispEdges'>
  <rect x='0' y='0' width='16' height='16' fill='#8B5A2B'/>
  <!-- 竖板缝（x=7 与 x=15 即 tile 右缘，平铺后无缝） -->
  <rect x='7' y='0' width='1' height='16' fill='#6B4520'/>
  <rect x='15' y='0' width='1' height='16' fill='#6B4520'/>
  <!-- 纹理高光短条（浅檀木） -->
  <rect x='1' y='1' width='1' height='6' fill='#9A6A38'/>
  <rect x='2' y='4' width='1' height='7' fill='#9A6A38'/>
  <rect x='4' y='8' width='1' height='6' fill='#9A6A38'/>
  <rect x='9' y='2' width='1' height='8' fill='#9A6A38'/>
  <rect x='11' y='1' width='1' height='5' fill='#9A6A38'/>
  <rect x='12' y='7' width='1' height='3' fill='#9A6A38'/>
  <!-- 木结（右板下部） -->
  <rect x='12' y='10' width='2' height='2' fill='#5D3A1C'/>
  <rect x='11' y='9' width='1' height='3' fill='#6B4520'/>
  <rect x='14' y='9' width='1' height='3' fill='#6B4520'/>
  <rect x='12' y='9' width='2' height='1' fill='#6B4520'/>
  <rect x='12' y='12' width='2' height='1' fill='#6B4520'/>
  <!-- 顶部高光线 + 底部唇影 -->
  <rect x='0' y='0' width='16' height='1' fill='#9A6A38' fill-opacity='0.35'/>
  <rect x='0' y='15' width='16' height='1' fill='#6B4520' fill-opacity='0.4'/>
</svg>`;

export const DESK_TILE = uri(DESK_SVG);

// 案几背景（檀木纹 + 做旧噪点），供输入栏容器内联 backgroundImage 使用
export const DESK_BG = `${DESK_TILE}, ${AGED_TILE}`;
export const DESK_BG_SIZE = '32px 32px, 96px 96px';
