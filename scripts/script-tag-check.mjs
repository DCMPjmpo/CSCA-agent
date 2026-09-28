import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const OUT = resolve('out');
const targets = {
  '/': 'server/app/index.html',
  '/csca': 'server/app/csca.html',
  '/csca-multi-agent': 'server/app/csca-multi-agent.html',
};
const BASELINE = { '/': 427, '/csca': 630 };

for (const [route, rel] of Object.entries(targets)) {
  const htmlPath = join(OUT, rel);
  if (!statSync(htmlPath, { throwIfNoEntry: false })) {
    console.log(`SKIP ${route}: ${rel} missing`);
    continue;
  }
  const html = readFileSync(htmlPath, 'utf8');
  // Modern browsers skip `noModule` scripts (legacy polyfill) — exclude them to
  // match the baseline methodology (what a modern browser actually downloads).
  const srcs = [...html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"[^>]*>/g)]
    .filter((m) => !m[0].includes('noModule'))
    .map((m) => m[1]);
  const seen = new Set();
  let totalGzip = 0;
  const rows = [];
  for (const src of srcs) {
    if (seen.has(src)) continue;
    seen.add(src);
    const file = join(OUT, src.replace(/^\/_next\/static\//, 'static/'));
    if (!statSync(file, { throwIfNoEntry: false })) {
      rows.push({ src, err: 'MISSING' });
      continue;
    }
    const raw = readFileSync(file);
    const gz = gzipSync(raw, { level: 6 }).length;
    totalGzip += gz;
    rows.push({ src, raw: raw.length, gz });
  }
  rows.sort((a, b) => (b.gz ?? 0) - (a.gz ?? 0));
  const kb = totalGzip / 1024;
  const base = BASELINE[route];
  const pct = base ? (((base - kb) / base) * 100).toFixed(1) : 'n/a';
  console.log(`\n=== ${route} ===`);
  console.log(
    `script tags: ${rows.length} | gzip ${kb.toFixed(1)} KB | baseline ${base} KB | delta -${pct}%`,
  );
  for (const r of rows) console.log(`  ${(r.gz / 1024).toFixed(1).padStart(7)} KB gz  ${r.src}`);
}
