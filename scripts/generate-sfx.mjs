// 南洋出海局 · 古风音效生成（批次 15）
//
// Node 合成 22050Hz mono 16bit PCM（mulberry32 种子 RNG，可复现），
// 用 ffmpeg-static 编码为 mp3（libmp3lame）+ ogg（libvorbis）双格式，
// 产物写 public/sfx/。8 组音效，硬断言总包 < 500KB。
//
// 用法：`node scripts/generate-sfx.mjs`（需先 pnpm install 且 ffmpeg-static 二进制可用）
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const FFMPEG = require('ffmpeg-static');
const SR = 22050;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sfx');
const TOTAL_BUDGET = 500 * 1024; // 500KB（mp3 + ogg 总和）

/* ------------------------------------------------------------
   随机数与噪声
   ------------------------------------------------------------ */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function whiteNoise(n, rng) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
  return out;
}

/** Paul Kellet 粉噪（-3dB/oct） */
function pinkNoise(n, rng) {
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
}

/** 棕噪（积分） */
function brownNoise(n, rng) {
  let last = 0;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    out[i] = last * 3.5;
  }
  return out;
}

function normalize(buf, peak = 0.89) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > max) max = a;
  }
  if (max <= 0) return buf;
  const k = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return buf;
}

/* ------------------------------------------------------------
   滤波（RBJ biquad，流式应用）
   ------------------------------------------------------------ */
function biquad(data, type, fc, q = 0.707) {
  const w0 = (2 * Math.PI * fc) / SR;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') {
    b0 = (1 - cosw) / 2;
    b1 = 1 - cosw;
    b2 = (1 - cosw) / 2;
  } else if (type === 'highpass') {
    b0 = (1 + cosw) / 2;
    b1 = -(1 + cosw);
    b2 = (1 + cosw) / 2;
  } else if (type === 'bandpass') {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  } else {
    throw new Error('unknown filter ' + type);
  }
  a0 = 1 + alpha;
  a1 = -2 * cosw;
  a2 = 1 - alpha;
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  a1 /= a0;
  a2 /= a0;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const x0 = data[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    out[i] = y0;
  }
  return out;
}

/* ------------------------------------------------------------
   波形与包络
   ------------------------------------------------------------ */
function sine(freq, dur, gain = 1) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin(ph) * gain;
    ph += (2 * Math.PI * freq) / SR;
  }
  return out;
}

/** 线性扫频正弦（f0→f1） */
function sweep(f0, f1, dur, gain = 1) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = f0 + (f1 - f0) * t;
    out[i] = Math.sin(ph) * gain;
    ph += (2 * Math.PI * f) / SR;
  }
  return out;
}

/** 三角波 */
function tri(freq, dur, gain = 1) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = ((i * freq) / SR) % 1;
    out[i] = (p < 0.5 ? p * 4 - 1 : 3 - p * 4) * gain;
  }
  return out;
}

/** 指数衰减包络（从 1 指数降至 0） */
function expDecay(n, tauSec) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.exp(-i / (SR * tauSec));
  return out;
}

/** 攻击爬升（linear） */
function attackRamp(n, durSec) {
  const out = new Float32Array(n);
  const steps = Math.min(n, Math.max(1, Math.floor(SR * durSec)));
  for (let i = 0; i < n; i++) out[i] = Math.min(1, i / steps);
  return out;
}

function addAt(dst, src, offset, gain = 1) {
  for (let i = 0; i < src.length; i++) {
    const j = offset + i;
    if (j >= dst.length) break;
    dst[j] += src[i] * gain;
  }
}

/** 循环交叉淡化：尾部 sec 秒与头部融合，保证循环接缝平滑 */
function crossfadeLoop(buf, sec) {
  const n = Math.min(buf.length, Math.floor(SR * sec));
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const head = buf[i] * (1 - p);
    const tail = buf[buf.length - n + i] * p;
    buf[i] = head + tail;
  }
  for (let i = 0; i < n; i++) {
    buf[buf.length - n + i] = buf[i];
  }
  return buf;
}

/* ------------------------------------------------------------
   8 个音色
   ------------------------------------------------------------ */
