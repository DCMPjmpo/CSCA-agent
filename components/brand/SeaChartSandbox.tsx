'use client';

/**
 * 南洋海图沙盘（南洋出海局 · 批次 8）
 *
 * 首页中央内容区 → 像素海图沙盘。8 大功能模块化作沙盘上的「使团据点」：
 * 6 个航线据点沿 Z 形航线排布（像素船随学习进度停靠），幕僚厅居中央两侧、
 * 讲学堂坐镇下中。据点 hover 金箔脉冲 + 竖排古风 Tooltip；点击「画卷展开」
 * （Radix Dialog scale+fade）为模块面板；讲学堂面板内嵌课堂生成器，
 * 幕僚厅面板内嵌 8 幕僚名单。进度纯视觉（迷雾 + 插旗 + 航船），不加锁。
 */
import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { useTranslation, type StrictTranslations } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import { CSCA_AGENTS } from '@/lib/csca/agents';
import {
  deriveSandboxProgress,
  emptySandboxProgress,
  type OutpostId,
  type OutpostProgress,
  type SandboxProgress,
} from '@/lib/csca/sandbox-progress';
import { ScrollDialog } from './ScrollDialog';
import { SEA_BG, SEA_BG_SIZE } from './sandbox-textures';
import { toast } from 'sonner';
import { createPptTask } from '@/lib/openmaic';
import {
  PixelAgentBust,
  PixelAstrolabe,
  PixelCompass,
  PixelFlag,
  PixelLectern,
  PixelScroll,
  PixelShip,
  PixelSundial,
  PixelTreasureShip,
  PixelWeaponRack,
} from './sandbox-icons';

interface OutpostConfig {
  id: OutpostId;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** 点击「进入」跳转的路由；空串表示面板内交互（讲学堂） */
  route: string;
  /** 桌面 3×3 网格区名 */
  area: string;
  name: (t: StrictTranslations) => string;
  desc: (t: StrictTranslations) => string;
  /** 据点下方辅助文字（仅前 3 解锁据点有） */
  aux?: string;
}

const OUTPOSTS: OutpostConfig[] = [
  {
    id: 'diagnosis',
    icon: PixelCompass,
    route: '/csca',
    area: 'weather',
    name: (t) => t.steps.diagnosis,
    desc: (t) => t.diagnosis.description,
    aux: '验看出身，点将出兵',
  },
  {
    id: 'knowledge-map',
    icon: PixelScroll,
    route: '/csca#knowledge-map',
    area: 'chart',
    name: (t) => t.steps.knowledgeMap,
    desc: (t) => t.knowledgeMap.description,
    aux: '查阅海图，知己知彼',
  },
  {
    id: 'adaptive-learning',
    icon: PixelWeaponRack,
    route: '/csca#adaptive-learning',
    area: 'drill',
    name: (t) => t.steps.adaptiveLearning,
    desc: (t) => t.adaptiveLearning.description,
    aux: '练兵备战，每日精进',
  },
  {
    id: 'mock-exam',
    icon: PixelTreasureShip,
    route: '/csca#mock-exam',
    area: 'trial',
    name: (t) => t.steps.mockExam,
    desc: (t) => t.mockExam.description,
  },
  {
    id: 'score-analysis',
    icon: PixelAstrolabe,
    route: '/csca#score-analysis',
    area: 'observatory',
    name: (t) => t.steps.scoreAnalysis,
    desc: (t) => t.scoreAnalysis.description,
  },
  {
    id: 'study-plan',
    icon: PixelSundial,
    route: '/csca#study-plan',
    area: 'schedule',
    name: (t) => t.flow.studyPlan,
    desc: (t) => t.mockExam.studyPlanAuto,
  },
  {
    id: 'multi-agent',
    icon: PixelAgentBust,
    route: '/csca-multi-agent',
    area: 'council',
    name: (t) => t.steps.aiTutor,
    desc: (t) => t.features.multiAgentDesc,
  },
  {
    id: 'classroom',
    icon: PixelLectern,
    route: '',
    area: 'lectern',
    name: (t) => t.features.classroomTitle,
    desc: (t) => t.classroomSection.description,
  },
];

/** 航线据点在 16:10 沙盘上的中心点（% 坐标，对应 3×3 网格中心） */
const ROUTE_POINTS = [
  { x: 16.67, y: 16.67 }, // 0 diagnosis
  { x: 50, y: 16.67 }, // 1 knowledge-map
  { x: 83.33, y: 16.67 }, // 2 adaptive-learning
  { x: 83.33, y: 50 }, // 3 mock-exam
  { x: 83.33, y: 83.33 }, // 4 score-analysis
  { x: 16.67, y: 83.33 }, // 5 study-plan
];

