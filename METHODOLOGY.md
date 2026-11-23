# Methodology — Token Radar (model radar-3)

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

## The full accounting (integrity)

Every protocol in the snapshot is accounted for in the audit ledger (`audit` in `data.js`,
All 758 tab in the dashboard):

| status | count | meaning |
| --- | --- | --- |
| ranked | 197 | pre-token, passes the product rule |
| live | 416 | records a token |
| excluded | 145 | pre-token, fails the product rule (reason recorded per row) |
| **total** | **758** | |

Of the 416 live-token protocols, 128 carry a positive market cap, 15 are recorded at $0, 1
(`autofinance`, a dead-token placeholder) at −$1, and 272 record a token with no market cap.
The 128 with a positive market cap are the anchors of the value fit. (Version 1's
METHODOLOGY.md said 129 live anchors; that was wrong — the snapshot holds 128 positive market
caps, and this version corrects the count.)

## The value model (radar-3)

```
log10(mcap) = 3.0247 + 0.5223 x log10(TVL)     # OLS on the 128 live anchors
implied     = max(1, round(10 ^ (3.0247 + 0.5223 x log10(tvl_usd))))
```

`age_days` is the whole days from `listed_at` to the snapshot's `as_of` date; a missing
`listed_at` counts as 365 days. The fit is computed from the snapshot on every run
(`fitValuation` in `lib/model.ts`); the dashboard recomputes each row's implied value from the
same coefficients and reports how many of the 197 rows agree with `board.json`.

### The fit

| statistic | value |
| --- | --- |
| anchors (positive market cap) | 128 |
| intercept | 3.0247 |
| slope on log10(TVL) | 0.5223 |
| R² | 0.1939 |
| residual SD (log10) | 0.909 |
| median mcap / TVL (for the baseline) | 0.2049 |

TVL explains only 19% of log market-cap variance. The fitted slope (0.52) compresses the
range against v1's fixed multiple: the top implied value is $90.3M (Sentora Curator), where
v1's fixed 0.20 multiple gave $420.3M (Steakhouse Financial). The compression is what the
anchors say — large protocols trade at a smaller multiple of TVL than small ones — and the
dashboard shows the fit's weakness instead of hiding it.

### Blind validation

The baseline in both tests is the snapshot's own median multiple (0.2049), scored the way
v1 scored it. Errors are mean absolute error in log10, so a multiple of ×1.11 means the
fitted model's error is 1.11 times smaller than the baseline's.

| test | fitted MAE | baseline MAE | improvement |
| --- | --- | --- | --- |
| Leave-one-out (n=128) | 0.6931 | 0.7667 | **×1.11** |
| Walk-forward (fit on the earliest 47 by `listed_at`, tested on the latest 48; n=95 dated) | 0.6789 | 0.7979 | **×1.18** |

Within-kx shares (leave-one-out): within 2× of the true market cap 32.0% (baseline 28.1%);
within 5× 58.6% (baseline 50.0%). Median error factor ×3.40 (baseline ×4.99).

### Terms that were tested and dropped

Each term below was added to the fitted model and kept only if leave-one-out error fell.
None did, so the value model is TVL alone.

| term tested | leave-one-out MAE with it | decision |
| --- | --- | --- |
| Fitted log-log on TVL alone (the model) | 0.6931 | kept |
| + 7-day growth, weight 0.2 | 0.6936 | dropped |
| + maturity 0.90 + 0.10 over 4 years | 0.6952 | dropped |
| + growth and maturity together | 0.6958 | dropped |
| + category intercepts, shrunk n/(n+8) | 0.6943 | dropped |
| + logAge, growth, chain count as extra regressors | 0.6995 / 0.7133 / 0.7070 | dropped |

Growth and age add no out-of-sample power for market cap, so they left the value fit — but
both still enter the launch-odds score below, so the board still ranks on TVL, growth and
age.

### Range honesty (conformal band)

Leave-one-out residuals give the 80% conformal band: **×11.43** (90%: ×30.75). Every implied
value on the board carries its 80% interval in its detail view, e.g. Sentora Curator
$90.3M → $7.9M – $1.03B. A per-kind band was considered and left out: the residuals do not
separate by kind, so a per-kind price would be invented precision.

## Launch odds (a peer-record score, not a forecast)

A logistic fit on all 758 protocols. The outcome is "records a token in this snapshot";
the features are log10(TVL), age in years and seven-day growth clamped to [−80, 200].
Coefficients are standardised (gradient descent, L2 0.05, 3,000 iterations):

| term | coefficient |
| --- | --- |
| intercept | −1.5305 |
| log10(TVL) | −0.0876 |
| age (years) | +0.3145 |
| 7-day growth | −0.4308 |

In-sample AUC 0.617; 5-fold cross-validated AUC 0.606 (folds 0.474, 0.658, 0.660, 0.553,
0.683). Median odds across the board: 0.1505. The odds rise with age because older protocols
have had more time to launch — that is why they are labelled a peer-record score, not a
forecast: a protocol still pre-token at its age is scored on its profile, not predicted to
launch.

## Expected value

```
expected_value = implied_value x launch_odds x (deposit_usd / tvl_usd)
```

The farmer's pro-rata slice of the implied value at the plan's deposit. It is a model
construct, not a forecast: it assumes no airdrop split beyond that share. The best expected
value on the board is Monarq at $32.87 per farmer (ranked 196th by implied value); the top
implied rows carry only $8.52–$17.99 of expected value, because their TVL is enormous
relative to their implied value and odds. The board stays sorted by implied value, as the
gate requires; expected value is a column with its own sort.

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

### Deposit sizing and $/hour accounting

The deposit is sized to **minimum viable capital**. The break-even deposit is
D* = gas × TVL / (implied × odds), rounded up to $10 and clamped to $50–$2,500. Gas per plan:
$3 setup + $8 (or $4 if the deposit is under $150) for the main action + $5 (or $2) for the
second action + $2 per week of cadence + $3 for the points step + $2 for the log step.
Active minutes: 5 + 15 + 10 + 10 per week + 15 + 10 + 10. Hold days are passive and are not
counted as time. Capital is not a cost: the deposit stays in the position. $/hour counts gas
against active minutes only. Each plan ends in a verdict:

- "Breaks even at a $X deposit" (D* within the cap);
- "Pays for its gas at the $50 minimum deposit" (D* below $50);
- "Needs $Y to break even — above the $2,500 cap" (D* above the cap).

181 of 197 plans break even at or below the $2,500 cap; the 16 that do not say so in their
verdict.

## Outputs

`main.ts` writes `/output/board.json` (one row per ranked protocol, ranks 1..N, implied
values non-increasing), `/output/data.js` (the same rows for the dashboard, plus the fit, the
odds model, the integrity counts and the full 758-row audit ledger), copies `dashboard/` and
`screenshots/` to `/output`, and writes `/output/dossier.json` with the vendored
`buildDossier`. Two runs on the same input write the same bytes.

## Limits

- The snapshot is frozen; anything that happened after 2026-11-14 is invisible to the entry.
- "Records no token" is what DefiLlama records, not proof a protocol has none.
- Implied value is an estimate from TVL alone. It is not a price, not a prediction that a
  token will be issued, and not financial advice. The fit is weak (R² 0.194) and the 80%
  band is ×11.43 wide.
- Launch odds are a peer-record score with a cross-validated AUC of 0.606. Expected value is
  a model construct built on those odds.
