'use client';

/**
 * VoyageNavigation · CSCA Learning Platform (Batch 2 · 航海式侧栏)
 *
 * 桌面：左侧 Deep Ocean 窄侧栏（展开 260px / 折叠 76px），更轻、更现代、层级分明。
 *   - 顶部品牌区：CSCA · Learning Voyage（中文主 / 英文 eyebrow metadata，数字不抢主体）
 *   - 9 段航线导航：01 定位 / 02 航海图 / 03 演练 / 04 试航 / 05 观星测运 / 06 错题修正 / 07 学习航程 / 08 AI 航海助手 / 09 院校港口
 *   - 当前：左侧 3px Voyage Blue 条 + 高亮字色
 *   - 已完成：右侧 muted-green Check icon
 *   - 未解锁：右侧 ink-300 Lock icon（非游戏化）
 * 移动：Bottom Navigation（4 个主入口 + More 抽屉），Drawer 展开后完整 9 段航线。
 *
 * 去游戏化：移除竹简、像素卷轴、金箔描边、厚重黑描边、朱批 3D 阴影、流苏、轴头等。
 */
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Compass,
  Map,
  Swords,
  Ship,
  Star,
  Eraser,
  Route,
  Bot,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  Home as HomeIcon,
  BookOpenText,
  Sparkles,
  RotateCcw,
  Wand2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { CscaLanguageSwitcher } from '@/components/csca/CscaLanguageSwitcher';
import { cn } from '@/lib/utils';
import { useNav } from './BrandShell';
import { useCscaSession } from '@/lib/hooks/use-csca-session';
import { restartVoyage } from '@/lib/voyage-progress';
import type { LucideIcon } from 'lucide-react';

type StageId =
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'stage4'
  | 'stage5'
  | 'stage6'
  | 'stage7'
  | 'stage8'
  | 'stage9';

type TopLevelId = 'home' | 'voyage' | 'studio' | 'case-study' | 'assistant';

interface StageLink {
  id: StageId;
  href: string;
  section: 'learning' | 'outcome';
  icon: LucideIcon;
}

interface TopLink {
  id: TopLevelId;
  href: string;
  labelKey: 'home' | 'prepCenter' | 'studio' | 'caseStudy' | 'aiAssistant';
  icon: LucideIcon;
}

const TOP_LINKS: TopLink[] = [
  { id: 'home', href: '/', labelKey: 'home', icon: HomeIcon },
  { id: 'voyage', href: '/csca', labelKey: 'prepCenter', icon: Compass },
  { id: 'case-study', href: '/csca/case-study', labelKey: 'caseStudy', icon: BookOpenText },
  { id: 'assistant', href: '/csca-multi-agent', labelKey: 'aiAssistant', icon: Sparkles },
  // AI Learning Studio：与「学习航程」平级的产品入口，**不是** Voyage 的第 10 段。
  // 放在 TOP_LINKS 而不是 STAGES，避免污染 9 段航线的语义与解锁状态。
  { id: 'studio', href: '/csca/studio', labelKey: 'studio', icon: Wand2 },
];

/**
 * 9 段航线入口。
 *
 * [P0-1-FIX] 学习段的 href 必须是 `/csca/voyage#<hash>`：
 *   - `/csca` 是备考工作台（dashboard），页面上不存在任何 stage 锚点；
 *   - 真正渲染 10 个 step 的是 `/csca/voyage`（CSCAVoyageApp），
 *     其 hash 白名单见 components/csca/CSCAVoyageApp.tsx 的 HASH_TO_STEP。
 * 两侧 hash 必须逐字一致（`error-review` 而非 `error-analysis`，
 * `mock-exam` 映射到 exam_center step）。
 */
const STAGES: StageLink[] = [
  { id: 'stage1', href: '/csca/voyage#diagnosis', section: 'learning', icon: Compass },
  { id: 'stage2', href: '/csca/voyage#knowledge-map', section: 'learning', icon: Map },
  { id: 'stage3', href: '/csca/voyage#adaptive-learning', section: 'learning', icon: Swords },
  { id: 'stage4', href: '/csca/voyage#mock-exam', section: 'learning', icon: Ship },
  { id: 'stage5', href: '/csca/voyage#score-analysis', section: 'learning', icon: Star },
  { id: 'stage6', href: '/csca/voyage#error-review', section: 'learning', icon: Eraser },
  { id: 'stage7', href: '/csca/voyage#study-plan', section: 'learning', icon: Route },
  { id: 'stage8', href: '/csca-multi-agent', section: 'outcome', icon: Bot },
  { id: 'stage9', href: '/csca/voyage#university-match', section: 'outcome', icon: Building2 },
];

