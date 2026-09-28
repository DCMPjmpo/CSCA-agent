'use client';

/**
 * 首页 (Home) — Batch 4 重构
 *
 * 目标：
 *  - 删除 SeaChartSandbox（像素/沙盘/游戏）
 *  - 删除 Hero 中的像素字体/8-bit 按钮阴影/金箔短横分割线
 *  - 建立：VoyagePageHeader (Eyebrow + 标题 + 一句解释 + Progress)
 *          → HeroStatsCards（真实数据：阶段进度 / 已做题 / 国家 / HSK）
 *          → 3 主入口卡 (诊断 / 航海图 / AI 助手)
 *          → Editorial Section Features（3 条体系介绍）
 *          → StageFooter（进入学习航程）
 *  - 严格遵守 RED LINE：按钮、颜色、字体、无渐变蓝紫、不编造数据
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  BookOpen,
  BrainCircuit,
  Target,
  Layers3,
  Milestone,
  Sparkles,
  Globe2,
  X,
  GraduationCap,
  FileCheck2,
  Map as MapIcon,
  Users,
  Ship,
} from 'lucide-react';
import { BrandShell } from '@/components/brand/BrandShell';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCscaSession } from '@/lib/hooks/use-csca-session';
import { VoyagePageHeader, StageCard, StageFooter } from '@/components/voyage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ASEAN_COUNTRIES } from '@/lib/csca/asean-countries';
import { getCurrentStageIndex, VOYAGE_STAGE_ORDER, type VoyageStageId } from '@/lib/voyage-stages';
import {
  LEARNING_VOYAGE_8_STOPS,
  REAL_VOYAGE_TO_CSCA,
  type LearningVoyageStop,
} from '@/lib/brand-logic';

const RETURN_BANNER_KEY = 'csca_last_visit';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

type StatItem = {
  eyebrow: string;
  value: React.ReactNode;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: 'default' | 'accent' | 'success' | 'paper';
};

export default function HomePage() {
  const { t, locale } = useTranslation();
  const session = useCscaSession();
  const [showReturnBanner, setShowReturnBanner] = useState(false);

  useEffect(() => {
    try {
      const now = Date.now();
      const last = Number(localStorage.getItem(RETURN_BANNER_KEY) || '0');
      if (!last || now - last >= THREE_DAYS_MS) {
        localStorage.setItem(RETURN_BANNER_KEY, String(now));
        if (last) setShowReturnBanner(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* --------- 真实数据（不编造） --------- */
  // Hydration-safe: session.sessionData is null on server AND client first
  // render (set in useEffect via useCscaSession). Both renders produce
  // placeholders ('-'), avoiding SSR/CSR mismatch.
  const realData = useMemo(() => {
    const s = session.sessionData as Record<string, unknown> | null;
    const prog = session.progress;
    const stageIndex = prog.currentStage;
    const doneCount = prog.completedCount;
    const country =
      s?.selectedCountryCode &&
      ASEAN_COUNTRIES.find(
        (c: { code: string; nameZh?: string; name: string }) => c.code === s.selectedCountryCode,
      );
    const examScores = s?.examResult?.scores as Record<string, number> | undefined;
    const totalScores = examScores
      ? Object.values(examScores).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
      : null;
    const errorCount =
      (s?.errorAnalysis?.errorBreakdown as Array<{ count?: number }> | undefined)?.reduce(
        (a, b) => a + (b?.count ?? 0),
        0,
      ) ?? 0;
    return {
      stageIndex,
      doneCount,
      countryName: country
        ? (locale?.startsWith('zh')
            ? (country as { nameZh?: string }).nameZh
            : (country as { name: string }).name) || (country as { name: string }).name
        : '—',
      countryCode: s?.selectedCountryCode ?? '—',
      hskLevel: typeof s?.hskLevel === 'number' ? `HSK ${s.hskLevel}` : '—',
      major: (s?.targetMajorId && (s.targetMajorId as string).replace(/-/g, ' ')) || '—',
      subjects: Array.isArray(s?.selectedSubjects) ? s.selectedSubjects : [],
      totalScores,
      errorCount,
    };
  }, [locale, session.currentStageKey, session.progress, session.sessionData]);

  const stagesTotal = session.progress.totalStages;
  const pct = session.progress.progressPercent;

  /* --------- Hero Stats Cards（真实） --------- */
  const stats: StatItem[] = [
    {
      eyebrow: t.flow?.progress ?? 'Progress',
      value: (
        <span className="tabular-nums">
          {pct}
          <span className="text-[16px] font-medium ml-0.5 text-[color:var(--color-muted-gold)]">
            %
          </span>
        </span>
      ),
      label: `${realData.doneCount} / ${stagesTotal} ${
        typeof realData.doneCount === 'number' && locale?.startsWith('zh') ? '阶段完成' : 'stages'
      }`,
      icon: Compass,
      tone: 'default',
    },
    {
      eyebrow: locale?.startsWith('zh') ? '目标国家' : 'Destination',
      value: <span>{realData.countryName}</span>,
      label:
        realData.countryCode !== '—'
          ? `${realData.countryCode}${realData.hskLevel !== '—' ? ` · ${realData.hskLevel}` : ''}`
          : locale?.startsWith('zh')
            ? '待选择（进入诊断确认）'
            : 'Confirm via Diagnosis',
      icon: Globe2,
      tone: 'paper',
    },
    {
      eyebrow: locale?.startsWith('zh') ? '模拟成绩' : 'Mock Exam',
      value:
        realData.totalScores !== null ? (
          <span className="tabular-nums">{realData.totalScores}</span>
        ) : (
          <span className="text-[color:var(--color-muted-foreground)] font-medium">
            {locale?.startsWith('zh') ? '未参加' : '—'}
          </span>
        ),
      label:
        realData.totalScores !== null
          ? locale?.startsWith('zh')
            ? `累计错题 ${realData.errorCount}`
            : `errors ${realData.errorCount}`
          : locale?.startsWith('zh')
            ? '试航阶段产出'
            : 'After Trial Voyage',
      icon: FileCheck2,
      tone: 'success',
    },
    {
      eyebrow: locale?.startsWith('zh') ? '关注科目' : 'Subjects',
      value:
        realData.subjects.length > 0 ? (
          <span>{realData.subjects.slice(0, 3).join(' · ')}</span>
        ) : (
          <span className="text-[color:var(--color-muted-foreground)] font-medium">
            {locale?.startsWith('zh') ? '待诊断' : 'TBD'}
          </span>
        ),
      label:
        realData.subjects.length > 3
          ? locale?.startsWith('zh')
            ? `+${realData.subjects.length - 3} 等`
            : `+${realData.subjects.length - 3} more`
          : locale?.startsWith('zh')
            ? `目标方向：${realData.major}`
            : `Major: ${realData.major}`,
      icon: BookOpen,
      tone: 'accent',
    },
  ];

  /* --------- 8 段学习航程（Learning Voyage 品牌展示） --------- */
  const voyage8: Array<
    LearningVoyageStop & {
      Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
      href: string;
      cta: string;
      statusBias: 'next' | 'current' | 'done' | 'locked';
    }
  > = LEARNING_VOYAGE_8_STOPS.map((s, i) => {
    const ics = s.internalStageIndex;
    const completedSet = new Set(session.progress.completedStages);
    let bias: 'next' | 'current' | 'done' | 'locked' = 'locked';
    if (completedSet.has(ics)) bias = 'done';
    else if (realData.stageIndex === ics) bias = 'current';
    else if (realData.stageIndex + 1 >= ics) bias = 'next';
    const ICONS = [Target, MapIcon, Layers3, Ship, Compass, FileCheck2, BookOpen, Milestone];
    const Icon = ICONS[i % ICONS.length];
    return {
      ...s,
      Icon,
      // [P0-1-FIX] 8 段卡片必须落到真实渲染这些 step 的 /csca/voyage。
      // /csca 是备考工作台，页面内不存在任何 stage 锚点。
      // anchor 取值见 lib/brand-logic.ts 的 LEARNING_VOYAGE_8_STOPS，
      // 与 VoyageNavigation STAGES / CSCAVoyageApp HASH_TO_STEP 三边一致。
      href: `/csca/voyage#${s.anchor}`,
      cta:
        t.voyageBrand?.ctaStage ?? (locale?.startsWith('zh') ? '进入此段航程' : 'Open this stage'),
      statusBias: bias,
    };
  });

  /* --------- Editorial Features（ROUTE / PORT / CREW） --------- */
  const features: Array<{
    index: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }> = [
    {
      index: 'I',
      eyebrow: t.features?.col1Eyebrow ?? (locale?.startsWith('zh') ? '航线 · ROUTE' : 'ROUTE'),
      title:
        t.features?.col1Title ??
        (locale?.startsWith('zh') ? '一整条学习航程' : 'The Learning Voyage'),
      subtitle:
        t.features?.col1Desc ??
        (locale?.startsWith('zh')
          ? '出发点 → 航图 → 训练 → 试航 → 测评 → 修正 → 航程 → 目标。连续的学习逻辑，不是孤立的功能。'
          : 'Departure → Chart → Training → Trial → Observation → Correction → Route → Destination.'),
      Icon: Ship,
    },
    {
      index: 'II',
      eyebrow: t.features?.col2Eyebrow ?? (locale?.startsWith('zh') ? '港口 · PORT' : 'PORT'),
      title:
        t.features?.col2Title ??
        (locale?.startsWith('zh') ? '院校港口（目的地）' : 'University Port'),
      subtitle:
        t.features?.col2Desc ??
        (locale?.startsWith('zh')
          ? '9 段航程完成后，AI 航海助手基于真实 HSK/科目/试航成绩匹配院校与专业，给出申请顺序建议。'
          : 'After all 9 stages, AI Mate matches universities & majors using real HSK, subjects, trial scores.'),
      Icon: Milestone,
    },
    {
      index: 'III',
      eyebrow: t.features?.col3Eyebrow ?? (locale?.startsWith('zh') ? '船员 · CREW' : 'CREW'),
      title:
        t.features?.col3Title ??
        (locale?.startsWith('zh') ? 'AI 航海助手（全局）' : 'AI Mate (Global)'),
      subtitle:
        t.features?.col3Desc ??
        (locale?.startsWith('zh')
          ? '在错题默认分析错题、航程计划默认调计划、航海图默认解释「我为什么要学这个」、试航后默认复盘。'
          : 'By default: analyse errors on Correction Route, tune the plan, explain "why learn this" on the Chart, review after Trial.'),
      Icon: Users,
    },
  ];

  return (
    <BrandShell>
      <div className="brand-light min-h-screen bg-[color:var(--background)] text-[color:var(--color-ink-900)]">
        {/* Return banner — 克制化（非游戏绿） */}
        {showReturnBanner && (
          <div className="fixed top-0 left-0 right-0 z-[70] bg-[color:var(--color-deep-ocean-800)] border-b border-[color:var(--color-sidebar-border)]">
            <div className="flex items-center justify-center gap-3 px-4 py-2.5 text-[13px] text-white/95 max-w-7xl mx-auto">
              <GraduationCap
                className="w-4 h-4 shrink-0 text-[color:var(--color-muted-gold)]"
                strokeWidth={2}
              />
              <span className="truncate">{t.common.returnBanner}</span>
              <button
                onClick={() => setShowReturnBanner(false)}
                aria-label="关闭"
                className="ml-auto p-1 rounded-[4px] hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}

        <main className="relative max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-20">
          {/* ---- 统一顶部：回答「你准备从哪里出发？」 ---- */}
          <VoyagePageHeader
            eyebrow={t.hero?.badge ?? 'YOUR CSCA VOYAGE'}
            title={
              t.hero?.title ??
              (locale?.startsWith('zh') ? '你的 CSCA 学习航程' : 'Your CSCA Learning Voyage')
            }
            description={
              t.hero?.description ??
              (locale?.startsWith('zh')
                ? '从定位方向，到掌握知识，再到最终通过 CSCA。'
                : 'From setting direction, to mastering the chart, to passing CSCA.')
            }
            currentBreadcrumb={t.nav.voyage?.index ?? '航程概览'}
            actions={
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button asChild size="lg">
                  <Link href="/csca" className="gap-2">
                    <span>
                      {t.hero?.cta ??
                        (locale?.startsWith('zh') ? '开始我的航程' : 'Begin My Voyage')}
                    </span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.1} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/csca/voyage#knowledge-map">
                    <span>
                      {t.hero?.secondaryCta ??
                        (locale?.startsWith('zh') ? '查看航海图' : 'View Voyage Chart')}
                    </span>
                  </Link>
                </Button>
              </div>
            }
          />

          {/* ---- Hero Stats Cards (真实) ---- */}
          <section aria-label="learning stats" className="mb-14 md:mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {stats.map((s, i) => {
                const Icon = s.icon;
                const bg =
                  s.tone === 'accent'
                    ? 'bg-[color:var(--color-muted-gold)]/8 border border-[color:var(--color-muted-gold)]/25'
                    : s.tone === 'success'
                      ? 'bg-[color:var(--color-status-success)]/6 border border-[color:var(--color-status-success)]/20'
                      : s.tone === 'paper'
                        ? 'bg-[color:var(--color-paper-100)]/80 border border-[color:var(--color-line-200)]'
                        : 'bg-white border border-[color:var(--color-line-200)]';
                return (
                  <div
                    key={i}
                    className={cn(
                      'group rounded-[12px] p-5 md:p-6 relative overflow-hidden transition-all duration-200',
                      bg,
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="voyage-eyebrow text-[10.5px]">{s.eyebrow}</p>
                        <div className="mt-3 font-[600] text-[28px] md:text-[30px] leading-none tracking-tight text-[color:var(--color-ink-900)]">
                          {s.value}
                        </div>
                        <p className="mt-3 text-[12.5px] leading-[1.6] text-[color:var(--color-muted-foreground)]">
                          {s.label}
                        </p>
                      </div>
                      <div className="shrink-0 w-10 h-10 rounded-[8px] bg-white border border-[color:var(--color-line-200)] flex items-center justify-center text-[color:var(--color-deep-ocean-700)]">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---- Learning Voyage 01…08（品牌航段；删除旧 3 主入口卡） ---- */}
          <StageCard
            eyebrow={t.voyageBrand?.sectionEyebrow ?? 'LEARNING VOYAGE'}
            index="01→08"
            title={
              locale?.startsWith('zh')
                ? (t.voyageBrand?.sectionTitle ?? '学习航程 · 8 段航段')
                : (t.voyageBrand?.sectionTitleEN ?? 'THE 8 STOPS OF YOUR VOYAGE')
            }
            subtitle={
              locale?.startsWith('zh')
                ? (t.voyageBrand?.sectionSubtitle ??
                  '每一段都沿着真实航海的逻辑展开：出发 → 航图 → 训练 → 试航 → 测评 → 修正 → 航程 → 目标。')
                : (t.voyageBrand?.sectionSubtitleEN ??
                  'Departure → Chart → Training → Trial → Observation → Correction → Route → Destination.')
            }
            tone="default"
            className="mb-14 md:mb-16"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mt-4 md:mt-6">
              {voyage8.map((s) => {
                const Icon = s.Icon;
                const zh = locale?.startsWith('zh');
                const title = zh ? s.title : s.titleEN;
                const sub = zh ? s.subtitle : s.subtitleEN;
                const eyebrow = zh ? `${s.code}  ${s.eyebrow.toUpperCase()}` : s.eyebrowEN;
                const statusBg =
                  s.statusBias === 'done'
                    ? 'border-[color:var(--color-status-success)]/30 bg-[color:var(--color-status-success)]/4'
                    : s.statusBias === 'current'
                      ? 'border-[color:var(--color-deep-ocean-700)]/50 bg-white'
                      : s.statusBias === 'next'
                        ? 'border-[color:var(--color-line-200)] bg-white'
                        : 'border-[color:var(--color-line-200)]/60 bg-[color:var(--color-paper-200)]/40';
                return (
                  <Link
                    key={s.code}
                    href={s.href}
                    aria-label={title}
                    className={cn(
                      'group relative rounded-[12px] p-5 md:p-[22px] flex flex-col justify-between min-h-[168px]',
                      statusBg,
                      'border transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_10px_28px_-16px_rgba(7,28,38,0.26)] hover:border-[color:var(--color-deep-ocean-700)]/40',
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <p className="voyage-eyebrow text-[10.5px] whitespace-nowrap truncate">
                          {eyebrow}
                        </p>
                        <div className="shrink-0 w-9 h-9 rounded-[8px] bg-[color:var(--color-paper-100)] border border-[color:var(--color-line-200)] text-[color:var(--color-deep-ocean-700)] flex items-center justify-center group-hover:bg-[color:var(--color-deep-ocean-700)] group-hover:text-white transition-colors duration-200">
                          <Icon className="w-4.5 h-4.5" strokeWidth={2} />
                        </div>
                      </div>
                      <h3 className="mt-4 font-editorial-title text-[18px] md:text-[19px] leading-[1.3] text-[color:var(--color-ink-900)]">
                        {title}
                      </h3>
                      <p className="mt-2 text-[12.5px] leading-[1.65] text-[color:var(--color-muted-foreground)]">
                        {sub}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[color:var(--color-line-200)] flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-[color:var(--color-deep-ocean-700)]">
                        {s.cta}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 text-[color:var(--color-muted-gold)] group-hover:translate-x-0.5 transition-transform duration-200"
                        strokeWidth={2.2}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </StageCard>

          {/* ---- Editorial Section Features（ROUTE / PORT / CREW） ---- */}
          <StageCard
            eyebrow={
              t.features?.sectionEyebrow ??
              (locale?.startsWith('zh') ? '平台体系 · PLATFORM' : 'PLATFORM')
            }
            index="CSCA"
            title={
              locale?.startsWith('zh')
                ? (t.features?.sectionTitle ?? '航海档案式学习平台')
                : (t.features?.sectionTitleEN ?? 'A MARITIME LEARNING ARCHIVE')
            }
            subtitle={
              locale?.startsWith('zh')
                ? (t.features?.sectionSubtitle ??
                  '9 段航程逐一展开：从出发点到院校港口，每一份学习档案都可追溯、可可视化、被 AI 真正理解并利用。')
                : (t.features?.sectionSubtitleEN ??
                  '9 stages, fully archived, traceable, visualizable, and understood end-to-end by AI.')
            }
            tone="paper"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-4">
              {features.map((f) => {
                const Icon = f.Icon;
                return (
                  <article key={f.index} className="relative flex flex-col gap-3 min-w-0">
                    <div className="flex items-center justify-between gap-3 pb-4 border-b border-[color:var(--color-line-200)]">
                      <p className="voyage-eyebrow text-[10.5px]">{f.eyebrow}</p>
                      <span className="font-[500] tracking-[0.15em] text-[11px] text-[color:var(--color-ink-500)]">
                        {f.index}
                      </span>
                    </div>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-[8px] bg-white border border-[color:var(--color-line-200)] text-[color:var(--color-deep-ocean-700)] flex items-center justify-center">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-[600] text-[16px] leading-[1.35] text-[color:var(--color-ink-900)] mb-1.5">
                          {f.title}
                        </h4>
                        <p className="text-[13.5px] leading-[1.75] text-[color:var(--color-muted-foreground)]">
                          {f.subtitle}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </StageCard>

          {/* ---- Footer CTA ---- */}
          <StageFooter
            meta={
              <span>
                {locale?.startsWith('zh')
                  ? `${VOYAGE_STAGE_ORDER.length} 段内部阶段 · ${REAL_VOYAGE_TO_CSCA.length} 步真实航海 → CSCA 对应`
                  : `${VOYAGE_STAGE_ORDER.length} internal stages · ${REAL_VOYAGE_TO_CSCA.length}-step real-voyage → CSCA mapping`}
              </span>
            }
            nextHref="/csca"
            nextLabel={
              t.hero?.cta ?? (locale?.startsWith('zh') ? '开始我的航程' : 'Begin My Voyage')
            }
            nextVariant="default"
          />
        </main>
      </div>
    </BrandShell>
  );
}
