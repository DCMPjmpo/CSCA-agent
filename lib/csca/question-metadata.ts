/**
 * lib/csca/question-metadata.ts
 *
 * Phase E+ 题库 metadata 标准化层
 *
 * 目标：
 *   - 为每道题补充 knowledgePoint 字段（选题粒度）
 *   - 题库无 knowledgePoint 字段时，通过 module → knowledgePoint 映射
 *   - 严格区分 metadataSource: 'native'（题库原生）vs 'mapped'（映射层推导）
 *   - 不伪造、不硬编造成分，只做映射
 *
 * 红线：
 *   - 不修改题库原始数据
 *   - 不添加题库没有的 applicableMajors（除非题库明确支持）
 *   - 映射必须记录来源
 */

import type { Question } from './question-bank';
import { getQuestionsBySubject } from './question-bank';

export type MetadataSource = 'native' | 'mapped';

/** 标准化后的题目 metadata */
export interface NormalizedMetadata {
  id: string;
  subject: string;
  /** 知识点（选题核心粒度） */
  knowledgePoint: string;
  /** 原始 module（保留兼容） */
  module?: string;
  topic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  source: Question['source'];
  type: string;
  /** knowledgePoint 来源：native=题库原生, mapped=映射层推导 */
  metadataSource: MetadataSource;
  /** 适用专业（仅当题库明确支持时填充，否则 undefined） */
  applicableMajors?: string[];
}

// ===================== module → knowledgePoint 映射层 =====================

/**
 * 化学 4 个英文大模块 → 中文知识点
 * 来源：题库 module 字段为英文，映射为中文知识点便于与 BASE_TOPICS 对齐
 * metadataSource = 'mapped'
 */
const CHEMISTRY_MODULE_MAP: Record<string, string> = {
  'Basic Chemical Concepts and Calculations': '化学基础与计量',
  'Properties and Reactions of Substances': '物质性质与反应',
  'Chemical Theories and Laws': '化学理论与定律',
  'Chemical Experiments and Applications': '化学实验与应用',
};

/**
 * 学科内 module 同义词归一化
 * 例如 "力学基础" / "力学" → "力学"
 * metadataSource = 'mapped'
 */
const MODULE_SYNONYMS: Record<string, string> = {
  力学基础: '力学',
  牛顿定律: '力学',
  功和能: '能量',
  机械能: '能量',
  物质性质: '物质',
  汉语基础知识: '基础',
};

/**
 * 从题目推导 knowledgePoint
 *
 * 规则：
 *   1. 如果 module 命中 CHEMISTRY_MODULE_MAP → 映射（mapped）
 *   2. 如果 module 命中 MODULE_SYNONYMS → 归一化（mapped）
 *   3. 否则直接使用 module 作为 knowledgePoint（native）
 *   4. 如果无 module → 使用 "其他"（native，标记无知识点）
 */
export function deriveKnowledgePoint(q: Question): {
  knowledgePoint: string;
  metadataSource: MetadataSource;
} {
  const moduleName = q.module || q.partTitle;

  if (!moduleName) {
    return { knowledgePoint: '其他', metadataSource: 'native' };
  }

  if (q.subject === '化学' && CHEMISTRY_MODULE_MAP[moduleName]) {
    return {
      knowledgePoint: CHEMISTRY_MODULE_MAP[moduleName],
      metadataSource: 'mapped',
    };
  }

  if (MODULE_SYNONYMS[moduleName]) {
    return {
      knowledgePoint: MODULE_SYNONYMS[moduleName],
      metadataSource: 'mapped',
    };
  }

  // 原生 module 直接作为 knowledgePoint
  return { knowledgePoint: moduleName, metadataSource: 'native' };
}

/**
 * 标准化单道题的 metadata
 */
export function normalizeMetadata(q: Question): NormalizedMetadata {
  const { knowledgePoint, metadataSource } = deriveKnowledgePoint(q);

  return {
    id: q.uniqueId || q.id,
    subject: q.subject,
    knowledgePoint,
    module: q.module || q.partTitle,
    difficulty: (q.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
    source: q.source || 'unknown',
    type: q.type,
    metadataSource,
    // 题库无 applicableMajors 字段，不填充
  };
}

/**
 * 获取某个科目下所有 knowledgePoint 及题目数量
 * 用于 UI 展示知识点覆盖进度
 */
export function getKnowledgePointsBySubject(subject: string): Record<string, number> {
  const questions = getQuestionsBySubject(subject);
  const result: Record<string, number> = {};
  for (const q of questions) {
    const { knowledgePoint } = deriveKnowledgePoint(q);
    result[knowledgePoint] = (result[knowledgePoint] || 0) + 1;
  }
  return result;
}

/**
 * 检查题库是否支持 applicableMajors 字段
 * 当前不支持，返回 false（诚实标注）
 */
export function supportsApplicableMajors(): boolean {
  return false;
}
