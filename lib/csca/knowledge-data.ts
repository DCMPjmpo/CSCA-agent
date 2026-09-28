/**
 * Structured CSCA knowledge map data — used when LLM workflow is unavailable.
 *
 * Phase 4:
 *   - BASE_TOPICS mastery starts at 0 (unknown), no fabricated ability
 *   - computeMasteryFromAnswers() calculates mastery from real answer history
 *   - buildKnowledgeMap() supports realMasteryData override
 *   - New users with no answer data -> mastery = 0
 *
 * Q3.0.1:
 *   - Dynamically load V1 subject (Chemistry/Arts Chinese/STEM Chinese/English) knowledge points from csca_enrichment_v1.json
 *   - No fabricated KPs; directly consume enrichment.knowledgePoint / knowledgePointSource
 *   - subject mapping: Humanities Chinese->文科中文, STEM Chinese->理科中文, Chemistry->化学, English->英语
 */

import cscaEnrichmentV1 from '../../data/processed/csca_enrichment_v1.json';
import type { QuestionEnrichment } from './question-bank';

/** enrichment subject -> selector/frontend subject mapping */
const ENRICHMENT_SUBJECT_MAP: Record<string, string> = {
  'Humanities Chinese': '文科中文',
  'STEM Chinese': '理科中文',
  Chemistry: '化学',
  English: '英语',
};

/** Build subject -> KP list mapping from V1 enrichment (real data, no fabrication) */
function buildV1KnowledgePoints(): Record<string, Omit<KnowledgeTopic, 'subject'>[]> {
  const result: Record<string, Omit<KnowledgeTopic, 'subject'>[]> = {};
  const enrichmentMap = cscaEnrichmentV1 as Record<string, QuestionEnrichment>;

  for (const questionId of Object.keys(enrichmentMap)) {
    const enr = enrichmentMap[questionId];
    const frontendSubject = ENRICHMENT_SUBJECT_MAP[enr.knowledgePointHierarchy.subject];
    if (!frontendSubject) continue;

    if (!result[frontendSubject]) result[frontendSubject] = [];
    const kpName = enr.knowledgePoint;
    if (!result[frontendSubject].some((k) => k.name === kpName)) {
      result[frontendSubject].push({
        id: `${frontendSubject}-${kpName}`,
        name: kpName,
        description: `source: ${enr.knowledgePointSource}`,
        mastery: 0,
      });
    }
  }
  return result;
}

const V1_KNOWLEDGE_POINTS = buildV1KnowledgePoints();

export interface KnowledgeTopic {
  id: string;
  name: string;
  description: string;
  mastery: number;
  subject: string;
  /** Phase 4: mastery 来源标注 */
  masterySource?: 'real_answers' | 'ai_inferred' | 'initial';
}

/** 真实答题数据（用于计算 mastery）—— 与 session.ts 的 AnswerRecord 对齐 */
export interface AnswerRecord {
  questionId: string;
  subject: string;
  knowledgePoint?: string;
  module?: string;
  isCorrect: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  mode?: 'practice' | 'exam' | 'wrong_answer_practice';
  targetMajor?: string;
  timestamp: number;
}

const BASE_TOPICS: Record<string, Omit<KnowledgeTopic, 'subject'>[]> = {
  基础汉语: [
    { id: 'chi-1', name: '语音', description: '拼音、声调、变调', mastery: 0 },
    { id: 'chi-2', name: '汉字', description: '字形、笔画、部首', mastery: 0 },
    { id: 'chi-3', name: '词汇', description: '词义、近义词、反义词', mastery: 0 },
    { id: 'chi-4', name: '语法', description: '句法、词类、句式', mastery: 0 },
    { id: 'chi-5', name: '阅读理解', description: '文章理解、主旨把握', mastery: 0 },
    { id: 'chi-6', name: '写作', description: '作文、应用文写作', mastery: 0 },
    { id: 'chi-7', name: '听力', description: '听力理解、信息提取', mastery: 0 },
    { id: 'chi-8', name: '成语', description: '成语理解、成语运用', mastery: 0 },
  ],
  数学: [
    { id: 'math-1', name: '集合与函数', description: '集合运算、函数概念', mastery: 0 },
    { id: 'math-2', name: '代数', description: '方程、不等式、多项式', mastery: 0 },
    { id: 'math-3', name: '几何', description: '平面几何、立体几何', mastery: 0 },
    { id: 'math-4', name: '三角函数', description: '三角比、三角恒等式', mastery: 0 },
    { id: 'math-5', name: '数列', description: '等差数列、等比数列', mastery: 0 },
    { id: 'math-6', name: '概率统计', description: '概率、统计基础', mastery: 0 },
    { id: 'math-7', name: '解析几何', description: '直线、圆、圆锥曲线', mastery: 0 },
    { id: 'math-8', name: '微积分基础', description: '极限、导数、积分', mastery: 0 },
  ],
  物理: [
    { id: 'phy-1', name: '力学基础', description: '运动学、牛顿定律', mastery: 0 },
    { id: 'phy-2', name: '功和能', description: '功、功率、能量守恒', mastery: 0 },
    { id: 'phy-3', name: '圆周运动', description: '向心力、向心加速度', mastery: 0 },
    { id: 'phy-4', name: '振动与波', description: '简谐运动、机械波', mastery: 0 },
    { id: 'phy-5', name: '热学', description: '热力学定律、理想气体', mastery: 0 },
    { id: 'phy-6', name: '电场', description: '库仑定律、电场强度', mastery: 0 },
    { id: 'phy-7', name: '电路', description: '欧姆定律、电功率', mastery: 0 },
    { id: 'phy-8', name: '电磁感应', description: '法拉第定律、楞次定律', mastery: 0 },
  ],
  化学: [
    { id: 'chem-1', name: '化学基础', description: '原子结构、元素周期律', mastery: 0 },
    { id: 'chem-2', name: '化学键', description: '离子键、共价键、金属键', mastery: 0 },
    { id: 'chem-3', name: '化学计量', description: '摩尔、化学方程式', mastery: 0 },
    { id: 'chem-4', name: '氧化还原', description: '氧化还原反应、电化学', mastery: 0 },
    { id: 'chem-5', name: '化学平衡', description: '平衡常数、勒夏特列原理', mastery: 0 },
    { id: 'chem-6', name: '酸碱理论', description: '酸碱定义、pH计算', mastery: 0 },
    { id: 'chem-7', name: '有机化学', description: '烃类、官能团', mastery: 0 },
    { id: 'chem-8', name: '化学实验', description: '实验操作、实验安全', mastery: 0 },
  ],
  理科中文: [
    { id: 'sci-chi-1', name: '专业词汇', description: '理工类汉语词汇', mastery: 0 },
    { id: 'sci-chi-2', name: '科技阅读', description: '科技文章阅读理解', mastery: 0 },
    { id: 'sci-chi-3', name: '实验报告', description: '实验报告写作', mastery: 0 },
  ],
};

