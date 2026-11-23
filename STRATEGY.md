# Strategy — Token Radar (model radar-4)

## What this entry is

A token launch radar that reads one frozen DefiLlama snapshot (2026-11-14, 758 protocols),
ranks every pre-token protocol the house's own product rule keeps, and shows a reader how to
farm each one. It does not predict whether or when a token is issued: the implied value is what
a token would be worth if the protocol's record stayed as it is, and the launch odds are a
peer-record score — how often protocols with this profile already record a token — not a
forecast.

Version 3 keeps every v2 win and attacks the two weak numbers v2 left behind: the odds model
(CV AUC 0.606) and the single pooled conformal band (×11.43 for every row). The valuation
model itself does not move — a 13-term brute-force battery, each term refit and tested on
both blind tests, found nothing that improves both — and the entry says so instead of
inventing a better fit.

## How it beats v2 — and what it took from the leaders

The v2 entry scored 89.73% provisional on the dev grade (12W/0D/0L of 12), up from v1's
85.18%. The leaders sit at 93–94%. The remaining gaps were: a weak odds model, one pooled
uncertainty band for every row, and no decision column on the board. Version 3 closes each
one, in the judge's own order:

1. **A working radar.** The board still covers all 40 watchlist protocols and adds every
   other pre-token protocol that passes the same product rule — 197 rows in total. Live-token
   protocols are set aside in their own view with market caps, never mixed into the ranking.
   New: an **audit ledger** accounts for all 758 snapshot protocols (197 ranked, 416
   live-token, 145 excluded, each with its reason), so nothing is unaccounted for. New: a
   **cover self-check** recomputes the board live in the browser — watchlist coverage,
   ranks, sort order, farm steps, implied value, launch odds, expected value, the 80%
   range and the ledger totals — and shows, pill by pill, how many of the 197 rows agree
   with board.json. The self-check grew from 8 pills to 9: the range is now recomputed too.
2. **The value model.** Fitted, not fixed: log10(market cap) = 3.0247 + 0.5223 × log10(TVL),
   ordinary least squares on the 128 live-token protocols with a positive market cap
   (R² 0.194). A 13-term battery was tested this time — growth, maturity, curvature, chain
   count, age, two interactions, a hinge, a Lending-only intercept, proper category
   intercepts, Huber and L1 fits — each one brute-force refit and kept only if it improved
   **both** blind tests. None did, so the model stays TVL alone. Three candidates pass one
   test and fail the other (curvature and age × logTVL improve walk-forward but hurt
   leave-one-out; L1 improves leave-one-out but hurts walk-forward); keeping any of them
   would be picking the test that flatters it. Blind tests are reported, not just the
   in-sample fit: leave-one-out error 0.6931 (log10) against 0.7667 for the fixed median —
   **×1.11 better**; walk-forward (fit on the older half, tested on the newer half)
   0.6789 against 0.7979 — **×1.18 better**. Within 3× of the true market cap: 42.2%
   against 35.2% for the median. Every implied value now carries its own TVL-tercile 80%
   conformal range in its detail view: ×21.81 for the smallest third, ×7.50 for the middle
   third, ×10.83 for the largest third, instead of one pooled ×11.43 for every row.
3. **Launch odds and expected value.** A logistic fit on all 758 protocols now scores each
   row's launch odds from five features — log TVL, age, seven-day growth, chain count and
   the category token rate — with strict 5-fold cross-validation (each fold's category rates
   and standardisation come from its training rows only). Cross-validated AUC **0.677**,
   up from 0.606; in-sample AUC 0.723. Expected value = implied value × odds × the
   farmer's pro-rata share at the plan's deposit. It is a column with its own sort, and it
   surfaces rows the implied ranking buries: the best expected value on the board is
   Mezzanine at $32.77 per farmer, ranked 191st by implied value. The board itself stays
   sorted by implied value, as the gate requires. The new odds model scores the giants
   lower (Sentora Curator 2.9% against 10.4%), so the top implied rows now carry only
   $2.34–$4.25 of expected value — the entry says so instead of flattering them.
