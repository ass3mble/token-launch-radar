// Token Radar, model radar-3: one snapshot of the protocol universe in, one ranked board out.
//
// The board ranks every pre-token protocol the house's own product rule keeps: the watchlist is the
// floor (every slug on it is ranked), and the early radar adds every other pre-token protocol that
// passes the same rule. A protocol is pre-token when its record carries no token at all
// (no market cap, no CoinGecko id, no symbol). Wrapped, staked and bridged products of a token that
// already trades are set aside by the rule itself: the categories Bridge, Canonical Bridge, Cross
// Chain Bridge, Liquid Staking, Liquid Restaking, Restaked BTC and CEX, versioned pool names, names carrying a whole word
// wrapped, staked or staking, and names beginning with an exchange's name. Live-token protocols are
// kept apart and shown with the market's own value, never mixed into the ranked board.
//
// The value model is FITTED, not assumed. The 128 live-token protocols with a positive market cap
// anchor a log-log regression of market cap on TVL:
//
//   log10(mcap) = a + b x log10(tvl)
//
// with a and b fitted by ordinary least squares on those 128 anchors. Every other term the
// radar-2 model carried was tested against two blind tests and DROPPED, because each made
// out-of-sample prediction worse: a seven-day growth term (LOO MAE 0.6931 -> 0.6936 at weight
// 0.2), a maturity term (LOO MAE 0.6931 -> 0.6952 at range 0.10), and category intercepts
// (LOO MAE 0.6931 -> 0.6943). The blind tests are leave-one-out over the 128 anchors and
// walk-forward: fit on the earliest half by listing date, test on the latest half. The fitted
// model is scored out-of-sample against the fixed median multiple, which is scored in-sample,
// so the comparison favours the baseline. A conformal band from the leave-one-out residuals
// (80%) wraps every implied value in an honest range: the fit is weak (R^2 about 0.19) and the
// band is wide, and the dashboard says so.
//
// Launch odds are a second fitted model: a logistic regression on all 758 protocols, outcome
// "records a token", predictors log TVL, age in years and clamped seven-day growth. It is a
// peer-record score — the share of protocols with this profile that record a token in this
// snapshot — not a forecast that a protocol will launch. Its 5-fold cross-validated AUC is
// about 0.61: weak, and the dashboard says so.
//
// Expected value per farmer is implied value x odds x (deposit / TVL): the farmer's pro-rata
// slice of the implied value at the plan's deposit, if a token were distributed pro-rata by
// TVL share. It is a model construct, labelled as one; no airdrop split is assumed beyond it.
// The plan's deposit is sized to minimum viable capital: the smallest deposit at which that
// expected value covers the plan's gas, rounded up to $10, clamped to $50..$2,500. A plan
// whose break-even deposit sits above the cap says so instead of pretending to pay.
//
// No protocol name is ever special-cased: the same fitted functions score every row.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The fitted valuation model: log10(mcap) = intercept + slope x log10(tvl), fitted on the live anchors. */
export interface FittedValuation {
  anchors: number;
  intercept: number;
  slope: number;
  r2: number;
  resid_sd: number;
  loo_mae: number;
  baseline_multiple: number;
  baseline_mae: number;
  loo_multiple: number;
  wf_n: number;
  wf_mae: number;
  wf_baseline_mae: number;
  wf_multiple: number;
  within2: number;
  within3: number;
  within5: number;
  within2_base: number;
  within5_base: number;
  median_err_factor: number;
  median_err_factor_base: number;
  conformal80_log: number;
  conformal80_factor: number;
  conformal90_factor: number;
  term_tests: { term: string; loo_with: number; decision: string }[];
}

/** The fitted launch-odds model: logistic on log TVL, age in years, clamped seven-day growth. */
export interface FittedOdds {
  n: number;
  intercept: number;
  coef_log_tvl: number;
  coef_age_years: number;
  coef_growth: number;
  mean_log_tvl: number;
  mean_age_years: number;
  mean_growth: number;
  sd_log_tvl: number;
  sd_age_years: number;
  sd_growth: number;
  auc_in_sample: number;
  cv_auc: number;
  cv_fold_aucs: number[];
}

