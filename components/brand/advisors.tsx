/**
 * 南洋出海局 · 8 位像素幕僚角色（批次 11）
 *
 * 32×32 像素网格手绘 SVG，复用 bamboo-icons 的 PixelFrame 外壳（crispEdges，
 * 显示尺寸由调用方 className 控制：w-8/h-8=32px，w-16/h-16=64px，或 width/height）。
 *
 * 绘制法：每角色 = 32 行字符图（每字符 1 像素）→ 色板映射 → 1×1 `<rect>`。
 * 统一明制身段（冠/面/交领/玉带/袍摆/靴），8 角色共用同一 12 色板保证服饰统一；
 * 职责识别靠冠式 + 身旁道具（props 层独立于呼吸身，保持静止）。
 *
 * 呼吸动画：`<g class="advisor-breathe">` 包角色身（foot 锚定，身微上浮），
 * 动画帧在 globals.css；`breathFrame={0|1|2}` 可指定静态帧（供雪碧图导出）。
 */
import type { ReactNode } from 'react';
import type { SVGProps } from 'react';
import { PixelFrame } from './bamboo-icons';

export type AdvisorId =
  | 'zheng-he'
  | 'ma-huan'
  | 'wang-jinghong'
  | 'fei-xin'
  | 'hong-bao'
  | 'hou-xian'
  | 'zhang-da'
  | 'li-bin';

export const ADVISOR_IDS: AdvisorId[] = [
  'zheng-he',
  'ma-huan',
  'wang-jinghong',
  'fei-xin',
  'hong-bao',
  'hou-xian',
  'zhang-da',
  'li-bin',
];

/** 共享 12 色板：靛青/金箔/宣纸/朱砂/竹青/檀木/墨/青碧/灰青/雪白 … 服饰统一明制 */
const PALETTE: Record<string, string> = {
  K: '#1A1A1A', // 墨（帽/发/靴/瞳）
  P: '#F5F0E6', // 宣纸（脸/纸）
  I: '#1E3A5F', // 靛青（官袍/儒袍）
  D: '#162B47', // 深靛（袍缘影）
  G: '#C9A227', // 金箔（饰/带/补子）
  V: '#B82222', // 朱砂（蟒袍/印/旗）
  B: '#5A8F6E', // 竹青（费信袍）
  S: '#8B5A2B', // 檀木（账房/工匠衣与木具）
  T: '#0E7490', // 青碧（洪保异域）
  F: '#5C6B73', // 灰青（石碑/铁具）
  W: '#FFFFFF', // 雪白（信鸽/高光）
  O: '#E67E22', // 告警橙（点缀）
};

/** 行构造器：c 连续 n 像素从 o 起，右补齐到 32 */
const r = (c: string, o: number, n: number) =>
  '.'.repeat(o) + c.repeat(n) + '.'.repeat(32 - o - n);

/** 把 prop 图层盖到 base 上（非 '.' 覆盖），返回新 32×32 网格 */
function blit(base: string[], prop: string[], ox: number, oy: number): string[] {
  const out = base.map((row) => row.split(''));
  prop.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '.' || c === ' ') continue;
      const tx = x + ox;
      const ty = y + oy;
      if (tx >= 0 && tx < 32 && ty >= 0 && ty < 32) out[ty][tx] = c;
    }
  });
  return out.map((row) => row.join(''));
}

function assert32(rows: string[], name: string): void {
  rows.forEach((row, i) => {
    if (row.length !== 32) {
      throw new Error(`[advisors] ${name} 第 ${i} 行是 ${row.length} 字符（需 32）："${row}"`);
    }
  });
}

/* ---------------------------------------------------------------------------
 * 标准明制身段（共用）：冠 y1-4 由各角色图盖；面 y5-8 宣纸脸 + 2 墨瞳；
 * 交领 y9（金边宣纸 V）；袍身 y10-13；玉带 y14-15 金；袍摆 y16-23 外扩；
 * 缘饰 y24 金；靴 y25-26。c = 袍色。
 * ------------------------------------------------------------------------- */