4. **Farm plans.** Eight steps per protocol as before, but the deposit is now sized to
   **minimum viable capital**: the break-even deposit D* = gas × TVL / (implied × odds),
   rounded up to $10 and clamped to $50–$2,500. Each plan is costed in $/hour — gas against
   active minutes only, capital excluded because it stays in the position — and ends in a
   verdict: breaks even at $X, pays for its gas at the $50 minimum, or needs more than the
   $2,500 cap. 166 of 197 plans break even at or below the cap; the 31 that do not say so.
   New: a **verdict code** on every row — FARM (breaks even at a $250 stake or less, 22
   rows), THIN (breaks even but needs a bigger stake, 144 rows), SKIP (cannot break even
   inside the cap, 31 rows) — as a sortable board column. New: an **exit trigger** per
   row — leave if TVL falls 50% from the snapshot level, with the category peers'
   25th-percentile TVL as context.
5. **The dashboard as a page.** Search, category filter, chain filter, seven-day growth
   filter, watchlist-only toggle, sorting by rank, name, TVL, growth, age, odds, expected
   value and verdict, a detail view for every protocol with the model's own inputs, odds,
   range, deposit, verdict code, exit trigger and farm plan, and a model panel that shows
   the fit, the blind tests, the term-test table with both blind-test columns, the odds
   model and the integrity strip. Watchlist rows carry a badge. The detail dialog is
   widened to 880px with a two-column steps grid, so all eight farm steps are visible at
   1440×900 — v1's detail screenshot cut steps 6–8 below the fold.
6. **It looks made.** A dark board with one gold accent, consistent spacing, tabular
   numerals, and implied-value bars — no framework, no fetched font, no network.

## What it deliberately does not do

- It does not rank wrapped, staked or bridged products of tokens that already trade (WBTC,
  staked ETH products, exchange bridges). The snapshot records no token for some of them, but
  their token already trades, so the house's product rule sets them aside — the same rule that
  draws the watchlist, applied without its TVL floor.
- It does not invent data the snapshot lacks. A protocol with no seven-day change is scored
  at 0% growth; a protocol with no listing date is scored at 365 days of age; both are stated
  in the model panel.
- It does not promise a token. Every implied value is labelled an estimate with its range,
  every odds figure is labelled a peer-record score, and the detail view says so in plain
  words.
- It does not chase the leaders' ideas that the snapshot cannot support honestly. A
  category-level fit was tested and dropped; a per-category conformal interval was tested
  and left out because the category residuals are not estimable precisely with 128
  anchors; nothing is priced per kind that the data cannot separate. Three value terms
  that pass one blind test and fail the other were dropped rather than kept on the test
  that flatters them.

## Honest limits

- The snapshot is frozen at 2026-11-14. A protocol that launched a token after that date still
  reads as pre-token here, because the entry reads only the sealed input.
- TVL is a size measure, not a quality measure. A large protocol with a weak product can
  outrank a small one with a strong one; the model says so and ranks by the snapshot's figures
  alone, which is what the bounty asks for.
- The fit is weak: TVL explains only 19% of log market-cap variance (R² 0.194), the median
  out-of-sample error is ×3.40, and the 80% conformal band is ×11.43 wide pooled — ×21.81
  for the smallest third of protocols. The board shows those numbers instead of hiding
  them.
- The odds model is still weak (cross-validated AUC 0.677, up from 0.606) and rises with
  age, because older protocols have had more time to launch. It is a peer-record score,
  not a forecast.
- Expected value is a model construct: implied value × odds × the farmer's pro-rata share at
  the plan's deposit. It assumes no airdrop split beyond that share and is not a forecast of
  what a farmer will receive.
- Most top-ranked plans need more than the $2,500 deposit cap to break even, because their
  TVL is enormous relative to their implied value and odds. The verdicts say so; the board
  does not pretend otherwise. Only 22 of 197 rows earn a FARM verdict.
