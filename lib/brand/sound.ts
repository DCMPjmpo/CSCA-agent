/**
 * 南洋出海局 · 全局音效播放层（批次 15）
 *
 * 真实 mp3/ogg 双格式资产（public/sfx/，总包 < 500KB），Web Audio 懒加载解码：
 * - 环境音：`hall`（府邸大厅风声+烛火噼啪）循环，淡入/淡出；
 * - 交互/反馈音：`scroll-open/seal/bow/scroll-unroll/ship/gong/woodfish` 一次性播放；
 * - 独立开关：`ambient`（环境音）与 `sfx`（音效）双开关，localStorage `csca_sound_v1` 持久化；
 * - autoplay 策略：AudioContext 首个用户手势惰性建/resume，环境音挂载点无声则待手势恢复。
 *
 * 格式协商：先试 `.ogg`（Chrome/FF/Edge），fetch 或 decode 失败回退 `.mp3`（Safari 等）。
 * 任何错误静默：不出声不阻断交互；解码失败返回 false 由上层 sfx.ts 回退合成。
 */
'use client';

export type OneShotName =
  | 'scroll-open'
  | 'seal'
  | 'bow'
  | 'scroll-unroll'
  | 'ship'
  | 'gong'
  | 'woodfish';

export interface SoundState {
  ambient: boolean;
  sfx: boolean;
}

const STORAGE_KEY = 'csca_sound_v1';
const DEFAULT_STATE: SoundState = { ambient: true, sfx: true };

class SoundManager {
  private ctx: AudioContext | null = null;
  private state: SoundState = { ...DEFAULT_STATE };
  private buffers = new Map<string, AudioBuffer | null>();
  private ambientSrc: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.load();
      // 首个用户手势解锁 AudioContext（autoplay 政策）
      const unlock = () => this.getCtx();
      window.addEventListener('pointerdown', unlock, { once: true, capture: true });
      window.addEventListener('keydown', unlock, { once: true, capture: true });
    }
  }

  /* ---- 状态（React useSyncExternalStore 消费） ---- */
  getState(): SoundState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setAmbient(on: boolean): void {
    if (this.state.ambient === on) return;
    this.setState({ ...this.state, ambient: on });
    if (on) {
      void this.startAmbient();
    } else {
      this.stopAmbient();
    }
  }

  setSfx(on: boolean): void {
    if (this.state.sfx === on) return;
    this.setState({ ...this.state, sfx: on });
  }

  private setState(next: SoundState): void {
    this.state = next;
    this.persist();
    this.listeners.forEach((fn) => fn());
  }

  private load(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<SoundState>;
      this.state = {
        ambient: typeof p.ambient === 'boolean' ? p.ambient : DEFAULT_STATE.ambient,
        sfx: typeof p.sfx === 'boolean' ? p.sfx : DEFAULT_STATE.sfx,
      };
    } catch {
      /* 忽略损坏数据 */
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* 忽略 */
    }
  }

  /* ---- AudioContext ---- */
  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AC();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /* ---- 缓冲：懒加载 + 解码缓存（ogg 优先，mp3 回退） ---- */
  private async getBuffer(name: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(name);
    if (cached !== undefined) return cached;
    this.buffers.set(name, null);
    const ctx = this.getCtx();
    if (!ctx) return null;
    for (const ext of ['ogg', 'mp3'] as const) {
      try {
        const res = await fetch(`/sfx/${name}.${ext}`);
        if (!res.ok) continue;
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        this.buffers.set(name, buf);
        return buf;
      } catch {
        /* 试下一种格式 */
      }
    }
    return null;
  }

  /** 一次性音效播放。返回 true 表示实际出声（供 sfx.ts 回退合成判定） */
  async playOneShot(name: OneShotName, gain = 1): Promise<boolean> {
    if (!this.state.sfx) return false;
    const ctx = this.getCtx();
    if (!ctx) return false;
    const buf = await this.getBuffer(name);
    if (!buf) return false;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g).connect(ctx.destination);
      src.start();
      return true;
    } catch {
      return false;
    }
  }

  /** 环境音循环：1s 淡入；ambient 关则不响 */
  async startAmbient(): Promise<void> {
    if (!this.state.ambient) return;
    if (this.ambientSrc) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const buf = await this.getBuffer('hall');
    if (!buf) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.0);
      src.connect(g).connect(ctx.destination);
      src.start();
      this.ambientSrc = src;
      this.ambientGain = g;
    } catch {
      /* 静默 */
    }
  }

  /** 环境音停止：0.6s 淡出后断开 */
  stopAmbient(): void {
    const src = this.ambientSrc;
    const g = this.ambientGain;
    const ctx = this.ctx;
    this.ambientSrc = null;
    this.ambientGain = null;
    if (!ctx || !src || !g) return;
    try {
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      src.stop(now + 0.7);
    } catch {
      /* 静默 */
    }
  }
}

/** 模块级单例（SSR 安全：构造时 window 守卫） */
export const sound = new SoundManager();
