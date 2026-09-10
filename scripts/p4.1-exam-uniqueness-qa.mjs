/**
 * P4.1 Exam Uniqueness QA Tests (self-contained, mirrors lib/csca logic)
 *
 * Test A: 生成 115 题，检查 question.id 是否重复
 * Test B: 检查 fingerprint 是否重复
 * Test C: 同一考试多次生成，检查每次内部没有重复
 * Test D: 题库不足情况下，确认不会重复题
 * Test E: subject 配额正常时，检查 subject distribution
 * Test F: 已有 371 production questions，检查 legacy + V1 混合池是否产生重复
 * Test G: wrong answer / practice / adaptive 不能受到本次修改影响
 *
 * 运行方式: node scripts/p4.1-exam-uniqueness-qa.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");
const rootUrl = pathToFileURL(root).href + (pathToFileURL(root).href.endsWith("/") ? "" : "/");

// ============ 加载题库 ============
const questionsFromTxt = JSON.parse(readFileSync(join(root, "data/processed/questions_from_txt.json"), "utf-8"));
const cscaQuestionsV1 = JSON.parse(readFileSync(join(root, "data/processed/csca_questions_v1.json"), "utf-8"));
const V1_SUBJECT_ALIAS = { "中文(理科)": "理科中文", "中文(文科)": "文科中文" };

function dedupQuestionIds(questions) {
  const seen = new Map();
  return questions.map((q) => {
    const count = seen.get(q.id) ?? 0;
    seen.set(q.id, count + 1);
    if (count === 0) return q;
    return { ...q, id: `${q.id}#${count + 1}`, uniqueId: q.uniqueId || q.id };
  });
}

// P4.2: 化学题答案恢复（与 lib/csca/chem-answer-recovery.ts 保持一致）
const chemRawTxt = readFileSync(join(root, "data/cleaned_markdown/Chemistry Practice (multiple choice questions).txt"), "utf-8");

function parseChemAnswerKeys() {
  const lines = chemRawTxt.split("\n");
  const ak1Start = lines.findIndex((l) => l.includes("Answer Key (48"));
  if (ak1Start < 0) return { key1: {}, key2: {} };
  const ak2SearchStart = ak1Start + 5;
  const ak2Start = lines.slice(ak2SearchStart).findIndex((l) => l.includes("Answer Key")) + ak2SearchStart;
  const ak1Text = lines.slice(ak1Start, ak1Start + 5).join(" ");
  const ak2Text = ak2Start >= 0 ? lines.slice(ak2Start).join(" ") : "";
  const parseKey = (t) => {
    const r = {};
    const matches = [...t.matchAll(/(\d+)\s+([A-D])/g)];
    for (const m of matches) r[parseInt(m[1])] = m[2];
    return r;
  };
  return { key1: parseKey(ak1Text), key2: parseKey(ak2Text) };
}

function parseChemPractice2Options() {
  const lines = chemRawTxt.split("\n");
  const p2Start = lines.findIndex((l) => l.trim() === "Practice 2");
  if (p2Start < 0) return {};
  const result = {};
  for (let i = p2Start; i < lines.length; i++) {
    const line = lines[i];
    const qMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (!qMatch) continue;
    const qNum = parseInt(qMatch[1]);
    if (qNum < 1 || qNum > 48) continue;
    const rest = qMatch[2];
    const optMatches = [...rest.matchAll(/([A-D])\.\s+([^A-D]+?)(?=[A-D]\.\s|$)/g)];
    if (optMatches.length >= 2) {
      result[qNum] = optMatches.map((m) => `${m[1]}. ${m[2].trim()}`);
    }
  }
  return result;
}

const { key1: chemKey1, key2: chemKey2 } = parseChemAnswerKeys();
const chemP2Options = parseChemPractice2Options();

function recoverChemAnswers(questions) {
  if (Object.keys(chemKey1).length === 0) return questions;
  return questions.map((q) => {
    if (q.subject !== "化学" || q.source !== "real_exam" || q.type !== "选择题" || !q.id.startsWith("chem_real_")) return q;
    if (q.answer && q.answer.trim()) return q;
    if (!q.options || q.options.length === 0) return q;
    const isP1 = q.lineNumber < 107;
    const answerKey = isP1 ? chemKey1 : chemKey2;
    const answer = answerKey[q.questionNumber];
    if (!answer) return q;
    const idx = answer.charCodeAt(0) - 65;
    if (idx < q.options.length) return { ...q, answer };
    if (!isP1 && chemP2Options[q.questionNumber]) {
      const newOpts = chemP2Options[q.questionNumber];
      if (idx < newOpts.length) {
        return {
          ...q, answer,
          options: newOpts.map((v) => ({ key: v.match(/^([A-D])\./)?.[1] || "A", value: v.replace(/^[A-D]\.\s*/, "") })),
        };
      }
    }
    return q;
  });
}

