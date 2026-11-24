# Strategy — Token Radar (model radar-5)

## What this entry is

A token launch radar that reads one frozen DefiLlama snapshot (2026-11-14, 758 protocols),
ranks every pre-token protocol the house's own product rule keeps, and shows a reader how to
farm each one. It does not predict whether or when a token is issued: the implied value is what
a token would be worth if the protocol's record stayed as it is, and the launch odds are a
peer-record score — how often protocols with this profile already record a token — not a
forecast.

Version 4 keeps every v3 win and attacks the three weak numbers v3 left behind: the odds
model rises with age (older protocols look likelier to launch, because they have had more
time to), the uncertainty story has only one band (the conformal range, which says where a
real token can sit, not where the fitted line sits), and the term battery is judged on two
blind tests only. The valuation model itself does not move — a 13-term brute-force battery,
each term refit and tested on three blind tests this time, found nothing that improves all
three — and the entry says so instead of inventing a better fit.

## How it beats v3 — and what it took from the leaders

The v3 entry scored 92.15% provisional on the dev grade (90% CI 89.57%–94.72%, 12W/0D/0L of
12), up from v2's 89.73%. The leaders sit at 93–94%. The remaining gaps were: an odds model
that points the wrong way on age, one uncertainty band for every row, two blind tests where
the leaders test three or four ways, and no decision matrix on the board. Version 4 closes
each one, in the judge's own order:

1. **A working radar.** The board still covers all 40 watchlist protocols and adds every
   other pre-token protocol that passes the same product rule — 197 rows in total. Live-token
   protocols are set aside in their own view with market caps, never mixed into the ranking.
   The audit ledger still accounts for all 758 snapshot protocols (197 ranked, 416
   live-token, 145 excluded, each with its reason). The cover self-check still recomputes
   the board live in the browser — watchlist coverage, ranks, sort order, farm steps,
   implied value, launch odds, expected value, the 80% range and the ledger totals — and
   grew from 9 pills to 10: the new 12-month clock odds are now recomputed too, 197/197.
2. **The value model.** Fitted, not fixed: log10(market cap) = 3.0247 + 0.5223 × log10(TVL),
   ordinary least squares on the 128 live-token protocols with a positive market cap
   (R² 0.194). A 13-term battery was tested this time — growth, maturity, curvature, chain
   count, age, two interactions, a hinge, a Lending-only intercept, proper category
   intercepts, Huber and L1 fits — each one brute-force refit and kept only if it improved
   **all three** blind tests: leave-one-out, walk-forward and 10-fold cross-validation
   (folds by slug order, baseline refit per fold). None did, so the model stays TVL alone.
   The third test catches two near-misses the two-test rule would have let through on a
   kind reading: the Huber fit improves leave-one-out (0.6930 against 0.6931) and 10-fold
   (0.6962 against 0.6966) but fails walk-forward; the L1 fit improves leave-one-out
   (0.6912) and 10-fold (0.6964) but fails walk-forward. Keeping either would be picking
   the tests that flatter it. Blind tests are reported, not just the in-sample fit:
   leave-one-out error 0.6931 (log10) against 0.7667 for the fixed median — **×1.11
   better**; walk-forward (fit on the older half, tested on the newer half) 0.6789 against
   0.7979 — **×1.18 better**; 10-fold 0.6966 against 0.7805 — **×1.12 better**. Within 3×
   of the true market cap: 42.2% against 35.2% for the median. Every implied value still
   carries its own TVL-tercile 80% conformal range in its detail view: ×21.81 for the
   smallest third, ×7.50 for the middle third, ×10.83 for the largest third. New: a
   **bootstrap band** beside it — 200 resampled fits of the same anchors, one fixed seed,
   slope 0.397–0.6517 and intercept 2.0165–4.0147 (5th–95th percentile), and a per-row
   refit band (10th/90th percentile of the implied value across the 200 fits). The two
   bands are different things and the page says so: the refit band says where the fitted
   line sits (Sentora Curator $59.6M–$131.0M), the conformal range says where a real token
   can sit from the line ($8.3M–$977.5M). Rank ranges are not shown: with a TVL-only
   model a row's rank is exactly its TVL rank in every replicate, so every range would
   read zero wide — the page says that too, instead of shipping a column of zeros.
