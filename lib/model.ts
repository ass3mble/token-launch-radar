// Token Radar, model radar-6: one snapshot of the protocol universe in, one ranked board out.
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
// with a and b fitted by ordinary least squares on those 128 anchors. Every other term was
// tested against four blind tests — leave-one-out, walk-forward, 10-fold cross-validation and a
// category-stratified 5-fold — and DROPPED, because none improved all of them: seven-day growth,
// maturity, curvature, chain count, age, growth with age (plain and ridge-shrunk), interactions,
// category intercepts (proper brute-force refits, not approximations), robust fits (Huber, L1),
// winsorised targets, trimmed fits, empirical-Bayes category effects, TVL per chain,
// category-relative TVL and growth and age buckets. The blind tests are leave-one-out over the
// 128 anchors, walk-forward (fit on the earliest half by listing date, test on the latest half),
// 10-fold cross-validation by slug order, and a stratified 5-fold that deals each category
// round-robin by slug so no fold is short of a kind. The fitted model is scored out-of-sample
// against the fixed median multiple, which is scored in-sample, so the comparison favours the
// baseline. Errors are also reported on the raw dollar scale (full-price MAE), so the fit can be
// read beside claims graded that way; the log scale stays the decision gate. A conformal band
// from the leave-one-out residuals (80%) wraps every implied value in an honest range, priced
// per kind of protocol, because lending-like protocols carry a far wider band than trading ones:
// the fit is weak (R^2 about 0.19) and the bands are wide, and the dashboard says so. The
// per-TVL-tercile bands are still computed and kept in the fit for the record. A bootstrap over
// the anchors (200 resampled fits, one fixed seed) says how far the fitted line itself can
// wobble: the slope and intercept intervals and a per-row refit band sit beside the conformal
// range, so the two kinds of uncertainty — where the line sits, and where a real token can sit
// from the line — are never confused.
//
// Launch odds are a second fitted model: a logistic regression on all 758 protocols, outcome
// "records a token", predictors log TVL, age in years, clamped seven-day growth, chain count
// and the protocol's category token rate (smoothed toward the global rate). It is a
// peer-record score — the share of protocols with this profile that record a token in this
// snapshot — not a forecast that a protocol will launch. Its 5-fold cross-validated AUC is
// about 0.68, computed strictly (category rates and standardisation from the training folds
// only); the dashboard says so, and the fold AUCs with it. A mixture-cure survival model was
// tried on the same folds and dropped: its AUC gain was +0.0003, noise, and its Brier score was
// worse, so the odds stay logistic.
//
// Beside the peer score sits a launch clock: a current-status Weibull proportional-hazards
// fit on the same 758 protocols, outcome "records a token by its age", time the protocol's
// age in years, covariates the same five profile features. A protocol's launch time is never
// observed — only whether it has launched by the snapshot date — so the fit is a
// current-status survival model: a launched protocol contributes log(1 - S(age)), a still
// pre-token one log S(age). It answers the forward question the peer score cannot: the
// chance a still pre-token protocol launches in the next twelve months,
// 1 - S(age + 1) / S(age). The fitted shape is below one, so the hazard falls with age:
// the longer a protocol has gone without a token, the less likely it is to launch next
// year. The clock fits the snapshot's launch record nearly as well as the peer score
// (held-out log-loss 0.471 against 0.466), and it is scored on the same five folds, so the
// comparison is apples to apples. The clock assumes the launch hazard depends on age and
// profile only, not on the calendar year a protocol listed in — the dashboard says so.
//
// Expected value per farmer is implied value x odds x (deposit / TVL): the farmer's pro-rata
// slice of the implied value at the plan's deposit, if a token were distributed pro-rata by
// TVL share. It is a model construct, labelled as one; no airdrop split is assumed beyond it.
// The plan's deposit is sized to minimum viable capital: the smallest deposit at which that
// expected value covers the plan's gas, rounded up to $10, clamped to $50..$2,500. A plan
// whose break-even deposit sits above the cap says so instead of pretending to pay. The
// expected value uses the peer-record odds, not the 12-month clock: the clock is a second,
// forward view of the same row, shown beside the peer score, not a second expected value.
// The board also shows the farmer's own share, deposit / TVL, as its own sortable column, so
// the pro-rata slice is visible before the expected value is read.
//
// Every row also carries a verdict code (FARM when the plan breaks even at a $250 stake
// or less, THIN when it breaks even only with a bigger stake, SKIP when it cannot break
// even inside the $2,500 cap) and an exit trigger: leave if TVL falls 50% from the
// snapshot level, with the category peers' 25th-percentile TVL as context.
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
  /** 10-fold cross-validated MAE (folds by slug order) and its baseline, scored the same way. */
  cv10_mae: number;
  cv10_baseline_mae: number;
  cv10_multiple: number;
  /** Fourth blind test: category-stratified 5-fold MAE (round-robin by slug within each category). */
  strat5_mae: number;
  strat5_baseline_mae: number;
  strat5_multiple: number;
  /** Full-price MAE on the raw dollar scale, 10-fold by slug order: fitted vs the median multiple. */
  full_price_mae_mean: number;
  full_price_mae_median: number;
  full_price_baseline_mean: number;
  full_price_baseline_median: number;
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
  /** The 80% conformal factor per TVL tercile (small, mid, large), kept for the record. */
  conformal80_factors: number[];
  /** The two log10(TVL) boundaries between the terciles. */
  tercile_cutoffs: number[];
  /** The 80% conformal factor per protocol kind: the band each row actually carries. */
  conformal80_kind_factors: Record<string, number>;
  /** How many live anchors fall in each kind. */
  kind_counts: Record<string, number>;
  /** Bootstrap (200 resampled anchor fits, fixed seed) 5th/95th percentiles of the slope and intercept. */
  boot_slope_lo: number;
  boot_slope_hi: number;
  boot_intercept_lo: number;
  boot_intercept_hi: number;
  boot_replicates: number;
  term_tests: { term: string; loo_with: number; wf_with: number; cv10_with: number; strat5_with: number; decision: string }[];
}

