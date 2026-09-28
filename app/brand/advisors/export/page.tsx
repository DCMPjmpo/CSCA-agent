/**
 * 南洋出海局 · 8 位像素幕僚导出源页（批次 11）
 *
 * 无动画、纯静态单元格，供 scripts/export-advisors.mjs 逐格截图出透明
 * PNG / 雪碧图。页面根容器底色 = 品红 #FF00FF（不在 13 色板内）作
 * chroma-key：脚本截到 RGB 后用 sharp 把纯 #FF00FF 抠成透明。
 * （app/globals.css 的 body 有显式 opaque 背景，Playwright omitBackground
 *   只覆盖默认白、穿不透显式底色，故走 key color 方案。）
 * 单元格 data-* 属性即导出脚本的定位锚：
 *   data-advisor=<id> data-size=32|64 data-frame=0|1|2  单帧
 *   data-strip=<id> data-strip-size=32|64                呼吸三帧横排（雪碧图）
 *   data-lineup=64|32                                    全员排排站
 */
import { ADVISOR_IDS, PixelAdvisor } from '@/components/brand/advisors';

const FRAMES: (0 | 1 | 2)[] = [0, 1, 2];

function Cell({
  id,
  size,
  frame,
}: {
  id: (typeof ADVISOR_IDS)[number];
  size: 32 | 64;
  frame: 0 | 1 | 2;
}) {
  const cls = size === 32 ? 'block h-8 w-8' : 'block h-16 w-16';
  return (
    <div data-advisor={id} data-size={size} data-frame={frame} className="inline-flex">
      <PixelAdvisor id={id} animate={false} breathFrame={frame} className={cls} />
    </div>
  );
}

export default function AdvisorExportPage() {
  return (
    <div className="p-4" style={{ backgroundColor: '#FF00FF' }}>
      {ADVISOR_IDS.map((id) => (
        <div key={id} className="mb-10">
          {/* 单帧：32 / 64 */}
          <div className="inline-flex items-start gap-4 mb-4">
            <Cell id={id} size={32} frame={0} />
            <Cell id={id} size={64} frame={0} />
          </div>
          {/* 呼吸雪碧图：三帧横排 */}
          <div className="inline-flex items-start gap-4">
            <div data-strip={id} data-strip-size="32" className="inline-flex">
              {FRAMES.map((f) => (
                <PixelAdvisor
                  key={f}
                  id={id}
                  animate={false}
                  breathFrame={f}
                  className="block h-8 w-8"
                />
              ))}
            </div>
            <div data-strip={id} data-strip-size="64" className="inline-flex">
              {FRAMES.map((f) => (
                <PixelAdvisor
                  key={f}
                  id={id}
                  animate={false}
                  breathFrame={f}
                  className="block h-16 w-16"
                />
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* 全员排排站（frame 0 静止） */}
      <div className="mb-10">
        <div data-lineup="64" className="inline-flex">
          {ADVISOR_IDS.map((id) => (
            <PixelAdvisor
              key={id}
              id={id}
              animate={false}
              breathFrame={0}
              className="block h-16 w-16"
            />
          ))}
        </div>
        <div data-lineup="32" className="inline-flex">
          {ADVISOR_IDS.map((id) => (
            <PixelAdvisor
              key={id}
              id={id}
              animate={false}
              breathFrame={0}
              className="block h-8 w-8"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