/** 据点竖排 Tooltip（宣纸卡 + 朱批方点） */
function VerticalTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      <span className="sandbox-vertical-text block whitespace-nowrap rounded-md border border-sandalwood/25 bg-ricepaper px-1.5 py-2 text-xs font-brand-body text-ink shadow-xl">
        {label}
        <span className="ml-0.5 mt-0.5 inline-block h-1.5 w-1.5 shrink-0 bg-vermilion" />
      </span>
    </span>
  );
}

function ModuleOutpost({
  cfg,
  label,
  progress,
  onOpen,
}: {
  cfg: OutpostConfig;
  label: string;
  progress: OutpostProgress;
  onOpen: () => void;
}) {
  const Icon = cfg.icon;
  const locked = !progress.unlocked;
  return (
    <button
      type="button"
      id={cfg.id === 'classroom' ? 'classroom-generator' : undefined}
      data-testid={`outpost-${cfg.id}`}
      aria-label={label}
      onClick={onOpen}
      className={cn(
        'sandbox-outpost group border bg-black/25 text-ricepaper/90',
        progress.isCurrent ? 'border-gold-leaf/60 bg-gold-leaf/5' : 'border-white/10',
        locked ? 'is-locked' : 'is-unlocked',
      )}
      style={{ gridArea: cfg.area }}
    >
      {/* 已完成插旗（一次性落定动画） */}
      {progress.completed && (
        <span className="sandbox-flag-plant absolute right-1 top-1 z-[6]">
          <PixelFlag className="h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
        </span>
      )}

      {locked ? (
        /* 未解锁据点：灰色方块 + 🔒 + 未探索 */
        <>
          <Lock className="relative z-[4] h-8 w-8 shrink-0 text-white/40" />
          <span className="relative z-[4] px-1 text-xs font-brand-pixel leading-tight text-white/30">
            未探索
          </span>
        </>
      ) : (
        <>
          {/* 已完成插旗遮罩外的迷雾在此不再显示（已解锁即无雾） */}
          <Icon className="relative z-[4] h-12 w-12 shrink-0" />

          {/* 幕僚厅：8 幕僚立绘（桌面 4+4 罗盘分隔，移动 4 宫格） */}
          {cfg.id === 'multi-agent' && (
            <>
              <span className="relative z-[4] hidden items-center justify-center gap-1.5 lg:flex">
                {CSCA_AGENTS.slice(0, 4).map((a) => (
                  <PixelAgentBust key={a.id} className="h-7 w-7" />
                ))}
                <span className="font-brand-pixel inline-flex h-6 w-6 items-center justify-center border border-gold-leaf/60 text-xs text-gold-leaf">
                  帆
                </span>
                {CSCA_AGENTS.slice(4, 8).map((a) => (
                  <PixelAgentBust key={a.id} className="h-7 w-7" />
                ))}
              </span>
              <span className="relative z-[4] grid grid-cols-4 gap-0.5 lg:hidden">
                {CSCA_AGENTS.slice(0, 4).map((a) => (
                  <PixelAgentBust key={a.id} className="h-5 w-5" />
                ))}
              </span>
            </>
          )}

          <span
            className="relative z-[4] max-w-full truncate px-1 leading-tight"
            style={{
              fontFamily: '"Kaiti SC", "STKaiti", serif',
              fontSize: '18px',
              fontWeight: 700,
              color: '#E8C547',
            }}
          >
            {label}
          </span>

          {/* 据点下方辅助文字（14px，藤黄中透明，行高 1.8） */}
          {cfg.aux && (
            <span
              className="relative z-[4] max-w-full px-1 text-center"
              style={{ fontSize: '14px', lineHeight: '1.8', color: 'rgba(232,197,71,0.85)' }}
            >
              {cfg.aux}
            </span>
          )}
        </>
      )}

      <VerticalTooltip label={label} />
    </button>
  );
}

