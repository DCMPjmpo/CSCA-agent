// 南洋出海局 · 8 位幕僚文案库验证（批次 12）
// 1) brand/advisors-content.json：可解析、8 位齐全、字段非空、
//    catchphrases≥5 / welcomes=3 / taskDone=5、各库无重复句
// 2) meta.supportedLocales 与 lib/i18n/locales/*.json 一一对应
// 3) （需 tsx loader）getTranslation 深合并继承：任意语言 t.advisors 可用，
//    zheng-he.welcomes[0] === common.welcome
// 用法：node --import tsx scripts/advisors-content-check.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const JSON_PATH = join(ROOT, 'brand', 'advisors-content.json');
const LOCALES_DIR = join(ROOT, 'lib', 'i18n', 'locales');
const EXPECTED_IDS = [
  'zheng-he',
  'ma-huan',
  'wang-jinghong',
  'fei-xin',
  'hong-bao',
  'hou-xian',
  'zhang-da',
  'li-bin',
];

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

/* ================= 1. JSON 结构 ================= */
console.log('========== brand/advisors-content.json 结构 ==========');
let content;
try {
  content = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  check('JSON 可解析', true);
} catch (e) {
  check('JSON 可解析', false, `(parse error: ${e.message})`);
  process.exit(1);
}

check(
  'meta.schema 存在',
  content.meta?.schema === 'advisors-content@1',
  JSON.stringify(content.meta?.schema),
);

const advisors = content.advisors ?? {};
check(`8 位幕僚（实测 ${Object.keys(advisors).length}）`, Object.keys(advisors).length === 8);
check(
  `顺序 = ${EXPECTED_IDS.join(',')}`,
  JSON.stringify(Object.keys(advisors)) === JSON.stringify(EXPECTED_IDS),
  `(实测 ${Object.keys(advisors).join(',')})`,
);

const LIBRARY_SIZES = { catchphrases: [5, Infinity], welcomes: [3, 3], taskDone: [5, 5] };
for (const id of EXPECTED_IDS) {
  const a = advisors[id];
  check(`${id} 存在`, !!a, `(missing ${id})`);
  if (!a) continue;
  check(`${id}.id 与 key 一致`, a.id === id, `(id=${a.id})`);
  for (const f of ['name', 'role', 'dialogueStyle', 'persona']) {
    check(
      `${id}.${f} 非空`,
      typeof a[f] === 'string' && a[f].trim().length > 0,
      `(length=${String(a[f]).length})`,
    );
  }
  for (const [lib, [min, max]] of Object.entries(LIBRARY_SIZES)) {
    const arr = a[lib];
    const n = Array.isArray(arr) ? arr.length : 0;
    check(
      `${id}.${lib} 数量 ${min}≤n≤${max}（实测 ${n}）`,
      Array.isArray(arr) && n >= min && n <= max,
      `(length=${n})`,
    );
    check(
      `${id}.${lib} 无空句`,
      Array.isArray(arr) && arr.every((s) => typeof s === 'string' && s.trim().length > 0),
    );
    check(
      `${id}.${lib} 无重复句`,
      Array.isArray(arr) && new Set(arr).size === arr.length,
      `(dup=${Array.isArray(arr) && arr.filter((s, i) => arr.indexOf(s) !== i).join(' / ')})`,
    );
  }
}

/* ================= 2. supportedLocales ↔ locales 目录 ================= */
console.log('\n========== supportedLocales 映射 ==========');
const localeFiles = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();
const supported = [...(content.meta?.supportedLocales ?? [])].sort();
check(
  `supportedLocales 覆盖 11 个 classroom locale（${localeFiles.length}）`,
  JSON.stringify(supported) === JSON.stringify(localeFiles),
  `\n  缺失: ${localeFiles.filter((l) => !supported.includes(l)).join(',') || '无'}\n  多余: ${supported.filter((l) => !localeFiles.includes(l)).join(',') || '无'}`,
);
check(
  'locales 块含全部 11 个覆盖位',
  Object.keys(content.locales ?? {})
    .sort()
    .join(',') === localeFiles.sort().join(','),
);

/* ================= 3. i18n 深合并继承（tsx loader） ================= */
console.log('\n========== translations.ts 继承（需 node --import tsx） ==========');
try {
  const m = await import('../lib/i18n/translations.ts');
  // tsx CJS-interop：import() 返回 { default, module.exports }，导出经 .default 取
  const mod = m.default ?? m;
  const { getTranslation } = mod;
  check('getTranslation 可导入', typeof getTranslation === 'function');
  for (const locale of ['zh', 'en', 'th', 'vi', 'id', 'ms', 'tl']) {
    const t = getTranslation(locale);
    const z = t.advisors?.['zheng-he'];
    const total = t.advisors ? Object.keys(t.advisors).length : 0;
    check(
      `${locale} 经 deepMerge 继承 advisors（8 位，郑和 catchphrases=${z?.catchphrases?.length ?? '?'}）`,
      !!z && z.catchphrases.length >= 5 && total === 8,
      `(total=${total})`,
    );
  }
  const t0 = getTranslation('zh');
  check(
    'zheng-he.welcomes[0] === common.welcome（系统欢迎语一致性）',
    t0.advisors?.['zheng-he']?.welcomes?.[0] === t0.common.welcome,
  );
} catch (e) {
  check('tsx 继承实测（需以 node --import tsx 运行）', false, `(import failed: ${e.message})`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
