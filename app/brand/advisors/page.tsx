'use client';

/**
 * 南洋出海局 · 8 位像素幕僚角色评审页（批次 11）
 *
 * 展示全部 8 位幕僚立绘（64px 呼吸动画）+ 32/64 尺寸对比条。
 * 内部品牌资产页，不挂导航链接。
 */
import { BrandShell } from '@/components/brand/BrandShell';
import { ADVISORS, PixelAdvisor } from '@/components/brand/advisors';

export default function BrandAdvisorsPage() {
  return (
    <BrandShell>
      <div className="brand-light min-h-screen bg-ricepaper text-ink">
        <main className="relative max-w-6xl mx-auto px-5 py-12">
          {/* 页头 */}
          <section className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-vermilion/10 rounded-full mb-6">
              <span className="text-sm text-vermilion font-brand-pixel">幕僚厅 · 角色设计</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold text-ink font-brand-title">
              南洋出海局 · 八位幕僚
            </h1>
            <p className="text-sandalwood mt-3 max-w-2xl mx-auto">
              像素风立绘 · 明代服饰统一 · 身旁道具直指职能 · 点击下方按钮可对照呼吸动画
            </p>
          </section>

          {/* 角色卡网格 */}
          <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {ADVISORS.map((a) => (
              <div
                key={a.id}
                data-advisor-card={a.id}
                className="card-brand p-6 flex flex-col items-center text-center"
              >
                <div className="h-16 w-16 flex items-center justify-center">
                  <PixelAdvisor id={a.id} animate className="h-16 w-16" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-ink font-brand-title">{a.name}</h2>
                <p className="text-sm text-sandalwood">{a.title}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {a.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-vermilion/10 text-vermilion text-xs font-brand-pixel"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* 尺寸对比：32px / 64px */}
          <section className="card-brand p-8 mb-16">
            <h2 className="text-xl font-bold text-ink font-brand-title text-center mb-6">
              尺寸对照（32×32 与 64×64，透明背景）
            </h2>
            <div className="space-y-8">
              <div>
                <p className="text-xs text-sandalwood mb-3 font-brand-pixel">32 × 32</p>
                <div className="flex flex-wrap gap-6 items-start">
                  {ADVISORS.map((a) => (
                    <div key={a.id} className="flex flex-col items-center gap-1.5">
                      <PixelAdvisor id={a.id} animate={false} className="h-8 w-8" />
                      <span className="text-xs text-sandalwood">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-sandalwood mb-3 font-brand-pixel">64 × 64</p>
                <div className="flex flex-wrap gap-6 items-start">
                  {ADVISORS.map((a) => (
                    <div key={a.id} className="flex flex-col items-center gap-1.5">
                      <PixelAdvisor id={a.id} animate={false} className="h-16 w-16" />
                      <span className="text-xs text-sandalwood">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 设计说明 */}
          <section className="text-center">
            <p className="text-sm text-sandalwood">
              呼吸动画：身随脚底轴微上浮（3 帧循环），身旁道具保持静止 · 透明背景 PNG / Sprite Sheet 由
              <code className="font-brand-pixel text-vermilion"> scripts/export-advisors.mjs </code>
              导出至
              <code className="font-brand-pixel text-vermilion"> brand/advisors/png/</code>
            </p>
          </section>
        </main>
      </div>
    </BrandShell>
  );
}
