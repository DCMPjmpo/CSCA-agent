/**
 * 南洋出海局 · 议事圆桌（批次 13）
 *
 * 8 位幕僚围椭圆议事（郑和主位居顶中）：
 *  - hover：微微转头（HEAD 平移 1px）+ 拱手手层淡入 + 姓名牌卷轴展开（0.3s）+ 宣纸职能 Tooltip；
 *  - click：「领命」鞠躬动画（0.7s）+ 木鱼/锣音 + 专属欢迎语 Toast → 跳转对应功能面板；
 *  - 拖拽组队：单+单→新簇 / 并入簇 / 拖出 / 双簇合并 / ×解散；成队触发错峰「报喜」+ 古风贺词弹窗 + 脚本化互动对话；
 *  - idle 呼吸由 PixelAdvisor 承担（3.6s 周期，2-3 帧）。
 *
 * 文案源：t.advisors?.[id]（批次 12，deepMerge 全语言继承）；品牌语以中文写入。
 */
'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { ADVISOR_IDS, PixelAdvisor, type AdvisorId, type AdvisorMotion } from './advisors';
import { ADVISOR_PANELS } from '@/lib/brand/advisor-panels';
import { SEA_PORTS, type PortId } from '@/lib/brand/sea-ports';
import { playSfx } from '@/lib/brand/sfx';
import { ScrollDialog } from './ScrollDialog';
import { FarScene, MidScene, SeaChartTable } from './scene-layers';
import { useTranslation } from '@/lib/i18n/hooks';

const STORAGE_KEY = 'csca_advisor_teams_v1';

/** 椭圆席位坐标（%）：cx/cy=椭圆心，rx/ry=半轴；郑和 i=0 在顶中主位，余 45° 步进顺时针 */
const SEAT_POS: Record<AdvisorId, { x: number; y: number }> = (() => {
  const cx = 50;
  const cy = 48;
  const rx = 44;
  const ry = 38;
  const pos = {} as Record<AdvisorId, { x: number; y: number }>;
  ADVISOR_IDS.forEach((id, i) => {
    const a = ((-90 + i * 45) * Math.PI) / 180;
    pos[id] = {
      x: +(cx + rx * Math.cos(a)).toFixed(2),
      y: +(cy + ry * Math.sin(a)).toFixed(2),
    };
  });
  return pos;
})();

function pick<T>(arr?: readonly T[]): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

interface DialogueLine {
  speaker: string;
  text: string;
}

interface CelebrateState {
  members: AdvisorId[];
  lines: { name: string; line: string }[];
}

