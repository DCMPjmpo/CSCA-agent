/**
 * 南洋出海局 · 幕僚音效入口（批次 13 → 批次 15 升级）
 *
 * 批次 13 起用 WebAudio 振荡器合成零资产 beep；批次 15 起升级为真实
 * mp3/ogg 双格式资产（lib/brand/sound.ts 播放层）。本文件保持既有
 * `playSfx(name)` API 不变（AdvisorHall 零改动），内部路由：
 * - `bow` → 资产 bow（领命抱拳）；`cheer` → 资产 gong（报喜锣）；
 * - `welcome` 保留振荡器合成（风铃）；
 * - `scroll-open/seal/scroll-unroll/ship/gong/woodfish` → 直接转 sound.ts。
 * 资产解码失败时 bow/cheer 回退到合成（静默不阻断）。
 */
type SfxName =
  | 'bow'
  | 'welcome'
  | 'cheer'
  | 'scroll-open'
  | 'seal'
  | 'scroll-unroll'
  | 'ship'
  | 'gong'
  | 'woodfish';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

/* ---- 回退合成（welcome 常态用；bow/cheer 资产失败时兜底） ---- */
function tone(
  ac: AudioContext,
  freq: number,
  at: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.2,
): void {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ac.currentTime + at);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + at);
  osc.stop(ac.currentTime + at + dur + 0.05);
}

function playBow(ac: AudioContext): void {
  tone(ac, 180, 0, 0.35, 'triangle', 0.25);
  tone(ac, 90, 0.02, 0.5, 'sine', 0.14);
  tone(ac, 172, 0.09, 0.3, 'triangle', 0.18);
}

function playWelcome(ac: AudioContext): void {
  tone(ac, 880, 0, 0.8, 'sine', 0.1);
  tone(ac, 1320, 0.06, 0.7, 'sine', 0.07);
}

function playCheer(ac: AudioContext): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, i * 0.08, 0.6, 'sine', 0.12));
  tone(ac, 261.6, 0.32, 0.5, 'triangle', 0.08);
}

const SYNTH: Partial<Record<SfxName, (ac: AudioContext) => void>> = {
  bow: playBow,
  cheer: playCheer,
  welcome: playWelcome,
};

/** 资产名映射（cheer 用报喜锣 gong） */
const FILE_MAP: Record<Exclude<SfxName, 'welcome'>, import('./sound').OneShotName> = {
  bow: 'bow',
  cheer: 'gong',
  'scroll-open': 'scroll-open',
  seal: 'seal',
  'scroll-unroll': 'scroll-unroll',
  ship: 'ship',
  gong: 'gong',
  woodfish: 'woodfish',
};

export function playSfx(name: SfxName): void {
  // welcome 无资产，直接合成
  if (name === 'welcome') {
    const ac = getCtx();
    if (ac) {
      try {
        playWelcome(ac);
      } catch {
        /* 静默 */
      }
    }
    return;
  }
  const synth = SYNTH[name];
  void import('./sound').then(({ sound }) =>
    sound.playOneShot(FILE_MAP[name]).then((played) => {
      // 资产未出声且该音有合成回退 → 兜底
      if (!played && synth) {
        const ac = getCtx();
        if (ac) {
          try {
            synth(ac);
          } catch {
            /* 静默 */
          }
        }
      }
    }),
  );
}