/**
 * 判定某个 stage 是否为当前所在段。
 * 带 hash 的 stage：路径与 hash 都必须匹配（否则在 /csca/voyage 上会 8 段同时高亮）。
 */
function stageIsActive(
  href: string,
  id: StageId,
  pathname: string | null,
  hashKey: string,
): boolean {
  if (!pathname) return false;
  if (id === 'stage8') return pathname.startsWith('/csca-multi-agent');
  const [hrefPath, hrefHash] = href.split('#');
  if (hrefHash) return pathname === hrefPath && hashKey === hrefHash;
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function pathIsOnCscaRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/csca' || pathname.startsWith('/csca/');
}

/**
 * 航线完成状态：
 * - 已完成：session 对应阶段 step >= done；
 * - 未解锁：当前阶段 index 之前未满足前置（保守策略：仅按 stage <= current+1 解锁）
 *
 * [P0-1-FIX] stepToIndex 的 key 必须覆盖 `lib/csca/session` 里真实写入的 `currentStep`
 * （即 `Step` 联合类型：diagnosis / knowledge_map / adaptive_learning / exam_center /
 * exam / result / error_review / study_plan / university_match / ai_tutor）。
 * 旧表只有 `diagnosis` 能命中，导致真实用户 session 下 idx 恒为 -1、
 * stage2–stage9 全部落到 'locked' 分支并以 href="#" 渲染 —— 导航整体不可点。
 * 这里同时保留连字符变体，兼容旧数据与 URL hash 命名。
 */
function deriveStageStates(
  currentStepKey: string | null | undefined,
): Record<StageId, 'done' | 'current' | 'unlocked' | 'locked'> {
  const order: StageId[] = [
    'stage1',
    'stage2',
    'stage3',
    'stage4',
    'stage5',
    'stage6',
    'stage7',
    'stage8',
    'stage9',
  ];
  const stepToIndex: Record<string, number> = {
    diagnosis: 0,
    knowledge_map: 1,
    'knowledge-map': 1,
    adaptive_learning: 2,
    'adaptive-learning': 2,
    exam_center: 3,
    exam: 3,
    mock_exam: 3,
    'mock-exam': 3,
    result: 4,
    score_analysis: 4,
    'score-analysis': 4,
    error_review: 5,
    'error-review': 5,
    'error-analysis': 5,
    study_plan: 6,
    'study-plan': 6,
    ai_tutor: 7,
    'ai-tutor': 7,
    university_match: 8,
    'university-match': 8,
  };
  const idx = currentStepKey ? (stepToIndex[currentStepKey] ?? -1) : -1;
  const result = {} as Record<StageId, 'done' | 'current' | 'unlocked' | 'locked'>;
  for (let i = 0; i < order.length; i++) {
    const s = order[i];
    if (idx === -1) {
      // 未开始：stage1 unlocked，其余 locked
      result[s] = i === 0 ? 'unlocked' : 'locked';
    } else if (i < idx) {
      result[s] = 'done';
    } else if (i === idx) {
      result[s] = 'current';
    } else if (i === idx + 1) {
      result[s] = 'unlocked';
    } else {
      result[s] = 'locked';
    }
  }
  // stage8 (AI) / stage9 (院校港口)：保守视为 unlocked（即使前置未完成，也应能进入浏览）
  if (idx >= 0) {
    result.stage8 = result.stage8 === 'locked' ? 'unlocked' : result.stage8;
    result.stage9 = result.stage9 === 'locked' ? 'unlocked' : result.stage9;
  }
  return result;
}