const recipes = {
  /** 府邸大厅环境（16s 循环）：低通风 + 稀疏烛火噼啪 + 房间底噪 */
  hall: () => {
    const dur = 16;
    const N = SR * dur;
    const out = new Float32Array(N);
    const rng = mulberry32(0x1a11);
    // 风：粉噪 → 低通 400Hz，0.13Hz 慢 LFO 起伏
    const wind = biquad(pinkNoise(N, rng), 'lowpass', 400, 0.8);
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const lfo = 0.55 + 0.35 * Math.sin(2 * Math.PI * 0.13 * t);
      out[i] += wind[i] * lfo * 0.5;
    }
    // 烛火噼啪：24 个稀疏高通短脉冲（2.5kHz+，快速衰减）
    for (let k = 0; k < 24; k++) {
      const pos = Math.floor(rng() * N * 0.82);
      const len = Math.floor(((8 + rng() * 10) * SR) / 1000);
      const burst = biquad(whiteNoise(len, rng), 'highpass', 2500 + rng() * 2000, 0.7);
      const env = expDecay(len, 0.012 + rng() * 0.01);
      for (let i = 0; i < len; i++) burst[i] *= env[i];
      addAt(out, burst, pos, 0.1 + rng() * 0.12);
    }
    // 房间底噪：棕噪 → 低通 150Hz，极弱
    const room = biquad(brownNoise(N, rng), 'lowpass', 150, 0.7);
    for (let i = 0; i < N; i++) out[i] += room[i] * 0.08;
    return crossfadeLoop(normalize(out, 0.7), 0.6);
  },

  /** 竹简展开（1.2s）：渐疏竹节咔嗒 + 起始木「笃」 */
  'scroll-open': () => {
    const N = SR * 1.2;
    const out = new Float32Array(N);
    const rng = mulberry32(0x2b2b);
    // 竹节咔嗒：间隔 60→140ms 渐疏，3kHz+ tick
    let t = 0.03 * SR;
    for (let i = 0; i < 14; i++) {
      const len = Math.floor((6 * SR) / 1000);
      const tick = biquad(whiteNoise(len, rng), 'highpass', 3000, 0.7);
      const env = expDecay(len, 0.012);
      for (let k = 0; k < len; k++) tick[k] *= env[k];
      addAt(out, tick, Math.floor(t), 0.4);
      t += (0.06 + (i * (0.14 - 0.06)) / 13) * SR;
    }
    // 木「笃」：220→180Hz 短扫 ×3
    for (let i = 0; i < 3; i++) {
      const th = sweep(220, 180, 0.045, 1);
      const env = expDecay(th.length, 0.12);
      for (let k = 0; k < th.length; k++) th[k] *= env[k];
      addAt(out, th, Math.floor((0.02 + i * 0.08) * SR), 0.32);
    }
    // 底层纸噪：低通 800Hz，1s 衰减
    const swish = biquad(pinkNoise(N, rng), 'lowpass', 800, 0.8);
    const e = new Float32Array(N);
    for (let i = 0; i < N; i++) e[i] = Math.exp(-i / (SR * 0.32));
    for (let i = 0; i < N; i++) out[i] += swish[i] * e[i] * 0.18;
    return normalize(out, 0.85);
  },

  /** 印章盖章（0.7s）「咚」：低频重击 + 攻击点击 */
  seal: () => {
    const N = SR * 0.7;
    const out = new Float32Array(N);
    const rng = mulberry32(0x3c3c);
    const thump = tri(110, 0.5, 1);
    const env1 = expDecay(thump.length, 0.22);
    for (let i = 0; i < thump.length; i++) thump[i] *= env1[i];
    addAt(out, thump, 0, 0.7);
    const body = sine(55, 0.5, 1);
    const env2 = expDecay(body.length, 0.28);
    for (let i = 0; i < body.length; i++) body[i] *= env2[i];
    addAt(out, body, 0, 0.5);
    const sec = tri(90, 0.35, 1);
    const env3 = expDecay(sec.length, 0.16);
    for (let i = 0; i < sec.length; i++) sec[i] *= env3[i];
    addAt(out, sec, Math.floor(0.02 * SR), 0.35);
    const click = biquad(whiteNoise(Math.floor((10 * SR) / 1000), rng), 'highpass', 4000, 0.7);
    addAt(out, click, 0, 0.3);
    return normalize(out, 0.92);
  },

  /** 领命抱拳（0.9s）：低频双鼓 + 布帛拂动 */
  bow: () => {
    const N = SR * 0.9;
    const out = new Float32Array(N);
    const rng = mulberry32(0x4d4d);
    for (const [off, g] of [
      [0, 0.5],
      [0.14, 0.38],
    ]) {
      const d = tri(130, 0.4, 1);
      const e = expDecay(d.length, 0.18);
      for (let i = 0; i < d.length; i++) d[i] *= e[i];
      addAt(out, d, Math.floor(off * SR), g);
    }
    // 抱拳拂动：带通 1200Hz 噪声，swell 包络
    const sw = biquad(whiteNoise(Math.floor(0.35 * SR), rng), 'bandpass', 1200, 1.4);
    const e2 = expDecay(sw.length, 0.12);
    const atk = attackRamp(sw.length, 0.05);
    for (let i = 0; i < sw.length; i++) sw[i] *= e2[i] * atk[i];
    addAt(out, sw, Math.floor(0.02 * SR), 0.2);
    return normalize(out, 0.8);
  },

  /** 卷轴展开（1.5s）：宣纸「唰」低通扫频 + 轻 flutter */
  'scroll-unroll': () => {
    const N = SR * 1.5;
    const out = new Float32Array(N);
    const rng = mulberry32(0x5e5e);
    // 纸噪：两段低通交叉（600Hz 衰减 + 2500Hz 渐入）
    const low = biquad(pinkNoise(N, rng), 'lowpass', 600, 0.8);
    const hi = biquad(pinkNoise(N, rng), 'lowpass', 2500, 0.8);
    const envL = new Float32Array(N);
    const envH = new Float32Array(N);
    const atkS = Math.floor(SR * 0.12);
    const durS = Math.floor(SR * 1.15);
    for (let i = 0; i < N; i++) {
      const p = i / durS;
      envL[i] = i < atkS ? i / atkS : Math.exp(-((i - atkS) / (SR * 0.5)));
      envH[i] = p < 0 ? 0 : Math.min(1, p / 0.3) * Math.exp(-((i - atkS) / (SR * 0.6)));
    }
    for (let i = 0; i < N; i++) {
      out[i] += low[i] * envL[i] * 0.3 + hi[i] * envH[i] * 0.16;
    }
    // 轻 flutter：4 个极轻 tick
    for (let i = 0; i < 4; i++) {
      const len = Math.floor((4 * SR) / 1000);
      const tk = biquad(whiteNoise(len, rng), 'highpass', 2500, 0.7);
      const e = expDecay(len, 0.01);
      for (let k = 0; k < len; k++) tk[k] *= e[k];
      addAt(out, tk, Math.floor((0.1 + i * 0.12) * SR), 0.1);
    }
    return normalize(out, 0.8);
  },

  /** 船行水声（3s 循环）：棕噪底 + 带通波涌 + 水泡咕嘟 */
  ship: () => {
    const N = SR * 3;
    const out = new Float32Array(N);
    const rng = mulberry32(0x6f6f);
    const bed = biquad(brownNoise(N, rng), 'lowpass', 350, 0.7);
    const sw = biquad(whiteNoise(N, rng), 'bandpass', 900, 2);
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const lfo1 = 0.65 + 0.3 * Math.sin(2 * Math.PI * 0.11 * t);
      const lfo2 = 0.5 + 0.3 * Math.sin(2 * Math.PI * 0.11 * t + Math.PI * 0.6);
      out[i] += bed[i] * lfo1 * 0.5 + sw[i] * lfo2 * 0.22;
    }
    // 水泡咕嘟
    for (let k = 0; k < 3; k++) {
      const len = Math.floor((60 * SR) / 1000);
      const fc = 500 + rng() * 700;
      const g = biquad(whiteNoise(len, rng), 'bandpass', fc, 3);
      const e = expDecay(len, 0.07);
      for (let i = 0; i < len; i++) g[i] *= e[i];
      addAt(out, g, Math.floor((0.4 + rng() * 2) * SR), 0.16);
    }
    return crossfadeLoop(normalize(out, 0.75), 0.4);
  },

  /** 报喜锣（2.5s）：非谐泛音长衰减 + 攻击 + 4Hz 尾端微闪 */
  gong: () => {
    const N = SR * 2.5;
    const out = new Float32Array(N);
    const rng = mulberry32(0x8080);
    const f0 = 196;
    const ratios = [1, 2.76, 5.4, 8.9];
    const amps = [1, 0.6, 0.4, 0.25];
    for (let p = 0; p < ratios.length; p++) {
      const part = sine(f0 * ratios[p], 2.4, amps[p]);
      const e = expDecay(part.length, 0.75 + p * 0.12);
      for (let i = 0; i < part.length; i++) {
        const t = i / SR;
        const shimmer = 1 + 0.1 * Math.sin(2 * Math.PI * 4 * t);
        part[i] *= e[i] * shimmer;
      }
      addAt(out, part, 0, 1);
    }
    const click = biquad(whiteNoise(Math.floor((5 * SR) / 1000), rng), 'highpass', 5000, 0.7);
    addAt(out, click, 0, 0.5);
    return normalize(out, 0.9);
  },

  /** 错误木鱼（0.4s）：空心「笃」+ 谐振 */
  woodfish: () => {
    const N = SR * 0.4;
    const out = new Float32Array(N);
    const rng = mulberry32(0x9191);
    const main = sine(660, 0.3, 0.9);
    const e1 = expDecay(main.length, 0.09);
    for (let i = 0; i < main.length; i++) main[i] *= e1[i];
    addAt(out, main, 0, 1);
    const res = sine(1380, 0.25, 0.35);
    const e2 = expDecay(res.length, 0.055);
    for (let i = 0; i < res.length; i++) res[i] *= e2[i];
    addAt(out, res, 0, 1);
    const click = biquad(whiteNoise(Math.floor((3 * SR) / 1000), rng), 'highpass', 5000, 0.7);
    addAt(out, click, 0, 0.25);
    return normalize(out, 0.85);
  },
};