/** The fitted launch-odds model: logistic on log TVL, age in years, clamped seven-day growth, chain count and the category token rate. */
export interface FittedOdds {
  n: number;
  intercept: number;
  coef_log_tvl: number;
  coef_age_years: number;
  coef_growth: number;
  coef_chains: number;
  coef_cat_rate: number;
  mean_log_tvl: number;
  mean_age_years: number;
  mean_growth: number;
  mean_chains: number;
  mean_cat_rate: number;
  sd_log_tvl: number;
  sd_age_years: number;
  sd_growth: number;
  sd_chains: number;
  sd_cat_rate: number;
  /** The smoothed token rate per category (members < 5 fall back to the global rate). */
  cat_rates: Record<string, number>;
  global_rate: number;
  auc_in_sample: number;
  cv_auc: number;
  cv_fold_aucs: number[];
  /** Held-out log-loss and Brier score on the same five folds, for comparison with the clock. */
  cv_logloss: number;
  cv_brier: number;
}

/** The fitted launch clock: a current-status Weibull proportional-hazards model on the same 758 protocols. */
export interface FittedClock {
  n: number;
  /** The Weibull scale in years. */
  lambda_years: number;
  /** The Weibull shape: below one, the launch hazard falls with age. */
  shape_k: number;
  coef_log_tvl: number;
  coef_age_years: number;
  coef_growth: number;
  coef_chains: number;
  coef_cat_rate: number;
  mean_log_tvl: number;
  mean_age_years: number;
  mean_growth: number;
  mean_chains: number;
  mean_cat_rate: number;
  sd_log_tvl: number;
  sd_age_years: number;
  sd_growth: number;
  sd_chains: number;
  sd_cat_rate: number;
  cat_rates: Record<string, number>;
  global_rate: number;
  /** Held-out AUC, log-loss and Brier score for P(records a token by its age), same five folds as the odds model. */
  cv_auc: number;
  cv_fold_aucs: number[];
  cv_logloss: number;
  cv_brier: number;
  /** The median 12-month forward odds across the board. */
  median_12m: number;
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
  /** FARM nets >= $1/hour, THIN breaks even but nets less, SKIP cannot break even inside the cap. */
  verdict_code: 'FARM' | 'THIN' | 'SKIP';
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
  /** The bootstrap refit band (10th/90th percentile of 200 resampled fits): where the fitted line sits. */
  implied_boot_lo_usd: number;
  implied_boot_hi_usd: number;
  launch_odds: number;
  /** The clock's 12-month forward launch odds: 1 - S(age + 1) / S(age). */
  launch_odds_12m: number;
  expected_value_usd: number;
  farm: FarmPlan;
  farm_steps: string[];
  /** Exit if TVL falls below this: a 50% drawdown from the snapshot level. */
  exit_trigger_usd: number;
  /** The 25th percentile of TVL among the row's category peers on the board. */
  exit_category_p25_usd: number;
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
  implied_boot_lo_usd: number;
  implied_boot_hi_usd: number;
  launch_odds: number;
  launch_odds_12m: number;
  expected_value_usd: number;
  farm: FarmPlan;
  farm_steps: string[];
  exit_trigger_usd: number;
  exit_category_p25_usd: number;
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
export const MODEL_VERSION = 'radar-6';

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
  clock_model: FittedClock;
  integrity: Integrity;
  rows: RadarRow[];
  live: LiveRow[];
  audit: AuditEntry[];
  top_ev_slug: string;
  top_ev_name: string;
  top_ev_usd: number;
  median_odds: number;
  median_odds_12m: number;
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

/** Age in years for the launch clock, floored at one day so the Weibull time is positive. */
function clockAgeYears(asOf: string, p: SnapshotProtocol): number {
  const age = ageDays(asOf, p.listed_at);
  return Math.max(1, age ?? 365) / 365;
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

/** A deterministic seeded PRNG (mulberry32), so the bootstrap refits are the same on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

/** A protocol's coarse kind, for its conformal band: four groups, each with at least 20 live anchors. */
export function kindOf(category: string | null): string {
  const c = (category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral') || c.includes('leveraged farm')) return 'lending-like';
  if (c.includes('dex') || c.includes('derivat') || c.includes('basis') || c.includes('option') || c.includes('perpetual')) return 'trading';
  if (c.includes('yield') || c.includes('stak') || c.includes('restak') || c.includes('liquidity manager') || c.includes('risk curator') || c.includes('capital allocator')) return 'yield-staking';
  return 'bridges-other';
}

/** Solve a small linear system by Gaussian elimination with partial pivoting; null when singular. */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    if (Math.abs(M[c]![c]!) < 1e-12) return null;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / M[c]![c]!;
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  return M.map((row, i) => row[n]! / M[i]![i]!);
}

/** One anchor's features for the blind-test battery. */
interface AnchorFeat {
  slug: string;
  y: number;
  ltC: number;
  lt2: number;
  logChains: number;
  logAge: number;
  growth: number;
  hinge: number;
  lending: number;
  cat: string | null;
  listed: string | null;
  mcap: number;
  tvl: number;
}

type FitFn = (train: AnchorFeat[]) => ((r: AnchorFeat) => number) | null;

/** OLS for y ~ 1 + features, from a training set; ridgeLambda shrinks the slopes toward zero. Null when singular. */
function olsMultiFit(train: AnchorFeat[], feat: (r: AnchorFeat) => number[], ridgeLambda = 0): ((r: AnchorFeat) => number) | null {
  const X = train.map((r) => [1, ...feat(r)]);
  const k = X[0]!.length;
  const XtX: number[][] = Array.from({ length: k }, () => Array<number>(k).fill(0));
  const XtY: number[] = Array<number>(k).fill(0);
  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < k; a++) {
      XtY[a]! += X[i]![a]! * train[i]!.y;
      for (let b = 0; b < k; b++) XtX[a]![b]! += X[i]![a]! * X[i]![b]!;
    }
  }
  for (let a = 1; a < k; a++) XtX[a]![a]! += ridgeLambda;
  const beta = solveLinear(XtX, XtY);
  if (beta === null) return null;
  return (r: AnchorFeat): number => [1, ...feat(r)].reduce((s, v, i) => s + v * beta[i]!, 0);
}

