/**
 * P4.1 Question Fingerprint Adapter
 *
 * 稳定的 adapter-level question fingerprint，不依赖 question.id。
 * 用于考试组卷硬去重：完全相同的题目必须得到相同 fingerprint。
 *
 * 红线：
 *   - 不修改 Question interface
 *   - 不修改原始题库数据
 *   - 保留原始 question.id
 *   - normalize 处理全角/半角、空格、换行、HTML、Markdown、标点差异、
 *     选项格式差异（A./A．/A、/A)）、大小写、中文/英文括号
 *
 * 使用场景：
 *   - exam-dedup.ts 组卷后硬去重
 *   - 跨源题库重复检测（question-bank vs science-chinese vs MOCK_QUESTIONS）
 *   - AnswerHistory 累积去重
 */

/** 题目指纹输入（兼容 question-bank Question / science-chinese / arts-chinese / MOCK_QUESTIONS） */
export interface FingerprintInput {
  subject?: string;
  track?: string;
  question?: string;
  options?: Array<{ key?: string; value: string } | string> | string[];
}

/**
 * 文本归一化：处理全角/半角、空格、换行、HTML、Markdown、标点差异、大小写
 */
export function normalizeText(s: unknown): string {
  if (s == null) return '';
  let t = String(s);

  // 1. HTML 标签
  t = t.replace(/<[^>]+>/g, '');

  // 2. Markdown 常见标记（` * _ ~ # >）
  t = t.replace(/[`*_~#>]/g, '');

  // 3. 全角→半角（U+FF01..U+FF5E → U+0021..U+007E）
  t = t.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));

  // 4. 中文括号 → 英文括号
  t = t
    .replace(/【/g, '(')
    .replace(/】/g, ')')
    .replace(/「/g, '(')
    .replace(/」/g, ')')
    .replace(/《/g, '(')
    .replace(/》/g, ')')
    .replace(/〈/g, '(')
    .replace(/〉/g, ')')
    .replace(/〔/g, '(')
    .replace(/〕/g, ')')
    .replace(/［/g, '[')
    .replace(/］/g, ']');

  // 5. 选项前缀格式统一：A. / A． / A、 / A) / a. / a) → A
  //    序号统一：1. / 1． / 1、 / 1) → 1
  t = t.replace(/([A-Da-d])\s*[.．、)]\s*/g, '$1');
  t = t.replace(/(\d+)\s*[.．、)]\s*/g, '$1');

  // 6. 标点差异归一（中文标点 → 英文标点）
  t = t
    .replace(/，/g, ',')
    .replace(/。/g, '.')
    .replace(/：/g, ':')
    .replace(/；/g, ';')
    .replace(/？/g, '?')
    .replace(/！/g, '!')
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/‘/g, "'")
    .replace(/’/g, "'")
    .replace(/、/g, ',');

  // 7. 空白归一（换行/制表符/连续空格 → 单空格）
  t = t.replace(/\s+/g, ' ').trim();

  // 8. 大小写归一（指纹比对统一小写）
  t = t.toLowerCase();

  return t;
}

/**
 * 选项数组归一化（兼容 {key,value} 对象和纯字符串）
 */
export function normalizeOptions(options: FingerprintInput['options']): string {
  if (!Array.isArray(options) || options.length === 0) return '';
  return options
    .map((opt) => {
      if (opt == null) return '';
      if (typeof opt === 'object' && !Array.isArray(opt)) {
        return normalizeText((opt as { value: string }).value || '');
      }
      return normalizeText(String(opt));
    })
    .join('|');
}

/**
 * 完整指纹：subject :: track :: stem :: options
 * 完全相同的题目（含选项）必须得到相同 fingerprint。
 */
export function makeFingerprint(q: FingerprintInput): string {
  const subject = normalizeText(q.subject || '');
  const track = normalizeText(q.track || '');
  const stem = normalizeText(q.question || '');
  const options = normalizeOptions(q.options);
  return `${subject}::${track}::${stem}::${options}`;
}

/**
 * 题干指纹：subject :: stem（不含 options/track）
 * 用于检测"不同 ID 但题干相同"的高度重复。
 */
export function makeStemFingerprint(q: FingerprintInput): string {
  const subject = normalizeText(q.subject || '');
  const stem = normalizeText(q.question || '');
  return `${subject}::${stem}`;
}
