/**
 * P4.1 Exam Dedup Adapter
 *
 * 考试组卷硬去重 adapter —— 在题目生成后、返回前端前执行唯一性校验。
 *
 * 硬去重规则：
 *   1. question.id unique（ID 唯一）
 *   2. fingerprint unique（内容指纹唯一）
 *
 * 如果发现重复：
 *   - 丢弃重复项
 *   - 不从候选池补充（候选池已在前置步骤耗尽时）
 *   - 如实返回实际唯一数量
 *
 * 红线：
 *   - 不为了凑够目标数而重复使用同一道题
 *   - 不生成 fake question
 *   - 不改几个标点制造假题
 *   - 不扩充题库
 *   - 不破坏已有 API response 字段（仅 additive metadata）
 *
 * 与 Selector 关系：
 *   - 不修改 question-selection.ts 的 scoreCandidate / buildBlueprint 核心
 *   - 作为 Selector 之后的"出口保障层"
 */

import { makeFingerprint, type FingerprintInput } from './question-fingerprint';

/** 通用考试题目（兼容 question-bank / science-chinese / arts-chinese / MOCK_QUESTIONS） */
export interface DedupQuestion extends FingerprintInput {
  id: string;
  [key: string]: unknown;
}

/** 去重结果 */
export interface DedupResult<T extends DedupQuestion = DedupQuestion> {
  /** 去重后的题目（保留首次出现，丢弃后续重复） */
  questions: T[];
  /** 请求的目标数量 */
  requestedCount: number;
  /** 实际返回的题目数 */
  actualCount: number;
  /** 去重后的唯一题数（等于 actualCount） */
  uniqueCount: number;
  /** 因 ID 重复被丢弃的数量 */
  droppedByDuplicateId: number;
  /** 因 fingerprint 重复被丢弃的数量 */
  droppedByDuplicateFingerprint: number;
  /** 题库是否限制了最终数量（actualCount < requestedCount） */
  isLimitedByQuestionBank: boolean;
  /** 被丢弃的题目（用于日志/QA） */
  droppedSamples: Array<{
    id: string;
    reason: 'duplicate_id' | 'duplicate_fingerprint';
    conflictWithId: string;
    fingerprint: string;
  }>;
}

/**
 * 硬去重：按 id unique + fingerprint unique 双重校验
 *
 * @param questions 待去重的题目列表（可能来自多源合并）
 * @param requestedCount 请求的目标数量（用于计算 isLimitedByQuestionBank）
 * @returns DedupResult（含去重后题目 + metadata）
 */
export function dedupExamQuestions<T extends DedupQuestion = DedupQuestion>(
  questions: T[],
  requestedCount: number,
): DedupResult<T> {
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const unique: T[] = [];
  const droppedSamples: DedupResult['droppedSamples'] = [];

  for (const q of questions) {
    const id = q.id || '';
    const fp = makeFingerprint(q);

    // 1. ID 重复校验
    if (id && seenIds.has(id)) {
      droppedSamples.push({
        id,
        reason: 'duplicate_id',
        conflictWithId: id,
        fingerprint: fp,
      });
      continue;
    }

    // 2. Fingerprint 重复校验（内容相同但 ID 不同）
    if (seenFingerprints.has(fp)) {
      // 找到冲突的题目 id
      const conflict = unique.find((u) => makeFingerprint(u) === fp);
      droppedSamples.push({
        id,
        reason: 'duplicate_fingerprint',
        conflictWithId: conflict?.id || '',
        fingerprint: fp,
      });
      continue;
    }

    // 通过双重校验，加入唯一集
    if (id) seenIds.add(id);
    seenFingerprints.add(fp);
    unique.push(q);
  }

  const droppedByDuplicateId = droppedSamples.filter((s) => s.reason === 'duplicate_id').length;
  const droppedByDuplicateFingerprint = droppedSamples.filter(
    (s) => s.reason === 'duplicate_fingerprint',
  ).length;
  const actualCount = unique.length;
  const isLimitedByQuestionBank = actualCount < requestedCount;

  return {
    questions: unique,
    requestedCount,
    actualCount,
    uniqueCount: actualCount,
    droppedByDuplicateId,
    droppedByDuplicateFingerprint,
    isLimitedByQuestionBank,
    droppedSamples: droppedSamples.slice(0, 20), // 限制日志量
  };
}

/**
 * Subject blueprint 合法性去重
 *
 * 流程：
 *   1. subject 内先去重（id + fingerprint）
 *   2. subject 内取 min(perSubjectBlueprint, uniqueCount) 道
 *   3. 全局再检查 fingerprint（防止跨科目重复，虽然题库层面已无跨科目重复）
 *   4. 某科目唯一题不足时，允许该科目实际数量下降，但不从其他科目重复题补进去
 *
 * @param subjectBuckets 各科目的题目分桶 + blueprint 配额
 * @returns 各科目去重后题目 + 聚合 metadata
 */
export interface SubjectBucket<T extends DedupQuestion = DedupQuestion> {
  subject: string;
  blueprint: number;
  questions: T[];
}

export interface SubjectDedupResult<T extends DedupQuestion = DedupQuestion> {
  questions: T[];
  perSubject: Array<{
    subject: string;
    requestedBlueprint: number;
    actualCount: number;
    uniqueCount: number;
    limited: boolean;
  }>;
  requestedCount: number;
  actualCount: number;
  uniqueCount: number;
  isLimitedByQuestionBank: boolean;
}

export function dedupBySubjectBlueprint<T extends DedupQuestion = DedupQuestion>(
  buckets: SubjectBucket<T>[],
  totalRequestedCount: number,
): SubjectDedupResult<T> {
  const perSubject: SubjectDedupResult['perSubject'] = [];
  const globalFingerprints = new Set<string>();
  const allUnique: T[] = [];

  for (const bucket of buckets) {
    // subject 内先去重
    const deduped = dedupExamQuestions<T>(bucket.questions, bucket.blueprint);

    // subject 内取 min(blueprint, uniqueCount)
    const taken = deduped.questions.slice(0, Math.min(bucket.blueprint, deduped.questions.length));

    perSubject.push({
      subject: bucket.subject,
      requestedBlueprint: bucket.blueprint,
      actualCount: taken.length,
      uniqueCount: deduped.questions.length,
      limited: deduped.questions.length < bucket.blueprint,
    });

    // 全局再检查 fingerprint（跨科目重复防护）
    for (const q of taken) {
      const fp = makeFingerprint(q);
      if (!globalFingerprints.has(fp)) {
        globalFingerprints.add(fp);
        allUnique.push(q);
      }
      // 跨科目重复则丢弃（题库层面已无此情况，但作为保障）
    }
  }

  const actualCount = allUnique.length;
  return {
    questions: allUnique,
    perSubject,
    requestedCount: totalRequestedCount,
    actualCount,
    uniqueCount: actualCount,
    isLimitedByQuestionBank: actualCount < totalRequestedCount,
  };
}
