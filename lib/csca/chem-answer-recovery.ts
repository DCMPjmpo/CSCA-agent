/**
 * P4.2 化学题答案恢复 Adapter
 *
 * 问题：
 *   questions_from_txt.json 中 chem_real_001~096 共 89 道选择题有题干和选项但缺失 answer。
 *   其中 12 道 Practice 2 题目选项解析不完整（<4 个选项）。
 *
 * 根因：
 *   ETL 解析 Chemistry Practice (multiple choice questions).docx 时未提取 Answer Key。
 *   原始 txt 文件（data/cleaned_markdown/）中有两份 Answer Key（Practice 1 + Practice 2）。
 *
 * 恢复方案：
 *   在 question-bank.ts loader 层（ALL_QUESTIONS 合并后）patch 缺失的 answer 和 options。
 *   不修改原始 JSON 数据文件。
 *
 * 红线：
 *   - 不修改 questions_from_txt.json 原始数据
 *   - 不修改 Question interface
 *   - 不降低 EXAM_ELIGIBLE 标准
 *   - 不伪造答案/选项
 *   - 答案来自原始 txt 的 Answer Key，可追溯 provenance
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Question } from './question-bank';

/** 原始 txt 文件路径 */
const RAW_TXT_PATH = join(
  process.cwd(),
  'data',
  'cleaned_markdown',
  'Chemistry Practice (multiple choice questions).txt',
);

/** Practice 1 答案 Key 题号范围（lineNumber < 107） */
const PRACTICE_1_LINE_BOUNDARY = 107;

/**
 * 解析原始 txt 文件，返回两个 Answer Key
 * key1: Practice 1 (questionNumber → 'A'/'B'/'C'/'D')
 * key2: Practice 2
 */
function parseAnswerKeys(): {
  key1: Record<number, string>;
  key2: Record<number, string>;
} {
  let txt: string;
  try {
    txt = readFileSync(RAW_TXT_PATH, 'utf-8');
  } catch {
    return { key1: {}, key2: {} };
  }

  const lines = txt.split('\n');
  const ak1Start = lines.findIndex((l) => l.includes('Answer Key (48'));
  if (ak1Start < 0) return { key1: {}, key2: {} };
  const ak2SearchStart = ak1Start + 5;
  const ak2Start =
    lines.slice(ak2SearchStart).findIndex((l) => l.includes('Answer Key')) + ak2SearchStart;

  const ak1Text = lines.slice(ak1Start, ak1Start + 5).join(' ');
  const ak2Text = ak2Start >= 0 ? lines.slice(ak2Start).join(' ') : '';

  const parseKey = (t: string): Record<number, string> => {
    const r: Record<number, string> = {};
    const matches = [...t.matchAll(/(\d+)\s+([A-D])/g)];
    for (const m of matches) {
      r[parseInt(m[1])] = m[2];
    }
    return r;
  };

  return { key1: parseKey(ak1Text), key2: parseKey(ak2Text) };
}

/**
 * 从原始 txt 重新解析 Practice 2 题目的完整选项
 * 返回 questionNumber → 选项数组
 */
function parsePractice2Options(): Record<number, string[]> {
  let txt: string;
  try {
    txt = readFileSync(RAW_TXT_PATH, 'utf-8');
  } catch {
    return {};
  }

  const lines = txt.split('\n');
  const practice2Start = lines.findIndex((l) => l.trim() === 'Practice 2');
  if (practice2Start < 0) return {};

  const result: Record<number, string[]> = {};
  for (let i = practice2Start; i < lines.length; i++) {
    const line = lines[i];
    // 匹配 "15. question text... A. opt1 B. opt2 C. opt3 D. opt4"
    const qMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (!qMatch) continue;
    const qNum = parseInt(qMatch[1]);
    if (qNum < 1 || qNum > 48) continue;

    const rest = qMatch[2];
    // 提取选项 A. xxx B. xxx C. xxx D. xxx
    const optMatches = [...rest.matchAll(/([A-D])\.\s+([^A-D]+?)(?=[A-D]\.\s|$)/g)];
    if (optMatches.length >= 2) {
      result[qNum] = optMatches.map((m) => `${m[1]}. ${m[2].trim()}`);
    }
  }
  return result;
}

/**
 * Patch 化学 real_exam 题目：恢复缺失的 answer 和不完整的 options
 *
 * 规则：
 *   1. 仅处理 chem_real_* 且 source==='real_exam' 且 subject==='化学' 的题
 *   2. 根据 lineNumber 判断属于 Practice 1 还是 Practice 2
 *   3. 根据 questionNumber 从对应 Answer Key 获取答案
 *   4. 答案索引必须 < options.length，否则从原始 txt 重新解析选项
 *   5. 不修改已有 answer 的题（hasAnswer 的不覆盖）
 *   6. 返回新数组（不修改原数组）
 */
export function recoverChemAnswers(questions: Question[]): Question[] {
  const { key1, key2 } = parseAnswerKeys();
  const p2Options = parsePractice2Options();

  if (Object.keys(key1).length === 0) return questions;

  return questions.map((q) => {
    // 仅处理化学 real_exam 选择题
    if (
      q.subject !== '化学' ||
      q.source !== 'real_exam' ||
      q.type !== '选择题' ||
      !q.id.startsWith('chem_real_')
    ) {
      return q;
    }

    // 已有答案，不覆盖
    if (q.answer && q.answer.trim()) return q;

    // 无选项，无法恢复
    if (!q.options || q.options.length === 0) return q;

    const isPractice1 = q.lineNumber < PRACTICE_1_LINE_BOUNDARY;
    const answerKey = isPractice1 ? key1 : key2;
    const answer = answerKey[q.questionNumber];

    if (!answer) return q;

    const answerIdx = answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3

    // 如果答案索引在已有选项范围内，直接补 answer
    if (answerIdx < q.options.length) {
      return { ...q, answer };
    }

    // 选项不完整，尝试从原始 txt 重新解析（仅 Practice 2）
    if (!isPractice1 && p2Options[q.questionNumber]) {
      const newOptions = p2Options[q.questionNumber];
      if (answerIdx < newOptions.length) {
        return {
          ...q,
          answer,
          options: newOptions.map((v) => ({
            key: v.match(/^([A-D])\./)?.[1] || 'A',
            value: v.replace(/^[A-D]\.\s*/, ''),
          })),
        };
      }
    }

    // 无法恢复（选项仍不完整）
    return q;
  });
}