function BASE(c: string): string[] {
  return [
    r('.', 0, 32), // y0
    r('.', 0, 32), // y1（冠层）
    r('.', 0, 32), // y2
    r('.', 0, 32), // y3
    r('.', 0, 32), // y4
    '..............PPPPP.............', // y5 面
    '..............PIPIP.............', // y6 眉眼
    '..............PPPPP.............', // y7
    '..............PPPPP.............', // y8
    '...........GGPPPPPGG............', // y9 交领
    r(c, 11, 9), //  y10 袍身
    r(c, 11, 9), //  y11
    r(c, 11, 9), //  y12
    r(c, 11, 9), //  y13
    r('G', 12, 9), // y14 玉带
    r('G', 12, 9), // y15
    r(c, 12, 9), //  y16 袍摆
    r(c, 12, 9), //  y17
    r(c, 11, 11), // y18
    r(c, 11, 11), // y19
    r(c, 11, 11), // y20
    r(c, 11, 11), // y21
    r(c, 11, 11), // y22
    r(c, 11, 11), // y23
    r('G', 11, 11), // y24 缘饰
    '...........KK....KK.............', // y25 靴
    '...........KK....KK.............', // y26 靴
    r('.', 0, 32), // y27
    r('.', 0, 32), // y28
    r('.', 0, 32), // y29
    r('.', 0, 32), // y30
    r('.', 0, 32), // y31
  ];
}

/* ------------------------------- 冠式层 ------------------------------- */

/** 马欢·儒巾（靛青，金结） */
const MA_HUAN_HAT = [
  '..............IIGII.............', // y1
  '.............IIIIIII............', // y2
  '.............IIIIIII............', // y3
  '.............IIIIIII............', // y4
];

/** 王景弘·乌纱帽（墨，展翅） */
const WANG_HAT = [
  '..............KKKKK.............', // y1
  '......KKKKKK..KKKKK..KKKKKK.....', // y2 翅
  '......KKKKKK..KKKKK..KKKKKK.....', // y3 翅
  '.............KKKKKKK............', // y4 沿
];

/** 费信·垂髫少年发（双丫髻） */
const FEI_HAIR = [
  '.........KKKK....KKKK...........', // y1
  '.........KKKK....KKKK...........', // y2
  '...........KKKKKKKKKKK..........', // y3 额发
  '............KKKKKKK.............', // y4 发际
];

/** 洪保·青碧缠头（异域，金带） */
const HONG_TURBAN = [
  '.............TTTTTT.............', // y1
  '............TTTTTTTT............', // y2
  '...........TTGGGGGGTT...........', // y3 金带
  '...........TTTTTTTTT............', // y4
];
const HONG_TAIL = ['T.', '.T', 'T.'];

/** 侯显·瓜皮帽（墨，金顶钮） */
const HOU_HAT = [
  '..............KGGGK.............', // y1
  '.............KKKKKKK............', // y2
  '............KKKKKKKKK...........', // y3
  '.............KKKKKKK............', // y4
];

/** 张达·工匠帽（檀木，金带） */
const ZHANG_HAT = [
  '..............SSSSS.............', // y1
  '.............SSSSSSS............', // y2
  '...........GSSSSSSSG............', // y3 金带
  '..............SSSSS.............', // y4
];

/** 李彬·展脚幞头（墨冠 + 双展脚垂带） */
const LI_HAT = [
  '..............KKKKK.............', // y1
  '.............KKKKKKK............', // y2
  '............KKKKKKKKK...........', // y3
  '.............KKKKKKK............', // y4
];
const LI_RIBBONS = [
  'K.......K', // y5-12 垂带
  'K.......K',
  'K.......K',
  'K.......K',
  'K.......K',
  'K.......K',
  'K.......K',
  'K.......K',
];

/** 官补子（金 3×3） */
const CHEST_BADGE = ['GGG', 'GGG', 'GGG'];

/* ------------------------------- 角色身 ------------------------------- */