/* ------------------------------------------------------------
   WAV 写入 + ffmpeg 编码
   ------------------------------------------------------------ */
function toWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM fmt chunk
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

function encode(wavPath, outPath, opts) {
  const args = ['-y', '-i', wavPath];
  args.push('-ar', String(SR), '-ac', '1');
  if (opts.codec === 'mp3') {
    args.push('-codec:a', 'libmp3lame', '-b:a', opts.br);
  } else {
    args.push('-codec:a', 'libvorbis', '-q:a', String(opts.q));
  }
  args.push(outPath);
  const r = spawnSync(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg ${opts.codec} ${outPath} failed: ${r.stderr.slice(0, 400)}`);
  }
}

mkdirSync(OUT_DIR, { recursive: true });

const rows = [];
let total = 0;
for (const [name, make] of Object.entries(recipes)) {
  const wav = toWav(normalize(make()));
  const wavPath = join(OUT_DIR, `_${name}.wav`);
  writeFileSync(wavPath, wav);
  const mp3 = join(OUT_DIR, `${name}.mp3`);
  const ogg = join(OUT_DIR, `${name}.ogg`);
  const isAmbient = name === 'hall' || name === 'ship';
  encode(wavPath, mp3, { codec: 'mp3', br: isAmbient ? '32k' : '40k' });
  encode(wavPath, ogg, { codec: 'ogg', q: isAmbient ? 0.4 : 0.5 });
  const sm = statSync(mp3).size;
  const so = statSync(ogg).size;
  total += sm + so;
  rows.push({ name, mp3: sm, ogg: so, both: sm + so });
  console.log(
    `  ${name.padEnd(14)} mp3 ${String(sm).padStart(6)}B  ogg ${String(so).padStart(6)}B  = ${sm + so}B`,
  );
}

console.log('\n总包（mp3+ogg 合计）:', Math.round(total / 1024) + 'KB');
if (total > TOTAL_BUDGET) {
  console.error(`✗ 超预算 ${TOTAL_BUDGET} 字节！请降码率或裁时长。`);
  process.exit(1);
}
console.log('✓ 预算内（< 500KB）');