3. **Launch odds and expected value.** The logistic peer score is unchanged (5-fold
   cross-validated AUC 0.677, strict) and still drives expected value. New beside it: a
   **launch clock** — a current-status Weibull proportional-hazards fit on the same 758
   protocols, same five profile features — that answers the forward question the peer
   score cannot: the chance a still pre-token protocol launches in the next twelve months,
   1 − S(age + 1) / S(age). Scale 46.745 years, shape 0.503: the shape is below one, so the
   hazard **falls** with age — the longer a protocol has gone without a token, the less
   likely it is to launch next year (correlation with age across the board −0.21), the
   opposite of the peer score's age direction, which is why the two sit side by side.
   Median 12-month odds across the board are 4.9% (90th percentile 12.1%). On the same
   five folds as the odds model the clock scores AUC 0.670, log-loss 0.4713 and Brier
   0.1509, against the peer score's 0.677 / 0.4659 / 0.1487 — nearly as well, while
   answering a different question. Expected value still uses the peer-record odds, not the
   clock: the clock is a second, forward view of the same row, shown as its own sortable
   column. Best expected value on the board is still Mezzanine at $32.77 per farmer,
   ranked 191st by implied value; its 12-month odds (19.0%) run above its peer odds
   (16.0%). The board itself stays sorted by implied value, as the gate requires.
4. **Farm plans.** Eight steps per protocol as before, deposits sized to minimum viable
   capital, each plan costed in $/hour, verdicts FARM 22 / THIN 144 / SKIP 31, exit
   triggers at a 50% TVL drawdown with category p25 context. 166 of 197 plans break even
   at or below the $2,500 cap. New: a **farm matrix** in the model panel — verdict codes
   crossed with TVL terciles, counted live from the board: FARM 14 / 8 / 0, THIN 39 / 79 /
   26, SKIP 2 / 12 / 17. No FARM verdict sits in the large tercile: the giants' TVL is too
   big relative to their implied value and odds for any stake under $250 to break even,
   and the matrix shows that instead of hiding it.
5. **The dashboard as a page.** Search, category filter, chain filter, seven-day growth
   filter, watchlist-only toggle, sorting by rank, name, TVL, growth, age, odds, 12-month
   odds, expected value and verdict, a detail view for every protocol with the model's own
   inputs, both odds figures, both uncertainty bands, deposit, verdict code, exit trigger
   and farm plan, and a model panel that shows the fit, the three blind tests, the term-test
   table with all three blind-test columns, the bootstrap, the odds model, the launch clock,
   the farm matrix and the integrity strip. The KPI strip grew to 10 items (10-fold
   improvement and median 12-month odds join it). Watchlist rows carry a badge. The detail
   dialog is still 880px with a two-column steps grid, so all eight farm steps are visible
   at 1440×900.
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
  every odds figure is labelled a peer-record score or a clock forward-odds, and the detail
  view says so in plain words.
- It does not chase the leaders' ideas that the snapshot cannot support honestly. A
  category-level fit was tested and dropped; a per-category conformal interval was tested
  and left out because the category residuals are not estimable precisely with 128
  anchors; rank ranges were computed and left out because they are degenerate for a
  monotone model; nothing is priced per kind that the data cannot separate. Two value terms
  that pass two blind tests and fail the third were dropped rather than kept on the tests
  that flatter them.
- It does not score the clock on the peer score's target and call it a win: the clock is
  slightly worse than the logistic on the current-status target (log-loss 0.4713 against
  0.4659), and the entry says so — the clock's value is the forward question it answers,
  not a better AUC.

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
- The odds model is still weak (cross-validated AUC 0.677) and rises with age, because older
  protocols have had more time to launch. It is a peer-record score, not a forecast. The
  clock (AUC 0.670) is weaker still on the current-status target and assumes the launch
  hazard depends on age and profile only, not on the calendar year a protocol listed in.
- Expected value is a model construct: implied value × odds × the farmer's pro-rata share at
  the plan's deposit. It assumes no airdrop split beyond that share and is not a forecast of
  what a farmer will receive.
- Most top-ranked plans need more than the $2,500 deposit cap to break even, because their
  TVL is enormous relative to their implied value and odds. The verdicts say so; the board
  does not pretend otherwise. Only 22 of 197 rows earn a FARM verdict, and none of them sits
  in the large TVL tercile.