/** 郑和·提督：体型略大，朱蟒袍 + 金鳞 + 方翅金冠 */
const ZHENG_HE_BODY = [
  r('.', 0, 32), // y0
  '..............KKKKK.............', // y1 冠
  '..............KGGGGK............', // y2 金带
  '........GGGGG.KKKKK.KGGGGG......', // y3 方翅
  '.........KKKKKKKKKKKKKKKK.......', // y4 沿
  '..............PPPPP.............', // y5 面
  '..............PIPIP.............', // y6 眉眼
  '..............PPPPP.............', // y7
  '..............PPPPP.............', // y8
  '...........GGPPPPPPPPGG.........', // y9 交领
  r('V', 10, 13), //  y10 蟒袍
  r('V', 10, 13), //  y11
  '..........GVVVGVVVGVVVG.........', // y12 金鳞
  r('V', 10, 13), //  y13
  r('G', 10, 13), //  y14 玉带
  r('G', 10, 13), //  y15
  r('V', 10, 13), //  y16 袍摆
  r('V', 10, 13), //  y17
  r('V', 10, 13), //  y18
  r('V', 9, 15), //   y19
  r('V', 9, 15), //   y20
  r('V', 9, 15), //   y21
  r('V', 9, 15), //   y22
  r('G', 9, 15), //   y23 缘饰
  '.........KK.......KK............', // y24 靴
  '.........KK.......KK............', // y25
  r('.', 0, 32), //  y26
  r('.', 0, 32), //  y27
  r('.', 0, 32), //  y28
  r('.', 0, 32), //  y29
  r('.', 0, 32), //  y30
  r('.', 0, 32), //  y31
];

/** 其余 7 人：标准身段 + 各自冠式（盖到 y1-4） */
const MA_HUAN_BODY = blit(BASE('P'), MA_HUAN_HAT, 0, 1);
const WANG_JINGHONG_BODY = blit(blit(BASE('I'), WANG_HAT, 0, 1), CHEST_BADGE, 15, 11);
const FEI_XIN_BODY = blit(BASE('B'), FEI_HAIR, 0, 1);
const HONG_BAO_BODY = blit(blit(BASE('I'), HONG_TURBAN, 0, 1), HONG_TAIL, 25, 5);
const HOU_XIAN_BODY = blit(BASE('S'), HOU_HAT, 0, 1);
const ZHANG_DA_BODY = blit(BASE('S'), ZHANG_HAT, 0, 1);
const LI_BIN_BODY = blit(blit(BASE('I'), LI_HAT, 0, 1), LI_RIBBONS, 11, 5);

const BODY: Record<AdvisorId, string[]> = {
  'zheng-he': ZHENG_HE_BODY,
  'ma-huan': MA_HUAN_BODY,
  'wang-jinghong': WANG_JINGHONG_BODY,
  'fei-xin': FEI_XIN_BODY,
  'hong-bao': HONG_BAO_BODY,
  'hou-xian': HOU_XIAN_BODY,
  'zhang-da': ZHANG_DA_BODY,
  'li-bin': LI_BIN_BODY,
};

/* ------------------------------- 身旁道具 ------------------------------- */
/** 郑和·令旗（金杆 + 朱「令」旗） */
const ZHENG_HE_PROPS = [
  {
    ox: 24,
    oy: 0,
    rows: [
      '..K.....', // y4 杆顶
      '..KGVVG.', // y5 旗
      '..KGVVG.', // y6
      '..KGVVG.', // y7
      '..KGVVG.', // y8
      '..KGVVG.', // y9
      '..KGVVG.', // y10
      '..KGVVG.', // y11
      '..KGGVG.', // y12 令
      '..KGVVG.', // y13
      '..K.....', // y14 杆
      '..K.....', // y15
      '..K.....', // y16
      '..K.....', // y17
      '..K.....', // y18
      '..K.....', // y19
      '..K.....', // y20
      '..K.....', // y21
      '..K.....', // y22
      '..K.....', // y23
      '..KG....', // y24 金顶
    ],
  },
];

/** 马欢·书卷 + 执笔 + 砚台 */
const MA_HUAN_PROPS = [
  {
    ox: 1,
    oy: 10,
    rows: [
      '..GGGGGG..', // 轴头
      '..PPPPPP..', // 卷面
      '..PPPPPP..',
      '..PIIIPP..', // 字行
      '..PPPPPP..',
      '..PPIIPP..',
      '..PPPPPP..',
      '..GGGGGG..', // 轴头
    ],
  },
  {
    ox: 24,
    oy: 8,
    rows: [
      '.GG.', // 笔管金
      '.GG.',
      '.SS.', // 笔杆檀木
      '.SS.',
      '.SS.',
      '.SS.',
      '.SS.',
      '.SS.',
      '.KK.', // 墨尖
      '.KK.',
    ],
  },
  {
    ox: 23,
    oy: 18,
    rows: ['GGGGG', 'KGGGK', 'KKKKK'], // 砚台
  },
];

