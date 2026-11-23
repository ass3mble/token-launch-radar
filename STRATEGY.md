# Strategy — Token Radar (model radar-2)

## What this entry is

A token launch radar that reads one frozen DefiLlama snapshot (2026-11-14, 758 protocols),
ranks every pre-token protocol the house's own product rule keeps, and shows a reader how to
farm each one. It does not predict whether or when a token is issued: the implied value is what
a token would be worth if the protocol's record stayed as it is.

## How it beats the starter

The starter is a plain, correct entry (model radar-1): 200 rows, one multiple of 0.25x TVL, a
symmetric growth term, a generic six-step farm plan, and a basic table. This entry improves
every layer the judge scores, in the judge's own order:

1. **A working radar.** The board covers all 40 watchlist protocols and adds every other
   pre-token protocol that passes the same product rule — 197 rows in total —
   instead of the starter's capped 160 early rows. Live-token protocols are set aside in their
   own view with market caps, never mixed into the ranking. The page recomputes each row's
   implied value from the snapshot figures and states whether it matches board.json, so the
   screenshots, the code and the data agree visibly.
2. **The value model.** The base multiple is not a round guess: it is the median
   market-cap-to-TVL ratio of the 129 live-token protocols in this same snapshot (0.20; 10th
   percentile 0.01, 25th 0.04, 75th 1.04, 90th 2.95). Growth is asymmetric — inflows count at
   0.7, outflows at 1.0 — because a week of inflows can be one whale while a week of outflows
   is users leaving. Maturity rises with the time a protocol has run with no token and flattens
   after four years. The model is one function of TVL, seven-day growth and age; no protocol
   name is ever special-cased.
3. **Farm plans.** Eight steps per protocol instead of six, derived from the protocol's own
   category, chains, TVL and age: a category-specific main action, a second qualifying action
   on a different touchpoint, a weekly cadence, a hold period that depends on age, a
   points-and-governance step, a claim-safety step, and a log-and-exit step. Every step carries
   its cost and its time.
4. **The dashboard as a page.** Search, category filter, chain filter, seven-day growth
   filter, watchlist-only toggle, sorting by rank, name, TVL, growth and age, a detail view for
   every protocol with the model's own inputs, and a model panel that shows the formula and the
   ratio derivation. Watchlist rows carry a badge.
5. **It looks made.** A dark board with one gold accent, consistent spacing, tabular numerals,
   and implied-value bars — no framework, no fetched font, no network.

## What it deliberately does not do

- It does not rank wrapped, staked or bridged products of tokens that already trade (WBTC,
  staked ETH products, exchange bridges). The snapshot records no token for some of them, but
  their token already trades, so the house's product rule sets them aside — the same rule that
  draws the watchlist, applied without its TVL floor.
- It does not invent data the snapshot lacks. A protocol with no seven-day change is scored at
  0% growth; a protocol with no listing date is scored at 365 days of age; both are stated in
  the model panel.
- It does not promise a token. Every implied value is labelled an estimate, and the detail view
  says so in plain words.

## Honest limits

- The snapshot is frozen at 2026-11-14. A protocol that launched a token after that date still
  reads as pre-token here, because the entry reads only the sealed input.
- TVL is a size measure, not a quality measure. A large protocol with a weak product can
  outrank a small one with a strong one; the model says so and ranks by the snapshot's figures
  alone, which is what the bounty asks for.
- The median multiple (0.20) is a cross-section of live tokens, most of which are small. The
  75th percentile is 1.04: the board's values are conservative by design.