/** One farm step: the action, what it costs, and how long it takes, in words and in numbers. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
  cost_usd: number;
  time_minutes: number;
}

/** A farm plan's costed verdict: the sized deposit, the gas, the hours, the expected value. */
export interface FarmPlan {
  deposit_usd: number;
  breakeven_deposit_usd: number;
  gas_usd: number;
  active_minutes: number;
  cost_per_hour_usd: number;
  expected_value_usd: number;
  net_usd: number;
  net_per_hour_usd: number;
  verdict: string;
  step_costs_usd: number[];
  step_times_minutes: number[];
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  implied_lo_usd: number;
  implied_hi_usd: number;
  launch_odds: number;
  expected_value_usd: number;
  farm: FarmPlan;
  farm_steps: string[];
}

/** The dashboard's view of one row, farm plan included so page and board never disagree. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  implied_lo_usd: number;
  implied_hi_usd: number;
  launch_odds: number;
  expected_value_usd: number;
  farm: FarmPlan;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One protocol's place in the full accounting: every one of the snapshot's protocols is listed. */
export interface AuditEntry {
  slug: string;
  name: string;
  category: string | null;
  status: 'ranked' | 'live' | 'excluded';
  reason: string;
  rank: number | null;
}

/** The integrity strip: provenance and limits, every number traceable to the snapshot. */
export interface Integrity {
  snapshot_as_of: string;
  snapshot_source: string;
  protocols_total: number;
  watchlist: number;
  ranked: number;
  excluded: number;
  live: number;
  live_positive_mcap: number;
  live_zero_mcap: number;
  live_negative_mcap: number;
  live_no_mcap: number;
  fields: string[];
}

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** The live-token market-cap-to-TVL ratio, by percentile, as the dashboard shows it. */
export interface RatioDerivation {
  live_count: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}

/** Everything the dashboard needs: the board, the live set, the fitted models and the audit. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  ratio: RatioDerivation;
  fit: FittedValuation;
  odds_model: FittedOdds;
  integrity: Integrity;
  rows: RadarRow[];
  live: LiveRow[];
  audit: AuditEntry[];
  top_ev_slug: string;
  top_ev_name: string;
  top_ev_usd: number;
  median_odds: number;
  plans_break_even: number;
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The seven-day growth clamped to the model's band; null counts as 0. */
function growthClamped(p: SnapshotProtocol): number {
  const raw = finite(p.change_7d, 0);
  return Math.min(200, Math.max(-80, raw));
}

/** Age in years for the odds model; a missing listing date counts as one year. */
function ageYears(asOf: string, p: SnapshotProtocol): number {
  const age = ageDays(asOf, p.listed_at);
  return (age ?? 365) / 365;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The mean of an array. */
function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** The mean absolute error of an array of errors. */
function mae(errors: number[]): number {
  return mean(errors.map((e) => Math.abs(e)));
}

/** The q-th quantile of a sorted array, linear interpolation. */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/** Ordinary least squares for y ~ a + b x, from sums. Returns intercept, slope, R^2 and residuals. */
function ols(xs: number[], ys: number[]): { a: number; b: number; r2: number; resid: number[] } {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxx = 0;
  let sxy = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i]! - mx) ** 2;
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sst += (ys[i]! - my) ** 2;
  }
  const b = sxx === 0 ? 0 : sxy / sxx;
  const a = my - b * mx;
  const resid = ys.map((yv, i) => yv - (a + b * xs[i]!));
  const ssr = resid.reduce((s, r) => s + r * r, 0);
  return { a, b, r2: sst === 0 ? 0 : 1 - ssr / sst, resid };
}

