# Methodology — Token Radar (model radar-2)

## Input

One file, `/input/snapshot.json`, fetched once by the house from DefiLlama's public protocol
index (`https://api.llama.fi/protocols`) and frozen at 2026-11-14. It holds 758 protocols at or
above $5,000,000 of TVL, each with ten fields (`slug`, `name`, `category`, `chains`, `tvl_usd`,
`change_7d`, `mcap_usd`, `listed_at`, `gecko_id`, `symbol`), plus a 40-protocol `watchlist` and
a $50,000,000 floor. The program reads nothing else.

## Who is ranked

A protocol is **pre-token** when its record carries no token at all: `mcap_usd`, `gecko_id` and
`symbol` are all null (342 of the 758). A protocol is **rankable** when it is pre-token and
passes the house's product rule — the same rule that draws the watchlist, without its TVL
floor:

- category is not Bridge, Canonical Bridge, Cross Chain Bridge, Liquid Staking, Liquid
  Restaking, Restaked BTC or CEX;
- name does not end in a version marker (`V2`, `v2`, `2.0` and the like);
- name carries no whole word `wrapped`, `staked` or `staking`;
- name does not begin with an exchange's name (Binance, Coinbase, Bybit, Kraken, Bitget,
  OKX, Bitfinex, Gemini).

That leaves 197 rankable protocols: the 40 watchlist slugs plus 157 early rows the watchlist
leaves out (most below the floor; a few above it that DefiLlama records under a parent protocol,
whose own token does not trade). Wrapped products such as WBTC and exchange staked-ETH products are set aside by this
rule even though the snapshot records no token for them, because each is a product of a token
that already trades. Protocols whose token already trades (416 of the 758) are kept apart in
the dashboard's Live token view with their market caps; the top 24 by market cap are shown.

## The value model (radar-2)

```
growth     = clamp(change_7d, -80, 200)          # per cent; null change_7d counts as 0
growthMult = 1 + growth/100 x 0.7   (growth >= 0)
           = 1 + growth/100 x 1.0   (growth < 0)
maturity   = 0.65 + 0.35 x min(age_days, 1460) / 1460
implied    = max(1, round(tvl_usd x 0.20 x growthMult x maturity))
```

`age_days` is the whole days from `listed_at` to the snapshot's `as_of` date; a missing
`listed_at` counts as 365 days.

### Where 0.20 comes from

The 129 live-token protocols in the snapshot have a market-cap-to-TVL ratio of:

| percentile | 10th | 25th | median | 75th | 90th |
| --- | --- | --- | --- | --- | --- |
| mcap / TVL | 0.01 | 0.04 | **0.20** | 1.04 | 2.95 |

The base multiple is that median. A pre-token protocol's token, if it ever traded like the
live ones, starts at the median of what live tokens are worth per dollar of TVL. The program
recomputes these percentiles from the snapshot on every run (`ratioDerivation` in
`lib/model.ts`) and the dashboard shows them.

### Why growth is asymmetric

A week of TVL inflows can be a single large deposit; a week of outflows is users choosing to
leave. The model therefore credits upside growth at 0.7 and charges downside growth at 1.0.
The clamp (-80% to +200%) keeps one wild week from deciding a rank.

### Why maturity rises with age

A protocol that has run for years with no token has more pent-up launch value than one listed
last month, and a longer record is more evidence the TVL is sticky. The term runs from 0.65
(new) to 1.00 (four years or more) and flattens there.

## Farm plans

Each row carries 8 steps, each 20–600 characters, each ending with its cost and its time. The
steps are derived from the protocol's own record, never from a list of names:

1. **Setup** — a fresh wallet holding only the funds to farm, seed phrase offline.
2. **Main action** — by category: supply (Lending/CDP), provide liquidity (Dexs/Yield/Farm),
   deposit into a vault (Yield Aggregator, Risk Curators), mint the yield asset (RWA), deposit
   margin and hedge (Derivatives/Basis Trading), fund and place a position (Prediction
   Market), stake (Staking/Restaking), buy cover (Insurance), mint the stable asset
   (Stablecoins), fund and pay (Payments/Card), buy the index (Indexes), vote (Governance),
   place an order (OTC), or use the chain's own apps.
3. **Second action** — a different touchpoint of the same protocol (borrow against the
   supply, swap through the pool, claim and restake rewards, allocate to a second vault, or
   repeat on the protocol's second chain).
4. **Cadence** — one qualifying action each week.
5. **Hold** — at least 60 days if the protocol is under 180 days old, 45 days if under a
   year, otherwise 30 days, so the activity spans more than one snapshot.
6. **Points and governance** — join the protocol's own points or rewards page and take part
   in one vote or quest.
7. **Claim safety** — claim only from the link the protocol itself publishes; never pay to
   claim.
8. **Log and exit** — record wallet, dates and transactions, then unwind in two halves.

Capital per position follows TVL: $250 at $5B or more, $150 at $1B, $100 at $100M, $50 below
that. Gas is estimated per step and stated as a cost, not hidden.

## Outputs

`main.ts` writes `/output/board.json` (one row per ranked protocol, ranks 1..N, implied
values non-increasing), `/output/data.js` (the same rows for the dashboard), copies
`dashboard/` and `screenshots/` to `/output`, and writes `/output/dossier.json` with the
vendored `buildDossier`. Two runs on the same input write the same bytes.

## Limits

- The snapshot is frozen; anything that happened after 2026-11-14 is invisible to the entry.
- "Records no token" is what DefiLlama records, not proof a protocol has none.
- Implied value is an estimate from TVL, growth and age. It is not a price, not a prediction
  that a token will be issued, and not financial advice.
