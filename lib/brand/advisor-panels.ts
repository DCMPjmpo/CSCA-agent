import type { AdvisorId } from '@/components/brand/advisors';

/**
 * 8 位幕僚 → 既有功能页映射（批次 13，可配置常量）
 *
 * 点击幕僚「领命」动画后跳转目标。缺省按职能对应 /csca 各 hash 面板与讲学堂；
 * 需与 app/csca/page.tsx 的 hash 深链保持一致（university-match 为批次 13 新补）。
 */
export const ADVISOR_PANELS: Record<AdvisorId, string> = {
  'zheng-he': '/csca', // 提督 · 诊断全局
  'ma-huan': '/#classroom-generator', // 文案 · 讲学堂内容生成
  'wang-jinghong': '/csca#university-match', // 营销 · 院校匹配
  'fei-xin': '/csca#knowledge-map', // 社媒 · 知识图谱
  'hong-bao': '/csca#adaptive-learning', // 翻译 · 演武操练
  'hou-xian': '/csca#score-analysis', // 投放 · 观星测运（成绩分析）
  'zhang-da': '/csca#mock-exam', // 技术 · 试航演练（模考）
  'li-bin': '/csca#study-plan', // 数据 · 航海日志（学习计划）
};