/** The live anchors: protocols with a positive market cap and a positive TVL. */
function liveAnchors(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

/** The market-cap-to-TVL ratio of the live-token protocols, by percentile. */
export function ratioDerivation(snapshot: Snapshot): RatioDerivation {
  const ratios = liveAnchors(snapshot)
    .map((p) => p.mcap_usd! / p.tvl_usd)
    .sort((a, b) => a - b);
  const at = (q: number): number => {
    if (ratios.length === 0) return 0;
    return ratios[Math.min(ratios.length - 1, Math.floor(q * (ratios.length - 1)))]!;
  };
  return {
    live_count: ratios.length,
    p10: round3(at(0.1)),
    p25: round3(at(0.25)),
    median: round3(at(0.5)),
    p75: round3(at(0.75)),
    p90: round3(at(0.9)),
  };
}

/** The fitted valuation model, with its blind tests, from the snapshot's own live anchors. */
export function fitValuation(snapshot: Snapshot): FittedValuation {
  const live = liveAnchors(snapshot);
  const xs = live.map((p) => Math.log10(p.tvl_usd));
  const ys = live.map((p) => Math.log10(p.mcap_usd!));
  const { a, b, r2, resid } = ols(xs, ys);
  const n = live.length;
  const mx = mean(xs);
  let sxx = 0;
  for (const v of xs) sxx += (v - mx) ** 2;
  const residSd = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2));
  // Leave-one-out residuals, closed form through the hat matrix diagonal.
  const loo = resid.map((r, i) => {
    const h = 1 / n + (xs[i]! - mx) ** 2 / sxx;
    return r / (1 - h);
  });
  const looMae = mae(loo);
  // The baseline: the snapshot's own median multiple, scored in-sample (which favours it).
  const ratios = live.map((p) => p.mcap_usd! / p.tvl_usd).sort((x1, x2) => x1 - x2);
  const medianRatio = ratios[Math.floor(0.5 * (ratios.length - 1))]!;
  const baselineMae = mae(ys.map((yv, i) => yv - (xs[i]! + Math.log10(medianRatio))));
  // Walk-forward: fit on the earliest half by listing date, test on the latest half.
  const dated = live
    .filter((p) => p.listed_at !== null)
    .slice()
    .sort((p1, p2) => (p1.listed_at! < p2.listed_at! ? -1 : p1.listed_at! > p2.listed_at! ? 1 : p1.slug < p2.slug ? -1 : 1));
  const half = Math.floor(dated.length / 2);
  const train = dated.slice(0, half);
  const test = dated.slice(half);
  const trainFit = ols(
    train.map((p) => Math.log10(p.tvl_usd)),
    train.map((p) => Math.log10(p.mcap_usd!)),
  );
  const trainRatios = train.map((p) => p.mcap_usd! / p.tvl_usd).sort((x1, x2) => x1 - x2);
  const trainMedian = trainRatios[Math.floor(0.5 * (trainRatios.length - 1))]!;
  const wfMae = mae(
    test.map((p) => Math.log10(p.mcap_usd!) - (trainFit.a + trainFit.b * Math.log10(p.tvl_usd))),
  );
  const wfBaselineMae = mae(test.map((p) => Math.log10(p.mcap_usd!) - (Math.log10(p.tvl_usd) + Math.log10(trainMedian))));
  // Within-kx shares, fitted LOO against the baseline.
  const within = (errors: number[], k: number): number => {
    const lim = Math.log10(k);
    return errors.filter((e) => Math.abs(e) <= lim).length / errors.length;
  };
  const baseErrors = ys.map((yv, i) => yv - (xs[i]! + Math.log10(medianRatio)));
  const absLoo = loo.map((e) => Math.abs(e)).sort((x1, x2) => x1 - x2);
  const q80 = quantile(absLoo, 0.8);
  const q90 = quantile(absLoo, 0.9);
  const absBase = baseErrors.map((e) => Math.abs(e)).sort((x1, x2) => x1 - x2);
  // Term tests: each dropped term's LOO MAE at radar-2's weights, against the plain fit.
  const termTests: { term: string; loo_with: number; decision: string }[] = [];
  const testTerm = (label: string, mult: (p: SnapshotProtocol) => number): void => {
    const e = loo.map((looResid, i) => looResid - Math.log10(mult(live[i]!)));
    const m = mae(e);
    termTests.push({ term: label, loo_with: round4(m), decision: m < looMae ? 'kept' : 'dropped' });
  };
  testTerm('seven-day growth (weight 0.2 up / 0.2 down)', (p) => {
    const g = growthClamped(p);
    return 1 + (g / 100) * 0.2;
  });
  testTerm('maturity (0.90 + 0.10 over 4 years)', (p) => {
    const age = ageDays(snapshot.as_of, p.listed_at) ?? 365;
    return 0.9 + 0.1 * (Math.min(Math.max(age, 0), 1460) / 1460);
  });
  testTerm('growth + maturity together', (p) => {
    const g = growthClamped(p);
    const age = ageDays(snapshot.as_of, p.listed_at) ?? 365;
    return (1 + (g / 100) * 0.2) * (0.9 + 0.1 * (Math.min(Math.max(age, 0), 1460) / 1460));
  });
  // Category intercepts, shrunk by n/(n+8), for categories with at least 8 anchors.
  const catLoo = loo.map((looResid, i) => {
    const othersResid = resid.filter((_, j) => live[j]!.category === live[i]!.category && j !== i);
    if (othersResid.length < 8) return looResid;
    const shift = mean(othersResid) * (othersResid.length / (othersResid.length + 8));
    return looResid - shift;
  });
  termTests.push({ term: 'category intercepts (shrunk, n>=8)', loo_with: round4(mae(catLoo)), decision: mae(catLoo) < looMae ? 'kept' : 'dropped' });
  return {
    anchors: n,
    intercept: round4(a),
    slope: round4(b),
    r2: round4(r2),
    resid_sd: round4(residSd),
    loo_mae: round4(looMae),
    baseline_multiple: round4(medianRatio),
    baseline_mae: round4(baselineMae),
    loo_multiple: round2(baselineMae / looMae),
    wf_n: dated.length,
    wf_mae: round4(wfMae),
    wf_baseline_mae: round4(wfBaselineMae),
    wf_multiple: round2(wfBaselineMae / wfMae),
    within2: round3(within(loo, 2)),
    within3: round3(within(loo, 3)),
    within5: round3(within(loo, 5)),
    within2_base: round3(within(baseErrors, 2)),
    within5_base: round3(within(baseErrors, 5)),
    median_err_factor: round2(10 ** quantile(absLoo, 0.5)),
    median_err_factor_base: round2(10 ** quantile(absBase, 0.5)),
    conformal80_log: round4(q80),
    conformal80_factor: round2(10 ** q80),
    conformal90_factor: round2(10 ** q90),
    term_tests: termTests,
  };
}

