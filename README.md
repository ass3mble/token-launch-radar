# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/ass3mble/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/ass3mble/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads one frozen DefiLlama snapshot (2026-11-14, 758 protocols),
ranks the 197 pre-token protocols that pass the house's product rule by an implied value, and
shows a reader how to farm each one. The implied value is a model, not a price and not a
prediction that a token will be issued.

- **Model (radar-2):** `implied = round(TVL x 0.20 x growth x maturity)`, where 0.20 is the
  median market-cap-to-TVL ratio of the 129 live-token protocols in the same snapshot, growth
  is the seven-day TVL change (upside at 0.7, downside at 1.0, clamped -80% to +200%), and
  maturity rises with the time a protocol has run with no token (0.65 to 1.00 over four
  years). See `METHODOLOGY.md`.
- **Board:** all 40 watchlist protocols plus 157 early rows below the $50M floor; live-token
  protocols are set aside in their own view with market caps.
- **Farm plans:** 8 steps per protocol, derived from its category, chains, TVL and age, each
  with its cost and time.

Built for the make.fun bounty "Build the best token launch radar" (token-radar-01).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path to snapshot.json>
```

Node 22.18 or later, standard library only. It writes `out/board.json`, `out/data.js`,
`out/dashboard/`, `out/screenshots/` and `out/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0y3dyvzz&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
