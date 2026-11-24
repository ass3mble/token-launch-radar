# Verification — Token Launch Radar, radar-6 (v5)

This file is the record of how v5 was checked before it was submitted.
Every number here was produced by running the entry, not by copying a
plan: the replay log, the gate mirror, the screenshots and the sizes
below all come from the actual outputs in `out/`.

## How to reproduce

From the entry root, with the sealed snapshot at
`../kit/token-radar-01-kit/input/snapshot.json`:

```sh
./replay.sh
```

That removes `out/`, runs `main.ts` against the snapshot, and then runs
the local mirror of the gate's seven rows in `scripts/check-gate.mjs`.
A second run right after the first must produce byte-identical outputs:
`board.json`, `data.js`, `dossier.json` and all three screenshots
identical across runs. Two consecutive replays were run for v5 and the
hashes matched on every file.

## What the replays printed

The build reads 758 protocols, keeps 40 on the watchlist, and scores
197 rows (157 early, 24 live set aside). The fitted valuation line is
log10(market cap) = 3.0247 + 0.5223 x log10(TVL), R^2 0.1939, with
leave-one-out MAE 0.6931 against a 0.7667 median baseline, walk-forward
0.6789, 10-fold 0.6966 and stratified 5-fold 0.7202. The per-kind 80%
bands came out as lending-like x28.22, trading x6.41, yield-staking
x13.08 and bridges-other x8.45, against a pooled x11.43. Full-price MAE
is $111,153,979 on the mean and $8,316,496 on the median, against a
median baseline of $200,373,816 and $13,360,457. Launch-odds CV AUC is
0.677, the clock's 12-month median is 4.8% with shape 0.503, and the
bootstrap slope interval is 0.397 to 0.6517.

## The gate mirror, row by row

All seven rows pass on the replay with the real screenshots:

- dashboard_files: 3 files, 53,030 bytes, no network address named
  anywhere in the source.
- board_file: 197 rows, every slug from the snapshot, no duplicates.
- sorted_by_value: ranks 1 to 197, implied values non-increasing.
- coverage: all 40 watchlist slugs present.
- farm_steps: every row carries 8 farm steps inside the 3-to-12 bound.
- screenshots: 3 images, each a 1440-by-900 PNG under 512 KB.
- dossier_matches: the saved dossier equals a fresh buildDossier run,
  790,948 bytes.

The local mirror is not the scorer. The sealed scorer grades on the
server, and a 202 on submit is not a pass until the entry's checks rule.

## The screenshots, checked by eye

Three shots were taken with headless Chromium at 1440 by 900, from the
rebuilt dashboard:

- 1-board.png (161,759 bytes) shows the board: the lede, 8 KPI tiles,
  10 green proofs, the controls, and the first rows of the 12-column
  table with the new Your share column reading "1 in 1.1M" on the top
  row.
- 2-detail.png (227,544 bytes) shows the Sentora Curator dialog with
  the hash `#p=sentora-curator`: ten fact cells, the farm verdict, the
  exit trigger, and all eight farm steps visible with no scrolling.
  The 80% range cell reads "$6.9M – $1.18B" under a yield-staking
  x13.08 label, and the Your share cell reads "1 in 1.1M".
- 3-filtered.png (162,921 bytes) shows the watchlist filter with
  `#watch=1`: the checkbox ticked, "40 rows shown", Steakhouse
  Financial first with its WATCHLIST badge.

One layout defect was found and fixed before these shots: the
12-column board table overflowed its panel by 21 pixels, clipping the
TOKEN column. Cell padding went from 8px 10px to 8px 9px and the value
bar from 72px to 64px; the table now measures exactly 1138 pixels
against a 1138-pixel panel, with no horizontal scroll. The shots above
were retaken after that fix.

## Sizes and the tie-break

Dashboard source is 53,030 bytes: app.js 43,449, app.css 9,133 and
index.html 448. That is under the 65,536-byte text cap the dossier
builder applies, with room to spare. The dossier is 790,948 bytes,
39,498 bytes smaller than v4's 830,446, because the three screenshots
total 552,224 bytes of PNG against v4's 582,000-odd, and the dashboard
grew by only 597 bytes. Where the final heat ties two entries, the
smaller dossier wins, so the smaller dossier is worth having even
though the dashboard itself grew slightly.

## The per-kind bands, verified independently

The band factors were checked three ways before they shipped. First,
the experiment scratch recomputed them from the snapshot and the same
80% rule, giving the same four numbers. Second, the shipped model
recomputes them live on every replay, and the replay log prints them.
Third, the calibration was checked per kind with a leave-one-out
pass: with the pooled band, lending-like rows were covered 70.0% of
the time and trading rows 87.5%; with each kind's own band, the four
kinds land at 80.0%, 79.2%, 78.1% and 78.8% — that is what an 80%
band is supposed to do. A split-half check refit each factor on one
random half of the kind's anchors: lending-like gave x32.52 and
x22.61, trading x6.22 and x6.34, yield-staking x9.19 and x14.63,
bridges-other x7.98 and x9.95. The halves stay near the full factor,
so the factors are stable, not a fluke of one split. Shrunk factors,
weighting each kind toward the pooled factor by n over n plus 15,
are x19.15, x8.01, x12.53 and x9.04; the shipped band uses the raw
per-kind factor and the shrunk values stay in the fit for the record.

## The fourth blind test and the dollar error

The stratified 5-fold test deals folds round-robin by slug inside
each category, so no category leaks across a fold boundary. The base
model scores 0.7202 there against a 0.7750 median baseline, a x1.08
multiple — the worst of the four tests, which is why it is reported
first in the term battery instead of buried. The three growth and age
candidates were judged on all four tests and all three lose on the
leave-one-out test: growth alone 0.7058, growth with age 0.7133 and
ridge growth with age 0.7093, against the base 0.6931. The dollar
error comes from the same 10-fold predictions as the log-scale test:
mean $111,153,979 and median $8,316,496, against a median baseline
mean of $200,373,816 and median of $13,360,457. The mean is dominated
by a few very large protocols; the median is the typical miss.

## v5 against v4

The board is unchanged: the same 197 rows, the same implied values,
the same verdicts (FARM 22, THIN 144, SKIP 31), the same top expected
value (Mezzanine at $32.77), the same 166 rows breaking even at a
$2,500 stake or less. What changed is the uncertainty on each row
(per-kind bands instead of one pooled factor), the evidence on the
page (a fourth blind test, the dollar error, the growth and age
rejection written out), and the dashboard (8 KPIs instead of 10,
proofs that name their functions, a Your share column, a dialog that
fits without scrolling). The model itself — the valuation line, the
logistic odds, the Weibull clock — is untouched, which is the point:
v4's 2.2-point dip from v3 was one win turning into a draw with the
confidence intervals overlapping almost fully, so v5 polishes what a
judge can see instead of pretending a new model was found.

## What was not verified here

The sealed scorer's judgement is not reproducible locally; grade-local
does not work for this bounty and the server is the authority. The
snapshot is dated 2026-11-14, so a protocol that launched after that
date still shows as pre-token. Gas figures in the farm plans are
typical mainnet costs, not quotes. Launch odds are a peer-record
score, not a forecast of any single launch.