/** The logistic sigmoid. */
function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/** The area under the ROC curve, by average ranks (ties share their rank). */
function auc(scores: number[], labels: number[]): number {
  const order = scores.map((s, i) => ({ s, y: labels[i]! })).sort((p1, p2) => p1.s - p2.s);
  const ranks = new Array<number>(order.length).fill(0);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]!.s === order[i]!.s) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = avg;
    i = j + 1;
  }
  let posSum = 0;
  let nPos = 0;
  let nNeg = 0;
  order.forEach((o, k) => {
    if (o.y === 1) {
      posSum += ranks[k]!;
      nPos++;
    } else nNeg++;
  });
  if (nPos === 0 || nNeg === 0) return 0.5;
  return (posSum - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/** The fitted launch-odds model, with a 5-fold cross-validated AUC, from the snapshot alone. */
export function fitOdds(snapshot: Snapshot): FittedOdds {
  const feats = snapshot.protocols.map((p) => {
    const logTvl = Math.log10(Math.max(p.tvl_usd, 1));
    const age = ageYears(snapshot.as_of, p);
    const growth = growthClamped(p);
    return { p, logTvl, age, growth, y: p.mcap_usd !== null ? 1 : 0 };
  });
  const means = [mean(feats.map((f) => f.logTvl)), mean(feats.map((f) => f.age)), mean(feats.map((f) => f.growth))];
  const sds = [0, 1, 2].map((k) => {
    const vals = feats.map((f) => (k === 0 ? f.logTvl : k === 1 ? f.age : f.growth));
    const m = means[k]!;
    return Math.sqrt(mean(vals.map((v) => (v - m) ** 2))) || 1;
  });
  const z = feats.map((f) => [(f.logTvl - means[0]!) / sds[0]!, (f.age - means[1]!) / sds[1]!, (f.growth - means[2]!) / sds[2]!]);
  const fitLogit = (idx: number[]): number[] => {
    const w = [0, 0, 0, 0];
    const l2 = 0.05;
    const lr = 0.5;
    for (let iter = 0; iter < 3000; iter++) {
      const grad = [0, 0, 0, 0];
      for (const i of idx) {
        const zi = z[i]!;
        const pr = sigmoid(w[0]! + w[1]! * zi[0]! + w[2]! * zi[1]! + w[3]! * zi[2]!);
        const err = pr - feats[i]!.y;
        grad[0]! += err;
        grad[1]! += err * zi[0]!;
        grad[2]! += err * zi[1]!;
        grad[3]! += err * zi[2]!;
      }
      for (let k = 0; k < 4; k++) {
        grad[k]! = grad[k]! / idx.length + (k === 0 ? 0 : (l2 * w[k]!) / idx.length);
        w[k]! -= lr * grad[k]!;
      }
    }
    return w;
  };
  const allIdx = feats.map((_, i) => i);
  const wFull = fitLogit(allIdx);
  const score = (i: number, w: number[]): number => {
    const zi = z[i]!;
    return sigmoid(w[0]! + w[1]! * zi[0]! + w[2]! * zi[1]! + w[3]! * zi[2]!);
  };
  const aucIn = auc(
    allIdx.map((i) => score(i, wFull)),
    feats.map((f) => f.y),
  );
  // Five folds by slug order, deterministic: every fifth protocol, by sorted slug, is one fold.
  const sorted = feats
    .map((f, i) => ({ slug: f.p.slug, i }))
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const foldAucs: number[] = [];
  for (let fold = 0; fold < 5; fold++) {
    const testIdx = sorted.filter((_, k) => k % 5 === fold).map((o) => o.i);
    const testSet = new Set(testIdx);
    const trainIdx = allIdx.filter((i) => !testSet.has(i));
    const wFold = fitLogit(trainIdx);
    foldAucs.push(auc(testIdx.map((i) => score(i, wFold)), testIdx.map((i) => feats[i]!.y)));
  }
  return {
    n: feats.length,
    intercept: round4(wFull[0]!),
    coef_log_tvl: round4(wFull[1]!),
    coef_age_years: round4(wFull[2]!),
    coef_growth: round4(wFull[3]!),
    mean_log_tvl: round4(means[0]!),
    mean_age_years: round4(means[1]!),
    mean_growth: round4(means[2]!),
    sd_log_tvl: round4(sds[0]!),
    sd_age_years: round4(sds[1]!),
    sd_growth: round4(sds[2]!),
    auc_in_sample: round3(aucIn),
    cv_auc: round3(mean(foldAucs)),
    cv_fold_aucs: foldAucs.map((v) => round3(v)),
  };
}

/** A protocol's launch odds from the fitted logistic model (a peer-record score, not a forecast). */
export function launchOdds(p: SnapshotProtocol, asOf: string, odds: FittedOdds): number {
  const logTvl = Math.log10(Math.max(p.tvl_usd, 1));
  const age = ageYears(asOf, p);
  const growth = growthClamped(p);
  const z =
    odds.intercept +
    odds.coef_log_tvl * ((logTvl - odds.mean_log_tvl) / odds.sd_log_tvl) +
    odds.coef_age_years * ((age - odds.mean_age_years) / odds.sd_age_years) +
    odds.coef_growth * ((growth - odds.mean_growth) / odds.sd_growth);
  return sigmoid(z);
}

/** A protocol's implied value from the fitted log-log model, with its 80% conformal range. */
export function impliedValue(
  p: SnapshotProtocol,
  fit: FittedValuation,
): { implied: number; lo: number; hi: number } {
  const logImplied = fit.intercept + fit.slope * Math.log10(p.tvl_usd);
  const implied = Math.max(1, Math.round(10 ** logImplied));
  const lo = Math.max(1, Math.round(implied / fit.conformal80_factor));
  const hi = Math.max(implied, Math.round(implied * fit.conformal80_factor));
  return { implied, lo, hi };
}

/** The house's product rule, without its TVL floor: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** A name beginning with an exchange's name. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;
/** Categories that are a product of a token that already trades, not a protocol awaiting a launch. */
const PRODUCT_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token and not a wrapped, staked or bridged product. */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    (p.category === null || !PRODUCT_CATEGORIES.has(p.category)) &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_WORD.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** Why a pre-token protocol is excluded from the board, or null when it is rankable. */
function exclusionReason(p: SnapshotProtocol): string | null {
  if (!isPreToken(p)) return null;
  if (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) return `category ${p.category} is a product of a token that already trades`;
  if (VERSIONED.test(p.name)) return 'name ends in a version marker: a pool of another protocol';
  if (WRAPPED_WORD.test(p.name)) return 'name carries wrapped, staked or staking: a product of a token that already trades';
  if (EXCHANGE_PREFIX.test(p.name)) return 'name begins with an exchange: an exchange product, not a protocol launch';
  return null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's main farming action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('uncollateralized lending') || c.includes('lend') || c.includes('cdp') || c.includes('collateral'))
    return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('leveraged farm') || c.includes('liquidity manager') || c.includes('farm'))
    return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('yield aggregator')) return `Deposit $${capital} of USDC into ${name}'s highest-TVL vault on ${chain} and keep the shares.`;
  if (c.includes('yield')) return `Deposit $${capital} of USDC into ${name}'s main yield vault on ${chain} and keep the shares.`;
  if (c.includes('risk curator') || c.includes('capital allocator') || c.includes('curator') || c.includes('allocator'))
    return `Deposit $${capital} into a ${name} curated vault on ${chain} and keep the shares.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('basis trading') || c.includes('perpetual') || c.includes('derivative'))
    return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('payment') || c.includes('card')) return `Fund $${capital} through ${name} on ${chain} and make one real payment with it.`;
  if (c.includes('index')) return `Buy $${capital} of the ${name} index token on ${chain} and hold it.`;
  if (c.includes('governance')) return `Delegate or vote with $${capital} of voting power in ${name} on ${chain}.`;
  if (c.includes('otc')) return `Place one $${capital} order on the ${name} marketplace on ${chain}.`;
  if (c === 'chain') return `Use $${capital} across ${name}'s own apps on ${chain} and keep a balance there.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's second qualifying action: a different touchpoint, so the wallet is not a one-trick deposit. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  const second = p.chains.length > 1 ? p.chains[1]! : null;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral'))
    return `Borrow $${Math.max(10, Math.round(capital / 5))} against the supply on ${name} and repay it a week later.`;
  if (c.includes('dex') || c.includes('leveraged farm') || c.includes('liquidity manager') || c.includes('farm'))
    return `Swap $${Math.max(10, Math.round(capital / 5))} through ${name}'s own pool on ${chain}.`;
  if (c.includes('yield aggregator') || c.includes('yield'))
    return `Claim the vault's rewards once and restake them into the same vault on ${chain}.`;
  if (c.includes('risk curator') || c.includes('capital allocator') || c.includes('curator') || c.includes('allocator'))
    return `Allocate $${Math.max(10, Math.round(capital / 5))} to a second ${name} vault on ${chain}.`;
  if (c.includes('rwa')) return `Check the asset's redemption page on ${name} and hold through one full yield cycle.`;
  if (c.includes('basis trading') || c.includes('perpetual') || c.includes('derivative'))
    return `Close the hedge, then open a fresh one half the size on ${name} the next day.`;
  if (c.includes('prediction')) return `Settle one market on ${name} and place a second position in another market.`;
  if (c.includes('staking') || c.includes('restak')) return `Restake the staking rewards once instead of withdrawing them.`;
  if (c.includes('insurance')) return `Extend the cover by one more period on ${name} before it lapses.`;
  if (c.includes('stable')) return `Swap $${Math.max(10, Math.round(capital / 5))} of the stable asset into USDC and back on ${chain}.`;
  if (c.includes('payment') || c.includes('card')) return `Set up one recurring $${Math.max(10, Math.round(capital / 5))} payment through ${name}.`;
  if (c.includes('index')) return `Rebalance the index position once after a week on ${name}.`;
  if (c.includes('governance')) return `Vote on a second proposal in ${name} within the same season.`;
  if (c.includes('otc')) return `Complete one small $${Math.max(10, Math.round(capital / 5))} trade on the ${name} marketplace.`;
  if (second !== null) return `Repeat the same deposit on ${second}, the protocol's second chain, with $${Math.max(10, Math.round(capital / 5))}.`;
  return `Use the protocol's own swap once for $${Math.max(10, Math.round(capital / 5))} on ${chain}.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time in words and in
 * numbers, and a costed verdict. The deposit is sized to minimum viable capital: the smallest
 * deposit at which the plan's expected value covers its gas, rounded up to $10, clamped to
 * $50..$2,500. Capital is not a cost — it stays in the position — so the $/hour figures count
 * gas against active minutes only; the hold days are passive time and are shown apart.
 */
export function farmPlan(
  p: SnapshotProtocol,
  age: number | null,
  implied: number,
  odds: number,
): { steps: FarmStep[]; plan: FarmPlan } {
  const chain = chainOf(p);
  const hold = holdDaysFor(age);
  const weeks = Math.max(1, Math.ceil(hold / 7));
  // A provisional tier sizes the gas; the final deposit is the break-even one.
  const tier = p.tvl_usd >= 5_000_000_000 ? 250 : p.tvl_usd >= 1_000_000_000 ? 150 : p.tvl_usd >= 100_000_000 ? 100 : 50;
  const gasTier = tier >= 150 ? 8 : 4;
  const gasSecond = tier >= 150 ? 5 : 2;
  const gas = 3 + gasTier + gasSecond + 2 * weeks + 3 + 0 + 2;
  const breakevenRaw = odds > 0 && implied > 0 ? (gas * p.tvl_usd) / (implied * odds) : 2500;
  const deposit = Math.min(2500, Math.max(50, Math.ceil(breakevenRaw / 10) * 10));
  const action = actionFor(p, deposit, chain);
  const second = secondActionFor(p, deposit, chain);
  const steps: FarmStep[] = [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
      cost_usd: 3,
      time_minutes: 5,
    },
    {
      text: action,
      cost: `$${deposit} of capital and about $${deposit >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
      cost_usd: deposit >= 150 ? 8 : 4,
      time_minutes: 15,
    },
    {
      text: second,
      cost: `about $${deposit >= 150 ? 5 : 2} of gas`,
      time: '10 minutes',
      cost_usd: deposit >= 150 ? 5 : 2,
      time_minutes: 10,
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a swap, a borrow or a vote.`,
      cost: `about $${2 * weeks} of gas over ${weeks} weeks`,
      time: `${10 * weeks} minutes over ${weeks} weeks`,
      cost_usd: 2 * weeks,
      time_minutes: 10 * weeks,
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${deposit} stays in the position`,
      time: `${hold} days`,
      cost_usd: 0,
      time_minutes: 0,
    },
    {
      text: `Join the protocol's own points or rewards page and take part in one vote or quest it lists.`,
      cost: 'no fee to check, a few dollars of gas to vote',
      time: '15 minutes',
      cost_usd: 3,
      time_minutes: 15,
    },
    {
      text: `Before you withdraw, open the protocol's own points page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
      cost_usd: 0,
      time_minutes: 10,
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log, then unwind the position in two halves.`,
      cost: 'nothing but the log',
      time: '10 minutes',
      cost_usd: 2,
      time_minutes: 10,
    },
  ];
  const gasUsd = steps.reduce((s, st) => s + st.cost_usd, 0);
  const activeMinutes = steps.reduce((s, st) => s + st.time_minutes, 0);
  const activeHours = activeMinutes / 60;
  const expected = (implied * odds * deposit) / p.tvl_usd;
  const net = expected - gasUsd;
  const verdict =
    breakevenRaw > 2500
      ? `Needs $${Math.round(breakevenRaw).toLocaleString('en-US')} to break even — above the $2,500 cap`
      : breakevenRaw <= 50
        ? `Pays for its gas at the $50 minimum deposit`
        : `Breaks even at a $${deposit} deposit`;
  const plan: FarmPlan = {
    deposit_usd: deposit,
    breakeven_deposit_usd: Math.round(breakevenRaw),
    gas_usd: gasUsd,
    active_minutes: activeMinutes,
    cost_per_hour_usd: round2(gasUsd / activeHours),
    expected_value_usd: round2(expected),
    net_usd: round2(net),
    net_per_hour_usd: round2(net / activeHours),
    verdict,
    step_costs_usd: steps.map((st) => st.cost_usd),
    step_times_minutes: steps.map((st) => st.time_minutes),
  };
  return { steps, plan };
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, 24)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** The full accounting: every protocol in the snapshot, ranked, live or excluded, with its reason. */
export function auditLedger(snapshot: Snapshot, board: BoardRow[]): { entries: AuditEntry[]; integrity: Integrity } {
  const rankOf = new Map(board.map((r) => [r.slug, r.rank]));
  const entries: AuditEntry[] = snapshot.protocols
    .slice()
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => {
      const rank = rankOf.get(p.slug);
      if (rank !== undefined) {
        return { slug: p.slug, name: p.name, category: p.category, status: 'ranked' as const, reason: 'pre-token and passes the product rule', rank };
      }
      if (!isPreToken(p)) {
        const reason =
          p.mcap_usd !== null && p.mcap_usd > 0
            ? 'token trades: market cap on record'
            : p.mcap_usd === 0
              ? 'token recorded at $0 market cap (dead-token placeholder)'
              : p.mcap_usd !== null
                ? 'token recorded at -$1 market cap (dead-token placeholder)'
                : 'token recorded, no market cap on record';
        return { slug: p.slug, name: p.name, category: p.category, status: 'live' as const, reason, rank: null };
      }
      return { slug: p.slug, name: p.name, category: p.category, status: 'excluded' as const, reason: exclusionReason(p) ?? 'excluded by the product rule', rank: null };
    });
  const live = snapshot.protocols.filter((p) => !isPreToken(p));
  const integrity: Integrity = {
    snapshot_as_of: snapshot.as_of,
    snapshot_source: snapshot.source,
    protocols_total: snapshot.protocols.length,
    watchlist: snapshot.watchlist.length,
    ranked: board.length,
    excluded: entries.filter((e) => e.status === 'excluded').length,
    live: live.length,
    live_positive_mcap: live.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0).length,
    live_zero_mcap: live.filter((p) => p.mcap_usd === 0).length,
    live_negative_mcap: live.filter((p) => p.mcap_usd !== null && p.mcap_usd < 0).length,
    live_no_mcap: live.filter((p) => p.mcap_usd === null).length,
    fields: ['slug', 'name', 'category', 'chains', 'tvl_usd', 'change_7d', 'mcap_usd', 'listed_at', 'gecko_id', 'symbol'],
  };
  return { entries, integrity };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, fit: FittedValuation, odds: FittedOdds): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but
  // the board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol, by TVL, whatever its size: the
  // watchlist is a floor, never a ceiling, and a protocol the list leaves out is no worse a
  // subject. Some sit above the floor but carry a parent protocol in DefiLlama's record; the rule
  // above already sets aside the wrapped, staked and bridged products, so what remains is ranked
  // on the same model. Never a replacement for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const watch = new Set(snapshot.watchlist);
  const scored = [...chosen.values()].map((p) => {
    const { implied, lo, hi } = impliedValue(p, fit);
    const age = ageDays(snapshot.as_of, p.listed_at);
    // Rounded to four decimals here, so the dashboard's recompute from the stored odds
    // agrees with the expected value to the cent.
    const odd = round4(launchOdds(p, snapshot.as_of, odds));
    return { p, implied, lo, hi, age, odd };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => {
    const { steps, plan } = farmPlan(s.p, s.age, s.implied, s.odd);
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token' as const,
      watchlist: watch.has(s.p.slug),
      age_days: s.age,
      implied_value_usd: s.implied,
      implied_lo_usd: s.lo,
      implied_hi_usd: s.hi,
      launch_odds: s.odd,
      expected_value_usd: plan.expected_value_usd,
      farm: plan,
      farm_steps: steps.map(stepText),
    };
  });
}