/** 王景弘·金罗盘 + 南洋地图卷轴 */
const WANG_JINGHONG_PROPS = [
  {
    ox: 22,
    oy: 7,
    rows: [
      '..GGGG..',
      '.GPPPPG.',
      '.GPPPPG.',
      '.GPIPPG.',
      '.GIVIPG.',
      '.GPPPPG.',
      '.GPPPPG.',
      '..GGGG..',
    ],
  },
  {
    ox: 0,
    oy: 13,
    rows: [
      '..GGGGGGGG..',
      '..PPPPPPPP..',
      '..PPPPPPPP..',
      '..PPIPPPPP..',
      '..PPPIPPPP..',
      '..PPPPPPIP..',
      '..PPPPPPPP..',
      '..GGGGGGGG..',
    ],
  },
];

/** 费信·折扇 + 信鸽 + 书信堆叠 */
const FEI_XIN_PROPS = [
  {
    ox: 24,
    oy: 12,
    rows: [
      '......GG',
      '.....GPP',
      '....GPP.',
      '...GPP..',
      '..GPP...',
      '.GPP....',
    ],
  },
  {
    ox: 2,
    oy: 9,
    rows: [
      '...GWWW.',
      '..WWWWWW',
      '.WWWWWWW',
      '.WPPPPWW',
      '..K...K.',
    ],
  },
  {
    ox: 0,
    oy: 16,
    rows: [
      '...PPPP..',
      '...PPPP..',
      '..PPPPPP.',
      '..PPPPPP.',
      '.PPVPPPP.',
      '.PPPPPPPP',
    ],
  },
];

/** 洪保·多卷译文（宣纸/青碧/朱砂 三卷）+ 各国文字石碑 */
const HONG_BAO_PROPS = [
  {
    ox: 0,
    oy: 14,
    rows: [
      '..GGGGGGGG..',
      '..PPPPPPPP..',
      '..GGGGGGGG..',
      '..GGGGGGGG..',
      '..TTTTTTTT..',
      '..GGGGGGGG..',
      '..GGGGGGGG..',
      '..VVVVVVVV..',
      '..GGGGGGGG..',
    ],
  },
  {
    ox: 22,
    oy: 8,
    rows: [
      '.FFFFFFF.',
      '.FFFFFFF.',
      '.FFFFFFF.',
      '.FPFFPFF.',
      '.FIFFIFF.',
      '.FFFFFFF.',
      '.FPFFIFF.',
      '.FIFFPFF.',
      '.FFFFFFF.',
      '.FFFFFFF.',
      '.FFFFFFF.',
    ],
  },
];

/** 侯显·金框算盘 + 账本 */
const HOU_XIAN_PROPS = [
  {
    ox: 21,
    oy: 13,
    rows: [
      'GGGGGGGGGG',
      '.VVVVVVVV.',
      'GGGGGGGGGG',
      '.VVVVVVVV.',
      '.VVVVVVVV.',
      'GGGGGGGGGG',
    ],
  },
  {
    ox: 1,
    oy: 12,
    rows: [
      '.GGGGGGGGG',
      '.GPPPPPPPG',
      '.GPIIPPPPG',
      '.GPPPPPPPG',
      '.GPPPPPPPG',
      '.GPPPIIPPG',
      '.GPPPPPPPG',
      '.GGGGGGGGG',
      '..GGGGGGG.',
    ],
  },
];

/** 张达·图纸 + 木尺 + 小宝船模型 */
const ZHANG_DA_PROPS = [
  {
    ox: 22,
    oy: 8,
    rows: [
      '.PPPPPPP.',
      '.PIIPPIP.',
      '.PPPPPPP.',
      '.PPIPIIP.',
      '.PPPPPPP.',
      '.PPPPPPP.',
    ],
  },
  {
    ox: 27,
    oy: 14,
    rows: ['SS', 'GS', 'SS', 'GS', 'SS', 'GS', 'SS', 'GS', 'SS'],
  },
  {
    ox: 0,
    oy: 19,
    rows: [
      '....I......',
      '...VVV.....',
      '...IPPI....',
      '...IPPI....',
      '.IIIIIIIII.',
      '.IIIIIIIII.',
      '.GGGGGGGGG.',
    ],
  },
];

