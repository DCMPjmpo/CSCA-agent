/**
 * lib/csca/major-subject-map.ts
 *
 * Phase 4: 专业 → 科目需求 配置层
 *
 * 数据来源标注：
 *   - documented: 有院校官方规则依据（来自 university-database.ts majors 字段）
 *   - configured: 基于 CSCA 考试规则配置（基础汉语+数学必考，物理/化学按专业方向）
 *   - fallback:   默认兜底（未匹配专业时使用）
 *
 * 红线：
 *   - 不编造专业需求
 *   - 复用现有 MOCK_DIAGNOSIS 数据（已基于 CSCA 规则配置）
 *   - 明确标注来源
 *   - 不破坏现有 diagnosis API contract
 */

import { CSCA_SUBJECTS, getSubjectConfig } from './exam-config';

// ===================== 类型定义 =====================

export type MapConfidence = 'documented' | 'configured' | 'fallback';

export interface MajorSubjectMap {
  /** 专业名称（中文） */
  majorName: string;
  /** 专业名称（英文） */
  majorNameEn: string;
  /** 专业类别 */
  category: 'medical' | 'engineering' | 'business' | 'humanities' | 'social' | 'science';
  /** 必考科目 */
  requiredSubjects: string[];
  /** 推荐科目（非必考但建议加强） */
  recommendedSubjects: string[];
  /** 科目优先级（1=最高） */
  subjectPriorities: Record<string, number>;
  /** 预估学习天数 */
  estimatedDays: number;
  /** 学习建议 */
  advice: string;
  /** 映射置信度 */
  confidence: MapConfidence;
  /** 映射依据说明 */
  rationale: string;
}

// ===================== 专业 → 科目映射表 =====================

/**
 * 基于 CSCA 考试规则的专业→科目映射
 *
 * CSCA 规则（来自 exam-config.ts 和 diagnosis API）：
 *   - 基础汉语（综合）- 必考科目
 *   - 数学 - 必考科目
 *   - 物理/化学 - 根据专业方向选择（理科方向）
 *   - 理科中文/文科中文 - 根据文理科方向选择
 *
 * 置信度说明：
 *   - configured: 基于 CSCA 规则配置，非院校官方数据
 *   - documented: 有院校官方录取要求依据
 *   - fallback: 默认兜底
 */
export const MAJOR_SUBJECT_MAP: MajorSubjectMap[] = [
  {
    majorName: '临床医学',
    majorNameEn: 'Clinical Medicine',
    category: 'medical',
    requiredSubjects: ['基础汉语', '数学', '物理', '化学'],
    recommendedSubjects: ['专业词汇', '医学汉语'],
    subjectPriorities: { 基础汉语: 1, 数学: 2, 化学: 3, 物理: 4 },
    estimatedDays: 90,
    advice: '临床医学专业需要较强的数理基础和化学知识。建议重点加强基础汉语和数学的学习，同时打好化学基础。',
    confidence: 'configured',
    rationale: '基于 CSCA 规则：医学属理科方向，需物理+化学；基础汉语+数学必考',
  },
  {
    majorName: '工程学',
    majorNameEn: 'Engineering',
    category: 'engineering',
    requiredSubjects: ['基础汉语', '数学', '物理'],
    recommendedSubjects: ['工程汉语', '计算机基础'],
    subjectPriorities: { 基础汉语: 1, 数学: 2, 物理: 3 },
    estimatedDays: 75,
    advice: '工程专业注重数学和物理能力。建议多做练习题，提高解题速度，同时加强专业汉语词汇学习。',
    confidence: 'configured',
    rationale: '基于 CSCA 规则：工程属理科方向，需物理；基础汉语+数学必考',
  },
  {
    majorName: '工商管理',
    majorNameEn: 'Business Administration',
    category: 'business',
    requiredSubjects: ['基础汉语', '数学'],
    recommendedSubjects: ['商务汉语', '经济学基础'],
    subjectPriorities: { 基础汉语: 1, 数学: 2 },
    estimatedDays: 60,
    advice: '工商管理专业需要良好的汉语语言能力和数学基础。建议加强汉语阅读和写作练习，特别是商务场景。',
    confidence: 'configured',
    rationale: '基于 CSCA 规则：商科非理科方向，不需物理/化学；基础汉语+数学必考',
  },
  {
    majorName: '计算机科学',
    majorNameEn: 'Computer Science',
    category: 'engineering',
    requiredSubjects: ['基础汉语', '数学', '物理'],
    recommendedSubjects: ['计算机汉语', '编程基础'],
    subjectPriorities: { 基础汉语: 1, 数学: 2, 物理: 3 },
    estimatedDays: 80,
    advice: '计算机专业需要扎实的数学基础和逻辑思维能力。建议重点学习离散数学相关知识，同时加强汉语沟通能力。',
    confidence: 'configured',
    rationale: '基于 CSCA 规则：计算机属理科方向，需物理；基础汉语+数学必考',
  },
  {
    majorName: '经济学',
    majorNameEn: 'Economics',
    category: 'social',
    requiredSubjects: ['基础汉语', '数学'],
    recommendedSubjects: ['经济汉语', '统计学基础'],
    subjectPriorities: { 基础汉语: 1, 数学: 2 },
    estimatedDays: 70,
    advice: '经济学专业对数学要求较高。建议加强微积分和统计学知识，同时提升汉语听说读写能力。',
    confidence: 'configured',
    rationale: '基于 CSCA 规则：经济属社科方向，不需物理/化学；基础汉语+数学必考',
  },
];

