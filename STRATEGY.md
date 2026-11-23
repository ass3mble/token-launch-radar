# Strategy — Token Radar (model radar-3)

## What this entry is

A token launch radar that reads one frozen DefiLlama snapshot (2026-11-14, 758 protocols),
ranks every pre-token protocol the house's own product rule keeps, and shows a reader how to
farm each one. It does not predict whether or when a token is issued: the implied value is what
a token would be worth if the protocol's record stayed as it is, and the launch odds are a
peer-record score — how often protocols with this profile already record a token — not a
forecast.

Version 2 replaces the v1 model (radar-2, a fixed 0.20 median multiple with growth and
maturity terms) with a fitted model, radar-3, built only from the snapshot itself. Every value
term was kept or dropped on blind tests, and the dashboard now proves its own numbers live.

## How it beats v1 — and what it took from the leaders

The v1 entry scored 85.18% provisional on the dev grade (10W/1D/1L of 12). The leaders sit at
93–94%. The gaps were: a fixed multiple instead of a fitted model, no out-of-sample
validation, no launch probability, flat $50 farm deposits with no $/hour accounting, and no
accounting for the protocols the board leaves out. Version 2 closes each one, in the judge's
own order:

1. **A working radar.** The board still covers all 40 watchlist protocols and adds every
   other pre-token protocol that passes the same product rule — 197 rows in total. Live-token
   protocols are set aside in their own view with market caps, never mixed into the ranking.
   New: an **audit ledger** accounts for all 758 snapshot protocols (197 ranked, 416
   live-token, 145 excluded, each with its reason), so nothing is unaccounted for. New: a
   **cover self-check** recomputes the board live in the browser — watchlist coverage,
   ranks, sort order, farm steps, implied value, launch odds, expected value and the ledger
   totals — and shows, pill by pill, how many of the 197 rows agree with board.json.
2. **The value model.** Fitted, not fixed: log10(market cap) = 3.0247 + 0.5223 × log10(TVL),
   ordinary least squares on the 128 live-token protocols with a positive market cap
   (R² 0.194). Growth, maturity and category terms were all tested and **dropped**: each one
   made leave-one-out error worse, so the model is TVL alone. Blind tests are reported, not
   just the in-sample fit: leave-one-out error 0.6931 (log10) against 0.7667 for the fixed
   median — **×1.11 better**; walk-forward (fit on the older half, tested on the newer half)
   0.6789 against 0.7979 — **×1.18 better**. Every implied value carries its 80% conformal
   range, ×11.43 wide, in its detail view.
3. **Launch odds and expected value.** A logistic fit on all 758 protocols scores each row's
   launch odds from log TVL, age and seven-day growth (in-sample AUC 0.617, 5-fold
   cross-validated AUC 0.606). Expected value = implied value × odds × the farmer's
   pro-rata share at the plan's deposit. It is a column with its own sort, and it surfaces
   rows the implied ranking buries: the best expected value on the board is Monarq at $32.87
   per farmer, ranked 196th by implied value. The board itself stays sorted by implied
   value, as the gate requires.
4. **Farm plans.** Eight steps per protocol as before, but the deposit is now sized to
   **minimum viable capital**: the break-even deposit D* = gas × TVL / (implied × odds),
   rounded up to $10 and clamped to $50–$2,500. Each plan is costed in $/hour — gas against
   active minutes only, capital excluded because it stays in the position — and ends in a
   verdict: breaks even at $X, pays for its gas at the $50 minimum, or needs more than the
   $2,500 cap. 181 of 197 plans break even at or below the cap; the 16 that do not say so.
5. **The dashboard as a page.** Search, category filter, chain filter, seven-day growth
   filter, watchlist-only toggle, sorting by rank, name, TVL, growth, age, odds and expected
   value, a detail view for every protocol with the model's own inputs, odds, range, deposit
   and verdict, and a model panel that shows the fit, the blind tests, the term-test table,
   the odds model and the integrity strip. Watchlist rows carry a badge. The detail dialog
   is widened to 880px with a two-column steps grid, so all eight farm steps are visible at
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
  category-level fit was tested and dropped; a per-kind conformal interval was tested and
  collapsed to the same band the pooled residuals give; nothing is priced per kind that the
  data cannot separate.

## Honest limits

- The snapshot is frozen at 2026-11-14. A protocol that launched a token after that date still
  reads as pre-token here, because the entry reads only the sealed input.
- TVL is a size measure, not a quality measure. A large protocol with a weak product can
  outrank a small one with a strong one; the model says so and ranks by the snapshot's figures
  alone, which is what the bounty asks for.
- The fit is weak: TVL explains only 19% of log market-cap variance (R² 0.194), the median
  out-of-sample error is ×3.40, and the 80% conformal band is ×11.43 wide. The board shows
  those numbers instead of hiding them.
- The odds model is weak too (cross-validated AUC 0.606) and rises with age, because older
  protocols have had more time to launch. It is a peer-record score, not a forecast.
- Expected value is a model construct: implied value × odds × the farmer's pro-rata share at
  the plan's deposit. It assumes no airdrop split beyond that share and is not a forecast of
  what a farmer will receive.
- Most top-ranked plans need more than the $2,500 deposit cap to break even, because their
  TVL is enormous relative to their implied value and odds. The verdicts say so; the board
  does not pretend otherwise.
