#!/usr/bin/env node
/**
 * First-screen performance check for guibu.site target pages.
 *
 * Measures against a running production server:
 *   - TTFB  (navigation responseStart, ms)
 *   - FCP   (first-contentful-paint, ms)
 *   - First-screen JS bytes (sum of transferSize of /_next/static *.js — this is
 *     the compressed-on-the-wire size, i.e. gzip/brotli; the noModule polyfill is
 *     naturally excluded in a modern Chromium).
 *
 * Usage:
 *   node scripts/perf-check.mjs
 *   BASE_URL=http://localhost:3000 ROUTES=/,/csca RUNS=5 node scripts/perf-check.mjs
 *
 * Exit code 0 always; prints PASS/FAIL for the metric targets and the reduction
 * vs. the documented baseline (pre-optimization production build).
 */
import { chromium } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3099';
const RUNS = Number(process.env.RUNS || 3);
const ROUTES = (process.env.ROUTES || '/,/csca').split(',');

const TTFB_TARGET = 200; // ms
const FCP_TARGET = 1200; // ms
// Pre-optimization first-screen JS (gzip, KB) — measured from the production
// build's prerendered HTML script tags (settings/echarts/motion before removal).
const BASELINE = { '/': 427, '/csca': 630 };

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round1 = (n) => Math.round(n * 10) / 10;
const kb = (bytes) => round1(bytes / 1024);

async function measureRoute(browser, route) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE_URL + route, { waitUntil: 'load' });
    try {
      await page.waitForFunction(
        () =>
          performance.getEntriesByType('paint').some((e) => e.name === 'first-contentful-paint'),
        null,
        { timeout: 8000 },
      );
    } catch {
      /* FCP entry may legitimately be absent (e.g. no content painted yet) */
    }
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance
        .getEntriesByType('paint')
        .find((e) => e.name === 'first-contentful-paint');
      const js = performance
        .getEntriesByType('resource')
        .filter((r) => r.name.includes('/_next/static') && /\.js($|\?)/.test(r.name));
      return {
        ttfb: nav ? nav.responseStart : -1,
        fcp: fcp ? fcp.startTime : -1,
        jsTransfer: js.reduce((sum, r) => sum + r.transferSize, 0),
        jsCount: js.length,
        chunks: js
          .map((r) => ({ name: r.name.split('/').pop(), size: r.transferSize }))
          .sort((a, b) => b.size - a.size),
      };
    });
    runs.push(metrics);
    await context.close();
  }

  const agg = {
    ttfb: median(runs.map((r) => r.ttfb).filter((v) => v >= 0)),
    fcp: median(runs.map((r) => r.fcp).filter((v) => v >= 0)),
    jsTransfer: median(runs.map((r) => r.jsTransfer)),
    jsCount: median(runs.map((r) => r.jsCount)),
    // chunk table from the median-size run
    chunks: runs[runs.length - 1].chunks,
  };
  return agg;
}

function fmtChunks(chunks) {
  return chunks
    .slice(0, 12)
    .map((c) => `  ${c.name.padEnd(40)} ${kb(c.size).toString().padStart(8)} KB`)
    .join('\n');
}

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  // Chromium binary not downloaded — fall back to the system Edge channel
  // (present on Windows 11) so the check can still run.
  console.log(`chromium launch failed (${err.message.split('\n')[0]}), trying msedge channel...`);
  browser = await chromium.launch({ channel: 'msedge' });
}
console.log(`Target: ${BASE_URL} | runs=${RUNS} | routes=${ROUTES.join(', ')}\n`);
for (const route of ROUTES) {
  const m = await measureRoute(browser, route);
  const baselineKb = BASELINE[route];
  const kbNow = kb(m.jsTransfer);
  const pct = baselineKb ? round1(((baselineKb - kbNow) / baselineKb) * 100) : null;
  console.log(`=== ${route} ===`);
  console.log(`  TTFB   ${round1(m.ttfb).toString().padStart(7)} ms   ${m.ttfb <= TTFB_TARGET ? 'PASS' : 'FAIL'} (target ≤ ${TTFB_TARGET})`);
  console.log(`  FCP    ${round1(m.fcp).toString().padStart(7)} ms   ${m.fcp <= FCP_TARGET ? 'PASS' : 'FAIL'} (target ≤ ${FCP_TARGET})`);
  console.log(`  JS     ${kbNow.toString().padStart(7)} KB (${m.jsCount} chunks)  baseline ${baselineKb} KB  delta ${pct >= 0 ? `-${pct}%` : 'n/a'}`);
  console.log('  top chunks (gzip):');
  console.log(fmtChunks(m.chunks));
  console.log('');
}
await browser.close();