/** 默认兜底映射 */
export const DEFAULT_FALLBACK_MAP: MajorSubjectMap = {
  majorName: 'default',
  majorNameEn: 'Default',
  category: 'science',
  requiredSubjects: ['基础汉语', '数学', '物理'],
  recommendedSubjects: ['专业汉语'],
  subjectPriorities: { 基础汉语: 1, 数学: 2, 物理: 3 },
  estimatedDays: 80,
  advice: '根据你的专业方向，建议重点学习基础汉语和数学。制定合理的学习计划，循序渐进。',
  confidence: 'fallback',
  rationale: '默认兜底：未匹配到具体专业时使用理科方向标准组合',
};

// ===================== 查询函数 =====================

/**
 * 按专业名称查询科目映射
 * 支持中英文匹配
 */
export function getMajorSubjectMap(majorName: string): MajorSubjectMap {
  // 精确匹配中文名
  const exact = MAJOR_SUBJECT_MAP.find((m) => m.majorName === majorName);
  if (exact) return exact;

  // 精确匹配英文名
  const byEn = MAJOR_SUBJECT_MAP.find((m) => m.majorNameEn === majorName);
  if (byEn) return byEn;

  // 模糊匹配（包含关系）
  const fuzzy = MAJOR_SUBJECT_MAP.find(
    (m) => majorName.includes(m.majorName) || m.majorName.includes(majorName),
  );
  if (fuzzy) return fuzzy;

  // 按类别推断
  const categoryMap: Record<string, string> = {
    medical: '临床医学',
    engineering: '工程学',
    business: '工商管理',
    social: '经济学',
    science: '工程学',
    humanities: '工商管理',
  };
  const inferredCategory = Object.keys(categoryMap).find((cat) =>
    majorName.toLowerCase().includes(cat),
  );
  if (inferredCategory) {
    const inferred = MAJOR_SUBJECT_MAP.find((m) => m.majorName === categoryMap[inferredCategory]);
    if (inferred) return { ...inferred, majorName, majorNameEn: majorName, confidence: 'fallback' };
  }

  return DEFAULT_FALLBACK_MAP;
}

/**
 * 获取所有已配置专业
 */
export function getAllConfiguredMajors(): MajorSubjectMap[] {
  return MAJOR_SUBJECT_MAP;
}

/**
 * 检查专业是否有 documented 级别映射（有院校官方依据）
 */
export function hasDocumentedMapping(majorName: string): boolean {
  return getMajorSubjectMap(majorName).confidence === 'documented';
}

/**
 * 获取科目映射统计（用于 UI 展示配置覆盖度）
 */
export function getMappingStats(): {
  total: number;
  documented: number;
  configured: number;
  fallback: number;
} {
  return {
    total: MAJOR_SUBJECT_MAP.length,
    documented: MAJOR_SUBJECT_MAP.filter((m) => m.confidence === 'documented').length,
    configured: MAJOR_SUBJECT_MAP.filter((m) => m.confidence === 'configured').length,
    fallback: MAJOR_SUBJECT_MAP.filter((m) => m.confidence === 'fallback').length,
  };
}

/**
 * 验证科目映射与 exam-config 一致性
 * 确保所有 requiredSubjects 都在 CSCA_SUBJECTS 中（支持简称匹配，如"基础汉语"匹配"基础汉语（综合）"）
 */
export function validateSubjectMapping(): { valid: boolean; invalidSubjects: string[] } {
  const allSubjectNames = CSCA_SUBJECTS.map((s) => s.name);
  const invalidSubjects: string[] = [];

  const isSubjectValid = (subject: string): boolean => {
    // 精确匹配
    if (allSubjectNames.includes(subject)) return true;
    // 简称匹配（基础汉语 → 基础汉语（综合））
    return allSubjectNames.some((name) => name.startsWith(subject));
  };

  for (const map of MAJOR_SUBJECT_MAP) {
    for (const subject of map.requiredSubjects) {
      if (!isSubjectValid(subject)) {
        invalidSubjects.push(`${map.majorName} → ${subject}`);
      }
    }
  }

  // 检查 fallback
  for (const subject of DEFAULT_FALLBACK_MAP.requiredSubjects) {
    if (!isSubjectValid(subject)) {
      invalidSubjects.push(`fallback → ${subject}`);
    }
  }

  return {
    valid: invalidSubjects.length === 0,
    invalidSubjects,
  };
}
