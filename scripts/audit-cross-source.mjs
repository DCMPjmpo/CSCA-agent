/**
 * P4.1 跨源去重审计：检查 MOCK_QUESTIONS / science-chinese / arts-chinese
 * 与 question-bank 之间的内容重复。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tsImport } from "tsx/esm/api";
import { pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");
const rootUrl = pathToFileURL(root).href + (pathToFileURL(root).href.endsWith("/") ? "" : "/");
console.error("DEBUG root=", root, "rootUrl=", rootUrl);

const questionsFromTxt = JSON.parse(
  readFileSync(join(root, "data/processed/questions_from_txt.json"), "utf-8")
);
const cscaQuestionsV1 = JSON.parse(
  readFileSync(join(root, "data/processed/csca_questions_v1.json"), "utf-8")
);

const V1_SUBJECT_ALIAS = {
  "中文(理科)": "理科中文",
  "中文(文科)": "文科中文",
};

function dedupQuestionIds(questions) {
  const seen = new Map();
  return questions.map((q) => {
    const count = seen.get(q.id) ?? 0;
    seen.set(q.id, count + 1);
    if (count === 0) return q;
    const runtimeId = `${q.id}#${count + 1}`;
    return { ...q, id: runtimeId, uniqueId: q.uniqueId || q.id };
  });
}

const ALL_QUESTIONS = dedupQuestionIds([
  ...(questionsFromTxt.questions || []),
  ...(cscaQuestionsV1.questions || []).map((q) => ({
    ...q,
    subject: V1_SUBJECT_ALIAS[q.subject] ?? q.subject,
  })),
]);

const sci = await tsImport(new URL("lib/csca/science-chinese-questions.ts", rootUrl).href, import.meta.url);
const arts = await tsImport(new URL("lib/csca/arts-chinese-questions.ts", rootUrl).href, import.meta.url);
const sciNs = sci["module.exports"] || sci.default || sci;
const artsNs = arts["module.exports"] || arts.default || arts;
console.error("DEBUG sciNs keys=", Object.keys(sciNs).slice(0, 10));
const sciQuestions = sciNs.getAllScienceChineseQuestions();
const artsQuestions = artsNs.getAllArtsChineseQuestions();

const routeSrc = readFileSync(join(root, "app/api/csca/mock-exam/route.ts"), "utf-8");
const mockStartIdx = routeSrc.indexOf("const MOCK_QUESTIONS");
const objStart = routeSrc.indexOf("{", mockStartIdx);
let depth = 0, mockEndIdx = objStart;
for (let i = objStart; i < routeSrc.length; i++) {
  const ch = routeSrc[i];
  if (ch === "{") depth++;
  else if (ch === "}") { depth--; if (depth === 0) { mockEndIdx = i + 1; break; } }
}
const mockObjSrc = routeSrc.slice(objStart, mockEndIdx);
const MOCK_QUESTIONS = eval(`(${mockObjSrc})`);

function normalizeText(s) {
  if (s == null) return "";
  let t = String(s);
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/[`*_~#>]/g, "");
  t = t.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  t = t.replace(/【/g, "(").replace(/】/g, ")").replace(/「/g, "(").replace(/」/g, ")");
  t = t.replace(/《/g, "(").replace(/》/g, ")").replace(/〈/g, "(").replace(/〉/g, ")");
  t = t.replace(/([A-Da-d])\s*[.．、)]\s*/g, "$1");
  t = t.replace(/(\d+)\s*[.．、)]\s*/g, "$1");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/，/g, ",").replace(/。/g, ".").replace(/：/g, ":").replace(/；/g, ";");
  t = t.replace(/？/g, "?").replace(/！/g, "!");
  t = t.toLowerCase();
  return t;
}

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length === 0) return "";
  return options.map((opt) => {
    if (opt == null) return "";
    if (typeof opt === "object") return normalizeText(opt.value || "");
    return normalizeText(String(opt));
  }).join("|");
}

function makeFingerprint(q) {
  const subject = normalizeText(q.subject || "");
  const stem = normalizeText(q.question || "");
  const options = normalizeOptions(q.options);
  return `${subject}::${stem}::${options}`;
}

const bankChoice = ALL_QUESTIONS.filter(
  (q) => q.type === "选择题" && Array.isArray(q.options) && q.options.length > 0 && q.answer
);
const bankFpSet = new Map();
for (const q of bankChoice) {
  const fp = makeFingerprint(q);
  bankFpSet.set(fp, { id: q.id, subject: q.subject, source: q.source || "unknown" });
}