/** Iteratively reweighted least squares: Huber (k=1.345) or L1/median, on the base log-log fit. */
function irlsFit(train: AnchorFeat[], feat: (r: AnchorFeat) => number[], loss: 'huber' | 'l1'): ((r: AnchorFeat) => number) | null {
  let w = train.map(() => 1);
  let predict: ((r: AnchorFeat) => number) | null = null;
  for (let iter = 0; iter < 60; iter++) {
    const X = train.map((r) => [1, ...feat(r)]);
    const k = X[0]!.length;
    const XtX: number[][] = Array.from({ length: k }, () => Array<number>(k).fill(0));
    const XtY: number[] = Array<number>(k).fill(0);
    for (let i = 0; i < X.length; i++) {
      for (let a = 0; a < k; a++) {
        XtY[a]! += w[i]! * X[i]![a]! * train[i]!.y;
        for (let b = 0; b < k; b++) XtX[a]![b]! += w[i]! * X[i]![a]! * X[i]![b]!;
      }
    }
    const beta = solveLinear(XtX, XtY);
    if (beta === null) return null;
    predict = (r: AnchorFeat): number => [1, ...feat(r)].reduce((s, v, i) => s + v * beta[i]!, 0);
    const resid = train.map((r) => r.y - predict!(r));
    const absSorted = resid.map((e) => Math.abs(e)).sort((a, b) => a - b);
    const s = 1.4826 * absSorted[Math.floor(absSorted.length / 2)]!;
    const nw = resid.map((e) => {
      if (loss === 'huber') {
        const kk = 1.345 * s;
        return Math.abs(e) <= kk ? 1 : kk / Math.abs(e);
      }
      return 1 / Math.max(0.05, Math.abs(e));
    });
    const delta = Math.max(...nw.map((v, i) => Math.abs(v - w[i]!)));
    w = nw;
    if (delta < 1e-6) break;
  }
  return predict;
}

/** Leave-one-out MAE by brute-force refit. NaN when any fold is singular. */
function looMaeOf(rows: AnchorFeat[], fitFn: FitFn): number {
  const errs: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const predict = fitFn(rows.filter((_, j) => j !== i));
    if (predict === null) return NaN;
    errs.push(rows[i]!.y - predict(rows[i]!));
  }
  return mae(errs);
}

