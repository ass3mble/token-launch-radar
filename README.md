# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/ass3mble/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/ass3mble/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads one frozen DefiLlama snapshot (2026-11-14, 758 protocols),
ranks the 197 pre-token protocols that pass the house's product rule by an implied value, and
shows a reader how to farm each one. The implied value is a model, not a price and not a
prediction that a token will be issued.

- **Model (radar-5, fitted):** `log10(market cap) = 3.0247 + 0.5223 x log10(TVL)`, ordinary
  least squares on the 128 live-token protocols with a positive market cap in the same
  snapshot (R² 0.194). A 13-term battery — growth, maturity, curvature, chain count, age,
  interactions, a hinge, a Lending intercept, category intercepts, Huber and L1 fits —
  was brute-force refit and kept only if it improved all three blind tests
  (leave-one-out, walk-forward and 10-fold); none did, so the model is TVL alone. Blind
  tests: leave-one-out ×1.11, walk-forward ×1.18 and 10-fold ×1.12 better than the
  snapshot's own median multiple (0.2049). Every implied value carries its own TVL-tercile
  80% conformal range (×21.81 / ×7.50 / ×10.83) instead of one pooled ×11.43, plus a
  bootstrap refit band from 200 resampled fits (slope 0.397–0.6517). See `METHODOLOGY.md`.
- **Launch odds, launch clock and expected value:** a logistic fit on all 758 protocols scores
  each row's launch odds from log TVL, age, seven-day growth, chain count and the category
  token rate (5-fold cross-validated AUC 0.677, strict — each fold's category rates come from
  its training rows only). Beside it, a current-status Weibull launch clock answers the
  forward question: the chance a still pre-token protocol launches in the next twelve months
  (scale 46.745 years, shape 0.503, so the hazard falls with age; median 12-month odds 4.9%
  across the board; same-five-fold AUC 0.670, log-loss 0.4713). Expected value = implied
  value × peer odds × the farmer's pro-rata share at the plan's deposit. Best on the board:
  Mezzanine at $32.77 per farmer.
- **Board:** all 40 watchlist protocols plus 157 early rows below the $50M floor; live-token
  protocols are set aside in their own view with market caps; an audit ledger accounts for
  all 758 protocols. The dashboard recomputes the board live and self-checks it on the cover
  (10 checks, including the 12-month clock odds). A farm matrix crosses the verdict codes
  with TVL terciles (FARM 14 / 8 / 0, THIN 39 / 79 / 26, SKIP 2 / 12 / 17).
- **Farm plans:** 8 steps per protocol, derived from its category, chains, TVL and age, each
  with its cost and time. Deposits are sized to minimum viable capital ($50–$2,500) and each
  plan is costed in $/hour with a break-even verdict — 166 of 197 break even at or below the
  cap. Every row carries a verdict code (FARM 22 / THIN 144 / SKIP 31) and an exit trigger
  (leave if TVL falls 50% from the snapshot level).

Built for the make.fun bounty "Build the best token launch radar" (token-radar-01).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path to snapshot.json>
```

Node 22.18 or later, standard library only. It writes `out/board.json`, `out/data.js`,
`out/dashboard/`, `out/screenshots/` and `out/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0y3dyvzz&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