export function VoyageNavigation() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const { collapsed, setCollapsed, setMobileOpen, mobileOpen } = useNav();
  const [drawerMore, setDrawerMore] = useState(false);
  const session = useCscaSession();
  const progress = session.progress;

  // [P0-1-FIX] 当前 hash：stage 高亮需要 pathname + hash 共同判定，
  // 否则在 /csca/voyage 上 8 个学习段会同时高亮。
  const [hashKey, setHashKey] = useState('');
  useEffect(() => {
    const sync = () => setHashKey(window.location.hash.replace(/^#/, ''));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const stageState = useMemo(
    () => deriveStageStates(session.currentStageKey),
    [session.currentStageKey],
  );

  // csca 路径下自动展开侧栏（避免一开始折叠时无法感知阶段）
  useEffect(() => {
    if (pathIsOnCscaRoute(pathname)) {
      // 保留用户明确的 collapsed 选择，不强制。
    }
  }, [pathname]);

  const voy = t.nav.voyage;
  const stagesMeta = [
    voy.stage1,
    voy.stage2,
    voy.stage3,
    voy.stage4,
    voy.stage5,
    voy.stage6,
    voy.stage7,
    voy.stage8,
    voy.stage9,
  ];

  const activeTop = (() => {
    if (!pathname) return null;
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/csca-multi-agent')) return 'assistant';
    if (pathname === '/csca/case-study' || pathname.startsWith('/csca/case-study/'))
      return 'case-study';
    // Studio 有**自己的** active 语义：在 /csca/studio 上高亮「AI Learning Studio」，
    // 而不是让用户以为自己还在「学习航程」（这是最小必要修正，不改动 9 段航线）。
    if (pathname === '/csca/studio' || pathname.startsWith('/csca/studio/')) return 'studio';
    if (pathname.startsWith('/csca')) return 'voyage';
    return null;
  })();

  // [P0-1-FIX] 当用户已经在目标路径上时，Next <Link> 会用 history.pushState 只改 hash，
  // 而 pushState 不触发 hashchange —— CSCAVoyageApp 的「hash → step」监听会收不到信号，
  // 表现为"点了侧栏但页面不动"。这里对同路径点击改走原生 fragment 导航（会触发
  // hashchange），跨路由点击仍交给 Next 处理（那时组件会重新 mount 并读 hash）。
  const handleStageClick = (e: { preventDefault: () => void }, href: string, locked: boolean) => {
    if (locked) {
      e.preventDefault();
      return;
    }
    const [targetPath, targetHash] = href.split('#');
    if (targetHash && window.location.pathname === targetPath) {
      e.preventDefault();
      window.location.hash = targetHash;
    }
  };

  return (
    <>
      {/* ===================== 桌面侧栏 ===================== */}
      <aside
        data-testid="voyage-nav-desktop"
        aria-label={t.nav.learningVoyage ?? 'Learning Voyage'}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 hidden lg:flex flex-col',
          'bg-[color:var(--color-deep-ocean)] text-[color:var(--color-sidebar-foreground)]',
          'border-r border-[color:var(--color-sidebar-border)]',
          'transition-[width] duration-200 ease-out',
        )}
        style={{ width: collapsed ? '76px' : '260px' }}
      >
        {/* -------- Brand block -------- */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 shrink-0 border-b border-[color:var(--color-sidebar-border)]',
            collapsed ? 'justify-center px-0 py-4' : 'px-5 py-4',
          )}
        >
          <div
            className="relative w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, var(--color-deep-ocean-700) 0%, var(--color-deep-ocean-800) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <GraduationCap
              className="w-4.5 h-4.5 text-[color:var(--color-muted-gold)]"
              style={{ width: 18, height: 18 }}
            />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-semibold tracking-tight text-white/95 font-sans truncate">
                  CSCA
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-muted-gold)] font-semibold">
                  Learning Voyage
                </span>
              </div>
              <p className="text-[11px] text-[color:var(--color-sidebar-foreground)]/60 truncate mt-0.5">
                {t.nav.tagline}
              </p>
            </div>
          )}
        </Link>

        {/* -------- Top-level 4 入口 -------- */}
        <div className={cn('flex flex-col gap-1 px-2 pt-3', collapsed && 'px-1.5')}>
          {TOP_LINKS.map((l) => {
            const Icon = l.icon;
            const isActive = activeTop === l.id;
            const label = (t.nav as unknown as Record<string, string>)[l.labelKey] ?? l.labelKey;
            return (
              <Link
                key={l.id}
                href={l.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-[8px] px-2.5 py-2 text-[13px]',
                  'transition-all duration-200',
                  collapsed && 'justify-center px-0 py-2.5',
                  isActive
                    ? 'bg-[color:var(--color-sidebar-accent)] text-white font-medium'
                    : 'text-[color:var(--color-sidebar-foreground)]/80 hover:bg-white/5 hover:text-white',
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[color:var(--color-voyage-blue)]" />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0 opacity-90" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </div>

        {/* -------- Learning stages header / 分组（非彩色方块） -------- */}
        {!collapsed && (
          <div className="px-5 pt-5 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-white/6" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">
                {t.nav.learningVoyage ?? 'Learning Voyage'}
              </span>
              <div className="flex-1 h-px bg-white/6" />
            </div>
          </div>
        )}
        {collapsed && <div className="mx-auto my-2 h-px w-8 bg-white/10" />}

        {/* -------- 9 段航线 -------- */}
        <nav
          aria-label="voyage stages"
          className={cn(
            'flex flex-col gap-1 overflow-y-auto overflow-x-hidden',
            'flex-1 px-2 pb-2',
            collapsed && 'px-1.5',
          )}
        >
          {STAGES.map((stg, i) => {
            const m = stagesMeta[i];
            const Icon = stg.icon;
            const state = stageState[stg.id];
            const isActive = stageIsActive(stg.href, stg.id, pathname, hashKey);
            const locked = state === 'locked';
            return (
              <Link
                key={stg.id}
                href={locked ? '#' : stg.href}
                aria-disabled={locked}
                aria-current={isActive ? 'step' : undefined}
                onClick={(e) => handleStageClick(e, stg.href, locked)}
                className={cn(
                  'group relative flex items-center gap-3 rounded-[8px] px-2.5 py-2',
                  'transition-all duration-200',
                  collapsed && 'justify-center px-0 py-2.5',
                  isActive
                    ? 'bg-[color:var(--color-voyage-blue)]/16 text-white'
                    : 'text-[color:var(--color-sidebar-foreground)]/80 hover:bg-white/5 hover:text-white',
                  locked &&
                    'opacity-55 cursor-not-allowed hover:bg-transparent hover:text-[color:var(--color-sidebar-foreground)]/60',
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[color:var(--color-voyage-blue)]" />
                )}
                {!collapsed ? (
                  <>
                    {/* 编号（metadata 小型化，不抢中文主体） */}
                    <span className="flex items-center justify-center w-6 h-6 shrink-0 rounded-[6px] border border-white/8 text-[10px] font-semibold tracking-wide text-white/55">
                      {m.code}
                    </span>
                    {/* 图标 + 文字主体 */}
                    <Icon className="w-[17px] h-[17px] shrink-0 text-white/75 group-hover:text-white" />
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <span className="text-[13px] leading-none font-medium truncate">
                        {m.title}
                      </span>
                      {/* eyebrow / metadata 行：英文小标签 + 二级中文 subtitle */}
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-[color:var(--color-sidebar-foreground)]/50 truncate">
                        <span className="uppercase tracking-[0.14em] font-semibold truncate">
                          {m.eyebrow}
                        </span>
                        <span className="opacity-80 truncate">· {m.subtitle}</span>
                      </div>
                    </div>
                    {/* 状态图标：done / locked / 空 */}
                    <div className="shrink-0 w-4 flex items-center justify-center">
                      {state === 'done' && (
                        <CheckCircle2
                          className="w-4 h-4 text-[color:var(--color-status-success)]"
                          aria-label="completed"
                        />
                      )}
                      {state === 'locked' && (
                        <Lock className="w-3.5 h-3.5 text-white/40" aria-label="locked" />
                      )}
                    </div>
                  </>
                ) : (
                  /* ---- 折叠态：图标为主 + 右侧 细线 status marker ---- */
                  <div className="relative flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] text-white/80 group-hover:text-white" />
                    {state === 'done' && (
                      <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-[color:var(--color-status-success)] ring-2 ring-[color:var(--color-deep-ocean)]" />
                    )}
                    {state === 'locked' && (
                      <Lock className="absolute -bottom-1 -right-1 w-[10px] h-[10px] text-white/60" />
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* -------- 底部：语言切换 + 折叠按钮 -------- */}
        <div
          className={cn(
            'flex flex-col gap-2 px-2 pb-3 pt-2 border-t border-[color:var(--color-sidebar-border)]',
            collapsed && 'px-1.5 items-stretch',
          )}
        >
          {!collapsed && <CscaLanguageSwitcher dropUp />}
          {!collapsed && (progress?.completedCount ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => {
                const isZh = locale?.startsWith('zh') ?? false;
                if (
                  window.confirm(
                    isZh
                      ? '将从第 1 段重新开始航程。你的答题记录、诊断结果、考试成绩等学习数据不会被删除。确认重新开始？'
                      : 'Restart voyage from Stage 1? Your answer history, diagnosis results, exam scores, and other learning data will be preserved.',
                  )
                ) {
                  restartVoyage();
                  window.location.reload();
                }
              }}
              className="flex items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-[11px] text-white/45 hover:text-white/80 hover:bg-white/5 transition-colors duration-150"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{String((t.nav as Record<string, unknown>).restart ?? 'Restart Voyage')}</span>
            </button>
          )}
          <button
            type="button"
            data-testid="nav-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? t.nav.expand : t.nav.collapse}
            className={cn(
              'flex items-center gap-2 rounded-[8px] px-2.5 py-2',
              'text-[12px] text-white/65 hover:text-white hover:bg-white/5 transition-colors duration-150',
              collapsed && 'justify-center',
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="truncate">{t.nav.collapse}</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ===================== 移动端 Bottom Nav ===================== */}
      <div className="lg:hidden">
        {/* Bottom 4 主入口 Tab */}
        <nav
          data-testid="voyage-nav-mobile"
          aria-label={t.nav.learningVoyage ?? 'Learning Voyage'}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--color-line-200)] bg-[color:var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--background)]/85"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-6 items-center">
            {TOP_LINKS.slice(0, 5).map((l) => {
              const Icon = l.icon;
              const isActive = activeTop === l.id;
              const label = (t.nav as unknown as Record<string, string>)[l.labelKey] ?? l.labelKey;
              return (
                <Link
                  key={l.id}
                  href={l.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex flex-col items-center gap-1 py-2 min-h-[52px] justify-center min-w-0',
                    'text-[11px] transition-colors',
                    isActive
                      ? 'text-[color:var(--color-deep-ocean-800)]'
                      : 'text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-700)]',
                  )}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-b bg-[color:var(--color-voyage-blue)]" />
                  )}
                  <Icon className="w-5 h-5" />
                  <span className="w-full truncate px-1 text-center">{label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileOpen?.(false);
                setDrawerMore(true);
              }}
              aria-label={t.nav.learningVoyage ?? 'More'}
              className={cn(
                'relative flex flex-col items-center gap-1 py-2 min-h-[52px] justify-center min-w-0 text-[11px] transition-colors',
                drawerMore
                  ? 'text-[color:var(--color-deep-ocean-800)]'
                  : 'text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-700)]',
              )}
            >
              <Compass className="w-5 h-5" />
              <span className="w-full truncate px-1 text-center">
                {t.nav.learningVoyage ?? 'Voyage'}
              </span>
            </button>
          </div>
        </nav>

        {/* Drawer：完整 9 段航线 */}
        {drawerMore && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 lg:hidden"
            onClick={() => setDrawerMore(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 bottom-0 rounded-t-[20px] bg-[color:var(--background)] border-t border-[color:var(--color-line-200)] max-h-[82vh] overflow-hidden flex flex-col"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[color:var(--color-line-200)]">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-muted-gold)] font-semibold">
                    CSCA · Learning Voyage
                  </div>
                  <div className="text-[15px] font-semibold text-[color:var(--color-ink-900)] mt-0.5">
                    {t.nav.learningVoyage}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerMore(false)}
                  className="w-9 h-9 rounded-full bg-[color:var(--color-paper-100)] text-[color:var(--color-ink-700)] flex items-center justify-center"
                  aria-label="Close"
                >
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>
              <div className="overflow-y-auto px-3 py-3 flex flex-col gap-1">
                {STAGES.map((stg, i) => {
                  const m = stagesMeta[i];
                  const Icon = stg.icon;
                  const state = stageState[stg.id];
                  const locked = state === 'locked';
                  const isActive = stageIsActive(stg.href, stg.id, pathname, hashKey);
                  return (
                    <Link
                      key={stg.id}
                      href={locked ? '#' : stg.href}
                      onClick={(e) => {
                        handleStageClick(e, stg.href, locked);
                        setDrawerMore(false);
                      }}
                      className={cn(
                        'relative flex items-center gap-3 rounded-[10px] px-3 py-2.5',
                        'border border-transparent transition-colors',
                        isActive
                          ? 'bg-[color:var(--color-paper-100)] border-[color:var(--color-line-200)] text-[color:var(--color-ink-900)]'
                          : 'text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-paper-100)]',
                        locked && 'opacity-60',
                      )}
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-[color:var(--color-paper-200)] text-[10px] font-semibold text-[color:var(--color-ink-700)]">
                        {m.code}
                      </span>
                      <Icon className="w-4 h-4 text-[color:var(--color-ink-500)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[color:var(--color-ink-900)] truncate">
                          {m.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[color:var(--color-ink-500)] truncate">
                          <span className="uppercase tracking-[0.14em] font-semibold">
                            {m.eyebrow}
                          </span>
                          <span className="opacity-80"> · {m.subtitle}</span>
                        </div>
                      </div>
                      <div className="shrink-0 w-4 flex items-center justify-center">
                        {state === 'done' && (
                          <CheckCircle2 className="w-4 h-4 text-[color:var(--color-status-success)]" />
                        )}
                        {state === 'locked' && (
                          <Lock className="w-3.5 h-3.5 text-[color:var(--color-ink-300)]" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* mobileOpen BrandShell 同步：若上层 mobileOpen=true 我们已经提供了 BottomNav，这里不再额外渲染重复层 */}
      </div>
    </>
  );
}

export default VoyageNavigation;