export function SeaChartSandbox() {
  const router = useRouter();
  const { t } = useTranslation();
  const [progress, setProgress] = useState<SandboxProgress>(emptySandboxProgress);
  const [openOutpost, setOpenOutpost] = useState<OutpostId | null>(null);
  const [requirement, setRequirement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // 水合后从 localStorage 派生真实进度（SSR 恒全雾态，避免 hydration 不一致）
  useEffect(() => {
    setProgress(deriveSandboxProgress());
  }, []);

  // 深链：#classroom-generator（多智能体页「先生授课」chip 跳首页时自动展开讲学堂）
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#classroom-generator') {
      setOpenOutpost('classroom');
    }
  }, []);

  const handleGenerateClassroom = async () => {
    if (!requirement.trim()) return;
    setIsSubmitting(true);
    // P2 Vertical Slice：把生成任务真正接入 PilarCore 任务系统，
    // 不再使用 sessionStorage（关闭即丢），改用 createPptTask 持久化到 IndexedDB。
    // 任务可在 /csca/tasks/[taskId] 工作台追踪，刷新/关闭标签页后仍可恢复。
    try {
      const task = await createPptTask({
        requirement: requirement.trim(),
        returnUrl: '/',
      });
      router.push(`/csca/tasks/${task.taskId}`);
    } catch (err) {
      setIsSubmitting(false);
      toast.error(`创建生成任务失败：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const ship = ROUTE_POINTS[Math.min(progress.frontier, 5)];
  const routeLine = ROUTE_POINTS.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <section data-testid="sea-sandbox" className="sandbox-frame relative mt-8 overflow-hidden">
      {/* 航船/航线：桌面 16:10 海图才有意义 · 2px 金箔虚线三角航线 */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] hidden h-full w-full lg:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polyline
          points={routeLine}
          fill="none"
          stroke="#C9A227"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeOpacity="0.7"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div
        className="sandbox-grid relative z-[2]"
        style={{
          backgroundImage: SEA_BG,
          backgroundSize: SEA_BG_SIZE,
          imageRendering: 'pixelated',
        }}
      >
        {OUTPOSTS.map((cfg) => (
          <ModuleOutpost
            key={cfg.id}
            cfg={cfg}
            label={cfg.name(t)}
            progress={progress.outposts[cfg.id]}
            onOpen={() => setOpenOutpost(cfg.id)}
          />
        ))}
      </div>

      {/* 双层 CSS 海浪：远景细纹 + 近景浪花（仅桌面） */}
      <div className="sandbox-wave-far pointer-events-none absolute inset-x-0 bottom-0 z-[1] hidden h-10 lg:block" />
      <div className="sandbox-wave-near pointer-events-none absolute inset-x-0 bottom-0 z-[1] hidden h-6 lg:block" />

      {/* 四角地图固定钉（4×4px 金箔方块） */}
      <span className="sandbox-map-pin" style={{ top: '6px', left: '6px' }} />
      <span className="sandbox-map-pin" style={{ top: '6px', right: '6px' }} />
      <span className="sandbox-map-pin" style={{ bottom: '6px', left: '6px' }} />
      <span className="sandbox-map-pin" style={{ bottom: '6px', right: '6px' }} />

      {/* 进度计数（右上角牌匾 · 墨青实底 + 描边金 + 硬影） */}
      <span
        className="absolute right-3 top-3 z-20 hidden font-brand-pixel sm:inline-block"
        style={{
          fontSize: '14px',
          color: '#E8C547',
          background: 'rgba(8,27,36,0.9)',
          border: '1px solid #D9B368',
          padding: '6px 16px',
          boxShadow: '2px 2px 0 #020b10',
        }}
      >
        {t.sandbox.progress.replace('{n}', String(progress.visitedCount))}
      </span>

      {/* 进度船：停在航线前缘（内层 span 承载浮动动画，避开外层定位 transform） */}
      <span
        data-testid="sandbox-ship"
        className="pointer-events-none absolute z-30 hidden lg:block"
        style={{ left: `${ship.x}%`, top: `${ship.y}%`, transform: 'translate(-50%, -50%)' }}
      >
        <span className="sandbox-ship-bob block">
          <PixelShip className="h-9 w-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" />
        </span>
      </span>

      {/* 装饰小帆船（缓慢巡航，营造海图生机） */}
      <span
        className="sandbox-sail pointer-events-none absolute z-20 hidden lg:block"
        style={{ top: '58%' }}
      >
        <PixelShip className="h-5 w-5 opacity-60" />
      </span>
      <span
        className="sandbox-sail pointer-events-none absolute z-20 hidden lg:block"
        style={{ top: '26%', animationDelay: '-12s', animationDuration: '34s' }}
      >
        <PixelShip className="h-4 w-4 opacity-40" />
      </span>

      {/* 底部中央像素宝船（纯 SVG：檀木棕船身 + 宣纸白帆 + 纯黑描边，2 秒漂浮） */}
      <span className="pointer-events-none absolute bottom-2 left-1/2 z-20 hidden -translate-x-1/2 lg:block">
        <span className="sandbox-treasure-ship block">
          <svg
            aria-hidden
            width="120"
            height="64"
            viewBox="0 0 120 64"
            shapeRendering="crispEdges"
            style={{ imageRendering: 'pixelated' }}
          >
            {/* 桅杆 */}
            <rect
              x="58"
              y="6"
              width="3"
              height="34"
              fill="#8B5A2B"
              stroke="#020b10"
              strokeWidth="1"
            />
            {/* 宣纸白帆 */}
            <polygon points="61,8 96,20 61,32" fill="#F5F0E6" stroke="#020b10" strokeWidth="1.5" />
            <polygon points="58,8 30,20 58,32" fill="#F5F0E6" stroke="#020b10" strokeWidth="1.5" />
            {/* 檀木棕船身 */}
            <polygon
              points="10,40 110,40 96,56 24,56"
              fill="#8B5A2B"
              stroke="#020b10"
              strokeWidth="1.5"
            />
            {/* 船身高光线 */}
            <rect x="20" y="44" width="80" height="2" fill="#A06A33" />
            {/* 旗帜 */}
            <rect x="58" y="2" width="2" height="6" fill="#C9A227" />
          </svg>
        </span>
      </span>

      {/* 画卷展开模态（批次 10：卷轴造型 ScrollDialog） */}
      {openOutpost &&
        (() => {
          const cfg = OUTPOSTS.find((o) => o.id === openOutpost)!;
          const p = progress.outposts[openOutpost];
          const status = p.completed ? 'explored' : p.isCurrent ? 'current' : 'unexplored';
          const statusText =
            status === 'explored'
              ? t.sandbox.explored
              : status === 'current'
                ? t.sandbox.current
                : t.sandbox.unexplored;
          const statusClass =
            status === 'explored'
              ? 'border-bamboo/40 bg-bamboo/10 text-bamboo'
              : status === 'current'
                ? 'border-gold-leaf/40 bg-gold-leaf/10 text-gold-leaf'
                : 'border-sandalwood/40 bg-sandalwood/10 text-sandalwood';
          const Icon = cfg.icon;

          return (
            <ScrollDialog
              open
              onOpenChange={(open) => !open && setOpenOutpost(null)}
              title={
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-6 w-6" />
                  {cfg.name(t)}
                </span>
              }
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn('shrink-0 rounded-full border px-2 py-0.5 text-xs', statusClass)}
                  >
                    {statusText}
                  </span>
                  <span>{cfg.desc(t)}</span>
                </span>
              }
            >
              {/* 讲学堂：课堂生成器内嵌 */}
              {cfg.id === 'classroom' && (
                <div className="space-y-3">
                  <textarea
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder={
                      inputFocused
                        ? t.classroomSection.placeholderFocus
                        : t.classroomSection.placeholder
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleGenerateClassroom();
                    }}
                    className="h-24 w-full resize-none rounded-xl border border-sandalwood/30 bg-white px-4 py-3 text-sm text-ink transition-all placeholder:text-sandalwood focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/20"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-sandalwood">{t.classroomSection.hint}</span>
                    <button
                      type="button"
                      onClick={handleGenerateClassroom}
                      disabled={!requirement.trim() || isSubmitting}
                      className="btn-brand-primary px-5 py-2.5 text-sm"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t.common.generating}
                        </span>
                      ) : (
                        <>
                          {t.classroomSection.generate}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 幕僚厅：8 幕僚名单（body 已滚动，行保持白内衬） */}
              {cfg.id === 'multi-agent' && (
                <div className="space-y-1.5">
                  {CSCA_AGENTS.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => router.push('/csca-multi-agent')}
                      className="flex w-full items-center gap-3 rounded-lg border border-sandalwood/20 bg-white/70 px-3 py-2 text-left transition-colors hover:border-gold-leaf/50"
                    >
                      <span
                        className="font-brand-eng flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: agent.color }}
                      >
                        {agent.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{agent.name}</span>
                        <span className="block truncate text-xs text-sandalwood">{agent.role}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-sandalwood" />
                    </button>
                  ))}
                </div>
              )}

              {cfg.route && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => router.push(cfg.route)}
                    className="btn-brand-primary px-6 py-2.5 text-sm"
                  >
                    {t.sandbox.enter}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </ScrollDialog>
          );
        })()}
    </section>
  );
}