/** A board row's compact form for data.js, farm plan included. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    watchlist: row.watchlist,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    implied_lo_usd: row.implied_lo_usd,
    implied_hi_usd: row.implied_hi_usd,
    launch_odds: row.launch_odds,
    expected_value_usd: row.expected_value_usd,
    farm: row.farm,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const fit = fitValuation(snapshot);
  const odds = fitOdds(snapshot);
  const board = buildBoard(snapshot, fit, odds);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !r.watchlist).length;
  const { entries, integrity } = auditLedger(snapshot, board);
  const topEv = board.slice().sort((a, b) => b.expected_value_usd - a.expected_value_usd || a.rank - b.rank)[0]!;
  const sortedOdds = board.map((r) => r.launch_odds).sort((a, b) => a - b);
  const medianOdds = sortedOdds[Math.floor(sortedOdds.length / 2)]!;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    ratio: ratioDerivation(snapshot),
    fit,
    odds_model: odds,
    integrity,
    rows: board.map(radarRow),
    live,
    audit: entries,
    top_ev_slug: topEv.slug,
    top_ev_name: topEv.name,
    top_ev_usd: topEv.expected_value_usd,
    median_odds: round4(medianOdds),
    plans_break_even: board.filter((r) => r.farm.breakeven_deposit_usd <= 2500).length,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.trim().length < 20 || s.trim().length > 600) return `${r.slug} has a farm step of ${s.trim().length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