/** 李彬·厚重日志 + 星盘 + 羽毛笔 + 航海图 */
const LI_BIN_PROPS = [
  {
    ox: 1,
    oy: 12,
    rows: [
      '.GGGGGGGGG',
      '.GPPPPPPPG',
      '.GPIIPPPPG',
      '.GPPPPPPPG',
      '.GGGGGGGGG',
      '.GPPPPPPPG',
      '.GPPPIIPPG',
      '.GPPPPPPPG',
      '.GPPPPPPPG',
      '.GGGGGGGGG',
      '.GGGGGGG..',
    ],
  },
  {
    ox: 22,
    oy: 6,
    rows: [
      '...GGG...',
      '..GPPPG..',
      '.GPPPIPG.',
      '.GIIVIG..',
      '.GPPPIPG.',
      '.GPPPPPG.',
      '..GPPPG..',
      '...GGG...',
    ],
  },
  {
    ox: 25,
    oy: 15,
    rows: [
      '....GG',
      '...GGG',
      '...GGS',
      '..GSS.',
      '..GSS.',
      '.GSS..',
      '.SS...',
      'K.....',
    ],
  },
  {
    ox: 2,
    oy: 24,
    rows: ['.GGGGGG.', '.PPPPPP.', '.GGGGGG.'],
  },
];

const PROPS: Record<AdvisorId, { rows: string[]; ox: number; oy: number }[]> = {
  'zheng-he': ZHENG_HE_PROPS,
  'ma-huan': MA_HUAN_PROPS,
  'wang-jinghong': WANG_JINGHONG_PROPS,
  'fei-xin': FEI_XIN_PROPS,
  'hong-bao': HONG_BAO_PROPS,
  'hou-xian': HOU_XIAN_PROPS,
  'zhang-da': ZHANG_DA_PROPS,
  'li-bin': LI_BIN_PROPS,
};

/* 静态校验：全部身/道具行必须恰为声明宽 */
for (const [id, rows] of Object.entries(BODY)) assert32(rows, id);
for (const [id, list] of Object.entries(PROPS)) {
  for (const p of list) {
    for (const row of p.rows) {
      if (row.length !== p.rows[0].length) {
        throw new Error(`[advisors] ${id} 道具行宽不一致：${row.length} ≠ ${p.rows[0].length}`);
      }
    }
  }
}

/* ----------------- 头/身分层（批次 13） -----------------
 * BODY 按行切片：HEAD=y0-9（冠/面/交领），TORSO=y10-31（袍/带/摆/靴）。
 * 转头只平移 HEAD 层；鞠躬/报喜 transform 走外层 wrapper（与呼吸同锚定）。
 * 郑和 32 行同样成立。 */
const HEAD: Record<AdvisorId, string[]> = {} as Record<AdvisorId, string[]>;
const TORSO: Record<AdvisorId, string[]> = {} as Record<AdvisorId, string[]>;
for (const id of ADVISOR_IDS) {
  HEAD[id] = BODY[id].slice(0, 10);
  TORSO[id] = BODY[id].slice(10);
}

/* 拱手/抱拳叠层手（批次 13）：双袖口 + 双拳 + 指尖，叠于胸口。
 * 化解 BASE 身无手臂像素的限制；hover/领命时随 motion 淡入。 */
const GREET_HANDS = {
  ox: 13,
  oy: 9,
  rows: ['.SS.SS.', '.SPSPS.', '.PP.PP.'],
};

/* ------------------------------- 角色组件 ------------------------------- */

const BREATH_FRAMES: Record<0 | 1 | 2, string> = {
  0: 'translateY(0) scaleY(1)',
  1: 'translateY(-1px) scaleY(1.02)',
  2: 'translateY(0) scaleY(1)',
};

/** 交互动效状态（批次 13）：idle 默认呼吸 / hover 转头+拱手 / bow 领命鞠躬 / cheer 报喜 */
export type AdvisorMotion = 'idle' | 'hover' | 'bow' | 'cheer';