const sciFpList = sciQuestions.map((q) => ({
  fp: makeFingerprint({ ...q, subject: "理科中文" }),
  id: q.id,
  question: q.question,
}));

const artsFpList = artsQuestions.map((q) => ({
  fp: makeFingerprint({ ...q, subject: "文科中文" }),
  id: q.id,
  question: q.question,
}));

const mockList = [];
for (const [subject, arr] of Object.entries(MOCK_QUESTIONS)) {
  for (const q of arr) {
    mockList.push({
      fp: makeFingerprint({ ...q, subject }),
      id: q.id,
      subject,
      question: q.question,
    });
  }
}

console.log("========== P4.1 跨源去重审计 ==========\n");
console.log("[A: question-bank 选择题]", bankFpSet.size);
console.log("[B: science-chinese-questions.ts]", sciFpList.length);
console.log("[C: arts-chinese-questions.ts]", artsFpList.length);
console.log("[D: MOCK_QUESTIONS (route.ts)]", mockList.length, "\n");

console.log("[B vs A: 理科中文内置 vs question-bank]");
let bVsA = 0;
for (const item of sciFpList) {
  if (bankFpSet.has(item.fp)) {
    bVsA++;
    if (bVsA <= 5) {
      const bank = bankFpSet.get(item.fp);
      console.log(`  重复: sci.id=${item.id} <-> bank.id=${bank.id} | subject=${bank.subject}`);
      console.log(`    stem="${(item.question || "").slice(0, 60)}"`);
    }
  }
}
console.log(`  理科中文 cross-source 重复: ${bVsA}/${sciFpList.length}\n`);

console.log("[C vs A: 文科中文内置 vs question-bank]");
let cVsA = 0;
for (const item of artsFpList) {
  if (bankFpSet.has(item.fp)) {
    cVsA++;
    if (cVsA <= 5) {
      const bank = bankFpSet.get(item.fp);
      console.log(`  重复: arts.id=${item.id} <-> bank.id=${bank.id} | subject=${bank.subject}`);
      console.log(`    stem="${(item.question || "").slice(0, 60)}"`);
    }
  }
}
console.log(`  文科中文 cross-source 重复: ${cVsA}/${artsFpList.length}\n`);

console.log("[D vs A: MOCK_QUESTIONS vs question-bank]");
let dVsA = 0;
for (const item of mockList) {
  if (bankFpSet.has(item.fp)) {
    dVsA++;
    if (dVsA <= 10) {
      const bank = bankFpSet.get(item.fp);
      console.log(`  重复: mock.id=${item.id} (${item.subject}) <-> bank.id=${bank.id} (subject=${bank.subject})`);
      console.log(`    stem="${(item.question || "").slice(0, 60)}"`);
    }
  }
}
console.log(`  MOCK_QUESTIONS cross-source 重复: ${dVsA}/${mockList.length}\n`);

const sciFpSet = new Set(sciFpList.map((x) => x.fp));
const artsFpSet = new Set(artsFpList.map((x) => x.fp));
let dVsB = 0, dVsC = 0;
for (const item of mockList) {
  if (sciFpSet.has(item.fp)) dVsB++;
  if (artsFpSet.has(item.fp)) dVsC++;
}
console.log("[D vs B/C: MOCK vs 内置]");
console.log(`  MOCK vs science-chinese: ${dVsB}`);
console.log(`  MOCK vs arts-chinese: ${dVsC}\n`);

const bInternal = new Map();
for (const x of sciFpList) bInternal.set(x.fp, (bInternal.get(x.fp) || 0) + 1);
console.log("[B 内部重复组]", Array.from(bInternal.values()).filter((c) => c > 1).length);

const cInternal = new Map();
for (const x of artsFpList) cInternal.set(x.fp, (cInternal.get(x.fp) || 0) + 1);
console.log("[C 内部重复组]", Array.from(cInternal.values()).filter((c) => c > 1).length);

const dInternal = new Map();
for (const x of mockList) dInternal.set(x.fp, (dInternal.get(x.fp) || 0) + 1);
console.log("[D 内部重复组]", Array.from(dInternal.values()).filter((c) => c > 1).length);

console.log("\n========== 跨源审计结束 ==========");
