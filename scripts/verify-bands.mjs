// Independently recompute the per-kind 80% conformal bands from the sealed
// snapshot, without importing the entry's model. If the factors it prints
// differ from the shipped fit (out/data.js), either the model or this script
// is wrong, and the entry must not ship until the two agree.
//
// Usage: node scripts/verify-bands.mjs [snapshot.json] [data.js]
// Exit 0 when every kind's factor matches the shipped fit to 2 decimals.
import { readFileSync } from 'node:fs';

const snapPath = process.argv[2] ?? '../kit/token-radar-01-kit/input/snapshot.json';
const dataPath = process.argv[3] ?? 'out/data.js';

/** The mean of an array. */
function mean(xs) {
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

/** The q-th quantile of a sorted array, linear interpolation. */
function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Round to 2 decimals, the way the model reports its factors. */
function round2(x) {
  return Math.round(x * 100) / 100;
}

/** A protocol's coarse kind, from its category text. */
function kindOf(category) {
  const c = (category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral') || c.includes('leveraged farm')) return 'lending-like';
  if (c.includes('dex') || c.includes('derivat') || c.includes('basis') || c.includes('option') || c.includes('perpetual')) return 'trading';
  if (c.includes('yield') || c.includes('stak') || c.includes('restak') || c.includes('liquidity manager') || c.includes('risk curator') || c.includes('capital allocator')) return 'yield-staking';
  return 'bridges-other';
}

/** Ordinary least squares for y ~ a + b x, from sums. */
function ols(xs, ys) {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const b = sxy / sxx;
  const a = my - b * mx;
  const resid = ys.map((y, i) => y - (a + b * xs[i]));
  return { a, b, resid, mx, sxx };
}

const snapshot = JSON.parse(readFileSync(snapPath, 'utf8'));
const live = snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
const xs = live.map((p) => Math.log10(p.tvl_usd));
const ys = live.map((p) => Math.log10(p.mcap_usd));
const { a, b, resid, mx, sxx } = ols(xs, ys);
const n = live.length;
console.log(`anchors ${n}, intercept ${a.toFixed(4)}, slope ${b.toFixed(4)}`);

// Leave-one-out residuals, closed form through the hat matrix diagonal:
// each anchor's residual divided by one minus its leverage.
const loo = resid.map((r, i) => {
  const h = 1 / n + (xs[i] - mx) ** 2 / sxx;
  return r / (1 - h);
});

function factorOf(abs) {
  const sorted = [...abs].sort((p, q) => p - q);
  return round2(10 ** quantile(sorted, 0.8));
}

const kinds = ['lending-like', 'trading', 'yield-staking', 'bridges-other'];
const found = {};
for (const kind of kinds) {
  const abs = live.map((p, i) => (kindOf(p.category) === kind ? Math.abs(loo[i]) : -1)).filter((v) => v >= 0);
  found[kind] = factorOf(abs);
  console.log(`${kind}: n=${abs.length} factor x${found[kind].toFixed(2)}`);
}
const pooled = factorOf(loo.map((v) => Math.abs(v)));
console.log(`pooled: n=${n} factor x${pooled.toFixed(2)}`);

// The shipped fit, read from the replay's data.js, as the expectation.
const dataSrc = readFileSync(dataPath, 'utf8');
const shipped = JSON.parse(dataSrc.replace(/^window\.RADAR=/, '').replace(/;\s*$/, '')).fit.conformal80_kind_factors;
const shippedPooled = JSON.parse(dataSrc.replace(/^window\.RADAR=/, '').replace(/;\s*$/, '')).fit.conformal80_factor;
let fail = 0;
for (const kind of kinds) {
  const ok = found[kind] === shipped[kind];
  console.log(`${ok ? 'PASS' : 'FAIL'} ${kind}: recomputed x${found[kind].toFixed(2)} vs shipped x${shipped[kind].toFixed(2)}`);
  if (!ok) fail++;
}
const pooledOk = pooled === shippedPooled;
console.log(`${pooledOk ? 'PASS' : 'FAIL'} pooled: recomputed x${pooled.toFixed(2)} vs shipped x${shippedPooled.toFixed(2)}`);
if (!pooledOk) fail++;
process.exit(fail === 0 ? 0 : 1);
