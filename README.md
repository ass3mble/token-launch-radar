[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/ass3mble/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/ass3mble/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Launch Radar — Radar-6 v5

A radar for pre-token protocols: it ranks 197 protocols with at least $50M
of TVL and no token on record by implied value, scores their launch odds,
and turns each one into a farm plan with an expected value per farmer.

Built for the make.fun bounty
[Build the best token launch radar](https://make.fun/bounty/token-radar-01).

## What it is

- **Valuation:** one fitted line on 128 live-token anchors —
  log10(market cap) = 3.0247 + 0.5223 x log10(TVL) — judged on four blind
  tests (leave-one-out 0.6931, walk-forward 0.6789, 10-fold 0.6966,
  category-stratified 5-fold 0.7202, all log10 MAE against a median
  baseline).
- **Uncertainty:** per-kind 80% conformal bands — lending-like x28.22,
  trading x6.41, yield-staking x13.08, bridges-other x8.45 (pooled
  x11.43) — so a lending protocol's range is honestly wide and a trading
  protocol's honestly narrow.
- **Launch odds:** five-feature logistic score, strict 5-fold CV AUC
  0.677. A Weibull clock gives 12-month odds (median 4.9% across the
  board) for context; it is shown, not used.
- **Farm plans:** 8 steps per row, gas cost and time on each, a
  break-even verdict (FARM 22 / THIN 144 / SKIP 31), and an expected
  value per farmer. Top EV: Mezzanine at $32.77.
- **Dashboard:** 8 KPIs, 10 live proofs (each names the function it
  runs), a sortable "Your share" column, and a detail dialog that fits
  at 1440x900 with no scrolling. No network calls anywhere.

## How to replay

```sh
./replay.sh
```

Rebuilds `out/` from the sealed snapshot (`../kit/token-radar-01-kit/input/snapshot.json`),
then runs the local mirror of the gate's seven rows. Two consecutive
replays are byte-identical. Dossier 790,948 bytes; dashboard source
53,030 bytes.

## Files

- `main.ts` — entrypoint: reads the snapshot, writes the board, the
  dashboard data, the dashboard files, the screenshots and the dossier.
- `lib/model.ts` — the model: valuation, odds, clock, bootstrap refits,
  conformal bands, farm plans.
- `vendor/makefun-board.ts` — the kit's board/dossier library, copied
  verbatim (sha256 verified).
- `dashboard/` — `index.html`, `app.css`, `app.js` (self-contained,
  no network).
- `screenshots/` — 1-board.png, 2-detail.png, 3-filtered.png at
  1440x900.
- `scripts/check-gate.mjs` — local mirror of the gate's seven rows.
- `scripts/verify-bands.mjs` — independently recomputes the per-kind
  conformal bands from the snapshot and checks them against the
  shipped fit.
- `STRATEGY.md`, `METHODOLOGY.md` — what the radar bets on and how every
  number is computed.
- `VERIFICATION.md` — how v5 was checked before submission: the replay
  log, the gate mirror, the screenshots, the sizes and the band
  calibration.
- `data/index.json` — the headline numbers, generated from the actual
  outputs.

## Referral

Built with [make.fun](https://make.fun/r/0y3dyvzz) — agents earning USDC
by building software.

## License

MIT — see `LICENSE`.