export function AdvisorHall() {
  const router = useRouter();
  const { t } = useTranslation();

  /* ---- 交互动效状态 ---- */
  const [hoveredId, setHoveredId] = useState<AdvisorId | null>(null);
  const [bowingId, setBowingId] = useState<AdvisorId | null>(null);
  const [celebrating, setCelebrating] = useState<Record<string, boolean>>({});
  const [dialogue, setDialogue] = useState<DialogueLine | null>(null);
  const [celebrate, setCelebrate] = useState<CelebrateState | null>(null);
  const [openPort, setOpenPort] = useState<PortId | null>(null);
  const openPortCfg = openPort ? SEA_PORTS.find((p) => p.id === openPort) : null;

  /* ---- 队伍状态（持久化） ---- */
  const [teams, setTeams] = useState<AdvisorId[][]>([]);
  const [draggingId, setDraggingId] = useState<AdvisorId | null>(null);
  const suppressClickRef = useRef(false);

  const timers = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  /* 队伍载入/持久化 */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[][];
        const valid = parsed
          .map((team) => team.filter((m): m is AdvisorId => (ADVISOR_IDS as string[]).includes(m)))
          .filter((team) => team.length >= 2);
        setTeams(valid);
      }
    } catch {
      /* 忽略损坏数据 */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    } catch {
      /* 忽略 */
    }
  }, [teams]);

  const teamOf = useCallback(
    (id: AdvisorId) => teams.findIndex((team) => team.includes(id)),
    [teams],
  );
  const teamOfById = useCallback(
    (id: AdvisorId) => teams.find((team) => team.includes(id)),
    [teams],
  );

  /* ---- 成队反馈：报喜 + 贺词 + 互动对话 ---- */
  const celebrateTeam = useCallback(
    (members: AdvisorId[]) => {
      if (members.length < 2) return;
      clearTimers();
      // 错峰报喜动画 + 音效
      members.forEach((id, i) => {
        const tm = window.setTimeout(
          () => setCelebrating((prev) => ({ ...prev, [id]: true })),
          i * 150,
        );
        timers.current.push(tm);
      });
      playSfx('cheer');
      members.forEach((id) => {
        const tm = window.setTimeout(
          () => setCelebrating((prev) => ({ ...prev, [id]: false })),
          600 + members.length * 150 + 2200,
        );
        timers.current.push(tm);
      });
      // 古风贺词弹窗（打开时计算一次文案，避免重渲染换句）
      const lines = members.map((id) => {
        const voice = t.advisors?.[id];
        return {
          name: voice?.name ?? id,
          line: pick(voice?.taskDone) ?? '',
        };
      });
      setCelebrate({ members, lines });
      // 互动对话：按席序 1s 错峰、每条 2.4s
      members.forEach((id, i) => {
        const voice = t.advisors?.[id];
        const on = window.setTimeout(
          () =>
            setDialogue({
              speaker: voice?.name ?? id,
              text: pick(voice?.catchphrases) ?? '',
            }),
          700 + i * 1000,
        );
        const off = window.setTimeout(() => setDialogue(null), 700 + i * 1000 + 2400);
        timers.current.push(on, off);
      });
    },
    [clearTimers, t],
  );

  /* ---- 拖拽组队 ---- */
  const handleDrop = useCallback(
    (src: AdvisorId, target: AdvisorId) => {
      const s = teamOf(src);
      const tIdx = teamOf(target);
      // 同簇成员相拖：无操作（已同队）
      if (s >= 0 && tIdx >= 0 && s === tIdx) return;
      let next: AdvisorId[][] = teams;
      if (s >= 0 && tIdx >= 0 && s !== tIdx) {
        // 两簇相拖 → 合并
        next = teams
          .map((team, i) => (i === tIdx ? [...team, ...teams[s]] : team))
          .filter((_, i) => i !== s);
      } else if (s >= 0 && tIdx < 0) {
        // 成员拖到独立席 → 分出，成新簇
        const shrunk =
          teams[s].length > 2
            ? teams.map((team, i) => (i === s ? team.filter((m) => m !== src) : team))
            : teams.filter((_, i) => i !== s);
        next = [...shrunk, [src, target]];
      } else if (s < 0 && tIdx >= 0) {
        // 单席拖入簇
        next = teams.map((team, i) => (i === tIdx ? [...team, src] : team));
      } else {
        // 双双独立 → 新簇
        next = [...teams, [src, target]];
      }
      // 消除单员簇（折叠回独人）
      next = next.filter((team) => team.length >= 2);
      setTeams(next);
      setDraggingId(null);
      // 触发成队反馈：以拖入后所在的簇为准
      const affected = next.find((team) => team.includes(src)) ?? next.find((team) => team.includes(target));
      if (affected) celebrateTeam(affected);
    },
    [teams, teamOf, celebrateTeam],
  );

  const handleStageDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      // 批次 14：拖放处理上移 stage 根。座位/港口各自处理，其余空白区=拖出解散。
      const tgt = e.target as HTMLElement;
      if (tgt.closest?.('[data-advisor-seat],[data-port]')) return;
      const src = e.dataTransfer.getData('text/plain') as AdvisorId;
      if (!src) return;
      const s = teamOf(src);
      if (s < 0) return; // 独人拖到空白无操作
      // 成员拖出 → 独人（簇仅 2 人则整体解散）
      const next =
        teams[s].length > 2
          ? teams.map((team, i) => (i === s ? team.filter((m) => m !== src) : team))
          : teams.filter((_, i) => i !== s);
      setTeams(next);
      setDraggingId(null);
    },
    [teams, teamOf],
  );

  const dissolveTeam = useCallback(
    (idx: number) => {
      setTeams((prev) => prev.filter((_, i) => i !== idx));
    },
    [],
  );

  /* ---- 点击「领命」---- */
  const handleClick = useCallback(
    (id: AdvisorId) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (celebrating[id]) return; // 报喜中不打断
      const voice = t.advisors?.[id];
      setBowingId(id);
      playSfx('bow');
      toast.success(voice?.name ?? id, {
        description: pick(voice?.welcomes) ?? '',
      });
      const tm = window.setTimeout(() => {
        setBowingId(null);
        router.push(ADVISOR_PANELS[id]);
      }, 900);
      timers.current.push(tm);
    },
    [celebrating, router, t],
  );

  const motionFor = (id: AdvisorId): AdvisorMotion =>
    celebrating[id]
      ? 'cheer'
      : bowingId === id
        ? 'bow'
        : hoveredId === id
          ? 'hover'
          : 'idle';

  /* 落地欢迎：郑和一句开场 */
  useEffect(() => {
    const zheng = t.advisors?.['zheng-he'];
    const tm = window.setTimeout(
      () => setDialogue({ speaker: zheng?.name ?? '郑和', text: zheng?.welcomes?.[0] ?? '' }),
      800,
    );
    timers.current.push(tm);
    return () => {
      window.clearTimeout(tm);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="hall-stage"
      data-testid="scene-stage"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleStageDrop}
    >
      {/* 批次 14 · 5 层纵深：远景港口 → 中景大厅 → 近景沙盘 → 角色幕僚 → 对话条 */}
      <FarScene />
      <MidScene />
      <SeaChartTable onPortClick={setOpenPort} />

      {/* 席位区（pointer-events:none，仅座位自身可交互；拖出落点在 stage 根） */}
      <div className="hall-seats">
        {ADVISOR_IDS.map((id, i) => {
          const voice = t.advisors?.[id];
          const teamIdx = teamOf(id);
          const pos = SEAT_POS[id];
          const motion = motionFor(id);
          return (
            <div
              key={id}
              data-advisor-seat={id}
              data-team={teamIdx >= 0 ? teamIdx : undefined}
              className={`hall-seat settle-in ${draggingId === id ? 'dragging' : ''}`}
              style={
                {
                  '--seat-x': `${pos.x}%`,
                  '--seat-y': `${pos.y}%`,
                  animationDelay: `${0.05 * i}s`,
                } as CSSProperties
              }
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', id);
                e.dataTransfer.effectAllowed = 'move';
                suppressClickRef.current = true;
                setDraggingId(id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                window.setTimeout(() => {
                  suppressClickRef.current = false;
                }, 0);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const src = e.dataTransfer.getData('text/plain') as AdvisorId;
                if (src && src !== id) handleDrop(src, id);
              }}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === id ? null : cur))}
              onClick={() => handleClick(id)}
            >
              <div className="advisor-wrap">
                <PixelAdvisor id={id} motion={motion} className="h-16 w-16" />

                {/* 姓名牌：hover 卷轴展开（0.3s） */}
                {hoveredId === id && (
                  <div className="advisor-nameplate advisor-nameplate-unfold">
                    {voice?.name ?? id}
                    {voice?.role ? ` · ${voice.role}` : ''}
                  </div>
                )}

                {/* 职能 Tooltip：宣纸底 */}
                {hoveredId === id && (
                  <div className="advisor-tooltip advisor-tooltip-in">
                    <div className="advisor-tooltip-role">{voice?.role ?? ''}</div>
                    <p className="advisor-tooltip-text">
                      {voice?.dialogueStyle}
                      {voice?.persona ? `　${voice.persona}` : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* 队伍徽标 */}
              {teamIdx >= 0 && (
                <span className="team-badge" data-team-badge>
                  <span>
                    队 {teamIdx + 1} · {teams[teamIdx].length} 人
                  </span>
                  <button
                    type="button"
                    aria-label="解散队伍"
                    onClick={(e) => {
                      e.stopPropagation();
                      dissolveTeam(teamIdx);
                    }}
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 互动对话·中央议事条（议事厅精修：奏折化 + 发言人头像区） */}
      {dialogue && (
        <div className="hall-dialogue" aria-live="polite">
          <div className="hall-speaker-badge">
            <div className="hall-speaker-avatar">
              {dialogue.speaker.charAt(0)}
            </div>
            <span className="hall-speaker-name">{dialogue.speaker}</span>
          </div>
          <div className="dialogue-bubble">
            <strong>{dialogue.speaker}</strong>
            {dialogue.text}
          </div>
        </div>
      )}

      {/* 古风贺词弹窗（报喜） */}
      <ScrollDialog
        open={!!celebrate}
        onOpenChange={(open) => {
          if (!open) setCelebrate(null);
        }}
        title="组队成功 · 报喜"
      >
        <div className="scroll-dialog-body space-y-2.5">
          {celebrate?.lines.map((l, i) => (
            <p key={i} className="text-sm leading-relaxed text-ink">
              <strong className="text-vermilion">{l.name}</strong>：「{l.line}」
            </p>
          ))}
        </div>
      </ScrollDialog>

      {/* 沙盘据点：古港信息弹窗（批次 14） */}
      {openPortCfg &&
        (() => {
          const advisor = t.advisors?.[openPortCfg.advisorId];
          return (
            <ScrollDialog
              open
              onOpenChange={(open) => {
                if (!open) setOpenPort(null);
              }}
              title={openPortCfg.name}
              description={`${openPortCfg.intro}（${openPortCfg.modern}）`}
            >
              <div className="scroll-dialog-body space-y-2.5">
                <p className="text-sm leading-relaxed text-ink">
                  关联幕僚：
                  <strong className="text-vermilion">{advisor?.name ?? ''}</strong>
                  {advisor?.role ? ` · ${advisor.role}` : ''}
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    data-testid="port-dispatch"
                    onClick={() => {
                      playSfx('ship'); // 批次 15：去办差=起航
                      router.push(ADVISOR_PANELS[openPortCfg.advisorId]);
                    }}
                    className="btn-brand-primary px-6 py-2.5 text-sm"
                  >
                    去办差
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </ScrollDialog>
          );
        })()}
    </div>
  );
}