/** ASEAN students often have weaker Chinese writing — adjust baseline mastery. */
const ASEAN_MASTERY_OFFSET: Record<string, number> = {
  TH: -0.08,
  VN: -0.06,
  ID: -0.07,
  MY: -0.03,
  PH: -0.05,
};

/**
 * Phase 4: 从真实答题历史计算 mastery
 *
 * 算法：
 *   mastery = correctCount / totalCount
 *   无答题数据 → mastery = 0（显示"暂无数据"）
 *   最少 3 题才开始计算（避免单题偶然性）
 */
export function computeMasteryFromAnswers(
  answers: AnswerRecord[],
  subject: string,
  module?: string,
): number {
  const filtered = answers.filter(
    (a) => a.subject === subject && (!module || a.module === module || a.knowledgePoint === module),
  );

  if (filtered.length < 3) return 0; // 数据不足，不计算

  const correct = filtered.filter((a) => a.isCorrect).length;
  return Math.round((correct / filtered.length) * 100) / 100;
}

/**
 * Phase 4: 构建知识图谱（支持真实答题数据覆盖初始 mastery）
 *
 * @param subjects 科目列表
 * @param countryCode 国家代码（ASEAN 偏移）
 * @param realAnswers 真实答题历史（可选，用于计算 mastery）
 */
export function buildKnowledgeMap(
  subjects: string[],
  countryCode?: string,
  realAnswers?: AnswerRecord[],
): KnowledgeTopic[] {
  const offset = ASEAN_MASTERY_OFFSET[countryCode ?? ''] ?? 0;
  const result: KnowledgeTopic[] = [];

  for (const subject of subjects) {
    // Q3.0.1: V1 subjects use real enrichment KPs first; otherwise BASE_TOPICS; final fallback to math
    const topics = V1_KNOWLEDGE_POINTS[subject] ?? BASE_TOPICS[subject] ?? BASE_TOPICS['数学'];
    for (const t of topics) {
      let mastery = t.mastery; // 初始值 0
      let masterySource: KnowledgeTopic['masterySource'] = 'initial';

      // Phase 4: 如果有真实答题数据，从答题历史计算 mastery
      if (realAnswers && realAnswers.length > 0) {
        const realMastery = computeMasteryFromAnswers(realAnswers, subject, t.name);
        if (realMastery > 0) {
          mastery = realMastery;
          masterySource = 'real_answers';
        }
      }

      // ASEAN 偏移只应用于初始值（无真实数据时）
      if (masterySource === 'initial' && offset !== 0) {
        mastery = Math.max(0, Math.min(0.95, mastery + offset));
      }

      result.push({
        ...t,
        subject,
        mastery,
        masterySource,
      });
    }
  }

  return result;
}

export function masteryToLevel(mastery: number): 'mastered' | 'needs_review' | 'weak' {
  if (mastery >= 0.7) return 'mastered';
  if (mastery >= 0.5) return 'needs_review';
  return 'weak';
}

export function workflowTopicsToMap(
  topics: Array<{
    name: string;
    description: string;
    mastery: 'mastered' | 'needs_review' | 'weak';
    eloScore: number;
  }>,
  subject: string,
): KnowledgeTopic[] {
  const masteryValues = { mastered: 0.85, needs_review: 0.6, weak: 0.35 };
  return topics.map((t, i) => ({
    id: `wf-${i}`,
    name: t.name,
    description: t.description,
    mastery: masteryValues[t.mastery],
    subject,
    masterySource: 'ai_inferred' as const, // Phase 4: 标注 AI 推断非真实计算
  }));
}
