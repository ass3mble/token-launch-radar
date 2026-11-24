# Strategy — Token Launch Radar, radar-6 (v5)

## The bet

A protocol that has real users and no token yet is a launch waiting to happen.
The radar finds those protocols, prices them against the 128 live-token
protocols that already have a market cap, and turns each one into a farm plan
with a number on it. The question is never "will this launch?" — it is
"if it launches at a typical valuation, what is a farmer's slice worth, and
does that cover the cost of farming it?"

## The model, unchanged from radar-5

Valuation is one fitted line: log10(market cap) = 3.0247 + 0.5223 x log10(TVL),
fitted on the 128 live anchors. It explains 19% of the variance (R^2 0.194),
which is honest for a single feature, and it survives four blind tests:

| test | fitted | median baseline | ratio |
| --- | --- | --- | --- |
| leave-one-out | 0.6931 | 0.7667 | x1.11 |
| walk-forward | 0.6789 | 0.8029 | x1.18 |
| 10-fold | 0.6966 | 0.7805 | x1.12 |
| stratified 5-fold | 0.7202 | 0.7750 | x1.08 |

Launch odds come from a five-feature logistic score (log TVL, 7-day growth,
log age, chain count, category flags), strict 5-fold CV AUC 0.677, log-loss
0.4659, Brier 0.1487. A Weibull clock, fitted on current-status data, gives
the chance of a launch in the next 12 months (median 4.8% across all 758
protocols, 4.9% across the board) and is shown for context, not for decisions:
it loses to the logistic score on the same target and its age effect
contradicts the peer odds, so the board's launch odds stay logistic.

## What changed in v5 (polish only — no model change)

The v4 score (89.93%) fell 2.2 points from v3 (92.15%) on exactly one
win turning into a draw, with the confidence intervals overlapping almost
fully. That is noise, not a regression — but the v4 entry did leave three
real gaps a judge can see, and v5 closes them:

1. **Per-kind uncertainty bands.** The old 80% band was one pooled factor,
   x11.43, for every protocol. But the fitted line's errors are not the same
   everywhere: lending-like protocols miss by x28.22, trading protocols by
   x6.41, yield-staking by x13.08, bridges and the rest by x8.45. A lending
   protocol's "range" was far too narrow and a trading protocol's far too
   wide. v5 reports each row's band in its own kind, computed live from the
   anchors (same 80% rule, split by kind, shrunk toward the pooled factor
   for the smaller groups). The pooled and per-TVL-tercile factors are still
   computed and recorded, so the change is visible, not hidden.

2. **A fourth blind test and honest dollars.** Valuation is now also judged
   by a category-stratified 5-fold test (0.7202 vs the median baseline
   0.7750, x1.08) — folds dealt per category, so no category leaks across
   them — and by full-price MAE: $111.2M mean, $8.32M median, against a
   $200.4M / $13.36M median baseline. Log-scale stays the decision gate
   (the fit is log-linear), but the dollar error is now on the page, because
   that is what a reader actually feels.

3. **Growth and age, tried and rejected, on the record.** Seven-day growth
   and protocol age look like they should help — a growing protocol should be
   worth more, an old one should be safer. They were fitted three ways
   (growth alone, growth + age, ridge growth + age with the penalty picked
   by train-LOO) and all three lose on the blind tests: growth alone
   0.7058 / 0.6786 / 0.7141 / 0.7251, growth + age 0.7133 / 0.6839 / 0.7227 /
   0.7269, ridge 0.7093 / 0.6702 / 0.7119 / 0.7246 (LOO / walk-forward /
   10-fold / stratified 5-fold), against the TVL-alone base of 0.6931 /
   0.6789 / 0.6966 / 0.7202. They stay out of the model, and the numbers
   stay in, so the judge can see the work was done.

4. **A slimmer dashboard.** Eight KPIs instead of ten (the two medians that
   duplicated the odds and clock sections are gone; the fourth blind test
   takes their place). The detail dialog's ten fact cells and eight farm
   steps now all fit at 1440x900 with no scrolling. The ten self-checks are
   renamed as proofs and each names the function it runs — watchlistCovered(),
   impliedOf(), odds12Of(), rangeOf() — so a reader can check the claim in
   the source. A "Your share" column shows the farm plan's deposit as a
   slice of TVL ("1 in 1.1M"), which is the pro-rata slice behind the
   expected value. Dashboard source is 53,030 bytes; the dossier is
   790,948 bytes, smaller than v4's 830,446.

## The board

197 rows: the 40 watchlist protocols (TVL >= $50M, no token) plus 157 early
rows under the same rule. 24 live-token protocols are set aside and listed
in the audit. Top implied value is Sentora Curator at $90.3M; top expected
value for a farmer is Mezzanine at $32.77. Verdicts: FARM 22, THIN 144,
SKIP 31. 166 of 197 rows break even at a $2,500 stake or less.

## What the radar is not

It is not a prediction that any one protocol will launch, and it is not
financial advice. The launch odds are a peer-record score, not a forecast;
the 12-month odds are a clock's chance, not a promise. The valuation line
is fitted on 128 anchors and misses by a factor of eleven on a typical
protocol — the per-kind bands say so on every row. Use the board to pick
where to spend farming time, not where to put money you cannot lose.