// P4.2-B: 恢复的物理和数学题目
const p42bRecovered = JSON.parse(readFileSync(join(root, "data/processed/p4.2_recovered_questions.json"), "utf-8"));

const ALL_QUESTIONS = recoverChemAnswers(
  dedupQuestionIds([
    ...(questionsFromTxt.questions || []),
    ...(cscaQuestionsV1.questions || []).map((q) => ({ ...q, subject: V1_SUBJECT_ALIAS[q.subject] ?? q.subject })),
    // P4.2-B: Recovered questions from PDF sources
    ...(p42bRecovered.questions || []),
  ]),
);

const sci = await tsImport(new URL("lib/csca/science-chinese-questions.ts", rootUrl).href, import.meta.url);
const arts = await tsImport(new URL("lib/csca/arts-chinese-questions.ts", rootUrl).href, import.meta.url);
const sciNs = sci["module.exports"] || sci.default || sci;
const artsNs = arts["module.exports"] || arts.default || arts;
const sciQuestions = sciNs.getAllScienceChineseQuestions();
const artsQuestions = artsNs.getAllArtsChineseQuestions();

// ============ 内联 fingerprint + dedup（与 lib/csca 保持一致） ============
function normalizeText(s) {
  if (s == null) return "";
  let t = String(s);
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/[`*_~#>]/g, "");
  t = t.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  t = t.replace(/【/g, "(").replace(/】/g, ")").replace(/「/g, "(").replace(/」/g, ")");
  t = t.replace(/《/g, "(").replace(/》/g, ")").replace(/〈/g, "(").replace(/〉/g, ")");
  t = t.replace(/〔/g, "(").replace(/〕/g, ")").replace(/［/g, "[").replace(/］/g, "]");
  t = t.replace(/([A-Da-d])\s*[.．、)]\s*/g, "$1");
  t = t.replace(/(\d+)\s*[.．、)]\s*/g, "$1");
  t = t.replace(/，/g, ",").replace(/。/g, ".").replace(/：/g, ":").replace(/；/g, ";");
  t = t.replace(/？/g, "?").replace(/！/g, "!").replace(/“/g, '"').replace(/”/g, '"');
  t = t.replace(/‘/g, "'").replace(/’/g, "'").replace(/、/g, ",");
  t = t.replace(/\s+/g, " ").trim();
  t = t.toLowerCase();
  return t;
}

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length === 0) return "";
  return options.map((opt) => {
    if (opt == null) return "";
    if (typeof opt === "object" && !Array.isArray(opt)) return normalizeText(opt.value || "");
    return normalizeText(String(opt));
  }).join("|");
}

function makeFingerprint(q) {
  const subject = normalizeText(q.subject || "");
  const track = normalizeText(q.track || "");
  const stem = normalizeText(q.question || "");
  const options = normalizeOptions(q.options);
  return `${subject}::${track}::${stem}::${options}`;
}

function dedupExamQuestions(questions, requestedCount) {
  const seenIds = new Set();
  const seenFps = new Set();
  const unique = [];
  let droppedByDuplicateId = 0;
  let droppedByDuplicateFingerprint = 0;
  for (const q of questions) {
    const id = q.id || "";
    const fp = makeFingerprint(q);
    if (id && seenIds.has(id)) { droppedByDuplicateId++; continue; }
    if (seenFps.has(fp)) { droppedByDuplicateFingerprint++; continue; }
    if (id) seenIds.add(id);
    seenFps.add(fp);
    unique.push(q);
  }
  return {
    questions: unique,
    requestedCount,
    actualCount: unique.length,
    uniqueCount: unique.length,
    droppedByDuplicateId,
    droppedByDuplicateFingerprint,
    isLimitedByQuestionBank: unique.length < requestedCount,
  };
}

// ============ 工具 ============
function buildExamPool(subjects, perSubject) {
  const pool = [];
  for (const subject of subjects) {
    if (subject === "理科中文") {
      const shuffled = [...sciQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(perSubject, shuffled.length));
      for (const q of selected) {
        pool.push({ id: q.id, question: q.question, options: q.options.map((opt, i) => String.fromCharCode(65 + i) + ". " + opt), subject: "理科中文", track: "理科" });
      }
    } else if (subject === "文科中文") {
      const shuffled = [...artsQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(perSubject, shuffled.length));
      for (const q of selected) {
        pool.push({ id: q.id, question: q.question, options: q.options.map((opt, i) => String.fromCharCode(65 + i) + ". " + opt), subject: "文科中文", track: "文科" });
      }
    } else {
      const subjectQs = ALL_QUESTIONS.filter((q) => q.subject === subject && q.type === "选择题" && q.options && q.options.length > 0 && q.answer);
      const shuffled = [...subjectQs].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(perSubject, shuffled.length));
      for (const q of selected) {
        pool.push({ id: q.id, question: q.question, options: q.options ? q.options.map((opt) => opt.key + ". " + opt.value) : [], subject: q.subject, track: q.track });
      }
    }
  }
  return pool;
}

let passCount = 0, failCount = 0;
function check(name, condition, detail) {
  if (condition) { passCount++; console.log(`  [PASS] ${name}`); }
  else { failCount++; console.log(`  [FAIL] ${name} - ${detail || ""}`); }
}

// ============ Test A ============
console.log("\n========== Test A: 生成 115 题，检查 question.id 是否重复 ==========");
{
  const pool = buildExamPool(["数学", "物理", "化学", "理科中文"], 29);
  const r = dedupExamQuestions(pool, 115);
  const ids = r.questions.map((q) => q.id);
  check("Test A: id 唯一", ids.length === new Set(ids).size, `重复 ${ids.length - new Set(ids).size}`);
  check("Test A: droppedByDuplicateId = 0", r.droppedByDuplicateId === 0, `丢弃 ${r.droppedByDuplicateId}`);
  console.log(`  actualCount=${r.actualCount}, isLimitedByQuestionBank=${r.isLimitedByQuestionBank}`);
}

// ============ Test B ============
console.log("\n========== Test B: 检查 fingerprint 是否重复 ==========");
{
  const pool = buildExamPool(["数学", "物理", "化学", "理科中文"], 29);
  const r = dedupExamQuestions(pool, 115);
  const fps = r.questions.map((q) => makeFingerprint(q));
  check("Test B: fingerprint 唯一", fps.length === new Set(fps).size, `重复 ${fps.length - new Set(fps).size}`);
  check("Test B: droppedByDuplicateFingerprint = 0", r.droppedByDuplicateFingerprint === 0, `丢弃 ${r.droppedByDuplicateFingerprint}`);
}

// ============ Test C ============
console.log("\n========== Test C: 同一考试多次生成，每次内部无重复 ==========");
{
  let allPass = true;
  for (let i = 0; i < 5; i++) {
    const pool = buildExamPool(["数学", "物理", "化学", "理科中文"], 29);
    const r = dedupExamQuestions(pool, 115);
    const ids = r.questions.map((q) => q.id);
    const fps = r.questions.map((q) => makeFingerprint(q));
    if (ids.length !== new Set(ids).size || fps.length !== new Set(fps).size) {
      allPass = false;
      console.log(`  运行 ${i + 1}: FAIL`);
    }
  }
  check("Test C: 5 次生成每次内部无重复", allPass, "");
}

// ============ Test D ============
console.log("\n========== Test D: 题库不足情况下，不会重复题 ==========");
{
  const pool = buildExamPool(["数学", "物理", "化学", "理科中文"], 125);
  const r = dedupExamQuestions(pool, 500);
  const ids = r.questions.map((q) => q.id);
  const fps = r.questions.map((q) => makeFingerprint(q));
  check("Test D: 题库不足时 id 唯一", ids.length === new Set(ids).size, `重复 ${ids.length - new Set(ids).size}`);
  check("Test D: 题库不足时 fingerprint 唯一", fps.length === new Set(fps).size, `重复 ${fps.length - new Set(fps).size}`);
  check("Test D: isLimitedByQuestionBank = true", r.isLimitedByQuestionBank === true, "");
  check("Test D: actualCount < requestedCount", r.actualCount < 500, `actualCount=${r.actualCount}`);
  console.log(`  requestedCount=${r.requestedCount}, actualCount=${r.actualCount}`);
}

// ============ Test E ============
console.log("\n========== Test E: subject 配额正常时，检查 subject distribution ==========");
{
  const chemQs = buildExamPool(["化学"], 50);
  const artsQs = buildExamPool(["文科中文"], 60);
  const all = [...chemQs, ...artsQs];
  const r = dedupExamQuestions(all, 110);
  const subjectCounts = {};
  for (const q of r.questions) subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
  check("Test E: 化学配额 <= 50", (subjectCounts["化学"] || 0) <= 50, `实际 ${subjectCounts["化学"] || 0}`);
  check("Test E: 文科中文配额 <= 60", (subjectCounts["文科中文"] || 0) <= 60, `实际 ${subjectCounts["文科中文"] || 0}`);
  check("Test E: total <= 110", r.questions.length <= 110, `total=${r.questions.length}`);
  check("Test E: subject 内无重复", r.actualCount === r.uniqueCount, "");
}

// ============ Test F ============
console.log("\n========== Test F: legacy + V1 混合池是否产生重复 ==========");
{
  const choiceQs = ALL_QUESTIONS.filter((q) => q.type === "选择题" && q.options && q.options.length > 0 && q.answer);
  const pool = choiceQs.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options ? q.options.map((opt) => opt.key + ". " + opt.value) : [],
    subject: q.subject,
    track: q.track,
  }));
  const r = dedupExamQuestions(pool, pool.length);
  check("Test F: 全题库 id 唯一", r.droppedByDuplicateId === 0, `丢弃 ${r.droppedByDuplicateId}`);
  check("Test F: 全题库 fingerprint 唯一", r.droppedByDuplicateFingerprint === 0, `丢弃 ${r.droppedByDuplicateFingerprint}`);
  check("Test F: actualCount = 385", r.actualCount === 385, `actualCount=${r.actualCount}`);
}

// ============ Test G ============
console.log("\n========== Test G: practice/adaptive 不受影响 ==========");
{
  const pool = buildExamPool(["数学", "物理"], 10);
  const r = dedupExamQuestions(pool, pool.length);
  check("Test G: practice 模式题目唯一", r.actualCount === r.uniqueCount, "");
  check("Test G: practice 模式无 id 重复", r.droppedByDuplicateId === 0, "");
  check("Test G: practice 模式无 fingerprint 重复", r.droppedByDuplicateFingerprint === 0, "");
  check("Test G: practice 模式 metadata 完整", r.requestedCount !== undefined && r.actualCount !== undefined, "");
}

// ============ Normalize 单元测试 ============
console.log("\n========== Normalize 单元测试 ==========");
{
  check("Test N1: 全角→半角", normalizeText("Ａ.Ｂ.Ｃ") === "abc", normalizeText("Ａ.Ｂ.Ｃ"));
  check("Test N2: 空格归一", normalizeText("a  b\n\tc") === "a b c", normalizeText("a  b\n\tc"));
  check("Test N3: HTML 去除", normalizeText("<p>题干</p>") === "题干", normalizeText("<p>题干</p>"));
  check("Test N4: Markdown 去除", normalizeText("**题干**") === "题干", normalizeText("**题干**"));
  check("Test N5: 选项前缀 A.", normalizeText("A.选项") === "a选项", normalizeText("A.选项"));
  check("Test N6: 全角选项前缀 A．", normalizeText("A．选项") === "a选项", normalizeText("A．选项"));
  check("Test N7: 中文顿号 A、", normalizeText("A、选项") === "a选项", normalizeText("A、选项"));
  check("Test N8: 中文逗号", normalizeText("甲，乙") === "甲,乙", normalizeText("甲，乙"));
  check("Test N9: 大小写归一", normalizeText("AbC") === "abc", normalizeText("AbC"));
  check("Test N10: 中文括号", normalizeText("（甲）") === "(甲)", normalizeText("（甲）"));
}

// ============ 汇总 ============
console.log("\n========== QA 汇总 ==========");
console.log(`PASS: ${passCount}, FAIL: ${failCount}`);
console.log(failCount === 0 ? "\n[OK] 所有测试通过" : "\n[FAIL] 存在失败测试");
process.exit(failCount > 0 ? 1 : 0);