export interface PixelAdvisorProps extends SVGProps<SVGSVGElement> {
  /** 角色 id */
  id: AdvisorId;
  /** 默认 true：身挂 advisor-breathe 呼吸动画（道具静止） */
  animate?: boolean;
  /** 指定静态呼吸帧（0 静止 / 1 顶点 / 2 回位），供雪碧图导出；与 animate/motion 互斥 */
  breathFrame?: 0 | 1 | 2;
  /** 交互动效状态（批次 13），默认 idle；与 breathFrame 互斥（导出路径不受影响） */
  motion?: AdvisorMotion;
}

/** 单像素渲染：非 '.' 字符 → 1×1 rect */
function P(rows: string[], ox = 0, oy = 0): ReactNode {
  const rects: ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '.' || c === ' ') continue;
      const fill = PALETTE[c];
      if (!fill) throw new Error(`[advisors] 未知颜色 "${c}" @${x},${y}`);
      rects.push(
        <rect key={`${x},${y}`} x={x + ox} y={y + oy} width={1} height={1} fill={fill} />,
      );
    }
  });
  return rects;
}

export function PixelAdvisor({
  id,
  animate = true,
  breathFrame,
  motion = 'idle',
  ...props
}: PixelAdvisorProps) {
  const frame = breathFrame !== undefined ? BREATH_FRAMES[breathFrame] : undefined;
  // 导出/静态帧路径（animate=false 或 breathFrame 指定）不受 motion 影响
  const breathe = animate && breathFrame === undefined && (motion === 'idle' || motion === 'hover');

  // wrapper 交互动效：bow/cheer 覆盖呼吸；idle/hover 保持呼吸
  const motionClass =
    motion === 'bow' ? 'advisor-bow' : motion === 'cheer' ? 'advisor-cheer' : undefined;

  // head 层：hover 转头；bow 轻微低头
  const headClass = motion === 'hover' ? 'advisor-head advisor-head-hover' : 'advisor-head';
  const headStyle =
    motion === 'bow'
      ? { transform: 'translateY(1px)', transformBox: 'view-box' as const }
      : undefined;

  // hover / 领命 均展示拱手手层
  const handsVisible = !frame && (motion === 'hover' || motion === 'bow');

  return (
    <PixelFrame {...props}>
      {/* 呼吸/鞠躬/报喜都只动身：脚底为轴（道具静止） */}
      <g
        className={
          [breathe ? 'advisor-breathe' : undefined, motionClass].filter(Boolean).join(' ') ||
          undefined
        }
        style={
          frame
            ? { transform: frame, transformBox: 'view-box', transformOrigin: '50% 100%' }
            : undefined
        }
      >
        <g className={headClass} style={headStyle}>
          {P(HEAD[id])}
        </g>
        <g>{P(TORSO[id])}</g>
      </g>
      {/* 拱手/抱拳叠层（独立于呼吸身，随 motion 淡入） */}
      {handsVisible && (
        <g className="advisor-hands">
          {P(GREET_HANDS.rows, GREET_HANDS.ox, GREET_HANDS.oy)}
        </g>
      )}
      {/* 身旁道具静止（独立于呼吸身） */}
      {(PROPS[id] ?? []).map((p, i) => (
        <g key={i}>{P(p.rows, p.ox, p.oy)}</g>
      ))}
    </PixelFrame>
  );
}

/* ------------------------------- 角色元数据 ------------------------------- */

export interface AdvisorMeta {
  id: AdvisorId;
  name: string;
  title: string;
  tags: string[];
}

export const ADVISORS: AdvisorMeta[] = [
  { id: 'zheng-he', name: '郑和', title: '提督 · AI 总指挥', tags: ['调度全局', '决策中枢'] },
  { id: 'ma-huan', name: '马欢', title: '文案幕僚', tags: ['文宣', '润色'] },
  { id: 'wang-jinghong', name: '王景弘', title: '营销幕僚', tags: ['获客', '推广'] },
  { id: 'fei-xin', name: '费信', title: '社媒幕僚', tags: ['内容', '互动'] },
  { id: 'hong-bao', name: '洪保', title: '翻译幕僚', tags: ['多语', '本地化'] },
  { id: 'hou-xian', name: '侯显', title: '投放幕僚', tags: ['投放', '预算'] },
  { id: 'zhang-da', name: '张达', title: '技术幕僚', tags: ['工程', '运维'] },
  { id: 'li-bin', name: '李彬', title: '数据幕僚', tags: ['分析', '报告'] },
];
