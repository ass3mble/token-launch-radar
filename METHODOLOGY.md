# Methodology — Token Radar (model radar-4)

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

## The value model (radar-4)

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
within 3× 42.2% (baseline 35.2%); within 5× 58.6% (baseline 50.0%). Median error factor
×3.40 (baseline ×4.99). The baseline shares are scored in-sample, which favours the
baseline; the fitted shares are out of sample.

### Terms that were tested and dropped

Each term below was added to the fitted model and kept only if it improved **both** blind
tests — leave-one-out and walk-forward. None did, so the value model is TVL alone. The
battery is a brute-force refit each time (no shrunk approximations), and the walk-forward
test refits on the earliest 47 dated anchors and tests on the latest 48.

| term tested | leave-one-out MAE with it | walk-forward MAE with it | decision |
| --- | --- | --- | --- |
| Fitted log-log on TVL alone (the model) | 0.6931 | 0.6789 | kept |
| + 7-day growth, weight 0.2 | 0.6936 | 0.6796 | dropped |
| + maturity 0.90 + 0.10 over 4 years | 0.6952 | 0.6799 | dropped |
| + curvature: logTVL squared | 0.6977 | 0.6761 | dropped |
| + chain count: log10(1 + chains) | 0.6978 | 0.6963 | dropped |
| + age: log1p(age in days) | 0.6995 | 0.6843 | dropped |
| + growth × logTVL interaction | 0.7111 | 0.7538 | dropped |
| + age × logTVL interaction | 0.7014 | 0.6566 | dropped |
| + hinge at median logTVL | 0.7010 | 0.6835 | dropped |
| + Lending intercept only | 0.6928 | 0.6808 | dropped |
| + category intercepts (n ≥ 8, proper refit) | 0.7045 | 0.6789 | dropped |
| + Huber robust fit (k = 1.345) | 0.6930 | 0.6837 | dropped |
| + L1 / median fit | 0.6912 | 0.6897 | dropped |

Three candidates pass one test and fail the other, which is why the both-tests rule matters:
curvature and the age × logTVL interaction both improve walk-forward (0.6761 and 0.6566
against 0.6789) but worsen leave-one-out; the L1 fit improves leave-one-out (0.6912 against
0.6931) but worsens walk-forward. Keeping any of them would be picking the test that
flatters it. The Lending-only intercept is the closest call on leave-one-out (0.6928 against
0.6931) and fails walk-forward.

One caveat on the category row: the walk-forward figure equals the base model's (0.6789)
because no category reaches 8 anchors in the 47-row training half — the largest is Lending
with 6 — so no category dummy was fitted in that test at all. The drop therefore rests on
leave-one-out (0.7045 against 0.6931) and on the fitted intercepts being unstable across the
128 anchors, not on a walk-forward rejection.

Growth and age add no out-of-sample power for market cap, so they left the value fit — but
chain count and the category token rate do enter the launch-odds score below, where they earn
their place on cross-validation.

### Range honesty (conformal bands)

Leave-one-out residuals give the 80% conformal band: **×11.43** pooled (90%: ×30.75). But
the residuals do not spread evenly: the smallest third of protocols (by TVL) has an 80%
band of **×21.81**, the middle third **×7.50** and the largest third **×10.83**, with the
tercile cutoffs at TVL $11.8M and $79.4M. Radar-4 therefore carries a per-tercile band
instead of the pooled one: every implied value on the board carries its own tercile's 80%
interval in its detail view, e.g. Sentora Curator $90.3M → $8.3M – $977.5M (large tercile,
×10.83). A per-category band was considered and left out: the category mean residuals range
−0.43 to +0.47 but are not estimable precisely with 128 anchors, so a per-category price
would be invented precision.

## Launch odds (a peer-record score, not a forecast)

A logistic fit on all 758 protocols. The outcome is "records a token in this snapshot";
the features are log10(TVL), age in years, seven-day growth clamped to [−80, 200], chain
count as log10(1 + chains), and the protocol's category token rate — the share of protocols
in its category that record a token, smoothed toward the global rate (categories with fewer
than 5 members fall back to the global rate). Coefficients are standardised (iteratively
reweighted least squares):

| term | coefficient |
| --- | --- |
| intercept | −1.6678 |
| log10(TVL) | −0.1480 |
| age (years) | +0.3037 |
| 7-day growth | −0.5201 |
| chain count | +0.2452 |
| category token rate | +0.6195 |

In-sample AUC 0.723; 5-fold cross-validated AUC **0.677** (folds 0.565, 0.747, 0.683, 0.694,
0.697), up from 0.606 for radar-3's three-feature score. The cross-validation is strict:
each fold's category rates and standardisation come from its training rows only, so no
fold sees the category rate of the rows it scores. Median odds across the board: 0.1157.
The odds rise with age because older protocols have had more time to launch — that is why
they are labelled a peer-record score, not a forecast: a protocol still pre-token at its age
is scored on its profile, not predicted to launch.

## Expected value

```
expected_value = implied_value x launch_odds x (deposit_usd / tvl_usd)
```

The farmer's pro-rata slice of the implied value at the plan's deposit. It is a model
construct, not a forecast: it assumes no airdrop split beyond that share. The best expected
value on the board is Mezzanine at $32.77 per farmer (ranked 191st by implied value); the
top implied rows carry only $2.34–$4.25 of expected value, because their TVL is enormous
relative to their implied value and odds — the new odds model scores the giants lower than
radar-3 did (Sentora Curator 2.9% against 10.4%). The board stays sorted by implied value,
as the gate requires; expected value is a column with its own sort.

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

166 of 197 plans break even at or below the $2,500 cap; the 31 that do not say so in their
verdict. (Radar-3 broke even on 181: the new odds model scores the giants lower, so fewer
plans clear the cap — the verdicts say so instead of hiding it.)

### Verdict codes and exit triggers

Each row carries a verdict code, read off its own break-even deposit:

- **FARM** — breaks even at a $250 stake or less (22 rows);
- **THIN** — breaks even, but needs a bigger stake than $250 (144 rows);
- **SKIP** — cannot break even inside the $2,500 cap (31 rows).

It is a capital verdict, not a profit forecast: the deposit is sized to break even, so net
at the sized deposit is near zero by construction, and a $/hour verdict on that deposit
would say nothing. The board's Verdict column sorts FARM above THIN above SKIP.

Each row also carries an exit trigger: leave if TVL falls below half its snapshot level
(a 50% drawdown), with the category peers' 25th-percentile TVL shown as context (categories
with fewer than 4 ranked peers use the whole board's 25th percentile).

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
  band is ×11.43 wide pooled — ×21.81 for the smallest third of protocols.
- Launch odds are a peer-record score with a cross-validated AUC of 0.677. Expected value is
  a model construct built on those odds.
