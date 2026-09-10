/**
 * 南洋海图沙盘 · 古地名据点（批次 14）
 *
 * 8 港口与 8 位幕僚一一对应：点击据点弹卷轴信息，关联幕僚「去办差」跳
 * ADVISOR_PANELS[advisorId]。中文硬编码 —— 品牌语言策略 B（品牌语以中文
 * 写入所有语言），不进 i18n。
 *
 * 坐标 (gx, gy) 为沙盘地图网格坐标（0..MAP_W / 0..MAP_H），与
 * scene-layers.tsx 的 SEA_ROWS 陆地轮廓严格一致。
 */
import type { AdvisorId } from '@/components/brand/advisors';

export type PortId =
  | 'champa'
  | 'siam'
  | 'melaka'
  | 'palembang'
  | 'semarang'
  | 'java'
  | 'sumatra'
  | 'ceylon';

export interface SeaPort {
  id: PortId;
  /** 明代古地名 */
  name: string;
  /** 今地（辅助阅读） */
  modern: string;
  /** 关联幕僚 → ADVISOR_PANELS 跳转 */
  advisorId: AdvisorId;
  /** 地图网格坐标（与 SEA_ROWS 陆地轮廓一致） */
  gx: number;
  gy: number;
  /** 郑和下西洋叙事简介 */
  intro: string;
}

/** 沙盘地图网格尺寸（SVG viewBox 同此） */
export const MAP_W = 88;
export const MAP_H = 56;

/** 8 港口，按航线次序排列（金航线 = 按数组序连线，跨线最少） */
export const SEA_PORTS: SeaPort[] = [
  {
    id: 'champa',
    name: '占城',
    modern: '越南中南部',
    advisorId: 'ma-huan',
    gx: 70,
    gy: 12,
    intro: '占城为西洋首站，港市辐辏、稻米丰穰，郑和船队五经其地，马欢《瀛涯胜览》开卷即记。',
  },
  {
    id: 'siam',
    name: '暹罗',
    modern: '泰国',
    advisorId: 'hong-bao',
    gx: 52,
    gy: 18,
    intro: '暹罗水城环列、商贾云集，使节通译、礼俗往来，洪保最谙其方言。',
  },
  {
    id: 'melaka',
    name: '满剌加',
    modern: '马来西亚马六甲',
    advisorId: 'zheng-he',
    gx: 42,
    gy: 32,
    intro: '满剌加扼马六甲海峡咽喉，郑和于此立官厂、设驿站，南洋诸国贸易总枢纽，本局提督坐镇之处。',
  },
  {
    id: 'sumatra',
    name: '苏门答腊',
    modern: '印度尼西亚苏门答腊岛',
    advisorId: 'hou-xian',
    gx: 16,
    gy: 40,
    intro: '苏门答腊（须文达那）扼西海孔道，诸国朝贡辐辏，侯显精于斡旋调度。',
  },
  {
    id: 'ceylon',
    name: '锡兰',
    modern: '斯里兰卡',
    advisorId: 'li-bin',
    gx: 8,
    gy: 30,
    intro: '锡兰山国盛产宝石香料，郑和立碑施财，李彬以观星日志备载航迹。',
  },
  {
    id: 'palembang',
    name: '旧港',
    modern: '印度尼西亚巨港',
    advisorId: 'wang-jinghong',
    gx: 36,
    gy: 42,
    intro: '旧港为三佛齐故都、华裔市舶司旧地，郑和重设官厂，王景弘曾率队驻守。',
  },
  {
    id: 'semarang',
    name: '三宝垄',
    modern: '印度尼西亚三宝垄',
    advisorId: 'zhang-da',
    gx: 34,
    gy: 48,
    intro: '三宝垄传为船队驻泊修造之地，港名寄「三宝」之名，张达掌船营造。',
  },
  {
    id: 'java',
    name: '爪哇',
    modern: '印度尼西亚爪哇岛',
    advisorId: 'fei-xin',
    gx: 52,
    gy: 48,
    intro: '爪哇国物产丰饶、胡椒满市，费信记此地风物人情、奇闻异事最详。',
  },
];

/** 金航线 polyline 点串（SVG 与地图同 viewBox 拉伸对齐） */
export const SEA_ROUTE = SEA_PORTS.map((p) => `${p.gx},${p.gy}`).join(' ');