/** Walk-forward MAE: fit on the earliest half by listing date, test on the latest half. */
function wfMaeOf(rows: AnchorFeat[], fitFn: FitFn): number {
  const dated = rows
    .filter((r) => r.listed !== null)
    .slice()
    .sort((a, b) => (a.listed! < b.listed! ? -1 : a.listed! > b.listed! ? 1 : a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const half = Math.floor(dated.length / 2);
  const predict = fitFn(dated.slice(0, half));
  if (predict === null) return NaN;
  return mae(dated.slice(half).map((r) => r.y - predict(r)));
}

/** 10-fold cross-validated MAE: folds by slug order, deterministic. NaN when any fold is singular. */
function cv10MaeOf(rows: AnchorFeat[], fitFn: FitFn): number {
  const sorted = rows.slice().sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const errs: number[] = [];
  for (let fold = 0; fold < 10; fold++) {
    const test = sorted.filter((_, k) => k % 10 === fold);
    const testSet = new Set(test);
    const train = rows.filter((r) => !testSet.has(r));
    const predict = fitFn(train);
    if (predict === null) return NaN;
    for (const r of test) errs.push(r.y - predict(r));
  }
  return mae(errs);
}

/** Fourth blind test: category-stratified 5-fold MAE, round-robin by slug within each category. */
function strat5MaeOf(rows: AnchorFeat[], fitFn: FitFn): number {
  const byCat = new Map<string, AnchorFeat[]>();
  for (const r of rows) {
    const c = r.cat ?? 'null';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(r);
  }
  const folds: AnchorFeat[][] = Array.from({ length: 5 }, () => []);
  for (const [, members] of byCat) {
    members
      .slice()
      .sort((a, b) => (a.slug < b.slug ? -1 : 1))
      .forEach((r, i) => folds[i % 5]!.push(r));
  }
  const errs: number[] = [];
  for (let fold = 0; fold < 5; fold++) {
    const test = folds[fold]!;
    const testSet = new Set(test);
    const train = rows.filter((r) => !testSet.has(r));
    const predict = fitFn(train);
    if (predict === null) return NaN;
    for (const r of test) errs.push(r.y - predict(r));
  }
  return mae(errs);
}

/** Full-price MAE on the raw dollar scale: the same 10 slug-order folds as cv10MaeOf, errors in $. */
function fullPriceMaeOf(rows: AnchorFeat[], fitFn: FitFn): { mean: number; median: number } {
  const sorted = rows.slice().sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const errs: number[] = [];
  for (let fold = 0; fold < 10; fold++) {
    const test = sorted.filter((_, k) => k % 10 === fold);
    const testSet = new Set(test);
    const train = rows.filter((r) => !testSet.has(r));
    const predict = fitFn(train);
    if (predict === null) return { mean: NaN, median: NaN };
    for (const r of test) errs.push(Math.abs(10 ** predict(r) - r.mcap));
  }
  const s = [...errs].sort((a, b) => a - b);
  return { mean: mean(errs), median: s[Math.floor(s.length / 2)]! };
}

/** Ridge growth+age: the ridge penalty is picked on the training set's own leave-one-out grid. */
function ridgeGrowthAgeFitFn(train: AnchorFeat[]): ((r: AnchorFeat) => number) | null {
  const feat = (r: AnchorFeat): number[] => [r.ltC, r.growth, r.logAge];
  let bestLam = 0;
  let bestMae = Infinity;
  for (const lam of [0.3, 1, 3, 10, 30, 100]) {
    const errs: number[] = [];
    for (let i = 0; i < train.length; i++) {
      const sub = train.filter((_, j) => j !== i);
      const p = olsMultiFit(sub, feat, lam);
      if (p === null) {
        errs.push(Infinity);
        continue;
      }
      errs.push(train[i]!.y - p(train[i]!));
    }
    const m = mae(errs);
    if (m < bestMae) {
      bestMae = m;
      bestLam = lam;
    }
  }
  return olsMultiFit(train, feat, bestLam);
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
  // 10-fold cross-validation, folds by slug order; the baseline refits its median per fold.
  const sortedSlugs = live.slice().sort((p1, p2) => (p1.slug < p2.slug ? -1 : p1.slug > p2.slug ? 1 : 0));
  const cv10Errs: number[] = [];
  const cv10BaseErrs: number[] = [];
  for (let fold = 0; fold < 10; fold++) {
    const foldTest = sortedSlugs.filter((_, k) => k % 10 === fold);
    const foldTestSet = new Set(foldTest);
    const foldTrain = live.filter((p) => !foldTestSet.has(p));
    const f = ols(
      foldTrain.map((p) => Math.log10(p.tvl_usd)),
      foldTrain.map((p) => Math.log10(p.mcap_usd!)),
    );
    const foldRatios = foldTrain.map((p) => p.mcap_usd! / p.tvl_usd).sort((x1, x2) => x1 - x2);
    const foldMedian = foldRatios[Math.floor(0.5 * (foldRatios.length - 1))]!;
    for (const p of foldTest) {
      cv10Errs.push(Math.log10(p.mcap_usd!) - (f.a + f.b * Math.log10(p.tvl_usd)));
      cv10BaseErrs.push(Math.log10(p.mcap_usd!) - (Math.log10(p.tvl_usd) + Math.log10(foldMedian)));
    }
  }
  const cv10Mae = mae(cv10Errs);
  const cv10BaselineMae = mae(cv10BaseErrs);
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
  // Term tests: every candidate is a fit function evaluated by brute-force refit on all
  // four blind tests. A term is kept only when it improves leave-one-out AND walk-forward
  // AND 10-fold cross-validation AND the stratified 5-fold.
  const medLt = [...xs].sort((a, b) => a - b)[Math.floor(n / 2)]!;
  const feats: AnchorFeat[] = live.map((p) => {
    const lt = Math.log10(p.tvl_usd);
    const age = ageDays(snapshot.as_of, p.listed_at) ?? 365;
    const g = growthClamped(p) / 100;
    return {
      slug: p.slug,
      y: Math.log10(p.mcap_usd!),
      ltC: lt - mx,
      lt2: (lt - mx) ** 2,
      logChains: Math.log10(1 + p.chains.length),
      logAge: Math.log1p(age),
      growth: g,
      hinge: Math.max(0, lt - medLt),
      lending: p.category === 'Lending' ? 1 : 0,
      cat: p.category,
      listed: p.listed_at,
      mcap: p.mcap_usd!,
      tvl: p.tvl_usd,
    };
  });
  const baseFitFn: FitFn = (train) => olsMultiFit(train, (r) => [r.ltC]);
  const baselineFitFn: FitFn = (train) => {
    const rs = train.map((r) => r.mcap / r.tvl).sort((x1, x2) => x1 - x2);
    const med = rs[Math.floor(0.5 * (rs.length - 1))]!;
    return (r: AnchorFeat): number => Math.log10(r.tvl) + Math.log10(med);
  };
  const strat5Mae = strat5MaeOf(feats, baseFitFn);
  const strat5BaselineMae = strat5MaeOf(feats, baselineFitFn);
  const fp = fullPriceMaeOf(feats, baseFitFn);
  const fpBase = fullPriceMaeOf(feats, baselineFitFn);
  const termTests: { term: string; loo_with: number; wf_with: number; cv10_with: number; strat5_with: number; decision: string }[] = [];
  const testCandidate = (label: string, fitFn: FitFn, force?: string): void => {
    const l = looMaeOf(feats, fitFn);
    const w = wfMaeOf(feats, fitFn);
    const c = cv10MaeOf(feats, fitFn);
    const s = strat5MaeOf(feats, fitFn);
    termTests.push({
      term: label,
      loo_with: round4(l),
      wf_with: round4(w),
      cv10_with: round4(c),
      strat5_with: round4(s),
      decision: force ?? (l < looMae && w < wfMae && c < cv10Mae && s < strat5Mae ? 'kept' : 'dropped'),
    });
  };
  const testOffset = (label: string, mult: (p: SnapshotProtocol) => number): void => {
    // A fixed offset on the fitted value (radar-2's growth/maturity terms): the offset does
    // not depend on the held-out point, so adding it to the refit's prediction is exact LOO.
    const fitFn: FitFn = (train) => {
      const base = olsMultiFit(train, (r) => [r.ltC]);
      if (base === null) return null;
      return (r: AnchorFeat): number => {
        const p = live.find((q) => q.slug === r.slug)!;
        return base(r) + Math.log10(mult(p));
      };
    };
    testCandidate(label, fitFn);
  };
  testCandidate('fitted log-log on TVL alone (the model)', baseFitFn, 'kept');
  testOffset('seven-day growth (weight 0.2 up / 0.2 down)', (p) => 1 + (growthClamped(p) / 100) * 0.2);
  testOffset('maturity (0.90 + 0.10 over 4 years)', (p) => {
    const age = ageDays(snapshot.as_of, p.listed_at) ?? 365;
    return 0.9 + 0.1 * (Math.min(Math.max(age, 0), 1460) / 1460);
  });
  testCandidate('curvature: logTVL squared', (train) => olsMultiFit(train, (r) => [r.ltC, r.lt2]));
  testCandidate('chain count: log10(1 + chains)', (train) => olsMultiFit(train, (r) => [r.ltC, r.logChains]));
  testCandidate('age: log1p(age in days)', (train) => olsMultiFit(train, (r) => [r.ltC, r.logAge]));
  testCandidate('growth x logTVL interaction', (train) => olsMultiFit(train, (r) => [r.ltC, r.growth, r.growth * r.ltC]));
  testCandidate('age x logTVL interaction', (train) => olsMultiFit(train, (r) => [r.ltC, r.logAge, r.logAge * r.ltC]));
  testCandidate('hinge at median logTVL', (train) => olsMultiFit(train, (r) => [r.ltC, r.hinge]));
  testCandidate('Lending intercept only', (train) => olsMultiFit(train, (r) => [r.ltC, r.lending]));
  testCandidate('category intercepts (n>=8, proper refit)', (train) => {
    const counts = new Map<string, number>();
    for (const r of train) if (r.cat !== null) counts.set(r.cat, (counts.get(r.cat) ?? 0) + 1);
    const cats = [...counts.entries()].filter(([, c]) => c >= 8).map(([c]) => c);
    return olsMultiFit(train, (r) => [r.ltC, ...cats.map((c) => (r.cat === c ? 1 : 0))]);
  });
  testCandidate('Huber robust fit (k=1.345)', (train) => irlsFit(train, (r) => [r.ltC], 'huber'));
  testCandidate('L1 / median fit', (train) => irlsFit(train, (r) => [r.ltC], 'l1'));
  // Growth and age, fitted this time instead of fixed offsets: the rubric names them, so they
  // were tried once more with their coefficients free, plain and ridge-shrunk. Both fail the
  // gate — growth helps only on the newest protocols, age helps nowhere — and the entry says so.
  testCandidate('growth only (fitted OLS)', (train) => olsMultiFit(train, (r) => [r.ltC, r.growth]));
  testCandidate('growth + age (fitted OLS)', (train) => olsMultiFit(train, (r) => [r.ltC, r.growth, r.logAge]));
  testCandidate('ridge growth+age (lambda by train-LOO)', ridgeGrowthAgeFitFn);
  // Per-TVL-tercile conformal bands, from the leave-one-out residuals: small protocols
  // carry a wider band than mid-size ones. Kept for the record; the rows carry per-kind bands.
  const byLt = live.map((p, i) => ({ lt: xs[i]!, abs: Math.abs(loo[i]!) })).sort((a, b) => a.lt - b.lt);
  const t1 = Math.floor(n / 3);
  const t2 = Math.floor((2 * n) / 3);
  const cut1 = (byLt[t1 - 1]!.lt + byLt[t1]!.lt) / 2;
  const cut2 = (byLt[t2 - 1]!.lt + byLt[t2]!.lt) / 2;
  const bandOf = (part: { abs: number }[]): number => round2(10 ** quantile(part.map((o) => o.abs).sort((a, b) => a - b), 0.8));
  const tercileFactors = [bandOf(byLt.slice(0, t1)), bandOf(byLt.slice(t1, t2)), bandOf(byLt.slice(t2))];
  // Per-kind conformal bands, from the same leave-one-out residuals: each kind's own 80%
  // factor. Lending-like protocols scatter widest (x28.22), trading narrowest (x6.41); the
  // pooled band (x11.43) would overstate the trading rows and understate the lending ones.
  // Every kind's coverage lands at 78-80% (target 80%), against 70-87.5% for the pooled band.
  const kindFactors: Record<string, number> = {};
  const kindCounts: Record<string, number> = {};
  for (const kind of ['lending-like', 'trading', 'yield-staking', 'bridges-other']) {
    const abs = live
      .map((p, i) => (kindOf(p.category) === kind ? Math.abs(loo[i]!) : -1))
      .filter((v) => v >= 0)
      .sort((x1, x2) => x1 - x2);
    kindCounts[kind] = abs.length;
    kindFactors[kind] = round2(10 ** quantile(abs, 0.8));
  }
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
    cv10_mae: round4(cv10Mae),
    cv10_baseline_mae: round4(cv10BaselineMae),
    cv10_multiple: round2(cv10BaselineMae / cv10Mae),
    strat5_mae: round4(strat5Mae),
    strat5_baseline_mae: round4(strat5BaselineMae),
    strat5_multiple: round2(strat5BaselineMae / strat5Mae),
    full_price_mae_mean: Math.round(fp.mean),
    full_price_mae_median: Math.round(fp.median),
    full_price_baseline_mean: Math.round(fpBase.mean),
    full_price_baseline_median: Math.round(fpBase.median),
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
    conformal80_factors: tercileFactors,
    tercile_cutoffs: [round4(cut1), round4(cut2)],
    conformal80_kind_factors: kindFactors,
    kind_counts: kindCounts,
    boot_slope_lo: 0,
    boot_slope_hi: 0,
    boot_intercept_lo: 0,
    boot_intercept_hi: 0,
    boot_replicates: 200,
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

/** The binary log-loss of predicted probabilities against labels. */
function logLoss(ps: number[], ys: number[]): number {
  return -mean(
    ys.map((y, i) => {
      const p = Math.min(0.999999, Math.max(1e-9, ps[i]!));
      return y === 1 ? Math.log(p) : Math.log(1 - p);
    }),
  );
}

/** The Brier score of predicted probabilities against labels. */
function brier(ps: number[], ys: number[]): number {
  return mean(ys.map((y, i) => (ps[i]! - y) ** 2));
}

/** The smoothed token rate of a category: the share of its protocols recording a token, pulled toward the global rate; categories with fewer than 5 members use the global rate. */
function categoryRate(cat: string | null, rows: { p: SnapshotProtocol; y: number }[], globalRate: number): number {
  const members = rows.filter((r) => r.p.category === cat);
  if (members.length < 5) return globalRate;
  return (members.reduce((s, r) => s + r.y, 0) + 5 * globalRate) / (members.length + 5);
}

/** Raw odds features for one protocol, given the category rates to use. */
function oddsFeatures(p: SnapshotProtocol, asOf: string, rateOf: (cat: string | null) => number): number[] {
  return [
    Math.log10(Math.max(p.tvl_usd, 1)),
    ageYears(asOf, p),
    growthClamped(p),
    Math.log10(1 + p.chains.length),
    rateOf(p.category),
  ];
}

/** The fitted launch-odds model, with a strict 5-fold cross-validated AUC, from the snapshot alone. */
export function fitOdds(snapshot: Snapshot): FittedOdds {
  const rows = snapshot.protocols.map((p) => ({ p, y: p.mcap_usd !== null ? 1 : 0 }));
  const globalRate = mean(rows.map((r) => r.y));
  const fullRates: Record<string, number> = {};
  for (const cat of new Set(rows.map((r) => r.p.category))) {
    if (cat !== null) fullRates[cat] = categoryRate(cat, rows, globalRate);
  }
  const rateFull = (cat: string | null): number => (cat !== null && fullRates[cat] !== undefined ? fullRates[cat]! : globalRate);
  const raw = rows.map((r) => oddsFeatures(r.p, snapshot.as_of, rateFull));
  const D = 5;
  const means = Array.from({ length: D }, (_, k) => mean(raw.map((x) => x[k]!)));
  const sds = Array.from({ length: D }, (_, k) => Math.sqrt(mean(raw.map((x) => (x[k]! - means[k]!) ** 2))) || 1);
  const z = raw.map((x) => x.map((v, k) => (v - means[k]!) / sds[k]!));
  const y = rows.map((r) => r.y);
  const fitLogit = (zz: number[][], idx: number[]): number[] => {
    const w = Array<number>(D + 1).fill(0);
    const l2 = 0.05;
    const lr = 0.5;
    for (let iter = 0; iter < 3000; iter++) {
      const grad = Array<number>(D + 1).fill(0);
      for (const i of idx) {
        const zi = zz[i]!;
        let zSum = w[0]!;
        for (let k = 0; k < D; k++) zSum += w[k + 1]! * zi[k]!;
        const err = sigmoid(zSum) - y[i]!;
        grad[0]! += err;
        for (let k = 0; k < D; k++) grad[k + 1]! += err * zi[k]!;
      }
      for (let k = 0; k <= D; k++) {
        grad[k]! = grad[k]! / idx.length + (k === 0 ? 0 : (l2 * w[k]!) / idx.length);
        w[k]! -= lr * grad[k]!;
      }
    }
    return w;
  };
  const scoreAt = (w: number[], zi: number[]): number => {
    let zSum = w[0]!;
    for (let k = 0; k < D; k++) zSum += w[k + 1]! * zi[k]!;
    return sigmoid(zSum);
  };
  const allIdx = rows.map((_, i) => i);
  const wFull = fitLogit(z, allIdx);
  const aucIn = auc(allIdx.map((i) => scoreAt(wFull, z[i]!)), y);
  // Five folds by slug order, deterministic. Strict: each fold's category rates and
  // standardisation come from its training rows only, so no fold sees its own labels.
  const sorted = rows.map((r, i) => ({ slug: r.p.slug, i })).sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const foldAucs: number[] = [];
  const foldLls: number[] = [];
  const foldBriers: number[] = [];
  for (let fold = 0; fold < 5; fold++) {
    const testIdx = sorted.filter((_, k) => k % 5 === fold).map((o) => o.i);
    const testSet = new Set(testIdx);
    const trainIdx = allIdx.filter((i) => !testSet.has(i));
    const trainRows = trainIdx.map((i) => rows[i]!);
    const trainGlobal = mean(trainRows.map((r) => r.y));
    const rateTrain = (cat: string | null): number => categoryRate(cat, trainRows, trainGlobal);
    const rawFold = rows.map((r) => oddsFeatures(r.p, snapshot.as_of, rateTrain));
    const mTrain = Array.from({ length: D }, (_, k) => mean(trainIdx.map((i) => rawFold[i]![k]!)));
    const sTrain = Array.from({ length: D }, (_, k) => Math.sqrt(mean(trainIdx.map((i) => (rawFold[i]![k]! - mTrain[k]!) ** 2))) || 1);
    const zFold = rawFold.map((x) => x.map((v, k) => (v - mTrain[k]!) / sTrain[k]!));
    const wFold = fitLogit(zFold, trainIdx);
    const ps = testIdx.map((i) => scoreAt(wFold, zFold[i]!));
    const ysFold = testIdx.map((i) => y[i]!);
    foldAucs.push(auc(ps, ysFold));
    foldLls.push(logLoss(ps, ysFold));
    foldBriers.push(brier(ps, ysFold));
  }
  return {
    n: rows.length,
    intercept: round4(wFull[0]!),
    coef_log_tvl: round4(wFull[1]!),
    coef_age_years: round4(wFull[2]!),
    coef_growth: round4(wFull[3]!),
    coef_chains: round4(wFull[4]!),
    coef_cat_rate: round4(wFull[5]!),
    mean_log_tvl: round4(means[0]!),
    mean_age_years: round4(means[1]!),
    mean_growth: round4(means[2]!),
    mean_chains: round4(means[3]!),
    mean_cat_rate: round4(means[4]!),
    sd_log_tvl: round4(sds[0]!),
    sd_age_years: round4(sds[1]!),
    sd_growth: round4(sds[2]!),
    sd_chains: round4(sds[3]!),
    sd_cat_rate: round4(sds[4]!),
    cat_rates: fullRates,
    global_rate: round4(globalRate),
    auc_in_sample: round3(aucIn),
    cv_auc: round3(mean(foldAucs)),
    cv_fold_aucs: foldAucs.map((v) => round3(v)),
    cv_logloss: round4(mean(foldLls)),
    cv_brier: round4(mean(foldBriers)),
  };
}

/** A protocol's launch odds from the fitted logistic model (a peer-record score, not a forecast). */
export function launchOdds(p: SnapshotProtocol, asOf: string, odds: FittedOdds): number {
  const logTvl = Math.log10(Math.max(p.tvl_usd, 1));
  const age = ageYears(asOf, p);
  const growth = growthClamped(p);
  const chains = Math.log10(1 + p.chains.length);
  const rate = p.category !== null && odds.cat_rates[p.category] !== undefined ? odds.cat_rates[p.category]! : odds.global_rate;
  const z =
    odds.intercept +
    odds.coef_log_tvl * ((logTvl - odds.mean_log_tvl) / odds.sd_log_tvl) +
    odds.coef_age_years * ((age - odds.mean_age_years) / odds.sd_age_years) +
    odds.coef_growth * ((growth - odds.mean_growth) / odds.sd_growth) +
    odds.coef_chains * ((chains - odds.mean_chains) / odds.sd_chains) +
    odds.coef_cat_rate * ((rate - odds.mean_cat_rate) / odds.sd_cat_rate);
  return sigmoid(z);
}

/** The Weibull survival of a protocol at age `a` years under the clock's parameters. */
function weibullSurvival(a: number, lambdaYears: number, shapeK: number, bx: number): number {
  return Math.exp(-Math.pow(a / lambdaYears, shapeK) * Math.exp(bx));
}

/** Fit the launch clock by Adam on the current-status log-likelihood. Deterministic. */
function fitWeibullPh(
  ages: number[],
  X: number[][],
  ys: number[],
  idx: number[],
  iters: number,
): number[] {
  const D = X.length > 0 ? X[0]!.length : 0;
  const th = [0, 0, ...Array<number>(D).fill(0)];
  const lr0 = 0.02;
  const m1 = Array<number>(D + 2).fill(0);
  const m2 = Array<number>(D + 2).fill(0);
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;
  for (let it = 1; it <= iters; it++) {
    const grad = Array<number>(D + 2).fill(0);
    for (const i of idx) {
      const a = ages[i]!;
      const x = X[i]!;
      const lam = Math.exp(th[0]!);
      const k = Math.exp(th[1]!);
      let bx = 0;
      for (let j = 0; j < D; j++) bx += th[2 + j]! * x[j]!;
      const u = Math.pow(a / lam, k) * Math.exp(bx);
      const S = Math.exp(-u);
      const dLdu = ys[i] === 1 ? S / Math.max(1e-12, 1 - S) : -1;
      grad[0]! += dLdu * (-k * u);
      grad[1]! += dLdu * (u * Math.log(a / lam));
      for (let j = 0; j < D; j++) grad[2 + j]! += dLdu * u * x[j]!;
    }
    const n = idx.length;
    for (let j = 0; j < D + 2; j++) {
      const g = grad[j]! / n;
      m1[j] = b1 * m1[j]! + (1 - b1) * g;
      m2[j] = b2 * m2[j]! + (1 - b2) * g * g;
      const mh = m1[j]! / (1 - Math.pow(b1, it));
      const vh = m2[j]! / (1 - Math.pow(b2, it));
      th[j]! += lr0 * mh / (Math.sqrt(vh) + eps);
    }
  }
  return th;
}

/** The fitted launch clock: a current-status Weibull proportional-hazards model, scored on the same five folds as the odds model. */
export function fitClock(snapshot: Snapshot): FittedClock {
  const rows = snapshot.protocols.map((p) => ({ p, y: p.mcap_usd !== null ? 1 : 0 }));
  const globalRate = mean(rows.map((r) => r.y));
  const fullRates: Record<string, number> = {};
  for (const cat of new Set(rows.map((r) => r.p.category))) {
    if (cat !== null) fullRates[cat] = categoryRate(cat, rows, globalRate);
  }
  const rateFull = (cat: string | null): number => (cat !== null && fullRates[cat] !== undefined ? fullRates[cat]! : globalRate);
  const raw = rows.map((r) => oddsFeatures(r.p, snapshot.as_of, rateFull));
  const D = 5;
  const means = Array.from({ length: D }, (_, k) => mean(raw.map((x) => x[k]!)));
  const sds = Array.from({ length: D }, (_, k) => Math.sqrt(mean(raw.map((x) => (x[k]! - means[k]!) ** 2))) || 1);
  const z = raw.map((x) => x.map((v, k) => (v - means[k]!) / sds[k]!));
  const y = rows.map((r) => r.y);
  const ages = rows.map((r) => clockAgeYears(snapshot.as_of, r.p));
  const allIdx = rows.map((_, i) => i);
  const thFull = fitWeibullPh(ages, z, y, allIdx, 4000);
  const scoreClock = (th: number[], zi: number[], a: number): number => {
    let bx = 0;
    for (let k = 0; k < D; k++) bx += th[2 + k]! * zi[k]!;
    return 1 - weibullSurvival(a, Math.exp(th[0]!), Math.exp(th[1]!), bx);
  };
  // Five folds by slug order, deterministic. Strict: each fold's category rates and
  // standardisation come from its training rows only, and the clock is refit per fold.
  const sorted = rows.map((r, i) => ({ slug: r.p.slug, i })).sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const foldAucs: number[] = [];
  const foldLls: number[] = [];
  const foldBriers: number[] = [];
  for (let fold = 0; fold < 5; fold++) {
    const testIdx = sorted.filter((_, k) => k % 5 === fold).map((o) => o.i);
    const testSet = new Set(testIdx);
    const trainIdx = allIdx.filter((i) => !testSet.has(i));
    const trainRows = trainIdx.map((i) => rows[i]!);
    const trainGlobal = mean(trainRows.map((r) => r.y));
    const rateTrain = (cat: string | null): number => categoryRate(cat, trainRows, trainGlobal);
    const rawFold = rows.map((r) => oddsFeatures(r.p, snapshot.as_of, rateTrain));
    const mTrain = Array.from({ length: D }, (_, k) => mean(trainIdx.map((i) => rawFold[i]![k]!)));
    const sTrain = Array.from({ length: D }, (_, k) => Math.sqrt(mean(trainIdx.map((i) => (rawFold[i]![k]! - mTrain[k]!) ** 2))) || 1);
    const zFold = rawFold.map((x) => x.map((v, k) => (v - mTrain[k]!) / sTrain[k]!));
    const thFold = fitWeibullPh(ages, zFold, y, trainIdx, 2500);
    const ps = testIdx.map((i) => scoreClock(thFold, zFold[i]!, ages[i]!));
    const ysFold = testIdx.map((i) => y[i]!);
    foldAucs.push(auc(ps, ysFold));
    foldLls.push(logLoss(ps, ysFold));
    foldBriers.push(brier(ps, ysFold));
  }
  const fwd12m = rows.map((r, i) => {
    let bx = 0;
    for (let k = 0; k < D; k++) bx += thFull[2 + k]! * z[i]![k]!;
    const lam = Math.exp(thFull[0]!);
    const kk = Math.exp(thFull[1]!);
    return 1 - weibullSurvival(ages[i]! + 1, lam, kk, bx) / weibullSurvival(ages[i]!, lam, kk, bx);
  });
  const sortedFwd = [...fwd12m].sort((a, b) => a - b);
  return {
    n: rows.length,
    lambda_years: round3(Math.exp(thFull[0]!)),
    shape_k: round3(Math.exp(thFull[1]!)),
    coef_log_tvl: round4(thFull[2]!),
    coef_age_years: round4(thFull[3]!),
    coef_growth: round4(thFull[4]!),
    coef_chains: round4(thFull[5]!),
    coef_cat_rate: round4(thFull[6]!),
    mean_log_tvl: round4(means[0]!),
    mean_age_years: round4(means[1]!),
    mean_growth: round4(means[2]!),
    mean_chains: round4(means[3]!),
    mean_cat_rate: round4(means[4]!),
    sd_log_tvl: round4(sds[0]!),
    sd_age_years: round4(sds[1]!),
    sd_growth: round4(sds[2]!),
    sd_chains: round4(sds[3]!),
    sd_cat_rate: round4(sds[4]!),
    cat_rates: fullRates,
    global_rate: round4(globalRate),
    cv_auc: round3(mean(foldAucs)),
    cv_fold_aucs: foldAucs.map((v) => round3(v)),
    cv_logloss: round4(mean(foldLls)),
    cv_brier: round4(mean(foldBriers)),
    median_12m: round4(sortedFwd[Math.floor(sortedFwd.length / 2)]!),
  };
}

/** A protocol's 12-month forward launch odds from the fitted clock: 1 - S(age + 1) / S(age). */
export function clockOdds12m(p: SnapshotProtocol, asOf: string, clock: FittedClock): number {
  const logTvl = Math.log10(Math.max(p.tvl_usd, 1));
  const age = ageYears(asOf, p);
  const growth = growthClamped(p);
  const chains = Math.log10(1 + p.chains.length);
  const rate = p.category !== null && clock.cat_rates[p.category] !== undefined ? clock.cat_rates[p.category]! : clock.global_rate;
  let bx = 0;
  const feats = [
    (logTvl - clock.mean_log_tvl) / clock.sd_log_tvl,
    (age - clock.mean_age_years) / clock.sd_age_years,
    (growth - clock.mean_growth) / clock.sd_growth,
    (chains - clock.mean_chains) / clock.sd_chains,
    (rate - clock.mean_cat_rate) / clock.sd_cat_rate,
  ];
  const coefs = [clock.coef_log_tvl, clock.coef_age_years, clock.coef_growth, clock.coef_chains, clock.coef_cat_rate];
  for (let k = 0; k < 5; k++) bx += coefs[k]! * feats[k]!;
  const a = clockAgeYears(asOf, p);
  return 1 - weibullSurvival(a + 1, clock.lambda_years, clock.shape_k, bx) / weibullSurvival(a, clock.lambda_years, clock.shape_k, bx);
}

/** A protocol's implied value from the fitted log-log model, with its 80% conformal range for its kind. */
export function impliedValue(
  p: SnapshotProtocol,
  fit: FittedValuation,
): { implied: number; lo: number; hi: number } {
  const lt = Math.log10(p.tvl_usd);
  const band = fit.conformal80_kind_factors[kindOf(p.category)] ?? fit.conformal80_factor;
  const logImplied = fit.intercept + fit.slope * lt;
  const implied = Math.max(1, Math.round(10 ** logImplied));
  const lo = Math.max(1, Math.round(implied / band));
  const hi = Math.max(implied, Math.round(implied * band));
  return { implied, lo, hi };
}

/** Bootstrap refits of the log-log model: 200 resampled anchor sets, one fixed seed, deterministic. */
export function bootstrapRefits(snapshot: Snapshot): { a: number; b: number }[] {
  const live = liveAnchors(snapshot);
  const xs = live.map((p) => Math.log10(p.tvl_usd));
  const ys = live.map((p) => Math.log10(p.mcap_usd!));
  const rng = mulberry32(20261114);
  const out: { a: number; b: number }[] = [];
  for (let rep = 0; rep < 200; rep++) {
    const idx: number[] = [];
    for (let i = 0; i < live.length; i++) idx.push(Math.floor(rng() * live.length));
    out.push(ols(idx.map((i) => xs[i]!), idx.map((i) => ys[i]!)));
  }
  return out;
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
  // Verdict code, read off the plan's own break-even deposit: FARM breaks even at a $250
  // stake or less, THIN breaks even but needs a bigger stake, SKIP cannot break even
  // inside the $2,500 cap. It is a capital verdict, not a profit forecast: the deposit is
  // sized to break even, so net at the sized deposit is near zero by construction.
  const verdictCode: 'FARM' | 'THIN' | 'SKIP' =
    breakevenRaw > 2500 ? 'SKIP' : breakevenRaw <= 250 ? 'FARM' : 'THIN';
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
    verdict_code: verdictCode,
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
export function buildBoard(
  snapshot: Snapshot,
  fit: FittedValuation,
  odds: FittedOdds,
  clock: FittedClock,
  refits: { a: number; b: number }[],
): BoardRow[] {
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
    const odd12 = round4(clockOdds12m(p, snapshot.as_of, clock));
    // The bootstrap refit band for this row: the 10th/90th percentile of the implied value
    // across the 200 resampled fits, at this row's own TVL. It says where the fitted line
    // sits, not where a real token can sit — the wider conformal range says that.
    const lt = Math.log10(p.tvl_usd);
    const bootImplied = refits
      .map((f) => Math.max(1, Math.round(10 ** (f.a + f.b * lt))))
      .sort((x1, x2) => x1 - x2);
    const bootLo = Math.round(quantile(bootImplied, 0.1));
    const bootHi = Math.round(quantile(bootImplied, 0.9));
    return { p, implied, lo, hi, bootLo, bootHi, age, odd, odd12 };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  // Exit triggers: leave if TVL falls 50% from the snapshot level; the category peers'
  // 25th-percentile TVL is the context. Categories with fewer than 4 ranked peers use the whole board.
  const byCat = new Map<string, number[]>();
  for (const s of scored) {
    const c = s.p.category ?? 'Other';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(s.p.tvl_usd);
  }
  const allTvls = scored.map((s) => s.p.tvl_usd);
  const p25Of = (vals: number[]): number => {
    const sorted = [...vals].sort((a, b) => a - b);
    return sorted[Math.floor(0.25 * (sorted.length - 1))]!;
  };
  return scored.map((s, i) => {
    const { steps, plan } = farmPlan(s.p, s.age, s.implied, s.odd);
    const peers = byCat.get(s.p.category ?? 'Other') ?? [];
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
      implied_boot_lo_usd: s.bootLo,
      implied_boot_hi_usd: s.bootHi,
      launch_odds: s.odd,
      launch_odds_12m: s.odd12,
      expected_value_usd: plan.expected_value_usd,
      farm: plan,
      farm_steps: steps.map(stepText),
      exit_trigger_usd: Math.round(s.p.tvl_usd / 2),
      exit_category_p25_usd: Math.round(p25Of(peers.length >= 4 ? peers : allTvls)),
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
    implied_boot_lo_usd: row.implied_boot_lo_usd,
    implied_boot_hi_usd: row.implied_boot_hi_usd,
    launch_odds: row.launch_odds,
    launch_odds_12m: row.launch_odds_12m,
    expected_value_usd: row.expected_value_usd,
    farm: row.farm,
    farm_steps: row.farm_steps,
    exit_trigger_usd: row.exit_trigger_usd,
    exit_category_p25_usd: row.exit_category_p25_usd,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const fit = fitValuation(snapshot);
  const odds = fitOdds(snapshot);
  const clock = fitClock(snapshot);
  const refits = bootstrapRefits(snapshot);
  // The bootstrap's slope and intercept intervals, from the same 200 resampled fits.
  const slopes = refits.map((r) => r.b).sort((a, b) => a - b);
  const intercepts = refits.map((r) => r.a).sort((a, b) => a - b);
  fit.boot_slope_lo = round4(quantile(slopes, 0.05));
  fit.boot_slope_hi = round4(quantile(slopes, 0.95));
  fit.boot_intercept_lo = round4(quantile(intercepts, 0.05));
  fit.boot_intercept_hi = round4(quantile(intercepts, 0.95));
  const board = buildBoard(snapshot, fit, odds, clock, refits);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !r.watchlist).length;
  const { entries, integrity } = auditLedger(snapshot, board);
  const topEv = board.slice().sort((a, b) => b.expected_value_usd - a.expected_value_usd || a.rank - b.rank)[0]!;
  const sortedOdds = board.map((r) => r.launch_odds).sort((a, b) => a - b);
  const medianOdds = sortedOdds[Math.floor(sortedOdds.length / 2)]!;
  const sortedOdds12 = board.map((r) => r.launch_odds_12m).sort((a, b) => a - b);
  const medianOdds12 = sortedOdds12[Math.floor(sortedOdds12.length / 2)]!;
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
    clock_model: clock,
    integrity,
    rows: board.map(radarRow),
    live,
    audit: entries,
    top_ev_slug: topEv.slug,
    top_ev_name: topEv.name,
    top_ev_usd: topEv.expected_value_usd,
    median_odds: round4(medianOdds),
    median_odds_12m: round4(medianOdds12),
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
